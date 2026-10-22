# Deploy en el servidor de la UTU (Ubuntu Server)

`deploy/deploy.sh` corre en el servidor con un usuario normal (sin root) y publica
Nexus por releases con un enlace `current`. `deploy/deploy.ps1` lo lanza desde Windows
por SSH.

## Primera vez

1. **Ver que hay**: `.\deploy\deploy.ps1 -Server usuario@servidor -Command check`.
   Lista lo que falta (`[falta]`) y recomienda `native` o `podman`.
2. **Pedir al admin lo que falte** (una sola vez, necesita root):

   | Modo | Paquetes y ajustes |
   |---|---|
   | native | `apt install apache2 php libapache2-mod-php php-mysql mariadb-server git curl`; `a2enmod rewrite headers`; usuario de deploy en el grupo `www-data` |
   | podman | `apt install podman uidmap slirp4netns podman-compose`; `usermod --add-subuids 100000-165535 --add-subgids 100000-165535 <usuario>`; `loginctl enable-linger <usuario>` |

   Podman rootless se instala solo con root; sin admin no se puede. `native` es lo recomendado: el
   proyecto esta pensado para Apache + PHP + MariaDB.
3. **MariaDB (solo native)**: el codigo consulta tablas en mayuscula (`USUARIO`) y `database.sql`
   las crea en minuscula, asi que el servidor necesita `lower_case_table_names=1` en `[mysqld]`
   **antes de crear la base**. `check` lo verifica y el deploy se niega a importar si vale 0.
4. **Apache (solo native)**: DocumentRoot apuntando a `current`:

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

   `AllowOverride All` es obligatorio: las cabeceras y los bloqueos estan en `.htaccess`.
   Opcional: `seguridad/apache-anti-ddos.conf` (ajustar la ruta del `Include`).
5. **Deploy key** de solo lectura del repo en el servidor (`ssh-keygen`, cargar la publica en GitHub).
6. **Credenciales**: copiar `deploy/deploy.env.example` a `~/.config/nexus/deploy.env` en el
   servidor, completarlo y `chmod 600`. No se commitea.

## Cada deploy

```powershell
.\deploy\deploy.ps1 -Server usuario@servidor              # rama NEXUS_BRANCH
.\deploy\deploy.ps1 -Server usuario@servidor -Ref v1.0.3  # tag, rama o commit
.\deploy\deploy.ps1 -Server usuario@servidor -DryRun      # muestra el plan
.\deploy\deploy.ps1 -Server usuario@servidor -Command rollback
```

Directo en el servidor: `bash deploy/deploy.sh deploy|check|rollback|status`.

### Que hace el modo native

1. Baja el codigo (`git fetch`) y extrae el commit con `git archive` a `releases/<fecha>-<sha>`,
   sin `containers/`, `docs/`, `deploy/`, tooling ni `database.sql`.
2. Enlaza el estado que sobrevive: `uploads/`, `seguridad/almacen/` y `config.php` viven en `shared/`.
   `config.php` se regenera desde `deploy.env` en cada deploy (permisos 640, grupo web).
3. `php -l` sobre todo el PHP. Si falla, descarta la release y no toca `current`.
4. Crea base y usuario si faltan (con `DB_ADMIN_*`) e importa `database.sql` solo si la base esta vacia.
   Nunca modifica una base con tablas: las migraciones se aplican a mano.
5. Cambia `current` de forma atomica, recarga si hay `NEXUS_RELOAD_CMD` y hace health check
   (`GET /login.php` no debe dar 5xx: confirma PHP y conexion a la DB). Si falla vuelve solo a la release anterior.
6. Conserva las ultimas `NEXUS_KEEP_RELEASES` (5).

### Modo podman

Usa `containers/compose.yaml` (front en `NEXUS_FRONT_PORT`, default 8080, back y db en red interna).
Por defecto **no** carga `datos-prueba.sql` (usuarios ficticios); `--seed` lo habilita. El seed y el
esquema solo se aplican al inicializar el volumen `db-data`. No hay rollback automatico en este modo.

## Verificado

- `check`, `deploy`, segundo deploy, `status` y `rollback` en Ubuntu (WSL) con un servidor estatico
  como health. `deploy.ps1` probado con `bash -s` por stdin.
- **Sin verificar**: importacion contra MariaDB real, Apache real y el modo podman (esos
  binarios no estan en la maquina de desarrollo). Probar primero con `-DryRun` y `-Command check`.
