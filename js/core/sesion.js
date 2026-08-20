/* Archivo extraído de app.js durante la modularización. */

async function iniciarSesion(identificador, contrasena, opciones) {
  try {
    const sesion = await solicitarLogin(identificador, contrasena);
    const usuarioEncontrado = await solicitarApi(
      'api/usuarios.php?cedula=' + encodeURIComponent(sesion.cedula),
    );
    if (!usuarioEncontrado) {
      return { ok: false, mensaje: 'No encontramos los datos de la cuenta.' };
    }
    const recordarme = !!(opciones && opciones.recordarme);
    guardarUsuarioActual(usuarioEncontrado, { persistir: recordarme });
    return { ok: true, mensaje: 'Sesion iniciada.', usuario: usuarioEncontrado };
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }
}

async function registrarUsuario(datos) {
  const cedula = normalizarCedula(datos.cedula);
  const nombreCompleto = String(datos.nombreCompleto || '').trim();
  const correo = normalizarTexto(datos.correo);
  const contrasena = String(datos.contrasena || '');
  const rol = String(datos.rol || '').trim();
  if (!cedula || !nombreCompleto || !correo || !contrasena || !rol) {
    return {
      ok: false,
      mensaje: 'Completa cedula, nombre completo, correo, contraseña y rol para continuar.',
    };
  }
  if (!/^\d{8}$/.test(cedula)) {
    return { ok: false, mensaje: 'La cedula debe tener exactamente 8 numeros.' };
  }
  const validacionContrasena = validarContrasenaSegura(contrasena);
  if (!validacionContrasena.ok) {
    return validacionContrasena;
  }
  const rolEtiqueta = obtenerEtiquetaRol(rol);
  try {
    const ruta = requiereAprobacionDeRegistro(rolEtiqueta)
      ? 'api/solicitudes_registro.php'
      : 'api/usuarios.php';
    const respuesta = await solicitarApi(ruta, {
      method: 'POST',
      body: JSON.stringify({
        cedula: cedula,
        nombreCompleto: nombreCompleto,
        correo: correo,
        contrasena: contrasena,
        rol: rolEtiqueta,
      }),
    });
    if (requiereAprobacionDeRegistro(rolEtiqueta)) {
      return {
        ok: true,
        mensaje:
          'Solicitud enviada. Un administrador revisara tu registro antes de habilitar el acceso.',
        pendiente: true,
        solicitud: respuesta.solicitud,
      };
    }
    guardarUsuarioActual(respuesta.usuario, { persistir: false });
    return { ok: true, mensaje: 'Cuenta creada. Ya podes ingresar al portal.', usuario: respuesta.usuario };
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }
}

function protegerRuta() {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion) {
    window.location.href = 'index.html';
    return false;
  }
  if (!usuarioEstaActivoEnPortal(usuarioEnSesion)) {
    cerrarSesion();
    return false;
  }
  const seccionActual = document.body ? document.body.dataset.section : '';
  if (seccionActual === 'inventario' && !usuarioPuedeAccederAInventario(usuarioEnSesion)) {
    window.location.href = 'home.html';
    return false;
  }
  if (seccionActual === 'planilla-ta' && !usuarioPuedeAccederAPlanillaTA(usuarioEnSesion)) {
    window.location.href = 'home.html';
    return false;
  }
  return true;
}

function redirigirSiYaHaySesion() {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (usuarioEnSesion && usuarioEstaActivoEnPortal(usuarioEnSesion)) {
    window.location.href = 'home.html';
    return true;
  }
  if (usuarioEnSesion && !usuarioEstaActivoEnPortal(usuarioEnSesion)) {
    window.localStorage.removeItem(CLAVES_STORAGE.usuarioActual);
    try {
      window.sessionStorage.removeItem(CLAVES_STORAGE.usuarioActual);
    } catch (error) {
      /* sin sesion temporal */
    }
  }
  return false;
}

function cerrarSesion() {
  window.localStorage.removeItem(CLAVES_STORAGE.usuarioActual);
  window.localStorage.removeItem(CLAVES_STORAGE.recordarSesion);
  try {
    window.sessionStorage.removeItem(CLAVES_STORAGE.usuarioActual);
  } catch (error) {
    /* sin sesion temporal */
  }
  window.location.href = 'index.html';
}


