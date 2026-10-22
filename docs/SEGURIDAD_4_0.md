# Sistema de ciberseguridad de NEXUS — versión 4.0

> Esta edición integra los controles de la tercera entrega. `database.sql` contiene el esquema final completo. Las migraciones históricas están archivadas en `database old` y no se necesitan para una instalación nueva. Los scripts de firewall, respaldo y configuración de Apache son herramientas operativas opcionales: deben revisarse y ajustarse al entorno antes de ejecutarlos.

Este documento explica qué defensa responde a cada ficha de la auditoría (F-01 a F-11 y la nota sobre HTTPS), qué se agregó en la 3ra entrega y cómo volver a probarlo.

La 2da entrega quedó como estaba originalmente, sin estas defensas. Toda la ciberseguridad vive en esta carpeta.

## Qué trae la 3ra entrega

**Resistencia al phishing (F-08)**
- **Verificación en dos pasos (TOTP)**: además de la contraseña, se pide un código de 6 dígitos de una app del teléfono (Google Authenticator, Microsoft Authenticator o Authy). Es **obligatoria para los administradores** y opcional para el resto. Si alguien roba una contraseña con un correo falso, igual no puede entrar.
- **Códigos de un solo uso**: un código ya usado se rechaza, aunque todavía esté vigente. Si un sitio falso lo captura, no sirve de nuevo.
- **Historial de accesos**: en *Cuenta* se ven los últimos ingresos, intentos fallidos y cambios de seguridad, con fecha, IP y navegador.
- **Cerrar todas las sesiones**: si alguien entró con la cuenta, un clic lo deja afuera. Cambiar la contraseña también cierra las demás sesiones.
- **Cambio de contraseña**: antes la app no tenía forma de cambiarla. Pide la contraseña actual y aplica la política de contraseñas.
- **Aviso del último ingreso**: al entrar se muestra cuándo y desde dónde fue el ingreso anterior.
- **Dirección visible en el login**: la pantalla muestra la dirección real del sitio, con un recordatorio de que nunca se piden contraseñas ni códigos por correo, WhatsApp o teléfono. Un sitio falso puede copiar el diseño, pero no el dominio.

**Resistencia a DDoS (F-10)**
- **Filtro temprano**: IPs bloqueadas, tamaño de la petición y límite por IP se revisan *antes* de conectar a MySQL. Una inundación no agota las conexiones de la base de datos.
- **Bloqueo escalonado de IPs**: una IP que excede los límites en 3 ventanas distintas dentro de 10 minutos queda bloqueada 15 minutos por completo.
- **Modo de ataque**: con un comando, los límites se vuelven 4 veces más estrictos y se cierra el registro público mientras dure el ataque.
- **Limpieza de contadores**: un ataque con miles de IPs no llena el disco de archivos de conteo.
- **Soporte para Cloudflare**: detrás de su proxy, los límites usan la IP real del visitante. Solo se acepta ese dato si la conexión viene de los rangos de Cloudflare, así que no se puede falsificar.
- **Apache contra Slowloris** (`seguridad/apache-anti-ddos.conf`): activa `mod_reqtimeout`, que XAMPP trae desactivado, y acorta los tiempos de espera.
- **Firewall solo para Cloudflare** (`seguridad/firewall-cloudflare.ps1`): el servidor deja de aceptar tráfico web directo, así nadie se saltea la protección de Cloudflare.
- **Caché de archivos estáticos**: el navegador guarda CSS, JS e imágenes, así cada visita pide menos al servidor.

**Arreglos de la revisión de seguridad**
- El límite de 5 intentos por cuenta ya no se evade cambiando el formato del identificador (correo o cédula, puntos, espacios, mayúsculas).
- Una contraseña correcta en una cuenta todavía no aprobada no cuenta como intento fallido.
- Si el contador de límites no puede usar el disco, se registra (`limite_no_disponible`), y el login y el registro fallan cerrados (503).
- CSP sin `'unsafe-inline'` en `script-src`: el código de cada página se pasó a `js/paginas/`.
- Cambiar el estado de un ticket ya no borra al técnico asignado si no se indica otro.
- Ajustes menores: el escáner de integridad revisa los archivos grandes y la carpeta `seguridad/`; el respaldo usa un usuario de solo lectura y no expone la clave en la lista de procesos; la foto WebP se rechaza si el servidor no puede recodificarla; se escapa la URL de la foto de perfil; el usuario `sgrsi_app` se crea también para `127.0.0.1`.

## Arquitectura

```
navegador ──HTTPS──► [Cloudflare, opcional] ──► firewall (solo Cloudflare) ──► Apache
                                                   │  apache-anti-ddos.conf: Slowloris, tiempos, encabezados
                                                   │  .htaccess: HTTPS, CSP, cabeceras, bloqueos, caché
                                                   │
                        ├─ login.php ............ contraseña ─► segundo factor (TOTP) ─► sesión
                        └─ api/*.php ─► api/common.php
                                          1. segFiltroTemprano()  ← SIN base de datos
                                             IP bloqueada · tamaño · límite por IP · modo de ataque
                                          2. conexión a MySQL (config.php)
                                          3. segProtegerApi()
                                             sesión segura + CSRF · versión de sesión · límite por usuario
                                             deniega por defecto · roles verificados en el servidor
```

La identidad sale de la **sesión del servidor**, y cada endpoint controla el rol. La copia en `localStorage` se usa solo para dibujar la interfaz.

## Ficha por ficha

| Ficha | Antes | Defensa implementada | Dónde |
|---|---|---|---|
| **F-01** Fuerza bruta | Sin límite de intentos | Después de 5 fallos en 15 min la cuenta queda bloqueada (429 + `Retry-After`). El contador se indexa por la cédula de la cuenta ya resuelta, así que cambiar el formato no lo reinicia. Los códigos de verificación fallidos cuentan igual que las contraseñas. Con 20 fallos se bloquea la IP, y hay un límite de 30 logins por minuto por IP. Si la cuenta no existe, la respuesta y el tiempo son los mismos (hash ficticio). | `login.php`, tabla `seguridad_intentos_login` |
| **F-02** Escalada de privilegios / control de acceso roto | La API no pedía sesión; cualquiera podía crear un administrador o editar a otros mandando otra cédula | Todo se deniega por defecto (401). Cada endpoint exige su rol (`segExigirRol`), y la cédula sale de la sesión (`cedulaPropia`). El autorregistro siempre crea un **Solicitante**. Un solicitante solo ve lo suyo, y el rol se relee de la base en cada petición. | `api/*.php`, `seguridad/bootstrap.php` |
| **F-03** Contraseñas en texto plano | `contrasena` guardada tal cual | **Argon2id** (o bcrypt). Las cuentas antiguas se convierten al primer ingreso o con `migrar_contrasenas.php`. La política exige de 8 a 128 caracteres, con mayúscula, minúscula y número, y rechaza las contraseñas comunes. **Nuevo:** el usuario puede cambiar su contraseña desde *Cuenta*. | `seguridad/migrar_contrasenas.php`, `api/seguridad_cuenta.php` |
| **F-04** Sesión insegura | JSON en `localStorage`, editable y sin vencimiento | Sesión PHP con cookie `HttpOnly`, `SameSite=Strict`, `Secure` y `__Host-`, y modo estricto. El ID se regenera al ingresar y cada 15 min. Vence a los 30 min de inactividad o a las 8 h. Está atada a la huella del navegador, y tiene token **CSRF** y verificación de `Origin`. **Nuevo:** versión de sesión, para cerrar todas las sesiones a la vez. | `seguridad/bootstrap.php`, `js/shared/api.js` |
| **F-05** Inyección SQL | Ya resistía (PDO preparado) | Sin *prepared statements* emuladas, y con un usuario de BD sin DROP, ALTER ni FILE. | `config.example.php`, `database old/migracion_seguridad.sql` |
| **F-06** XSS | Ya resistía (`strip_tags` y escapado) | **Content-Security-Policy** sin `'unsafe-inline'` en scripts: un script inyectado en el HTML no se ejecuta. `connect-src 'self'` impide mandar datos a otro servidor, y la cookie `HttpOnly` impide robar la sesión. | `.htaccess`, `js/paginas/` |
| **F-07** Subida de archivos | Ya resistía (se validaba el MIME real) | La foto va a la cuenta de la sesión. Se valida con `is_uploaded_file` y se **recodifica** con GD. En `uploads/perfiles` solo se sirven `<hash>.jpg/png/webp`, nunca se ejecuta PHP y se aplica `CSP sandbox`. | `api/foto_perfil.php`, `uploads/perfiles/.htaccess` |
| **F-08** Phishing | Solo teórico | **Nuevo:** verificación en dos pasos (obligatoria para admins) con códigos de un solo uso, historial de accesos, cerrar todas las sesiones, cambio de contraseña, aviso del último ingreso y dirección visible en el login. Se mantiene: `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `form-action 'self'`, HTTPS con HSTS, cookies `SameSite=Strict` y bitácora de cada ingreso. | `login.php`, `seguridad/totp.php`, `api/seguridad_cuenta.php`, `js/features/seguridad-cuenta/seguridad-cuenta.js` |
| **F-09** Ransomware | Defensa no implementada | Respaldo diario cifrado (AES-256), con hash, copia a un **segundo destino** y rotación de 14 días. Usa un usuario de BD de solo lectura y no muestra la clave en la lista de procesos. El monitor de integridad detecta archivos cifrados o modificados. | `seguridad/respaldo.ps1` |
| **F-10** DDoS | Sin límites | Límites de 600 peticiones/min por IP y 120 por usuario; 5 altas públicas por hora; cuerpo máximo de 3 MB. **Nuevo:** filtro antes de la base de datos, bloqueo escalonado de IPs, modo de ataque, limpieza de contadores, IP real detrás de Cloudflare, configuración de Apache contra Slowloris, firewall solo para Cloudflare y caché de estáticos. Si los contadores fallan, login y registro fallan cerrados. | `seguridad/bootstrap.php`, `seguridad/modo_ataque.php`, `seguridad/apache-anti-ddos.conf`, `seguridad/firewall-cloudflare.ps1`, `.htaccess` |
| **F-11** Malware en el servidor | Parcial | `integridad.php` guarda el SHA-256 de todo el código. Detecta archivos nuevos, modificados o borrados, firmas de *webshell* (también dentro de `seguridad/`) y archivos raros o demasiado grandes en `uploads/`. Por web no se descargan `config.php`, `.sql`, `.md`, `.conf`, `seguridad/` ni archivos ocultos. | `seguridad/integridad.php`, `.htaccess` |
| **Nota** Sniffing / HTTPS | HTTP en claro | Redirección a HTTPS (salvo en localhost), HSTS, la API rechaza HTTP y la cookie es `Secure`. | `.htaccess`, `segExigirHttps()` |

## Instalación

1. Importá únicamente `database.sql` en phpMyAdmin. Ya contiene las tablas de auditoría y las columnas de sesión y segundo factor.
2. Copiá `config.example.php` a `config.php` y poné la clave de `sgrsi_app`.
3. Convertí las contraseñas existentes:
   ```bash
   C:\xampp\php\php.exe seguridad\migrar_contrasenas.php
   ```
4. **Apache contra DDoS:** agregá al final de `C:\xampp\apache\conf\httpd.conf` esta línea, probá con `C:\xampp\apache\bin\httpd.exe -t` y reiniciá Apache:
   ```
   Include "C:/xampp/htdocs/proyecto 2da entrega 4.0/seguridad/apache-anti-ddos.conf"
   ```
5. Generá la huella de integridad (repetilo después de cada despliegue):
   ```bash
   C:\xampp\php\php.exe seguridad\integridad.php generar
   ```
6. Programá las tareas de Windows: el respaldo (el comando está en el encabezado de `respaldo.ps1`) y una verificación diaria de integridad:
   ```bash
   schtasks /Create /SC DAILY /ST 03:00 /TN "NEXUS Integridad" /TR "C:\xampp\php\php.exe \"C:\xampp\htdocs\proyecto 2da entrega 4.0\seguridad\integridad.php\" verificar"
   ```
7. **HTTPS en XAMPP:** generá un certificado con `mkcert` (para la LAN) o con Let's Encrypt (con dominio público), configuralo en `C:\xampp\apache\conf\extra\httpd-ssl.conf` y reiniciá Apache.
8. Poné una contraseña al usuario root de MySQL. El ejemplo histórico se conserva en `database old/migracion_seguridad.sql`.
9. **Administradores:** en el primer ingreso, el sistema muestra una clave para cargar en la app autenticadora del teléfono y pide el primer código. Desde ese momento, cada ingreso pide contraseña y código.

## Phishing

### Qué pasa si un usuario cae en un correo falso

1. El atacante tiene la contraseña, pero al entrar se le pide el código del teléfono, que no tiene. Si la cuenta es de administrador, esto pasa siempre.
2. Si además engañó al usuario para que le pase un código, ese código vale una sola vez y por pocos segundos.
3. Si igual logró entrar, el usuario ve en el inicio el aviso del último ingreso y, en *Cuenta*, el historial con la IP y el navegador.
4. El usuario cambia la contraseña o toca *Cerrar todas las otras sesiones*: la sesión del atacante deja de valer al instante.

### Si alguien pierde el teléfono

- Otro administrador entra a *Cuenta → Restablecer verificación de otro usuario* y escribe la cédula. Eso también cierra las sesiones de esa cuenta.
- Si es el único administrador, desde la consola del servidor:
  ```bash
  C:\xampp\php\php.exe seguridad\restablecer_2fa.php 57324099
  ```

### Controles organizativos

- Capacitar a los usuarios: el portal **nunca** pide la contraseña ni los códigos por correo, WhatsApp o teléfono. Hay que mirar el candado y el dominio, que la pantalla de login muestra.
- Configurar SPF, DKIM y DMARC (`p=reject`) en el dominio institucional para que nadie pueda mandar correos haciéndose pasar por él.

## DDoS

### Capas de defensa

| Capa | Qué frena | Dónde |
|---|---|---|
| Cloudflare (opcional, plan gratuito) | Ataques volumétricos que saturan el enlace | Fuera del servidor |
| Firewall solo para Cloudflare | Ataques directos a la IP del servidor | `firewall-cloudflare.ps1` |
| Apache | Slowloris, conexiones colgadas, encabezados gigantes | `apache-anti-ddos.conf` |
| Filtro temprano (sin BD) | Inundaciones que agotarían MySQL; IPs ya bloqueadas | `segFiltroTemprano()` |
| Límites y bloqueo escalonado | Bots, *scripts*, inundación de login y registro | `segLimitarPeticiones()` |

### Durante un ataque

```bash
C:\xampp\php\php.exe seguridad\modo_ataque.php estado        # ¿esta activo? ¿cuantas IPs bloqueadas?
C:\xampp\php\php.exe seguridad\modo_ataque.php activar       # limites 4 veces mas duros, registro cerrado
C:\xampp\php\php.exe seguridad\modo_ataque.php desactivar    # volver a lo normal
C:\xampp\php\php.exe seguridad\modo_ataque.php desbloquear   # levantar bloqueos de IP (falso positivo)
```

### Publicar detrás de Cloudflare

1. Apuntar el dominio a Cloudflare con el proxy activado (nube naranja).
2. En `.htaccess`, descomentar `SetEnv SGRSI_DETRAS_DE_CLOUDFLARE 1`. Sin esto, todos los visitantes parecerían tener la IP de Cloudflare y compartirían un mismo límite.
3. En PowerShell como administrador, ejecutar `seguridad\firewall-cloudflare.ps1` (o `-RedLocal '192.168.1.0/24'` para seguir entrando desde la red del liceo). Para volver atrás: `-Deshacer`.

## Cómo volver a probar

`seguridad/pruebas_ataques.sh` repite los ataques de las fichas y los de la 3ra entrega contra una instalación **local de prueba**. Usa las cuentas de ejemplo de `database.sql`, bloquea 15 min la cuenta 57324099 y activa el segundo factor de 57847417:

```bash
bash "seguridad/pruebas_ataques.sh"
```

Resultado esperado: **61 OK, 0 FAIL**. La batería incluye:

- **Segundo factor:** el administrador sin código no tiene sesión; un código incorrecto se rechaza; un código reutilizado se rechaza; tras 5 códigos incorrectos hay que volver a la contraseña; un administrador no puede desactivarlo.
- **Cuenta robada:** la víctima ve el acceso del atacante y cierra las sesiones, y el atacante queda afuera. Cambia la contraseña, y la contraseña robada deja de servir.
- **DDoS:** el encabezado de Cloudflare se ignora si no viene de Cloudflare; el modo de ataque cierra el registro; una IP que insiste queda bloqueada y se rechaza **sin tocar la base de datos**.

Pruebas manuales rápidas:

- **F-01:** 6 logins con clave incorrecta → el 6.º responde *Demasiados intentos*.
- **F-08:** entrá como administrador → se pide el código de la app. En *Cuenta* aparece el historial de accesos.
- **F-04:** `document.cookie` no muestra la sesión.

## Bitácora

- Tabla `seguridad_eventos`: `login_ok`, `login_fallido`, `login_bloqueado`, `login_inactivo`, `logout`, `acceso_denegado`, `suplantacion_bloqueada`, `usuario_creado`, `usuario_estado`, `registro_aprobado`, `registro_rechazado` y, desde la 3ra entrega, `2fa_activado`, `2fa_fallido`, `2fa_desactivado`, `2fa_restablecido`, `sesiones_cerradas`, `contrasena_cambiada`, `reautenticacion_fallida` y `limite_no_disponible`.
- Archivos: `seguridad/almacen/logs/seguridad-AAAA-MM.log`, que también registra `ip_bloqueada`, e `integridad-AAAA-MM-DD.log`. No son accesibles por web.
