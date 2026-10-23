/* =============================================================
   movimiento.js
   -------------------------------------------------------------
   Animaciones del portal con Motion (https://motion.dev), siguiendo
   la guía de movimiento de Apple:

   - Todo es un resorte con física, nunca una curva arbitraria ni una
     duración lineal. Se usa siempre el preset "smooth" (bounce 0):
     arranca con velocidad, frena de forma continua y llega sin pasarse.
   - Se mide por duración percibida (visualDuration), como SwiftUI.
   - Las animaciones se pueden interrumpir: una nueva parte del valor
     actual del elemento, sin saltos.
   - Cada animación comunica algo (aparece, se va, llegó contenido,
     está cargando). Nada se mueve solo para decorar.
   - Con "reducir movimiento" activado todo pasa al estado final sin
     animar.

   Las mismas curvas existen en CSS (--curva-suave, --curva-rapida),
   generadas desde estos resortes por scripts/generar-movimiento.mjs, y
   las usan hover, foco y presión. Si se cambia una duración acá, hay
   que cambiarla también allá y correr `bun run movimiento`.
   ============================================================= */

const RESORTES = {
  // Paneles, diálogos y contenido que llega (SwiftUI .smooth).
  suave: { visualDuration: 0.5, bounce: 0 },
  // Menús, salidas y respuestas a una acción directa.
  rapida: { visualDuration: 0.3, bounce: 0 },
};

const ESPERA_INDICADOR_MS = 350;

function movimientoReducido() {
  return Boolean(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

function resorte(nombre) {
  return Object.assign({ type: window.Motion.spring }, RESORTES[nombre] || RESORTES.suave);
}

/* Anima con un resorte y devuelve una promesa que se cumple al terminar.
   Sin Motion o con movimiento reducido aplica el estado final al instante. */
function animarConResorte(elemento, valores, nombreResorte) {
  if (!elemento) {
    return Promise.resolve();
  }
  if (!window.Motion || movimientoReducido()) {
    Object.keys(valores).forEach((propiedad) => {
      const valor = valores[propiedad];
      elemento.style[propiedad] = Array.isArray(valor) ? valor[valor.length - 1] : valor;
    });
    return Promise.resolve();
  }
  try {
    return Promise.resolve(window.Motion.animate(elemento, valores, resorte(nombreResorte))).catch(
      () => {},
    );
  } catch (error) {
    return Promise.resolve();
  }
}

/* ---------- Diálogos ---------- */
const DIALOGO_OCULTO = 'translateY(12px) scale(0.96)';
const DIALOGO_VISIBLE = 'translateY(0px) scale(1)';

function animarAperturaModal(modal) {
  const dialogo = modal.querySelector('.dialogo');
  // Si se estaba cerrando, sigue desde donde está en lugar de reiniciar.
  const veniaCerrando = modal.dataset.estadoModal === 'cerrando';
  modal.dataset.estadoModal = 'abierto';
  animarConResorte(modal, { opacity: veniaCerrando ? 1 : [0, 1] }, 'rapida');
  if (dialogo) {
    animarConResorte(
      dialogo,
      {
        opacity: veniaCerrando ? 1 : [0, 1],
        transform: veniaCerrando ? DIALOGO_VISIBLE : [DIALOGO_OCULTO, DIALOGO_VISIBLE],
      },
      'suave',
    );
  }
}

/* Devuelve una promesa: quien llama oculta el modal recién cuando terminó y
   solo si nadie lo volvió a abrir mientras tanto. */
function animarCierreModal(modal) {
  const dialogo = modal.querySelector('.dialogo');
  modal.dataset.estadoModal = 'cerrando';
  return Promise.all([
    animarConResorte(modal, { opacity: 0 }, 'rapida'),
    dialogo
      ? animarConResorte(
          dialogo,
          { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
          'rapida',
        )
      : Promise.resolve(),
  ]).then(() => modal.dataset.estadoModal === 'cerrando');
}

/* ---------- Menús y desplegables (solo al abrir: cerrar es inmediato) ---------- */
function animarDesplegable(elemento) {
  animarConResorte(
    elemento,
    { opacity: [0, 1], transform: ['translateY(-6px) scale(0.98)', 'translateY(0px) scale(1)'] },
    'rapida',
  );
}

/* ---------- Llegada de contenido (reemplaza al esqueleto) ---------- */
function animarLlegadaDeContenido(contenedor) {
  if (!contenedor || !window.Motion || movimientoReducido()) {
    return;
  }
  // Solo los primeros elementos: el resto ya está fuera de la vista.
  const hijos = Array.from(contenedor.children).slice(0, 8);
  if (hijos.length === 0) {
    return;
  }
  window.Motion.animate(
    hijos,
    { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] },
    Object.assign(resorte('suave'), { delay: window.Motion.stagger(0.04) }),
  );
}

/* ---------- Estado de carga ----------
   api.js avisa cuándo empieza y termina cada pedido. Con eso:
   - <html data-carga="lista"> apaga los esqueletos cuando no queda nada en
     curso (aunque la lista haya quedado vacía o haya fallado);
   - si la espera supera ESPERA_INDICADOR_MS aparece el indicador global
     (en esperas cortas un indicador solo distrae);
   - el botón que envió un formulario muestra el cargador mientras tanto. */
let pedidosEnCurso = 0;
let temporizadorIndicador = null;
let temporizadorListo = null;
let botonPendiente = null;
let momentoEnvio = 0;
const botonesOcupados = new Set();

document.addEventListener(
  'submit',
  (evento) => {
    botonPendiente =
      evento.submitter || (evento.target && evento.target.querySelector('[type="submit"]'));
    momentoEnvio = Date.now();
  },
  true,
);

function iniciarCargaDeDatos() {
  pedidosEnCurso += 1;
  window.clearTimeout(temporizadorListo);
  document.documentElement.removeAttribute('data-carga');

  if (botonPendiente && Date.now() - momentoEnvio < 400) {
    marcarBotonOcupado(botonPendiente);
  }
  botonPendiente = null;

  if (pedidosEnCurso === 1) {
    temporizadorIndicador = window.setTimeout(mostrarIndicadorDeCarga, ESPERA_INDICADOR_MS);
  }
}

function terminarCargaDeDatos() {
  pedidosEnCurso = Math.max(0, pedidosEnCurso - 1);
  if (pedidosEnCurso > 0) {
    return;
  }
  window.clearTimeout(temporizadorIndicador);
  ocultarIndicadorDeCarga();
  botonesOcupados.forEach(liberarBoton);
  botonesOcupados.clear();
  // Pequeña espera: una página suele encadenar pedidos (sesión -> datos).
  temporizadorListo = window.setTimeout(() => {
    if (pedidosEnCurso === 0) {
      document.documentElement.setAttribute('data-carga', 'lista');
    }
  }, 150);
}

function crearCargadorAcordeon(opciones) {
  const columnas = (opciones && opciones.columnas) || 12;
  const anunciar = !opciones || opciones.anunciar !== false;
  const etiqueta = (opciones && opciones.etiqueta) || t('Cargando');
  return (
    '<span class="cargador-acordeon"' +
    (anunciar ? ' role="status"' : ' aria-hidden="true"') +
    ' style="--columnas:' +
    columnas +
    '">' +
    '<span class="cargador-acordeon__pista" aria-hidden="true">' +
    '░'.repeat(columnas) +
    '</span>' +
    '<span class="cargador-acordeon__bloque" aria-hidden="true">█</span>' +
    '<span class="cargador-acordeon__bloque" aria-hidden="true">▓</span>' +
    '<span class="cargador-acordeon__bloque" aria-hidden="true">▒</span>' +
    (anunciar ? '<span class="sr-only">' + etiqueta + '</span>' : '') +
    '</span>'
  );
}

function obtenerIndicadorDeCarga() {
  let indicador = document.getElementById('indicador-carga');
  if (!indicador && document.body) {
    indicador = document.createElement('div');
    indicador.id = 'indicador-carga';
    indicador.className = 'indicador-carga';
    indicador.setAttribute('role', 'status');
    indicador.hidden = true;
    indicador.innerHTML =
      crearCargadorAcordeon({ columnas: 10, anunciar: false }) +
      '<span>' +
      t('Cargando') +
      '</span>';
    document.body.appendChild(indicador);
  }
  return indicador;
}

function mostrarIndicadorDeCarga() {
  const indicador = obtenerIndicadorDeCarga();
  if (!indicador || pedidosEnCurso === 0) {
    return;
  }
  const yaVisible = !indicador.hidden;
  indicador.hidden = false;
  indicador.dataset.estado = 'visible';
  animarConResorte(
    indicador,
    {
      opacity: yaVisible ? 1 : [0, 1],
      transform: yaVisible
        ? 'translate(-50%, 0px)'
        : ['translate(-50%, -12px)', 'translate(-50%, 0px)'],
    },
    'suave',
  );
}

function ocultarIndicadorDeCarga() {
  const indicador = document.getElementById('indicador-carga');
  if (!indicador || indicador.hidden) {
    return;
  }
  indicador.dataset.estado = 'saliendo';
  animarConResorte(indicador, { opacity: 0, transform: 'translate(-50%, -8px)' }, 'rapida').then(
    () => {
      if (indicador.dataset.estado === 'saliendo') {
        indicador.hidden = true;
      }
    },
  );
}

function marcarBotonOcupado(boton) {
  if (!boton || botonesOcupados.has(boton)) {
    return;
  }
  botonesOcupados.add(boton);
  boton.setAttribute('aria-busy', 'true');
  boton.classList.add('boton--cargando');
  const capa = document.createElement('span');
  capa.className = 'boton__cargador';
  capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = crearCargadorAcordeon({ columnas: 8, anunciar: false });
  boton.appendChild(capa);
}

function liberarBoton(boton) {
  boton.removeAttribute('aria-busy');
  boton.classList.remove('boton--cargando');
  const capa = boton.querySelector('.boton__cargador');
  if (capa) {
    capa.remove();
  }
}
