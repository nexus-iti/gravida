/*
 * Router central de NEXUS.
 *
 * Cada página declara un único <script src="../js/router.js?v=..."> y este
 * archivo carga, en orden y de forma síncrona, los módulos que necesita la
 * ruta actual. La ruta se infiere del nombre del archivo (/pages/home.html o
 * /pages/home), por lo que no hace falta configurar nada en el HTML.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) {
    return;
  }

  var url = new URL(script.src);
  // router.js vive en <raíz>/js/, así que subir un nivel da la raíz de la app.
  var base = new URL('../', url).href;
  var version = url.searchParams.get('v') || '';
  var sufijoVersion = version ? '?v=' + encodeURIComponent(version) : '';

  // La usan api.js (endpoints) y los componentes (fotos de perfil).
  window.NEXUS_BASE = base;

  var COMUN = [
    'shared/datos.js',
    'shared/vendor/i18next-26.5.3.min.js',
    'shared/traducciones.js',
    'shared/ui.js',
    'shared/api.js',
    'shared/portal.js',
    'features/usuarios/usuarios.js',
    'shared/sesion.js',
  ];

  var BASES = {
    // Páginas públicas sin cabecera ni sesión (recuperar acceso).
    publica: [
      'shared/vendor/i18next-26.5.3.min.js',
      'shared/traducciones.js',
      'shared/ui.js',
      'shared/api.js',
    ],
    // Páginas internas que no usan la cabecera completa. Incluyen app.js para que
    // el tema y el idioma guardados se apliquen igual que en el resto del portal.
    interna: COMUN.concat(['shared/componentes.js', 'app.js']),
    // Portal con cabecera, navegación y arranque de tema/idioma.
    completa: COMUN.concat(['shared/componentes.js', 'app.js']),
    ninguna: [],
  };

  var RUTAS = {
    // Acceso
    index: { base: 'completa', modulos: [] },
    login: { base: 'completa', modulos: ['paginas/login.js'] },
    register: { base: 'completa', modulos: [] },
    recuperar: { base: 'publica', modulos: ['paginas/recuperar.js'] },

    // Cuenta y seguridad
    home: { base: 'completa', modulos: ['features/planilla/tareas-planilla.js'] },
    cuenta: {
      base: 'completa',
      modulos: [
        'features/operaciones/operaciones.js',
        'features/seguridad-cuenta/seguridad-cuenta.js',
        'paginas/cuenta.js',
      ],
    },
    administracion: { base: 'interna', modulos: [] },
    'cambiar-contrasena': { base: 'interna', modulos: [] },
    'solicitar-rol': { base: 'interna', modulos: [] },

    // Inventario
    inventario: { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    secciones: { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    'seccion-detalle': { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    'equipo-detalle': { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    equipos: { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    historial: { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    imagenes: { base: 'completa', modulos: ['features/inventario/inventario.js'] },
    vacios: { base: 'completa', modulos: ['features/inventario/inventario.js'] },

    // Operaciones
    prestamos: {
      base: 'completa',
      modulos: [
        'features/inventario/inventario.js',
        'features/operaciones/operaciones.js',
        'features/operaciones/selector-recursos.js',
      ],
    },
    solicitudes: {
      base: 'completa',
      modulos: ['features/inventario/inventario.js', 'features/operaciones/operaciones.js'],
    },
    soporte: {
      base: 'completa',
      modulos: ['features/inventario/inventario.js', 'features/operaciones/operaciones.js'],
    },
    'planilla-ta': { base: 'completa', modulos: ['features/planilla/tareas-planilla.js'] },

    // Herramienta de desarrollo: no carga módulos.
    'test-api': { base: 'ninguna', modulos: [] },
  };

  var partesRuta = window.location.pathname.replace(/\/+$/, '').split('/');
  var ultimoSegmento = partesRuta.pop() || '';
  var nombreRuta = (ultimoSegmento === '' || ultimoSegmento === 'pages' ? 'index' : ultimoSegmento)
    .replace(/\.html?$/i, '')
    .toLowerCase();
  var ruta = RUTAS[nombreRuta] || { base: 'completa', modulos: [] };
  var modulos = (BASES[ruta.base] || []).concat(ruta.modulos || []);

  /*
   * document.write mantiene el orden de ejecución de los scripts clásicos:
   * los módulos se cargan antes de los <script> en línea que vienen después
   * de este archivo. Sin esto, el HTML tendría que repetir la lista completa
   * de scripts en cada página.
   */
  for (var i = 0; i < modulos.length; i++) {
    document.write('<script src="' + base + 'js/' + modulos[i] + sufijoVersion + '"></script>');
  }
})();
