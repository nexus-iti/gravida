/* F-08 (3ra entrega): herramientas del usuario contra el phishing y el robo de cuentas.
   Verificacion en dos pasos, cambio de contrasena, actividad reciente y cierre de sesiones. */

const ETIQUETAS_EVENTOS_SEGURIDAD = {
  login_ok: 'Ingreso correcto',
  login_fallido: 'Contrasena incorrecta',
  login_bloqueado: 'Cuenta bloqueada por intentos',
  '2fa_fallido': 'Codigo de verificacion incorrecto',
  '2fa_activado': 'Verificacion en dos pasos activada',
  '2fa_desactivado': 'Verificacion en dos pasos desactivada',
  '2fa_restablecido': 'Verificacion en dos pasos restablecida',
  sesiones_cerradas: 'Se cerraron todas las sesiones',
  contrasena_cambiada: 'Contrasena cambiada',
  logout: 'Cierre de sesion',
};

const EVENTOS_DE_ALERTA = ['login_fallido', 'login_bloqueado', '2fa_fallido'];

function describirNavegador(agente) {
  const texto = String(agente || '');
  const navegador = /Edg\//.test(texto)
    ? 'Edge'
    : /OPR\//.test(texto)
      ? 'Opera'
      : /Firefox\//.test(texto)
        ? 'Firefox'
        : /Chrome\//.test(texto)
          ? 'Chrome'
          : /Safari\//.test(texto)
            ? 'Safari'
            : 'Otro';
  const sistema = /Windows/.test(texto)
    ? 'Windows'
    : /Android/.test(texto)
      ? 'Android'
      : /iPhone|iPad/.test(texto)
        ? 'iOS'
        : /Mac OS/.test(texto)
          ? 'macOS'
          : /Linux/.test(texto)
            ? 'Linux'
            : '';
  return sistema ? navegador + ' en ' + sistema : navegador;
}

function formatearFechaSeguridad(valor) {
  const fecha = new Date(String(valor || '').replace(' ', 'T'));
  if (Number.isNaN(fecha.getTime())) {
    return String(valor || '');
  }
  return fecha.toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' });
}

/* Aviso de una sola vez en el inicio con el ingreso anterior. */
function mostrarAvisoUltimoAcceso(idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  let dato = null;
  try {
    dato = JSON.parse(window.sessionStorage.getItem('sgrsi-ultimo-acceso') || 'null');
    window.sessionStorage.removeItem('sgrsi-ultimo-acceso');
  } catch (error) {
    dato = null;
  }
  if (!contenedor || !dato) {
    return;
  }
  const texto = dato.primero
    ? 'Este es tu primer ingreso registrado.'
    : 'Tu ingreso anterior fue el ' +
      formatearFechaSeguridad(dato.fecha) +
      ' desde la direccion ' +
      dato.ip +
      '.';
  contenedor.innerHTML =
    '<div class="aviso-seguridad" role="status">' +
    crearIcono('shield-check', 'icon-sm') +
    '<p>' +
    escaparHtml(texto) +
    ' Si no fuiste vos, <a href="cuenta.html#panel-seguridad">cambia tu contrasena y cerra las demas sesiones</a>.</p>' +
    '<button type="button" class="aviso-seguridad__cerrar" aria-label="Cerrar aviso">&times;</button>' +
    '</div>';
  contenedor.querySelector('.aviso-seguridad__cerrar').addEventListener('click', function () {
    contenedor.innerHTML = '';
  });
}

async function consultarSeguridadCuenta() {
  return solicitarApi('api/seguridad_cuenta.php');
}

async function enviarAccionSeguridad(datos) {
  return solicitarApi('api/seguridad_cuenta.php', { method: 'POST', body: JSON.stringify(datos) });
}

function iniciarPanelSeguridadCuenta() {
  const bloqueDosFactores = document.getElementById('bloque-2fa');
  const tablaActividad = document.getElementById('tabla-actividad');
  const formContrasena = document.getElementById('form-contrasena');
  const bloqueAdmin = document.getElementById('bloque-admin-2fa');
  if (!bloqueDosFactores || !tablaActividad || !formContrasena) {
    return;
  }

  function mostrarMensaje(texto, tipo) {
    mostrarMensajeFormulario('mensaje-seguridad', texto, tipo);
    document
      .getElementById('mensaje-seguridad')
      .scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function campo(id, etiqueta, tipo, extra) {
    return (
      '<div class="input-stack regla-diseno-025"><label for="' +
      id +
      '">' +
      etiqueta +
      '</label><input class="text-input regla-diseno-026" id="' +
      id +
      '" type="' +
      tipo +
      '" ' +
      (extra || '') +
      ' required /></div>'
    );
  }

  const atributosCodigo =
    'inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"';

  function renderDosFactores(estado) {
    if (estado.activo) {
      bloqueDosFactores.innerHTML =
        '<p class="seguridad-estado seguridad-estado--ok">' +
        crearIcono('shield-check', 'icon-sm') +
        ' Activada. Para entrar se pide tu contrasena y el codigo del telefono.</p>' +
        (estado.obligatorio
          ? '<p class="seguridad-nota">Es obligatoria para los administradores. Si perdes el telefono, pedile a otro administrador que la restablezca.</p>'
          : '<button type="button" class="boton boton--outline-danger boton--sm" id="boton-desactivar-2fa">Desactivar</button>');
      const botonDesactivar = document.getElementById('boton-desactivar-2fa');
      if (botonDesactivar) {
        botonDesactivar.addEventListener('click', renderDesactivar);
      }
    } else {
      bloqueDosFactores.innerHTML =
        '<p class="seguridad-estado seguridad-estado--alerta">' +
        crearIcono('shield-alert', 'icon-sm') +
        ' Desactivada. Si alguien consigue tu contrasena con un correo falso, puede entrar.</p>' +
        '<form id="form-iniciar-2fa" class="seguridad-form">' +
        campo(
          'contrasena-2fa',
          'Tu contrasena actual',
          'password',
          'autocomplete="current-password"',
        ) +
        '<button type="submit" class="boton boton--primary boton--sm">Activar verificacion en dos pasos</button></form>';
      document.getElementById('form-iniciar-2fa').addEventListener('submit', iniciarActivacion);
    }
    dibujarIconos();
  }

  async function iniciarActivacion(evento) {
    evento.preventDefault();
    try {
      const respuesta = await enviarAccionSeguridad({
        accion: 'iniciar_2fa',
        contrasena: document.getElementById('contrasena-2fa').value,
      });
      document.getElementById('mensaje-seguridad').innerHTML = '';
      bloqueDosFactores.innerHTML =
        '<ol class="seguridad-pasos">' +
        '<li>Instala Google Authenticator, Microsoft Authenticator o Authy en tu telefono.</li>' +
        '<li>Agrega una cuenta con esta clave (o abri el enlace desde el telefono):</li></ol>' +
        '<code class="auth-2fa__secreto">' +
        escaparHtml(respuesta.secreto.replace(/(.{4})/g, '$1 ').trim()) +
        '</code>' +
        '<a class="auth-2fa__enlace" href="' +
        escaparAtributo(respuesta.uri) +
        '">Abrir en la app autenticadora</a>' +
        '<form id="form-confirmar-2fa" class="seguridad-form">' +
        campo(
          'codigo-confirmar-2fa',
          'Codigo de 6 digitos que muestra la app',
          'text',
          atributosCodigo,
        ) +
        '<button type="submit" class="boton boton--primary boton--sm">Confirmar y activar</button></form>';
      document.getElementById('form-confirmar-2fa').addEventListener('submit', confirmarActivacion);
      document.getElementById('codigo-confirmar-2fa').focus();
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  }

  async function confirmarActivacion(evento) {
    evento.preventDefault();
    try {
      await enviarAccionSeguridad({
        accion: 'confirmar_2fa',
        codigo: document.getElementById('codigo-confirmar-2fa').value,
      });
      mostrarMensaje(
        'Verificacion en dos pasos activada. Desde ahora se pide el codigo al entrar.',
        'success',
      );
      cargar();
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  }

  function renderDesactivar() {
    bloqueDosFactores.innerHTML =
      '<form id="form-desactivar-2fa" class="seguridad-form">' +
      campo(
        'contrasena-desactivar',
        'Tu contrasena actual',
        'password',
        'autocomplete="current-password"',
      ) +
      campo('codigo-desactivar', 'Codigo actual de la app', 'text', atributosCodigo) +
      '<button type="submit" class="boton boton--outline-danger boton--sm">Desactivar</button></form>';
    document
      .getElementById('form-desactivar-2fa')
      .addEventListener('submit', async function (evento) {
        evento.preventDefault();
        try {
          await enviarAccionSeguridad({
            accion: 'desactivar_2fa',
            contrasena: document.getElementById('contrasena-desactivar').value,
            codigo: document.getElementById('codigo-desactivar').value,
          });
          mostrarMensaje('Verificacion en dos pasos desactivada.', 'info');
          cargar();
        } catch (error) {
          mostrarMensaje(error.message, 'error');
        }
      });
  }

  function renderActividad(eventos) {
    if (!eventos.length) {
      tablaActividad.innerHTML =
        '<p class="seguridad-nota">Todavia no hay actividad registrada.</p>';
      return;
    }
    let filas = '';
    for (let i = 0; i < eventos.length; i++) {
      const evento = eventos[i];
      const alerta = EVENTOS_DE_ALERTA.indexOf(evento.tipo) !== -1;
      filas +=
        '<tr' +
        (alerta ? ' class="seguridad-fila--alerta"' : '') +
        '><td>' +
        escaparHtml(formatearFechaSeguridad(evento.fecha)) +
        '</td><td>' +
        escaparHtml(ETIQUETAS_EVENTOS_SEGURIDAD[evento.tipo] || evento.tipo) +
        '</td><td>' +
        escaparHtml(evento.ip) +
        '</td><td>' +
        escaparHtml(describirNavegador(evento.agente)) +
        '</td></tr>';
    }
    tablaActividad.innerHTML =
      '<div class="tabla-wrap"><table class="tabla seguridad-tabla"><thead><tr><th>Fecha</th><th>Evento</th><th>Direccion IP</th><th>Navegador</th></tr></thead><tbody>' +
      filas +
      '</tbody></table></div>';
  }

  async function cargar() {
    try {
      const estado = await consultarSeguridadCuenta();
      renderDosFactores(estado.dosFactores);
      renderActividad(estado.actividad || []);
      if (bloqueAdmin) {
        bloqueAdmin.hidden = !estado.esAdmin;
      }
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  }

  formContrasena.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const nueva = document.getElementById('contrasena-nueva').value;
    if (nueva !== document.getElementById('contrasena-repetir').value) {
      mostrarMensaje('La contrasena nueva y su repeticion no coinciden.', 'error');
      return;
    }
    const validacion = validarContrasenaSegura(nueva);
    if (!validacion.ok) {
      mostrarMensaje(validacion.mensaje, 'error');
      return;
    }
    try {
      await enviarAccionSeguridad({
        accion: 'cambiar_contrasena',
        actual: document.getElementById('contrasena-actual').value,
        nueva: nueva,
      });
      formContrasena.reset();
      mostrarMensaje('Contrasena cambiada. Se cerraron todas tus otras sesiones.', 'success');
      cargar();
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  });

  const botonCerrarSesiones = document.getElementById('boton-cerrar-sesiones');
  if (botonCerrarSesiones) {
    botonCerrarSesiones.addEventListener('click', async function () {
      if (
        !window.confirm(
          'Se cerraran todas tus sesiones en otros navegadores y dispositivos. Esta sesion sigue abierta. Continuar?',
        )
      ) {
        return;
      }
      try {
        await enviarAccionSeguridad({ accion: 'cerrar_sesiones' });
        mostrarMensaje('Listo: se cerraron todas tus otras sesiones.', 'success');
        cargar();
      } catch (error) {
        mostrarMensaje(error.message, 'error');
      }
    });
  }

  const formRestablecer = document.getElementById('form-restablecer-2fa');
  if (formRestablecer) {
    formRestablecer.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      const cedula = document.getElementById('cedula-restablecer').value;
      if (
        !window.confirm(
          'Se quitara la verificacion en dos pasos de la cedula ' +
            cedula +
            ' y se cerraran sus sesiones. Continuar?',
        )
      ) {
        return;
      }
      try {
        await enviarAccionSeguridad({ accion: 'restablecer_2fa', cedula: cedula });
        formRestablecer.reset();
        mostrarMensaje(
          'Verificacion restablecida. En su proximo ingreso debera configurarla de nuevo.',
          'success',
        );
      } catch (error) {
        mostrarMensaje(error.message, 'error');
      }
    });
  }

  cargar();
}
