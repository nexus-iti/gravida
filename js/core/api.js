/* Archivo extraído de app.js durante la modularización. */

async function solicitarApi(ruta, opciones) {
  const configuracion = Object.assign({ cache: 'no-store', credentials: 'same-origin', headers: {} }, opciones || {});
  configuracion.headers = Object.assign({ Accept: 'application/json' }, configuracion.headers || {});
  const esFormData = typeof FormData !== 'undefined' && configuracion.body instanceof FormData;
  const esParametros = typeof URLSearchParams !== 'undefined' && configuracion.body instanceof URLSearchParams;
  if (configuracion.body && !esFormData && !esParametros && !configuracion.headers['Content-Type']) {
    configuracion.headers['Content-Type'] = 'application/json';
  }
  const metodo = String(configuracion.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(metodo) && typeof obtenerUsuarioActual === 'function') {
    const usuario = obtenerUsuarioActual();
    if (usuario && usuario.csrfToken) configuracion.headers['X-CSRF-Token'] = usuario.csrfToken;
  }
  const respuesta = await fetch(ruta, configuracion);
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('El servidor devolvio una respuesta invalida.');
  }
  if (!respuesta.ok || (datos && datos.status === 'error')) {
    const mensaje = (datos && (datos.message || datos.error)) || 'No se pudo completar la solicitud.';
    if (respuesta.status === 401 && !/login\.php$/i.test(location.pathname)) {
      try { window.localStorage.removeItem('usuarioActual'); window.sessionStorage.removeItem('usuarioActual'); } catch (error) {}
    }
    throw new Error(mensaje);
  }
  return datos && datos.status === 'success' && Object.prototype.hasOwnProperty.call(datos, 'data')
    ? datos.data
    : datos;
}

async function solicitarLogin(identificador, contrasena) {
  const datosFormulario = new URLSearchParams();
  datosFormulario.set('identificador', identificador);
  datosFormulario.set('contrasena', contrasena);
  const respuesta = await fetch('login.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: datosFormulario.toString(),
  });
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('El servidor devolvio una respuesta invalida.');
  }
  if (!respuesta.ok || (datos && datos.status === 'error')) {
    throw new Error((datos && (datos.message || datos.error)) || 'No se pudo iniciar sesion.');
  }
  return datos && datos.status === 'success' ? datos.data : datos;
}



