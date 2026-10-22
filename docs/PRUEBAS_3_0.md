# Informe de pruebas — NEXUS 3.0

Fecha: 18/10/2026

## Resultado

**APROBADO** para publicación de la carpeta `proyecto 2da entrega 3.0`.

## Verificaciones estáticas

- Sintaxis PHP comprobada en todos los archivos: correcta.
- Sintaxis JavaScript comprobada en todos los módulos: correcta.
- Los endpoints declaran métodos permitidos.
- No se encontraron cambios de esquema ejecutados desde endpoints.
- `config.php` continúa excluido mediante `.gitignore`.

## Verificaciones HTTP y de seguridad

- Recurso privado sin sesión: `401` con contrato uniforme.
- Login mediante GET: `405` y `Allow: POST`.
- Login mediante POST: `200` y creación de sesión.
- Consulta autenticada de perfil: `200`.
- Operación sin CSRF: `403`.
- PUT autenticado con CSRF: `200`.
- Rol técnico intentando acceder a configuración: `403`.
- Logout: `200` e invalidación efectiva de sesión.
- JSON de éxito y error: contiene `status`, `message` y `data`.
- Migración de contraseña legacy: primer y segundo login correctos; contraseña almacenada como hash de 60 caracteres.

## Recorrido CRUD controlado

Se ejecutaron altas, actualizaciones mediante PUT y bajas/eliminaciones sobre datos de prueba:

| Recurso | Crear | PUT | Baja/eliminación |
|---|---:|---:|---:|
| Ubicación | 201 | 200 | 200 |
| Equipo | 201 | 200 | 200 |
| Incidencia | 201 | 200 | 200 |
| Tarea | 201 | 200 | 200 |
| Servicio | 201 | 200 | 200 |
| Préstamo | 201 | 200 | 200 |

Todas las respuestas indicaron `status: success`. Los registros sujetos a baja lógica quedaron inactivos y la tarea temporal fue eliminada.

## Páginas

Se solicitaron las 22 páginas HTML de la entrega. Todas respondieron HTTP 200 y contenido no vacío.

## Observaciones

- PUT y PATCH conviven para mantener compatibilidad con la versión 2.0.
- La interfaz visual se conserva.
- Los cambios visibles se limitan a mensajes de autenticación, autorización y vencimiento de sesión.
- La contraseña temporal de recuperación se conserva en texto únicamente dentro de la solicitud hasta que el usuario la consulta una vez; la contraseña almacenada en `USUARIO` queda hasheada.
