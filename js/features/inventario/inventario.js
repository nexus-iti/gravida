/* Archivo extraído de app.js durante la modularización. */

function normalizarTipoEquipoInventario(tipo) {
  return String(tipo || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Los tipos vienen del catálogo de categorías ("Monitor", "All in one"): se
// comparan sin distinguir mayúsculas ni tildes, con el valor o con la etiqueta.
function buscarTipoEquipoInventario(tipo) {
  const buscado = normalizarTipoEquipoInventario(tipo);
  if (!buscado) {
    return null;
  }
  for (let i = 0; i < tiposDeEquipoInventario.length; i++) {
    const candidato = tiposDeEquipoInventario[i];
    if (
      normalizarTipoEquipoInventario(candidato.valor) === buscado ||
      normalizarTipoEquipoInventario(candidato.etiqueta) === buscado
    ) {
      return candidato;
    }
  }
  return null;
}

// Solo para obtener un ícono: un tipo desconocido usa el primero de la lista.
function obtenerTipoEquipoInventario(tipo) {
  return buscarTipoEquipoInventario(tipo) || tiposDeEquipoInventario[0];
}

function obtenerIconoEquipoInventario(tipo) {
  return obtenerTipoEquipoInventario(tipo).icono;
}

// Un tipo que no está en la lista fija se muestra tal cual; antes caía en "Televisor".
function obtenerEtiquetaTipoEquipoInventario(tipo) {
  const conocido = buscarTipoEquipoInventario(tipo);
  if (conocido) {
    return conocido.etiqueta;
  }
  return String(tipo || '').trim() || 'Otro';
}

async function obtenerSeccionesInventario() {
  return solicitarApi('api/ubicaciones.php');
}

async function obtenerSeccionInventarioPorId(seccionId) {
  const seccionesGuardadas = await obtenerSeccionesInventario();
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (seccionesGuardadas[i].id === seccionId) {
      return seccionesGuardadas[i];
    }
  }
  return null;
}

async function obtenerLugaresDisponibles() {
  const seccionesGuardadas = await obtenerSeccionesInventario();
  const lugares = [];
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    lugares.push(seccionesGuardadas[i].nombre);
  }
  return lugares;
}

function normalizarEquipoInventario(equipo) {
  const tipo = obtenerTipoEquipoInventario(equipo && equipo.tipo);
  const tipoReal = String(equipo && equipo.tipo ? equipo.tipo : tipo.valor).trim();
  return Object.assign({}, equipo, {
    tipo: tipoReal,
    tipoEtiqueta: equipo.tipoEtiqueta || tipoReal || tipo.etiqueta,
    icono: equipo.icono || tipo.icono,
    estado: equipo.estado || 'Activo',
    actualizado: equipo.actualizado || 'hoy',
  });
}

async function obtenerEquiposInventario() {
  const equiposGuardados = await solicitarApi('api/equipos.php');
  const equiposNormalizados = [];
  for (let i = 0; i < equiposGuardados.length; i++) {
    equiposNormalizados.push(normalizarEquipoInventario(equiposGuardados[i]));
  }
  return equiposNormalizados;
}

async function obtenerEquiposPorSeccionInventario(seccionId) {
  const equiposGuardados = await obtenerEquiposInventario();
  const equiposFiltrados = [];
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].seccionId === seccionId) {
      equiposFiltrados.push(equiposGuardados[i]);
    }
  }
  return equiposFiltrados;
}

async function obtenerEquipoInventarioPorId(equipoId) {
  const equiposGuardados = await obtenerEquiposInventario();
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].id === equipoId) {
      return equiposGuardados[i];
    }
  }
  return null;
}

async function obtenerHistorialInventario() {
  return solicitarApi('api/historial.php');
}

function obtenerImagenesInventario() {
  return leerStorage(CLAVES_STORAGE.imagenesInventario, imagenesDeSecciones);
}

async function guardarNuevaSeccionInventario(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para crear secciones.' };
  }
  const nombre = String(datos && datos.nombre ? datos.nombre : '').trim();
  if (!nombre) {
    return { ok: false, mensaje: 'Escribí un nombre para la sección.' };
  }
  const seccionesGuardadas = await obtenerSeccionesInventario();
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (normalizarTexto(seccionesGuardadas[i].nombre) === normalizarTexto(nombre)) {
      return { ok: false, mensaje: 'Ya existe una sección con ese nombre.' };
    }
  }
  const respuesta = await solicitarApi('api/ubicaciones.php', {
    method: 'POST',
    body: JSON.stringify({ nombre: nombre }),
  });
  const nuevaSeccion = {
    id: respuesta.id,
    nombre: nombre,
    icono: 'building-2',
    actualizado: 'hoy',
    cantidadEquipos: 0,
  };
  return { ok: true, mensaje: 'Sección creada. Ya aparece en inventario.', seccion: nuevaSeccion };
}

function crearModalBajaSeccionInventario(idModal) {
  return crearModal({
    id: idModal,
    titulo: 'Eliminar seccion',
    icono: 'trash-2',
    claseDialogo: 'dialogo--confirmacion-baja',
    cuerpo:
      '<p class="dialogo__confirm-title" data-baja-seccion-resumen>Confirmar eliminación de la sección</p>' +
      '<p class="dialogo__confirm-text" data-baja-seccion-texto>Se quitará del inventario.</p>' +
      '<div class="input-stack regla-diseno-025" data-baja-seccion-destino-wrap hidden>' +
      '<label for="baja-seccion-destino">Trasladar equipos a</label>' +
      '<select class="select-input regla-diseno-026" id="baja-seccion-destino" data-baja-seccion-destino></select>' +
      '</div>',
    pieDeModal:
      '<button class="boton boton--outline regla-diseno-005" type="button" data-cancel-delete-seccion>No, cancelar</button>' +
      '<button class="boton boton--outline-danger regla-diseno-005" type="button" data-confirm-delete-seccion>Si, eliminar</button>',
  });
}

function crearOpcionesDestinoBajaSeccion(secciones, seccionIdActual) {
  let opciones = '<option value="">Elegir sección destino</option>';
  let cantidad = 0;
  for (let i = 0; i < secciones.length; i++) {
    if (String(secciones[i].id) === String(seccionIdActual)) {
      continue;
    }
    opciones +=
      '<option value="' +
      escaparHtml(secciones[i].id) +
      '">' +
      escaparHtml(secciones[i].nombre) +
      '</option>';
    cantidad++;
  }
  if (cantidad === 0) {
    return '<option value="" disabled selected>No hay otra sección disponible</option>';
  }
  return opciones;
}

async function abrirModalBajaSeccionInventario(idModal, seccionId, nombreSeccion) {
  const modal = document.getElementById(idModal);
  if (!modal) {
    return;
  }
  const nombre = String(nombreSeccion || '').trim();
  modal.dataset.deleteSeccion = String(seccionId || '');
  modal.dataset.seccionNombre = nombre;
  const resumen = modal.querySelector('[data-baja-seccion-resumen]');
  if (resumen) {
    resumen.textContent = nombre
      ? 'De verdad querés eliminar la sección "' + nombre + '"?'
      : 'De verdad querés eliminar esta sección?';
  }
  abrirModal(idModal);
  const texto = modal.querySelector('[data-baja-seccion-texto]');
  const contenedorDestino = modal.querySelector('[data-baja-seccion-destino-wrap]');
  const selectDestino = modal.querySelector('[data-baja-seccion-destino]');
  const botonConfirmar = modal.querySelector('[data-confirm-delete-seccion]');
  if (texto) {
    texto.textContent = 'Revisando equipos asociados...';
  }
  if (contenedorDestino) {
    contenedorDestino.hidden = true;
  }
  if (selectDestino) {
    selectDestino.required = false;
    selectDestino.innerHTML = '<option value="">Cargando secciones...</option>';
    inicializarSelectsPersonalizados(selectDestino);
  }
  if (botonConfirmar) {
    botonConfirmar.disabled = true;
  }

  const datos = await Promise.all([
    obtenerSeccionesInventario(),
    obtenerEquiposPorSeccionInventario(String(seccionId || '')),
  ]);
  const secciones = datos[0];
  const equipos = datos[1];
  modal.dataset.equiposSeccion = String(equipos.length);
  if (equipos.length > 0) {
    if (texto) {
      texto.textContent =
        'Esta sección tiene ' +
        equipos.length +
        ' equipo' +
        (equipos.length === 1 ? '' : 's') +
        '. Antes de eliminarla, elegi a que seccion trasladarlos.';
    }
    if (contenedorDestino) {
      contenedorDestino.hidden = false;
    }
    if (selectDestino) {
      selectDestino.required = true;
      selectDestino.innerHTML = crearOpcionesDestinoBajaSeccion(secciones, seccionId);
      inicializarSelectsPersonalizados(selectDestino);
    }
    if (botonConfirmar) {
      botonConfirmar.disabled = true;
    }
    return;
  }
  if (texto) {
    texto.textContent = 'La sección no tiene equipos activos. Se quitará del inventario.';
  }
  if (botonConfirmar) {
    botonConfirmar.disabled = false;
  }
}

function obtenerSeccionBajaSeleccionada(idModal) {
  const modal = document.getElementById(idModal);
  if (!modal) {
    return { id: '', nombre: '' };
  }
  return {
    id: modal.dataset.deleteSeccion || '',
    nombre: modal.dataset.seccionNombre || '',
    destinoId: modal.querySelector('[data-baja-seccion-destino]')?.value || '',
    cantidadEquipos: Number(modal.dataset.equiposSeccion || 0),
  };
}

function limpiarModalBajaSeccionInventario(idModal) {
  const modal = document.getElementById(idModal);
  if (!modal) {
    return;
  }
  modal.dataset.deleteSeccion = '';
  modal.dataset.seccionNombre = '';
  modal.dataset.equiposSeccion = '';
  const contenedorDestino = modal.querySelector('[data-baja-seccion-destino-wrap]');
  if (contenedorDestino) {
    contenedorDestino.hidden = true;
  }
  const selectDestino = modal.querySelector('[data-baja-seccion-destino]');
  if (selectDestino) {
    selectDestino.required = false;
    selectDestino.innerHTML = '';
    inicializarSelectsPersonalizados(selectDestino);
  }
}

function cancelarBajaSeccionInventario(idModal) {
  cerrarModal(idModal);
  limpiarModalBajaSeccionInventario(idModal);
}

async function eliminarSeccionInventario(seccionId, seccionDestinoId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de baja secciones.' };
  }
  const seccionesGuardadas = await obtenerSeccionesInventario();
  let seccionEliminada = null;
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (seccionesGuardadas[i].id === seccionId) {
      seccionEliminada = seccionesGuardadas[i];
    }
  }
  if (!seccionEliminada) {
    return { ok: false, mensaje: 'No encontramos esa sección.' };
  }
  const equiposGuardados = await obtenerEquiposInventario();
  let equiposATrasladar = 0;
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].seccionId === seccionId) {
      equiposATrasladar++;
    }
  }
  let seccionDestino = null;
  if (equiposATrasladar > 0) {
    for (let i = 0; i < seccionesGuardadas.length; i++) {
      if (seccionesGuardadas[i].id === seccionDestinoId && seccionesGuardadas[i].id !== seccionId) {
        seccionDestino = seccionesGuardadas[i];
        break;
      }
    }
    if (!seccionDestino) {
      return {
        ok: false,
        mensaje: 'Elegí una sección destino para trasladar los equipos antes de eliminar.',
      };
    }
  }
  await solicitarApi('api/ubicaciones.php', {
    method: 'DELETE',
    body: JSON.stringify({ id: seccionId, seccionDestinoId: seccionDestinoId || '' }),
  });
  return {
    ok: true,
    mensaje:
      equiposATrasladar > 0
        ? 'Sección eliminada. Se trasladaron ' +
          equiposATrasladar +
          ' equipo' +
          (equiposATrasladar === 1 ? '' : 's') +
          ' a ' +
          seccionDestino.nombre +
          '.'
        : 'Sección eliminada. No tenía equipos activos asociados.',
    seccion: seccionEliminada,
  };
}

async function guardarNuevoEquipoInventario(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de alta equipos.' };
  }
  const tipoValor = String(datos && datos.tipo ? datos.tipo : '').trim();
  if (!tipoValor) {
    return { ok: false, mensaje: 'Elegí un tipo de equipo válido.' };
  }
  const tipo = obtenerTipoEquipoInventario(tipoValor);
  const seccion = await obtenerSeccionInventarioPorId(datos && datos.seccionId);
  if (!seccion) {
    return { ok: false, mensaje: 'Elegí una sección válida.' };
  }
  const nombre = String(datos && datos.nombre ? datos.nombre : '').trim() || tipo.etiqueta;
  const respuesta = await solicitarApi('api/equipos.php', {
    method: 'POST',
    body: JSON.stringify({
      nombre: nombre,
      tipo: tipoValor,
      seccionId: seccion.id,
      estado: 'Activo',
      marca: String(datos && datos.marca ? datos.marca : '').trim(),
      observaciones: String(datos && datos.observaciones ? datos.observaciones : '').trim(),
      cantidad: Number(datos && datos.cantidad) || 1,
    }),
  });
  const nuevoEquipo = {
    id: respuesta.id,
    nombre: nombre,
    tipo: tipoValor,
    tipoEtiqueta: tipoValor,
    icono: tipo.icono,
    seccionId: seccion.id,
    seccion: seccion.nombre,
    fechaAlta: fechaIsoLocal(new Date()),
    actualizado: 'hoy',
    estado: 'Activo',
    marca: String(datos && datos.marca ? datos.marca : '').trim(),
    observaciones: String(datos && datos.observaciones ? datos.observaciones : '').trim(),
  };
  return {
    ok: true,
    mensaje: 'Equipo dado de alta. Ya aparece en la sección.',
    equipo: nuevoEquipo,
  };
}

function crearModalBajaEquipoInventario(idModal) {
  return crearModal({
    id: idModal,
    titulo: 'Dar de baja equipo',
    icono: 'trash-2',
    claseDialogo: 'dialogo--confirmacion-baja',
    cuerpo:
      '<p class="dialogo__confirm-title" data-baja-equipo-resumen>Confirmar baja del equipo</p>' +
      '<p class="dialogo__confirm-text">Se quitará del inventario y quedará registrado en historial de cambios.</p>',
    pieDeModal:
      '<button class="boton boton--outline regla-diseno-005" type="button" data-cancel-delete-equipo>No, cancelar</button>' +
      '<button class="boton boton--outline-danger regla-diseno-005" type="button" data-confirm-delete-equipo>Si, dar de baja</button>',
  });
}

function abrirModalBajaEquipoInventario(idModal, equipoId, nombreEquipo) {
  const modal = document.getElementById(idModal);
  if (!modal) {
    return;
  }
  const nombre = String(nombreEquipo || '').trim();
  modal.dataset.deleteEquipo = String(equipoId || '');
  modal.dataset.equipoNombre = nombre;
  const resumen = modal.querySelector('[data-baja-equipo-resumen]');
  if (resumen) {
    resumen.textContent = nombre
      ? 'Confirmás que querés dar de baja "' + nombre + '"?'
      : 'Confirmás que querés dar de baja este equipo?';
  }
  abrirModal(idModal);
}

function obtenerEquipoBajaSeleccionado(idModal) {
  const modal = document.getElementById(idModal);
  if (!modal) {
    return { id: '', nombre: '' };
  }
  return {
    id: modal.dataset.deleteEquipo || '',
    nombre: modal.dataset.equipoNombre || '',
  };
}

function limpiarModalBajaEquipoInventario(idModal) {
  const modal = document.getElementById(idModal);
  if (!modal) {
    return;
  }
  modal.dataset.deleteEquipo = '';
  modal.dataset.equipoNombre = '';
}

function cancelarBajaEquipoInventario(idModal) {
  cerrarModal(idModal);
  limpiarModalBajaEquipoInventario(idModal);
}

async function eliminarEquipoInventario(equipoId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de baja equipos.' };
  }
  const equiposGuardados = await obtenerEquiposInventario();
  let equipoEliminado = null;
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].id === equipoId) {
      equipoEliminado = equiposGuardados[i];
    }
  }
  if (!equipoEliminado) {
    return { ok: false, mensaje: 'No encontramos ese equipo.' };
  }
  await solicitarApi('api/equipos.php', {
    method: 'DELETE',
    body: JSON.stringify({ id: equipoId }),
  });
  return {
    ok: true,
    mensaje: 'Equipo dado de baja. Ya no aparece en inventario.',
    equipo: equipoEliminado,
  };
}

async function moverEquipoInventario(equipoId, seccionDestinoId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para trasladar equipos.' };
  }
  const equipoActual = await obtenerEquipoInventarioPorId(equipoId);
  if (!equipoActual) {
    return { ok: false, mensaje: 'No encontramos ese equipo.' };
  }
  const seccionDestino = await obtenerSeccionInventarioPorId(seccionDestinoId);
  if (!seccionDestino) {
    return { ok: false, mensaje: 'Elegí una sección de destino válida.' };
  }
  if (equipoActual.seccionId === seccionDestino.id) {
    return { ok: false, mensaje: 'El equipo ya está en esa sección.' };
  }
  await solicitarApi('api/equipos.php', {
    method: 'PATCH',
    body: JSON.stringify({ id: equipoId, seccionId: seccionDestino.id }),
  });
  return {
    ok: true,
    mensaje: 'Equipo trasladado a ' + seccionDestino.nombre + '.',
    equipo: Object.assign({}, equipoActual, {
      seccionId: seccionDestino.id,
      seccion: seccionDestino.nombre,
      actualizado: 'hoy',
    }),
  };
}

if (typeof window !== 'undefined') {
  window.moverEquipoInventario = moverEquipoInventario;
}
