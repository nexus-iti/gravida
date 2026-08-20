/* Archivo extraído de app.js durante la modularización. */

async function obtenerPrestamos() {
  return solicitarApi('api/prestamos.php');
}

async function obtenerEquiposDisponiblesParaPrestamo() {
  const equipos = await solicitarApi('api/equipos.php');
  return equipos.filter(function (equipo) {
    return equipo.estado === 'Activo' && Number(equipo.cantidad) > 0;
  });
}
async function obtenerTicketsSoporte() {
  return solicitarApi('api/incidencias.php');
}

async function obtenerSolicitudesServicio() {
  return solicitarApi('api/servicios.php');
}

async function obtenerPlanillaTA() {
  return solicitarApi('api/planilla_ta.php');
}



async function obtenerPrestamosVisibles() {
  const usuarioActual = obtenerUsuarioActual();
  return filtrarRegistrosVisibles(await obtenerPrestamos(), usuarioActual);
}
async function obtenerTicketsVisibles() {
  const usuarioActual = obtenerUsuarioActual();
  return filtrarRegistrosVisibles(await obtenerTicketsSoporte(), usuarioActual);
}
async function obtenerSolicitudesVisibles() {
  const usuarioActual = obtenerUsuarioActual();
  return filtrarRegistrosVisibles(await obtenerSolicitudesServicio(), usuarioActual);
}



async function guardarNuevoPrestamo(datos) {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion) {
    throw new Error('Necesitas iniciar sesion para solicitar un prestamo.');
  }
  const recursosDetalle = [];
  if (Array.isArray(datos.recursosDetalle)) {
    for (let i = 0; i < datos.recursosDetalle.length; i++) {
      const nombre = String(datos.recursosDetalle[i].nombre || '').trim();
      const cantidad = Number(datos.recursosDetalle[i].cantidad);
      const idEquipo = Number(datos.recursosDetalle[i].idEquipo);
      if (!nombre || !Number.isInteger(cantidad) || cantidad < 1 || !Number.isInteger(idEquipo) || idEquipo < 1) {
        throw new Error('Cada recurso seleccionado debe pertenecer a un equipo valido del inventario.');
      }
      recursosDetalle.push({ idEquipo: idEquipo, nombre: nombre, cantidad: cantidad });
    }
  }
  if (recursosDetalle.length === 0) {
    throw new Error('Selecciona al menos un equipo del inventario para solicitarlo.');
  }
  const nuevosPrestamos = [];
  for (let i = 0; i < recursosDetalle.length; i++) {
    nuevosPrestamos.push({
      id: '',
      categoria: datos.categoria,
      recurso: recursosDetalle[i].cantidad + ' ' + recursosDetalle[i].nombre,
      cantidad: recursosDetalle[i].cantidad,
      recursosDetalle: [recursosDetalle[i]],
      fecha: datos.fecha,
      jornada: datos.jornada,
      ubicacion: datos.ubicacion,
      estado: 'Pendiente',
      detalle: datos.detalle,
      solicitante: usuarioEnSesion.nombreCompleto,
      solicitanteId: usuarioEnSesion.id,
      creadoEn: new Date().toISOString(),
    });
  }
  const respuesta = await solicitarApi('api/prestamos.php', {
    method: 'POST',
    body: JSON.stringify({
      cedula: usuarioEnSesion.cedula,
      categoria: datos.categoria,
      fecha: datos.fecha,
      jornada: datos.jornada,
      ubicacion: datos.ubicacion,
      detalle: datos.detalle,
      recursos: recursosDetalle,
    }),
  });
  for (let i = 0; i < nuevosPrestamos.length; i++) {
    nuevosPrestamos[i].id = respuesta.ids[i] || '';
  }
  return nuevosPrestamos;
}

async function actualizarEstadoGestionado(ruta, idRegistro, nuevoEstado) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeGestionarOperaciones(usuarioActual)) {
    return null;
  }
  await solicitarApi(ruta, {
    method: 'PATCH',
    body: JSON.stringify({
      id: idRegistro,
      estado: nuevoEstado,
      tecnicoCedula: usuarioActual.cedula,
    }),
  });
  return { id: idRegistro, estado: nuevoEstado, gestionadoPor: usuarioActual.nombreCompleto };
}

async function actualizarEstadoPrestamo(idPrestamo, nuevoEstado) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeGestionarOperaciones(usuarioActual)) {
    return null;
  }
  await solicitarApi('api/prestamos.php', {
    method: 'PATCH',
    body: JSON.stringify({ id: idPrestamo, estado: nuevoEstado }),
  });
  return { id: idPrestamo, estado: nuevoEstado };
}

async function guardarNuevoTicket(datos) {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion) {
    throw new Error('Necesitas iniciar sesion para crear un ticket.');
  }
  const nuevoTicket = {
    id: '',
    asunto: datos.asunto,
    categoria: datos.categoria,
    prioridad: datos.prioridad || '',
    estado: 'Pendiente',
    ubicacion: datos.ubicacion,
    mensaje: datos.mensaje,
    solicitante: usuarioEnSesion ? usuarioEnSesion.nombreCompleto : 'Usuario',
    solicitanteId: usuarioEnSesion ? usuarioEnSesion.id : '',
    creadoEn: new Date().toISOString(),
  };
  const respuesta = await solicitarApi('api/incidencias.php', {
    method: 'POST',
    body: JSON.stringify({
      cedula: usuarioEnSesion.cedula,
      asunto: nuevoTicket.asunto,
      categoria: nuevoTicket.categoria,
      ubicacion: nuevoTicket.ubicacion,
      mensaje: nuevoTicket.mensaje,
      idEquipo: datos.idEquipo || '',
    }),
  });
  nuevoTicket.id = respuesta.id;
  return nuevoTicket;
}

async function actualizarEstadoTicket(idTicket, nuevoEstado) {
  return actualizarEstadoGestionado(
    'api/incidencias.php',
    idTicket,
    nuevoEstado,
  );
}

async function guardarNuevaSolicitud(datos) {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion) {
    throw new Error('Necesitas iniciar sesion para crear una solicitud.');
  }
  const nuevaSolicitud = {
    id: '',
    titulo: datos.titulo || datos.tipo,
    tipo: datos.tipo,
    fecha: datos.fecha,
    fechaDeseada: datos.fecha,
    lugar: datos.lugar,
    estado: 'Pendiente',
    detalle: datos.detalle,
    solicitante: usuarioEnSesion ? usuarioEnSesion.nombreCompleto : 'Usuario',
    solicitanteId: usuarioEnSesion ? usuarioEnSesion.id : '',
    creadoEn: new Date().toISOString(),
  };
  const respuesta = await solicitarApi('api/servicios.php', {
    method: 'POST',
    body: JSON.stringify({
      cedula: usuarioEnSesion.cedula,
      titulo: nuevaSolicitud.titulo,
      tipo: nuevaSolicitud.tipo,
      fechaDeseada: nuevaSolicitud.fechaDeseada,
      lugar: nuevaSolicitud.lugar,
      detalle: nuevaSolicitud.detalle,
    }),
  });
  nuevaSolicitud.id = respuesta.id;
  return nuevaSolicitud;
}

async function actualizarEstadoSolicitud(idSolicitud, nuevoEstado) {
  return actualizarEstadoGestionado(
    'api/servicios.php',
    idSolicitud,
    nuevoEstado,
  );
}

async function actualizarPerfil(datosParciales) {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion) {
    return null;
  }
  await solicitarApi('api/usuarios.php', {
    method: 'PATCH',
    body: JSON.stringify({
      accion: 'actualizar_perfil',
      cedula: usuarioEnSesion.cedula,
      nombreCompleto: datosParciales.nombreCompleto || usuarioEnSesion.nombreCompleto,
      correo: datosParciales.correo || usuarioEnSesion.correo,
      descripcion:
        datosParciales.descripcion !== undefined
          ? datosParciales.descripcion
          : usuarioEnSesion.descripcion || '',
    }),
  });
  const usuarioActualizado = Object.assign({}, usuarioEnSesion, datosParciales);
  guardarUsuarioActual(usuarioActualizado);
  return usuarioActualizado;
}

async function subirFotoPerfil(archivo) {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion || !archivo) {
    return null;
  }
  const formData = new FormData();
  formData.append('cedula', usuarioEnSesion.cedula);
  formData.append('foto', archivo);
  const respuesta = await fetch('api/foto_perfil.php', {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('El servidor devolvio una respuesta invalida.');
  }
  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || 'No se pudo completar la solicitud.');
  }
  const usuarioActualizado = Object.assign({}, usuarioEnSesion, {
    fotoPerfil: datos.fotoPerfil,
  });
  guardarUsuarioActual(usuarioActualizado);
  return usuarioActualizado;
}

aplicarTemaGuardado();
aplicarIdiomaGuardado();


