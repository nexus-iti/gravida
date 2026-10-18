# SGRSI — 2da entrega 2.0

Sistema de Gestión de Recursos y Servicios de Informática del ITI CEPT. Permite pedir recursos, coordinar servicios, atender soporte, mantener inventario y organizar el trabajo técnico-administrativo.

## Requisitos

- XAMPP (Apache + PHP + MySQL/MariaDB)
- PHP 8.0 o superior
- MySQL o MariaDB

## Instalación

1. Clonar el repositorio NEXUS dentro de `htdocs`.

2. Para una instalación nueva, importar primero `database.sql` y después
   `migration_2_0.sql`, ambos desde phpMyAdmin.

   Si ya existe la base de la segunda entrega, conservarla e importar solamente
   `migration_2_0.sql`. La migración es repetible: comprueba la existencia de
   columnas antes de agregarlas.

3. Copiar la configuración de ejemplo:

   ```bash
   copy config.example.php config.php
   ```

4. Iniciar Apache y MySQL.

5. Abrir `http://localhost/NEXUS/proyecto%202da%20entrega%202.0/`.

## Alcance de la versión 2.0

- Bajas lógicas de cuentas, tickets, servicios y préstamos.
- Edición completa de equipos, secciones y diagnósticos.
- Catálogos administrables de categorías tecnológicas, categorías de préstamo
  y servicios disponibles.
- Solicitud y aprobación administrativa de cambios de rol.
- Reportes de error persistentes para técnicos y administradores.
- Recuperación de contraseña mediante ticket: el personal puede tomar,
  resolver o rechazar la solicitud; la clave temporal se entrega una sola vez
  y obliga a cambiarla al iniciar sesión.
- Configuración administrativa limitada al plazo máximo de préstamo y a la
  habilitación de nuevos registros.

Las funciones de blacklist y planillas de clase están excluidas deliberadamente
de esta versión. La planilla operativa de técnicos que ya formaba parte del
sistema original se conserva sin ampliaciones.
