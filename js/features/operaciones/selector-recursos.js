/*
 * Selector de recursos para préstamos.
 *
 * - Agrupa los equipos por tipo y permite marcar cada equipo por separado, un
 *   grupo completo o todos los disponibles a la vez.
 * - Muestra las características de cada equipo sin salir de la selección.
 * - Conserva la selección (y el filtro) en sessionStorage, de modo que ir al
 *   detalle de un equipo y volver no la pierde.
 */

const CLAVE_SELECCION_PRESTAMO = 'nexus.prestamo.seleccion';

// Un solo juego de listeners por contenedor aunque la página vuelva a pintar el selector.
const controladoresSelectorRecursos = new WeakMap();

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
  const vacia = { items: {}, categoria: '', busqueda: '' };
  try {
    const guardada = JSON.parse(window.sessionStorage.getItem(claveSeleccionPrestamo()) || 'null');
    if (!guardada || typeof guardada !== 'object') {
      return vacia;
    }
    return {
      items: guardada.items && typeof guardada.items === 'object' ? guardada.items : {},
      categoria: String(guardada.categoria || ''),
      busqueda: String(guardada.busqueda || ''),
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

function crearHtmlCaracteristicasRecurso(equipo) {
  const filas = [
    ['Tipo', equipo.tipoEtiqueta || equipo.tipo],
    ['Sección', equipo.seccion],
    ['Marca', equipo.marca],
    ['Observaciones', equipo.observaciones],
    ['Estado', equipo.estado],
    ['Alta', equipo.fechaAlta ? formatearFechaHumana(equipo.fechaAlta) : ''],
  ];
  let html = '';
  filas.forEach(function (fila) {
    if (fila[1]) {
      html +=
        '<dt>' + escaparHtml(t(fila[0])) + '</dt><dd>' + escaparHtml(String(fila[1])) + '</dd>';
    }
  });
  return html;
}

function crearHtmlRecursoPrestamo(equipo, categoria) {
  const id = 'prestamo-recurso-' + equipo.id;
  const disponible = Number(equipo.cantidadDisponible);
  const total = Number(equipo.cantidad);
  const reservado = Math.max(total - disponible, 0);
  const habilitado = equipoEstaDisponibleParaPrestamo(equipo);
  const resumen =
    escaparHtml(t('Total')) +
    ': ' +
    escaparHtml(total) +
    ' · ' +
    escaparHtml(t('Reservados')) +
    ': ' +
    escaparHtml(reservado) +
    (habilitado ? ' · ' + escaparHtml(t('Disponibles')) + ': ' + escaparHtml(disponible) : '');
  const busqueda = normalizarTipoRecurso(
    [equipo.nombre, equipo.marca, equipo.observaciones, equipo.seccion].join(' '),
  );
  return (
    '<div class="loan-resource-option' +
    (habilitado ? '' : ' loan-resource-option--unavailable') +
    '" data-loan-option data-loan-search="' +
    escaparHtml(busqueda) +
    '">' +
    '<div class="loan-resource-option__main">' +
    '<label class="loan-resource-option__check" for="' +
    id +
    '">' +
    '<input id="' +
    id +
    '" type="checkbox" value="' +
    escaparHtml(equipo.nombre) +
    '" data-equipo-id="' +
    escaparHtml(equipo.id) +
    '" data-loan-categoria="' +
    escaparHtml(categoria) +
    '" data-loan-resource' +
    (habilitado ? '' : ' disabled') +
    ' /> <span>' +
    escaparHtml(equipo.nombre) +
    '</span></label>' +
    '<span class="loan-resource-option__meta">' +
    escaparHtml(equipo.seccion || '') +
    (equipo.observaciones ? ' · ' + escaparHtml(equipo.observaciones) : '') +
    '</span>' +
    '<details class="loan-resource-option__details"><summary>' +
    escaparHtml(t('Características')) +
    '</summary><dl>' +
    crearHtmlCaracteristicasRecurso(equipo) +
    '</dl></details>' +
    '<a class="loan-resource-option__link" href="equipo-detalle.html?id=' +
    encodeURIComponent(equipo.id) +
    '">' +
    escaparHtml(t('Ver detalle')) +
    '</a></div>' +
    '<label class="loan-resource-option__qty"><span>' +
    resumen +
    '</span>' +
    (habilitado
      ? '<input class="text-input" type="number" min="1" max="' +
        escaparHtml(disponible) +
        '" placeholder="0" disabled data-loan-quantity aria-label="' +
        escaparHtml(t('Cantidad de') + ' ' + equipo.nombre) +
        '" />'
      : '<strong>' + escaparHtml(t('No hay equipos disponibles')) + '</strong>') +
    '</label></div>'
  );
}

function crearHtmlSelectorRecursos(grupos) {
  if (grupos.length === 0) {
    return '<div class="empty-inline">' + escaparHtml(t('No hay equipos disponibles.')) + '</div>';
  }
  let html =
    '<div class="loan-toolbar">' +
    '<input class="text-input" type="search" data-loan-search-input placeholder="' +
    escaparHtml(t('Buscar equipo por nombre, marca o sección')) +
    '" aria-label="' +
    escaparHtml(t('Buscar equipo por nombre, marca o sección')) +
    '" />' +
    '<button type="button" class="boton boton--outline boton--sm" data-loan-select-all>' +
    escaparHtml(t('Seleccionar todos los disponibles')) +
    '</button>' +
    '<button type="button" class="boton boton--outline boton--sm" data-loan-clear>' +
    escaparHtml(t('Limpiar selección')) +
    '</button>' +
    '<span class="loan-toolbar__summary" data-loan-summary aria-live="polite"></span>' +
    '</div>' +
    '<div class="loan-empty empty-inline" data-loan-empty hidden>' +
    escaparHtml(t('Ningún equipo coincide con la búsqueda.')) +
    '</div>';
  grupos.forEach(function (grupo) {
    const disponibles = grupo.equipos.filter(equipoEstaDisponibleParaPrestamo).length;
    html +=
      '<div class="loan-group" role="group" data-loan-group="' +
      escaparHtml(grupo.clave) +
      '" aria-label="' +
      escaparHtml(grupo.etiqueta) +
      '"><div class="loan-group__header">' +
      '<label class="loan-group__check"><input type="checkbox" data-loan-group-toggle' +
      (disponibles === 0 ? ' disabled' : '') +
      ' aria-label="' +
      escaparHtml(t('Seleccionar todo el grupo') + ': ' + grupo.etiqueta) +
      '" /> <span class="loan-group__title">' +
      escaparHtml(grupo.etiqueta) +
      '</span></label>' +
      '<span class="loan-group__count">' +
      escaparHtml(disponibles + ' / ' + grupo.equipos.length + ' ' + t('disponibles')) +
      '</span></div><div class="loan-resource-picker">';
    grupo.equipos.forEach(function (equipo) {
      html += crearHtmlRecursoPrestamo(equipo, grupo.categoria);
    });
    html += '</div></div>';
  });
  return html;
}

function obtenerOpcionesSelectorRecursos(contenedor) {
  return Array.from(contenedor.querySelectorAll('[data-loan-option]'));
}

function obtenerEstadoSelectorRecursos(contenedor, filtro) {
  const items = {};
  contenedor.querySelectorAll('[data-loan-resource]:checked').forEach(function (casilla) {
    const cantidad = casilla.closest('[data-loan-option]').querySelector('[data-loan-quantity]');
    items[casilla.dataset.equipoId] = cantidad ? cantidad.value : '1';
  });
  return { items: items, categoria: filtro.categoria, busqueda: filtro.busqueda };
}

function actualizarResumenSelectorRecursos(contenedor) {
  const resumen = contenedor.querySelector('[data-loan-summary]');
  contenedor.querySelectorAll('[data-loan-group]').forEach(function (grupo) {
    const casillas = Array.from(
      grupo.querySelectorAll('[data-loan-resource]:not(:disabled)'),
    ).filter(function (casilla) {
      return !casilla.closest('[data-loan-option]').hidden;
    });
    const marcadas = casillas.filter(function (casilla) {
      return casilla.checked;
    }).length;
    const alternador = grupo.querySelector('[data-loan-group-toggle]');
    if (alternador && !alternador.disabled) {
      alternador.checked = casillas.length > 0 && marcadas === casillas.length;
      alternador.indeterminate = marcadas > 0 && marcadas < casillas.length;
    }
  });
  if (!resumen) {
    return;
  }
  let equipos = 0;
  let unidades = 0;
  contenedor.querySelectorAll('[data-loan-resource]:checked').forEach(function (casilla) {
    equipos++;
    const cantidad = casilla.closest('[data-loan-option]').querySelector('[data-loan-quantity]');
    unidades += Number(cantidad && cantidad.value) || 0;
  });
  resumen.textContent =
    equipos === 0 ? '' : t('Seleccionados: ' + equipos + ' · Unidades: ' + unidades);
}

function marcarRecursoPrestamo(casilla, marcado, cantidad) {
  const cantidadInput = casilla.closest('[data-loan-option]').querySelector('[data-loan-quantity]');
  casilla.checked = marcado;
  if (!cantidadInput) {
    return;
  }
  cantidadInput.disabled = !marcado;
  if (!marcado) {
    cantidadInput.value = '';
  } else if (cantidad) {
    const maximo = Number(cantidadInput.max) || 1;
    cantidadInput.value = String(Math.min(Math.max(Number(cantidad) || 1, 1), maximo));
  } else if (!cantidadInput.value) {
    cantidadInput.value = '1';
  }
}

/*
 * Pinta el selector dentro de `contenedor` y lo deja funcionando.
 * opciones: { equipos, categorias (nombres del catálogo), alCambiarFiltro(categoria) }
 * Devuelve { aplicarCategoria(categoria), limpiar(), categoriaGuardada }.
 */
function iniciarSelectorRecursos(contenedor, opciones) {
  const anterior = controladoresSelectorRecursos.get(contenedor);
  if (anterior) {
    anterior.abort();
  }
  const controlador = new AbortController();
  controladoresSelectorRecursos.set(contenedor, controlador);
  const grupos = agruparEquiposPorTipo(opciones.equipos, opciones.categorias);
  const guardada = leerSeleccionPrestamo();
  const filtro = { categoria: guardada.categoria, busqueda: guardada.busqueda };
  contenedor.innerHTML = crearHtmlSelectorRecursos(grupos);

  const buscador = contenedor.querySelector('[data-loan-search-input]');
  if (buscador) {
    buscador.value = filtro.busqueda;
  }

  const persistir = function () {
    guardarSeleccionPrestamo(obtenerEstadoSelectorRecursos(contenedor, filtro));
    actualizarResumenSelectorRecursos(contenedor);
  };

  const aplicarFiltro = function () {
    const termino = normalizarTipoRecurso(filtro.busqueda);
    let visibles = 0;
    contenedor.querySelectorAll('[data-loan-group]').forEach(function (grupo) {
      const coincideCategoria = !filtro.categoria || grupo.dataset.loanGroup === filtro.categoria;
      let visiblesGrupo = 0;
      grupo.querySelectorAll('[data-loan-option]').forEach(function (opcion) {
        const oculta =
          !coincideCategoria || (termino !== '' && !opcion.dataset.loanSearch.includes(termino));
        opcion.hidden = oculta;
        if (!oculta) {
          visiblesGrupo++;
        }
      });
      grupo.hidden = visiblesGrupo === 0;
      visibles += visiblesGrupo;
    });
    const vacio = contenedor.querySelector('[data-loan-empty]');
    if (vacio) {
      vacio.hidden = visibles > 0;
    }
    actualizarResumenSelectorRecursos(contenedor);
  };

  // Restaura la selección guardada (ignora equipos que ya no están disponibles).
  Object.keys(guardada.items).forEach(function (idEquipo) {
    const casilla = contenedor.querySelector(
      '[data-loan-resource][data-equipo-id="' + idEquipo + '"]',
    );
    if (casilla && !casilla.disabled) {
      marcarRecursoPrestamo(casilla, true, guardada.items[idEquipo]);
    }
  });
  aplicarFiltro();
  persistir();

  contenedor.addEventListener(
    'change',
    function (evento) {
      const casilla = evento.target.closest('[data-loan-resource]');
      const grupoToggle = evento.target.closest('[data-loan-group-toggle]');
      if (casilla) {
        marcarRecursoPrestamo(casilla, casilla.checked);
      } else if (grupoToggle) {
        grupoToggle
          .closest('[data-loan-group]')
          .querySelectorAll('[data-loan-resource]:not(:disabled)')
          .forEach(function (item) {
            if (!item.closest('[data-loan-option]').hidden) {
              marcarRecursoPrestamo(item, grupoToggle.checked);
            }
          });
      } else if (!evento.target.closest('[data-loan-quantity]')) {
        return;
      }
      persistir();
    },
    { signal: controlador.signal },
  );

  contenedor.addEventListener(
    'input',
    function (evento) {
      if (evento.target.matches('[data-loan-search-input]')) {
        filtro.busqueda = evento.target.value;
        aplicarFiltro();
        persistir();
      } else if (evento.target.matches('[data-loan-quantity]')) {
        persistir();
      }
    },
    { signal: controlador.signal },
  );

  contenedor.addEventListener(
    'click',
    function (evento) {
      if (evento.target.closest('[data-loan-select-all]')) {
        contenedor.querySelectorAll('[data-loan-resource]:not(:disabled)').forEach(function (item) {
          if (!item.closest('[data-loan-option]').hidden) {
            marcarRecursoPrestamo(item, true);
          }
        });
        persistir();
      } else if (evento.target.closest('[data-loan-clear]')) {
        contenedor.querySelectorAll('[data-loan-resource]:checked').forEach(function (item) {
          marcarRecursoPrestamo(item, false);
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
      contenedor.querySelectorAll('[data-loan-resource]:checked').forEach(function (item) {
        marcarRecursoPrestamo(item, false);
      });
      filtro.busqueda = '';
      if (buscador) {
        buscador.value = '';
      }
      aplicarFiltro();
    },
  };
}

/* Equipos marcados, con la cantidad pedida y su categoría, validados. */
function obtenerRecursosSeleccionadosPrestamo(contenedor) {
  const seleccionados = contenedor.querySelectorAll('[data-loan-resource]:checked');
  const recursos = [];
  let total = 0;
  if (seleccionados.length === 0) {
    return {
      ok: false,
      mensaje: 'Elegi al menos un recurso e indica la cantidad.',
      recursos: [],
      total: 0,
    };
  }
  for (let i = 0; i < seleccionados.length; i++) {
    const inputCantidad = seleccionados[i]
      .closest('[data-loan-option]')
      .querySelector('[data-loan-quantity]');
    const cantidad = Number(inputCantidad.value);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return {
        ok: false,
        mensaje: 'Revisa las cantidades: cada recurso seleccionado necesita un numero valido.',
        recursos: [],
        total: 0,
      };
    }
    const idEquipo = Number(seleccionados[i].dataset.equipoId);
    if (!Number.isInteger(idEquipo) || idEquipo < 1 || cantidad > Number(inputCantidad.max)) {
      return {
        ok: false,
        mensaje: 'La cantidad solicitada debe corresponder a un equipo disponible.',
        recursos: [],
        total: 0,
      };
    }
    recursos.push({
      idEquipo: idEquipo,
      nombre: seleccionados[i].value,
      cantidad: cantidad,
      categoria: seleccionados[i].dataset.loanCategoria || '',
    });
    total += cantidad;
  }
  return { ok: true, mensaje: '', recursos: recursos, total: total };
}
