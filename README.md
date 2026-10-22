# NEXUS — 3ra entrega

Sistema de Gestión de Recursos y Servicios de Informática del ITI CEPT. Permite pedir recursos, coordinar servicios, atender soporte, mantener inventario y organizar el trabajo técnico-administrativo.

## Requisitos

- XAMPP (Apache + PHP + MySQL/MariaDB)
- PHP 8.0 o superior
- MySQL o MariaDB

## Estructura del proyecto

El código se organiza por features (vertical slices). Cada feature concentra su
dominio, sus casos de uso y su infraestructura; el frontend sigue el mismo
criterio.

```text
nexus-codigo/
├── api/                        # Endpoints HTTP (adaptadores finos)
├── css/global.css              # Estilos compartidos
├── docs/                       # Documentación técnica y de pruebas
├── js/
│   ├── features/               # Módulos por funcionalidad
│   ├── paginas/                # Controladores de página
│   ├── shared/                 # API, sesión, UI, datos y vendor compartidos
│   ├── app.js                  # Arranque del portal
│   └── router.js               # Router: ruta -> módulos a cargar
├── pages/                      # Páginas HTML (una ruta por archivo)
├── seguridad/                  # Bootstrap, hardening y scripts de seguridad
├── src/
│   ├── Features/<Feature>/
│   │   ├── Application/        # Casos de uso
│   │   ├── Domain/             # Entidades, puertos y reglas
│   │   └── Infrastructure/     # Repositorios PDO y adaptadores
│   ├── Shared/
│   │   ├── Domain/ValueObject/ # Cedula, Rol
│   │   ├── Security/           # Contrato PasswordHasher
│   │   └── DomainException.php
│   └── autoload.php            # Autoload PSR-4 para el prefijo Nexus\
├── uploads/                    # Fotos de perfil (contenido no versionado)
├── index.html                  # Redirección a pages/
└── login.php                   # Endpoint de inicio de sesión
```

Features del backend: `Administracion`, `Incidencia`, `Inventario`, `Perfil`,
`Prestamo`, `Recuperacion`, `Seguridad`, `Servicio`, `SolicitudRegistro`,
`SolicitudRol`, `Trabajo` y `Usuario`. Los nombres van en PascalCase porque
deben coincidir con los namespaces de PHP (`Nexus\Features\<Feature>\...`).

## Routing de páginas

Las páginas viven en `pages/` y no repiten la lista de scripts. Cada una
incluye un único cargador:

```html
<script src="../js/router.js?v=5.0.0"></script>
```

`js/router.js` infiere la ruta desde el nombre del archivo y carga en orden los
módulos que corresponden: base compartida + feature(s) + controlador de página.
Para agregar una página nueva:

1. Crear `pages/<ruta>.html` con el tag del router.
2. Registrar `<ruta>` en la tabla `RUTAS` de `js/router.js` con su base y sus
   módulos.

También se aceptan URLs limpias (`/pages/home`), resueltas por `.htaccess`.

## Calidad de código

El proyecto usa [oxlint](https://oxc.rs/docs/guide/usage/linter) para lint y
[oxfmt](https://oxc.rs/docs/guide/usage/formatter) para formato.

```bash
npm install
npm run lint         # analiza js/
npm run lint:fix     # aplica correcciones seguras
npm run format       # formatea js/ y css/
npm run format:check # verifica sin modificar
```

- `.oxlintrc.json`: entorno de navegador, categorías `correctness` y
  `suspicious`, y `no-unused-vars` desactivado porque los archivos comparten
  funciones globales entre sí.
- `.oxfmtrc.json`: 100 columnas, 2 espacios, comillas simples y saltos de línea
  LF. Ignora `js/shared/vendor/`.
- `.editorconfig`: mantiene la misma configuración en el editor.

El formato cubre JavaScript y CSS. Las páginas HTML y el backend PHP quedan
fuera para no reescribir el marcado ni el código servidor.

## Instalación

1. Clonar el repositorio NEXUS dentro de `htdocs`.

2. Importar únicamente `database.sql` desde phpMyAdmin. Este archivo contiene
   toda la estructura, relaciones, configuración y datos necesarios para dejar
   la base en el estado actual del sistema.

   La carpeta `database old` conserva las migraciones históricas como referencia.
   No deben ejecutarse después de `database.sql`.

3. Copiar la configuración de ejemplo:

   ```bash
   copy config.example.php config.php
   ```

4. Iniciar Apache y MySQL.

5. Abrir `http://localhost/proyecto%203ra%20entrega/`.

## Seguridad y API en la versión 4.0

- Sesiones PHP estrictas con cookie `HttpOnly`, `SameSite=Strict`, rotación y vencimiento.
- Segundo factor TOTP obligatorio para administradores y opcional para otros roles.
- Bloqueo de fuerza bruta, límites de solicitudes y auditoría de eventos.
- Cierre de otras sesiones, historial de accesos y cambio seguro de contraseña.
- Recodificación de fotos y protección web de archivos sensibles.
- Autorización por rol aplicada en el servidor.
- Protección CSRF en las operaciones autenticadas que modifican datos.
- Contrato JSON uniforme: `status`, `message` y `data`.
- Compatibilidad temporal con PUT y PATCH para actualizaciones.
- Restricción explícita de métodos mediante `405 Method Not Allowed` y `Allow`.
- Contraseñas nuevas almacenadas con `password_hash`.
- Migración automática de credenciales antiguas a hash después de un login válido.
- Filtrado de incidencias, préstamos y servicios en el servidor según el usuario autenticado.
- Cierre de sesión real mediante `api/logout.php`.

Las funciones de la versión 3.0 se conservan. Los detalles, decisiones y límites del merge están en `docs/INTEGRACION_CIBERSEGURIDAD_4_0.md` y `docs/SEGURIDAD_4_0.md`.

## Alcance funcional heredado de la versión 2.0

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
