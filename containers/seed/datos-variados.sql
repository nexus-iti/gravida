-- Datos de prueba VARIADOS para el entorno de Nexus en Podman (gravida.wefaber.net).
--
-- Complementa a datos-prueba.sql (que trae solo 5 usuarios y 3 filas por tabla): cubre los tres roles,
-- cuentas inactivas / pendientes / con cambio de contrasena obligatorio, todos los estados de
-- prestamos, servicios e incidencias, prestamos vencidos, inventario agotado / en mantenimiento / de baja,
-- tareas del kanban y solicitudes de registro y de cambio de rol.
--
-- Todo es ficticio: nombres inventados, correos @example.test y cedulas uruguayas con digito verificador
-- valido (7 digitos + verificador) pero inventadas.
-- IDs de equipo/ubicacion/prestamo/servicio/incidencia/tarea arrancan en 2001 para no chocar con
-- database.sql (1..n) ni con datos-prueba.sql (900..).
--
-- Idempotente: cada INSERT lleva `ON DUPLICATE KEY UPDATE <pk> = <pk>`, asi que correrlo dos veces no
-- duplica ni pisa nada, pero un error real (FK, CHECK, ENUM) SI corta. No usa INSERT IGNORE a proposito.
--
-- Credenciales (las mismas por rol que datos-prueba.sql) y lista para el pill del login:
-- containers/seed/usuarios-prueba.json. Detalle en containers/seed/README.md.
--
-- Carga manual:
--   podman exec -i nexus-test-db-1 mariadb -unexus_app -p"$DB_PASSWORD" nexus < containers/seed/datos-variados.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Usuarios
--   Hashes argon2id ya generados: NexusAdmin2026! / NexusTecnico2026! / NexusSolicitante2026!
-- ---------------------------------------------------------------------------
INSERT INTO usuario
  (cedula, nombre, apellido, correo_electronico, contrasena, estado, rol, descripcion,
   fecha_registro, foto_perfil, esta_activo, debe_cambiar_contrasena, totp_secreto,
   totp_ultimo_paso, sesion_version)
VALUES
  -- Administradores
  ('39251846', 'Valentina', 'Rocha', 'valentina.rocha@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$bXR3bkRpUnNDZGZHVnpqYQ$TJJ2BDBNIahDT450otQtR1yBwSNgE9AkNmgCCaLrcWE',
   'Activo', 'Administrador', 'Prueba - administradora con 2FA ya activado', '2026-02-02', NULL, 1, 0,
   'JBSWY3DPEHPK3PXP', NULL, 0),
  ('43762914', 'Martin', 'Echeverria', 'martin.echeverria@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$bXR3bkRpUnNDZGZHVnpqYQ$TJJ2BDBNIahDT450otQtR1yBwSNgE9AkNmgCCaLrcWE',
   'Activo', 'Administrador', 'Prueba - administrador SIN 2FA: ve el enrolamiento con QR al entrar', '2026-02-02', NULL, 1, 0,
   NULL, NULL, 0),
  -- Tecnicos asistentes
  ('51284732', 'Camila', 'Duarte', 'camila.duarte@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Activo', 'Tecnico_Asistente', 'Prueba - tecnica de hardware, turno manana', '2026-03-01', NULL, 1, 0,
   NULL, NULL, 0),
  ('46510299', 'Joaquin', 'Pereira', 'joaquin.pereira@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Activo', 'Tecnico_Asistente', 'Prueba - tecnico de redes, turno tarde', '2026-03-01', NULL, 1, 0,
   NULL, NULL, 0),
  ('53908144', 'Agustina', 'Lemos', 'agustina.lemos@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Activo', 'Tecnico_Asistente', 'Prueba - tecnica de software, turno noche', '2026-03-15', NULL, 1, 0,
   NULL, NULL, 0),
  ('37184520', 'Nicolas', 'Barreto', 'nicolas.barreto@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Inactivo', 'Tecnico_Asistente', 'Prueba - tecnico dado de baja: el login tiene que rechazarlo', '2026-03-15', NULL, 0, 0,
   NULL, NULL, 0),
  ('55471268', 'Federico', 'Sosa', 'federico.sosa@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$QmpxSHd3L1JGN0gyU2QwMw$BmVoe5E6RNc0wNzU8/etvpSZZEvKwJWSO2Y9Xjf1qP4',
   'Activo', 'Tecnico_Asistente', 'Prueba - debe cambiar la contrasena en el primer ingreso', '2026-10-20', NULL, 1, 1,
   NULL, NULL, 0),
  -- Solicitantes
  ('42839152', 'Marcela', 'Techera', 'marcela.techera@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Prueba - docente de programacion, usa mucho el laboratorio 1', '2026-03-20', NULL, 1, 0,
   NULL, NULL, 0),
  ('38642076', 'Diego', 'Olivera', 'diego.olivera@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Prueba - docente de redes, pidio pasar a tecnico (solicitud pendiente)', '2026-03-20', NULL, 1, 0,
   NULL, NULL, 0),
  ('49756311', 'Paula', 'Ferreira', 'paula.ferreira@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Prueba - coordinadora de proyectos', '2026-04-05', NULL, 1, 0,
   NULL, NULL, 0),
  ('35427681', 'Gonzalo', 'Acosta', 'gonzalo.acosta@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Prueba - tiene un prestamo vencido sin devolver', '2026-04-05', NULL, 1, 0,
   NULL, NULL, 0),
  ('56120496', 'Rocio', 'Viera', 'rocio.viera@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Activo', 'Solicitante', 'Prueba - alumna, registro aprobado hace poco', '2026-09-10', NULL, 1, 0,
   NULL, NULL, 0),
  ('41087538', 'Ignacio', 'Silva', 'ignacio.silva@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Inactivo', 'Solicitante', 'Prueba - cuenta dada de baja: el login tiene que rechazarla', '2026-04-05', NULL, 0, 0,
   NULL, NULL, 0),
  ('57332806', 'Carolina', 'Nunez', 'carolina.nunez@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Inactivo', 'Solicitante', 'Prueba - registro pendiente de aprobacion: todavia no puede entrar', '2026-11-04', NULL, 1, 0,
   NULL, NULL, 0),
  ('44693126', 'Hernan', 'Bauza', 'hernan.bauza@example.test',
   '$argon2id$v=19$m=65536,t=4,p=1$MFRwWUhoUk9kemtiVTEwVQ$Rn/Bue7jqvGmbFREZcOJNuuNbAtajzg1sDa1D1WvTP4',
   'Inactivo', 'Solicitante', 'Prueba - registro rechazado', '2026-10-28', NULL, 1, 0,
   NULL, NULL, 0)
ON DUPLICATE KEY UPDATE cedula = cedula;

-- ---------------------------------------------------------------------------
-- Ubicaciones
-- ---------------------------------------------------------------------------
INSERT INTO ubicacion (id_ubicacion, seccion_inventario, esta_activa) VALUES
  (2001, 'Laboratorio 1 - Armario A', 1),
  (2002, 'Laboratorio 2 - Armario B', 1),
  (2003, 'Deposito A - Estanteria 1', 1),
  (2004, 'Deposito B - Estanteria 3', 1),
  (2005, 'Soporte Tecnico - Vitrina 1', 1),
  (2006, 'Aula Magna - Rack', 1),
  (2007, 'Sala vieja (clausurada)', 0)
ON DUPLICATE KEY UPDATE id_ubicacion = id_ubicacion;

-- ---------------------------------------------------------------------------
-- Equipos: disponibles, en mantenimiento, de baja y uno agotado (cantidad 0)
-- ---------------------------------------------------------------------------
INSERT INTO equipo
  (id_equipo, nombre_equipo, categoria_equipo, descripcion, marca_equipo,
   cantidad_del_equipo, esta_activo, estado_equipo, fecha_agregado, id_ubicacion)
VALUES
  (2001, 'Notebook Lenovo 01', 'Notebook', 'Notebooks para clases de programacion', 'Lenovo', 6, 1, 'Disponible', '2026-03-10', 2001),
  (2002, 'Notebook HP 02', 'Notebook', 'Notebooks para talleres', 'HP', 4, 1, 'Disponible', '2026-03-10', 2001),
  (2003, 'Proyector Epson EB-X06', 'Proyector', 'Proyector portatil XGA', 'Epson', 3, 1, 'Disponible', '2026-02-20', 2002),
  (2004, 'Proyector BenQ MS550', 'Proyector', 'Lampara a reemplazar', 'BenQ', 1, 1, 'Mantenimiento', '2026-02-20', 2005),
  (2005, 'Switch TP-Link 8p', 'Redes', 'Switch no administrable de 8 puertos', 'TP-Link', 5, 1, 'Disponible', '2026-04-02', 2005),
  (2006, 'Router MikroTik hAP', 'Redes', 'Router para practicas de enrutamiento', 'MikroTik', 3, 1, 'Disponible', '2026-04-02', 2005),
  (2007, 'Monitor Samsung 24"', 'Monitor', 'Monitor Full HD', 'Samsung', 10, 1, 'Disponible', '2026-01-15', 2003),
  (2008, 'Monitor Dell 22"', 'Monitor', 'Monitor Full HD', 'Dell', 8, 1, 'Disponible', '2026-01-15', 2003),
  (2009, 'All-In-One Lenovo 02', 'All-In-One', 'Equipos de laboratorio', 'Lenovo', 12, 1, 'Disponible', '2026-05-06', 2001),
  (2010, 'PC de escritorio ITI-03', 'Pc', 'PC armada por el taller', 'Armada', 15, 1, 'Disponible', '2025-11-30', 2002),
  (2011, 'Teclado Logitech K120', 'Teclado', 'Teclado USB', 'Logitech', 20, 1, 'Disponible', '2026-01-15', 2004),
  (2012, 'Mouse Logitech M90', 'Mause', 'Mouse USB', 'Logitech', 18, 1, 'Disponible', '2026-01-15', 2004),
  (2013, 'Televisor LG 43"', 'Televisor', 'Para muestras y cartelera', 'LG', 2, 1, 'Disponible', '2026-06-01', 2006),
  (2014, 'Impresora 3D Ender 3', 'Impresora 3D', 'Boquilla trabada, en reparacion', 'Creality', 2, 1, 'Mantenimiento', '2026-06-18', 2002),
  (2015, 'Kit de herramientas ITI', 'Herramientas', 'Destornilladores, pinza de crimpeo, tester', 'Stanley', 4, 1, 'Disponible', '2026-03-01', 2005),
  (2016, 'Tablet Samsung Tab A8', 'Tablet', 'Para relevamientos en campo', 'Samsung', 6, 1, 'Disponible', '2026-07-09', 2003),
  (2017, 'Notebook Acer vieja', 'Notebook', 'Dada de baja: placa madre quemada', 'Acer', 1, 0, 'Baja', '2024-05-12', 2004),
  (2018, 'Cable HDMI 5m', 'Accesorios', 'Sin stock: hay que reponer', 'Generico', 0, 1, 'Disponible', '2026-02-02', 2004)
ON DUPLICATE KEY UPDATE id_equipo = id_equipo;

INSERT INTO historial_equipo
  (id_historial_equipo, categoria, descripcion, fecha_registrado, id_equipo, autor_cedula, autor_nombre)
VALUES
  (2001, 'Alta', 'Alta del lote de notebooks Lenovo', '2026-03-10 09:00:00', 2001, '39251846', 'Valentina Rocha'),
  (2002, 'Cambio de estado', 'Pasa a Mantenimiento: lampara quemada', '2026-10-02 11:20:00', 2004, '51284732', 'Camila Duarte'),
  (2003, 'Cambio de estado', 'Pasa a Mantenimiento: boquilla trabada', '2026-10-21 15:45:00', 2014, '51284732', 'Camila Duarte'),
  (2004, 'Baja', 'Baja definitiva: placa madre quemada, no se repara', '2026-08-14 10:05:00', 2017, '39251846', 'Valentina Rocha'),
  (2005, 'Ajuste de stock', 'Se agotan los cables HDMI de 5m', '2026-10-30 16:30:00', 2018, '46510299', 'Joaquin Pereira')
ON DUPLICATE KEY UPDATE id_historial_equipo = id_historial_equipo;

INSERT INTO historial_ubicacion
  (id_historial_ubicacion, fecha_registrado, categoria, descripcion, id_ubicacion, autor_cedula, autor_nombre)
VALUES
  (2001, '2026-09-01 10:00:00', 'Alta', 'Se crea la seccion Aula Magna - Rack', 2006, '39251846', 'Valentina Rocha'),
  (2002, '2026-10-12 09:30:00', 'Cambio de estado', 'Se desactiva la sala vieja: clausurada', 2007, '39251846', 'Valentina Rocha')
ON DUPLICATE KEY UPDATE id_historial_ubicacion = id_historial_ubicacion;

-- ---------------------------------------------------------------------------
-- Prestamos (hoy = 2026-11-05)
--   Solicitado x4 · Activo x4 (uno vencido) · Devuelto x5 (uno con retraso) · Cancelado x3 (uno dado de baja)
--   recursos_solicitados empieza con la cantidad ("2 Notebook ..."): el back suma ese numero contra el stock.
-- ---------------------------------------------------------------------------
INSERT INTO prestamo
  (id_prestamo, categoria, estado, fecha_solicitado, fecha_devolucion, fecha_devolucion_real,
   recursos_solicitados, jornada, lugar_entrega, descripcion, comentario_resolucion,
   cedula, id_equipo, esta_activo)
VALUES
  -- Solicitados
  (2001, 'Notebook', 'Solicitado', '2026-11-04', '2026-11-11', NULL,
   '2 Notebook Lenovo 01', 'Manana', 'Laboratorio 1', 'Clase de programación con dos alumnos por equipo', NULL, '42839152', 2001, 1),
  (2002, 'Proyector', 'Solicitado', '2026-11-05', '2026-11-06', NULL,
   '1 Proyector Epson EB-X06', 'Tarde', 'Aula Magna', 'Charla de egresados', NULL, '38642076', 2003, 1),
  (2003, 'Monitor', 'Solicitado', '2026-11-03', '2026-11-20', NULL,
   '4 Monitor Samsung 24"', 'Noche', 'Laboratorio 2', 'Armado de puestos para evaluación', NULL, '49756311', 2007, 1),
  (2004, 'Redes', 'Solicitado', '2026-11-02', '2026-11-09', NULL,
   '1 Switch TP-Link 8p', 'Tarde', 'Soporte Técnico', 'Práctica de VLANs', NULL, '56120496', 2005, 1),
  -- Activos
  (2005, 'Notebook', 'Activo', '2026-10-26', '2026-11-09', NULL,
   '3 Notebook HP 02', 'Manana', 'Laboratorio 1', 'Taller de robótica', NULL, '42839152', 2002, 1),
  (2006, 'All-In-One', 'Activo', '2026-10-20', '2026-11-03', NULL,
   '5 All-In-One Lenovo 02', 'Tarde', 'Laboratorio 2', 'Evaluación práctica (VENCIDO: debía volver el 3/11)', NULL, '35427681', 2009, 1),
  (2007, 'Tablet', 'Activo', '2026-11-01', '2026-11-15', NULL,
   '2 Tablet Samsung Tab A8', 'Manana', 'Aula Magna', 'Relevamiento en campo', NULL, '38642076', 2016, 1),
  (2008, 'Televisor', 'Activo', '2026-11-03', '2026-11-07', NULL,
   '1 Televisor LG 43"', 'Tarde', 'Biblioteca', 'Muestra de proyectos', NULL, '49756311', 2013, 1),
  -- Devueltos
  (2009, 'Proyector', 'Devuelto', '2026-09-15', '2026-09-20', '2026-09-19 17:40:00',
   '1 Proyector Epson EB-X06', 'Tarde', 'Laboratorio 2', 'Presentación de proyecto final', 'Devuelto en buen estado', '35427681', 2003, 1),
  (2010, 'Teclado', 'Devuelto', '2026-10-01', '2026-10-08', '2026-10-08 12:10:00',
   '10 Teclado Logitech K120', 'Manana', 'Laboratorio 1', 'Recambio de periféricos', 'Devuelto completo', '56120496', 2011, 1),
  (2011, 'Notebook', 'Devuelto', '2026-10-05', '2026-10-12', '2026-10-13 09:05:00',
   '2 Notebook Lenovo 01', 'Manana', 'Soporte Técnico', 'Capacitación docente', 'Devuelto con un día de retraso', '42839152', 2001, 1),
  (2012, 'Monitor', 'Devuelto', '2026-09-22', '2026-09-29', '2026-09-28 16:00:00',
   '2 Monitor Dell 22"', 'Tarde', 'Laboratorio 2', 'Pruebas de calibración', 'Sin observaciones', '38642076', 2008, 1),
  (2013, 'Herramientas', 'Devuelto', '2026-10-14', '2026-10-16', '2026-10-16 18:30:00',
   '1 Kit de herramientas ITI', 'Noche', 'Soporte Técnico', 'Mantenimiento en aula', 'Falta un destornillador', '49756311', 2015, 1),
  -- Cancelados
  (2014, 'Impresora 3D', 'Cancelado', '2026-10-22', '2026-10-29', NULL,
   '1 Impresora 3D Ender 3', 'Tarde', 'Laboratorio 2', 'Impresión de maquetas', 'Cancelado: el equipo entró en mantenimiento', '56120496', 2014, 1),
  (2015, 'Redes', 'Cancelado', '2026-10-18', '2026-10-25', NULL,
   '2 Router MikroTik hAP', 'Manana', 'Soporte Técnico', 'Práctica de enrutamiento', 'Cancelado a pedido del solicitante', '35427681', 2006, 1),
  (2016, 'Proyector', 'Cancelado', '2026-09-30', '2026-10-02', NULL,
   '1 Proyector BenQ MS550', 'Tarde', 'Aula Magna', 'Acto de cierre', 'Baja administrativa', '42839152', 2004, 0)
ON DUPLICATE KEY UPDATE id_prestamo = id_prestamo;

INSERT INTO solicita_prestamo (cedula, id_prestamo)
  SELECT cedula, id_prestamo FROM prestamo WHERE id_prestamo BETWEEN 2001 AND 2016
ON DUPLICATE KEY UPDATE cedula = solicita_prestamo.cedula;

INSERT INTO historial_prestamo (id_historial_prestamo, estado, fecha_registrado, observacion, id_prestamo) VALUES
  (2001, 'Solicitado', '2026-11-04 08:15:00', 'Solicitud creada por 42839152.', 2001),
  (2002, 'Solicitado', '2026-11-05 07:50:00', 'Solicitud creada por 38642076.', 2002),
  (2003, 'Solicitado', '2026-11-03 10:20:00', 'Solicitud creada por 49756311.', 2003),
  (2004, 'Solicitado', '2026-11-02 14:05:00', 'Solicitud creada por 56120496.', 2004),
  (2005, 'Solicitado', '2026-10-26 09:00:00', 'Solicitud creada por 42839152.', 2005),
  (2006, 'Activo',     '2026-10-26 11:30:00', 'Aprobado y entregado por 51284732.', 2005),
  (2007, 'Solicitado', '2026-10-20 08:40:00', 'Solicitud creada por 35427681.', 2006),
  (2008, 'Activo',     '2026-10-20 13:10:00', 'Aprobado y entregado por 46510299.', 2006),
  (2009, 'Solicitado', '2026-11-01 08:00:00', 'Solicitud creada por 38642076.', 2007),
  (2010, 'Activo',     '2026-11-01 09:45:00', 'Aprobado y entregado por 51284732.', 2007),
  (2011, 'Solicitado', '2026-11-03 07:55:00', 'Solicitud creada por 49756311.', 2008),
  (2012, 'Activo',     '2026-11-03 12:30:00', 'Aprobado y entregado por 53908144.', 2008),
  (2013, 'Solicitado', '2026-09-15 08:10:00', 'Solicitud creada por 35427681.', 2009),
  (2014, 'Activo',     '2026-09-15 12:00:00', 'Aprobado y entregado por 51284732.', 2009),
  (2015, 'Devuelto',   '2026-09-19 17:40:00', 'Devuelto en buen estado.', 2009),
  (2016, 'Solicitado', '2026-10-01 07:45:00', 'Solicitud creada por 56120496.', 2010),
  (2017, 'Activo',     '2026-10-01 10:00:00', 'Aprobado y entregado por 46510299.', 2010),
  (2018, 'Devuelto',   '2026-10-08 12:10:00', 'Devuelto completo.', 2010),
  (2019, 'Solicitado', '2026-10-05 08:20:00', 'Solicitud creada por 42839152.', 2011),
  (2020, 'Activo',     '2026-10-05 11:00:00', 'Aprobado y entregado por 51284732.', 2011),
  (2021, 'Devuelto',   '2026-10-13 09:05:00', 'Devuelto con un día de retraso.', 2011),
  (2022, 'Solicitado', '2026-09-22 08:30:00', 'Solicitud creada por 38642076.', 2012),
  (2023, 'Activo',     '2026-09-22 10:15:00', 'Aprobado y entregado por 53908144.', 2012),
  (2024, 'Devuelto',   '2026-09-28 16:00:00', 'Sin observaciones.', 2012),
  (2025, 'Solicitado', '2026-10-14 09:10:00', 'Solicitud creada por 49756311.', 2013),
  (2026, 'Activo',     '2026-10-14 15:00:00', 'Aprobado y entregado por 46510299.', 2013),
  (2027, 'Devuelto',   '2026-10-16 18:30:00', 'Falta un destornillador.', 2013),
  (2028, 'Solicitado', '2026-10-22 08:00:00', 'Solicitud creada por 56120496.', 2014),
  (2029, 'Cancelado',  '2026-10-23 09:30:00', 'Cancelado: el equipo entró en mantenimiento.', 2014),
  (2030, 'Solicitado', '2026-10-18 08:25:00', 'Solicitud creada por 35427681.', 2015),
  (2031, 'Cancelado',  '2026-10-19 10:00:00', 'Cancelado a pedido del solicitante.', 2015),
  (2032, 'Solicitado', '2026-09-30 08:05:00', 'Solicitud creada por 42839152.', 2016),
  (2033, 'Cancelado',  '2026-10-01 11:20:00', 'Baja administrativa realizada por 39251846.', 2016)
ON DUPLICATE KEY UPDATE id_historial_prestamo = id_historial_prestamo;

-- ---------------------------------------------------------------------------
-- Servicios: Pendiente x3 · En proceso x2 · Finalizado x3 · Cancelado x2 (uno dado de baja)
-- ---------------------------------------------------------------------------
INSERT INTO servicio
  (id_servicio, tipo_de_servicio, estado, descripcion, titulo, lugar,
   fecha_de_solicitud, cedula, fecha_deseada, esta_activo)
VALUES
  (2001, 'Realizar mantenimiento del hardware', 'Pendiente', 'Revisión y limpieza de 12 PCs del laboratorio', 'Mantenimiento de PCs del Laboratorio 1', 'Laboratorio 1', '2026-11-03', '42839152', '2026-11-12', 1),
  (2002, 'Realizar mantenimiento del software', 'En proceso', 'Actualización de sistema y antivirus en todas las máquinas', 'Actualización de software Laboratorio 2', 'Laboratorio 2', '2026-10-28', '38642076', '2026-11-08', 1),
  (2003, 'Limpieza de los canales de resina', 'Finalizado', 'Limpieza completa de la impresora 3D antes de la feria', 'Limpieza de impresora 3D', 'Laboratorio 2', '2026-10-10', '49756311', '2026-10-17', 1),
  (2004, 'Instalacion de software en los equipos', 'Pendiente', 'Instalar VS Code, Bun y Git en las notebooks nuevas', 'Herramientas de desarrollo en notebooks', 'Laboratorio 1', '2026-11-04', '56120496', '2026-11-14', 1),
  (2005, 'Soporte', 'Cancelado', 'Se resolvió por otro medio', 'Configuración de impresora', 'Biblioteca', '2026-10-15', '35427681', NULL, 1),
  (2006, 'Realizar mantenimiento del hardware', 'Finalizado', 'Cambio de pasta térmica en cinco equipos', 'Pasta térmica en All-In-One', 'Laboratorio 2', '2026-09-18', '42839152', '2026-09-25', 1),
  (2007, 'Realizar mantenimiento del software', 'En proceso', 'Reinstalación de Linux en el rack de pruebas', 'Reinstalación del rack de pruebas', 'Aula Magna', '2026-11-01', '38642076', '2026-11-10', 1),
  (2008, 'Mantenimiento', 'Pendiente', 'Revisión del cableado de red del aula magna', 'Cableado del aula magna', 'Aula Magna', '2026-11-05', '49756311', '2026-11-19', 1),
  (2009, 'Instalacion', 'Finalizado', 'Instalación y prueba del proyector del salón 3', 'Proyector del salón 3', 'Salón 3', '2026-10-02', '56120496', '2026-10-09', 1),
  (2010, 'Soporte', 'Cancelado', 'Duplicada con otra solicitud', 'Pedido duplicado', 'Laboratorio 1', '2026-09-12', '35427681', NULL, 0)
ON DUPLICATE KEY UPDATE id_servicio = id_servicio;

INSERT INTO solicita_servicio (cedula, id_servicio)
  SELECT cedula, id_servicio FROM servicio WHERE id_servicio BETWEEN 2001 AND 2010
ON DUPLICATE KEY UPDATE cedula = solicita_servicio.cedula;

INSERT INTO historial_servicio (id_historial_servicio, estado, fecha_registrado, observacion, id_servicio) VALUES
  (2001, 'Pendiente',   '2026-11-03 09:00:00', 'Solicitud creada.', 2001),
  (2002, 'Pendiente',   '2026-10-28 09:10:00', 'Solicitud creada.', 2002),
  (2003, 'En proceso',  '2026-11-02 10:00:00', 'Tomado por 53908144.', 2002),
  (2004, 'Pendiente',   '2026-10-10 08:30:00', 'Solicitud creada.', 2003),
  (2005, 'En proceso',  '2026-10-12 09:00:00', 'Tomado por 51284732.', 2003),
  (2006, 'Finalizado',  '2026-10-16 16:45:00', 'Limpieza terminada y probada.', 2003),
  (2007, 'Pendiente',   '2026-11-04 11:15:00', 'Solicitud creada.', 2004),
  (2008, 'Pendiente',   '2026-10-15 08:50:00', 'Solicitud creada.', 2005),
  (2009, 'Cancelado',   '2026-10-16 10:00:00', 'Se resolvió por otro medio.', 2005),
  (2010, 'Pendiente',   '2026-09-18 08:00:00', 'Solicitud creada.', 2006),
  (2011, 'Finalizado',  '2026-09-24 17:00:00', 'Cinco equipos intervenidos.', 2006),
  (2012, 'Pendiente',   '2026-11-01 08:40:00', 'Solicitud creada.', 2007),
  (2013, 'En proceso',  '2026-11-03 14:00:00', 'Tomado por 53908144.', 2007),
  (2014, 'Pendiente',   '2026-11-05 09:25:00', 'Solicitud creada.', 2008),
  (2015, 'Pendiente',   '2026-10-02 09:00:00', 'Solicitud creada.', 2009),
  (2016, 'Finalizado',  '2026-10-08 15:30:00', 'Proyector instalado y probado.', 2009),
  (2017, 'Pendiente',   '2026-09-12 08:20:00', 'Solicitud creada.', 2010),
  (2018, 'Cancelado',   '2026-09-12 12:00:00', 'Duplicada con otra solicitud.', 2010)
ON DUPLICATE KEY UPDATE id_historial_servicio = id_historial_servicio;

-- ---------------------------------------------------------------------------
-- Incidencias: Pendiente x4 · En proceso x3 · Resuelto x3 · Cerrado x2 (una de recuperacion de cuenta)
-- ---------------------------------------------------------------------------
INSERT INTO incidencia
  (id_ticket, categoria, descripcion, titulo, fecha_de_solicitud, lugar, fecha_cierre,
   estado, diagnostico, solucion, comentario_resolucion, id_equipo,
   cedula_crea, cedula_responde, esta_activa, tipo_ticket)
VALUES
  (2001, 'Hardware', 'La notebook no carga la batería aunque está enchufada', 'Notebook no carga', '2026-11-04', 'Laboratorio 1', NULL,
   'Pendiente', NULL, NULL, NULL, 2001, '42839152', NULL, 1, 'Soporte'),
  (2002, 'Redes', 'No hay conexión en la mitad del laboratorio 2', 'Sin red en el laboratorio 2', '2026-11-05', 'Laboratorio 2', NULL,
   'Pendiente', NULL, NULL, NULL, 2005, '38642076', NULL, 1, 'Soporte'),
  (2003, 'Software', 'El sistema de notas se cierra solo al abrir un grupo', 'Sistema de notas se cierra', '2026-11-03', 'Aula Magna', NULL,
   'Pendiente', NULL, NULL, NULL, NULL, '49756311', NULL, 1, 'Soporte'),
  (2004, 'Hardware', 'El monitor parpadea cada pocos minutos', 'Monitor parpadea', '2026-11-02', 'Laboratorio 1', NULL,
   'Pendiente', NULL, NULL, NULL, 2008, '56120496', NULL, 1, 'Soporte'),
  (2005, 'Redes', 'El router pierde la conexión cada hora', 'Router con cortes', '2026-10-30', 'Soporte Técnico', NULL,
   'En proceso', 'Se reproduce el corte en pruebas de laboratorio', NULL, NULL, 2006, '35427681', '46510299', 1, 'Soporte'),
  (2006, 'Hardware', 'La lámpara del proyector no enciende', 'Proyector sin imagen', '2026-10-27', 'Aula Magna', NULL,
   'En proceso', 'Lámpara quemada, se pidió repuesto', NULL, NULL, 2004, '38642076', '51284732', 1, 'Soporte'),
  (2007, 'Software', 'No se puede instalar el driver de la impresora 3D', 'Driver impresora 3D', '2026-11-01', 'Laboratorio 2', NULL,
   'En proceso', 'Falta firmar el driver en Linux', NULL, NULL, 2014, '42839152', '53908144', 1, 'Soporte'),
  (2008, 'Software', 'El navegador no abre el portal institucional', 'Portal institucional no abre', '2026-10-14', 'Biblioteca', '2026-10-15',
   'Resuelto', 'Caché del navegador dañada', 'Se limpió la caché y se actualizó el navegador', 'Quedó funcionando', NULL, '49756311', '53908144', 1, 'Soporte'),
  (2009, 'Hardware', 'La notebook se apaga sola a los diez minutos', 'Notebook se apaga sola', '2026-10-08', 'Laboratorio 1', '2026-10-11',
   'Resuelto', 'Ventilador tapado', 'Limpieza interna y cambio de pasta térmica', 'Probada durante una hora sin problemas', 2002, '42839152', '51284732', 1, 'Soporte'),
  (2010, 'Redes', 'Un puerto del switch no entrega link', 'Puerto del switch muerto', '2026-09-29', 'Soporte Técnico', '2026-10-02',
   'Resuelto', 'Puerto dañado', 'Se movió el equipo a otro puerto', 'Puerto marcado como dañado', 2005, '35427681', '46510299', 1, 'Soporte'),
  (2011, 'Hardware', 'Teclado con teclas que no responden', 'Teclado defectuoso', '2026-09-20', 'Laboratorio 1', '2026-09-22',
   'Cerrado', 'Contactos sucios', 'Limpieza y prueba', 'Cerrado por el solicitante', 2011, '56120496', '51284732', 1, 'Soporte'),
  (2012, 'Cuenta', 'Solicitud de recuperación de contraseña de 35427681', 'Recuperación de contraseña', '2026-10-25', NULL, '2026-10-25',
   'Cerrado', NULL, 'Se generó una clave temporal y se entregó en persona', 'Cuenta recuperada', NULL, '35427681', '39251846', 1, 'Recuperacion')
ON DUPLICATE KEY UPDATE id_ticket = id_ticket;

-- ---------------------------------------------------------------------------
-- Planilla de tecnicos asistentes (horarios) y tareas del kanban
-- ---------------------------------------------------------------------------
INSERT INTO plantilla_tecnico_asistente
  (id_plantilla, cedula, comentario_ta, horario_entrada_ta, horario_salida_ta)
VALUES
  (2001, '51284732', 'Hardware y préstamos de la mañana', '08:00:00', '13:00:00'),
  (2002, '46510299', 'Redes y soporte de la tarde', '13:00:00', '18:00:00'),
  (2003, '53908144', 'Software y turno noche', '18:00:00', '22:00:00'),
  (2004, '55471268', 'En capacitación, solo acompaña', '10:00:00', '14:00:00')
ON DUPLICATE KEY UPDATE id_plantilla = id_plantilla;

INSERT INTO tareas
  (id_tarea, titulo_tarea, descripcion_tarea, plazo_tarea, categoria_tarea,
   dificultad_tarea, estado_tarea, color_tarea, fecha_agregada)
VALUES
  (2001, 'Reponer cables HDMI', 'Pedir 20 cables HDMI de 5m para el depósito B', '2026-11-12', 'Administrativa', 'Baja', 'Pendiente', '#64748b', '2026-11-01'),
  (2002, 'Reemplazar lámpara del proyector BenQ', 'La lámpara llegó el lunes, falta instalarla y probarla', '2026-11-08', 'Hardware', 'Media', 'En curso', '#16a34a', '2026-10-28'),
  (2003, 'Reinstalar Linux en el rack de pruebas', 'Reinstalar Ubuntu y restaurar la configuración de red', '2026-11-10', 'Software', 'Alta', 'En curso', '#2563eb', '2026-11-01'),
  (2004, 'Reconfigurar VLANs del laboratorio 2', 'Separar la red de alumnos de la de docentes', '2026-11-15', 'Redes', 'Critica', 'Pendiente', '#dc2626', '2026-11-03'),
  (2005, 'Inventario de fin de mes', 'Contar y cargar el stock de periféricos', '2026-11-30', 'Administrativa', 'Media', 'Pendiente', '#64748b', '2026-11-02'),
  (2006, 'Revisar cableado del aula magna', 'Probar todos los puntos de red con el tester', '2026-11-19', 'Redes', 'Media', 'En revision', '#2563eb', '2026-11-05'),
  (2007, 'Limpiar impresora 3D', 'Limpieza completa de canales y calibración de cama', '2026-10-17', 'Hardware', 'Baja', 'Completada', '#16a34a', '2026-10-10'),
  (2008, 'Actualizar antivirus del laboratorio 1', 'Actualizar firmas y programar escaneo semanal', '2026-10-05', 'Software', 'Baja', 'Completada', '#16a34a', '2026-10-01')
ON DUPLICATE KEY UPDATE id_tarea = id_tarea;

INSERT INTO realiza_tarea (cedula, id_tarea) VALUES
  ('46510299', 2001), ('51284732', 2002), ('53908144', 2003), ('46510299', 2004),
  ('51284732', 2005), ('53908144', 2005), ('46510299', 2006), ('51284732', 2007), ('53908144', 2008)
ON DUPLICATE KEY UPDATE cedula = realiza_tarea.cedula;

-- ---------------------------------------------------------------------------
-- Solicitudes de registro y de cambio de rol (bandeja del administrador)
-- ---------------------------------------------------------------------------
INSERT INTO solicitud_registro
  (id_solicitud_registro, estado_solicitud, id_usuario_manda, id_usuario_responde)
VALUES
  (2001, 'Pendiente', '57332806', NULL),
  (2002, 'Rechazado', '44693126', '39251846'),
  (2003, 'Aprobado',  '56120496', '39251846')
ON DUPLICATE KEY UPDATE id_solicitud_registro = id_solicitud_registro;

INSERT INTO solicitud_cambio_rol
  (id_solicitud_cambio_rol, cedula_solicitante, rol_actual, rol_solicitado, motivo, estado,
   cedula_revisor, fecha_solicitud, fecha_revision)
VALUES
  (2001, '38642076', 'Solicitante', 'Tecnico_Asistente', 'Doy redes y puedo cubrir el turno de la tarde', 'Pendiente',
   NULL, '2026-11-03 10:00:00', NULL),
  (2002, '55471268', 'Solicitante', 'Tecnico_Asistente', 'Quiero sumarme al equipo de soporte', 'Aprobado',
   '39251846', '2026-10-15 09:00:00', '2026-10-19 16:20:00'),
  (2003, '56120496', 'Solicitante', 'Tecnico_Asistente', 'Quiero ayudar con el mantenimiento', 'Rechazado',
   '43762914', '2026-10-22 11:30:00', '2026-10-24 09:10:00')
ON DUPLICATE KEY UPDATE id_solicitud_cambio_rol = id_solicitud_cambio_rol;

-- ---------------------------------------------------------------------------
-- Reportes de error enviados desde la pagina publica
-- ---------------------------------------------------------------------------
INSERT INTO reporte_error
  (id_reporte_error, tipo, contacto, asunto, detalle, estado, cedula_responsable,
   respuesta, fecha_creacion, fecha_cierre)
VALUES
  (2001, 'Acceso o login', 'alumno1@example.test', 'No me deja entrar', 'Pongo mi cédula y la contraseña y dice datos incorrectos', 'Pendiente', NULL, NULL, '2026-11-04 18:20:00', NULL),
  (2002, 'Registro de usuario', 'docente2@example.test', 'No llega el aviso de aprobación', 'Me registré hace tres días y nadie me respondió', 'En proceso', '43762914', NULL, '2026-11-02 09:40:00', NULL),
  (2003, 'Préstamos o solicitudes', 'docente3@example.test', 'El selector de equipos se queda cargando', 'Al elegir Notebook no aparecen los equipos', 'Resuelto', '39251846', 'Era un problema de caché; ya funciona.', '2026-10-20 15:00:00', '2026-10-21 10:30:00'),
  (2004, 'Otro', 'visita@example.test', 'Sugerencia de modo oscuro', 'Estaría bueno que recuerde el modo oscuro', 'Rechazado', '39251846', 'Ya existe: se cambia desde el menú de la cuenta.', '2026-10-10 12:00:00', '2026-10-11 09:00:00')
ON DUPLICATE KEY UPDATE id_reporte_error = id_reporte_error;
