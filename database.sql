-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: database_final
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categoria_prestamo`
--

CREATE DATABASE IF NOT EXISTS nexus;
USE nexus;

DROP TABLE IF EXISTS `categoria_prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categoria_prestamo` (
  `id_categoria_prestamo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `esta_activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_categoria_prestamo`),
  UNIQUE KEY `uq_categoria_prestamo_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categoria_prestamo`
--

LOCK TABLES `categoria_prestamo` WRITE;
/*!40000 ALTER TABLE `categoria_prestamo` DISABLE KEYS */;
/*!40000 ALTER TABLE `categoria_prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categoria_tecnologica`
--

DROP TABLE IF EXISTS `categoria_tecnologica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categoria_tecnologica` (
  `id_categoria_tecnologica` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `esta_activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_categoria_tecnologica`),
  UNIQUE KEY `uq_categoria_tecnologica_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categoria_tecnologica`
--

LOCK TABLES `categoria_tecnologica` WRITE;
/*!40000 ALTER TABLE `categoria_tecnologica` DISABLE KEYS */;
/*!40000 ALTER TABLE `categoria_tecnologica` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_sistema`
--

DROP TABLE IF EXISTS `configuracion_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion_sistema` (
  `clave` varchar(60) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `actualizado_por` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`clave`),
  KEY `fk_configuracion_usuario` (`actualizado_por`),
  CONSTRAINT `fk_configuracion_usuario` FOREIGN KEY (`actualizado_por`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_sistema`
--

LOCK TABLES `configuracion_sistema` WRITE;
/*!40000 ALTER TABLE `configuracion_sistema` DISABLE KEYS */;
/*!40000 ALTER TABLE `configuracion_sistema` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consulta_plantilla`
--

DROP TABLE IF EXISTS `consulta_plantilla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consulta_plantilla` (
  `cedula_consulta` varchar(15) NOT NULL,
  `cedula_tecnico` varchar(15) NOT NULL,
  PRIMARY KEY (`cedula_consulta`,`cedula_tecnico`),
  KEY `fk_conspl_tecnico` (`cedula_tecnico`),
  CONSTRAINT `fk_conspl_consulta` FOREIGN KEY (`cedula_consulta`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_conspl_tecnico` FOREIGN KEY (`cedula_tecnico`) REFERENCES `plantilla_tecnico_asistente` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consulta_plantilla`
--

LOCK TABLES `consulta_plantilla` WRITE;
/*!40000 ALTER TABLE `consulta_plantilla` DISABLE KEYS */;
/*!40000 ALTER TABLE `consulta_plantilla` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consulta_ubicacion`
--

DROP TABLE IF EXISTS `consulta_ubicacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consulta_ubicacion` (
  `cedula` varchar(15) NOT NULL,
  `id_ubicacion` int(11) NOT NULL,
  PRIMARY KEY (`cedula`,`id_ubicacion`),
  KEY `fk_consub_ubicacion` (`id_ubicacion`),
  CONSTRAINT `fk_consub_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`),
  CONSTRAINT `fk_consub_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consulta_ubicacion`
--

LOCK TABLES `consulta_ubicacion` WRITE;
/*!40000 ALTER TABLE `consulta_ubicacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `consulta_ubicacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipo`
--

DROP TABLE IF EXISTS `equipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `equipo` (
  `id_equipo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_equipo` varchar(100) NOT NULL,
  `categoria_equipo` varchar(60) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `marca_equipo` varchar(60) DEFAULT NULL,
  `cantidad_del_equipo` int(11) NOT NULL DEFAULT 1,
  `esta_activo` tinyint(1) NOT NULL DEFAULT 1,
  `estado_equipo` enum('Disponible','Mantenimiento','Baja') NOT NULL DEFAULT 'Disponible',
  `fecha_agregado` date NOT NULL,
  `id_ubicacion` int(11) NOT NULL,
  PRIMARY KEY (`id_equipo`),
  KEY `fk_equipo_ubicacion` (`id_ubicacion`),
  KEY `idx_equipo_disponibilidad` (`esta_activo`,`estado_equipo`,`id_ubicacion`),
  CONSTRAINT `chk_equipo_cantidad` CHECK (`cantidad_del_equipo` >= 0),
  CONSTRAINT `chk_equipo_activo` CHECK (`esta_activo` in (0,1)),
  CONSTRAINT `fk_equipo_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipo`
--

LOCK TABLES `equipo` WRITE;
/*!40000 ALTER TABLE `equipo` DISABLE KEYS */;
INSERT INTO `equipo` VALUES (1,'PC 1','all-in-one','Marca Lenovo','',1,1,'Disponible','2026-10-19',1),(2,'Monitor 1','monitor','Marca Samsung','',1,0,'Baja','2026-10-19',2),(3,'Monitor 1','monitor','Marca Samsung','',1,1,'Disponible','2026-10-19',1);
/*!40000 ALTER TABLE `equipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_equipo`
--

DROP TABLE IF EXISTS `historial_equipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial_equipo` (
  `id_historial_equipo` int(11) NOT NULL AUTO_INCREMENT,
  `categoria` varchar(60) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_registrado` datetime NOT NULL DEFAULT current_timestamp(),
  `id_equipo` int(11) NOT NULL,
  `autor_cedula` varchar(15) DEFAULT NULL,
  `autor_nombre` varchar(170) DEFAULT NULL,
  PRIMARY KEY (`id_historial_equipo`),
  KEY `fk_histeq_equipo` (`id_equipo`),
  KEY `idx_histeq_autor_fecha` (`autor_cedula`,`fecha_registrado`),
  CONSTRAINT `fk_histeq_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_equipo`
--

LOCK TABLES `historial_equipo` WRITE;
/*!40000 ALTER TABLE `historial_equipo` DISABLE KEYS */;
INSERT INTO `historial_equipo` (`id_historial_equipo`,`categoria`,`descripcion`,`fecha_registrado`,`id_equipo`,`autor_cedula`,`autor_nombre`) VALUES (1,'Alta',NULL,'2026-10-19 11:47:21',1,NULL,NULL),(2,'Alta',NULL,'2026-10-19 11:58:53',2,NULL,NULL),(3,'Traslado de equipo','Equipo \"Monitor 1\" trasladado de \"Laboratorio 1\" a \"Laboratorio 2\".','2026-10-19 11:59:19',2,NULL,NULL),(4,'Baja de equipo','Equipo \"Monitor 1\" dado de baja desde \"Laboratorio 2\".','2026-10-19 11:59:36',2,NULL,NULL),(5,'Alta',NULL,'2026-10-19 12:02:01',3,NULL,NULL),(6,'Traslado de equipo','Equipo \"Monitor 1\" trasladado de \"Laboratorio 2\" a \"Laboratorio 1\" por eliminacion de seccion.','2026-10-19 12:02:12',3,NULL,NULL);
/*!40000 ALTER TABLE `historial_equipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_prestamo`
--

DROP TABLE IF EXISTS `historial_prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial_prestamo` (
  `id_historial_prestamo` int(11) NOT NULL AUTO_INCREMENT,
  `estado` enum('Solicitado','Activo','Devuelto','Cancelado') DEFAULT NULL,
  `fecha_registrado` datetime NOT NULL DEFAULT current_timestamp(),
  `observacion` text DEFAULT NULL,
  `id_prestamo` int(11) NOT NULL,
  PRIMARY KEY (`id_historial_prestamo`),
  KEY `fk_histpres_prestamo` (`id_prestamo`),
  CONSTRAINT `fk_histpres_prestamo` FOREIGN KEY (`id_prestamo`) REFERENCES `prestamo` (`id_prestamo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_prestamo`
--

LOCK TABLES `historial_prestamo` WRITE;
/*!40000 ALTER TABLE `historial_prestamo` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_servicio`
--

DROP TABLE IF EXISTS `historial_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial_servicio` (
  `id_historial_servicio` int(11) NOT NULL AUTO_INCREMENT,
  `estado` enum('Pendiente','En proceso','Finalizado','Cancelado') DEFAULT NULL,
  `fecha_registrado` datetime NOT NULL DEFAULT current_timestamp(),
  `observacion` text DEFAULT NULL,
  `id_servicio` int(11) NOT NULL,
  PRIMARY KEY (`id_historial_servicio`),
  KEY `fk_histserv_servicio` (`id_servicio`),
  CONSTRAINT `fk_histserv_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_servicio`
--

LOCK TABLES `historial_servicio` WRITE;
/*!40000 ALTER TABLE `historial_servicio` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_servicio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_ubicacion`
--

DROP TABLE IF EXISTS `historial_ubicacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial_ubicacion` (
  `id_historial_ubicacion` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_registrado` datetime NOT NULL DEFAULT current_timestamp(),
  `categoria` varchar(60) NOT NULL DEFAULT 'Cambio de seccion',
  `descripcion` text DEFAULT NULL,
  `id_ubicacion` int(11) NOT NULL,
  `autor_cedula` varchar(15) DEFAULT NULL,
  `autor_nombre` varchar(170) DEFAULT NULL,
  PRIMARY KEY (`id_historial_ubicacion`),
  KEY `fk_histub_ubicacion` (`id_ubicacion`),
  KEY `idx_histub_autor_fecha` (`autor_cedula`,`fecha_registrado`),
  CONSTRAINT `fk_histub_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_ubicacion`
--

LOCK TABLES `historial_ubicacion` WRITE;
/*!40000 ALTER TABLE `historial_ubicacion` DISABLE KEYS */;
INSERT INTO `historial_ubicacion` (`id_historial_ubicacion`,`fecha_registrado`,`categoria`,`descripcion`,`id_ubicacion`,`autor_cedula`,`autor_nombre`) VALUES (1,'2026-10-19 12:02:12','Baja de seccion','Seccion \"Laboratorio 2\" dada de baja. 1 equipo trasladado a \"Laboratorio 1\".',2,NULL,NULL);
/*!40000 ALTER TABLE `historial_ubicacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incidencia`
--

DROP TABLE IF EXISTS `incidencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incidencia` (
  `id_ticket` int(11) NOT NULL AUTO_INCREMENT,
  `categoria` varchar(60) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `fecha_de_solicitud` date NOT NULL,
  `lugar` varchar(100) DEFAULT NULL,
  `fecha_cierre` date DEFAULT NULL,
  `estado` enum('Pendiente','En proceso','Resuelto','Cerrado') NOT NULL DEFAULT 'Pendiente',
  `diagnostico` text DEFAULT NULL,
  `solucion` text DEFAULT NULL,
  `comentario_resolucion` text DEFAULT NULL,
  `id_equipo` int(11) DEFAULT NULL,
  `cedula_crea` varchar(15) NOT NULL,
  `cedula_responde` varchar(15) DEFAULT NULL,
  `esta_activa` tinyint(1) NOT NULL DEFAULT 1,
  `tipo_ticket` varchar(40) NOT NULL DEFAULT 'Soporte',
  PRIMARY KEY (`id_ticket`),
  KEY `fk_incidencia_equipo` (`id_equipo`),
  KEY `fk_incidencia_crea` (`cedula_crea`),
  KEY `fk_incidencia_responde` (`cedula_responde`),
  KEY `idx_incidencia_bandeja` (`esta_activa`,`estado`,`id_ticket`),
  KEY `idx_incidencia_creador_activa` (`cedula_crea`,`esta_activa`,`id_ticket`),
  CONSTRAINT `chk_incidencia_activa` CHECK (`esta_activa` in (0,1)),
  CONSTRAINT `chk_incidencia_fechas` CHECK (`fecha_cierre` is null or `fecha_cierre` >= `fecha_de_solicitud`),
  CONSTRAINT `fk_incidencia_crea` FOREIGN KEY (`cedula_crea`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_incidencia_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`),
  CONSTRAINT `fk_incidencia_responde` FOREIGN KEY (`cedula_responde`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidencia`
--

LOCK TABLES `incidencia` WRITE;
/*!40000 ALTER TABLE `incidencia` DISABLE KEYS */;
INSERT INTO `incidencia` VALUES (1,'Hardware','La PC no da imagen','La PC no enciende','2026-10-19','Laboratorio 1','2026-10-19','Cerrado',NULL,NULL,NULL,NULL,'57324099',NULL,0,'Soporte'),(2,'Hardware','No prende','PC no anda','2026-10-19','Laboratorio 1',NULL,'En proceso',NULL,NULL,NULL,NULL,'57324099','57324099',1,'Soporte'),(3,'Cuenta','Solicitud de recuperacion creada por Pablo Mecoll.','Recuperacion de contraseña','2026-10-19','Portal',NULL,'En proceso','Solicitud de recuperacion revisada.','Se genero una contraseña temporal.',NULL,NULL,'57847417','66666666',1,'Recuperacion'),(6,'Cuenta','Solicitud de recuperacion creada por Pablo Mecoll.','Recuperacion de contraseña','2026-10-19','Portal','2026-10-19','Resuelto','Solicitud de recuperacion revisada.','Se genero una contraseña temporal.',NULL,NULL,'57847417','57324099',1,'Recuperacion'),(7,'Cuenta','Solicitud de recuperacion creada por Pablo Mecoll.','Recuperacion de contraseña','2026-10-19','Portal','2026-10-19','Resuelto','Solicitud de recuperacion revisada.','Se genero una contraseña temporal.',NULL,NULL,'57847417','57324099',1,'Recuperacion');
/*!40000 ALTER TABLE `incidencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plantilla_tecnico_asistente`
--

DROP TABLE IF EXISTS `plantilla_tecnico_asistente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plantilla_tecnico_asistente` (
  `id_plantilla` int(11) NOT NULL AUTO_INCREMENT,
  `cedula` varchar(15) NOT NULL,
  `comentario_ta` text DEFAULT NULL,
  `horario_entrada_ta` time DEFAULT NULL,
  `horario_salida_ta` time DEFAULT NULL,
  PRIMARY KEY (`id_plantilla`),
  UNIQUE KEY `uq_plantilla_cedula` (`cedula`),
  CONSTRAINT `fk_plantilla_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plantilla_tecnico_asistente`
--

LOCK TABLES `plantilla_tecnico_asistente` WRITE;
/*!40000 ALTER TABLE `plantilla_tecnico_asistente` DISABLE KEYS */;
INSERT INTO `plantilla_tecnico_asistente` VALUES (1,'57324099','- Responder Tickets (Pendiente, plazo 25/10/2026)','08:00:00','19:00:00');
/*!40000 ALTER TABLE `plantilla_tecnico_asistente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prestamo`
--

DROP TABLE IF EXISTS `prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prestamo` (
  `id_prestamo` int(11) NOT NULL AUTO_INCREMENT,
  `categoria` varchar(60) DEFAULT NULL,
  `estado` enum('Solicitado','Activo','Devuelto','Cancelado') NOT NULL DEFAULT 'Solicitado',
  `fecha_solicitado` date NOT NULL,
  `fecha_devolucion` date NOT NULL,
  `fecha_devolucion_real` datetime DEFAULT NULL,
  `recursos_solicitados` varchar(255) DEFAULT NULL,
  `jornada` varchar(30) DEFAULT NULL,
  `lugar_entrega` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `comentario_resolucion` text DEFAULT NULL,
  `cedula` varchar(15) NOT NULL,
  `id_equipo` int(11) NOT NULL,
  `esta_activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_prestamo`),
  KEY `fk_prestamo_usuario` (`cedula`),
  KEY `fk_prestamo_equipo` (`id_equipo`),
  KEY `idx_prestamo_bandeja` (`esta_activo`,`cedula`,`id_prestamo`),
  KEY `idx_prestamo_estado_fecha` (`estado`,`fecha_devolucion`),
  CONSTRAINT `chk_prestamo_activo` CHECK (`esta_activo` in (0,1)),
  CONSTRAINT `chk_prestamo_fechas` CHECK (`fecha_devolucion` >= `fecha_solicitado`),
  CONSTRAINT `fk_prestamo_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`),
  CONSTRAINT `fk_prestamo_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamo`
--

LOCK TABLES `prestamo` WRITE;
/*!40000 ALTER TABLE `prestamo` DISABLE KEYS */;
INSERT INTO `prestamo` (`id_prestamo`,`categoria`,`estado`,`fecha_solicitado`,`fecha_devolucion`,`fecha_devolucion_real`,`recursos_solicitados`,`jornada`,`lugar_entrega`,`descripcion`,`comentario_resolucion`,`cedula`,`id_equipo`,`esta_activo`) VALUES (1,'all-in-one','Solicitado','2026-10-19','2026-10-19',NULL,'1 PC 1','Mañana','Laboratorio 1','Para dar una clase de programación','bien','57324099',1,1);
/*!40000 ALTER TABLE `prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `realiza_tarea`
--

DROP TABLE IF EXISTS `realiza_tarea`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `realiza_tarea` (
  `cedula` varchar(15) NOT NULL,
  `id_tarea` int(11) NOT NULL,
  PRIMARY KEY (`cedula`,`id_tarea`),
  KEY `fk_realtarea_tarea` (`id_tarea`),
  CONSTRAINT `fk_realtarea_tarea` FOREIGN KEY (`id_tarea`) REFERENCES `tareas` (`id_tarea`),
  CONSTRAINT `fk_realtarea_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `realiza_tarea`
--

LOCK TABLES `realiza_tarea` WRITE;
/*!40000 ALTER TABLE `realiza_tarea` DISABLE KEYS */;
INSERT INTO `realiza_tarea` VALUES ('57324099',1);
/*!40000 ALTER TABLE `realiza_tarea` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recuperacion_contrasena`
--

DROP TABLE IF EXISTS `recuperacion_contrasena`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recuperacion_contrasena` (
  `id_recuperacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `cedula` varchar(15) NOT NULL,
  `codigo_seguimiento` char(12) NOT NULL,
  `estado` enum('Pendiente','En proceso','Resuelto','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `contrasena_temporal` varchar(255) DEFAULT NULL,
  `credencial_vista` tinyint(1) NOT NULL DEFAULT 0,
  `cedula_responsable` varchar(15) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_resolucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_recuperacion`),
  UNIQUE KEY `uq_recuperacion_codigo` (`codigo_seguimiento`),
  KEY `fk_recuperacion_ticket` (`id_ticket`),
  KEY `fk_recuperacion_usuario` (`cedula`),
  KEY `fk_recuperacion_responsable` (`cedula_responsable`),
  KEY `idx_recuperacion_estado` (`estado`,`fecha_creacion`),
  CONSTRAINT `fk_recuperacion_responsable` FOREIGN KEY (`cedula_responsable`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_recuperacion_ticket` FOREIGN KEY (`id_ticket`) REFERENCES `incidencia` (`id_ticket`),
  CONSTRAINT `fk_recuperacion_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recuperacion_contrasena`
--

LOCK TABLES `recuperacion_contrasena` WRITE;
/*!40000 ALTER TABLE `recuperacion_contrasena` DISABLE KEYS */;
INSERT INTO `recuperacion_contrasena` VALUES (1,3,'57847417','D6171006D347','Resuelto',NULL,1,'57324099','2026-10-19 12:11:25','2026-10-19 12:13:01'),(3,6,'57847417','3A8EBEF13B85','Resuelto',NULL,1,'57324099','2026-10-19 12:45:41','2026-10-19 12:46:30'),(4,7,'57847417','465C5899C220','Resuelto',NULL,1,'57324099','2026-10-19 12:57:30','2026-10-19 12:58:02');
/*!40000 ALTER TABLE `recuperacion_contrasena` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reporte_error`
--

DROP TABLE IF EXISTS `reporte_error`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reporte_error` (
  `id_reporte_error` int(11) NOT NULL AUTO_INCREMENT,
  `tipo` varchar(60) NOT NULL,
  `contacto` varchar(150) NOT NULL,
  `asunto` varchar(120) NOT NULL,
  `detalle` text NOT NULL,
  `estado` enum('Pendiente','En proceso','Resuelto','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `cedula_responsable` varchar(15) DEFAULT NULL,
  `respuesta` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_cierre` datetime DEFAULT NULL,
  PRIMARY KEY (`id_reporte_error`),
  KEY `fk_reporte_error_responsable` (`cedula_responsable`),
  KEY `idx_reporte_error_estado` (`estado`,`fecha_creacion`),
  CONSTRAINT `fk_reporte_error_responsable` FOREIGN KEY (`cedula_responsable`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reporte_error`
--

LOCK TABLES `reporte_error` WRITE;
/*!40000 ALTER TABLE `reporte_error` DISABLE KEYS */;
/*!40000 ALTER TABLE `reporte_error` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seguridad_eventos`
--

DROP TABLE IF EXISTS `seguridad_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seguridad_eventos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tipo` varchar(40) NOT NULL,
  `cedula` varchar(15) DEFAULT NULL,
  `ip` varchar(45) NOT NULL,
  `agente` varchar(255) NOT NULL DEFAULT '',
  `detalle` varchar(500) NOT NULL DEFAULT '',
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_eventos_tipo` (`tipo`,`fecha`),
  KEY `idx_eventos_cedula` (`cedula`,`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seguridad_eventos`
--

LOCK TABLES `seguridad_eventos` WRITE;
/*!40000 ALTER TABLE `seguridad_eventos` DISABLE KEYS */;
INSERT INTO `seguridad_eventos` VALUES (1,'login_fallido','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 11:44:03'),(2,'login_fallido','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 11:44:11'),(3,'login_fallido','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 11:44:15'),(4,'login_fallido','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 11:44:27'),(5,'2fa_activado','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','en el login (obligatorio)','2026-10-19 11:45:37'),(6,'login_ok','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 11:45:37'),(7,'logout','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:10:34'),(8,'login_fallido','57847417','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:10:56'),(9,'login_fallido','57847417','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:11:02'),(10,'login_fallido','57847417','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:11:04'),(11,'login_ok','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:12:54'),(12,'logout','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:13:22'),(13,'login_fallido','57847417','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:14:06'),(14,'login_fallido','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:18:33'),(15,'login_inactivo','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:18:38'),(16,'login_inactivo','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:19:52'),(17,'login_inactivo','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:19:54'),(18,'login_inactivo','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:19:55'),(19,'login_inactivo','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:19:55'),(20,'login_inactivo','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:20:08'),(21,'login_ok','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:20:33'),(22,'login_fallido','66666666','127.0.0.1','curl/8.21.0','','2026-10-19 12:27:14'),(23,'login_ok','99999998','127.0.0.1','curl/8.21.0','','2026-10-19 12:27:28'),(24,'login_ok','99999998','127.0.0.1','curl/8.21.0','','2026-10-19 12:27:43'),(25,'login_ok','99999998','127.0.0.1','curl/8.21.0','','2026-10-19 12:28:00'),(26,'login_ok','99999998','127.0.0.1','curl/8.21.0','','2026-10-19 12:28:15'),(27,'login_ok','99999998','127.0.0.1','curl/8.21.0','','2026-10-19 12:28:16'),(28,'login_ok','99999998','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','','2026-10-19 12:34:30'),(29,'login_ok','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:38:20'),(30,'logout','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:39:03'),(31,'login_fallido',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:40:01'),(32,'login_ok','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:40:13'),(33,'logout','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:43:37'),(34,'login_ok','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:44:24'),(35,'logout','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:45:13'),(36,'login_ok','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:46:14'),(37,'logout','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:48:45'),(38,'login_fallido','57847417','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:49:19'),(39,'login_ok','99999998','127.0.0.1','curl/8.21.0','','2026-10-19 12:50:02'),(40,'login_ok','99999998','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','','2026-10-19 12:50:49'),(41,'login_ok','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:54:20'),(42,'logout','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:54:30'),(43,'login_ok','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:54:39'),(44,'login_ok','99999998','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.6.5','','2026-10-19 12:56:30'),(45,'logout','66666666','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:57:10'),(46,'login_ok','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:57:55'),(47,'logout','57324099','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:58:08'),(48,'login_ok','57847417','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0','','2026-10-19 12:58:31'),(49,'login_ok','99999998','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','','2026-10-19 12:58:45'),(50,'login_ok','99999998','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.6.5','','2026-10-19 12:58:54');
/*!40000 ALTER TABLE `seguridad_eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seguridad_intentos_login`
--

DROP TABLE IF EXISTS `seguridad_intentos_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seguridad_intentos_login` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ip` varchar(45) NOT NULL,
  `identificador` char(64) NOT NULL,
  `exito` tinyint(1) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_intentos_identificador` (`identificador`,`fecha`),
  KEY `idx_intentos_ip` (`ip`,`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seguridad_intentos_login`
--

LOCK TABLES `seguridad_intentos_login` WRITE;
/*!40000 ALTER TABLE `seguridad_intentos_login` DISABLE KEYS */;
INSERT INTO `seguridad_intentos_login` VALUES (1,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',0,'2026-10-19 11:44:03'),(2,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',0,'2026-10-19 11:44:11'),(3,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',0,'2026-10-19 11:44:15'),(4,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',0,'2026-10-19 11:44:27'),(5,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',1,'2026-10-19 11:45:37'),(9,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',1,'2026-10-19 12:12:54'),(11,'127.0.0.1','388b6888be84c8b6dea66b35eedfa19b06a18b9d3e0d1f1cf0618a34fe604559',0,'2026-10-19 12:18:33'),(12,'127.0.0.1','388b6888be84c8b6dea66b35eedfa19b06a18b9d3e0d1f1cf0618a34fe604559',1,'2026-10-19 12:20:33'),(13,'127.0.0.1','388b6888be84c8b6dea66b35eedfa19b06a18b9d3e0d1f1cf0618a34fe604559',0,'2026-10-19 12:27:14'),(14,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:27:28'),(15,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:27:43'),(16,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:28:00'),(17,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:28:15'),(18,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:28:16'),(19,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:34:30'),(20,'127.0.0.1','388b6888be84c8b6dea66b35eedfa19b06a18b9d3e0d1f1cf0618a34fe604559',1,'2026-10-19 12:38:20'),(21,'127.0.0.1','3050f12457bf6400e50e37d251438b4b1cea5a1f4086dbffe50048f52ee37871',0,'2026-10-19 12:40:01'),(22,'127.0.0.1','388b6888be84c8b6dea66b35eedfa19b06a18b9d3e0d1f1cf0618a34fe604559',1,'2026-10-19 12:40:13'),(23,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',1,'2026-10-19 12:44:24'),(24,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',1,'2026-10-19 12:46:14'),(26,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:50:02'),(27,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:50:49'),(28,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',1,'2026-10-19 12:54:20'),(29,'127.0.0.1','388b6888be84c8b6dea66b35eedfa19b06a18b9d3e0d1f1cf0618a34fe604559',1,'2026-10-19 12:54:39'),(35,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:56:30'),(36,'127.0.0.1','f88f77bd1eed8d71ff96c48a2bb5220bacf0880d09a0c766ec9f6816dbeef228',1,'2026-10-19 12:57:55'),(37,'127.0.0.1','c5a1203913d3c79fb424bf3c129a1fdde28ccce3f5d452483c5510b548df96ff',1,'2026-10-19 12:58:31'),(38,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:58:45'),(39,'127.0.0.1','0f3a40ef379fc06ee139d598aba3e0a94c22b3bb1b8dca1ee4246d7a5eefebfd',1,'2026-10-19 12:58:54');
/*!40000 ALTER TABLE `seguridad_intentos_login` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicio`
--

DROP TABLE IF EXISTS `servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `servicio` (
  `id_servicio` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_de_servicio` varchar(60) DEFAULT NULL,
  `estado` enum('Pendiente','En proceso','Finalizado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  `descripcion` text DEFAULT NULL,
  `titulo` varchar(100) DEFAULT NULL,
  `lugar` varchar(100) DEFAULT NULL,
  `fecha_de_solicitud` date NOT NULL,
  `cedula` varchar(15) NOT NULL,
  `fecha_deseada` date DEFAULT NULL,
  `esta_activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_servicio`),
  KEY `fk_servicio_usuario` (`cedula`),
  KEY `idx_servicio_bandeja` (`esta_activo`,`cedula`,`id_servicio`),
  KEY `idx_servicio_estado_fecha` (`estado`,`fecha_de_solicitud`),
  CONSTRAINT `chk_servicio_activo` CHECK (`esta_activo` in (0,1)),
  CONSTRAINT `fk_servicio_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicio`
--

LOCK TABLES `servicio` WRITE;
/*!40000 ALTER TABLE `servicio` DISABLE KEYS */;
INSERT INTO `servicio` VALUES (1,'Instalacion de software en los equipos','Pendiente','Preciso que se instale XAMPP en todos los equipos del salón','Instalacion de software en los equipos','Laboratorio 1','2026-10-19','57324099','2026-10-10',1);
/*!40000 ALTER TABLE `servicio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicio_disponible`
--

DROP TABLE IF EXISTS `servicio_disponible`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `servicio_disponible` (
  `id_servicio_disponible` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `esta_activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_servicio_disponible`),
  UNIQUE KEY `uq_servicio_disponible_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicio_disponible`
--

LOCK TABLES `servicio_disponible` WRITE;
/*!40000 ALTER TABLE `servicio_disponible` DISABLE KEYS */;
INSERT INTO `servicio_disponible` VALUES (1,'Realizar mantenimiento del hardware','',1);
/*!40000 ALTER TABLE `servicio_disponible` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicita_prestamo`
--

DROP TABLE IF EXISTS `solicita_prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `solicita_prestamo` (
  `cedula` varchar(15) NOT NULL,
  `id_prestamo` int(11) NOT NULL,
  PRIMARY KEY (`cedula`,`id_prestamo`),
  KEY `fk_solpres_prestamo` (`id_prestamo`),
  CONSTRAINT `fk_solpres_prestamo` FOREIGN KEY (`id_prestamo`) REFERENCES `prestamo` (`id_prestamo`),
  CONSTRAINT `fk_solpres_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicita_prestamo`
--

LOCK TABLES `solicita_prestamo` WRITE;
/*!40000 ALTER TABLE `solicita_prestamo` DISABLE KEYS */;
INSERT INTO `solicita_prestamo` VALUES ('57324099',1);
/*!40000 ALTER TABLE `solicita_prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicita_servicio`
--

DROP TABLE IF EXISTS `solicita_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `solicita_servicio` (
  `cedula` varchar(15) NOT NULL,
  `id_servicio` int(11) NOT NULL,
  PRIMARY KEY (`cedula`,`id_servicio`),
  KEY `fk_solserv_servicio` (`id_servicio`),
  CONSTRAINT `fk_solserv_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`),
  CONSTRAINT `fk_solserv_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicita_servicio`
--

LOCK TABLES `solicita_servicio` WRITE;
/*!40000 ALTER TABLE `solicita_servicio` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicita_servicio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitud_cambio_rol`
--

DROP TABLE IF EXISTS `solicitud_cambio_rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `solicitud_cambio_rol` (
  `id_solicitud_cambio_rol` int(11) NOT NULL AUTO_INCREMENT,
  `cedula_solicitante` varchar(15) NOT NULL,
  `rol_actual` varchar(40) NOT NULL,
  `rol_solicitado` varchar(40) NOT NULL,
  `motivo` text DEFAULT NULL,
  `estado` enum('Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `cedula_revisor` varchar(15) DEFAULT NULL,
  `fecha_solicitud` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_revision` datetime DEFAULT NULL,
  PRIMARY KEY (`id_solicitud_cambio_rol`),
  KEY `fk_cambio_rol_solicitante` (`cedula_solicitante`),
  KEY `fk_cambio_rol_revisor` (`cedula_revisor`),
  KEY `idx_cambio_rol_estado` (`estado`,`fecha_solicitud`),
  CONSTRAINT `fk_cambio_rol_revisor` FOREIGN KEY (`cedula_revisor`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_cambio_rol_solicitante` FOREIGN KEY (`cedula_solicitante`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitud_cambio_rol`
--

LOCK TABLES `solicitud_cambio_rol` WRITE;
/*!40000 ALTER TABLE `solicitud_cambio_rol` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicitud_cambio_rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitud_registro`
--

DROP TABLE IF EXISTS `solicitud_registro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `solicitud_registro` (
  `id_solicitud_registro` int(11) NOT NULL AUTO_INCREMENT,
  `estado_solicitud` enum('Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `id_usuario_manda` varchar(15) NOT NULL,
  `id_usuario_responde` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud_registro`),
  KEY `fk_solreg_manda` (`id_usuario_manda`),
  KEY `fk_solreg_responde` (`id_usuario_responde`),
  KEY `idx_solicitud_registro_estado` (`estado_solicitud`,`id_solicitud_registro`),
  CONSTRAINT `fk_solreg_manda` FOREIGN KEY (`id_usuario_manda`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_solreg_responde` FOREIGN KEY (`id_usuario_responde`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitud_registro`
--

LOCK TABLES `solicitud_registro` WRITE;
/*!40000 ALTER TABLE `solicitud_registro` DISABLE KEYS */;
INSERT INTO `solicitud_registro` VALUES (1,'Pendiente','57847417',NULL),(2,'Aprobado','66666666',NULL);
/*!40000 ALTER TABLE `solicitud_registro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas`
--

DROP TABLE IF EXISTS `tareas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tareas` (
  `id_tarea` int(11) NOT NULL AUTO_INCREMENT,
  `titulo_tarea` varchar(100) NOT NULL,
  `descripcion_tarea` text DEFAULT NULL,
  `plazo_tarea` date DEFAULT NULL,
  `categoria_tarea` varchar(60) DEFAULT NULL,
  `dificultad_tarea` enum('Baja','Media','Alta','Critica') NOT NULL DEFAULT 'Media',
  `estado_tarea` enum('Pendiente','En curso','En revision','Completada') NOT NULL DEFAULT 'Pendiente',
  `color_tarea` char(7) DEFAULT NULL,
  `fecha_agregada` date NOT NULL,
  `fecha_inicio_tarea` date DEFAULT NULL,
  PRIMARY KEY (`id_tarea`),
  KEY `idx_tareas_tablero` (`estado_tarea`,`plazo_tarea`,`id_tarea`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas`
--

LOCK TABLES `tareas` WRITE;
/*!40000 ALTER TABLE `tareas` DISABLE KEYS */;
INSERT INTO `tareas` VALUES (1,'Responder Tickets','Atender tickets pendientes','2026-10-26','Otro','Media','Pendiente','#00a7b9','2026-10-19','2026-10-19');
/*!40000 ALTER TABLE `tareas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ubicacion`
--

DROP TABLE IF EXISTS `ubicacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ubicacion` (
  `id_ubicacion` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_inventario` varchar(100) NOT NULL,
  `esta_activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_ubicacion`),
  KEY `idx_ubicacion_activa_nombre` (`esta_activa`,`seccion_inventario`),
  CONSTRAINT `chk_ubicacion_activa` CHECK (`esta_activa` in (0,1))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ubicacion`
--

LOCK TABLES `ubicacion` WRITE;
/*!40000 ALTER TABLE `ubicacion` DISABLE KEYS */;
INSERT INTO `ubicacion` VALUES (1,'Laboratorio 1',1),(2,'Laboratorio 2',0);
/*!40000 ALTER TABLE `ubicacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario` (
  `cedula` varchar(15) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `correo_electronico` varchar(150) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `rol` enum('Administrador','Tecnico_Asistente','Solicitante') NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `esta_activo` tinyint(1) NOT NULL DEFAULT 1,
  `debe_cambiar_contrasena` tinyint(1) NOT NULL DEFAULT 0,
  `totp_secreto` varchar(64) DEFAULT NULL,
  `totp_ultimo_paso` bigint(20) DEFAULT NULL,
  `sesion_version` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`cedula`),
  UNIQUE KEY `uq_usuario_correo` (`correo_electronico`),
  KEY `idx_usuario_bandeja` (`esta_activo`,`estado`,`rol`,`nombre`,`apellido`),
  CONSTRAINT `chk_usuario_activo` CHECK (`esta_activo` in (0,1)),
  CONSTRAINT `chk_usuario_cambio_clave` CHECK (`debe_cambiar_contrasena` in (0,1)),
  CONSTRAINT `chk_usuario_sesion_version` CHECK (`sesion_version` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES ('57324099','jean','-','jeeanortiz8@gmail.com','$argon2id$v=19$m=65536,t=4,p=1$bTJySHk0VlFoZURRemc3OQ$2OCpQEqO/3u0xJFEfRQ7XhElMw9KN2sgAzbtvyWeb3o','Activo','Administrador',NULL,NULL,NULL,1,0,'OXJK6OSGMHQ6QQHTDYMQELBOAA6JXABM',59747515,1),('57847417','Pablo','Mecoll','pmecoll250@gmail.com','$2y$10$TBEy51CSHeYKz7rNFFBoT.35KB9Yy6aj6jO88ap5CfKT6nwUC5q4u','Activo','Tecnico_Asistente',NULL,NULL,NULL,1,0,NULL,NULL,3),('66666666','Josefina','Prieto','jose-fina@gmail.com','$argon2id$v=19$m=65536,t=4,p=1$alhXZEJCV09qQkxMcEtRMg$Vil9xYyTEBiiAtIOG9t3M5pTJw48jjlApO9FdXBqV30','Activo','Tecnico_Asistente',NULL,NULL,NULL,1,0,NULL,NULL,0);
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'database_final'
--

--
-- Dumping routines for database 'database_final'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-19 21:22:59
