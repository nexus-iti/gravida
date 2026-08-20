-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: proyecto
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
-- Current Database: `proyecto`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `proyecto` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `proyecto`;

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
  CONSTRAINT `fk_equipo_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipo`
--

LOCK TABLES `equipo` WRITE;
/*!40000 ALTER TABLE `equipo` DISABLE KEYS */;
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
  PRIMARY KEY (`id_historial_equipo`),
  KEY `fk_histeq_equipo` (`id_equipo`),
  CONSTRAINT `fk_histeq_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_equipo`
--

LOCK TABLES `historial_equipo` WRITE;
/*!40000 ALTER TABLE `historial_equipo` DISABLE KEYS */;
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
  `descripcion` text DEFAULT NULL,
  `id_ubicacion` int(11) NOT NULL,
  PRIMARY KEY (`id_historial_ubicacion`),
  KEY `fk_histub_ubicacion` (`id_ubicacion`),
  CONSTRAINT `fk_histub_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_ubicacion`
--

LOCK TABLES `historial_ubicacion` WRITE;
/*!40000 ALTER TABLE `historial_ubicacion` DISABLE KEYS */;
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
  `id_equipo` int(11) DEFAULT NULL,
  `cedula_crea` varchar(15) NOT NULL,
  `cedula_responde` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id_ticket`),
  KEY `fk_incidencia_equipo` (`id_equipo`),
  KEY `fk_incidencia_crea` (`cedula_crea`),
  KEY `fk_incidencia_responde` (`cedula_responde`),
  CONSTRAINT `fk_incidencia_crea` FOREIGN KEY (`cedula_crea`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_incidencia_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`),
  CONSTRAINT `fk_incidencia_responde` FOREIGN KEY (`cedula_responde`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidencia`
--

LOCK TABLES `incidencia` WRITE;
/*!40000 ALTER TABLE `incidencia` DISABLE KEYS */;
INSERT INTO `incidencia` VALUES (2,'Software','a','a','2026-08-19','Taller 1',NULL,'Pendiente',NULL,NULL,NULL,'57847417',NULL);
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plantilla_tecnico_asistente`
--

LOCK TABLES `plantilla_tecnico_asistente` WRITE;
/*!40000 ALTER TABLE `plantilla_tecnico_asistente` DISABLE KEYS */;
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
  `recursos_solicitados` varchar(255) DEFAULT NULL,
  `jornada` varchar(30) DEFAULT NULL,
  `lugar_entrega` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `cedula` varchar(15) NOT NULL,
  `id_equipo` int(11) NOT NULL,
  PRIMARY KEY (`id_prestamo`),
  KEY `fk_prestamo_usuario` (`cedula`),
  KEY `fk_prestamo_equipo` (`id_equipo`),
  CONSTRAINT `fk_prestamo_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`),
  CONSTRAINT `fk_prestamo_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamo`
--

LOCK TABLES `prestamo` WRITE;
/*!40000 ALTER TABLE `prestamo` DISABLE KEYS */;
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
INSERT INTO `realiza_tarea` VALUES ('12312332',3);
/*!40000 ALTER TABLE `realiza_tarea` ENABLE KEYS */;
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
  PRIMARY KEY (`id_servicio`),
  KEY `fk_servicio_usuario` (`cedula`),
  CONSTRAINT `fk_servicio_usuario` FOREIGN KEY (`cedula`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicio`
--

LOCK TABLES `servicio` WRITE;
/*!40000 ALTER TABLE `servicio` DISABLE KEYS */;
INSERT INTO `servicio` VALUES (1,'Preparacion de salones','Pendiente','a','Preparacion de salones','Teorico 1','2026-08-19','57847417','2026-08-21');
/*!40000 ALTER TABLE `servicio` ENABLE KEYS */;
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
  CONSTRAINT `fk_solreg_manda` FOREIGN KEY (`id_usuario_manda`) REFERENCES `usuario` (`cedula`),
  CONSTRAINT `fk_solreg_responde` FOREIGN KEY (`id_usuario_responde`) REFERENCES `usuario` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitud_registro`
--

LOCK TABLES `solicitud_registro` WRITE;
/*!40000 ALTER TABLE `solicitud_registro` DISABLE KEYS */;
INSERT INTO `solicitud_registro` VALUES (1,'Pendiente','57847417',NULL),(2,'Pendiente','57324099',NULL),(3,'Pendiente','11111111',NULL),(4,'Pendiente','12312332',NULL);
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
  `estado_tarea` enum('Pendiente','En proceso','Completada') NOT NULL DEFAULT 'Pendiente',
  `color_tarea` char(7) DEFAULT NULL,
  `fecha_agregada` date NOT NULL,
  PRIMARY KEY (`id_tarea`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas`
--

LOCK TABLES `tareas` WRITE;
/*!40000 ALTER TABLE `tareas` DISABLE KEYS */;
INSERT INTO `tareas` VALUES (3,'arreglar x','arreglar algo','2026-09-14','Hardware','Pendiente','#16a34a','2026-09-14');
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
  PRIMARY KEY (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ubicacion`
--

LOCK TABLES `ubicacion` WRITE;
/*!40000 ALTER TABLE `ubicacion` DISABLE KEYS */;
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
  PRIMARY KEY (`cedula`),
  UNIQUE KEY `uq_usuario_correo` (`correo_electronico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES ('11111111','solicitante','-','aaaa@gmail.com','Hola123**','Activo','Tecnico_Asistente',NULL,NULL,NULL),('12312332','Roberto','Jose','pmecoll@gmail.com','Manteca1','Activo','Tecnico_Asistente',NULL,NULL,NULL),('12345678','jean','ortiz','prueba1@gmail.com','Hola123*','Activo','Solicitante',NULL,'2026-08-23',NULL),('57324099','jean','-','jeeanortiz8@gmail.com','Hola123*','Activo','Administrador',NULL,NULL,NULL),('57847417','Pablo','Mecoll','pmecoll250@gmail.com','Sixseven67','Activo','Administrador','manteca',NULL,'6d27b97e27d3a0d45c55c1de466c6f71.jpg');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
