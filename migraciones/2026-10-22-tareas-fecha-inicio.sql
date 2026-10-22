-- Guarda la fecha de inicio de las tareas (antes solo se guardaba el plazo y
-- "Empieza" tomaba el valor de "Termina"). Ejecutar una vez sobre bases creadas
-- con un database.sql anterior; sin esta columna el sistema sigue funcionando,
-- pero la fecha de inicio no se conserva.
ALTER TABLE tareas
  ADD COLUMN fecha_inicio_tarea date DEFAULT NULL AFTER fecha_agregada;
UPDATE tareas SET fecha_inicio_tarea = COALESCE(fecha_inicio_tarea, plazo_tarea);
