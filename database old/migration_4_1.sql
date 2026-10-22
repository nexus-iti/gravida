-- Ajustes funcionales posteriores a la integracion 4.0.
ALTER TABLE INCIDENCIA
  ADD COLUMN IF NOT EXISTS comentario_resolucion TEXT NULL AFTER solucion;

ALTER TABLE PRESTAMO
  ADD COLUMN IF NOT EXISTS comentario_resolucion TEXT NULL AFTER descripcion;

ALTER TABLE TAREAS
  MODIFY estado_tarea ENUM('Pendiente','En curso','En revision','Completada') NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS dificultad_tarea ENUM('Baja','Media','Alta') NOT NULL DEFAULT 'Media' AFTER categoria_tarea;
