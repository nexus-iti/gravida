#!/usr/bin/env bash
# Deploy del entorno de prueba de NEXUS (nexus.wefaber.net).
#
#   deploy/nexus-deploy.sh              deploya el HEAD del checkout
#   IMAGE_TAG=<tag> deploy/nexus-deploy.sh
#   deploy/nexus-deploy.sh rollback     vuelve al deploy anterior sano
#   deploy/nexus-deploy.sh status       tag activo, contenedores y healthcheck
#
# Lo corre .github/workflows/deploy.yml en el runner self-hosted (vps-nexus), pero
# tambien se puede ejecutar a mano en el VPS con el mismo env:
#   ~/deploy/env/nexus-test.env   credenciales del stack (600, fuera del repo)
#
# Que hace un deploy:
#   1. construye nexus-front:<tag> y nexus-back:<tag> (si el build falla no toca nada);
#   2. recrea solo front y back: la db y sus volumenes no se tocan;
#   3. espera el healthcheck real (PHP responde y la consulta a USUARIO contesta);
#   4. si no levanta, vuelve a las imagenes del deploy anterior y sale con error.
#
# Imagenes y rollback: cada deploy deja front/back taggeadas con el commit. El rollback
# usa el tag del estado anterior, asi que no depende de que el commit viejo siga en git.
#
# Variables:
#   NEXUS_ENV_FILE      env del stack (default ~/deploy/env/nexus-test.env)
#   NEXUS_STATE_DIR     estado del deploy (default ~/deploy/state)
#   NEXUS_PROJECT       nombre del proyecto compose (default nexus-test)
#   NEXUS_HEALTH_TIMEOUT segundos de espera del healthcheck (default 120)
#   NEXUS_KEEP_TAGS     tags de imagenes que se conservan (default 5)
#   IMAGE_TAG           tag a deployar (default: commit corto del checkout)
set -euo pipefail

ROOT="${NEXUS_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${NEXUS_ENV_FILE:-$HOME/deploy/env/nexus-test.env}"
STATE_DIR="${NEXUS_STATE_DIR:-$HOME/deploy/state}"
STATE_FILE="$STATE_DIR/nexus-deploy.env"
HISTORY_FILE="$STATE_DIR/nexus-deploy.history"
PROJECT="${NEXUS_PROJECT:-nexus-test}"
COMPOSE_FILE="$ROOT/containers/compose.yaml"
HEALTH_TIMEOUT="${NEXUS_HEALTH_TIMEOUT:-120}"
KEEP_TAGS="${NEXUS_KEEP_TAGS:-5}"
CMD="${1:-deploy}"

log()  { printf '%s\n' "$*"; }
paso() { printf '\n==> %s\n' "$*"; }
ok()   { printf '    ok    %s\n' "$*"; }
aviso(){ printf '    aviso %s\n' "$*"; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

compose() {
  podman compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# ---------------------------------------------------------------- preflight
puerto_front() {
  local p
  p="$(grep -E '^FRONT_PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
  printf '%s' "${p:-8080}"
}

contenedor_db() {
  podman ps \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter "label=com.docker.compose.service=db" \
    --format '{{.Names}}' | head -1
}

preflight() {
  paso "Preflight"
  [ -f "$COMPOSE_FILE" ] || die "No existe $COMPOSE_FILE (NEXUS_REPO_DIR=$ROOT)"
  [ -f "$ENV_FILE" ] || die "No existe el env del stack: $ENV_FILE"
  command -v podman >/dev/null 2>&1 || die "podman no esta en el PATH"
  podman info >/dev/null 2>&1 || die "podman no responde (socket rootless: DOCKER_HOST/XDG_RUNTIME_DIR)"
  ok "podman $(podman --version | awk '{print $3}')"
  mkdir -p "$STATE_DIR"

  local db estado
  db="$(contenedor_db)"
  [ -n "$db" ] || die "No hay servicio db en el proyecto $PROJECT. Levanta el stack antes de deployar (el deploy no crea la db)."
  estado="$(podman inspect "$db" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || echo desconocido)"
  [ "$estado" = healthy ] || die "La db ($db) esta '$estado'. El deploy no toca la db: revisala antes de seguir."
  ok "db $db healthy"

  local port
  port="$(puerto_front)"
  ok "front publicado en 127.0.0.1:$port"

  compose config --quiet || die "El compose no valida (revisa containers/compose.yaml y $ENV_FILE)"
  ok "compose valido"
}

# ---------------------------------------------------------------- healthcheck
# GET /login.php: prueba que front y php-fpm responden (lo sirve el back).
# POST con un identificador unico: si devuelve 401, la consulta a USUARIO corrio, o sea
# la db vive. El identificador cambia en cada intento a proposito: con uno fijo, 5 fallos
# bloquean la cuenta y despues la IP (429, SEG_LOGIN_MAX_FALLOS_IP=20) y el healthcheck
# se romperia a si mismo. Por eso tambien se sondea poco y espaciado.
healthcheck() {
  local port="$1" intentos="${2:-6}" espera="${3:-5}"
  local url="http://127.0.0.1:$port/login.php"
  local i codigo salida cuerpo ident

  for ((i = 1; i <= intentos; i++)); do
    codigo="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$url" || echo 000)"
    if [ "$codigo" = 200 ]; then
      ident="99990000$RANDOM$i"
      salida="$(curl -s -m 5 -w '\n%{http_code}' -X POST \
        --data-urlencode "identificador=$ident" --data-urlencode 'contrasena=healthcheck-ci' \
        "$url" || printf '\n000')"
      cuerpo="${salida%$'\n'*}"
      codigo="${salida##*$'\n'}"
      if [ "$codigo" = 401 ] && printf '%s' "$cuerpo" | grep -qi 'incorrectos'; then
        ok "healthcheck: PHP y base de datos responden"
        return 0
      fi
      aviso "intento $i/$intentos: POST login.php -> $codigo (se espera 401 con credenciales incorrectas)"
    else
      aviso "intento $i/$intentos: GET login.php -> $codigo"
    fi
    sleep "$espera"
  done
  return 1
}

esperar_health() {
  paso "Healthcheck en 127.0.0.1:$1"
  local limite=$((SECONDS + HEALTH_TIMEOUT))
  while [ $SECONDS -lt $limite ]; do
    if healthcheck "$1" 3 4; then return 0; fi
    sleep 3
  done
  return 1
}

# ---------------------------------------------------------------- deploy
tag_actual() {
  if [ -n "${IMAGE_TAG:-}" ]; then printf '%s' "$IMAGE_TAG"; return; fi
  git -C "$ROOT" rev-parse --short=12 HEAD
}

tag_anterior() {
  [ -f "$STATE_FILE" ] || return 0
  grep -E '^TAG=' "$STATE_FILE" | tail -1 | cut -d= -f2- || true
}

guardar_estado() {
  local tag="$1"
  printf 'TAG=%s\nDEPLOYED_AT=%s\nCOMMIT=%s\n' \
    "$tag" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo '-')" \
    > "$STATE_FILE"
  { printf '%s\n' "$tag"; grep -vxF "$tag" "$HISTORY_FILE" 2>/dev/null || true; } | head -"$KEEP_TAGS" > "$HISTORY_FILE.tmp"
  mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"
}

podar_imagenes() {
  local tag
  while IFS= read -r tag; do
    case "$tag" in '' | '-' | latest) continue ;; esac
    if grep -qxF "$tag" "$HISTORY_FILE" 2>/dev/null; then continue; fi
    podman rmi "nexus-front:$tag" "nexus-back:$tag" >/dev/null 2>&1 || true
  done < <(podman images --format '{{.Tag}}' nexus-front nexus-back 2>/dev/null | sort -u)
}

construir() {
  local tag="$1"
  paso "Build de imagenes ($tag)"
  IMAGE_TAG="$tag" compose build front back || die "Fallo el build. No se toco nada: sigue corriendo el deploy anterior."
  ok "nexus-front:$tag y nexus-back:$tag construidas"
}

levantar() {
  local tag="$1"
  paso "Recreando front y back con el tag $tag"
  IMAGE_TAG="$tag" compose up -d --no-deps --no-build front back || die "Fallo el up de front/back"
  ok "contenedores arriba"
}

deployar() {
  preflight
  local tag prev port
  tag="$(tag_actual)"
  prev="$(tag_anterior)"
  port="$(puerto_front)"
  log "    tag a deployar: $tag   (deploy anterior: ${prev:-ninguno})"

  construir "$tag"
  levantar "$tag"

  if esperar_health "$port"; then
    guardar_estado "$tag"
    podar_imagenes
    paso "Deploy OK: $tag activo en 127.0.0.1:$port"
    return 0
  fi

  paso "Healthcheck FALLIDO con el tag $tag"
  podman logs --tail 40 "$(podman ps -a --filter "label=com.docker.compose.project=$PROJECT" --filter "label=com.docker.compose.service=back" --format '{{.Names}}' | head -1)" 2>&1 | tail -40 || true
  if [ -z "$prev" ] || [ "$prev" = "$tag" ]; then
    die "No hay deploy anterior del que volver. Revisa los logs de arriba y corrige a mano."
  fi
  paso "Rollback al tag $prev"
  IMAGE_TAG="$prev" compose up -d --no-deps --no-build front back || die "Fallo el rollback. El entorno quedo con el tag $tag: atender a mano."
  if esperar_health "$port"; then
    guardar_estado "$prev"
    die "Deploy de $tag revertido: sigue activo $prev. Revisa el healthcheck del commit nuevo."
  fi
  die "Rollback a $prev tampoco levanta. El entorno esta caido: revisar a mano."
}

status() {
  local db
  paso "Estado del proyecto $PROJECT"
  log "    env:    $ENV_FILE"
  log "    tag:    $(tag_anterior || true)"
  [ -f "$STATE_FILE" ] && sed 's/^/    /' "$STATE_FILE"
  db="$(contenedor_db)"
  podman ps --filter "label=com.docker.compose.project=$PROJECT" \
    --format '    {{.Names}}  {{.Status}}  {{.Image}}'
  step_port="$(puerto_front)"
  healthcheck "$step_port" 1 0 && log "    healthcheck: ok" || log "    healthcheck: FALLA"
}

case "$CMD" in
  deploy) deployar ;;
  rollback)
    preflight
    prev="$(tag_anterior)"
    [ -n "$prev" ] || die "No hay tag anterior en $STATE_FILE"
    levantar "$prev"
    esperar_health "$(puerto_front)" || die "El rollback a $prev no levanta"
    guardar_estado "$prev"
    paso "Rollback OK: $prev activo"
    ;;
  status) status ;;
  -h | --help) sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) die "Comando desconocido: $CMD (deploy | rollback | status)" ;;
esac
