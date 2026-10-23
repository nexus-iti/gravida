# Fixes 2026-10-23 (v1.0.15): política de contraseñas en el servidor

Origen: el tester del plan de testing reportó que la contraseña nueva elegida tras una recuperación no pasa
las validaciones del primer alta (se pudo crear "contraseña"). Reproducido contra `main` (v1.0.1) y `dev`
(v1.0.13) con una instancia aislada, y reproducido otra vez en esta rama antes de arreglarlo.

`[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.

## Contraseñas

- [x] Cambio obligatorio tras recuperar la cuenta (`PATCH api/usuarios.php`, `cambiar_contrasena`): solo exigía
  7 caracteres y no tener Ñ, así que `1234567`, `abcdefg` o `contrasena` pasaban. Ahora aplica la política completa.
- [x] Registro público (`POST api/solicitudes_registro.php`): el servidor solo validaba Ñ; `12345` se aceptaba.
  La política vivía solo en el navegador (`validarContrasenaSegura`).
- [x] Alta por administrador (`POST api/usuarios.php`): mismo hueco que el registro.
- [x] Una sola fuente de verdad: `Nexus\Shared\Security\PasswordRules` (8 a 128 caracteres, mayúscula, minúscula,
  número, sin Ñ, sin claves comunes). `segValidarContrasenaNueva` (cambio desde Cuenta) y los servicios de usuario y
  de registro la usan; los mensajes del cambio desde Cuenta no cambian.
- [x] Navegador alineado con el servidor: `validarContrasenaSegura` pasa de 7 a 8 caracteres y las páginas de
  registro y de cambio obligatorio usan `minlength="8"`. La página de cambio obligatorio ahora corre la misma
  validación en el cliente (antes solo miraba la Ñ). Se quitaron las traducciones ES/EN de los mensajes de 7 caracteres.

## Registro con rol Administrador

- [x] El registro público no concede Administrador (queda como Solicitante; Técnico queda inactivo hasta que un
  administrador lo revise). El cambio viene en el commit de la auditoría (v1.0.14); acá se agrega la prueba que lo fija
  para `Administrador`, `administrador`, ` ADMIN ` y `Usuario administrativo`.

## Pruebas

- [x] `bun run test` (`php tests/run.php`): 47 casos sin base de datos, con repositorios en memoria. Sobre el código
  anterior fallan 24; con este cambio pasan todos. Se agrega al CI.

## Pendiente (no incluido)

- [ ] `PATCH api/usuarios.php` con `cambiar_contrasena` no pide la contraseña actual: cualquier sesión puede fijar
  una clave nueva para sí misma sin conocerla. Debería limitarse a cuentas con `debe_cambiar_contrasena = 1` (o al
  administrador) y el cambio desde Cuenta seguir pasando por `api/seguridad_cuenta.php`.
