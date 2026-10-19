CREATE TABLE IF NOT EXISTS seguridad_intentos_login (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip VARCHAR(45) NOT NULL,
  identificador CHAR(64) NOT NULL,
  exito TINYINT(1) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_intentos_identificador (identificador, fecha),
  KEY idx_intentos_ip (ip, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS seguridad_eventos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo VARCHAR(40) NOT NULL,
  cedula VARCHAR(15) DEFAULT NULL,
  ip VARCHAR(45) NOT NULL,
  agente VARCHAR(255) NOT NULL DEFAULT '',
  detalle VARCHAR(500) NOT NULL DEFAULT '',
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_eventos_tipo (tipo, fecha),
  KEY idx_eventos_cedula (cedula, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3ra entrega (F-08): verificacion en dos pasos y "cerrar todas las sesiones"
ALTER TABLE USUARIO ADD COLUMN IF NOT EXISTS totp_secreto VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE USUARIO ADD COLUMN IF NOT EXISTS totp_ultimo_paso BIGINT NULL DEFAULT NULL;
ALTER TABLE USUARIO ADD COLUMN IF NOT EXISTS sesion_version INT NOT NULL DEFAULT 0;
