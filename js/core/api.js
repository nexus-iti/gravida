/* Archivo extraído de app.js durante la modularización. */

async function solicitarApi(ruta, opciones) {
  const configuracion = Object.assign({ cache: 'no-store', headers: {} }, opciones || {});
  configuracion.headers = Object.assign({ Accept: 'application/json' }, configuracion.headers || {});
  if (configuracion.body && !configuracion.headers['Content-Type']) {
    configuracion.headers['Content-Type'] = 'application/json';
  }
  const respuesta = await fetch(ruta, configuracion);
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('El servidor devolvio una respuesta invalida.');
  }
  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || 'No se pudo completar la solicitud.');
  }
  return datos;
}

async function solicitarLogin(identificador, contrasena) {
  const datosFormulario = new URLSearchParams();
  datosFormulario.set('identificador', identificador);
  datosFormulario.set('contrasena', contrasena);
  const respuesta = await fetch('../login.php', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: datosFormulario.toString(),
  });
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('El servidor devolvio una respuesta invalida.');
  }
  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || 'No se pudo iniciar sesion.');
  }
  return datos;
}



