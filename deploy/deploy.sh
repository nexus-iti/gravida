#!/usr/bin/env bash
# Deploy de Nexus en un servidor Ubuntu sin root y sin containers obligatorios.
# Corre EN el servidor, con un usuario normal (ver docs/DEPLOY.md).
#
#   deploy.sh check                  que hay y que falta en este servidor
#   deploy.sh deploy [--ref REF]     publica una release nueva (comando por defecto)
#   deploy.sh rollback               vuelve a la release anterior
#   deploy.sh status                 release activa y releases guardadas
#
# Opciones: --env ARCHIVO (default ~/.config/nexus/deploy.env)
#           --mode native|podman|auto   --seed (solo podman: carga datos ficticios)
#           --dry-run (muestra que haria, no cambia nada)
set -euo pipefail

CMD="deploy"; ENV_FILE="${HOME}/.config/nexus/deploy.env"; REF=""; MODE_ARG=""; SEED=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    check|deploy|rollback|status) CMD="$1" ;;
    --env) ENV_FILE="$2"; shift ;;
    --ref) REF="$2"; shift ;;
    --mode) MODE_ARG="$2"; shift ;;
    --seed) SEED=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done

log()  { printf '%s\n' "$*"; }
ok()   { printf '  [ok]    %s\n' "$*"; }
warn() { printf '  [aviso] %s\n' "$*"; }
miss() { printf '  [falta] %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------- configuracion
if [ -f "$ENV_FILE" ]; then
  # El archivo lo escribe el dueno del servidor (chmod 600); se carga como shell.
  set -a; . "$ENV_FILE"; set +a
elif [ "$CMD" != "check" ]; then
  die "No existe $ENV_FILE. Copia deploy/deploy.env.example y completalo (chmod 600)."
fi

REPO_URL="${NEXUS_REPO_URL:-}"
BRANCH="${NEXUS_BRANCH:-main}"
ROOT="${NEXUS_ROOT:-$HOME/nexus}"
MODE="${MODE_ARG:-${NEXUS_MODE:-auto}}"
WEB_GROUP="${NEXUS_WEB_GROUP:-www-data}"
KEEP="${NEXUS_KEEP_RELEASES:-5}"
RELOAD_CMD="${NEXUS_RELOAD_CMD:-}"
FRONT_PORT="${NEXUS_FRONT_PORT:-8080}"
DB_HOST="${DB_HOST:-127.0.0.1}"; DB_PORT="${DB_PORT:-3306}"; DB_NAME="${DB_NAME:-nexus}"
DB_USER="${DB_USER:-nexus_app}"; DB_PASSWORD="${DB_PASSWORD:-}"
DB_ADMIN_USER="${DB_ADMIN_USER:-}"; DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-}"

SRC="$ROOT/src"; RELEASES="$ROOT/releases"; SHARED="$ROOT/shared"; CURRENT="$ROOT/current"
EXCLUDES=(.github .claude .dockerignore .editorconfig .oxfmtrc.json .oxlintrc.json
          bun.lock package.json README.md containers docs deploy "database old" database.sql)

# ---------------------------------------------------------------------- helpers
# Cuerpo de un string PHP entre comillas simples.
phpq() { local v="${1//\\/\\\\}"; printf "'%s'" "${v//\'/\\\'}"; }

mysql_app()   { MYSQL_PWD="$DB_PASSWORD" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$@"; }
mysql_admin() { MYSQL_PWD="$DB_ADMIN_PASSWORD" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_ADMIN_USER" "$@"; }

health() {
  local url="$1" code i
  HEALTH_CODE=""
  for i in 1 2 3 4 5 6 7 8 9 10; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)"
    # GET /login.php: PHP cargo config.php y llego a la DB si la respuesta no es 5xx.
    if [ -n "$code" ] && [ "$code" -ge 200 ] 2>/dev/null && [ "$code" -lt 500 ]; then
      HEALTH_CODE="$code"; ok "health $url -> HTTP $code"; return 0
    fi
    sleep 2
  done
  HEALTH_CODE="${code:-000}"; warn "health $url -> HTTP $HEALTH_CODE"; return 1
}

podman_ok() {
  have podman && { podman compose version >/dev/null 2>&1 || have podman-compose; } \
    && grep -q "^$(id -un):" /etc/subuid 2>/dev/null && have newuidmap
}

# ------------------------------------------------------------------------ check
cmd_check() {
  log "== Servidor"
  . /etc/os-release 2>/dev/null && ok "$PRETTY_NAME, usuario $(id -un)"
  have sudo && sudo -n true 2>/dev/null && ok "sudo sin contrasena" || warn "sin sudo: no se pueden instalar paquetes; pedirselo al admin"
  for t in git tar curl; do have "$t" && ok "$t" || miss "$t"; done

  log "== PHP (modo native)"
  if have php; then
    ok "php $(php -r 'echo PHP_VERSION;')"
    php -r 'exit(version_compare(PHP_VERSION,"8.0","<")?1:0);' || miss "PHP >= 8.0"
    php -m | grep -qi '^pdo_mysql$' && ok "ext pdo_mysql" || miss "ext pdo_mysql (php-mysql)"
    php -r 'exit(defined("PASSWORD_ARGON2ID")?0:1);' && ok "Argon2id" || miss "Argon2id en PHP"
  else miss "php (php-fpm o libapache2-mod-php, php-mysql)"; fi

  log "== Web"
  for s in apache2 nginx; do systemctl is-active --quiet "$s" 2>/dev/null && ok "$s activo"; done
  { systemctl is-active --quiet apache2 || systemctl is-active --quiet nginx; } 2>/dev/null \
    || miss "ni apache2 ni nginx activos"
  id -nG | tr ' ' '\n' | grep -qx "$WEB_GROUP" && ok "usuario en grupo $WEB_GROUP" \
    || warn "usuario fuera del grupo $WEB_GROUP: el servidor web no podra escribir uploads/ ni almacen/ (admin: usermod -aG $WEB_GROUP $(id -un))"

  log "== Base de datos"
  if have mysql; then
    ok "cliente mysql/mariadb"
    if [ -n "$DB_ADMIN_USER$DB_USER" ] && [ -n "${DB_ADMIN_PASSWORD}${DB_PASSWORD}" ]; then
      local q; q="$( { [ -n "$DB_ADMIN_USER" ] && mysql_admin -N -e 'SELECT @@lower_case_table_names' \
                       || mysql_app -N -e 'SELECT @@lower_case_table_names'; } 2>/dev/null || true)"
      case "$q" in
        0) miss "lower_case_table_names=0: el codigo usa USUARIO/EQUIPO en mayusculas y database.sql crea minusculas. Admin: lower_case_table_names=1 en [mysqld] y reinicializar la DB, o usar modo podman" ;;
        1|2) ok "lower_case_table_names=$q" ;;
        *) warn "no se pudo conectar a la DB con las credenciales de $ENV_FILE" ;;
      esac
    else warn "sin credenciales de DB en $ENV_FILE: no se verifica lower_case_table_names"; fi
  else miss "cliente mysql (mariadb-client)"; fi

  log "== Podman rootless (modo podman)"
  if have podman; then
    ok "$(podman --version)"
    podman compose version >/dev/null 2>&1 || have podman-compose && ok "compose" || miss "podman-compose / docker-compose"
    grep -q "^$(id -un):" /etc/subuid 2>/dev/null && ok "subuid" || miss "entrada en /etc/subuid (admin: usermod --add-subuids 100000-165535 $(id -un))"
    have newuidmap && ok "newuidmap" || miss "uidmap"
    [ "$(cat /proc/sys/user/max_user_namespaces 2>/dev/null || echo 0)" -gt 0 ] && ok "user namespaces" || miss "user namespaces deshabilitados"
    [ "$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null)" = "yes" ] && ok "linger" \
      || warn "sin linger: los containers mueren al cerrar sesion (admin: loginctl enable-linger $(id -un))"
  else warn "podman no esta instalado (sin root no se puede instalar; pedir 'apt install podman uidmap slirp4netns')"; fi

  log "== Destino"
  mkdir -p "$ROOT" 2>/dev/null && [ -w "$ROOT" ] && ok "escritura en $ROOT" || miss "escritura en $ROOT"

  log "== Recomendacion"
  local n=1
  have php && have mysql && { systemctl is-active --quiet apache2 || systemctl is-active --quiet nginx; } 2>/dev/null || n=0
  if [ "$n" = 1 ]; then log "  MODE=native"; elif podman_ok; then log "  MODE=podman"; else log "  Falta stack: pedir al admin 'apt install apache2 php libapache2-mod-php php-mysql mariadb-server git curl' (o podman)"; fi
}

# ----------------------------------------------------------------------- fuente
sync_src() {
  [ -n "$REPO_URL" ] || die "NEXUS_REPO_URL vacio en $ENV_FILE"
  mkdir -p "$ROOT"
  if [ -d "$SRC/.git" ]; then git -C "$SRC" fetch --prune --quiet origin
  else git clone --quiet "$REPO_URL" "$SRC"; fi
  SHA="$(git -C "$SRC" rev-parse --verify --quiet "${REF:-origin/$BRANCH}^{commit}")" \
    || die "No existe ${REF:-origin/$BRANCH} en el repo"
  log "Fuente: ${REF:-origin/$BRANCH} @ ${SHA:0:7}"
}

# ----------------------------------------------------------------------- native
write_config() (
  local f="$1"
  umask 077
  cat > "$f" <<PHP
<?php
// Generado por deploy/deploy.sh en cada deploy. No editar a mano.
\$host = $(phpq "$DB_HOST");
\$port = $(phpq "$DB_PORT");
\$db   = $(phpq "$DB_NAME");
\$user = $(phpq "$DB_USER");
\$pass = $(phpq "$DB_PASSWORD");

try {
    \$pdo = new PDO(
        "mysql:host=\$host;port=\$port;dbname=\$db;charset=utf8mb4",
        \$user,
        \$pass
    );
    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException \$e) {
    http_response_code(500);
    die(json_encode(["status" => "error", "message" => "No se pudo conectar a la base de datos", "data" => null]));
}
PHP
  # Lo lee php-fpm/apache (grupo web), nadie mas.
  chgrp "$WEB_GROUP" "$f" 2>/dev/null && chmod 640 "$f" || warn "config.php queda 600: el servidor web puede no leerlo (usuario fuera de $WEB_GROUP)"
)

setup_db() {
  have mysql || { warn "sin cliente mysql: se omite la DB (cargarla a mano)"; return 0; }
  [ -n "$DB_PASSWORD" ] || die "DB_PASSWORD vacio en $ENV_FILE"
  [[ "$DB_PASSWORD$DB_USER$DB_NAME" =~ ^[A-Za-z0-9._@%+=-]+$ ]] \
    || die "DB_NAME/DB_USER/DB_PASSWORD solo admiten letras, numeros y . _ @ % + = -"

  # Antes de crear nada: con lower_case_table_names=0 el esquema no sirve (ver docs/DEPLOY.md).
  local lc=""
  if [ -n "$DB_ADMIN_USER" ]; then lc="$(mysql_admin -N -e 'SELECT @@lower_case_table_names' 2>/dev/null || true)"
  else lc="$(mysql_app -N -e 'SELECT @@lower_case_table_names' 2>/dev/null || true)"; fi
  [ "$lc" != "0" ] || die "lower_case_table_names=0: el codigo pide USUARIO/EQUIPO en mayuscula y database.sql las crea en minuscula. El admin debe poner lower_case_table_names=1 en [mysqld] y reiniciar MariaDB (docs/DEPLOY.md)."

  if ! mysql_app -e 'SELECT 1' "$DB_NAME" >/dev/null 2>&1; then
    [ -n "$DB_ADMIN_USER" ] || die "El usuario $DB_USER no entra a $DB_NAME y no hay DB_ADMIN_USER para crearlo"
    log "Creando base y usuario de la app"
    mysql_admin -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4;
      CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
      CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
      GRANT ALL ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost', '$DB_USER'@'127.0.0.1'; FLUSH PRIVILEGES;"
  fi

  local tablas; tablas="$(mysql_app -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'")"
  if [ "$tablas" = "0" ]; then
    log "DB vacia: importando database.sql"
    # El dump trae CREATE DATABASE/USE nexus; se descartan para cargarlo en $DB_NAME.
    git -C "$SRC" show "$SHA:database.sql" | sed -e '/^CREATE DATABASE IF NOT EXISTS /d' -e '/^USE /d' | mysql_app "$DB_NAME"
  else ok "DB con $tablas tablas: no se toca el esquema"; fi
}

deploy_native() {
  local rel="$RELEASES/$(date +%Y%m%d-%H%M%S)-${SHA:0:7}"
  if [ "$DRY" = 1 ]; then
    log "[dry-run] crearia $rel, enlazaria uploads/almacen/config.php desde $SHARED, validaria DB, php -l, current -> release, health"
    return 0
  fi
  mkdir -p "$rel" "$SHARED/almacen"
  local ex=(--anchored); for e in "${EXCLUDES[@]}"; do ex+=(--exclude="$e"); done
  git -C "$SRC" archive "$SHA" | tar -x -C "$rel" "${ex[@]}"

  # Estado que sobrevive a los deploys: fotos, limites/sesiones/logs, credenciales.
  local primera=0; [ -d "$SHARED/uploads" ] || { primera=1; cp -a "$rel/uploads" "$SHARED/uploads"; }
  rm -rf "$rel/uploads" "$rel/seguridad/almacen"
  ln -s "$SHARED/uploads" "$rel/uploads"
  ln -s "$SHARED/almacen" "$rel/seguridad/almacen"
  write_config "$SHARED/config.php"
  ln -s "$SHARED/config.php" "$rel/config.php"
  # El servidor web escribe en estas dos carpetas: grupo web + setgid.
  # Lo que crea el servidor web dentro (sesiones/, limites/) ya es suyo: solo se recorre lo sembrado por el deploy.
  { { [ "$primera" = 0 ] || { chgrp -R "$WEB_GROUP" "$SHARED/uploads" && chmod -R g+rwX "$SHARED/uploads"; }; } \
    && chgrp "$WEB_GROUP" "$SHARED/uploads" "$SHARED/almacen" && chmod g+rwxs "$SHARED/uploads" "$SHARED/almacen"; } 2>/dev/null \
    || warn "no se pudo dar $WEB_GROUP a uploads/ y almacen/ (usuario fuera del grupo)"
  find "$rel" -type d ! -type l -exec chmod 755 {} + 2>/dev/null || true

  if have php; then
    log "Validando sintaxis PHP"
    find "$rel" -name '*.php' -not -path '*/vendor/*' -print0 | xargs -0 -n1 php -l >/dev/null \
      || { rm -rf "$rel"; die "php -l fallo; release descartada, current intacto"; }
  fi
  setup_db

  local prev=""; [ -L "$CURRENT" ] && prev="$(readlink "$CURRENT")"
  ln -sfn "$rel" "$CURRENT.tmp" && mv -T "$CURRENT.tmp" "$CURRENT"
  [ -z "$RELOAD_CMD" ] || { log "Recarga: $RELOAD_CMD"; bash -c "$RELOAD_CMD" || warn "la recarga fallo"; }

  if ! health "${NEXUS_HEALTH_URL:-http://127.0.0.1/login.php}"; then
    if [ -z "$prev" ] && [ "$HEALTH_CODE" = "000" ]; then
      warn "primer deploy y el servidor web no responde: apuntar su DocumentRoot a $CURRENT, arrancarlo y correr 'deploy.sh status'/check"
      log "Release $(basename "$rel") activa en $CURRENT (sin health check)"; return 0
    fi
    if [ -n "$prev" ] && [ -d "$prev" ]; then
      warn "health fallo: volviendo a $(basename "$prev")"
      ln -sfn "$prev" "$CURRENT.tmp" && mv -T "$CURRENT.tmp" "$CURRENT"
      [ -z "$RELOAD_CMD" ] || bash -c "$RELOAD_CMD" || true
    fi
    die "deploy fallido; release $(basename "$rel") queda en $RELEASES para inspeccion"
  fi
  # Poda: conserva las KEEP mas nuevas.
  ls -1d "$RELEASES"/*/ 2>/dev/null | sort | head -n "-$KEEP" | xargs -r rm -rf
  log "Listo: $(basename "$rel") activa en $CURRENT"
  log "El servidor web debe apuntar su DocumentRoot a $CURRENT (ver docs/DEPLOY.md)."
}

cmd_rollback() {
  [ -L "$CURRENT" ] || die "No hay release activa"
  local act; act="$(basename "$(readlink "$CURRENT")")"
  local prev; prev="$(ls -1 "$RELEASES" | sort | grep -B1 -Fx "$act" | head -n1)"
  { [ -n "$prev" ] && [ "$prev" != "$act" ]; } || die "No hay release anterior a $act"
  if [ "$DRY" = 1 ]; then log "[dry-run] current -> $prev"; return 0; fi
  ln -sfn "$RELEASES/$prev" "$CURRENT.tmp" && mv -T "$CURRENT.tmp" "$CURRENT"
  [ -z "$RELOAD_CMD" ] || bash -c "$RELOAD_CMD" || true
  health "${NEXUS_HEALTH_URL:-http://127.0.0.1/login.php}" || die "rollback aplicado pero el health falla"
  log "Rollback: $act -> $prev"
}

cmd_status() {
  [ -L "$CURRENT" ] && log "Activa: $(basename "$(readlink "$CURRENT")")" || log "Sin release activa"
  if [ -d "$RELEASES" ]; then ls -1 "$RELEASES" | sort | sed 's/^/  /'; fi
}

# ----------------------------------------------------------------------- podman
deploy_podman() {
  podman_ok || die "Podman rootless no esta listo. Correr 'deploy.sh check'."
  [ -n "$DB_PASSWORD" ] && [ -n "$DB_ADMIN_PASSWORD" ] \
    || die "Modo podman: definir DB_PASSWORD y DB_ADMIN_PASSWORD (root de MariaDB) en $ENV_FILE"
  if [ "$DRY" = 1 ]; then
    log "[dry-run] checkout $SHA en $SRC, generaria $SHARED/podman.env, 'podman compose up -d --build' en puerto $FRONT_PORT$([ "$SEED" = 1 ] && echo ' con seed')"
    return 0
  fi
  git -C "$SRC" checkout --quiet --detach "$SHA"
  mkdir -p "$SHARED"
  ( umask 077
    printf 'DB_ROOT_PASSWORD=%s\nDB_USER=%s\nDB_PASSWORD=%s\nFRONT_PORT=%s\n' \
      "$DB_ADMIN_PASSWORD" "$DB_USER" "$DB_PASSWORD" "$FRONT_PORT" > "$SHARED/podman.env" )
  local files=(-f "$SRC/containers/compose.yaml")
  if [ "$SEED" != 1 ]; then
    # Pisa el montaje del seed (mismo destino) con un archivo vacio: la DB de produccion
    # no recibe usuarios ficticios. Solo afecta la primera inicializacion del volumen.
    printf 'services:\n  db:\n    volumes:\n      - /dev/null:/docker-entrypoint-initdb.d/02-seed.sql:ro\n' > "$SHARED/compose.noseed.yaml"
    files+=(-f "$SHARED/compose.noseed.yaml")
  else warn "--seed: se cargan usuarios y datos ficticios (solo en la primera inicializacion)"; fi
  local compose=(podman compose); podman compose version >/dev/null 2>&1 || compose=(podman-compose)
  "${compose[@]}" "${files[@]}" --env-file "$SHARED/podman.env" up -d --build
  health "http://127.0.0.1:$FRONT_PORT/login.php" || die "El front no responde; ver 'podman logs'"
  log "Listo: ${SHA:0:7} en http://<servidor>:$FRONT_PORT"
}

# ------------------------------------------------------------------------- main
case "$CMD" in
  check)    cmd_check ;;
  status)   cmd_status ;;
  rollback) cmd_rollback ;;
  deploy)
    have git && have tar && have curl || die "Faltan git, tar o curl. Correr 'deploy.sh check'."
    sync_src
    if [ "$MODE" = auto ]; then
      if have php && have mysql && { systemctl is-active --quiet apache2 || systemctl is-active --quiet nginx; } 2>/dev/null; then MODE=native
      elif podman_ok; then MODE=podman
      else die "No hay stack nativo ni Podman utilizable. Correr 'deploy.sh check'."; fi
    fi
    log "Modo: $MODE"
    case "$MODE" in native) deploy_native ;; podman) deploy_podman ;; *) die "Modo invalido: $MODE" ;; esac ;;
esac
