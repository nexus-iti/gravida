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

- [x] [#4](https://github.com/nexus-iti/gravida/issues/4) Cambio de idioma incompleto.
  Se auditaron todas las páginas con navegador y el código fuente. Infra en `ui.js`: índice de textos sin tildes, plantillas con variables (`window.plantillasTraduccion`), etiquetas con ":", observador que traduce lo que se inserta con innerHTML, mensajes de formulario y `confirm()` traducidos, fechas según idioma y selects personalizados. `interna` carga `app.js` (administración, clave temporal y solicitar rol no traducían). ~410 textos y 49 plantillas nuevas (UI, mensajes de backend, historial). El contenido cargado por usuarios (nombres, tickets) no se traduce.
- [x] [#5](https://github.com/nexus-iti/gravida/issues/5) Modo claro/oscuro.
  Causas: `--border-color`, `--text-muted` y `--surface-subtle` se usaban sin estar definidas (Administración, comentarios de cierre y bloques de la cuenta quedaban claros en modo oscuro); el panel de seguridad de la cuenta tenía blancos fijos; las páginas `interna` no cargaban el tema. Contraste revisado con script WCAG AA (4.5:1 texto, 3:1 texto grande) en 15 páginas y ambos temas: 0 fallas. Se ajustaron `--color-texto-desactivado`, texto de botón primario y etiquetas (`warn`, `primary`, `info`, `purple`). La preferencia ya se guardaba en localStorage (`tema`); verificada tras recargar y entre páginas.

## Inventario

- [ ] [#8](https://github.com/nexus-iti/gravida/issues/8) Selección de items al crear préstamo/item.
