/* Archivo extraído de app.js durante la modularización. */

function obtenerTipoEquipoInventario(tipo) {
  const valor = String(tipo || '').trim();
  for (let i = 0; i < tiposDeEquipoInventario.length; i++) {
    if (tiposDeEquipoInventario[i].valor === valor) {
      return tiposDeEquipoInventario[i];
    }
  }
  return tiposDeEquipoInventario[0];
}

function obtenerIconoEquipoInventario(tipo) {
  return obtenerTipoEquipoInventario(tipo).icono;
}

function obtenerEtiquetaTipoEquipoInventario(tipo) {
  return obtenerTipoEquipoInventario(tipo).etiqueta;
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
  return Object.assign({}, equipo, {
    tipo: tipo.valor,
    tipoEtiqueta: equipo.tipoEtiqueta || tipo.etiqueta,
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
    return { ok: false, mensaje: 'Escribi un nombre para la seccion.' };
  }
  const seccionesGuardadas = await obtenerSeccionesInventario();
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (normalizarTexto(seccionesGuardadas[i].nombre) === normalizarTexto(nombre)) {
      return { ok: false, mensaje: 'Ya existe una seccion con ese nombre.' };
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
  return { ok: true, mensaje: 'Seccion creada. Ya aparece en inventario.', seccion: nuevaSeccion };
}

function crearModalBajaSeccionInventario(idModal) {
  return crearModal({
    id: idModal,
    titulo: 'Eliminar seccion',
    icono: 'trash-2',
    claseDialogo: 'dialogo--confirmacion-baja',
    cuerpo:
      '<p class="dialogo__confirm-title" data-baja-seccion-resumen>Confirmar eliminacion de la seccion</p>' +
      '<p class="dialogo__confirm-text" data-baja-seccion-texto>Se quitara del inventario.</p>' +
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
  let opciones = '<option value="">Elegir seccion destino</option>';
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
    return '<option value="" disabled selected>No hay otra seccion disponible</option>';
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
      ? 'De verdad queres eliminar la seccion "' + nombre + '"?'
      : 'De verdad queres eliminar esta seccion?';
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
        'Esta seccion tiene ' +
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
    texto.textContent = 'La seccion no tiene equipos activos. Se quitara del inventario.';
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
    return { ok: false, mensaje: 'No encontramos esa seccion.' };
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
      if (
        seccionesGuardadas[i].id === seccionDestinoId &&
        seccionesGuardadas[i].id !== seccionId
      ) {
        seccionDestino = seccionesGuardadas[i];
        break;
      }
    }
    if (!seccionDestino) {
      return {
        ok: false,
        mensaje: 'Elegí una seccion destino para trasladar los equipos antes de eliminar.',
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
        ? 'Seccion eliminada. Se trasladaron ' +
          equiposATrasladar +
          ' equipo' +
          (equiposATrasladar === 1 ? '' : 's') +
          ' a ' +
          seccionDestino.nombre +
          '.'
        : 'Seccion eliminada. No tenia equipos activos asociados.',
    seccion: seccionEliminada,
  };
}

async function guardarNuevoEquipoInventario(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de alta equipos.' };
  }
  const tipoValor = String(datos && datos.tipo ? datos.tipo : '').trim();
  let tipo = null;
  for (let i = 0; i < tiposDeEquipoInventario.length; i++) {
    if (tiposDeEquipoInventario[i].valor === tipoValor) {
      tipo = tiposDeEquipoInventario[i];
      break;
    }
  }
  if (!tipo) {
    return { ok: false, mensaje: 'Elegí un tipo de equipo valido.' };
  }
  const seccion = await obtenerSeccionInventarioPorId(datos && datos.seccionId);
  if (!seccion) {
    return { ok: false, mensaje: 'Elegí una seccion valida.' };
  }
  const nombre =
    String(datos && datos.nombre ? datos.nombre : '').trim() || tipo.etiqueta;
  const respuesta = await solicitarApi('api/equipos.php', {
    method: 'POST',
    body: JSON.stringify({
      nombre: nombre,
      tipo: tipo.valor,
      seccionId: seccion.id,
      estado: 'Activo',
      observaciones: String(datos && datos.observaciones ? datos.observaciones : '').trim(),
      cantidad: Number(datos && datos.cantidad) || 1,
    }),
  });
  const nuevoEquipo = {
    id: respuesta.id,
    nombre: nombre,
    tipo: tipo.valor,
    tipoEtiqueta: tipo.etiqueta,
    icono: tipo.icono,
    seccionId: seccion.id,
    seccion: seccion.nombre,
    fechaAlta: fechaIsoLocal(new Date()),
    actualizado: 'hoy',
    estado: 'Activo',
    observaciones: String(datos && datos.observaciones ? datos.observaciones : '').trim(),
  };
  return { ok: true, mensaje: 'Equipo dado de alta. Ya aparece en la seccion.', equipo: nuevoEquipo };
}

function crearModalBajaEquipoInventario(idModal) {
  return crearModal({
    id: idModal,
    titulo: 'Dar de baja equipo',
    icono: 'trash-2',
    claseDialogo: 'dialogo--confirmacion-baja',
    cuerpo:
      '<p class="dialogo__confirm-title" data-baja-equipo-resumen>Confirmar baja del equipo</p>' +
      '<p class="dialogo__confirm-text">Se quitara del inventario y quedara registrado en historial de cambios.</p>',
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
      ? 'Confirmas que queres dar de baja "' + nombre + '"?'
      : 'Confirmas que queres dar de baja este equipo?';
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
  return { ok: true, mensaje: 'Equipo dado de baja. Ya no aparece en inventario.', equipo: equipoEliminado };
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
    return { ok: false, mensaje: 'Elegí una seccion de destino valida.' };
  }
  if (equipoActual.seccionId === seccionDestino.id) {
    return { ok: false, mensaje: 'El equipo ya esta en esa seccion.' };
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


