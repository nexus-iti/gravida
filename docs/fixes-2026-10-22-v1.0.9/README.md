# Fixes 2026-10-22 (v1.0.9): casos de prueba fallidos

Casos de prueba marcados como fallidos (`ttttest.docx`). Un PR por grupo, apilados.

`[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.

## Tickets

- [x] CT-02 Baja lógica de ticket: pide confirmación antes de dar de baja y los tickets dados de baja aparecen en la sección "Tickets borrados" (solo técnicos y administradores).
- [x] CT-30 Tomar o asignar ticket: nuevo "Asignar a" (técnicos y administradores activos) por ticket; el ticket pendiente pasa a "En revisión".
- [x] CT-31 Modificar diagnóstico: el ticket muestra y permite editar diagnóstico y solución.
  Además `DELETE api/incidencias.php` ahora exige rol técnico o administrador (antes cualquier usuario autenticado podía dar de baja).

## Equipos

- [x] CT-12 Alta de equipo: el tipo se guardaba bien pero el detalle lo mostraba como "Televisor": `obtenerTipoEquipoInventario` buscaba solo por valor interno (`monitor`) y los tipos del catálogo son "Monitor"; al no coincidir caía en el primero de la lista. Ahora compara por valor o etiqueta sin tildes ni mayúsculas y un tipo desconocido se muestra tal cual. El alta pide la marca y el detalle la muestra. También se arregló `fechaIsoLocal is not defined` que cortaba el flujo después de crear el equipo.
- [x] CT-14 Modificar equipo: mismo origen que CT-12 (el tipo sí se guardaba, el detalle lo mostraba mal). Verificado Monitor → Notebook y marca Dell.
- [x] CT-15 Trasladar equipo desde el menú de la sección: faltaba `sincronizarSelectPersonalizado` tras cargar las secciones destino, por lo que el selector visible quedaba sin opciones (`equipos.html` sí lo hacía). Además `ui.js` ya no pisa con el texto original el contenido que la página cambia dinámicamente (el resumen del traslado volvía a "Selecciona un equipo"). Las fechas AAAA-MM-DD (alta, etc.) se mostraban un día antes en zonas UTC-3: ahora se formatean sin pasar por UTC.

## Tareas

- [ ] CT-17 Alta de tarea: la fecha "Empieza" y el plazo no coinciden con lo ingresado.
- [ ] CT-18 Modificar tarea: mismo problema al editar.

## Solicitudes

- [ ] CT-07 Modificar solicitud de servicio (técnicos y administradores).
- [ ] CT-11 Modificar solicitud de préstamo (técnicos y administradores).
- [ ] CT-44 Rechazar solicitud de cuenta.
