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
<script src="../js/router.js?v=<hash>"></script>
```

`js/router.js` infiere la ruta desde el nombre del archivo y carga en orden los
módulos que corresponden: base compartida + feature(s) + controlador de página.
Para agregar una página nueva:

1. Crear `pages/<ruta>.html` con el tag del router.
2. Registrar `<ruta>` en la tabla `RUTAS` de `js/router.js` con su base y sus
   módulos.

También se aceptan URLs limpias (`/pages/home`), resueltas por `.htaccess`.

## Carga y caché de assets

- **Versionado por contenido.** El `?v=` de `global.css`, `fuentes.css` y
  `router.js` en cada página es un hash de todo `css/` y `js/`; `router.js` lo
  propaga a cada módulo que carga. Por eso Apache y nginx sirven CSS/JS
  versionados con `Cache-Control: immutable` por un año, y el HTML con
  `no-cache` (revalida y responde 304). **Después de tocar CSS o JS hay que
  correr `bun run build`**; la CI falla si un `?v=` quedó desactualizado.
- **Íconos.** `js/shared/vendor/lucide-iconos.min.js` trae solo los íconos que
  usa el portal (unos 12 KB en lugar de 358 KB). Si aparece uno nuevo sin
  regenerar, `ui.js` carga el paquete completo en segundo plano y avisa en la
  consola cuál falta.
- **Fuentes** (Bricolage Grotesque, Host Grotesk, Space Grotesk) servidas desde
  `css/fuentes/`, cargadas en diferido. Si fallan, la página sigue con las
  fuentes del sistema.
- **Errores de CSS.** Si `global.css` no llega completo (corte de red, 5xx),
  `router.js` lo reintenta dos veces sin caché y, si sigue fallando, muestra un
  aviso con "Reintentar" que también se dispara solo al volver la conexión.
  Lo detecta con la variable centinela `--css-global-completo`, que debe quedar
  como última regla de `global.css`.

## Movimiento y estados de carga

Las animaciones usan [Motion](https://motion.dev) (`js/shared/vendor/motion-*.min.js`,
subconjunto de 16 KB) desde `js/shared/movimiento.js`, con la guía de movimiento
de Apple:

- **Resortes, siempre "smooth"** (bounce 0, el preset `.smooth` de SwiftUI):
  `suave` (0.5 s percibidos) para lo que aparece y `rapida` (0.3 s) para
  respuestas a una acción. Nada usa curvas arbitrarias ni duraciones fijas.
- **Las mismas curvas en CSS.** `bun run movimiento` genera `--curva-suave`,
  `--curva-rapida` y sus duraciones desde esos resortes, y todas las
  `transition` del CSS las usan (hover, foco, presión).
- **Interrumpibles.** Reabrir un diálogo que se estaba cerrando sigue desde el
  estado actual, sin saltos.
- **Motivadas.** Se anima la entrada y salida de diálogos, la apertura de menús,
  la llegada del contenido que reemplaza al esqueleto y el fundido entre páginas
  (View Transitions). Nada más.
- **"Reducir movimiento"** del sistema operativo lo apaga todo: los estados
  cambian al instante. En Windows es *Configuración > Accesibilidad > Efectos
  visuales > Efectos de animación*.

Estados de carga:

- **Esqueletos.** Un contenedor con `data-esqueleto="filas|tarjetas|kanban"`
  muestra la forma del contenido mientras está vacío y hay pedidos en curso.
- **Cargador acordeón** (adaptado de
  [Loading UI](https://www.loading-ui.com/docs/components/accordion-loader), MIT):
  `crearCargadorAcordeon()` en JS o el marcado `.cargador-acordeon` en HTML.
  Aparece en el indicador global (solo si la espera supera 350 ms) y en el
  botón que envió un formulario mientras espera la respuesta.

## Desarrollo local con Bun

```bash
copy .env.example .env      # completar la base de datos y, si hace falta, PHP_BIN
copy config.example.php config.php
bun install
bun run dev                 # http://127.0.0.1:8080/pages/
```

`bun run dev` sirve el portal con los mismos encabezados de caché que producción
y reenvía los `.php` a un `php -S` interno (se reinicia solo si se cae). En este
modo:

- **No se pide 2FA en el login.** Solo aplica con el servidor integrado de PHP,
  `NEXUS_DEV=1` y pedidos desde la propia máquina (el servidor escucha en
  `127.0.0.1`); en Apache o php-fpm nunca se activa. Cada ingreso así queda
  registrado como `login_2fa_omitido_dev` en `seguridad_eventos`.
- **Panel de llamadas a la API** en cada página (botón "API" o `Alt+Shift+A`):
  método, ruta, estado, duración, datos enviados y recibidos. Contraseñas,
  códigos y tokens se muestran tapados. La terminal también lista cada llamada.

Otros scripts:

```bash
bun run build          # íconos + Motion y curvas + formato + versionado (antes de commitear CSS/JS)
bun run iconos         # solo el subconjunto de íconos
bun run movimiento     # solo Motion y las curvas de resorte
bun run assets:check   # lo que corre la CI
```

## Calidad de código

El proyecto usa [oxlint](https://oxc.rs/docs/guide/usage/linter) para lint y
[oxfmt](https://oxc.rs/docs/guide/usage/formatter) para formato.

```bash
bun install
bun run lint         # analiza js/
bun run lint:fix     # aplica correcciones seguras
bun run format       # formatea js/ y css/
bun run format:check # verifica sin modificar
```

- `.oxlintrc.json`: entorno de navegador, categorías `correctness` y
  `suspicious`, y `no-unused-vars` desactivado porque los archivos comparten
  funciones globales entre sí.
- `.oxfmtrc.json`: 100 columnas, 2 espacios, comillas simples y saltos de línea
  LF. Ignora `js/shared/vendor/`.
- `.editorconfig`: mantiene la misma configuración en el editor.

El formato cubre JavaScript y CSS. Las páginas HTML y el backend PHP quedan
fuera para no reescribir el marcado ni el código servidor.

## CI/CD

Cada push y cada PR corren `.github/workflows/ci.yml`: formato, lint, versionado de
assets, sintaxis PHP y validación del compose. Si algo falla, el merge queda bloqueado.

Cada push a `dev` deploya el entorno de prueba (`nexus.wefaber.net`) con
`.github/workflows/deploy.yml` en el runner self-hosted del VPS: build de imágenes
taggeadas con el commit, recreación de front y back, healthcheck real contra la base
de datos y rollback automático si no levanta. La db no se toca en un deploy.

```bash
bash deploy/nexus-deploy.sh status   # tag activo y healthcheck
bash deploy/nexus-deploy.sh rollback # volver al deploy anterior
```

Detalles y credenciales: `deploy/README.md`.

## Instalación

1. Clonar el repositorio NEXUS dentro de `htdocs`.

2. Importar únicamente `database.sql` desde phpMyAdmin. Este archivo contiene
   toda la estructura, relaciones, configuración y datos necesarios para dejar
   la base en el estado actual del sistema.

   La carpeta `database old` conserva las migraciones históricas como referencia.
   No deben ejecutarse después de `database.sql`.

3. Copiar la configuración de ejemplo y completar `.env` (base de datos):

   ```bash
   copy .env.example .env
   copy config.example.php config.php
   ```

   `config.php` no guarda credenciales: lee `DB_HOST`, `DB_PORT`, `DB_NAME`,
   `DB_USER` y `DB_PASSWORD` del entorno o de `.env`. Ninguno de los dos se
   versiona, y el `.htaccess` bloquea su descarga.

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
