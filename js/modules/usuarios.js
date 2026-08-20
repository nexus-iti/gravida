/* Archivo extraído de app.js durante la modularización. */

async function obtenerUsuariosRegistrados() {
  usuariosRegistradosCache = await solicitarApi('api/usuarios.php');
  return usuariosRegistradosCache.slice();
}

async function obtenerResponsablesTareaRegistrados() {
  responsablesTareaCache = await solicitarApi('api/usuarios.php?responsablesTarea=1');
  return responsablesTareaCache.slice();
}

function obtenerUsuarioActual() {
  try {
    const recordarSesion = leerStorage(CLAVES_STORAGE.recordarSesion, false);
    if (recordarSesion) {
      return leerStorage(CLAVES_STORAGE.usuarioActual, null);
    }
    const valorSesion = window.sessionStorage.getItem(CLAVES_STORAGE.usuarioActual);
    if (!valorSesion) {
      return null;
    }
    return JSON.parse(valorSesion);
  } catch (error) {
    return null;
  }
}

function guardarUsuarioActual(usuarioActual, opciones) {
  const persistir = !opciones || opciones.persistir !== false;
  if (persistir) {
    guardarStorage(CLAVES_STORAGE.usuarioActual, usuarioActual);
    guardarStorage(CLAVES_STORAGE.recordarSesion, true);
    try {
      window.sessionStorage.removeItem(CLAVES_STORAGE.usuarioActual);
    } catch (error) {
      /* sin sesion temporal */
    }
    return;
  }
  try {
    window.sessionStorage.setItem(CLAVES_STORAGE.usuarioActual, JSON.stringify(usuarioActual));
  } catch (error) {
    guardarStorage(CLAVES_STORAGE.usuarioActual, usuarioActual);
  }
  window.localStorage.removeItem(CLAVES_STORAGE.usuarioActual);
  guardarStorage(CLAVES_STORAGE.recordarSesion, false);
}

function usuarioEstaActivoEnPortal(usuario) {
  if (!usuario) {
    return false;
  }
  if (usuario.estadoRegistro === 'pendiente' || usuario.estadoRegistro === 'rechazado') {
    return false;
  }
  return true;
}

function requiereAprobacionDeRegistro(rol) {
  const rolCanonico = obtenerRolCanonico(rol);
  return rolCanonico === 'tecnico';
}

async function aprobarSolicitudRegistro(solicitudId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioEsAdministrativo(usuarioActual)) {
    return { ok: false, mensaje: 'Solo un usuario administrativo puede aprobar registros.' };
  }
  try {
    await solicitarApi('api/solicitudes_registro.php', {
      method: 'PATCH',
      body: JSON.stringify({
        id: solicitudId,
        administradorCedula: usuarioActual.cedula,
        estado: 'Aprobado',
      }),
    });
    return { ok: true, mensaje: 'Registro aprobado. La persona ya puede iniciar sesion.' };
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }
}

async function rechazarSolicitudRegistro(solicitudId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioEsAdministrativo(usuarioActual)) {
    return { ok: false, mensaje: 'Solo un usuario administrativo puede rechazar registros.' };
  }
  try {
    await solicitarApi('api/solicitudes_registro.php', {
      method: 'PATCH',
      body: JSON.stringify({
        id: solicitudId,
        administradorCedula: usuarioActual.cedula,
        estado: 'Rechazado',
      }),
    });
    return { ok: true, mensaje: 'Solicitud de registro rechazada.' };
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }
}


