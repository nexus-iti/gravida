# Datos de prueba de Nexus

`datos-prueba.sql` carga un juego de datos **ficticio** para el entorno de Podman.
No contiene datos de personas reales: las cedulas son `900000xx`, los correos son
`@example.test` y los nombres son inventados.

## Como se carga

Automatico: `compose.yaml` monta el archivo como `/docker-entrypoint-initdb.d/02-seed.sql`,
asi que un volumen nuevo (`podman compose down -v && up -d`) arranca con el esquema de
`database.sql` y estos datos.

Manual, sobre una base ya inicializada:

```bash
cd /home/hermes/repos/gravida
podman exec -i nexus-test-db-1 mariadb -unexus_app -p"$DB_PASSWORD" nexus < containers/seed/datos-prueba.sql
```

Todos los `INSERT` son upsert por clave primaria, asi que correrlo dos veces no duplica nada.
Los identificadores de equipos, ubicaciones, servicios, incidencias y prestamos arrancan en
`900` para no chocar con las filas que ya trae `database.sql`.

## Credenciales de prueba

Contrasenas hasheadas con `password_hash(..., PASSWORD_ARGON2ID)`, mismo formato que
`database.sql` (`$argon2id$v=19$m=65536,t=4,p=1$...`).

| Cedula | Correo | Rol | Contrasena |
|---|---|---|---|
| 90000001 | admin.nexus@example.test | Administrador | `NexusAdmin2026!` |
| 90000002 | tecnico1.nexus@example.test | Tecnico_Asistente | `NexusTecnico2026!` |
| 90000003 | tecnico2.nexus@example.test | Tecnico_Asistente | `NexusTecnico2026!` |
| 90000004 | solicitante1.nexus@example.test | Solicitante | `NexusSolicitante2026!` |
| 90000005 | solicitante2.nexus@example.test | Solicitante | `NexusSolicitante2026!` |

Se puede entrar con la cedula o con el correo: `login.php` acepta las dos.

## Segundo factor del administrador (2FA)

`seguridad/bootstrap.php` tiene `SEG_2FA_OBLIGATORIO_ADMIN = true`: un Administrador no
completa el login solo con la contrasena.

El admin de prueba (`90000001`) viene con `totp_secreto = JBSWY3DPEHPK3PXP` cargado, asi que
el primer POST devuelve `{"ok":true,"paso":"codigo_2fa"}` y hay que mandar el codigo:

```bash
# codigo de 6 digitos para el secreto de prueba (TOTP, 30 s, SHA1, 6 digitos)
podman exec nexus-test-back-1 php -r '
require "/var/www/html/seguridad/totp.php";
echo totpCodigo("JBSWY3DPEHPK3PXP", (int) floor(time() / 30)), "\n";'

# segundo paso del login, reusando la cookie de sesion del primer POST
curl -s -c /tmp/c.txt -b /tmp/c.txt -X POST \
  -d 'accion=verificar_2fa&codigo=<CODIGO>' http://127.0.0.1:18080/login.php
```

Para ver el enrolamiento desde cero (el flujo que ve un admin nuevo): vaciar el secreto y
volver a entrar. La contrasena sola devuelve `paso=activar_2fa` con el secreto nuevo y la URI
`otpauth://` para escanear:

```bash
podman exec nexus-test-db-1 mariadb -unexus_app -p"$DB_PASSWORD" nexus \
  -e "UPDATE usuario SET totp_secreto=NULL, totp_ultimo_paso=NULL WHERE cedula='90000001';"
```

Un mismo codigo no sirve dos veces: `totp_ultimo_paso` guarda el ultimo paso usado, asi que
hay que esperar al siguiente de 30 s.

## Contenido

| Tabla | Filas del seed |
|---|---|
| usuario | 5 (1 Administrador, 2 Tecnico_Asistente, 2 Solicitante) |
| ubicacion | 3 |
| equipo | 5 (4 Disponible, 1 Mantenimiento) |
| servicio | 3 (Pendiente, En proceso, Finalizado) |
| incidencia | 3 (Pendiente, En proceso, Resuelto) |
| prestamo | 3 (Activo, Devuelto, Solicitado) |

## Aviso sobre `database.sql`

El `database.sql` del repo trae usuarios de ejemplo **con correos reales y hashes reales**
(Administrador incluido, con 2FA activo). Si este entorno se publica, esas cuentas quedan
expuestas en el login publico. Los datos de este seed no reemplazan a los de `database.sql`:
se suman. Ver el reporte del entorno de prueba antes de publicar.

## Datos variados y pill de usuarios (v1.0.18)

`datos-variados.sql` suma un segundo juego de datos ficticios (ids desde `2001`, cedulas uruguayas con digito verificador valido) pensado
para validar a mano todos los flujos: tres roles, cuentas inactivas / sin aprobar / con cambio de
contrasena obligatorio, prestamos en los cuatro estados (uno vencido, uno devuelto tarde, uno dado de baja),
servicios e incidencias en todos sus estados, stock agotado / en mantenimiento / de baja, tareas del kanban
con horarios de tecnicos, y solicitudes de registro y de cambio de rol.

Es idempotente (`ON DUPLICATE KEY UPDATE <pk> = <pk>`) y no usa `INSERT IGNORE`: un error real corta la carga.
Carga manual sobre una base ya inicializada:

```bash
cd /home/hermes/repos/gravida
podman exec -i nexus-test-db-1 mariadb -unexus_app -p"$DB_PASSWORD" nexus < containers/seed/datos-variados.sql
```

| Cedula | Rol | Contrasena | Para probar |
|---|---|---|---|
| 39251846 | Administrador | `NexusAdmin2026!` | 2FA activo (secreto `JBSWY3DPEHPK3PXP`) |
| 43762914 | Administrador | `NexusAdmin2026!` | sin 2FA: muestra el enrolamiento con QR |
| 51284732, 46510299, 53908144 | Tecnico_Asistente | `NexusTecnico2026!` | tecnicos por turno (manana, tarde, noche) |
| 55471268 | Tecnico_Asistente | `NexusTecnico2026!` | debe cambiar la contrasena al entrar |
| 37184520 | Tecnico_Asistente | `NexusTecnico2026!` | dado de baja: el login lo rechaza |
| 42839152, 38642076, 49756311, 35427681, 56120496 | Solicitante | `NexusSolicitante2026!` | uso normal; `35427681` tiene un prestamo vencido |
| 41087538 | Solicitante | `NexusSolicitante2026!` | dado de baja: el login lo rechaza |
| 57332806, 44693126 | Solicitante | `NexusSolicitante2026!` | registro pendiente / rechazado: el login los rechaza |

### Pill de usuarios de prueba en el login

`usuarios-prueba.json` alimenta el boton flotante "Usuarios de prueba" (abajo a la izquierda del login, para no
tapar el panel de la API del servidor de desarrollo; `js/features/dev-login/dev-login.js`): un click entra como ese usuario, el lapiz solo completa el formulario.
Con los administradores que tienen 2FA calcula el codigo TOTP y lo manda solo.

- Solo existe en el entorno de prueba: `containers/front/Containerfile` copia el JSON como `/dev-usuarios.json`.
  Sin ese archivo el script no dibuja nada, asi que el codigo de produccion no lleva credenciales.
- Si se agregan usuarios al SQL, agregarlos tambien al JSON y rebuildear el front (deploy a `dev`).
- Las cedulas siguen el formato uruguayo: 7 digitos mas el verificador (pesos 2, 9, 8, 7, 6, 3, 4; verificador =
  `(10 - suma % 10) % 10`). Son numeros validos pero inventados para el seed. La app solo valida que sean digitos
  (`Cedula.php`), no el verificador.
- El servidor de desarrollo local (`bun dev`) tambien sirve `/dev-usuarios.json`, asi que el pill aparece ahi si la
  base local tiene cargado `datos-variados.sql`.
- Las cuentas `90000001` a `90000005` (seed original) no estan en el pill: en nexus-test estan inactivas.
