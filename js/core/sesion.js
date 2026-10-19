/* Archivo extraído de app.js durante la modularización. */

async function iniciarSesion(identificador, contrasena, opciones) {
  try {
    const recordarme = !!(opciones && opciones.recordarme);
    const sesion = await solicitarLogin(identificador, contrasena, recordarme);
    if (sesion.paso) {
      // F-08 (3ra entrega): la contrasena fue correcta pero falta el codigo del telefono.
      return { ok: false, paso: sesion.paso, secreto: sesion.secreto || '', uri: sesion.uri || '' };
    }
    return terminarIngreso(sesion, recordarme);
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }
}

async function iniciarSesionConCodigo(codigo, opciones) {
  try {
    const sesion = await solicitarCodigoSegundoFactor(codigo);
    return terminarIngreso(sesion, !!(opciones && opciones.recordarme));
  } catch (error) {
    // 'pre2fa': vencio el paso o hubo demasiados codigos malos -> hay que volver a la contrasena.
    return { ok: false, mensaje: error.message, reiniciar: error.codigo === 'pre2fa' };
  }
}

function terminarIngreso(sesion, recordarme) {
  const usuarioEncontrado = sesion.usuario;
  if (!usuarioEncontrado) {
    return { ok: false, mensaje: 'No encontramos los datos de la cuenta.' };
  }
  // El contrato 4.0 entrega el token fuera del objeto usuario. Se conserva junto a
  // la copia local para que todas las escrituras posteriores puedan enviarlo.
  usuarioEncontrado.csrfToken = sesion.csrf || '';
  guardarUsuarioActual(usuarioEncontrado, { persistir: recordarme });
  guardarUltimoAccesoParaAviso(sesion.ultimoAcceso || null);
  return {
    ok: true,
    mensaje: 'Sesion iniciada.',
    usuario: usuarioEncontrado,
    ultimoAcceso: sesion.ultimoAcceso || null,
  };
}

/* F-08: el aviso de "ultimo ingreso" se muestra una vez en el inicio. Si el usuario no reconoce
   la fecha o el lugar, alguien mas uso su cuenta (por ejemplo, despues de un phishing). */
function guardarUltimoAccesoParaAviso(ultimoAcceso) {
  try {
    window.sessionStorage.setItem('sgrsi-ultimo-acceso', JSON.stringify(ultimoAcceso || { primero: true }));
  } catch (error) {
    /* sin almacenamiento: no se muestra el aviso */
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
  verificarSesionEnServidor();
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

/* La copia local del usuario solo sirve para pintar la interfaz: quien decide es el servidor.
   Si la sesion vencio o el rol cambio, se corrige aca. */
async function verificarSesionEnServidor() {
  try {
    const estado = await leerEstadoSesionServidor();
    if (!estado.autenticado || !estado.usuario) {
      limpiarSesionLocal();
      window.location.href = 'login.html';
      return;
    }
    const local = obtenerUsuarioActual();
    estado.usuario.csrfToken = estado.csrf || (local && local.csrfToken) || '';
    if (!local || local.cedula !== estado.usuario.cedula || local.rol !== estado.usuario.rol) {
      guardarUsuarioActual(estado.usuario, {
        persistir: !!leerStorage(CLAVES_STORAGE.recordarSesion, false),
      });
      window.location.reload();
      return;
    }
    // La rotacion o recuperacion de la sesion puede renovar el token sin cambiar
    // la identidad. Actualizarlo evita que la interfaz siga enviando uno vencido.
    if (estado.usuario.csrfToken && local.csrfToken !== estado.usuario.csrfToken) {
      guardarUsuarioActual(estado.usuario, {
        persistir: !!leerStorage(CLAVES_STORAGE.recordarSesion, false),
      });
    }
  } catch (error) {
    /* sin conexion: la API igualmente rechazara las operaciones */
  }
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

async function cerrarSesion() {
  limpiarSesionLocal();
  await cerrarSesionServidor();
  window.location.href = 'index.html';
}
