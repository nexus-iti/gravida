
if (protegerRuta()) {
  
  mostrarEn(
    'cabecera-superior',
    crearCabeceraCompleta([
      { etiqueta: 'Home', enlace: 'home.html' },
      { etiqueta: 'Cuenta' },
    ]),
  );
  mostrarEn(
    'cabecera-de-pagina',
    crearCabeceraDePagina({
      titulo: 'Cuenta',
      subtitulo:
        'Revisa tu informacion personal, actualiza tu foto y deja claro desde que area trabajas.',
    }),
  );
  
  const formCuenta = document.getElementById('form-cuenta');
  const mensajeCuenta = document.getElementById('mensaje-cuenta');
  const camposCuenta = {
    nombre: document.getElementById('cuenta-nombre'),
    correo: document.getElementById('cuenta-correo'),
    rol: document.getElementById('cuenta-rol'),
    area: document.getElementById('cuenta-area'),
    descripcion: document.getElementById('cuenta-descripcion'),
    fechaRegistro: document.getElementById('cuenta-fecha-registro'),
    foto: document.getElementById('cuenta-foto'),
  };
  
  function mostrarMensaje(texto, tipo) {
    mostrarMensajeFormulario(mensajeCuenta, texto, tipo);
  }
  
  function renderPerfil() {
    const usuarioActual = obtenerUsuarioActual();
    const avatarGrande = usuarioActual.fotoPerfil
      ? '<img class="profile-card__avatar" src="' +
        escaparHtml(usuarioActual.fotoPerfil) +
        '" alt="Foto de perfil" />'
      : '<span class="profile-card__avatar-fallback">' +
        crearIcono('user', 'icon-lg') +
        '</span>';
    mostrarEn(
      'perfil-resumen',
        ` <article class="profile-card regla-diseno-037"> <div class="profile-card__cover regla-diseno-038"> ${avatarGrande} <h2 class="profile-card__name regla-diseno-039">${escaparHtml(usuarioActual.nombreCompleto)}</h2> <p class="profile-card__role regla-diseno-011">${escaparHtml(obtenerEtiquetaRol(usuarioActual.rol))} | ${escaparHtml(usuarioActual.correo)}</p> </div> <div class="profile-card__body regla-diseno-012"> <button class="boton boton--outline profile-card__logout regla-diseno-005" type="button" data-logout-button> ${crearIcono('log-out', 'icon-sm')} <span data-clave="cerrar_sesion">Cerrar sesion</span> </button> </div> </article> `,
    );
    camposCuenta.nombre.value = usuarioActual.nombreCompleto || '';
    camposCuenta.correo.value = usuarioActual.correo || '';
    camposCuenta.rol.value = obtenerEtiquetaRol(usuarioActual.rol) || '';
    camposCuenta.area.value = usuarioActual.area || '';
    camposCuenta.descripcion.value = usuarioActual.descripcion || '';
    camposCuenta.fechaRegistro.value = usuarioActual.fechaRegistro
      ? formatearFechaHumana(usuarioActual.fechaRegistro)
      : '';
  }

  camposCuenta.foto.addEventListener('change', async function () {
    const archivo = camposCuenta.foto.files && camposCuenta.foto.files[0];
    if (!archivo) {
      return;
    }
    try {
      await subirFotoPerfil(archivo);
      mostrarMensaje('Foto de perfil actualizada.', 'success');
      renderPerfil();
      mostrarEn(
        'cabecera-superior',
        crearCabeceraCompleta([
          { etiqueta: 'Home', enlace: 'home.html' },
          { etiqueta: 'Cuenta' },
        ]),
      );
      dibujarIconos();
    } catch (error) {
      manejarErrorCliente(error, mostrarMensaje);
    } finally {
      camposCuenta.foto.value = '';
    }
  });
  
  formCuenta.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    if (!validarFormularioCliente(formCuenta, mostrarMensaje)) {
      return;
    }
    try {
      await actualizarPerfil({
        nombreCompleto: camposCuenta.nombre.value.trim(),
        correo: camposCuenta.correo.value.trim(),
        area: camposCuenta.area.value.trim(),
        descripcion: camposCuenta.descripcion.value.trim(),
      });
      mostrarMensaje(
        'Perfil actualizado. Tus nuevos datos ya estan visibles en la cuenta.',
        'success',
      );
      renderPerfil();
      mostrarEn(
        'cabecera-superior',
        crearCabeceraCompleta([
          { etiqueta: 'Home', enlace: 'home.html' },
          { etiqueta: 'Cuenta' },
        ]),
      );
      dibujarIconos();
    } catch (error) {
      manejarErrorCliente(error, mostrarMensaje);
    }
  });
  
  renderPerfil();
  iniciarPanelSeguridadCuenta(); // F-08 (3ra entrega)
  dibujarIconos();
}
