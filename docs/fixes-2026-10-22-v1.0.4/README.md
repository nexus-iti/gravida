# Fixes 2026-10-22 (v1.0.4)

Lote de bugs reportados en [nexus-iti/gravida/issues](https://github.com/nexus-iti/gravida/issues).
Un PR por issue, apilados en orden de dependencia.

`[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.

## Planilla

- [x] [#7](https://github.com/nexus-iti/gravida/issues/7) La planilla T.A. no mostraba a los usuarios habilitados.
  `planilla-ta` no cargaba `operaciones.js`, donde vivía `obtenerPlanillaTA`, y el render fallaba con `ReferenceError`.
  La función pasa a `features/planilla/tareas-planilla.js`.

## Autenticación

- [ ] [#6](https://github.com/nexus-iti/gravida/issues/6) La Ñ no se puede usar en contraseñas.

## Interfaz

- [ ] [#4](https://github.com/nexus-iti/gravida/issues/4) Cambio de idioma incompleto.
- [ ] [#5](https://github.com/nexus-iti/gravida/issues/5) Modo claro/oscuro.

## Inventario

- [ ] [#8](https://github.com/nexus-iti/gravida/issues/8) Selección de items al crear préstamo/item.
