/*
 * Panel de llamadas a la API (solo `bun run dev`).
 *
 * scripts/servidor-dev.mjs lo inyecta en cada página; en producción no existe.
 * Envuelve window.fetch y registra cada pedido a un .php: método, ruta, estado,
 * duración, cuerpo enviado y datos recibidos. El historial sobrevive a la
 * navegación entre páginas (sessionStorage de la pestaña).
 *
 * Contraseñas, códigos 2FA, tokens y secretos se muestran tapados.
 * Atajo: Alt+Shift+A abre y cierra el panel.
 */
(function () {
  'use strict';

  var CLAVE = 'nexus-dev-api';
  var MAXIMO = 150;
  var MAX_TEXTO = 20000;
  var SENSIBLE = /contrasena|password|clave|codigo|token|csrf|secreto|^uri$/i;

  var llamadas = cargar();
  var abierto = false;
  var filtro = '';
  var expandida = null;
  var siguienteId = llamadas.reduce(function (max, l) {
    return Math.max(max, l.id);
  }, 0);

  function cargar() {
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE) || '[]');
    } catch (error) {
      return [];
    }
  }

  function guardar() {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(llamadas.slice(-MAXIMO)));
    } catch (error) {
      // Cuota llena: se descartan las más viejas.
      llamadas = llamadas.slice(-Math.floor(MAXIMO / 2));
    }
  }

  function tapar(valor) {
    if (Array.isArray(valor)) {
      return valor.map(tapar);
    }
    if (valor && typeof valor === 'object') {
      var copia = {};
      Object.keys(valor).forEach(function (clave) {
        copia[clave] = SENSIBLE.test(clave) && valor[clave] ? '••••••' : tapar(valor[clave]);
      });
      return copia;
    }
    return valor;
  }

  function leerCuerpo(cuerpo) {
    if (cuerpo == null) {
      return null;
    }
    try {
      if (typeof cuerpo === 'string') {
        return tapar(JSON.parse(cuerpo));
      }
    } catch (error) {
      return cuerpo.slice(0, MAX_TEXTO);
    }
    if (cuerpo instanceof URLSearchParams || cuerpo instanceof FormData) {
      var objeto = {};
      cuerpo.forEach(function (valor, clave) {
        objeto[clave] = typeof valor === 'string' ? valor : '[archivo ' + (valor.name || '') + ']';
      });
      return tapar(objeto);
    }
    return '[' + Object.prototype.toString.call(cuerpo) + ']';
  }

  function resumen(respuesta) {
    if (!respuesta || typeof respuesta !== 'object') {
      return '';
    }
    var datos = respuesta.data;
    if (Array.isArray(datos)) {
      return datos.length + (datos.length === 1 ? ' elemento' : ' elementos');
    }
    if (datos && typeof datos === 'object') {
      return Object.keys(datos).length + ' campos';
    }
    return respuesta.message || '';
  }

  /* ---------- Captura ---------- */
  var fetchOriginal = window.fetch.bind(window);
  window.fetch = function (entrada, opciones) {
    opciones = opciones || {};
    var url;
    try {
      url = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.href);
    } catch (error) {
      return fetchOriginal(entrada, opciones);
    }
    if (!/\.php$/i.test(url.pathname)) {
      return fetchOriginal(entrada, opciones);
    }

    siguienteId += 1;
    var registro = {
      id: siguienteId,
      hora: Date.now(),
      metodo: String(opciones.method || (entrada && entrada.method) || 'GET').toUpperCase(),
      ruta: url.pathname,
      query: url.search,
      pagina: location.pathname.split('/').pop() || '/',
      estado: null,
      ms: null,
      pedido: leerCuerpo(opciones.body),
      respuesta: null,
      bytes: 0,
    };
    llamadas.push(registro);
    guardar();
    dibujar();

    var inicio = performance.now();
    return fetchOriginal(entrada, opciones).then(
      function (respuesta) {
        registro.estado = respuesta.status;
        registro.ms = Math.round(performance.now() - inicio);
        respuesta
          .clone()
          .text()
          .then(function (texto) {
            registro.bytes = texto.length;
            try {
              registro.respuesta = tapar(JSON.parse(texto));
            } catch (error) {
              registro.respuesta = texto.slice(0, MAX_TEXTO);
            }
            guardar();
            dibujar();
          })
          .catch(function () {});
        guardar();
        dibujar();
        return respuesta;
      },
      function (error) {
        registro.estado = 'red';
        registro.ms = Math.round(performance.now() - inicio);
        registro.respuesta = String(error && error.message);
        guardar();
        dibujar();
        throw error;
      },
    );
  };

  /* ---------- Interfaz (shadow DOM: no hereda ni pisa global.css) ---------- */
  var anfitrion = document.createElement('div');
  anfitrion.id = 'nexus-dev-panel-api';
  var raiz = anfitrion.attachShadow({ mode: 'open' });
  raiz.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:"Host Grotesk",system-ui,sans-serif}' +
    '.boton{position:fixed;right:16px;bottom:16px;z-index:2147483646;display:flex;gap:8px;align-items:center;' +
    'height:36px;padding:0 14px;border:0;border-radius:999px;background:#5d12d2;color:#ffe5e5;font-size:13px;' +
    'font-weight:600;cursor:pointer;box-shadow:0 12px 32px -8px #5d12d266}' +
    '.boton:focus-visible,.panel button:focus-visible,.panel input:focus-visible{outline:none;box-shadow:0 0 0 2px #ffe5e5,0 0 0 4px #5d12d2}' +
    '.marca{font-family:"Space Grotesk",ui-monospace,monospace;letter-spacing:.08em;font-size:11px}' +
    '.panel{position:fixed;top:0;right:0;bottom:0;z-index:2147483647;width:min(560px,100vw);display:flex;' +
    'flex-direction:column;background:#ffffff;color:#1b0b3a;border-left:1px solid #e9bfd3;' +
    'box-shadow:0 4px 8px #1b0b3a14,0 20px 40px -8px #5d12d23d;font-size:13px}' +
    '.panel[hidden]{display:none}' +
    '.cabecera{display:flex;gap:8px;align-items:center;padding:12px 14px;border-bottom:1px solid #e9bfd3}' +
    '.cabecera strong{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:16px;margin-right:auto}' +
    '.cabecera input{flex:0 1 180px;height:32px;padding:0 10px;border:1px solid #8c809d;border-radius:6px;font-size:13px;color:#1b0b3a}' +
    '.cabecera button{height:32px;padding:0 12px;border:1px solid #8c809d;border-radius:12px;background:#fff;color:#1b0b3a;cursor:pointer;font-size:13px}' +
    '.lista{flex:1;overflow:auto;margin:0;padding:0;list-style:none}' +
    '.fila{border-bottom:1px solid #f6eaf0}' +
    '.fila>button{width:100%;display:grid;grid-template-columns:58px 1fr auto auto;gap:10px;align-items:center;' +
    'padding:9px 14px;border:0;background:none;color:inherit;text-align:left;cursor:pointer;font-size:13px}' +
    '.fila>button:hover{background:#f6eaf0}' +
    '.metodo{font-family:"Space Grotesk",ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.06em;' +
    'padding:2px 6px;border-radius:999px;background:#efe4ff;color:#5d12d2;text-align:center}' +
    '.ruta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ruta small{display:block;color:#5b4a73}' +
    '.estado{font-family:"Space Grotesk",ui-monospace,monospace;font-weight:600}' +
    '.ok{color:#0a6283}.aviso{color:#8a4b00}.error{color:#b3123b}.pendiente{color:#5b4a73}' +
    '.ms{font-family:"Space Grotesk",ui-monospace,monospace;color:#5b4a73;min-width:52px;text-align:right}' +
    '.detalle{padding:4px 14px 14px;display:grid;gap:10px}' +
    '.detalle h4{margin:6px 0 4px;font-size:12px;font-weight:600;color:#5b4a73}' +
    'pre{margin:0;max-height:320px;overflow:auto;padding:10px;border-radius:6px;background:#1b0b3a;color:#ffe5e5;' +
    'font:12px/1.5 "Space Grotesk",ui-monospace,monospace;white-space:pre-wrap;word-break:break-word}' +
    '.vacio{padding:32px 14px;color:#5b4a73;text-align:center}' +
    '</style>' +
    '<button class="boton" type="button" aria-expanded="false"><span class="marca">API</span><span class="cuenta">0</span></button>' +
    '<section class="panel" hidden aria-label="Llamadas a la API">' +
    '<div class="cabecera"><strong>Llamadas a la API</strong>' +
    '<input type="search" placeholder="Filtrar por ruta o estado" aria-label="Filtrar llamadas">' +
    '<button type="button" data-accion="limpiar">Limpiar</button>' +
    '<button type="button" data-accion="cerrar" aria-label="Cerrar panel">Cerrar</button></div>' +
    '<ul class="lista"></ul></section>';

  var boton = raiz.querySelector('.boton');
  var panel = raiz.querySelector('.panel');
  var lista = raiz.querySelector('.lista');
  var cuenta = raiz.querySelector('.cuenta');

  function claseEstado(estado) {
    if (estado == null) return 'pendiente';
    if (estado === 'red' || estado >= 500) return 'error';
    if (estado >= 400) return 'aviso';
    return 'ok';
  }

  function json(valor) {
    if (valor == null) return '(sin cuerpo)';
    var texto = typeof valor === 'string' ? valor : JSON.stringify(valor, null, 2);
    return texto.length > MAX_TEXTO ? texto.slice(0, MAX_TEXTO) + '\n… (recortado)' : texto;
  }

  function nodo(etiqueta, clase, texto) {
    var elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto != null) elemento.textContent = texto;
    return elemento;
  }

  function dibujar() {
    if (!document.body) return;
    var errores = llamadas.filter(function (l) {
      return claseEstado(l.estado) === 'error' || claseEstado(l.estado) === 'aviso';
    }).length;
    cuenta.textContent = llamadas.length + (errores ? ' · ' + errores + ' con error' : '');
    if (!abierto) return;

    lista.textContent = '';
    var visibles = llamadas
      .filter(function (l) {
        if (!filtro) return true;
        return (l.metodo + ' ' + l.ruta + l.query + ' ' + l.estado + ' ' + l.pagina)
          .toLowerCase()
          .includes(filtro);
      })
      .toReversed();

    if (visibles.length === 0) {
      lista.appendChild(
        nodo('li', 'vacio', 'Todavía no hay llamadas. Navegá el portal y aparecen acá.'),
      );
      return;
    }

    visibles.forEach(function (llamada) {
      var fila = nodo('li', 'fila');
      var cabeza = nodo('button');
      cabeza.type = 'button';
      cabeza.setAttribute('aria-expanded', String(expandida === llamada.id));
      cabeza.appendChild(nodo('span', 'metodo', llamada.metodo));
      var ruta = nodo('span', 'ruta', llamada.ruta.replace(/^.*\/(api\/)?/, '$1') + llamada.query);
      ruta.appendChild(
        nodo(
          'small',
          null,
          new Date(llamada.hora).toLocaleTimeString() +
            ' en ' +
            llamada.pagina +
            (llamada.respuesta ? ' · ' + resumen(llamada.respuesta) : ''),
        ),
      );
      cabeza.appendChild(ruta);
      cabeza.appendChild(
        nodo(
          'span',
          'estado ' + claseEstado(llamada.estado),
          llamada.estado == null ? '…' : String(llamada.estado),
        ),
      );
      cabeza.appendChild(nodo('span', 'ms', llamada.ms == null ? '' : llamada.ms + ' ms'));
      cabeza.addEventListener('click', function () {
        expandida = expandida === llamada.id ? null : llamada.id;
        dibujar();
      });
      fila.appendChild(cabeza);

      if (expandida === llamada.id) {
        var detalle = nodo('div', 'detalle');
        var envio = nodo('div');
        envio.appendChild(nodo('h4', null, 'Enviado'));
        envio.appendChild(nodo('pre', null, json(llamada.pedido)));
        var recibido = nodo('div');
        recibido.appendChild(
          nodo('h4', null, 'Recibido (' + (llamada.bytes / 1024).toFixed(1) + ' KB)'),
        );
        recibido.appendChild(nodo('pre', null, json(llamada.respuesta)));
        detalle.appendChild(envio);
        detalle.appendChild(recibido);
        fila.appendChild(detalle);
      }
      lista.appendChild(fila);
    });
  }

  function alternar(forzar) {
    abierto = typeof forzar === 'boolean' ? forzar : !abierto;
    panel.hidden = !abierto;
    boton.setAttribute('aria-expanded', String(abierto));
    dibujar();
  }

  boton.addEventListener('click', function () {
    alternar();
  });
  raiz.querySelector('input').addEventListener('input', function (evento) {
    filtro = evento.target.value.trim().toLowerCase();
    dibujar();
  });
  raiz.querySelector('[data-accion="limpiar"]').addEventListener('click', function () {
    llamadas = [];
    expandida = null;
    guardar();
    dibujar();
  });
  raiz.querySelector('[data-accion="cerrar"]').addEventListener('click', function () {
    alternar(false);
  });
  document.addEventListener('keydown', function (evento) {
    if (evento.altKey && evento.shiftKey && evento.code === 'KeyA') {
      alternar();
    }
    if (evento.key === 'Escape' && abierto) {
      alternar(false);
    }
  });

  function montar() {
    document.body.appendChild(anfitrion);
    dibujar();
  }
  if (document.body) {
    montar();
  } else {
    document.addEventListener('DOMContentLoaded', montar);
  }
})();
