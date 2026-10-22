# Deploy del entorno de prueba

`nexus.wefaber.net` corre el stack de `containers/compose.yaml` (front nginx, back
php-fpm, db MariaDB) con Podman rootless del usuario `hermes` en el VPS, y nginx del
host lo publica con Cloudflare Access adelante.

El deploy es automático: cada push a `dev` dispara
`.github/workflows/deploy.yml` en el runner self-hosted `vps-nexus`, que ejecuta
`deploy/nexus-deploy.sh`.

## Qué hace un deploy

1. Construye `nexus-front:<commit>` y `nexus-back:<commit>`. Si el build falla, no
   toca nada: sigue corriendo el deploy anterior.
2. Recrea solo `front` y `back`. La db, sus volúmenes y los uploads no se tocan.
3. Healthcheck real contra `http://127.0.0.1:18080/login.php`:
   - `GET` tiene que dar 200 (front + php-fpm responden);
   - `POST` con un identificador inventado tiene que dar 401 con "incorrectos", que
     es la respuesta que solo aparece si la consulta a `USUARIO` corrió contra la db.
4. Si el healthcheck no pasa, vuelve a las imágenes del deploy anterior y el run de
   GitHub queda en rojo.

El identificador del `POST` cambia en cada intento a propósito: con uno fijo, cinco
fallos bloquean la cuenta y la IP (`SEG_LOGIN_MAX_FALLOS_IP`), y el healthcheck se
rompería a sí mismo con 429.

## Uso manual en el VPS

```bash
cd ~/repos/gravida
export DOCKER_HOST=unix:///run/user/1001/podman/podman.sock
export XDG_RUNTIME_DIR=/run/user/1001
export NEXUS_ENV_FILE=~/deploy/env/nexus-test.env

bash deploy/nexus-deploy.sh status     # tag activo, contenedores y healthcheck
bash deploy/nexus-deploy.sh            # deploya el HEAD del checkout
IMAGE_TAG=<tag> bash deploy/nexus-deploy.sh   # deploya un tag de imágenes ya construido
bash deploy/nexus-deploy.sh rollback   # vuelve al deploy anterior sano
```

## Dónde vive cada cosa (fuera del repo)

| Qué | Dónde |
| --- | --- |
| Credenciales del stack (`DB_PASSWORD`, `FRONT_PORT`, ...) | `~/deploy/env/nexus-test.env` (600) |
| Estado del deploy (tag activo) | `~/deploy/state/nexus-deploy.env` |
| Historial de tags para rollback | `~/deploy/state/nexus-deploy.history` |
| Proyecto compose | `nexus-test`, front en `127.0.0.1:18080` |

Ningún secreto pasa por GitHub: el workflow no tiene secrets, lee el env del servidor.

## Primera vez / recuperar el entorno

Si el stack no existe (por ejemplo después de un reinicio del VPS sin autostart):

```bash
podman compose -f containers/compose.yaml --env-file ~/deploy/env/nexus-test.env up -d
```

Eso crea la db y carga `database.sql` en la primera inicialización. Después ya se puede
usar `nexus-deploy.sh`, que no crea la db.

## Notas

- El front se publica **solo en loopback**: nginx del host es el único que le habla y
  es quien aplica el gate de Cloudflare Access.
- No hay blue/green todavía: el deploy recrea front y back en el mismo puerto (unos
  segundos de corte). El rollback es por tag de imagen, no por slot. Si el entorno pasa
  a usarse para demos en vivo, conviene migrar a dos slots con upstream en nginx.
- Prune: se conservan las últimas 5 parejas de imágenes (`NEXUS_KEEP_TAGS`).
