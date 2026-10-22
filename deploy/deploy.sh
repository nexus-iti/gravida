#!/usr/bin/env bash
# Deploy de Nexus en un servidor Ubuntu sin root y sin containers obligatorios.
# Corre EN el servidor, con un usuario normal (ver docs/DEPLOY.md).
#
#   deploy.sh check                  que hay y que falta en este servidor
#   deploy.sh deploy [--ref REF]     publica una release nueva (comando por defecto)
#   deploy.sh rollback               vuelve a la release anterior
#   deploy.sh status                 release activa y releases guardadas
#   deploy.sh start|stop             modo user: arranca/para MariaDB y el servidor web propios
#   deploy.sh autostart              modo user: los arranca al reiniciar el servidor (crontab @reboot)
#
# Opciones: --env ARCHIVO (default ~/.config/nexus/deploy.env)
#           --mode native|user|podman|auto   --seed (solo podman: carga datos ficticios)
#           --dry-run (muestra que haria, no cambia nada)
set -euo pipefail

CMD="deploy"; ENV_FILE="${HOME}/.config/nexus/deploy.env"; REF=""; MODE_ARG=""; SEED=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    check|deploy|rollback|status|start|stop|autostart) CMD="$1" ;;
    --env) ENV_FILE="$2"; shift ;;
    --ref) REF="$2"; shift ;;
    --mode) MODE_ARG="$2"; shift ;;
    --seed) SEED=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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

PORT="${NEXUS_PORT:-8080}"; UDB_PORT="${NEXUS_DB_PORT:-3307}"; WORKERS="${NEXUS_WORKERS:-8}"
PHP_BIN="${NEXUS_PHP:-php}"; BASEDIR="${NEXUS_MARIADB_BASEDIR:-}"

SRC="$ROOT/src"; RELEASES="$ROOT/releases"; SHARED="$ROOT/shared"; CURRENT="$ROOT/current"
UDIR="$ROOT/user"; USOCK="$UDIR/run/mysqld.sock"
EXCLUDES=(.github .claude .dockerignore .editorconfig .oxfmtrc.json .oxlintrc.json
          bun.lock package.json README.md containers docs deploy "database old" database.sql)

# ---------------------------------------------------------------------- helpers
# Cuerpo de un string PHP entre comillas simples.
phpq() { local v="${1//\\/\\\\}"; printf "'%s'" "${v//\'/\\\'}"; }

# Primer ejecutable de la lista (ruta absoluta o nombre en PATH).
first_exec() {
  local c p
  for c in "$@"; do
    [ -n "$c" ] || continue
    p="$(command -v "$c" 2>/dev/null || true)"
    if [ -n "$p" ] && [ -x "$p" ]; then printf '%s' "$p"; return 0; fi
  done
  return 1
}
MYSQL="$(first_exec "${BASEDIR:+$BASEDIR/bin/mariadb}" "${BASEDIR:+$BASEDIR/bin/mysql}" mariadb mysql || true)"
DB_CONN=(-h "$DB_HOST" -P "$DB_PORT")
mysql_app()   { MYSQL_PWD="$DB_PASSWORD" "$MYSQL" "${DB_CONN[@]}" -u "$DB_USER" "$@"; }
mysql_admin() { MYSQL_PWD="$DB_ADMIN_PASSWORD" "$MYSQL" "${DB_CONN[@]}" -u "$DB_ADMIN_USER" "$@"; }

health_url_default() {
  if [ "$MODE" = user ]; then printf 'http://127.0.0.1:%s/login.php' "$PORT"; else printf 'http://127.0.0.1/login.php'; fi
}

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

native_ok() {
  have "$PHP_BIN" && [ -n "$MYSQL" ] && { systemctl is-active --quiet apache2 || systemctl is-active --quiet nginx; } 2>/dev/null
}

# Modo user: localiza mariadbd, mariadb-install-db y un PHP con pdo_mysql (sin root).
user_find() {
  MARIADBD="$(first_exec "${BASEDIR:+$BASEDIR/bin/mariadbd}" "${BASEDIR:+$BASEDIR/sbin/mariadbd}" "${BASEDIR:+$BASEDIR/bin/mysqld}" \
    mariadbd mysqld /usr/sbin/mariadbd /usr/sbin/mysqld || true)"
  [ -n "$MARIADBD" ] || return 1
  [ -n "$BASEDIR" ] || BASEDIR="$(dirname "$(dirname "$(readlink -f "$MARIADBD")")")"
  INSTALL_DB="$(first_exec "$BASEDIR/scripts/mariadb-install-db" "$BASEDIR/bin/mariadb-install-db" "$BASEDIR/scripts/mysql_install_db" \
    "$BASEDIR/bin/mysql_install_db" mariadb-install-db /usr/bin/mariadb-install-db || true)"
  [ -n "$INSTALL_DB" ] || return 1
  [ -n "$MYSQL" ] || MYSQL="$(first_exec "$BASEDIR/bin/mariadb" "$BASEDIR/bin/mysql" || true)"
  [ -n "$MYSQL" ] || return 1
  have "$PHP_BIN" && "$PHP_BIN" -m 2>/dev/null | grep -qi '^pdo_mysql$'
}

# ------------------------------------------------------------------------ check
cmd_check() {
  log "== Servidor"
  . /etc/os-release 2>/dev/null && ok "$PRETTY_NAME, usuario $(id -un)"
  have sudo && sudo -n true 2>/dev/null && ok "sudo sin contrasena" || warn "sin sudo: no se pueden instalar paquetes; pedirselo al admin"
  for t in git tar curl; do have "$t" && ok "$t" || miss "$t"; done

  log "== PHP (modo native)"
  if have "$PHP_BIN"; then
    ok "php $("$PHP_BIN" -r 'echo PHP_VERSION;')"
    "$PHP_BIN" -r 'exit(version_compare(PHP_VERSION,"8.0","<")?1:0);' || miss "PHP >= 8.0"
    "$PHP_BIN" -m | grep -qi '^pdo_mysql$' && ok "ext pdo_mysql" || miss "ext pdo_mysql (php-mysql)"
    "$PHP_BIN" -r 'exit(defined("PASSWORD_ARGON2ID")?0:1);' && ok "Argon2id" || miss "Argon2id en PHP"
  else miss "php (php-fpm o libapache2-mod-php, php-mysql)"; fi

  log "== Web"
  for s in apache2 nginx; do systemctl is-active --quiet "$s" 2>/dev/null && ok "$s activo"; done
  { systemctl is-active --quiet apache2 || systemctl is-active --quiet nginx; } 2>/dev/null \
    || miss "ni apache2 ni nginx activos"
  id -nG | tr ' ' '\n' | grep -qx "$WEB_GROUP" && ok "usuario en grupo $WEB_GROUP" \
    || warn "usuario fuera del grupo $WEB_GROUP: el servidor web no podra escribir uploads/ ni almacen/ (admin: usermod -aG $WEB_GROUP $(id -un))"

  log "== Base de datos"
  if [ -n "$MYSQL" ]; then
    ok "cliente mysql/mariadb ($MYSQL)"
    if [ -n "$DB_ADMIN_USER$DB_USER" ] && [ -n "${DB_ADMIN_PASSWORD}${DB_PASSWORD}" ]; then
      local q; q="$( { [ -n "$DB_ADMIN_USER" ] && mysql_admin -N -e 'SELECT @@lower_case_table_names' \
                       || mysql_app -N -e 'SELECT @@lower_case_table_names'; } 2>/dev/null || true)"
      case "$q" in
        0) miss "lower_case_table_names=0: el codigo usa USUARIO/EQUIPO en mayusculas y database.sql crea minusculas. Admin: lower_case_table_names=1 en [mysqld] y o usar --mode user (MariaDB propio, sin root)" ;;
        1|2) ok "lower_case_table_names=$q" ;;
        *) warn "no se pudo conectar a la DB con las credenciales de $ENV_FILE" ;;
      esac
    else warn "sin credenciales de DB en $ENV_FILE: no se verifica lower_case_table_names"; fi
  else miss "cliente mysql (mariadb-client)"; fi

  log "== Modo user (sin root: MariaDB y PHP propios)"
  if user_find; then
    ok "mariadbd: $MARIADBD"; ok "mariadb-install-db: $INSTALL_DB"
    ok "PHP con pdo_mysql: $(command -v "$PHP_BIN")"
    { ss -ltn 2>/dev/null | grep -q ":$PORT " && warn "el puerto $PORT ya esta en uso (cambiar NEXUS_PORT)"; } || ok "puerto $PORT libre"
    have crontab && ok "crontab (para autostart)" || warn "sin crontab: el arranque tras reinicio queda manual"
  else
    miss "falta mariadbd/mariadb-install-db o php con pdo_mysql. Sin root hay que traer los binarios: docs/DEPLOY.md, 'Sin sudo'"
  fi

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
  if native_ok; then log "  MODE=native (Apache/nginx del sistema ya activo)"
  elif user_find; then log "  MODE=user (sin root, puerto $PORT)"
  elif podman_ok; then log "  MODE=podman"
  else log "  Sin stack: traer binarios (docs/DEPLOY.md, 'Sin sudo') o pedir al admin 'apt install apache2 php libapache2-mod-php php-mysql mariadb-server' o podman"; fi
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
  [ -n "$MYSQL" ] || { warn "sin cliente mysql: se omite la DB (cargarla a mano)"; return 0; }
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

# ------------------------------------------------------------- modo user (sin root)
pid_vivo() { [ -s "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

user_db_start() {
  mkdir -p "$UDIR/run" "$UDIR/data"
  # lower_case_table_names=1 va en el my.cnf propio: es lo que en el modo native requiere root.
  cat > "$UDIR/my.cnf" <<CNF
[client]
socket=$USOCK

[mysqld]
basedir=$BASEDIR
datadir=$UDIR/data
socket=$USOCK
pid-file=$UDIR/run/mysqld.pid
port=$UDB_PORT
bind-address=127.0.0.1
skip-name-resolve
lower_case_table_names=1
character-set-server=utf8mb4
log-error=$UDIR/db.log
CNF
  if [ ! -d "$UDIR/data/mysql" ]; then
    log "Inicializando MariaDB propio en $UDIR/data (lower_case_table_names=1)"
    "$INSTALL_DB" --defaults-file="$UDIR/my.cnf" --basedir="$BASEDIR" --datadir="$UDIR/data" \
      --auth-root-authentication-method=normal --skip-test-db >"$UDIR/install.log" 2>&1 \
      || die "mariadb-install-db fallo; ver $UDIR/install.log"
    rm -f "$UDIR/root.pass"
  fi
  if ! pid_vivo "$UDIR/run/mysqld.pid"; then
    log "Arrancando MariaDB propio (127.0.0.1:$UDB_PORT)"
    setsid nohup "$MARIADBD" --defaults-file="$UDIR/my.cnf" >>"$UDIR/db.log" 2>&1 &
  fi
  local i pw=""; [ -s "$UDIR/root.pass" ] && pw="$(cat "$UDIR/root.pass")"
  for i in $(seq 1 40); do
    MYSQL_PWD="$pw" "$MYSQL" -S "$USOCK" -uroot -e 'SELECT 1' >/dev/null 2>&1 && break
    sleep 1
    [ "$i" -lt 40 ] || die "MariaDB propio no arranca; ver $UDIR/db.log"
  done
  if [ ! -s "$UDIR/root.pass" ]; then
    pw="$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
    ( umask 077; printf '%s' "$pw" > "$UDIR/root.pass" )
    "$MYSQL" -S "$USOCK" -uroot -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$pw'; FLUSH PRIVILEGES;"
  fi
}

# Deja DB_* apuntando al MariaDB propio (config.php y setup_db lo usan).
user_db_env() {
  DB_HOST=127.0.0.1; DB_PORT="$UDB_PORT"; DB_ADMIN_USER=root
  DB_ADMIN_PASSWORD="$(cat "$UDIR/root.pass")"
  DB_CONN=(-S "$USOCK")
}

user_web_stop() {
  local pid pg; pid="$(cat "$UDIR/web.pid" 2>/dev/null || true)"
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then rm -f "$UDIR/web.pid"; return 0; fi
  pg="$(ps -o pgid= -p "$pid" | tr -d ' ')"
  kill -TERM -- "-$pg" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
  kill -KILL -- "-$pg" 2>/dev/null || true
  rm -f "$UDIR/web.pid"
}

# php -S fija el docroot al arrancar (resuelve el enlace current): cada deploy lo reinicia.
user_web_start() {
  [ -e "$CURRENT" ] || die "No hay release activa en $CURRENT"
  [ -f "$SHARED/router.php" ] || die "Falta $SHARED/router.php (correr deploy)"
  user_web_stop
  mkdir -p "$UDIR"
  PHP_CLI_SERVER_WORKERS="$WORKERS" setsid nohup "$PHP_BIN" \
    -d upload_max_filesize=3M -d post_max_size=3M -d expose_php=0 -d display_errors=0 \
    -d log_errors=1 -d "error_log=$UDIR/php-error.log" \
    -S "0.0.0.0:$PORT" -t "$CURRENT" "$SHARED/router.php" >>"$UDIR/web.log" 2>&1 &
  echo $! > "$UDIR/web.pid"
  sleep 1
}

reload_web() {
  if [ "$MODE" = user ]; then user_web_start
  elif [ -n "$RELOAD_CMD" ]; then log "Recarga: $RELOAD_CMD"; bash -c "$RELOAD_CMD" || warn "la recarga fallo"; fi
}

load_mode() { if [ -f "$ROOT/mode" ]; then MODE="$(cat "$ROOT/mode")"; fi; user_find >/dev/null 2>&1 || true; return 0; }

cmd_start() {
  load_mode; [ "$MODE" = user ] || die "start/stop son del modo user"
  user_find || die "Faltan binarios para el modo user (deploy.sh check)"
  user_db_start; user_web_start; log "Arriba: web :$PORT, MariaDB 127.0.0.1:$UDB_PORT"
}

cmd_stop() {
  load_mode; [ "$MODE" = user ] || die "start/stop son del modo user"
  user_web_stop
  if pid_vivo "$UDIR/run/mysqld.pid"; then kill -TERM "$(cat "$UDIR/run/mysqld.pid")"; log "MariaDB detenido"; fi
  log "Detenido"
}

cmd_autostart() {
  load_mode; [ "$MODE" = user ] || die "autostart es del modo user"
  have crontab || die "No hay crontab; arrancar a mano con 'deploy.sh start' tras cada reinicio"
  local linea="@reboot /bin/bash $ROOT/bin/deploy.sh start --env $ENV_FILE >> $UDIR/boot.log 2>&1"
  { crontab -l 2>/dev/null | grep -vF "$ROOT/bin/deploy.sh start" || true; echo "$linea"; } | crontab -
  log "crontab: $linea"
}

deploy_native() {
  local rel="$RELEASES/$(date +%Y%m%d-%H%M%S)-${SHA:0:7}"
  if [ "$DRY" = 1 ]; then
    log "[dry-run] crearia $rel, enlazaria uploads/almacen/config.php desde $SHARED, validaria DB, php -l, current -> release, health"
    return 0
  fi
  mkdir -p "$rel" "$SHARED/almacen"
  if [ "$MODE" = user ]; then
    user_find || { rmdir "$rel"; die "Modo user: faltan binarios (deploy.sh check)"; }
    user_db_start; user_db_env
  fi
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

  if have "$PHP_BIN"; then
    log "Validando sintaxis PHP"
    find "$rel" -name '*.php' -not -path '*/vendor/*' -print0 | xargs -0 -n1 "$PHP_BIN" -l >/dev/null \
      || { rm -rf "$rel"; die "php -l fallo; release descartada, current intacto"; }
  fi
  setup_db

  local prev=""; [ -L "$CURRENT" ] && prev="$(readlink "$CURRENT")"
  ln -sfn "$rel" "$CURRENT.tmp" && mv -T "$CURRENT.tmp" "$CURRENT"
  if [ "$MODE" = user ]; then
    git -C "$SRC" show "$SHA:deploy/router.php" > "$SHARED/router.php"
    mkdir -p "$ROOT/bin"; git -C "$SRC" show "$SHA:deploy/deploy.sh" > "$ROOT/bin/deploy.sh"
    echo user > "$ROOT/mode"
  fi
  reload_web

  if ! health "${NEXUS_HEALTH_URL:-$(health_url_default)}"; then
    if [ -z "$prev" ] && [ "$HEALTH_CODE" = "000" ]; then
      warn "primer deploy y el servidor web no responde: apuntar su DocumentRoot a $CURRENT, arrancarlo y correr 'deploy.sh status'/check"
      log "Release $(basename "$rel") activa en $CURRENT (sin health check)"; return 0
    fi
    if [ -n "$prev" ] && [ -d "$prev" ]; then
      warn "health fallo: volviendo a $(basename "$prev")"
      ln -sfn "$prev" "$CURRENT.tmp" && mv -T "$CURRENT.tmp" "$CURRENT"
      reload_web || true
    fi
    die "deploy fallido; release $(basename "$rel") queda en $RELEASES para inspeccion"
  fi
  # Poda: conserva las KEEP mas nuevas.
  ls -1d "$RELEASES"/*/ 2>/dev/null | sort | head -n "-$KEEP" | xargs -r rm -rf
  log "Listo: $(basename "$rel") activa en $CURRENT"
  if [ "$MODE" = user ]; then log "Sitio en http://<servidor>:$PORT (usar 'deploy.sh autostart' para que sobreviva a reinicios)"
  else log "El servidor web debe apuntar su DocumentRoot a $CURRENT (ver docs/DEPLOY.md)."; fi
}

cmd_rollback() {
  load_mode
  [ -L "$CURRENT" ] || die "No hay release activa"
  local act; act="$(basename "$(readlink "$CURRENT")")"
  local prev; prev="$(ls -1 "$RELEASES" | sort | grep -B1 -Fx "$act" | head -n1)"
  { [ -n "$prev" ] && [ "$prev" != "$act" ]; } || die "No hay release anterior a $act"
  if [ "$DRY" = 1 ]; then log "[dry-run] current -> $prev"; return 0; fi
  ln -sfn "$RELEASES/$prev" "$CURRENT.tmp" && mv -T "$CURRENT.tmp" "$CURRENT"
  reload_web || true
  health "${NEXUS_HEALTH_URL:-$(health_url_default)}" || die "rollback aplicado pero el health falla"
  log "Rollback: $act -> $prev"
}

cmd_status() {
  load_mode
  if [ "$MODE" = user ]; then
    if pid_vivo "$UDIR/web.pid"; then log "Web :$PORT: arriba"; else log "Web :$PORT: detenida"; fi
    if pid_vivo "$UDIR/run/mysqld.pid"; then log "MariaDB: arriba"; else log "MariaDB: detenido"; fi
  fi
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
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  autostart) cmd_autostart ;;
  status)   cmd_status ;;
  rollback) cmd_rollback ;;
  deploy)
    have git && have tar && have curl || die "Faltan git, tar o curl. Correr 'deploy.sh check'."
    sync_src
    if [ "$MODE" = auto ]; then
      if native_ok; then MODE=native
      elif user_find; then MODE=user
      elif podman_ok; then MODE=podman
      else die "No hay stack nativo ni Podman utilizable. Correr 'deploy.sh check'."; fi
    fi
    log "Modo: $MODE"
    case "$MODE" in native|user) deploy_native ;; podman) deploy_podman ;; *) die "Modo invalido: $MODE" ;; esac ;;
esac
