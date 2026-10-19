# Integración de ciberseguridad — NEXUS 4.0

## Base y alcance

La versión 4.0 se construyó copiando la versión 3.0 y aplicando selectivamente los controles de `NEXUS-3ra-entrega.zip`. No se reemplazaron los módulos funcionales actuales por los del ZIP, porque esa entrega partía de una versión anterior y no contenía recuperación por ticket, cambios de rol, configuración, reportes de error ni otros componentes vigentes.

## Controles integrados

- sesiones PHP estrictas, cookies `HttpOnly` y `SameSite=Strict`, rotación del identificador y vencimiento;
- comprobación del estado, rol y versión de sesión contra la base en cada solicitud;
- protección CSRF y validación de origen para operaciones de escritura;
- límite de cuerpo, límites por IP/usuario, bloqueo escalonado y modo de ataque;
- bloqueo de fuerza bruta por cuenta e IP, con identificadores normalizados;
- contraseñas con Argon2id o bcrypt y migración al iniciar sesión;
- TOTP de seis dígitos, obligatorio para administradores y opcional para otros roles;
- rechazo de códigos TOTP reutilizados;
- historial de accesos y eventos de seguridad;
- cambio de contraseña, cierre de otras sesiones y restablecimiento de TOTP por administrador;
- recodificación de fotos mediante GD para descartar contenido ajeno a los píxeles;
- cabeceras de seguridad, protección de archivos sensibles, desactivación del listado de carpetas y redirección HTTPS fuera de localhost;
- herramientas operativas para integridad, respaldo, mitigación DDoS y Cloudflare, incluidas pero no ejecutadas automáticamente.

## Adaptaciones realizadas

- Se conservó el contrato JSON de la versión 3.0: `{status, message, data}`.
- Se conservaron los métodos GET/POST/PUT/PATCH/DELETE de los endpoints actuales.
- La recuperación de contraseña continúa creando un ticket. Al resolverlo se genera una contraseña temporal, se obliga a cambiarla y se invalidan las sesiones anteriores.
- Se conservaron el enlace y el flujo de solicitud de cambio de rol.
- La foto de perfil solo puede modificarse para la identidad de la sesión.
- La migración oficial es `migration_4_0.sql`; no se ejecutan cambios de esquema durante una petición web.

## Decisión sobre CSP

La entrega recibida eliminaba todos los scripts internos y podía usar `script-src` sin `unsafe-inline`. La base 3.0 contiene scripts internos en veinte páginas, incluidas funciones nuevas que no existen en el ZIP. Aplicar literalmente esa política bloquearía la interfaz. Por eso 4.0 mantiene CSP activa y restringe orígenes, marcos, formularios, objetos y conexiones, pero conserva temporalmente `unsafe-inline` para scripts. La eliminación completa de scripts internos queda como endurecimiento posterior y no se declara como implementada.

## Instalación

1. Copiar la carpeta al servidor web.
2. Configurar `config.php` localmente; el archivo está excluido de Git.
3. Ejecutar `migration_4_0.sql` sobre la base ya migrada a 3.0.
4. Verificar que PHP tenga habilitada la extensión GD para subir fotos.
5. Probar el ingreso de un administrador y completar el alta del segundo factor.
6. Configurar HTTPS antes de publicar fuera de localhost.
7. Revisar las rutas y credenciales de los scripts operativos antes de programarlos.

## Resultado de verificación local

- sintaxis PHP: correcta;
- sintaxis JavaScript: correcta;
- migración 4.0: correcta;
- páginas públicas: cargan correctamente; `test-api.html` queda bloqueada de forma intencional;
- login y migración de contraseña heredada: correctos;
- sesión y cierre de sesión: correctos;
- rechazo de escritura sin CSRF: correcto;
- alta obligatoria de TOTP para administrador y posterior login: correctos;
- panel e historial de seguridad: correctos;
- consultas autenticadas de equipos, historial, incidencias, planilla, préstamos, reportes, servicios, tareas, ubicaciones, usuarios, recuperación, sesión y seguridad: correctas;
- prueba CRUD de ubicación (alta, modificación y baja lógica): correcta; los datos de prueba se eliminaron después.

## Corrección 4.0.1 — token de operaciones

Se corrigió una regresión del merge por la que el navegador descartaba el token CSRF entregado durante el login. Las lecturas funcionaban, pero las altas, modificaciones, bajas y traslados eran rechazados como sesión vencida. El token ahora se conserva con la sesión local, se sincroniza durante la comprobación de sesión y se renueva automáticamente una vez ante un rechazo CSRF. También se agregó un mensaje visible global para que los formularios operativos nunca fallen en silencio.

Pruebas de regresión realizadas:

- cambio de estado de un préstamo desde la interfaz y restauración de su estado original;
- alta real de préstamo, incidencia y servicio con una cuenta solicitante;
- respuesta HTTP 201 en las tres altas y eliminación posterior de los datos de prueba;
- validación de sintaxis de todo el JavaScript;
- carga HTTP correcta de las 21 páginas públicas/aplicativas;
- actualización de versión en los scripts centrales para impedir que el navegador reutilice la copia defectuosa en caché.
