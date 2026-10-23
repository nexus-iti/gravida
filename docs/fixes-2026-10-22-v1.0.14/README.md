# Fixes 2026-10-22 v1.0.14: auditoría de seguridad

Origen: auditoría `security-audit` sobre `chore/ci-cd-deploy` @ `f2312cb` (10 hallazgos confirmados, 3 bloqueados por hechos de despliegue).

Leyenda: `[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.
Verificación de código: arnés PHP con dobles en memoria (35 chequeos OK). No hubo motor de base de datos disponible, así que el SQL nuevo no se corrió contra MariaDB.

## High

- [x] **1. IP real detrás del proxy.** `segIp()` acepta `CF-Connecting-IP` / `X-Forwarded-For` solo si el par TCP está en `SGRSI_PROXIES_CONFIABLES` (compose lo setea a rangos privados para `back`). Verificado: dos clientes distintos tras el mismo proxy caen en cubos distintos; XFF falsificado a la izquierda no gana; sin la variable se ignoran los encabezados.
- [x] **2. Código de recuperación.** `solicitar` ya no devuelve el código ni distingue cuenta existente/inexistente; el técnico lo ve en su bandeja y lo entrega tras verificar identidad. Un técnico no resuelve su propia solicitud. La temporal vence a las 24 h y pasó a 8 dígitos. Verificado con dobles.
- [~] **3. `database.sql` con datos reales.** Se quitaron los INSERT de `usuario` (hash + TOTP + correos reales) y de todas las tablas con datos personales u operativos; se conservan catálogos, `equipo` y `ubicacion`. Nuevo `seguridad/crear_administrador.php` para el primer admin. Pendiente fuera del repo:
  - [ ] Re-enrolar el 2FA del Administrador real y rotar su `sesion_version` (el secreto `OXJK…` hay que darlo por comprometido).
  - [ ] Purgar `database.sql` del historial de git (reescribe historia: decide Faku).
  - [ ] Avisar a las tres personas cuyos correos y cédulas quedaron públicos.

## Medium

- [x] **4. Matriz sin deny por defecto.** `historial`, `tareas` (todos los métodos) y `configuracion` (GET) exigen Técnico/Administrador; un recurso fuera de la lista conocida responde 403. `catalogos` y `equipos` GET siguen abiertos al Solicitante porque sus pantallas los usan.
- [~] **5. Credencial persistida antes de la aprobación.** Cerrado el oráculo de existencia: cédula/correo duplicados devuelven la misma respuesta que un alta nueva. Sigue pendiente mover el alta a `SOLICITUD_REGISTRO` y crear el `USUARIO` recién al aprobar: requiere cambio de esquema y el repo no tiene mecanismo de migraciones.
- [x] **6. Rol elegido por el solicitante.** El auto-registro nunca produce Administrador (se baja a Solicitante); el técnico se conserva porque lo aprueba un admin. Al aprobar, un `rol=Administrador` heredado de una solicitud vieja también baja a Solicitante.
- [~] **7. Bloqueo dirigido de cuenta.** Los 5 fallos se cuentan por (cuenta, IP): el tercero se bloquea a sí mismo, no al titular. Tope por cuenta desde cualquier IP: 50 en 15 min. Depende de #1. SQL sin probar contra MariaDB.
- [x] **8. Reemplazo de 2FA con solo la contraseña.** `confirmar_2fa` exige `codigoActual` (código del factor vigente) si la cuenta ya tiene factor. La UI actual no ofrece el reemplazo con el factor activo, así que no cambia.
- [x] **9. Login CSRF.** `login.php` rechaza POST con `Origin` ajeno (incluido `null`) o `Sec-Fetch-Site` cross-site. Sin token: no existe sesión previa y el frontend no lo envía.

## Low

- [~] **10. Cambio de contraseña no revoca sesiones.** `cambiarContrasena` incrementa `sesion_version`; la sesión que hizo el cambio se actualiza, las demás quedan fuera. SQL sin probar contra MariaDB. No se tocó la política de contraseña (7 caracteres en `UsuarioService`) ni se exige la contraseña actual: la UI forzada post-recuperación no la tiene.

## Necesita validación (NEEDS-VALIDATION.md)

- [~] **Reportes de error sin cota.** POST público limitado a 10/h por IP, `recuperacion` público a 10/h por IP, listado admin con `LIMIT 200`. Falta retención/purga de `reporte_error` y confirmar `SGRSI_DETRAS_DE_CLOUDFLARE` en el despliegue.
- [ ] **Deploy ejecuta código de cualquier rama.** No se resuelve en código: el dueño revisa protección de `dev` y las reglas del environment `nexus-preview` (`gh api repos/nexus-iti/gravida/branches/dev/protection`).
- [ ] **Credenciales del seed commiteadas** (`containers/seed`, admin `90000001` con TOTP fijo). Son datos de prueba; decidir si el entorno de prueba debe rotarlas o exigir cambio en el primer ingreso.

## Notas de despliegue

- El nginx del host debe pasar `Host` y `CF-Connecting-IP` al front (el segundo viene de Cloudflare). Sin eso `segIp()` cae al par TCP, igual que antes.
- `seguridad/pruebas_ataques.sh` usaba las cuentas de `database.sql` (`57324099`, `57847417`); ya no existen y el script hay que adaptarlo al seed.
