(function iniciarPaginaLogin() {
  if (redirigirSiYaHaySesion()) {
    return;
  }

  const formLogin = document.getElementById('form-login');
  const checkRecordarme = document.getElementById('login-recordarme');
  const mensajeLogin = document.getElementById('auth-message-login');
  const formSegundoFactor = document.getElementById('form-2fa');
  const mensajeSegundoFactor = document.getElementById('auth-message-2fa');
  const cajaActivar = document.getElementById('activar-2fa');
  const campoCodigo = document.getElementById('codigo-2fa');

  function mostrarMensaje(mensaje, tipo) {
    mostrarMensajeFormulario(mensajeLogin, mensaje, tipo);
  }

  function mostrarMensajeCodigo(mensaje, tipo) {
    mostrarMensajeFormulario(mensajeSegundoFactor, mensaje, tipo);
  }

  function mostrarPasoContrasena(mensaje) {
    formSegundoFactor.hidden = true;
    formLogin.hidden = false;
    document.getElementById('login-contrasena').value = '';
    if (mensaje) {
      mostrarMensaje(mensaje, 'error');
    }
  }

  function mostrarPasoCodigo(respuesta) {
    formLogin.hidden = true;
    formSegundoFactor.hidden = false;
    mensajeSegundoFactor.innerHTML = '';
    campoCodigo.value = '';
    const activando = respuesta.paso === 'activar_2fa';
    cajaActivar.hidden = !activando;
    if (activando) {
      document.getElementById('secreto-2fa').textContent = respuesta.secreto
        .replace(/(.{4})/g, '$1 ')
        .trim();
      document.getElementById('enlace-2fa').href = respuesta.uri;
    }
    campoCodigo.focus();
  }

  function irAlInicio(usuario) {
    window.location.href =
      usuario && usuario.debeCambiarContrasena ? 'cambiar-contrasena.html' : 'home.html';
  }

  formLogin.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    if (!validarFormularioCliente(formLogin, mostrarMensaje)) {
      return;
    }

    try {
      const respuesta = await iniciarSesion(
        document.getElementById('login-identificador').value,
        document.getElementById('login-contrasena').value,
        { recordarme: checkRecordarme.checked },
      );
      if (respuesta.paso) {
        mostrarPasoCodigo(respuesta);
        return;
      }
      if (!respuesta.ok) {
        mostrarMensaje(respuesta.mensaje, 'error');
        return;
      }
      irAlInicio(respuesta.usuario);
    } catch (error) {
      manejarErrorCliente(error, mostrarMensaje);
    }
  });

  formSegundoFactor.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const codigo = campoCodigo.value.replace(/\D/g, '');
    if (codigo.length !== 6) {
      mostrarMensajeCodigo('El codigo tiene 6 numeros.', 'error');
      return;
    }
    try {
      const respuesta = await iniciarSesionConCodigo(codigo, {
        recordarme: checkRecordarme.checked,
      });
      if (respuesta.reiniciar) {
        mostrarPasoContrasena(respuesta.mensaje);
        return;
      }
      if (!respuesta.ok) {
        mostrarMensajeCodigo(respuesta.mensaje, 'error');
        campoCodigo.select();
        return;
      }
      irAlInicio(respuesta.usuario);
    } catch (error) {
      manejarErrorCliente(error, mostrarMensajeCodigo);
    }
  });

  document.getElementById('volver-login').addEventListener('click', function () {
    mostrarPasoContrasena('');
  });

  if (leerStorage(CLAVES_STORAGE.recordarSesion, false)) {
    checkRecordarme.checked = true;
  }

  dibujarIconos();
})();
