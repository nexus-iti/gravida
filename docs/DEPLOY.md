# Deploy en el servidor de la UTU (Ubuntu Server)

`deploy/deploy.sh` corre en el servidor con un usuario normal y publica Nexus por releases con
un enlace `current`. `deploy/deploy.ps1` lo lanza desde Windows por SSH.

## Que modo usar

| Modo | Necesita root | Que usa | Cuando |
|---|---|---|---|
| `user` | **No** | MariaDB y `php -S` propios del usuario, puerto 8080 | El usuario de deploy no tiene sudo (caso UTU) |
| `native` | Una vez (admin) | Apache/nginx + PHP + MariaDB del sistema, puerto 80 | Si el admin instala el stack |
| `podman` | Una vez (admin) | `containers/compose.yaml` rootless | Si el admin instala podman |

`deploy.sh deploy` elige solo (`native` > `user` > `podman`); `check` dice cual corresponde y que falta.

## Primera vez (comun)

1. **Ver que hay**: `.\deploy\deploy.ps1 -Server usuario@servidor -Command check`.
2. **Deploy key** de solo lectura del repo en el servidor (`ssh-keygen`, cargar la publica en GitHub).
   Si el servidor no sale a Internet, ver "Servidor sin Internet".
3. **Credenciales**: copiar `deploy/deploy.env.example` a `~/.config/nexus/deploy.env` en el
   servidor, completarlo y `chmod 600`. No se commitea.

## Modo user (sin sudo)

Necesita en el servidor, instalados para cualquier usuario o traidos a mano (ver abajo):

- `mariadbd` y `mariadb-install-db` (MariaDB 10.6+), cliente `mariadb`/`mysql`.
- `php` 8.0+ con `pdo_mysql` y Argon2id.
- `git`, `curl`, `tar`. Un puerto libre >1024 (`NEXUS_PORT`, default 8080).

Que hace distinto:

- **`lower_case_table_names=1` ya no requiere root**: el script escribe su propio `my.cnf` y corre
  su propio `mariadbd` (datos en `<NEXUS_ROOT>/user/data`, solo 127.0.0.1:3307, socket propio,
  contrasena de root generada en `user/root.pass`, 600). Es independiente de cualquier MariaDB del sistema.
- **Servidor web**: `php -S` con 8 workers y `deploy/router.php`, que replica los bloqueos y cabeceras
  de los `.htaccess` (`config.php`, `seguridad/`, `.sql`, ocultos, `uploads/` solo imagenes, 405, 413).
  Se reinicia en cada deploy (fracciones de segundo sin servicio).
- **Arranque tras reinicio**: `deploy.sh autostart` agrega `@reboot` al crontab. Sin crontab,
  `deploy.sh start` a mano. `stop` y `start` manejan ambos procesos.
- **Acceso**: `http://<servidor>:8080`. Los usuarios no pueden usar el puerto 80. Si mas adelante el
  admin pone un proxy (Apache/nginx) delante, que apunte a `127.0.0.1:8080`.

Limites: `php -S` es el servidor embebido de PHP, no un servidor de produccion expuesto a Internet.
Para una app de uso interno en la LAN de la UTU es razonable; no exponerlo a Internet.

### Traer los binarios si el servidor no los tiene (sin verificar)

Sin root no se puede `apt install`. Alternativas, de mas a menos simple:

1. Pedir al admin que instale solo `mariadb-server php-cli php-mysql` (sin configurar nada): el
   script usa los binarios y no toca el servicio del sistema.
2. Descomprimir en `<NEXUS_ROOT>/opt/` un tarball de MariaDB (generic Linux, archive.mariadb.org) y
   apuntar `NEXUS_MARIADB_BASEDIR` a esa carpeta. Puede pedir `libaio` del sistema.
3. Un PHP CLI estatico con `pdo_mysql` y Argon2id, apuntado con `NEXUS_PHP=/ruta/php`.

En todos los casos `deploy.sh check` dice si quedo bien. Con AppArmor activo, ejecutar el
`/usr/sbin/mariadbd` del sistema con datos fuera de `/var/lib/mysql` puede ser bloqueado; en ese caso
usar el tarball propio (opcion 2).

### Servidor sin Internet

Si el servidor no llega a GitHub, hacer el `git clone` en una maquina con acceso y copiarlo con
`scp -r` a `<NEXUS_ROOT>/src`; para actualizar, `git pull` ahi y copiar de nuevo (o un `git bundle`).
`NEXUS_REPO_URL` puede ser una ruta local del servidor.

## Modo native (admin con root, una vez)

```bash
sudo apt install apache2 php libapache2-mod-php php-mysql mariadb-server git curl
sudo a2enmod rewrite headers
printf '[mysqld]\nlower_case_table_names=1\n' | sudo tee /etc/mysql/mariadb.conf.d/99-nexus.cnf
sudo systemctl restart mariadb
sudo usermod -aG www-data <usuario-de-deploy>
```

El `lower_case_table_names=1` va **antes de crear la base**: el codigo consulta `USUARIO` en
mayuscula y `database.sql` crea minuscula; Ubuntu trae 0. Si el MariaDB ya aloja otras aplicaciones,
el cambio las afecta: usar el modo `user` o `podman`. DocumentRoot en `current`:

```apache
<VirtualHost *:80>
    DocumentRoot /srv/nexus/current
    <Directory /srv/nexus/current>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

`AllowOverride All` es obligatorio (las cabeceras y bloqueos estan en `.htaccess`). Opcional:
`seguridad/apache-anti-ddos.conf`.

## Modo podman

Usa `containers/compose.yaml` (front en `NEXUS_FRONT_PORT`, default 8080; back y db en red interna).
Necesita root una vez: `apt install podman uidmap slirp4netns podman-compose`,
`usermod --add-subuids 100000-165535 --add-subgids 100000-165535 <usuario>`,
`loginctl enable-linger <usuario>`. Por defecto **no** carga `datos-prueba.sql` (usuarios ficticios);
`--seed` lo habilita. No hay rollback automatico en este modo.

## Cada deploy

```powershell
.\deploy\deploy.ps1 -Server usuario@servidor              # rama NEXUS_BRANCH
.\deploy\deploy.ps1 -Server usuario@servidor -Ref v1.0.3  # tag, rama o commit
.\deploy\deploy.ps1 -Server usuario@servidor -DryRun      # muestra el plan
.\deploy\deploy.ps1 -Server usuario@servidor -Command rollback
```

Directo en el servidor: `bash deploy/deploy.sh deploy|check|rollback|status|start|stop|autostart`.

Que hacen `native` y `user`:

1. `git fetch` y extraccion del commit con `git archive` a `releases/<fecha>-<sha>`, sin
   `containers/`, `docs/`, `deploy/`, tooling ni `database.sql`.
2. `uploads/`, `seguridad/almacen/` y `config.php` viven en `shared/` y se enlazan. `config.php` se
   regenera desde `deploy.env` en cada deploy (640).
3. `php -l` sobre todo el PHP; si falla, descarta la release y no toca `current`.
4. Crea base y usuario si faltan e importa `database.sql` solo si la base esta vacia. Nunca modifica una
   base con tablas: las migraciones se aplican a mano.
5. Cambia `current` de forma atomica, recarga/reinicia el web y hace health check (`GET /login.php` no
   debe dar 5xx: confirma PHP y conexion a la DB). Si falla, vuelve solo a la release anterior.
6. Conserva las ultimas `NEXUS_KEEP_RELEASES` (5).

## Verificado

Ubuntu 26.04 (WSL), MariaDB 11.8, PHP 8.5, usuario sin sudo:

- **user**: inicializa y arranca su MariaDB con `lower_case_table_names=1` (aunque el del sistema valga 0),
  importa `database.sql` (27 tablas), `USUARIO` en mayuscula resuelve, `GET /login.php` da 200;
  `config.php`, `seguridad/`, `database.sql` y `uploads/` dan 403; redeploy, `rollback`, `stop` y `start`
  desde `bin/deploy.sh` conservan los datos; `autostart` escribe el `@reboot`.
- **native** (Apache 2.4 + mod_php): deploy, redeploy, rollback manual y automatico por health fallido;
  con `lower_case_table_names=0` aborta antes de crear la base.
- `deploy.ps1` con `bash -s` por stdin.
- **Sin verificar**: modo podman, nginx, MariaDB 10.x, tarballs/PHP estatico traidos a mano, un reinicio
  real del servidor con `@reboot`.
