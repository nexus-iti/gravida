
function crearIcono(nombreDelIcono, claseExtra) {
  if (!claseExtra) {
    claseExtra = 'icon-md';
  }
  return (
    '<i data-lucide="' +
    nombreDelIcono +
    '" class="icon ' + claseExtra + ' regla-diseno-110"></i>'
  );
}


function obtenerTextoSeguro(valor) {
  const textoBase = valor === null || typeof valor === 'undefined' ? '' : String(valor);
  const textoCorregido = textoBase
    .replaceAll('contrasena', 'contraseña')
    .replaceAll('Contrasena', 'Contraseña')
    .replaceAll('Espanol', 'Español')
    .replaceAll('Manana', 'Mañana')
    .replaceAll('manana', 'mañana')
    .replaceAll('senal', 'señal')
    .replaceAll('Senal', 'Señal');

  if (typeof escaparHtml === 'function') {
    return escaparHtml(textoCorregido);
  }
  return textoCorregido;
}

function obtenerFechaSegura(valor) {
  if (typeof formatearFechaHumana === 'function') {
    return formatearFechaHumana(valor);
  }
  return String(valor || '');
}

function crearAvatarDeUsuario(usuarioActual, claseExtra) {
  const clases = claseExtra ? ' ' + claseExtra : '';
  const nombre =
    usuarioActual && usuarioActual.nombreCompleto ? usuarioActual.nombreCompleto : usuario.nombre;
  if (usuarioActual && usuarioActual.fotoPerfil) {
    return (
      '<img class="avatar-image' + clases + '" src="' +
      usuarioActual.fotoPerfil +
      '" alt="Foto de perfil de ' +
      obtenerTextoSeguro(nombre) +
      '" />'
    );
  }
  let iniciales = 'US';
  if (typeof obtenerIniciales === 'function') {
    iniciales = obtenerIniciales(nombre);
  }
  return '<span class="avatar-fallback' + clases + '">' + obtenerTextoSeguro(iniciales) + '</span>';
}
const ORDEN_HEADER_NAVBAR = ['prestamos', 'solicitudes', 'soporte', 'planilla-ta'];

function obtenerUsuarioNavbar() {
  if (typeof obtenerUsuarioActual !== 'function') {
    return null;
  }
  return obtenerUsuarioActual() || null;
}

function obtenerSeccionActivaNavbar() {
  if (!document.body) {
    return '';
  }
  return document.body.dataset.section || '';
}

function obtenerModulosNavbar(usuarioActual) {
  if (typeof obtenerModulosDisponiblesParaUsuario === 'function') {
    return obtenerModulosDisponiblesParaUsuario(usuarioActual);
  }
  return modulosDelPortal;
}

function obtenerModuloNavbarPorId(modulosVisibles, idModulo) {
  for (let i = 0; i < modulosVisibles.length; i++) {
    if (modulosVisibles[i].id === idModulo) {
      return modulosVisibles[i];
    }
  }
  return null;
}

function agregarModulosOrdenadosNavbar(modulosVisibles, modulosDeNavegacion) {
  for (let i = 0; i < ORDEN_HEADER_NAVBAR.length; i++) {
    const modulo = obtenerModuloNavbarPorId(modulosVisibles, ORDEN_HEADER_NAVBAR[i]);
    if (modulo) {
      modulosDeNavegacion.push(modulo);
    }
  }
}

function agregarModulosRestantesNavbar(modulosVisibles, modulosDeNavegacion) {
  for (let i = 0; i < modulosVisibles.length; i++) {
    const modulo = modulosVisibles[i];
    const esModuloDeCuenta = modulo.id === 'cuenta';
    const yaEstaOrdenado = ORDEN_HEADER_NAVBAR.includes(modulo.id);
    if (esModuloDeCuenta || yaEstaOrdenado) {
      continue;
    }
    modulosDeNavegacion.push(modulo);
  }
}

function obtenerModulosDeNavegacionNavbar(modulosVisibles) {
  const modulosDeNavegacion = [];
  agregarModulosOrdenadosNavbar(modulosVisibles, modulosDeNavegacion);
  agregarModulosRestantesNavbar(modulosVisibles, modulosDeNavegacion);
  return modulosDeNavegacion;
}

function crearEnlaceNavbar(link, seccionActiva) {
  const clases = link.id === seccionActiva ? 'barra-superior__link barra-superior__link--active' : 'barra-superior__link';
  return '<a href="' + link.enlace + '" class="' + clases + '">' + link.etiqueta + '</a>';
}

function crearEnlacesNavbar(modulosVisibles, seccionActiva) {
  const enlaces = [{ id: 'home', etiqueta: 'Home', enlace: 'home.html' }];
  const modulosDeNavegacion = obtenerModulosDeNavegacionNavbar(modulosVisibles);
  for (let i = 0; i < modulosDeNavegacion.length; i++) {
    enlaces.push({
      id: modulosDeNavegacion[i].id,
      etiqueta: modulosDeNavegacion[i].titulo,
      enlace: modulosDeNavegacion[i].enlace,
    });
  }
  let enlacesHtml = '';
  for (let i = 0; i < enlaces.length; i++) {
    enlacesHtml += crearEnlaceNavbar(enlaces[i], seccionActiva);
  }
  return enlacesHtml;
}

function obtenerNombreNavbar(usuarioActual) {
  if (usuarioActual && usuarioActual.nombreCompleto) {
    return usuarioActual.nombreCompleto;
  }
  return usuario.nombre;
}

function obtenerRolNavbar(usuarioActual) {
  if (!usuarioActual || !usuarioActual.rol) {
    return 'Rol sin asignar';
  }
  if (typeof obtenerEtiquetaRol === 'function') {
    return obtenerEtiquetaRol(usuarioActual.rol);
  }
  return usuarioActual.rol;
}

function obtenerClaseOpcionSegmentada(estaActiva) {
  if (estaActiva) {
    return 'segmented-option segmented-option--active';
  }
  return 'segmented-option';
}


function crearBarraDeNavegacion() {
  const usuarioActual = obtenerUsuarioNavbar();
  const seccionActiva = obtenerSeccionActivaNavbar();
  const modulosVisibles = obtenerModulosNavbar(usuarioActual);
  const enlacesHtml = crearEnlacesNavbar(modulosVisibles, seccionActiva);
  const nombre = obtenerNombreNavbar(usuarioActual);
  const rol = obtenerRolNavbar(usuarioActual);
  const clasePerfil = seccionActiva === 'cuenta' ? 'barra-superior__account-trigger--active' : '';
  const temaActual = typeof obtenerTemaActual === 'function' ? obtenerTemaActual() : 'claro';
  const idiomaActual = typeof obtenerIdiomaActual === 'function' ? obtenerIdiomaActual() : 'es';
  const correo = usuarioActual && usuarioActual.correo ? usuarioActual.correo : '';
  const claseTemaClaro = obtenerClaseOpcionSegmentada(temaActual === 'claro');
  const claseTemaOscuro = obtenerClaseOpcionSegmentada(temaActual === 'oscuro');
  const claseIdiomaEs = obtenerClaseOpcionSegmentada(idiomaActual === 'es');
  const claseIdiomaEn = obtenerClaseOpcionSegmentada(idiomaActual === 'en');
  return ` <header class="barra-superior regla-diseno-111" data-navbar-root> <div class="barra-superior__left regla-diseno-112"> <a href="home.html" class="barra-superior__brand regla-diseno-113"> ${crearIcono('building-2', 'icon-lg')} <span>SGRSI</span> </a> <button class="barra-superior__menu-toggle regla-diseno-114" type="button" data-navbar-menu-trigger aria-controls="navbar-menu-principal" aria-expanded="false" aria-label="Abrir menu de navegacion"> ${crearIcono('menu', 'icon-md')} </button> </div> <nav class="barra-superior__links regla-diseno-115" id="navbar-menu-principal" data-navbar-menu aria-label="Navegacion principal"> ${enlacesHtml} </nav> <div class="barra-superior__right regla-diseno-116"> <div class="barra-superior__account regla-diseno-117" data-account-menu-root> <button class="barra-superior__account-trigger ${clasePerfil} regla-diseno-118" type="button" data-account-menu-trigger aria-haspopup="menu" aria-expanded="false" aria-label="Abrir menu de cuenta"> ${crearAvatarDeUsuario(usuarioActual, 'avatar-fallback--sm')} <span class="barra-superior__user-meta regla-diseno-119"> <span class="barra-superior__user-name regla-diseno-120">${obtenerTextoSeguro(nombre)}</span> <span class="barra-superior__user-role regla-diseno-121">${obtenerTextoSeguro(rol)}</span> </span> ${crearIcono('chevron-down', 'icon-sm barra-superior__account-chev')} </button> <div class="account-menu regla-diseno-122" data-account-menu hidden> <div class="account-menu__header regla-diseno-123"> ${crearAvatarDeUsuario(usuarioActual, 'avatar-fallback--sm')} <div> <strong>${obtenerTextoSeguro(nombre)}</strong> <span>${obtenerTextoSeguro(correo || rol)}</span> </div> </div> <div class="account-menu__section regla-diseno-124"> <a class="account-menu__item regla-diseno-125" href="cuenta.html"> ${crearIcono('user-cog', 'icon-sm')} <span> <strong>Perfil y datos personales</strong> <small></small> </span> </a> </div> <div class="account-menu__section regla-diseno-124"> <div class="account-menu__section-title regla-diseno-126">Preferencias</div> <p class="account-menu__section-desc regla-diseno-127">Ajusta el tema, el idioma y como queres usar el portal.</p> <div class="account-menu__setting regla-diseno-128"> <span>Aspecto</span> <div class="segmented-control regla-diseno-003" aria-label="Aspecto"> <button class="${claseTemaClaro}" type="button" data-tema-opcion="claro" aria-pressed="${temaActual === 'claro'}">Claro</button> <button class="${claseTemaOscuro}" type="button" data-tema-opcion="oscuro" aria-pressed="${temaActual === 'oscuro'}">Oscuro</button> </div> </div> <div class="account-menu__setting regla-diseno-128"> <span>Idioma</span> <div class="segmented-control regla-diseno-003" aria-label="Idioma"> <button class="${claseIdiomaEs}" type="button" data-idioma-opcion="es" aria-pressed="${idiomaActual === 'es'}">Español</button> <button class="${claseIdiomaEn}" type="button" data-idioma-opcion="en" aria-pressed="${idiomaActual === 'en'}">Ingles</button> </div> </div> </div> <div class="account-menu__section account-menu__section--footer regla-diseno-124"> <button class="account-menu__item account-menu__item--danger regla-diseno-125" type="button" data-logout-button> ${crearIcono('log-out', 'icon-sm')} <span> <strong>Cerrar sesion</strong> </span> </button> </div> </div> </div> </div> </header> `;
}

function crearMigasDePan(items) {
  let html = '<nav class="breadcrumb regla-diseno-129">';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.enlace) {
      html += '<a href="' + item.enlace + '">' + item.etiqueta + '</a>';
    } else {
      html += '<span>' + item.etiqueta + '</span>';
    }
    if (i !== items.length - 1) {
      html += '<span class="sep">></span>';
    }
  }
  html += '</nav>';
  return html;
}

function crearCabeceraDePagina(opciones) {
  const titulo = opciones.titulo;
  const subtitulo = opciones.subtitulo;
  const volverA = opciones.volverA;
  const insignia = opciones.insignia;
  const acciones = opciones.acciones;
  const esGrande = opciones.esGrande;
  let claseTitulo = 'page-title';
  if (esGrande) {
    claseTitulo = 'page-title page-title--lg';
  }
  let botonVolver = '';
  if (volverA) {
    botonVolver =
      '<a href="' +
      volverA +
      '" class="boton-volver boton-icono regla-diseno-016">' +
      crearIcono('arrow-left', 'icon-md') +
      '</a>';
  }
  let badgeHtml = '';
  if (insignia) {
    badgeHtml =
      '<span class="etiqueta etiqueta--primary etiqueta--lg regla-diseno-130">' +
      insignia +
      '</span>';
  }
  let subtituloHtml = '';
  let accionesHtml = '';
  if (acciones) {
    accionesHtml =
      '<div class="page-actions regla-diseno-057">' + acciones + '</div>';
  }
  return ` <section class="page-header regla-diseno-132"> <div> <div class="page-header__title-group regla-diseno-112"> ${botonVolver} <h1 class="${claseTitulo}">${titulo}</h1> ${badgeHtml} </div> ${subtituloHtml} </div> ${accionesHtml} </section> `;
}

function crearCajaDeBusqueda(textoDeAyuda, idDelInput) {
  return ` <label class="search-box regla-diseno-133"> ${crearIcono('search', 'icon-sm')} <input type="text" id="${idDelInput}" placeholder="${textoDeAyuda}" /> </label> `;
}

function crearBotonDesplegable(etiqueta) {
  return ` <button class="boton-desplegable regla-diseno-074" type="button"> <span>${etiqueta}</span> ${crearIcono('chevron-down', 'icon-sm')} </button> `;
}

function crearBotonPrimario(etiqueta, nombreIcono) {
  let iconoHtml = '';
  if (nombreIcono) {
    iconoHtml = crearIcono(nombreIcono, 'icon-sm');
  }
  return ` <button class="boton boton--primary regla-diseno-005" type="button"> ${iconoHtml} <span>${etiqueta}</span> </button> `;
}

function crearTarjetaDeModulo(opciones) {
  return ` <a href="${opciones.enlace}" class="module-card regla-diseno-044"> ${crearIcono(opciones.icono, 'icon-xl module-card__icon')} <h3 class="module-card__title regla-diseno-134">${opciones.titulo}</h3> <p class="module-card__desc regla-diseno-135">${opciones.descripcion}</p> ${crearIcono('chevron-right', 'icon-md module-card__chev')} </a> `;
}

function crearTarjetaDeResumen(opciones) {
  const ayuda = opciones.ayuda ? '<p class="summary-card__help">' + opciones.ayuda + '</p>' : '';
  return ` <article class="summary-card"> <div class="summary-card__icon-wrap"> ${crearIcono(opciones.icono, 'icon-md')} </div> <div class="summary-card__content"> <span class="summary-card__label">${opciones.etiqueta}</span> <strong class="summary-card__value">${opciones.valor}</strong> ${ayuda} </div> </article> `;
}

function crearInsigniaDeEstado(texto) {
  let clase = 'primary';
  if (typeof obtenerClaseDeEstado === 'function') {
    clase = obtenerClaseDeEstado(texto);
  }
  return (
    '<span class="etiqueta etiqueta--' + clase + ' regla-diseno-049">' +
    obtenerTextoSeguro(texto) +
    '</span>'
  );
}

function crearAccionesActividad(accionesHtml) {
  return accionesHtml
    ? '<div class="activity-card__actions regla-diseno-136">' + accionesHtml + '</div>'
    : '';
}

function crearMetaGestion(registro) {
  return registro.gestionadoPor
    ? '<span><strong>Gestionado por:</strong> ' +
        obtenerTextoSeguro(registro.gestionadoPor) +
        '</span>'
    : '';
}

function obtenerTituloPrestamo(prestamo) {
  if (prestamo && Array.isArray(prestamo.recursosDetalle) && prestamo.recursosDetalle.length > 0) {
    const partes = [];
    for (let i = 0; i < prestamo.recursosDetalle.length; i++) {
      const recurso = prestamo.recursosDetalle[i];
      partes.push(obtenerTextoSeguro(recurso.cantidad) + ' ' + obtenerTextoSeguro(recurso.nombre));
    }
    return partes.join(' + ');
  }
  return (
    obtenerTextoSeguro(prestamo.cantidad) +
    ' ' +
    obtenerTextoSeguro(prestamo.recurso || prestamo.categoria)
  );
}

function crearTarjetaDePrestamo(prestamo, accionesHtml) {
  const tituloPrestamo = obtenerTituloPrestamo(prestamo);
  const acciones = crearAccionesActividad(accionesHtml);
  const gestion = crearMetaGestion(prestamo);
  return ` <article class="activity-card regla-diseno-137"> <header class="activity-card__header regla-diseno-138"> <div> <h3 class="activity-card__title regla-diseno-139">${tituloPrestamo}</h3> <p class="activity-card__meta regla-diseno-041"> ${obtenerTextoSeguro(prestamo.categoria)} | Solicitud de prestamo </p> </div> ${crearInsigniaDeEstado(prestamo.estado)} </header> <p class="activity-card__desc regla-diseno-140">${obtenerTextoSeguro(prestamo.detalle)}</p> <div class="activity-card__info-grid regla-diseno-141"> <span><strong>Fecha:</strong> ${obtenerFechaSegura(prestamo.fecha)}</span> <span><strong>Jornada:</strong> ${obtenerTextoSeguro(prestamo.jornada)}</span> <span><strong>Lugar:</strong> ${obtenerTextoSeguro(prestamo.ubicacion)}</span> <span><strong>Solicitante:</strong> ${obtenerTextoSeguro(prestamo.solicitante)}</span> ${gestion} </div> ${acciones} <footer class="activity-card__footer regla-diseno-142"> <span class="mono">${obtenerTextoSeguro(prestamo.id)}</span> <span>${obtenerFechaSegura(prestamo.creadoEn)}</span> </footer> </article> `;
}

function crearTarjetaDeTicket(ticket, accionesHtml) {
  const acciones = crearAccionesActividad(accionesHtml);
  const gestion = crearMetaGestion(ticket);
  return ` <article class="activity-card regla-diseno-137"> <header class="activity-card__header regla-diseno-138"> <div> <h3 class="activity-card__title regla-diseno-139">${obtenerTextoSeguro(ticket.asunto)}</h3> <p class="activity-card__meta regla-diseno-041">${obtenerTextoSeguro(ticket.categoria)}</p> </div> ${crearInsigniaDeEstado(ticket.estado)} </header> <p class="activity-card__desc regla-diseno-140">${obtenerTextoSeguro(ticket.mensaje)}</p> <div class="activity-card__info-grid regla-diseno-141"> <span><strong>Ubicacion:</strong> ${obtenerTextoSeguro(ticket.ubicacion)}</span> <span><strong>Solicitante:</strong> ${obtenerTextoSeguro(ticket.solicitante)}</span> ${gestion} </div> ${acciones} <footer class="activity-card__footer regla-diseno-142"> <span class="mono">${obtenerTextoSeguro(ticket.id)}</span> <span>${obtenerFechaSegura(ticket.creadoEn)}</span> </footer> </article> `;
}

function crearTarjetaDeSolicitud(solicitud, accionesHtml) {
  const acciones = crearAccionesActividad(accionesHtml);
  const gestion = crearMetaGestion(solicitud);
  return ` <article class="activity-card regla-diseno-137"> <header class="activity-card__header regla-diseno-138"> <div> <h3 class="activity-card__title regla-diseno-139">${obtenerTextoSeguro(solicitud.titulo || solicitud.tipo)}</h3> <p class="activity-card__meta regla-diseno-041">${obtenerFechaSegura(solicitud.fecha)} | ${obtenerTextoSeguro(solicitud.lugar)}</p> </div> ${crearInsigniaDeEstado(solicitud.estado)} </header> <p class="activity-card__desc regla-diseno-140">${obtenerTextoSeguro(solicitud.detalle)}</p> <div class="activity-card__info-grid regla-diseno-141"> <span><strong>Fecha:</strong> ${obtenerFechaSegura(solicitud.fecha)}</span> <span><strong>Lugar:</strong> ${obtenerTextoSeguro(solicitud.lugar)}</span> <span><strong>Solicitante:</strong> ${obtenerTextoSeguro(solicitud.solicitante)}</span> ${gestion} </div> ${acciones} <footer class="activity-card__footer regla-diseno-142"> <span class="mono">${obtenerTextoSeguro(solicitud.id)}</span> <span>${obtenerFechaSegura(solicitud.creadoEn)}</span> </footer> </article> `;
}

function crearParcelaPlanillaTA(parcela, puedeEditar) {
  const miembro = parcela.usuario;
  const planilla = parcela.planilla;
  const rolEtiqueta =
    typeof obtenerEtiquetaRol === 'function' ? obtenerEtiquetaRol(miembro.rol) : miembro.rol;
  const claseRol =
    typeof obtenerRolCanonico === 'function' && obtenerRolCanonico(miembro.rol) === 'administrativo'
      ? 'etiqueta--purple'
      : 'etiqueta--info';
  const avatarGrande = crearAvatarDeUsuario(miembro, 'planilla-parcela__avatar');
  const area = miembro.area || 'Area sin definir';
  const actualizado =
    typeof formatearFechaHumana === 'function'
      ? formatearFechaHumana(planilla.actualizadoEn)
      : planilla.actualizadoEn;
  const usuarioId = obtenerTextoSeguro(miembro.id);
  const tareasMostrar = obtenerTextoSeguro(
    planilla.tareasDelDia || 'Todavia no hay tareas cargadas para esta jornada.',
  ).replace(/\n/g, '<br />');
  const tareasValor = obtenerTextoSeguro(planilla.tareasDelDia || '');
  const entradaValor = obtenerTextoSeguro(planilla.horaEntrada || '08:00');
  const salidaValor = obtenerTextoSeguro(planilla.horaSalida || '16:00');
  const puedeEliminar =
    typeof obtenerUsuarioActual === 'function' &&
    typeof usuarioEsAdministrativo === 'function' &&
    typeof usuarioEsTecnico === 'function' &&
    usuarioEsAdministrativo(obtenerUsuarioActual()) &&
    usuarioEsTecnico(miembro);
  let opcionesTareasKanban = '<option value="">Elegir una tarea pendiente del kanban</option>';
  let tareasKanbanHtml = '';
  if (typeof obtenerTareasPendientesCalendarioTA === 'function') {
    const tareasPendientes = obtenerTareasPendientesCalendarioTA();
    for (let i = 0; i < tareasPendientes.length; i++) {
      const tarea = tareasPendientes[i];
      const tecnico =
        typeof obtenerNombreUsuarioPorId === 'function'
          ? obtenerNombreUsuarioPorId(tarea.tecnicoId)
          : 'Tecnico sin asignar';
      opcionesTareasKanban +=
        '<option value="' +
        obtenerTextoSeguro(tarea.id) +
        '">' +
        obtenerTextoSeguro(tarea.titulo) +
        ' | ' +
        obtenerTextoSeguro(tarea.estado) +
        ' | ' +
        obtenerTextoSeguro(tecnico) +
        '</option>';
    }
    tareasKanbanHtml = ` <label class="planilla-parcela__task-picker"> <span>Agregar tarea desde kanban</span> <select class="select-input regla-diseno-026" data-planilla-task-picker> ${opcionesTareasKanban} </select> </label> `;
  }
  const botonEliminar = puedeEliminar
    ? '<button class="boton boton--outline-danger boton--sm regla-diseno-034" type="button" data-delete-parcela="' +
      usuarioId +
      '">' +
      crearIcono('trash-2', 'icon-sm') +
      '<span>Eliminar</span></button>'
    : '';
  const claseEditable = puedeEditar ? ' planilla-parcela--editable' : '';
  if (puedeEditar) {
    return ` <article class="planilla-parcela${claseEditable}" data-parcela-usuario="${usuarioId}"> <header class="planilla-parcela__header regla-diseno-138"> ${avatarGrande} <div class="planilla-parcela__identity regla-diseno-046"> <h3 class="planilla-parcela__name regla-diseno-143">${obtenerTextoSeguro(miembro.nombreCompleto)}</h3> <div class="planilla-parcela__meta regla-diseno-041"> <span class="etiqueta ${claseRol} regla-diseno-049">${obtenerTextoSeguro(rolEtiqueta)}</span> <span>${obtenerTextoSeguro(area)}</span> </div> </div> </header> <form class="planilla-parcela__form regla-diseno-050" data-planilla-form="${usuarioId}"> <div class="planilla-parcela__schedule regla-diseno-075"> <label> <span>Entrada</span> <input class="text-input regla-diseno-026" type="time" name="horaEntrada" value="${entradaValor}" required /> </label> <label> <span>Salida</span> <input class="text-input regla-diseno-026" type="time" name="horaSalida" value="${salidaValor}" required /> </label> </div> <label class="planilla-parcela__tasks regla-diseno-086"> <span>Tareas de la jornada</span> <textarea class="textarea-input regla-diseno-026" name="tareasDelDia" rows="3" required>${tareasValor}</textarea> </label> ${tareasKanbanHtml} <footer class="planilla-parcela__footer regla-diseno-144"> <span>Actualizado: ${obtenerTextoSeguro(actualizado)}</span> <div class="planilla-parcela__actions regla-diseno-136"> ${botonEliminar} <button class="boton boton--primary boton--sm regla-diseno-034" type="submit">Guardar</button> </div> </footer> </form> </article> `;
  }
  return ` <article class="planilla-parcela${claseEditable}" data-parcela-usuario="${usuarioId}"> <header class="planilla-parcela__header regla-diseno-138"> ${avatarGrande} <div class="planilla-parcela__identity regla-diseno-046"> <h3 class="planilla-parcela__name regla-diseno-143">${obtenerTextoSeguro(miembro.nombreCompleto)}</h3> <div class="planilla-parcela__meta regla-diseno-041"> <span class="etiqueta ${claseRol} regla-diseno-049">${obtenerTextoSeguro(rolEtiqueta)}</span> <span>${obtenerTextoSeguro(area)}</span> </div> </div> </header> <div class="planilla-parcela__readonly regla-diseno-083"> <div class="planilla-parcela__schedule planilla-parcela__schedule--readonly regla-diseno-075"> <span> ${crearIcono('log-in', 'icon-sm')} Entrada: <strong>${entradaValor}</strong> </span> <span> ${crearIcono('log-out', 'icon-sm')} Salida: <strong>${salidaValor}</strong> </span> </div> <div class="planilla-parcela__tasks planilla-parcela__tasks--readonly regla-diseno-086"> <span>Tareas de la jornada</span> <p>${tareasMostrar}</p> </div> </div> <footer class="planilla-parcela__footer regla-diseno-144"> <span>Actualizado: ${obtenerTextoSeguro(actualizado)}</span> <span class="planilla-parcela__hint">Solo lectura</span> </footer> </article> `;
}

function obtenerColorSeguroTarea(tarea) {
  const color = String(tarea && tarea.color ? tarea.color : '#16A34A').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) {
    return color;
  }
  return '#16A34A';
}

function crearTarjetaTareaKanban(tarea) {
  const color = obtenerColorSeguroTarea(tarea);
  const tecnico =
    typeof obtenerNombreUsuarioPorId === 'function'
      ? obtenerNombreUsuarioPorId(tarea.tecnicoId)
      : 'Tecnico sin asignar';
  return ` <button class="kanban-task-card regla-diseno-083" type="button" draggable="true" data-task-open="${obtenerTextoSeguro(tarea.id)}" data-task-drag="${obtenerTextoSeguro(tarea.id)}" style="--task-color:${color}"> <span class="kanban-task-card__bar"></span> <span class="kanban-task-card__body regla-diseno-086"> <span class="kanban-task-card__title regla-diseno-143">${obtenerTextoSeguro(tarea.titulo)}</span> <span class="kanban-task-card__desc regla-diseno-145">${obtenerTextoSeguro(tarea.descripcion)}</span> <span class="kanban-task-card__meta regla-diseno-146"> <span>${obtenerTextoSeguro(tarea.categoria)}</span> <span>${obtenerTextoSeguro(tarea.dificultad)}</span> </span> <span class="kanban-task-card__footer regla-diseno-147"> <span>${crearIcono('user-check', 'icon-sm')} ${obtenerTextoSeguro(tecnico)}</span> <span>${crearIcono('calendar-clock', 'icon-sm')} ${obtenerFechaSegura(tarea.plazoInicio)} - ${obtenerFechaSegura(tarea.plazoFin)}</span> </span> </span> </button> `;
}

function crearChipTareaCalendario(tarea) {
  const color = obtenerColorSeguroTarea(tarea);
  return ` <button class="calendar-task-chip regla-diseno-148" type="button" data-task-open="${obtenerTextoSeguro(tarea.id)}" style="--task-color:${color}"> <span>${obtenerTextoSeguro(tarea.titulo)}</span> <small>Hasta ${obtenerFechaSegura(tarea.plazoFin)}</small> </button> `;
}

function obtenerTextoActualizadoInventario(valor) {
  if (valor === 'hoy') {
    return 'Actualizado hoy';
  }
  return 'Actualizado el ' + valor;
}

function obtenerIconoSeguroEquipo(equipo) {
  return (
    equipo.icono ||
    (typeof obtenerIconoEquipoInventario === 'function'
      ? obtenerIconoEquipoInventario(equipo.tipo)
      : equipo.tipo)
  );
}

function crearFilaDeSeccion(seccion, opciones) {
  const permitirBaja = opciones && opciones.permitirBaja;
  const textoActualizado = obtenerTextoActualizadoInventario(seccion.actualizado);
  const botonBaja = permitirBaja
    ? '<button class="boton-icono boton-icono--peligro regla-diseno-016" type="button" data-delete-seccion="' +
      obtenerTextoSeguro(seccion.id) +
      '" aria-label="Dar de baja ' +
      obtenerTextoSeguro(seccion.nombre) +
      '" title="Dar de baja seccion">' +
      crearIcono('trash-2', 'icon-md') +
      '</button>'
    : '';
  return ` <a class="list-row regla-diseno-149" href="seccion-detalle.html?id=${encodeURIComponent(seccion.id)}"> <span class="list-row__icon-wrap regla-diseno-047">${crearIcono(seccion.icono, 'icon-md')}</span> <div class="list-row__body regla-diseno-150"> <div class="list-row__title regla-diseno-143">${obtenerTextoSeguro(seccion.nombre)}</div> <div class="list-row__meta regla-diseno-011"> <span>${obtenerTextoSeguro(textoActualizado)}</span> <span class="etiqueta etiqueta--primary regla-diseno-049">${obtenerTextoSeguro(seccion.cantidadEquipos)} equipos</span> </div> </div> <div class="list-row__actions regla-diseno-136"> ${botonBaja} ${crearIcono('chevron-right', 'icon-md')} </div> </a> `;
}

function crearFilaDeEquipo(equipo, opciones) {
  const permitirBaja = opciones && opciones.permitirBaja;
  const iconoEquipo = obtenerIconoSeguroEquipo(equipo);
  let puntitoActivo = '';
  if (equipo.estaActivo) {
    puntitoActivo = '<span class="status-dot" title="Activo"></span>';
  }
  const textoActualizado = obtenerTextoActualizadoInventario(equipo.actualizado);
  const botonBaja = permitirBaja
    ? '<button class="boton-icono boton-icono--peligro regla-diseno-016" type="button" data-delete-equipo="' +
      obtenerTextoSeguro(equipo.id) +
      '" aria-label="Dar de baja ' +
      obtenerTextoSeguro(equipo.nombre) +
      '" title="Dar de baja equipo">' +
      crearIcono('trash-2', 'icon-md') +
      '</button>'
    : '';
  return ` <a class="list-row regla-diseno-149" href="equipo-detalle.html?id=${encodeURIComponent(equipo.id)}"> <span class="list-row__icon-wrap list-row__icon-wrap--muted list-row__icon-wrap--sm regla-diseno-047"> ${crearIcono(iconoEquipo, 'icon-sm')} </span> <div class="list-row__body regla-diseno-150"> <div class="list-row__title list-row__title--sm regla-diseno-151"> ${obtenerTextoSeguro(equipo.nombre)}${puntitoActivo} </div> <div class="list-row__meta regla-diseno-011"> <span>${obtenerTextoSeguro(equipo.tipoEtiqueta || '')}</span> <span class="mono">ID: ${obtenerTextoSeguro(equipo.id)}</span> <span class="list-row__meta--sub regla-diseno-152">${obtenerTextoSeguro(textoActualizado)}</span> </div> </div> <div class="list-row__actions regla-diseno-136"> ${botonBaja} ${crearIcono('chevron-right', 'icon-md')} </div> </a> `;
}

function crearTablaDeEquipos(equipos) {
  if (!equipos || equipos.length === 0) {
    return (
      '<div class="table-wrap">' +
      crearEstadoVacio({
        icono: 'monitor',
        titulo: 'Todavia no hay equipos cargados',
        descripcion: 'Da de alta equipos desde una seccion del inventario para verlos aca.',
      }) +
      '</div>'
    );
  }
  let filasHtml = '';
  for (let i = 0; i < equipos.length; i++) {
    const equipo = equipos[i];
    const iconoEquipo = obtenerIconoSeguroEquipo(equipo);
    filasHtml += ` <tr> <td data-label="Equipo"> <div class="cell-name"> <span class="cell-icon">${crearIcono(iconoEquipo, 'icon-sm')}</span> <span>${obtenerTextoSeguro(equipo.nombre)}</span> </div> </td> <td data-label="ID" class="cell-id">${obtenerTextoSeguro(equipo.id)}</td> <td data-label="Tipo">${obtenerTextoSeguro(equipo.tipoEtiqueta || '')}</td> <td data-label="Seccion">${obtenerTextoSeguro(equipo.seccion)}</td> <td data-label="Actualizacion">${obtenerTextoSeguro(equipo.actualizado)}</td> <td data-label="Acciones"> <div class="cell-actions regla-diseno-136"> <a class="boton-icono regla-diseno-016" href="equipo-detalle.html?id=${encodeURIComponent(equipo.id)}" aria-label="Ver detalle">${crearIcono('eye', 'icon-sm')}</a> <button class="boton-icono boton-icono--peligro regla-diseno-016" type="button" data-delete-equipo="${obtenerTextoSeguro(equipo.id)}" aria-label="Dar de baja equipo">${crearIcono('trash-2', 'icon-sm')}</button> </div> </td> </tr> `;
  }
  return ` <div class="table-wrap"> <table class="tabla"> <thead> <tr> <th>Equipo</th> <th style="width:120px">ID</th> <th style="width:140px">Tipo</th> <th style="width:180px">Seccion</th> <th style="width:160px">Actualizacion</th> <th style="width:100px">Acciones</th> </tr> </thead> <tbody>${filasHtml}</tbody> </table> </div> `;
}

function crearTarjetaDeHistorial(evento) {
  const colorCssDelPunto = coloresPorNombre[evento.color];
  return ` <article class="timeline__item"> <div class="timeline__dot-wrap"> <span class="timeline__dot" style="background:${colorCssDelPunto}"></span> <span class="timeline__line"></span> </div> <div class="timeline__card"> <header class="timeline__header"> <span>${evento.titulo}</span> <span class="etiqueta etiqueta--${evento.colorEtiqueta} regla-diseno-049">${evento.etiqueta}</span> </header> <p class="timeline__desc">${evento.descripcion}</p> <span class="timeline__meta">${evento.autor} | ${evento.fecha} | ${evento.hora}</span> </div> </article> `;
}

function crearItemHistorialCompacto(evento) {
  const colorCssDelPunto = coloresPorNombre[evento.color];
  return ` <div class="timeline-compact__item regla-diseno-153"> <span class="timeline-compact__dot" style="background:${colorCssDelPunto}"></span> <div class="timeline-compact__body regla-diseno-051"> <span class="timeline-compact__title regla-diseno-154">${evento.titulo}</span> <span class="timeline-compact__meta regla-diseno-152">${evento.autor} | ${evento.fecha}</span> </div> </div> `;
}

function crearTarjetaDeImagen(imagen) {
  return ` <article class="image-card regla-diseno-037"> <img class="image-card__img regla-diseno-155" src="${imagen.rutaImagen}" alt="${imagen.titulo}" loading="lazy" /> <div class="image-card__info regla-diseno-156"> <h4 class="image-card__title regla-diseno-143">${imagen.titulo}</h4> <span class="image-card__meta regla-diseno-152"> ${imagen.fecha} | ${imagen.hora} | ${imagen.cantidadEquipos} equipos </span> </div> </article> `;
}

function crearEstadoVacio(opciones) {
  let botonHtml = '';
  if (opciones.boton) {
    botonHtml = opciones.boton;
  }
  return ` <div class="empty-state regla-diseno-157"> ${crearIcono(opciones.icono, 'icon-xl')} <h4 class="empty-state__title regla-diseno-139">${opciones.titulo}</h4> <p class="empty-state__desc regla-diseno-158">${opciones.descripcion}</p> ${botonHtml} </div> `;
}

function crearModal(opciones) {
  let nombreIcono = opciones.icono;
  if (!nombreIcono) {
    nombreIcono = 'triangle-alert';
  }
  return ` <div class="dialogo-overlay regla-diseno-018" id="${opciones.id}" style="display:none" data-modal> <div class="dialogo regla-diseno-159"> <header class="dialogo__header regla-diseno-020"> <h3 class="dialogo__title regla-diseno-021"> ${crearIcono(nombreIcono, 'icon-md')} <span>${opciones.titulo}</span> </h3> <button class="dialogo__close regla-diseno-022" data-modal-close>${crearIcono('x', 'icon-md')}</button> </header> <div class="dialogo__body regla-diseno-023">${opciones.cuerpo}</div> <footer class="dialogo__footer regla-diseno-027">${opciones.pieDeModal}</footer> </div> </div> `;
}

function crearCabeceraCompleta(migas) {
  return crearBarraDeNavegacion() + crearMigasDePan(migas);
}
