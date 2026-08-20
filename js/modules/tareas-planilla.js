/* Archivo extraído de app.js durante la modularización. */

async function obtenerTareasCalendarioTA() {
  return solicitarApi('api/tareas.php');
}

async function obtenerTareaCalendarioPorId(tareaId) {
  const tareas = await obtenerTareasCalendarioTA();
  for (let i = 0; i < tareas.length; i++) {
    if (tareas[i].id === tareaId) {
      return tareas[i];
    }
  }
  return null;
}

async function obtenerTareasPendientesCalendarioTA() {
  const tareas = await obtenerTareasCalendarioTA();
  const pendientes = [];
  for (let i = 0; i < tareas.length; i++) {
    if (normalizarTexto(tareas[i].estado) !== 'completado') {
      pendientes.push(tareas[i]);
    }
  }
  return pendientes;
}

function fechaIsoLocal(fecha) {
  const valorFecha = fecha || new Date();
  const anio = valorFecha.getFullYear();
  const mes = String(valorFecha.getMonth() + 1).padStart(2, '0');
  const dia = String(valorFecha.getDate()).padStart(2, '0');
  return anio + '-' + mes + '-' + dia;
}

function normalizarFechaIso(valor, valorPorDefecto) {
  const texto = String(valor || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }
  return valorPorDefecto || fechaIsoLocal(new Date());
}

function compararFechasIso(fechaA, fechaB) {
  if (fechaA === fechaB) {
    return 0;
  }
  return fechaA > fechaB ? 1 : -1;
}

function obtenerResponsableTareaIdValido(responsableId) {
  const responsables = obtenerResponsablesTareaDelPlantel();
  for (let i = 0; i < responsables.length; i++) {
    if (responsables[i].id === responsableId) {
      return responsableId;
    }
  }
  return responsables.length > 0 ? responsables[0].id : '';
}

function normalizarValorPermitido(valor, permitidos, valorPorDefecto) {
  for (let i = 0; i < permitidos.length; i++) {
    if (permitidos[i] === valor) {
      return valor;
    }
  }
  return valorPorDefecto;
}

function crearDatosTareaCalendario(datos, tareaExistente) {
  const base = tareaExistente || {};
  const hoy = fechaIsoLocal(new Date());
  const tieneDescripcion = Object.prototype.hasOwnProperty.call(datos, 'descripcion');
  const plazoInicio = normalizarFechaIso(datos.plazoInicio || base.plazoInicio, hoy);
  let plazoFin = normalizarFechaIso(datos.plazoFin || base.plazoFin, plazoInicio);
  if (compararFechasIso(plazoFin, plazoInicio) < 0) {
    plazoFin = plazoInicio;
  }
  return {
    id: base.id || generarId('TAR'),
    titulo: String(datos.titulo || base.titulo || 'Nueva tarea').trim(),
    descripcion: String(tieneDescripcion ? datos.descripcion : base.descripcion || '').trim(),
    dificultad: normalizarValorPermitido(
      datos.dificultad || base.dificultad,
      dificultadesTareaTA,
      'Media',
    ),
    categoria: normalizarValorPermitido(
      datos.categoria || base.categoria,
      categoriasTareaTA,
      'Otro',
    ),
    estado: normalizarValorPermitido(datos.estado || base.estado, estadosKanbanTA, 'Pendiente'),
    fechaAgregada: normalizarFechaIso(base.fechaAgregada || datos.fechaAgregada, hoy),
    plazoInicio: plazoInicio,
    plazoFin: plazoFin,
    tecnicoId: obtenerResponsableTareaIdValido(datos.tecnicoId || base.tecnicoId),
    color: String(datos.color || base.color || '#16A34A').trim(),
  };
}

async function guardarNuevaTareaCalendarioTA(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederACalendarioTA(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para crear tareas.' };
  }
  const nuevaTarea = crearDatosTareaCalendario(datos || {}, null);
  const respuesta = await solicitarApi('api/tareas.php', {
    method: 'POST',
    body: JSON.stringify(nuevaTarea),
  });
  nuevaTarea.id = respuesta.id;
  return {
    ok: true,
    mensaje: 'Tarea creada. Ya aparece en el tablero y en el calendario.',
    tarea: nuevaTarea,
  };
}

async function actualizarTareaCalendarioTA(tareaId, datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederACalendarioTA(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para modificar tareas.' };
  }
  const tareas = await obtenerTareasCalendarioTA();
  let tareaActualizada = null;
  for (let i = 0; i < tareas.length; i++) {
    if (tareas[i].id === tareaId) {
      tareaActualizada = crearDatosTareaCalendario(datos || {}, tareas[i]);
      tareas[i] = tareaActualizada;
      break;
    }
  }
  if (!tareaActualizada) {
    return { ok: false, mensaje: 'No encontramos esa tarea.' };
  }
  await solicitarApi('api/tareas.php', {
    method: 'PATCH',
    body: JSON.stringify(tareaActualizada),
  });
  return {
    ok: true,
    mensaje: 'Tarea actualizada. Los cambios ya quedaron guardados.',
    tarea: tareaActualizada,
  };
}

async function eliminarTareaCalendarioTA(tareaId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederACalendarioTA(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para eliminar tareas.' };
  }
  const tareas = await obtenerTareasCalendarioTA();
  let tareaEliminada = null;
  for (let i = 0; i < tareas.length; i++) {
    if (tareas[i].id === tareaId) {
      tareaEliminada = tareas[i];
    }
  }
  if (!tareaEliminada) {
    return { ok: false, mensaje: 'No encontramos esa tarea.' };
  }
  await solicitarApi('api/tareas.php', {
    method: 'DELETE',
    body: JSON.stringify({ id: tareaId }),
  });
  return {
    ok: true,
    mensaje: 'Tarea eliminada. Ya no aparece en el calendario.',
    tarea: tareaEliminada,
  };
}

async function obtenerParcelasPlanillaTA() {
  const datos = await Promise.all([
    obtenerPersonalDelPlantel(),
    obtenerPlanillaTA(),
    obtenerTareasPendientesCalendarioTA(),
  ]);
  const personal = datos[0];
  const planillas = datos[1];
  const tareasPendientes = datos[2];
  const parcelas = [];
  for (let i = 0; i < personal.length; i++) {
    const miembro = personal[i];
    let registro = null;
    for (let j = 0; j < planillas.length; j++) {
      if (planillas[j].usuarioId === miembro.id) {
        registro = planillas[j];
        break;
      }
    }
    if (!registro) {
      registro = {
        usuarioId: miembro.id,
        horaEntrada: '08:00',
        horaSalida: '16:00',
        tareasDelDia: '',
        actualizadoEn: new Date().toISOString(),
      };
    }
    parcelas.push({ usuario: miembro, planilla: registro, tareasPendientes: tareasPendientes });
  }
  return parcelas;
}

async function actualizarParcelaPlanillaTA(usuarioIdParcela, datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeEditarParcelaPlanilla(usuarioIdParcela, usuarioActual)) {
    return {
      ok: false,
      mensaje: 'Tu perfil no tiene permiso para modificar esta persona en la planilla.',
    };
  }
  const registroActualizado = {
    usuarioId: usuarioIdParcela,
    horaEntrada: datos.horaEntrada || '08:00',
    horaSalida: datos.horaSalida || '16:00',
    tareasDelDia: datos.tareasDelDia || '',
    actualizadoEn: new Date().toISOString(),
  };
  await solicitarApi('api/planilla_ta.php', {
    method: 'PATCH',
    body: JSON.stringify(Object.assign({ cedula: usuarioIdParcela }, registroActualizado)),
  });
  return {
    ok: true,
    mensaje: 'Planilla actualizada. Los cambios ya estan visibles para el equipo.',
  };
}

async function eliminarParcelaPlanillaTA(usuarioIdParcela) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioEsAdministrativo(usuarioActual)) {
    return {
      ok: false,
      mensaje: 'Solo un usuario administrativo puede quitar personas de la planilla.',
    };
  }
  const usuarioParcela = buscarUsuarioPorId(usuarioIdParcela);
  if (!usuarioParcela || !usuarioEsTecnico(usuarioParcela)) {
    return { ok: false, mensaje: 'Solo se pueden quitar usuarios tecnicos de esta planilla.' };
  }
  const idsPersonal = await obtenerIdsPersonalBajaTA();
  let yaEstabaDadoDeBaja = false;
  for (let i = 0; i < idsPersonal.length; i++) {
    if (idsPersonal[i] === usuarioIdParcela) {
      yaEstabaDadoDeBaja = true;
      break;
    }
  }
  if (!yaEstabaDadoDeBaja) {
    idsPersonal.push(usuarioIdParcela);
    await guardarIdsPersonalBajaTA(idsPersonal);
  }
  return { ok: true, mensaje: 'Persona quitada de la planilla T.A.' };
}


