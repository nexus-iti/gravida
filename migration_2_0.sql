-- NEXUS - migracion no destructiva desde la segunda entrega a 2.0
-- Ejecutar una sola vez sobre la base existente.

ALTER TABLE INCIDENCIA
  ADD COLUMN IF NOT EXISTS esta_activa TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo_ticket VARCHAR(40) NOT NULL DEFAULT 'Soporte';
ALTER TABLE SERVICIO ADD COLUMN IF NOT EXISTS esta_activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE PRESTAMO ADD COLUMN IF NOT EXISTS esta_activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE USUARIO
  ADD COLUMN IF NOT EXISTS esta_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS debe_cambiar_contrasena TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS CATEGORIA_TECNOLOGICA (
  id_categoria_tecnologica INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) NULL, esta_activa TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_categoria_tecnologica_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS CATEGORIA_PRESTAMO (
  id_categoria_prestamo INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) NULL, esta_activa TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_categoria_prestamo_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS SERVICIO_DISPONIBLE (
  id_servicio_disponible INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL, esta_activo TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_servicio_disponible_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS SOLICITUD_CAMBIO_ROL (
  id_solicitud_cambio_rol INT AUTO_INCREMENT PRIMARY KEY, cedula_solicitante VARCHAR(15) NOT NULL,
  rol_actual VARCHAR(40) NOT NULL, rol_solicitado VARCHAR(40) NOT NULL, motivo TEXT NULL,
  estado ENUM('Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  cedula_revisor VARCHAR(15) NULL, fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_revision DATETIME NULL,
  CONSTRAINT fk_cambio_rol_solicitante FOREIGN KEY (cedula_solicitante) REFERENCES USUARIO(cedula),
  CONSTRAINT fk_cambio_rol_revisor FOREIGN KEY (cedula_revisor) REFERENCES USUARIO(cedula),
  KEY idx_cambio_rol_estado (estado, fecha_solicitud)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS REPORTE_ERROR (
  id_reporte_error INT AUTO_INCREMENT PRIMARY KEY, tipo VARCHAR(60) NOT NULL,
  contacto VARCHAR(150) NOT NULL, asunto VARCHAR(120) NOT NULL, detalle TEXT NOT NULL,
  estado ENUM('Pendiente','En proceso','Resuelto','Rechazado') NOT NULL DEFAULT 'Pendiente',
  cedula_responsable VARCHAR(15) NULL, respuesta TEXT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, fecha_cierre DATETIME NULL,
  CONSTRAINT fk_reporte_error_responsable FOREIGN KEY (cedula_responsable) REFERENCES USUARIO(cedula),
  KEY idx_reporte_error_estado (estado, fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS CONFIGURACION_SISTEMA (
  clave VARCHAR(60) PRIMARY KEY, valor VARCHAR(255) NOT NULL, descripcion VARCHAR(255) NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(15) NULL,
  CONSTRAINT fk_configuracion_usuario FOREIGN KEY (actualizado_por) REFERENCES USUARIO(cedula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS RECUPERACION_CONTRASENA (
  id_recuperacion INT AUTO_INCREMENT PRIMARY KEY, id_ticket INT NOT NULL, cedula VARCHAR(15) NOT NULL,
  codigo_seguimiento CHAR(12) NOT NULL,
  estado ENUM('Pendiente','En proceso','Resuelto','Rechazado') NOT NULL DEFAULT 'Pendiente',
  contrasena_temporal VARCHAR(255) NULL, credencial_vista TINYINT(1) NOT NULL DEFAULT 0,
  cedula_responsable VARCHAR(15) NULL, fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion DATETIME NULL, UNIQUE KEY uq_recuperacion_codigo (codigo_seguimiento),
  CONSTRAINT fk_recuperacion_ticket FOREIGN KEY (id_ticket) REFERENCES INCIDENCIA(id_ticket),
  CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (cedula) REFERENCES USUARIO(cedula),
  CONSTRAINT fk_recuperacion_responsable FOREIGN KEY (cedula_responsable) REFERENCES USUARIO(cedula),
  KEY idx_recuperacion_estado (estado, fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO CONFIGURACION_SISTEMA (clave, valor, descripcion) VALUES
('dias_maximos_prestamo','30','Cantidad maxima de dias para un prestamo'),
('registro_habilitado','1','Permite nuevos registros de usuario');
INSERT IGNORE INTO SERVICIO_DISPONIBLE (nombre, descripcion) VALUES
('Instalacion de software en los equipos','Instalacion o configuracion de software'),
('Preparacion de salones','Preparacion tecnica de un salon'),
('Solicitud de material didactico para usar en clase','Preparacion de recursos didacticos');
INSERT IGNORE INTO CATEGORIA_PRESTAMO (nombre) VALUES ('Equipamiento');
INSERT IGNORE INTO CATEGORIA_TECNOLOGICA (nombre) VALUES ('PC'),('Periferico'),('Monitor'),('Portatil'),('Otro');
