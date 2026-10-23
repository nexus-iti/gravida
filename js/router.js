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
  // Recursos que se cargan después (respaldo de íconos) usan la misma versión.
  window.NEXUS_SUFIJO_VERSION = sufijoVersion;

  vigilarHojasDeEstilo();

  var COMUN = [
    'shared/datos.js',
    'shared/vendor/lucide-iconos.min.js',
    'shared/vendor/motion-13.5.1.min.js',
    'shared/vendor/i18next-26.5.3.min.js',
    'shared/traducciones.js',
    'shared/movimiento.js',
    'shared/ui.js',
    'shared/api.js',
    'shared/portal.js',
    'features/usuarios/usuarios.js',
    'shared/sesion.js',
  ];

  var BASES = {
    // Páginas públicas sin cabecera ni sesión (recuperar acceso).
    publica: [
      'shared/vendor/motion-13.5.1.min.js',
      'shared/vendor/i18next-26.5.3.min.js',
      'shared/traducciones.js',
      'shared/movimiento.js',
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

  /*
   * Hojas de estilo.
   *
   * global.css va en el <head> como hoja bloqueante y marcada con
   * data-css-critico. Un <script> clásico no corre hasta que las hojas previas
   * terminan de cargar o fallan, así que acá ya se puede saber si llegó.
   *
   * No alcanza con mirar `link.sheet`: Chromium crea una hoja vacía aunque el
   * servidor responda 503. Por eso la última regla de global.css define
   * --css-global-completo: 1, y solo si esa variable existe la hoja llegó
   * entera (también detecta respuestas cortadas o una página de error con 200).
   *
   * Si falla se reintenta dos veces evitando la caché; si sigue fallando se
   * muestra un aviso con "Reintentar" y se vuelve a probar sola cuando vuelve
   * la conexión.
   *
   * Las fuentes se cargan diferidas (rel=preload + onload) y su error se maneja
   * en el propio <link>: la página sigue con las fuentes del sistema.
   */
  function vigilarHojasDeEstilo() {
    var criticas = document.querySelectorAll('link[rel="stylesheet"][data-css-critico]');
    if (criticas.length > 0 && !cssGlobalCompleto()) {
      reintentarHoja(criticas[criticas.length - 1], 1);
    }
  }

  function cssGlobalCompleto() {
    return (
      window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--css-global-completo')
        .trim() === '1'
    );
  }

  function reintentarHoja(enlace, intento) {
    var href = enlace.getAttribute('href') || '';
    var limpio = href.replace(/([?&])reintento=\d+&?/, '$1').replace(/[?&]$/, '');
    var nuevo = document.createElement('link');
    nuevo.rel = 'stylesheet';
    nuevo.setAttribute('data-css-critico', '');
    nuevo.href = limpio + (limpio.indexOf('?') === -1 ? '?' : '&') + 'reintento=' + Date.now();
    var resuelto = false;

    function alCargar() {
      // Un 5xx puede disparar load igual: solo vale si llegó la hoja completa.
      if (!cssGlobalCompleto()) {
        alFallar();
        return;
      }
      resuelto = true;
      if (enlace.parentNode) {
        enlace.parentNode.removeChild(enlace);
      }
      document.documentElement.classList.remove('css-no-disponible');
      quitarAvisoCss();
    }

    function alFallar() {
      if (resuelto) {
        return;
      }
      resuelto = true;
      if (nuevo.parentNode) {
        nuevo.parentNode.removeChild(nuevo);
      }
      if (intento < 2) {
        window.setTimeout(function () {
          reintentarHoja(enlace, intento + 1);
        }, 1200);
        return;
      }
      document.documentElement.classList.add('css-no-disponible');
      mostrarAvisoCss(enlace);
    }

    nuevo.addEventListener('load', alCargar);
    nuevo.addEventListener('error', alFallar);
    enlace.parentNode.insertBefore(nuevo, enlace.nextSibling);
  }

  // El aviso lleva estilos en línea porque justamente falta la hoja global.
  function mostrarAvisoCss(enlace) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function () {
        mostrarAvisoCss(enlace);
      });
      return;
    }
    if (document.getElementById('aviso-css-no-disponible')) {
      return;
    }
    var aviso = document.createElement('div');
    aviso.id = 'aviso-css-no-disponible';
    aviso.setAttribute('role', 'alert');
    aviso.style.cssText =
      'position:sticky;top:0;z-index:2147483647;display:flex;gap:12px;align-items:center;' +
      'justify-content:center;flex-wrap:wrap;padding:10px 16px;font:14px/1.4 system-ui,sans-serif;' +
      'background:#fde4ea;color:#b3123b;border-bottom:1px solid #b3123b;';
    var texto = document.createElement('span');
    texto.textContent = 'No se pudieron cargar los estilos del portal. Revisá tu conexión.';
    var boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = 'Reintentar';
    boton.style.cssText =
      'font:inherit;padding:4px 12px;border-radius:12px;border:1px solid currentColor;' +
      'background:#fff;color:inherit;cursor:pointer;';
    boton.addEventListener('click', function () {
      reintentarHoja(enlace, 2);
    });
    aviso.appendChild(texto);
    aviso.appendChild(boton);
    document.body.insertBefore(aviso, document.body.firstChild);
    window.addEventListener(
      'online',
      function () {
        reintentarHoja(enlace, 2);
      },
      { once: true },
    );
  }

  function quitarAvisoCss() {
    var aviso = document.getElementById('aviso-css-no-disponible');
    if (aviso && aviso.parentNode) {
      aviso.parentNode.removeChild(aviso);
    }
  }

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
