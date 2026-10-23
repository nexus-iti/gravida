/*
 * Selector de recursos para préstamos.
 *
 * - No muestra equipos hasta que se elige una categoría.
 * - Dentro de la categoría acumula los equipos iguales (mismo nombre base y marca): "7 PC" es una
 *   sola tarjeta con un selector de cantidad, no siete.
 * - No expone dónde está cada equipo ni su detalle: quien pide un préstamo solo necesita saber qué
 *   hay y cuántos puede pedir.
 * - Conserva la selección (y la categoría) en sessionStorage, de modo que recargar la página no la pierde.
 */

const CLAVE_SELECCION_PRESTAMO = 'nexus.prestamo.seleccion';

// Un solo juego de listeners por contenedor aunque la página vuelva a pintar el selector.
const controladoresSelectorRecursos = new WeakMap();
// Modelos (equipos acumulados) del último pintado de cada contenedor.
const modelosSelectorRecursos = new WeakMap();

function normalizarTipoRecurso(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b([a-z0-9]{3,})s\b/g, '$1')
    .trim();
}

function claveSeleccionPrestamo() {
  const usuario = typeof obtenerUsuarioActual === 'function' ? obtenerUsuarioActual() : null;
  return CLAVE_SELECCION_PRESTAMO + ':' + (usuario && usuario.cedula ? usuario.cedula : '');
}

function leerSeleccionPrestamo() {
  const vacia = { items: {}, categoria: '' };
  try {
    const guardada = JSON.parse(window.sessionStorage.getItem(claveSeleccionPrestamo()) || 'null');
    if (!guardada || typeof guardada !== 'object') {
      return vacia;
    }
    return {
      items: guardada.items && typeof guardada.items === 'object' ? guardada.items : {},
      categoria: String(guardada.categoria || ''),
    };
  } catch (error) {
    return vacia;
  }
}

function guardarSeleccionPrestamo(seleccion) {
  try {
    window.sessionStorage.setItem(claveSeleccionPrestamo(), JSON.stringify(seleccion));
  } catch (error) {
    /* sin almacenamiento: la selección sigue funcionando en la página */
  }
}

function limpiarSeleccionGuardadaPrestamo() {
  try {
    window.sessionStorage.removeItem(claveSeleccionPrestamo());
  } catch (error) {
    /* sin almacenamiento */
  }
}

function equipoEstaDisponibleParaPrestamo(equipo) {
  return equipo.estado === 'Activo' && Number(equipo.cantidadDisponible) >= 1;
}

/* Devuelve [{ clave, etiqueta, categoria, equipos }] ordenado por etiqueta. */
function agruparEquiposPorTipo(equipos, categoriasCatalogo) {
  const nombresCatalogo = {};
  (categoriasCatalogo || []).forEach(function (nombre) {
    nombresCatalogo[normalizarTipoRecurso(nombre)] = nombre;
  });
  const grupos = {};
  equipos.forEach(function (equipo) {
    const clave = normalizarTipoRecurso(equipo.tipo);
    if (!grupos[clave]) {
      const etiqueta = nombresCatalogo[clave] || equipo.tipoEtiqueta || equipo.tipo || '';
      grupos[clave] = { clave: clave, etiqueta: etiqueta, categoria: etiqueta, equipos: [] };
    }
    grupos[clave].equipos.push(equipo);
  });
  return Object.keys(grupos)
    .map(function (clave) {
      grupos[clave].equipos = grupos[clave].equipos.toSorted(function (a, b) {
        return String(a.nombre).localeCompare(String(b.nombre));
      });
      return grupos[clave];
    })
    .toSorted(function (a, b) {
      return a.etiqueta.localeCompare(b.etiqueta);
    });
}

/* "PC 12" y "PC 3" son el mismo equipo: se descarta el número final. */
function nombreBaseRecurso(nombre) {
  const texto = String(nombre || '').trim();
  const base = texto.replace(/[\s\-_#]*\d+$/, '').trim();
  return base || texto;
}

/*
 * Acumula los equipos disponibles de una categoría en modelos:
 * [{ clave, categoria, nombre, marca, equipos, disponibles }] ordenado por nombre.
 * `disponibles` suma las unidades libres de todos los registros del modelo.
 */
function agruparEquiposPorModelo(equipos) {
  const modelos = {};
  equipos.filter(equipoEstaDisponibleParaPrestamo).forEach(function (equipo) {
    const categoria = normalizarTipoRecurso(equipo.tipo);
    const nombre = nombreBaseRecurso(equipo.nombre);
    const marca = String(equipo.marca || '').trim();
    const clave = [categoria, normalizarTipoRecurso(nombre), normalizarTipoRecurso(marca)].join(
      '|',
    );
    if (!modelos[clave]) {
      modelos[clave] = {
        clave: clave,
        categoria: categoria,
        nombre: nombre,
        marca: marca,
        equipos: [],
        disponibles: 0,
      };
    }
    modelos[clave].equipos.push(equipo);
    modelos[clave].disponibles += Number(equipo.cantidadDisponible);
  });
  return Object.keys(modelos)
    .map(function (clave) {
      modelos[clave].equipos = modelos[clave].equipos.toSorted(function (a, b) {
        return Number(a.id) - Number(b.id);
      });
      return modelos[clave];
    })
    .toSorted(function (a, b) {
      return a.nombre.localeCompare(b.nombre) || a.marca.localeCompare(b.marca);
    });
}

function crearHtmlModeloPrestamo(modelo) {
  const etiqueta = modelo.nombre + (modelo.marca ? ' · ' + modelo.marca : '');
  const detalle =
    escaparHtml(modelo.disponibles) +
    ' ' +
    escaparHtml(modelo.disponibles === 1 ? t('disponible') : t('disponibles'));
  return (
    '<div class="loan-model" data-loan-model="' +
    escaparHtml(modelo.clave) +
    '">' +
    '<div class="loan-model__info">' +
    '<span class="loan-model__name">' +
    escaparHtml(modelo.nombre) +
    '</span>' +
    (modelo.marca
      ? '<span class="loan-model__brand">' + escaparHtml(modelo.marca) + '</span>'
      : '') +
    '<span class="loan-model__available">' +
    detalle +
    '</span></div>' +
    '<div class="loan-stepper" role="group" aria-label="' +
    escaparHtml(t('Cantidad de') + ' ' + etiqueta) +
    '">' +
    '<button type="button" class="loan-stepper__button" data-loan-step="-1" aria-label="' +
    escaparHtml(t('Quitar uno') + ': ' + etiqueta) +
    '">−</button>' +
    '<input class="loan-stepper__input" type="number" inputmode="numeric" min="0" max="' +
    escaparHtml(modelo.disponibles) +
    '" value="0" data-loan-quantity data-loan-model-key="' +
    escaparHtml(modelo.clave) +
    '" aria-label="' +
    escaparHtml(t('Cantidad de') + ' ' + etiqueta) +
    '" />' +
    '<button type="button" class="loan-stepper__button" data-loan-step="1" aria-label="' +
    escaparHtml(t('Agregar uno') + ': ' + etiqueta) +
    '">+</button>' +
    '</div></div>'
  );
}

function crearHtmlSelectorRecursos(grupos, modelos) {
  if (grupos.length === 0) {
    return '<div class="empty-inline">' + escaparHtml(t('No hay equipos disponibles.')) + '</div>';
  }
  let html =
    '<div class="empty-inline" data-loan-placeholder>' +
    escaparHtml(t('Elegí una categoría para ver los equipos disponibles.')) +
    '</div>';
  grupos.forEach(function (grupo) {
    html +=
      '<div class="loan-group" role="group" data-loan-group="' +
      escaparHtml(grupo.clave) +
      '" aria-label="' +
      escaparHtml(grupo.etiqueta) +
      '" hidden><div class="loan-model-list">';
    modelos
      .filter(function (modelo) {
        return modelo.categoria === grupo.clave;
      })
      .forEach(function (modelo) {
        html += crearHtmlModeloPrestamo(modelo);
      });
    html += '</div></div>';
  });
  html +=
    '<div class="loan-summary" data-loan-summary-box hidden>' +
    '<span class="loan-summary__text" data-loan-summary aria-live="polite"></span>' +
    '<button type="button" class="boton boton--outline boton--sm" data-loan-clear>' +
    escaparHtml(t('Limpiar selección')) +
    '</button></div>';
  return html;
}

function limitarCantidadModelo(input) {
  const maximo = Number(input.max) || 0;
  const valor = Math.floor(Number(input.value));
  input.value = String(Number.isFinite(valor) ? Math.min(Math.max(valor, 0), maximo) : 0);
}

/* { claveModelo: cantidad } de los modelos con cantidad mayor a cero. */
function obtenerEstadoSelectorRecursos(contenedor, filtro) {
  const items = {};
  contenedor.querySelectorAll('[data-loan-quantity]').forEach(function (input) {
    const cantidad = Number(input.value);
    if (cantidad > 0) {
      items[input.dataset.loanModelKey] = cantidad;
    }
  });
  return { items: items, categoria: filtro.categoria };
}

function actualizarResumenSelectorRecursos(contenedor) {
  const caja = contenedor.querySelector('[data-loan-summary-box]');
  const resumen = contenedor.querySelector('[data-loan-summary]');
  if (!caja || !resumen) {
    return;
  }
  const modelos = modelosSelectorRecursos.get(contenedor) || [];
  const partes = [];
  contenedor.querySelectorAll('[data-loan-quantity]').forEach(function (input) {
    const cantidad = Number(input.value);
    const modelo = modelos.find(function (item) {
      return item.clave === input.dataset.loanModelKey;
    });
    if (cantidad > 0 && modelo) {
      partes.push(modelo.nombre + (modelo.marca ? ' ' + modelo.marca : '') + ' × ' + cantidad);
    }
  });
  caja.hidden = partes.length === 0;
  resumen.textContent = partes.length === 0 ? '' : t('Seleccionado') + ': ' + partes.join(' · ');
}

/*
 * Pinta el selector dentro de `contenedor` y lo deja funcionando.
 * opciones: { equipos, categorias (nombres del catálogo) }
 * Devuelve { aplicarCategoria(categoria), limpiar(), categoriaGuardada }.
 */
function iniciarSelectorRecursos(contenedor, opciones) {
  const anterior = controladoresSelectorRecursos.get(contenedor);
  if (anterior) {
    anterior.abort();
  }
  const controlador = new AbortController();
  controladoresSelectorRecursos.set(contenedor, controlador);
  const disponibles = opciones.equipos.filter(equipoEstaDisponibleParaPrestamo);
  const grupos = agruparEquiposPorTipo(disponibles, opciones.categorias);
  const modelos = agruparEquiposPorModelo(disponibles);
  modelos.forEach(function (modelo) {
    const grupo = grupos.find(function (item) {
      return item.clave === modelo.categoria;
    });
    modelo.categoriaEtiqueta = grupo ? grupo.etiqueta : '';
  });
  modelosSelectorRecursos.set(contenedor, modelos);
  const guardada = leerSeleccionPrestamo();
  const categoriaValida = grupos.some(function (grupo) {
    return grupo.clave === guardada.categoria;
  });
  const filtro = { categoria: categoriaValida ? guardada.categoria : '' };
  contenedor.innerHTML = crearHtmlSelectorRecursos(grupos, modelos);

  const persistir = function () {
    guardarSeleccionPrestamo(obtenerEstadoSelectorRecursos(contenedor, filtro));
    actualizarResumenSelectorRecursos(contenedor);
  };

  const aplicarFiltro = function () {
    const aviso = contenedor.querySelector('[data-loan-placeholder]');
    if (aviso) {
      aviso.hidden = filtro.categoria !== '';
    }
    contenedor.querySelectorAll('[data-loan-group]').forEach(function (grupo) {
      grupo.hidden = filtro.categoria === '' || grupo.dataset.loanGroup !== filtro.categoria;
    });
    actualizarResumenSelectorRecursos(contenedor);
  };

  // Restaura la selección guardada (ignora modelos que ya no están disponibles).
  Object.keys(guardada.items).forEach(function (claveModelo) {
    const input = Array.from(contenedor.querySelectorAll('[data-loan-quantity]')).find(
      function (candidato) {
        return candidato.dataset.loanModelKey === claveModelo;
      },
    );
    if (input) {
      input.value = String(guardada.items[claveModelo]);
      limitarCantidadModelo(input);
    }
  });
  aplicarFiltro();
  persistir();

  contenedor.addEventListener(
    'input',
    function (evento) {
      if (evento.target.matches('[data-loan-quantity]')) {
        persistir();
      }
    },
    { signal: controlador.signal },
  );

  contenedor.addEventListener(
    'change',
    function (evento) {
      if (evento.target.matches('[data-loan-quantity]')) {
        limitarCantidadModelo(evento.target);
        persistir();
      }
    },
    { signal: controlador.signal },
  );

  contenedor.addEventListener(
    'click',
    function (evento) {
      const paso = evento.target.closest('[data-loan-step]');
      if (paso) {
        const input = paso.closest('.loan-stepper').querySelector('[data-loan-quantity]');
        input.value = String((Number(input.value) || 0) + Number(paso.dataset.loanStep));
        limitarCantidadModelo(input);
        persistir();
      } else if (evento.target.closest('[data-loan-clear]')) {
        contenedor.querySelectorAll('[data-loan-quantity]').forEach(function (input) {
          input.value = '0';
        });
        persistir();
      }
    },
    { signal: controlador.signal },
  );

  return {
    categoriaGuardada: filtro.categoria,
    aplicarCategoria: function (categoria) {
      filtro.categoria = categoria;
      aplicarFiltro();
      persistir();
    },
    limpiar: function () {
      limpiarSeleccionGuardadaPrestamo();
      contenedor.querySelectorAll('[data-loan-quantity]').forEach(function (input) {
        input.value = '0';
      });
      filtro.categoria = '';
      aplicarFiltro();
    },
  };
}

/*
 * Recursos pedidos, validados: reparte cada cantidad entre los registros del modelo (cada registro
 * puede tener varias unidades libres) y devuelve [{ idEquipo, nombre, cantidad, categoria }].
 */
function obtenerRecursosSeleccionadosPrestamo(contenedor) {
  const modelos = modelosSelectorRecursos.get(contenedor) || [];
  const recursos = [];
  let total = 0;
  const falla = function (mensaje) {
    return { ok: false, mensaje: mensaje, recursos: [], total: 0 };
  };
  const entradas = Array.from(contenedor.querySelectorAll('[data-loan-quantity]')).filter(
    function (input) {
      return Number(input.value) > 0;
    },
  );
  if (entradas.length === 0) {
    return falla('Elegí al menos un equipo e indicá la cantidad.');
  }
  for (let i = 0; i < entradas.length; i++) {
    const cantidad = Number(entradas[i].value);
    const modelo = modelos.find(function (item) {
      return item.clave === entradas[i].dataset.loanModelKey;
    });
    if (!Number.isInteger(cantidad) || !modelo || cantidad > modelo.disponibles) {
      return falla('La cantidad solicitada debe corresponder a equipos disponibles.');
    }
    let pendiente = cantidad;
    for (let j = 0; j < modelo.equipos.length && pendiente > 0; j++) {
      const equipo = modelo.equipos[j];
      const tomar = Math.min(pendiente, Number(equipo.cantidadDisponible));
      const idEquipo = Number(equipo.id);
      if (!Number.isInteger(idEquipo) || idEquipo < 1) {
        return falla('La cantidad solicitada debe corresponder a equipos disponibles.');
      }
      recursos.push({
        idEquipo: idEquipo,
        nombre: equipo.nombre,
        cantidad: tomar,
        categoria: modelo.categoriaEtiqueta,
      });
      pendiente -= tomar;
    }
    total += cantidad;
  }
  return { ok: true, mensaje: '', recursos: recursos, total: total };
}
