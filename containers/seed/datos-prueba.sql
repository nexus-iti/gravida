-- Datos de prueba para el entorno de Nexus en Podman.
--
-- Todo es ficticio: cedulas 900000xx, correos @example.test, nombres inventados.
-- Los IDs de equipo/ubicacion/servicio/incidencia/prestamo arrancan en 900 para no
-- chocar con las filas de database.sql (que usa 1..n) y para que el archivo se pueda
-- correr dos veces sin duplicar: todos los INSERT son upsert por clave primaria.
--
-- Credenciales de prueba y secreto TOTP: containers/seed/README.md.
--
-- Carga manual:
--   podman exec -i nexus-test-db-1 mariadb -unexus_app -p"$DB_PASSWORD" nexus < containers/seed/datos-prueba.sql
-- Carga automatica: compose lo monta como /docker-entrypoint-initdb.d/02-seed.sql, asi que
-- un `podman compose down -v && up` crea la base con el esquema y estos datos.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Usuarios: uno por rol, mas un segundo tecnico y un segundo solicitante.
-- Contrasenas: ver README (argon2id, PASSWORD_ARGON2ID, mismo formato que database.sql).
-- El admin lleva totp_secreto cargado: el login pide el codigo de 6 digitos (paso=codigo_2fa).
-- ---------------------------------------------------------------------------
INSERT INTO usuario
  (cedula, nombre, apellido, correo_electronico, contrasena, estado, rol, descripcion,
   fecha_registro, foto_perfil, esta_activo, debe_cambiar_contrasena, totp_secreto,
   totp_ultimo_paso, sesion_version)
VALUES
  ('90000001', 'Emilia', 'Santoro', 'admin.nexus@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$bXR3bkRpUnNDZGZHVnpqYQ$TJJ2BDBNIahDT450otQtR1yBwSNgE9AkNmgCCaLrcWE',
   'Activo', 'Administrador', 'Cuenta de prueba - administracion general', '2026-09-01', NULL, 1, 0,
   'JBSWY3DPEHPK3PXP', NULL, 0),
  ('90000002', 'Bruno', 'Cairoli', 'tecnico1.nexus@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Activo', 'Tecnico_Asistente', 'Cuenta de prueba - soporte tecnico turno manana', '2026-09-02', NULL, 1, 0,
   NULL, NULL, 0),
  ('90000003', 'Lucia', 'Bentancor', 'tecnico2.nexus@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Activo', 'Tecnico_Asistente', 'Cuenta de prueba - soporte tecnico turno tarde', '2026-09-02', NULL, 1, 0,
   NULL, NULL, 0),
  ('90000004', 'Tomas', 'Iriarte', 'solicitante1.nexus@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Cuenta de prueba - docente de laboratorio', '2026-09-03', NULL, 1, 0,
   NULL, NULL, 0),
  ('90000005', 'Sofia', 'Mendive', 'solicitante2.nexus@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Cuenta de prueba - alumna con prestamo vigente', '2026-09-03', NULL, 1, 0,
   NULL, NULL, 0)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), apellido = VALUES(apellido), correo_electronico = VALUES(correo_electronico),
  contrasena = VALUES(contrasena), estado = VALUES(estado), rol = VALUES(rol),
  descripcion = VALUES(descripcion), esta_activo = VALUES(esta_activo),
  debe_cambiar_contrasena = VALUES(debe_cambiar_contrasena), totp_secreto = VALUES(totp_secreto);

-- ---------------------------------------------------------------------------
-- Ubicaciones
-- ---------------------------------------------------------------------------
INSERT INTO ubicacion (id_ubicacion, seccion_inventario, esta_activa) VALUES
  (901, 'Deposito A - Estanteria 1', 1),
  (902, 'Laboratorio 2 - Armario B', 1),
  (903, 'Soporte Tecnico - Vitrina 1', 1)
ON DUPLICATE KEY UPDATE seccion_inventario = VALUES(seccion_inventario), esta_activa = VALUES(esta_activa);

-- ---------------------------------------------------------------------------
-- Equipos
-- ---------------------------------------------------------------------------
INSERT INTO equipo
  (id_equipo, nombre_equipo, categoria_equipo, descripcion, marca_equipo,
   cantidad_del_equipo, esta_activo, estado_equipo, fecha_agregado, id_ubicacion)
VALUES
  (901, 'Notebook de prueba 01', 'Notebook', 'Equipo ficticio para prestamos de prueba', 'Marca Ficticia',
   1, 1, 'Disponible', '2026-09-05', 901),
  (902, 'Proyector de prueba 01', 'Proyector', 'Proyector ficticio de aula', 'Marca Ficticia',
   2, 1, 'Disponible', '2026-09-05', 902),
  (903, 'Router de prueba 01', 'Redes', 'Router ficticio para practicas', 'Marca Ficticia',
   3, 1, 'Disponible', '2026-09-06', 903),
  (904, 'Kit de herramientas 01', 'Herramientas', 'Kit ficticio de mantemiento', 'Marca Ficticia',
   1, 1, 'Mantenimiento', '2026-09-06', 903),
  (905, 'Switch de prueba 01', 'Redes', 'Switch ficticio de 8 puertos', 'Marca Ficticia',
   1, 1, 'Disponible', '2026-09-07', 903)
ON DUPLICATE KEY UPDATE
  nombre_equipo = VALUES(nombre_equipo), categoria_equipo = VALUES(categoria_equipo),
  descripcion = VALUES(descripcion), marca_equipo = VALUES(marca_equipo),
  cantidad_del_equipo = VALUES(cantidad_del_equipo), esta_activo = VALUES(esta_activo),
  estado_equipo = VALUES(estado_equipo), id_ubicacion = VALUES(id_ubicacion);

-- ---------------------------------------------------------------------------
-- Servicios (solicitudes de servicio)
-- ---------------------------------------------------------------------------
INSERT INTO servicio
  (id_servicio, tipo_de_servicio, estado, descripcion, titulo, lugar,
   fecha_de_solicitud, cedula, fecha_deseada, esta_activo)
VALUES
  (901, 'Mantenimiento', 'Pendiente', 'Revision ficticia de las maquinas del laboratorio 2',
   'Mantenimiento de laboratorio', 'Laboratorio 2', '2026-10-01', '90000004', '2026-10-15', 1),
  (902, 'Instalacion', 'En proceso', 'Instalacion ficticia de software de practicas',
   'Instalacion de software', 'Laboratorio 2', '2026-10-03', '90000005', '2026-10-18', 1),
  (903, 'Soporte', 'Finalizado', 'Configuracion ficticia de red del aula',
   'Configuracion de red', 'Deposito A', '2026-09-20', '90000004', '2026-09-28', 1)
ON DUPLICATE KEY UPDATE
  tipo_de_servicio = VALUES(tipo_de_servicio), estado = VALUES(estado),
  descripcion = VALUES(descripcion), titulo = VALUES(titulo), lugar = VALUES(lugar),
  fecha_de_solicitud = VALUES(fecha_de_solicitud), cedula = VALUES(cedula),
  fecha_deseada = VALUES(fecha_deseada), esta_activo = VALUES(esta_activo);

-- ---------------------------------------------------------------------------
-- Incidencias
-- ---------------------------------------------------------------------------
INSERT INTO incidencia
  (id_ticket, categoria, descripcion, titulo, fecha_de_solicitud, lugar, fecha_cierre,
   estado, diagnostico, solucion, comentario_resolucion, id_equipo,
   cedula_crea, cedula_responde, esta_activa, tipo_ticket)
VALUES
  (901, 'Hardware', 'El equipo ficticio no enciende desde el lunes', 'Notebook no enciende',
   '2026-10-05', 'Laboratorio 2', NULL, 'Pendiente', NULL, NULL, NULL, 901,
   '90000004', NULL, 1, 'Soporte'),
  (902, 'Redes', 'El router ficticio pierde conexion cada hora', 'Router con cortes',
   '2026-10-06', 'Soporte Tecnico', NULL, 'En proceso', 'Se reproduce el corte en pruebas',
   NULL, NULL, 903, '90000005', '90000002', 1, 'Soporte'),
  (903, 'Software', 'El proyector ficticio no toma la senal de la notebook', 'Proyector sin senal',
   '2026-09-25', 'Laboratorio 2', '2026-09-27', 'Resuelto', 'Cable de video danado',
   'Se reemplazo el cable por uno ficticio de repuesto', 'Quedo funcionando', 902,
   '90000004', '90000003', 1, 'Soporte')
ON DUPLICATE KEY UPDATE
  categoria = VALUES(categoria), descripcion = VALUES(descripcion), titulo = VALUES(titulo),
  fecha_de_solicitud = VALUES(fecha_de_solicitud), lugar = VALUES(lugar),
  fecha_cierre = VALUES(fecha_cierre), estado = VALUES(estado),
  diagnostico = VALUES(diagnostico), solucion = VALUES(solucion),
  comentario_resolucion = VALUES(comentario_resolucion), id_equipo = VALUES(id_equipo),
  cedula_crea = VALUES(cedula_crea), cedula_responde = VALUES(cedula_responde),
  esta_activa = VALUES(esta_activa), tipo_ticket = VALUES(tipo_ticket);

-- ---------------------------------------------------------------------------
-- Prestamos
-- ---------------------------------------------------------------------------
INSERT INTO prestamo
  (id_prestamo, categoria, estado, fecha_solicitado, fecha_devolucion, fecha_devolucion_real,
   recursos_solicitados, jornada, lugar_entrega, descripcion, comentario_resolucion,
   cedula, id_equipo, esta_activo)
VALUES
  (901, 'Notebook', 'Activo', '2026-10-10', '2026-10-24', NULL,
   'Notebook de prueba 01', 'Manana', 'Soporte Tecnico',
   'Prestamo ficticio para clase de practica', NULL, '90000005', 901, 1),
  (902, 'Proyector', 'Devuelto', '2026-09-15', '2026-09-20', '2026-09-19 17:40:00',
   'Proyector de prueba 01', 'Tarde', 'Laboratorio 2',
   'Prestamo ficticio para presentacion', 'Devuelto en buen estado', '90000004', 902, 1),
  (903, 'Redes', 'Solicitado', '2026-10-20', '2026-10-27', NULL,
   'Switch de prueba 01', 'Tarde', 'Soporte Tecnico',
   'Prestamo ficticio para armado de red', NULL, '90000004', 905, 1)
ON DUPLICATE KEY UPDATE
  categoria = VALUES(categoria), estado = VALUES(estado),
  fecha_solicitado = VALUES(fecha_solicitado), fecha_devolucion = VALUES(fecha_devolucion),
  fecha_devolucion_real = VALUES(fecha_devolucion_real),
  recursos_solicitados = VALUES(recursos_solicitados), jornada = VALUES(jornada),
  lugar_entrega = VALUES(lugar_entrega), descripcion = VALUES(descripcion),
  comentario_resolucion = VALUES(comentario_resolucion), cedula = VALUES(cedula),
  id_equipo = VALUES(id_equipo), esta_activo = VALUES(esta_activo);
