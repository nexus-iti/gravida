# Fixes 2026-10-22 (v1.0.9): casos de prueba fallidos

Casos de prueba marcados como fallidos (`ttttest.docx`). Un PR por grupo, apilados.

`[ ]` pendiente · `[~]` parcial · `[x]` hecho y verificado.

## Tickets

- [x] CT-02 Baja lógica de ticket: pide confirmación antes de dar de baja y los tickets dados de baja aparecen en la sección "Tickets borrados" (solo técnicos y administradores).
- [x] CT-30 Tomar o asignar ticket: nuevo "Asignar a" (técnicos y administradores activos) por ticket; el ticket pendiente pasa a "En revisión".
- [x] CT-31 Modificar diagnóstico: el ticket muestra y permite editar diagnóstico y solución.
  Además `DELETE api/incidencias.php` ahora exige rol técnico o administrador (antes cualquier usuario autenticado podía dar de baja).

## Equipos

- [ ] CT-12 Alta de equipo: el tipo guardado no coincide con el elegido y no se puede indicar la marca.
- [ ] CT-14 Modificar equipo: el tipo no se guarda.
- [ ] CT-15 Trasladar equipo desde el menú de la sección.

## Tareas

- [ ] CT-17 Alta de tarea: la fecha "Empieza" y el plazo no coinciden con lo ingresado.
- [ ] CT-18 Modificar tarea: mismo problema al editar.

## Solicitudes

- [ ] CT-07 Modificar solicitud de servicio (técnicos y administradores).
- [ ] CT-11 Modificar solicitud de préstamo (técnicos y administradores).
- [ ] CT-44 Rechazar solicitud de cuenta.
