/* Archivo extraído de app.js durante la modularización. */

/*
 * Desde que las páginas viven en /pages, las rutas de la API y de los archivos
 * subidos deben resolverse contra la raíz del proyecto. El router publica esa
 * raíz en window.NEXUS_BASE; el fallback permite usar api.js de forma aislada.
 */
const BASE_NEXUS =
  window.NEXUS_BASE ||
  (function () {
    const script = document.currentScript;
    return script ? new URL('../../', script.src).href : new URL('./', window.location.href).href;
  })();

function rutaNexus(ruta) {
  const valor = String(ruta || '');
  if (!valor || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(valor)) {
    return valor;
  }
  return BASE_NEXUS + valor.replace(/^\.\//, '');
}

async function renovarTokenCsrf() {
  const respuesta = await fetch(rutaNexus('login.php'), {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  const envoltorio = await respuesta.json();
  const estado = envoltorio && envoltorio.status === 'success' ? envoltorio.data : envoltorio;
  if (!respuesta.ok || !estado || !estado.autenticado || !estado.csrf) {
    throw new Error(
      typeof t === 'function'
        ? t('La sesion vencio. Volve a iniciar sesion.')
        : 'La sesion vencio. Volve a iniciar sesion.',
    );
  }
  if (typeof obtenerUsuarioActual === 'function' && typeof guardarUsuarioActual === 'function') {
    const usuario = obtenerUsuarioActual();
    if (usuario) {
      usuario.csrfToken = estado.csrf;
      guardarUsuarioActual(usuario, {
        persistir:
          typeof leerStorage === 'function'
            ? !!leerStorage(CLAVES_STORAGE.recordarSesion, false)
            : false,
      });
    }
  }
  return estado.csrf;
}

async function solicitarApi(ruta, opciones, reintentarCsrf = true) {
  const configuracion = Object.assign(
    { cache: 'no-store', credentials: 'same-origin', headers: {} },
    opciones || {},
  );
  configuracion.headers = Object.assign(
    { Accept: 'application/json' },
    configuracion.headers || {},
  );
  const esFormData = typeof FormData !== 'undefined' && configuracion.body instanceof FormData;
  const esParametros =
    typeof URLSearchParams !== 'undefined' && configuracion.body instanceof URLSearchParams;
  if (
    configuracion.body &&
    !esFormData &&
    !esParametros &&
    !configuracion.headers['Content-Type']
  ) {
    configuracion.headers['Content-Type'] = 'application/json';
  }
  const metodo = String(configuracion.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(metodo) && typeof obtenerUsuarioActual === 'function') {
    const usuario = obtenerUsuarioActual();
    if (usuario) {
      configuracion.headers['X-CSRF-Token'] = usuario.csrfToken || (await renovarTokenCsrf());
    }
  }
  const respuesta = await fetch(rutaNexus(ruta), configuracion);
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error(
      typeof t === 'function'
        ? t('El servidor devolvio una respuesta invalida.')
        : 'El servidor devolvio una respuesta invalida.',
      { cause: error },
    );
  }
  if (!respuesta.ok || (datos && datos.status === 'error')) {
    const mensaje =
      (datos && (datos.message || datos.error)) || 'No se pudo completar la solicitud.';
    if (
      respuesta.status === 403 &&
      /token de seguridad|sesion de seguridad/i.test(mensaje) &&
      reintentarCsrf
    ) {
      configuracion.headers['X-CSRF-Token'] = await renovarTokenCsrf();
      return solicitarApi(ruta, configuracion, false);
    }
    if (respuesta.status === 401 && !/login\.php$/i.test(location.pathname)) {
      try {
        window.localStorage.removeItem('usuarioActual');
        window.sessionStorage.removeItem('usuarioActual');
      } catch (error) {}
    }
    throw new Error(typeof t === 'function' ? t(mensaje) : mensaje);
  }
  return datos && datos.status === 'success' && Object.prototype.hasOwnProperty.call(datos, 'data')
    ? datos.data
    : datos;
}

async function solicitarLogin(identificador, contrasena, recordarme) {
  const datosFormulario = new URLSearchParams();
  datosFormulario.set('identificador', identificador);
  datosFormulario.set('contrasena', contrasena);
  datosFormulario.set('recordarme', recordarme ? '1' : '0');
  const respuesta = await fetch(rutaNexus('login.php'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: datosFormulario.toString(),
  });
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error(
      typeof t === 'function'
        ? t('El servidor devolvio una respuesta invalida.')
        : 'El servidor devolvio una respuesta invalida.',
      { cause: error },
    );
  }
  if (!respuesta.ok || (datos && datos.status === 'error')) {
    const mensaje = (datos && (datos.message || datos.error)) || 'No se pudo iniciar sesion.';
    throw new Error(typeof t === 'function' ? t(mensaje) : mensaje);
  }
  return datos && datos.status === 'success' ? datos.data : datos;
}

async function solicitarCodigoSegundoFactor(codigo) {
  const datosFormulario = new URLSearchParams();
  datosFormulario.set('accion', 'verificar_2fa');
  datosFormulario.set('codigo', codigo);
  return solicitarApi('login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: datosFormulario.toString(),
  });
}

async function leerEstadoSesionServidor() {
  return solicitarApi('login.php');
}

function limpiarSesionLocal() {
  window.localStorage.removeItem(CLAVES_STORAGE.usuarioActual);
  window.localStorage.removeItem(CLAVES_STORAGE.recordarSesion);
  try {
    window.sessionStorage.removeItem(CLAVES_STORAGE.usuarioActual);
  } catch (error) {
    /* sin almacenamiento */
  }
}

async function cerrarSesionServidor() {
  try {
    await solicitarApi('api/logout.php', { method: 'POST' });
  } catch (error) {
    /* limpiar igualmente */
  }
}
