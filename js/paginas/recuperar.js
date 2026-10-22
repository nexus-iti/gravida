const mensajeRecuperacion = document.getElementById('mensaje-recuperar');
const resultadoRecuperacion = document.getElementById('resultado-consulta');

function escaparRecuperacion(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, function (caracter) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter];
  });
}

function textoRecuperacion(texto) {
  return typeof t === 'function' ? t(texto) : texto;
}

document.getElementById('form-recuperar').addEventListener('submit', async function (evento) {
  evento.preventDefault();
  try {
    const respuesta = await solicitarApi('api/recuperacion.php', {
      method: 'POST',
      body: JSON.stringify({
        cedula: document.getElementById('rec-cedula').value,
        correo: document.getElementById('rec-correo').value,
      }),
    });
    mensajeRecuperacion.innerHTML =
      '<div class="form-message form-message--success recovery-result"><span>' +
      escaparRecuperacion(textoRecuperacion('Solicitud registrada correctamente')) +
      '</span><small>' +
      escaparRecuperacion(textoRecuperacion('Guardá este código para consultar el estado:')) +
      '</small><strong class="mono recovery-code">' +
      escaparRecuperacion(respuesta.codigo) +
      '</strong></div>';
    document.getElementById('con-cedula').value = document.getElementById('rec-cedula').value;
    document.getElementById('con-codigo').value = respuesta.codigo;
  } catch (error) {
    mensajeRecuperacion.innerHTML =
      '<div class="form-message form-message--error">' +
      escaparRecuperacion(textoRecuperacion(error.message)) +
      '</div>';
  }
});

document.getElementById('form-consultar').addEventListener('submit', async function (evento) {
  evento.preventDefault();
  try {
    const respuesta = await solicitarApi('api/recuperacion.php', {
      method: 'POST',
      body: JSON.stringify({
        accion: 'consultar',
        cedula: document.getElementById('con-cedula').value,
        codigo: document.getElementById('con-codigo').value,
      }),
    });
    let html =
      '<div class="form-message form-message--success recovery-result"><strong>' +
      escaparRecuperacion(textoRecuperacion('Estado:')) +
      ' ' +
      escaparRecuperacion(textoRecuperacion(respuesta.estado)) +
      '</strong>';
    if (respuesta.contrasenaTemporal)
      html +=
        '<div class="recovery-credential"><span>' +
        escaparRecuperacion(textoRecuperacion('Tu contraseña temporal')) +
        '</span><strong class="mono" id="clave-temporal" tabindex="-1">' +
        escaparRecuperacion(respuesta.contrasenaTemporal) +
        '</strong><small>' +
        escaparRecuperacion(
          textoRecuperacion(
            'Se muestra una sola vez. Copiala ahora e ingresá con tu cédula. Después el sistema te pedirá crear una contraseña definitiva.',
          ),
        ) +
        '</small><div class="recovery-credential__actions"><button class="boton boton--primary boton--sm" type="button" id="copiar-clave">' +
        escaparRecuperacion(textoRecuperacion('Copiar contraseña')) +
        '</button><a class="boton boton--outline boton--sm" href="login.html">' +
        escaparRecuperacion(textoRecuperacion('Ir al inicio de sesión')) +
        '</a></div></div>';
    resultadoRecuperacion.innerHTML = html + '</div>';
    const copiar = document.getElementById('copiar-clave');
    if (copiar)
      copiar.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(respuesta.contrasenaTemporal);
          copiar.textContent = textoRecuperacion('Contraseña copiada');
        } catch (error) {
          document.getElementById('clave-temporal').focus();
        }
      });
  } catch (error) {
    resultadoRecuperacion.innerHTML =
      '<div class="form-message form-message--error">' +
      escaparRecuperacion(textoRecuperacion(error.message)) +
      '</div>';
  }
});
