# Fixes 2026-10-22 (v1.0.4)

Lote de bugs reportados en [nexus-iti/gravida/issues](https://github.com/nexus-iti/gravida/issues).
Un PR por issue, apilados en orden de dependencia.

`[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.

## Planilla

- [x] [#7](https://github.com/nexus-iti/gravida/issues/7) La planilla T.A. no mostraba a los usuarios habilitados.
  `planilla-ta` no cargaba `operaciones.js`, donde vivía `obtenerPlanillaTA`, y el render fallaba con `ReferenceError`.
  La función pasa a `features/planilla/tareas-planilla.js`.

## Autenticación

- [x] [#6](https://github.com/nexus-iti/gravida/issues/6) La Ñ no se puede usar en contraseñas.
  Causa: el mismo texto puede llegar con bytes distintos (Ñ precompuesta U+00D1/U+00F1 vs N/n + U+0303 combinante) y Argon2/bcrypt hashean bytes. Label y placeholder de los campos de contraseña nueva (registro, cuenta, clave temporal) avisan "sin Ñ". Se rechaza en frontend (`validarContrasenaSegura`, página de clave temporal) y backend (`PasswordCharset`: política de cuenta, registro, `UsuarioService`). Las claves ya guardadas con Ñ siguen validando en el login.
  Pendiente aparte: las demás vocales con tilde/diéresis tienen el mismo riesgo de normalización NFC/NFD.

## Interfaz

- [ ] [#4](https://github.com/nexus-iti/gravida/issues/4) Cambio de idioma incompleto.
- [ ] [#5](https://github.com/nexus-iti/gravida/issues/5) Modo claro/oscuro.

## Inventario

- [ ] [#8](https://github.com/nexus-iti/gravida/issues/8) Selección de items al crear préstamo/item.
