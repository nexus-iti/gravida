# Fixes 2026-10-23 (v1.0.16): feedback de interfaz

Observaciones de uso del portal. Cada ítem se probó en una instancia aislada (PHP 8 + MariaDB 10.4) con el navegador
real antes de marcarse.

`[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.

## Cambio de rol

- [x] Campo "Motivo" de `solicitar-rol.html`: la página era un formulario sin estilos (textarea del navegador). Ahora usa
  el mismo encabezado, tarjeta, campos y botones que el resto del portal, con barra superior y migas de pan, contador
  de caracteres (máximo 500), mensaje de éxito o error con el estilo de formularios y el botón deshabilitado mientras
  se envía.

## Préstamos

- [x] Al entrar ya no se listan todos los equipos: hasta elegir una categoría solo se ve "Elegí una categoría para ver
  los equipos disponibles". El selector de categoría ofrece solo las que tienen equipos disponibles.
- [x] Los equipos iguales (mismo tipo, nombre base y marca: "PC 2", "PC 3"... son "PC") se acumulan en una sola
  tarjeta con un selector de cantidad (− / número / +, tope en las unidades libres). Al enviar, la cantidad se reparte
  entre los registros del modelo; el contrato de `api/prestamos.php` no cambia. Verificado: 3 PC → 3 préstamos (ids
  4, 5 y 6).
- [x] Se quitó la ubicación de cada equipo, el desplegable "Características" y el enlace "Ver detalle" del formulario
  de pedido.
- [x] Enviar sin elegir ningún equipo no mostraba nada (el `return` era silencioso); ahora muestra "Elegí al menos un
  equipo e indicá la cantidad."
- [x] La selección y la categoría se conservan en `sessionStorage` (clave nueva por modelo).

## Textos en español

- [x] Se restituyeron la ñ y las tildes en el español visible: 451 textos en 61 archivos (HTML, literales de frase de
  JS, mensajes de PHP y valores en español de `traducciones.js`). Ejemplos: contrasena → contraseña, cedula → cédula,
  seccion → sección, prestamo → préstamo, "No tenes" → "No tenés". El cambio es mecánico (commit aparte).
  No se tocan identificadores, clases, ids, rutas, valores de enums ni textos de una o dos palabras sin puntuación,
  que en el código también son valores (`Usuario tecnico`, `En revision`).
- [x] Las etiquetas de rol ("Usuario tecnico") y las opciones de selects se muestran ahora a través de `t()`, así que
  salen con tilde y se traducen al inglés.
- [ ] Textos guardados en la base por versiones anteriores (historial, tickets de recuperación: "Solicitud de
  recuperacion creada por...") siguen sin tilde; no se migran.

## Reportes que no se reprodujeron

- [~] "`fechaIsoLocal is not defined` al crear un equipo": en `main` (v1.0.1) la función no existía en ningún archivo y
  `inventario.js` la llamaba; se definió en v1.0.10. Con `dev` el alta de equipo funciona (verificado por la interfaz).
  Si sigue apareciendo en un navegador, es el JS viejo cacheado: los scripts se piden con `?v=5.0.0` fijo y se sirven
  con `max-age=3600`, así que tras un deploy conviven archivos nuevos y viejos hasta una hora. El PR #23 lo resuelve
  versionando por hash.
- [~] "El botón Editar de solicitudes de servicio (admin) y de préstamos no hace nada": con `dev`, como administrador,
  Editar abre el diálogo y Guardar responde 200 en ambos casos (verificado por la interfaz y la API). El botón solo
  aparece para solicitudes pendientes o en proceso (servicios) y pendientes o aprobadas (préstamos). Mismo posible
  origen que el punto anterior (JS cacheado).
