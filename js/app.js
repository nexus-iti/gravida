/* =============================================================
   app.js
   -------------------------------------------------------------
   Utilidades globales del portal:

   - renderizado basico de HTML
   - iconos Lucide
   - modales y buscadores
   - autenticacion simulada con localStorage
   - colecciones persistentes (prestamos, soporte, solicitudes)
   - helpers de perfil
   ============================================================= */



const CLAVES_STORAGE = {
  usuarios: 'campus_ti_usuarios',
  usuarioActual: 'campus_ti_usuario_actual',
  recordarSesion: 'campus_ti_recordar_sesion',
  solicitudesRegistro: 'campus_ti_solicitudes_registro',
  prestamos: 'campus_ti_prestamos',
  tickets: 'campus_ti_tickets',
  solicitudes: 'campus_ti_solicitudes',
  planillaTA: 'campus_ti_planilla_ta',
  tareasCalendarioTA: 'campus_ti_tareas_calendario_ta',
  personalBajaTA: 'campus_ti_personal_baja_ta',
  seccionesInventario: 'campus_ti_secciones_inventario',
  equiposInventario: 'campus_ti_equipos_inventario',
  historialInventario: 'campus_ti_historial_inventario',
  imagenesInventario: 'campus_ti_imagenes_inventario',
  limpiezaSemillas: 'campus_ti_limpieza_semillas_v2',
  tema: 'tema',
  idioma: 'idioma',
};



function mostrarEn(idDelDiv, htmlComoTexto) {
  const elemento = document.getElementById(idDelDiv);
  if (elemento) {
    elemento.innerHTML = htmlComoTexto;
    inicializarSelectsPersonalizados(elemento);
  }
}



function dibujarIconos() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  aplicarIdiomaActualAlDom();
  inicializarSelectsPersonalizados(document);
}


function obtenerTemaActual() {
  let temaGuardado = '';
  try {
    temaGuardado = String(window.localStorage.getItem(CLAVES_STORAGE.tema) || '').replace(/"/g, '');
  } catch (error) {
    temaGuardado = '';
  }
  return temaGuardado === 'oscuro' ? 'oscuro' : 'claro';
}

function obtenerIdiomaActual() {
  let idiomaGuardado = '';
  try {
    idiomaGuardado = String(window.localStorage.getItem(CLAVES_STORAGE.idioma) || '').replace(/"/g, '');
  } catch (error) {
    idiomaGuardado = '';
  }
  return idiomaGuardado === 'en' ? 'en' : 'es';
}

function sincronizarAtributoDeTema(tema) {
  const temaNormalizado = tema === 'oscuro' ? 'oscuro' : 'claro';
  document.documentElement.setAttribute('data-tema', temaNormalizado);
}


function sincronizarBotonesDeTema() {
  const temaActual = obtenerTemaActual();
  const botonesTema = document.querySelectorAll('[data-tema-toggle]');
  const botonesOpcionTema = document.querySelectorAll('[data-tema-opcion]');
  const etiqueta = temaActual === 'oscuro' ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro');
  const icono = temaActual === 'oscuro' ? 'sun' : 'moon';
  for (let i = 0; i < botonesTema.length; i++) {
    botonesTema[i].setAttribute('aria-label', etiqueta);
    botonesTema[i].setAttribute('title', etiqueta);
    botonesTema[i].innerHTML =
      '<i data-lucide="' + icono + '" class="icon icon-sm regla-diseno-006"></i>';
  }
  for (let i = 0; i < botonesOpcionTema.length; i++) {
    const estaActivo = botonesOpcionTema[i].dataset.temaOpcion === temaActual;
    botonesOpcionTema[i].classList.toggle('segmented-option--active', estaActivo);
    botonesOpcionTema[i].setAttribute('aria-pressed', estaActivo ? 'true' : 'false');
  }
  dibujarIconos();
}


function aplicarTema(tema) {
  const temaNormalizado = tema === 'oscuro' ? 'oscuro' : 'claro';
  sincronizarAtributoDeTema(temaNormalizado);
  try {
    window.localStorage.setItem(CLAVES_STORAGE.tema, temaNormalizado);
  } catch (error) {
    /* sin acceso a localStorage directo */
  }
  sincronizarBotonesDeTema();
}


function aplicarTemaGuardado() {
  aplicarTema(obtenerTemaActual());
}


function alternarTema() {
  const temaSiguiente = obtenerTemaActual() === 'oscuro' ? 'claro' : 'oscuro';
  aplicarTema(temaSiguiente);
}


const traducciones = window.traducciones || { es: {}, en: {} };


function normalizarClaveTraduccion(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ATRIBUTOS_I18N = ['placeholder', 'aria-label', 'title', 'alt', 'data-label'];


function crearIndiceI18n() {
  const indice = {};
  const idiomas = Object.keys(traducciones);
  for (let i = 0; i < idiomas.length; i++) {
    const idioma = idiomas[i];
    const tabla = traducciones[idioma] || {};
    const claves = Object.keys(tabla);
    for (let j = 0; j < claves.length; j++) {
      const clave = claves[j];
      const texto = normalizarClaveTraduccion(tabla[clave]);
      if (texto) {
        indice[texto] = clave;
      }
    }
  }
  return indice;
}

const CLAVES_I18N_POR_TEXTO = crearIndiceI18n();

function obtenerClaveI18nPorTexto(texto) {
  return CLAVES_I18N_POR_TEXTO[normalizarClaveTraduccion(texto)] || '';
}

function obtenerTraduccionPorClave(clave, idioma) {
  const idiomaNormalizado = idioma === 'en' ? 'en' : 'es';
  const tabla = traducciones[idiomaNormalizado] || traducciones.es;
  return tabla[clave] || '';
}


function traducirVariable(textoNormalizado, idioma) {
  if (idioma === 'en') {
    if (textoNormalizado.startsWith('Bienvenida, ')) {
      return textoNormalizado.replace('Bienvenida, ', 'Welcome, ');
    }
    if (textoNormalizado.startsWith('Te damos la bienvenida al SGRSI, ')) {
      return textoNormalizado.replace('Te damos la bienvenida al SGRSI, ', 'Welcome to SGRSI, ');
    }
    if (textoNormalizado.startsWith('Cantidad de ')) {
      return textoNormalizado.replace('Cantidad de ', 'Quantity of ');
    }
    if (textoNormalizado.endsWith(' sin leer')) {
      return textoNormalizado.replace(' sin leer', ' unread');
    }
    if (textoNormalizado.startsWith('Se registro la cuenta de ')) {
      return textoNormalizado
        .replace('Se registro la cuenta de ', 'The account for ')
        .replace(' con rol Usuario solicitante.', ' was registered with requester role.')
        .replace(' con rol Usuario tecnico.', ' was registered with technical role.')
        .replace(' con rol Usuario administrativo.', ' was registered with administrative role.');
    }
    if (textoNormalizado.startsWith('Usuario solicitante |')) {
      return textoNormalizado.replace('Usuario solicitante |', 'Requesting user |');
    }
    if (textoNormalizado.startsWith('Usuario tecnico |')) {
      return textoNormalizado.replace('Usuario tecnico |', 'Technical user |');
    }
    if (textoNormalizado.startsWith('Usuario administrativo |')) {
      return textoNormalizado.replace('Usuario administrativo |', 'Administrative user |');
    }
  }
  if (idioma === 'es') {
    if (textoNormalizado.startsWith('Welcome, ')) {
      return textoNormalizado.replace('Welcome, ', 'Bienvenida, ');
    }
    if (textoNormalizado.startsWith('Welcome to SGRSI, ')) {
      return textoNormalizado.replace('Welcome to SGRSI, ', 'Te damos la bienvenida al SGRSI, ');
    }
    if (textoNormalizado.startsWith('Quantity of ')) {
      return textoNormalizado.replace('Quantity of ', 'Cantidad de ');
    }
    if (textoNormalizado.endsWith(' unread')) {
      return textoNormalizado.replace(' unread', ' sin leer');
    }
    if (textoNormalizado.startsWith('The account for ')) {
      return textoNormalizado
        .replace('The account for ', 'Se registro la cuenta de ')
        .replace(' was registered with requester role.', ' con rol Usuario solicitante.')
        .replace(' was registered with technical role.', ' con rol Usuario tecnico.')
        .replace(' was registered with administrative role.', ' con rol Usuario administrativo.');
    }
    if (textoNormalizado.startsWith('Requesting user |')) {
      return textoNormalizado.replace('Requesting user |', 'Usuario solicitante |');
    }
    if (textoNormalizado.startsWith('Technical user |')) {
      return textoNormalizado.replace('Technical user |', 'Usuario tecnico |');
    }
    if (textoNormalizado.startsWith('Administrative user |')) {
      return textoNormalizado.replace('Administrative user |', 'Usuario administrativo |');
    }
  }
  return '';
}


function traducirContenido(texto, idioma) {
  const valor = String(texto || '');
  const inicio = valor.match(/^\s*/)[0];
  const fin = valor.match(/\s*$/)[0];
  const normalizado = normalizarClaveTraduccion(valor);
  if (!normalizado) {
    return valor;
  }
  const claveI18n = obtenerClaveI18nPorTexto(normalizado);
  const traduccionExacta = claveI18n ? obtenerTraduccionPorClave(claveI18n, idioma) : '';
  if (traduccionExacta) {
    return inicio + traduccionExacta + fin;
  }
  const traduccionVariable = traducirVariable(normalizado, idioma);
  if (traduccionVariable) {
    return inicio + traduccionVariable + fin;
  }
  return valor;
}


function t(texto) {
  return traducirContenido(texto, obtenerIdiomaActual()).trim();
}


function registrarElementosI18nEnNodo(raiz) {
  if (!raiz) {
    return;
  }
  const elementos = [];
  if (raiz.nodeType === 1) {
    elementos.push(raiz);
  }
  const descendientes = raiz.querySelectorAll ? raiz.querySelectorAll('*') : [];
  for (let i = 0; i < descendientes.length; i++) {
    elementos.push(descendientes[i]);
  }
  for (let i = 0; i < elementos.length; i++) {
    const elemento = elementos[i];
    if (elemento.closest('[data-clave-omitir]')) {
      continue;
    }
    for (let j = 0; j < ATRIBUTOS_I18N.length; j++) {
      const atributo = ATRIBUTOS_I18N[j];
      if (!elemento.hasAttribute(atributo)) {
        continue;
      }
      const claveAtributo = obtenerClaveI18nPorTexto(elemento.getAttribute(atributo));
      if (!claveAtributo) {
        continue;
      }
      elemento.setAttribute('data-clave-' + atributo, claveAtributo);
      if (!elemento.hasAttribute('data-clave')) {
        elemento.setAttribute('data-clave', claveAtributo);
        elemento.setAttribute('data-clave-destino', atributo);
      }
    }
  }

  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: function (nodo) {
      const padre = nodo.parentElement;
      if (!padre || padre.closest('[data-clave-omitir]')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(padre.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return obtenerClaveI18nPorTexto(nodo.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const nodos = [];
  while (walker.nextNode()) {
    nodos.push(walker.currentNode);
  }
  for (let i = 0; i < nodos.length; i++) {
    const padre = nodos[i].parentElement;
    const claveTexto = obtenerClaveI18nPorTexto(nodos[i].nodeValue);
    if (padre && claveTexto && padre.childElementCount === 0) {
      padre.setAttribute('data-clave', claveTexto);
    }
  }
}

function aplicarElementoI18n(elemento, idioma) {
  const clave = elemento.getAttribute('data-clave');
  const destino = elemento.getAttribute('data-clave-destino');
  if (clave) {
    const traduccion = obtenerTraduccionPorClave(clave, idioma);
    if (traduccion) {
      if (destino) {
        elemento.setAttribute(destino, traduccion);
      } else if (!['INPUT', 'TEXTAREA', 'IMG'].includes(elemento.tagName)) {
        elemento.textContent = traduccion;
      }
    }
  }
  for (let i = 0; i < ATRIBUTOS_I18N.length; i++) {
    const atributo = ATRIBUTOS_I18N[i];
    const claveAtributo = elemento.getAttribute('data-clave-' + atributo);
    const traduccionAtributo = claveAtributo
      ? obtenerTraduccionPorClave(claveAtributo, idioma)
      : '';
    if (traduccionAtributo) {
      elemento.setAttribute(atributo, traduccionAtributo);
    }
  }
}

function aplicarMetadatosI18n(idioma) {
  const claveTitulo = obtenerClaveI18nPorTexto(document.title);
  const traduccionTitulo = claveTitulo ? obtenerTraduccionPorClave(claveTitulo, idioma) : '';
  if (traduccionTitulo) {
    document.title = traduccionTitulo;
  }
  const metas = document.querySelectorAll('meta[name="description"], meta[property="og:description"]');
  for (let i = 0; i < metas.length; i++) {
    const contenido = metas[i].getAttribute('content');
    const claveMeta = obtenerClaveI18nPorTexto(contenido);
    const traduccionMeta = claveMeta ? obtenerTraduccionPorClave(claveMeta, idioma) : '';
    if (traduccionMeta) {
      metas[i].setAttribute('content', traduccionMeta);
    }
  }
}

function aplicarIdiomaEnDocumento(idioma) {
  const idiomaNormalizado = idioma === 'en' ? 'en' : 'es';
  document.documentElement.lang = idiomaNormalizado;
  document.documentElement.setAttribute('data-idioma', idiomaNormalizado);
  registrarElementosI18nEnNodo(document.body);
  const selectorI18n =
    '[data-clave], [data-clave-placeholder], [data-clave-aria-label], [data-clave-title], [data-clave-alt], [data-clave-data-label]';
  const elementos = document.body ? document.body.querySelectorAll(selectorI18n) : [];
  for (let i = 0; i < elementos.length; i++) {
    aplicarElementoI18n(elementos[i], idiomaNormalizado);
  }
  aplicarMetadatosI18n(idiomaNormalizado);
  return idiomaNormalizado;
}



function aplicarTraduccionesEnNodo(raiz, idioma) {
  if (!raiz) {
    return;
  }
  registrarElementosI18nEnNodo(raiz);
  const selectorI18n =
    '[data-clave], [data-clave-placeholder], [data-clave-aria-label], [data-clave-title], [data-clave-alt], [data-clave-data-label]';
  const elementosI18n = [];
  if (raiz.matches && raiz.matches(selectorI18n)) {
    elementosI18n.push(raiz);
  }
  const descendientesI18n = raiz.querySelectorAll ? raiz.querySelectorAll(selectorI18n) : [];
  for (let i = 0; i < descendientesI18n.length; i++) {
    elementosI18n.push(descendientesI18n[i]);
  }
  for (let i = 0; i < elementosI18n.length; i++) {
    aplicarElementoI18n(elementosI18n[i], idioma);
  }
  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: function (nodo) {
      const padre = nodo.parentElement;
      if (!padre || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(padre.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (padre.closest('[data-clave-omitir]')) {
        return NodeFilter.FILTER_REJECT;
      }
      const contenedorTraducible = padre.closest('[data-clave]');
      if (contenedorTraducible && !contenedorTraducible.hasAttribute('data-clave-destino')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!normalizarClaveTraduccion(nodo.nodeValue)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodos = [];
  while (walker.nextNode()) {
    nodos.push(walker.currentNode);
  }
  for (let i = 0; i < nodos.length; i++) {
    nodos[i].nodeValue = traducirContenido(nodos[i].nodeValue, idioma);
  }
  const elementos = raiz.querySelectorAll('*');
  for (let i = 0; i < elementos.length; i++) {
    for (let j = 0; j < ATRIBUTOS_I18N.length; j++) {
      const atributo = ATRIBUTOS_I18N[j];
      if (elementos[i].hasAttribute(atributo)) {
        elementos[i].setAttribute(
          atributo,
          traducirContenido(elementos[i].getAttribute(atributo), idioma).trim(),
        );
      }
    }
    if (elementos[i].matches('input[readonly], textarea[readonly]')) {
      elementos[i].value = traducirContenido(elementos[i].value, idioma).trim();
    }
  }
}


function sincronizarBotonesDeIdioma() {
  const idiomaActual = obtenerIdiomaActual();
  const botonesIdioma = document.querySelectorAll('[data-idioma-opcion]');
  for (let i = 0; i < botonesIdioma.length; i++) {
    const estaActivo = botonesIdioma[i].dataset.idiomaOpcion === idiomaActual;
    botonesIdioma[i].classList.toggle('segmented-option--active', estaActivo);
    botonesIdioma[i].setAttribute('aria-pressed', estaActivo ? 'true' : 'false');
  }
}


function aplicarIdioma(idioma) {
  const idiomaNormalizado = idioma === 'en' ? 'en' : 'es';
  try {
    window.localStorage.setItem(CLAVES_STORAGE.idioma, idiomaNormalizado);
  } catch (error) {
    /* sin acceso a localStorage directo */
  }
  aplicarIdiomaActualAlDom();
}


function aplicarIdiomaActualAlDom() {
  const idiomaActual = obtenerIdiomaActual();
  aplicarIdiomaEnDocumento(idiomaActual);
  aplicarTraduccionesEnNodo(document.body, idiomaActual);
  sincronizarBotonesDeIdioma();
}


function aplicarIdiomaGuardado() {
  aplicarIdioma(obtenerIdiomaActual());
}


function cerrarMenusDeCuenta() {
  const menus = document.querySelectorAll('[data-account-menu]');
  const disparadores = document.querySelectorAll('[data-account-menu-trigger]');
  const contenedores = document.querySelectorAll('[data-account-menu-root]');
  for (let i = 0; i < menus.length; i++) {
    menus[i].hidden = true;
  }
  for (let i = 0; i < disparadores.length; i++) {
    disparadores[i].setAttribute('aria-expanded', 'false');
  }
  for (let i = 0; i < contenedores.length; i++) {
    contenedores[i].classList.remove('barra-superior__account--open');
  }
}


function cerrarMenuPrincipalNavbar() {
  const navbars = document.querySelectorAll('[data-navbar-root]');
  const disparadores = document.querySelectorAll('[data-navbar-menu-trigger]');
  for (let i = 0; i < navbars.length; i++) {
    navbars[i].classList.remove('barra-superior--menu-open');
  }
  for (let i = 0; i < disparadores.length; i++) {
    disparadores[i].setAttribute('aria-expanded', 'false');
  }
}


function cerrarMenusNavbar() {
  cerrarMenusDeCuenta();
  cerrarMenuPrincipalNavbar();
}


function alternarMenuPrincipalNavbar(boton) {
  const navbar = boton.closest('[data-navbar-root]');
  if (!navbar) {
    return;
  }
  const estabaAbierto = navbar.classList.contains('barra-superior--menu-open');
  cerrarMenusDeCuenta();
  navbar.classList.toggle('barra-superior--menu-open', !estabaAbierto);
  boton.setAttribute('aria-expanded', estabaAbierto ? 'false' : 'true');
}


function alternarMenuDeCuenta(boton) {
  const contenedor = boton.closest('[data-account-menu-root]');
  if (!contenedor) {
    return;
  }
  const menu = contenedor.querySelector('[data-account-menu]');
  if (!menu) {
    return;
  }
  const estabaAbierto = !menu.hidden;
  cerrarMenusDeCuenta();
  cerrarMenuPrincipalNavbar();
  menu.hidden = estabaAbierto;
  boton.setAttribute('aria-expanded', estabaAbierto ? 'false' : 'true');
  contenedor.classList.toggle('barra-superior__account--open', !estabaAbierto);
  sincronizarBotonesDeTema();
  sincronizarBotonesDeIdioma();
}


function abrirModal(idDelModal) {
  const modal = document.getElementById(idDelModal);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}


function cerrarModal(idDelModal) {
  const modal = document.getElementById(idDelModal);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}


function alternarVisibilidadPassword(boton) {
  const input = document.getElementById(boton.getAttribute('data-toggle-password'));
  if (!input) {
    return;
  }
  const mostrar = input.type === 'password';
  input.type = mostrar ? 'text' : 'password';
  boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  boton.innerHTML =
    '<i data-lucide="' +
    (mostrar ? 'eye-off' : 'eye') +
    '" class="icon icon-sm regla-diseno-006"></i>';
  dibujarIconos();
}


function obtenerRaizSelectPersonalizado(select) {
  const siguiente = select ? select.nextElementSibling : null;
  return siguiente && siguiente.matches('[data-custom-select-root]') ? siguiente : null;
}


function obtenerSelectDeRaizPersonalizada(raiz) {
  const anterior = raiz ? raiz.previousElementSibling : null;
  return anterior && anterior.tagName === 'SELECT' ? anterior : null;
}


function cerrarSelectsPersonalizados(excepcion) {
  const selectsAbiertos = document.querySelectorAll('[data-custom-select-root].custom-select--open');
  for (let i = 0; i < selectsAbiertos.length; i++) {
    const raiz = selectsAbiertos[i];
    if (excepcion && raiz === excepcion) {
      continue;
    }
    const disparador = raiz.querySelector('[data-custom-select-trigger]');
    const lista = raiz.querySelector('[data-custom-select-list]');
    raiz.classList.remove('custom-select--open');
    if (disparador) {
      disparador.setAttribute('aria-expanded', 'false');
    }
    if (lista) {
      lista.hidden = true;
    }
  }
}


function obtenerTextoSelectPersonalizado(select) {
  const opcion = select.options[select.selectedIndex] || select.options[0];
  if (!opcion) {
    return 'Seleccionar';
  }
  return opcion.textContent.trim() || opcion.value || 'Seleccionar';
}


function crearOpcionesSelectPersonalizado(select) {
  let html = '';
  for (let i = 0; i < select.options.length; i++) {
    const opcion = select.options[i];
    const estaSeleccionada = opcion.selected;
    const estaDeshabilitada = opcion.disabled;
    const estaOculta = opcion.hidden;
    html +=
      '<button type="button" class="custom-select__option' +
      (estaSeleccionada ? ' custom-select__option--selected' : '') +
      (estaOculta ? ' custom-select__option--hidden' : '') +
      '" data-custom-select-option data-custom-select-index="' +
      i +
      '" role="option" aria-selected="' +
      (estaSeleccionada ? 'true' : 'false') +
      '"' +
      (estaDeshabilitada ? ' disabled aria-disabled="true"' : '') +
      '>' +
      escaparHtml(opcion.textContent.trim() || opcion.value) +
      '</button>';
  }
  return html;
}


function sincronizarSelectPersonalizado(select) {
  const raiz = obtenerRaizSelectPersonalizado(select);
  if (!raiz) {
    return;
  }
  const disparador = raiz.querySelector('[data-custom-select-trigger]');
  const etiqueta = raiz.querySelector('[data-custom-select-label]');
  const lista = raiz.querySelector('[data-custom-select-list]');
  if (etiqueta) {
    etiqueta.textContent = obtenerTextoSelectPersonalizado(select);
  }
  if (disparador) {
    disparador.disabled = select.disabled;
    disparador.setAttribute('aria-disabled', select.disabled ? 'true' : 'false');
  }
  if (lista) {
    lista.innerHTML = crearOpcionesSelectPersonalizado(select);
  }
  raiz.classList.toggle('custom-select--disabled', select.disabled);
}


function abrirSelectPersonalizado(raiz) {
  const disparador = raiz.querySelector('[data-custom-select-trigger]');
  const lista = raiz.querySelector('[data-custom-select-list]');
  cerrarSelectsPersonalizados(raiz);
  raiz.classList.add('custom-select--open');
  if (disparador) {
    disparador.setAttribute('aria-expanded', 'true');
  }
  if (lista) {
    lista.hidden = false;
  }
}


function alternarSelectPersonalizado(raiz) {
  if (raiz.classList.contains('custom-select--open')) {
    cerrarSelectsPersonalizados();
  } else {
    abrirSelectPersonalizado(raiz);
  }
}


function seleccionarOpcionPersonalizada(opcionPersonalizada) {
  if (opcionPersonalizada.disabled) {
    return;
  }
  const raiz = opcionPersonalizada.closest('[data-custom-select-root]');
  const select = obtenerSelectDeRaizPersonalizada(raiz);
  if (!select) {
    return;
  }
  const indice = Number(opcionPersonalizada.getAttribute('data-custom-select-index'));
  if (Number.isNaN(indice) || !select.options[indice]) {
    return;
  }
  select.selectedIndex = indice;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  sincronizarSelectPersonalizado(select);
  cerrarSelectsPersonalizados();
  const disparador = raiz.querySelector('[data-custom-select-trigger]');
  if (disparador) {
    disparador.focus();
  }
}


function inicializarSelectsPersonalizados(raiz) {
  const contenedor = raiz || document;
  const selects = [];
  if (contenedor.matches && contenedor.matches('select')) {
    selects.push(contenedor);
  }
  const encontrados = contenedor.querySelectorAll ? contenedor.querySelectorAll('select') : [];
  for (let i = 0; i < encontrados.length; i++) {
    selects.push(encontrados[i]);
  }
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    if (select.multiple || select.getAttribute('data-no-custom-select') === 'true') {
      continue;
    }
    select.classList.add('select-input--native');
    let raizSelect = obtenerRaizSelectPersonalizado(select);
    if (!raizSelect) {
      raizSelect = document.createElement('div');
      raizSelect.className = 'custom-select';
      raizSelect.setAttribute('data-custom-select-root', '');
      raizSelect.setAttribute('data-clave-omitir', 'true');
      raizSelect.innerHTML =
        '<button type="button" class="custom-select__trigger" data-custom-select-trigger aria-expanded="false">' +
        '<span data-custom-select-label></span>' +
        '</button>' +
        '<div class="custom-select__list" data-custom-select-list role="listbox" hidden></div>';
      select.insertAdjacentElement('afterend', raizSelect);
    }
    if (select.getAttribute('data-custom-select-bound') !== 'true') {
      select.setAttribute('data-custom-select-bound', 'true');
      select.tabIndex = -1;
      select.addEventListener('change', function () {
        sincronizarSelectPersonalizado(select);
      });
      select.addEventListener('input', function () {
        sincronizarSelectPersonalizado(select);
      });
    }
    sincronizarSelectPersonalizado(select);
  }
}


document.addEventListener('click', function (evento) {
  const elementoClickeado = evento.target;
  const botonSelectPersonalizado = elementoClickeado.closest('[data-custom-select-trigger]');
  if (botonSelectPersonalizado) {
    evento.preventDefault();
    const raizSelect = botonSelectPersonalizado.closest('[data-custom-select-root]');
    alternarSelectPersonalizado(raizSelect);
    return;
  }
  const opcionSelectPersonalizado = elementoClickeado.closest('[data-custom-select-option]');
  if (opcionSelectPersonalizado) {
    evento.preventDefault();
    seleccionarOpcionPersonalizada(opcionSelectPersonalizado);
    return;
  }
  if (!elementoClickeado.closest('[data-custom-select-root]')) {
    cerrarSelectsPersonalizados();
  }
  const botonPassword = elementoClickeado.closest('[data-toggle-password]');
  if (botonPassword) {
    alternarVisibilidadPassword(botonPassword);
    return;
  }
  const botonMenuNavbar = elementoClickeado.closest('[data-navbar-menu-trigger]');
  if (botonMenuNavbar) {
    evento.preventDefault();
    alternarMenuPrincipalNavbar(botonMenuNavbar);
    return;
  }
  const enlaceMenuNavbar = elementoClickeado.closest('[data-navbar-menu] a');
  if (enlaceMenuNavbar) {
    cerrarMenuPrincipalNavbar();
  }
  const botonAbrir = elementoClickeado.closest('[data-modal-open]');
  if (botonAbrir) {
    evento.preventDefault();
    abrirModal(botonAbrir.getAttribute('data-modal-open'));
    return;
  }
  const botonCerrar = elementoClickeado.closest('[data-modal-close]');
  if (botonCerrar) {
    const modalPadre = botonCerrar.closest('[data-modal]');
    if (modalPadre) {
      cerrarModal(modalPadre.id);
    }
    return;
  }
  const botonAprobarRegistro = elementoClickeado.closest('[data-aprobar-registro]');
  if (botonAprobarRegistro) {
    const respuesta = aprobarSolicitudRegistro(
      botonAprobarRegistro.getAttribute('data-aprobar-registro'),
    );
    alert(respuesta.mensaje);
    return;
  }
  const botonRechazarRegistro = elementoClickeado.closest('[data-rechazar-registro]');
  if (botonRechazarRegistro) {
    const respuesta = rechazarSolicitudRegistro(
      botonRechazarRegistro.getAttribute('data-rechazar-registro'),
    );
    alert(respuesta.mensaje);
    return;
  }
  const botonCuenta = elementoClickeado.closest('[data-account-menu-trigger]');
  if (botonCuenta) {
    evento.preventDefault();
    alternarMenuDeCuenta(botonCuenta);
    return;
  }
  const opcionTema = elementoClickeado.closest('[data-tema-opcion]');
  if (opcionTema) {
    aplicarTema(opcionTema.dataset.temaOpcion);
    return;
  }
  const opcionIdioma = elementoClickeado.closest('[data-idioma-opcion]');
  if (opcionIdioma) {
    aplicarIdioma(opcionIdioma.dataset.idiomaOpcion);
    sincronizarBotonesDeTema();
    return;
  }
  const botonLogout = elementoClickeado.closest('[data-logout-button]');
  if (botonLogout) {
    cerrarSesion();
    return;
  }
  const botonTema = elementoClickeado.closest('[data-tema-toggle]');
  if (botonTema) {
    alternarTema();
    return;
  }
  if (elementoClickeado.matches('[data-modal]')) {
    cerrarModal(elementoClickeado.id);
  }
  if (
    !elementoClickeado.closest('[data-account-menu-root]')
  ) {
    cerrarMenusNavbar();
  }
  if (!elementoClickeado.closest('[data-navbar-root]')) {
    cerrarMenuPrincipalNavbar();
  }
});


document.addEventListener('keydown', function (evento) {
  const disparadorSelect = evento.target.closest
    ? evento.target.closest('[data-custom-select-trigger]')
    : null;
  if (
    disparadorSelect &&
    (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'ArrowDown')
  ) {
    evento.preventDefault();
    abrirSelectPersonalizado(disparadorSelect.closest('[data-custom-select-root]'));
    return;
  }
  if (evento.key !== 'Escape') {
    return;
  }
  cerrarSelectsPersonalizados();
  const todosLosModales = document.querySelectorAll('[data-modal]');
  for (let i = 0; i < todosLosModales.length; i++) {
    const modal = todosLosModales[i];
    if (modal.style.display !== 'none') {
      cerrarModal(modal.id);
    }
  }
  cerrarMenusNavbar();
});


function activarBuscador(idDelInput, selectorDeFilas) {
  const input = document.getElementById(idDelInput);
  if (!input) {
    return;
  }
  input.addEventListener('input', function () {
    const textoBuscado = input.value.trim().toLowerCase();
    const filas = document.querySelectorAll(selectorDeFilas);
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const textoDeLaFila = fila.textContent.toLowerCase();
      const debeMostrarse = textoBuscado === '' || textoDeLaFila.includes(textoBuscado);
      fila.style.display = debeMostrarse ? '' : 'none';
    }
  });
}


function crearMensajeFormulario(texto, tipo, claseExtra) {
  const claseTipo =
    tipo === 'success'
      ? 'form-message--success'
      : tipo === 'info'
        ? 'form-message--info'
        : 'form-message--error';
  const extra = claseExtra ? ' ' + claseExtra : '';
  return '<div class="form-message ' + claseTipo + extra + '">' + escaparHtml(texto) + '</div>';
}


function mostrarMensajeFormulario(destino, texto, tipo, claseExtra) {
  const elemento = typeof destino === 'string' ? document.getElementById(destino) : destino;
  if (elemento) {
    elemento.innerHTML = crearMensajeFormulario(texto, tipo, claseExtra);
  }
}


function actualizarTextoSiExiste(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = texto;
  }
}


function crearOpcionesSelect(lista, opcionInicial, obtenerValor, obtenerEtiqueta) {
  let html = opcionInicial || '';
  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];
    const valor = obtenerValor ? obtenerValor(item) : item;
    const etiqueta = obtenerEtiqueta ? obtenerEtiqueta(item) : item;
    html +=
      '<option value="' +
      escaparHtml(valor) +
      '">' +
      escaparHtml(etiqueta) +
      '</option>';
  }
  return html;
}


function crearBotonCambioEstado(idRegistro, opcion) {
  const dataClave = opcion.clave ? ' data-clave="' + opcion.clave + '"' : '';
  return (
    '<button class="boton ' +
    opcion.clase +
    ' boton--sm regla-diseno-034" type="button" ' +
    opcion.atributoId +
    '="' +
    escaparHtml(idRegistro) +
    '" ' +
    opcion.atributoEstado +
    '="' +
    escaparHtml(opcion.estado) +
    '"' +
    dataClave +
    '>' +
    escaparHtml(opcion.etiqueta) +
    '</button>'
  );
}


function crearBotonesCambioEstado(registro, opciones) {
  const botones = [];
  for (let i = 0; i < opciones.length; i++) {
    if (registro.estado !== opciones[i].estado) {
      botones.push(crearBotonCambioEstado(registro.id, opciones[i]));
    }
  }
  return botones.join('');
}


function obtenerValorCampoFiltro(registro, campo) {
  if (typeof campo === 'function') {
    return campo(registro);
  }
  return registro && typeof registro[campo] !== 'undefined' ? registro[campo] : '';
}


function normalizarFechaFiltro(valor) {
  if (!valor) {
    return '';
  }
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const partes = texto.split('/');
    return partes[2] + '-' + partes[1] + '-' + partes[0];
  }
  const fecha = new Date(texto);
  if (!Number.isNaN(fecha.getTime())) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return anio + '-' + mes + '-' + dia;
  }
  return texto;
}


function registroCumpleFiltro(registro, filtro) {
  const valorFiltro = String(filtro.valor || '').trim();
  if (!valorFiltro) {
    return true;
  }
  const campos = Array.isArray(filtro.campos) ? filtro.campos : [filtro.campo];
  for (let i = 0; i < campos.length; i++) {
    const valorRegistro = obtenerValorCampoFiltro(registro, campos[i]);
    if (filtro.tipo === 'fecha') {
      if (normalizarFechaFiltro(valorRegistro) === normalizarFechaFiltro(valorFiltro)) {
        return true;
      }
    } else if (filtro.comparacion === 'igual') {
      if (normalizarTexto(valorRegistro) === normalizarTexto(valorFiltro)) {
        return true;
      }
    } else if (normalizarTexto(valorRegistro).includes(normalizarTexto(valorFiltro))) {
      return true;
    }
  }
  return false;
}


function filtrarRegistrosPorCampos(registros, filtros) {
  const filtrados = [];
  for (let i = 0; i < registros.length; i++) {
    let coincide = true;
    for (let j = 0; j < filtros.length; j++) {
      if (!registroCumpleFiltro(registros[i], filtros[j])) {
        coincide = false;
        break;
      }
    }
    if (coincide) {
      filtrados.push(registros[i]);
    }
  }
  return filtrados;
}


function obtenerValoresUnicosFiltro(registros, campos) {
  const valores = [];
  const indice = {};
  const listaCampos = Array.isArray(campos) ? campos : [campos];
  for (let i = 0; i < registros.length; i++) {
    for (let j = 0; j < listaCampos.length; j++) {
      const valor = String(obtenerValorCampoFiltro(registros[i], listaCampos[j]) || '').trim();
      const clave = normalizarTexto(valor);
      if (valor && !indice[clave]) {
        indice[clave] = true;
        valores.push(valor);
      }
    }
  }
  valores.sort(function (a, b) {
    return a.localeCompare(b, 'es');
  });
  return valores;
}


function crearOpcionesFiltro(valores, etiquetaInicial) {
  return crearOpcionesSelect(valores, '<option value="">' + escaparHtml(etiquetaInicial) + '</option>');
}


function obtenerValorCampoFormulario(id) {
  const campo = document.getElementById(id);
  return campo ? campo.value : '';
}


function asignarValorCampoFormulario(id, valor) {
  const campo = document.getElementById(id);
  if (campo) {
    campo.value = valor;
  }
}


function guardarValoresCampos(ids) {
  const valores = {};
  for (let i = 0; i < ids.length; i++) {
    valores[ids[i]] = obtenerValorCampoFormulario(ids[i]);
  }
  return valores;
}


function restaurarValoresCampos(valores) {
  const ids = Object.keys(valores);
  for (let i = 0; i < ids.length; i++) {
    asignarValorCampoFormulario(ids[i], valores[ids[i]]);
  }
}


function crearLabelFiltro(id, etiqueta, atributosExtra) {
  const atributos = atributosExtra ? ' ' + atributosExtra : '';
  return '<label for="' + id + '"' + atributos + '>' + escaparHtml(etiqueta) + '</label>';
}


function crearCampoFiltroSelect(id, etiqueta, opcionesHtml, atributosLabel) {
  return (
    '<div class="input-stack regla-diseno-025">' +
    crearLabelFiltro(id, etiqueta, atributosLabel) +
    '<select class="select-input regla-diseno-026" id="' +
    id +
    '">' +
    opcionesHtml +
    '</select></div>'
  );
}


function crearCampoFiltroFecha(id, etiqueta, atributosLabel) {
  return (
    '<div class="input-stack regla-diseno-025">' +
    crearLabelFiltro(id, etiqueta, atributosLabel) +
    '<input class="text-input regla-diseno-026" id="' +
    id +
    '" type="date" /></div>'
  );
}


function obtenerParametroDeUrl(nombreDelParametro) {
  const parametros = new URLSearchParams(window.location.search);
  return parametros.get(nombreDelParametro);
}


function clonarProfundo(valor) {
  return JSON.parse(JSON.stringify(valor));
}


function leerStorage(clave, valorPorDefecto) {
  try {
    const valor = window.localStorage.getItem(clave);
    if (!valor) {
      return clonarProfundo(valorPorDefecto);
    }
    return JSON.parse(valor);
  } catch (error) {
    return clonarProfundo(valorPorDefecto);
  }
}


function guardarStorage(clave, valor) {
  window.localStorage.setItem(clave, JSON.stringify(valor));
}


function escaparHtml(valor) {
  const textoBase = valor === null || typeof valor === 'undefined' ? '' : String(valor);
  return textoBase
    .replaceAll('contrasena', 'contraseña')
    .replaceAll('Contrasena', 'Contraseña')
    .replaceAll('Espanol', 'Español')
    .replaceAll('Manana', 'Mañana')
    .replaceAll('manana', 'mañana')
    .replaceAll('senal', 'señal')
    .replaceAll('Senal', 'Señal')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validarFormularioCliente(formulario, mostrarMensaje) {
  if (!formulario || typeof formulario.checkValidity !== 'function') {
    return true;
  }
  if (formulario.checkValidity()) {
    return true;
  }
  if (typeof formulario.reportValidity === 'function') {
    formulario.reportValidity();
  }
  if (typeof mostrarMensaje === 'function') {
    mostrarMensaje('Revisa los campos marcados antes de continuar.', 'error');
  }
  return false;
}

function manejarErrorCliente(error, mostrarMensaje, mensaje) {
  if (window.console && typeof window.console.error === 'function') {
    window.console.error(error);
  }
  if (typeof mostrarMensaje === 'function') {
    mostrarMensaje(mensaje || 'No se pudo completar la accion. Intenta nuevamente.', 'error');
  }
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase();
}

function normalizarCedula(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function validarContrasenaSegura(contrasena) {
  const valor = String(contrasena || '');
  const tieneLargoMinimo = valor.length >= 7;
  const tieneMayuscula = /[A-Z]/.test(valor);
  const tieneMinuscula = /[a-z]/.test(valor);
  const tieneNumero = /\d/.test(valor);
  const cumpleReglas = tieneLargoMinimo && tieneMayuscula && tieneMinuscula && tieneNumero;
  if (!cumpleReglas) {
    return {
      ok: false,
      mensaje:
        'La contraseña necesita al menos 7 caracteres, una mayuscula, una minuscula y un numero.',
    };
  }
  return { ok: true, mensaje: '' };
}

function generarId(prefijo) {
  const bloque = Date.now().toString().slice(-6);
  const aleatorio = Math.floor(Math.random() * 90 + 10);
  return prefijo + '-' + bloque + aleatorio;
}

function obtenerIniciales(nombreCompleto) {
  const nombre = String(nombreCompleto || '').trim();
  if (!nombre) {
    return 'US';
  }
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  const primeraInicial = partes[0][0];
  const segundaInicial = partes[1][0];
  return (primeraInicial + segundaInicial).toUpperCase();
}

function obtenerNombreCorto(nombreCompleto) {
  const partes = String(nombreCompleto || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) {
    return 'Usuario';
  }
  return partes[0];
}

function obtenerRolCanonico(rol) {
  const valor = normalizarTexto(rol);
  if (valor.includes('solicit')) {
    return 'solicitante';
  }
  if (valor.includes('tecn')) {
    return 'tecnico';
  }
  if (valor.includes('admin')) {
    return 'administrativo';
  }
  return 'solicitante';
}

function obtenerEtiquetaRol(rol) {
  const rolCanonico = obtenerRolCanonico(rol);
  if (rolCanonico === 'tecnico') {
    return 'Usuario tecnico';
  }
  if (rolCanonico === 'administrativo') {
    return 'Usuario administrativo';
  }
  return 'Usuario solicitante';
}

function usuarioEsSolicitante(usuarioActual) {
  return obtenerRolCanonico(usuarioActual && usuarioActual.rol) === 'solicitante';
}
function usuarioEsTecnico(usuarioActual) {
  return obtenerRolCanonico(usuarioActual && usuarioActual.rol) === 'tecnico';
}
function usuarioEsAdministrativo(usuarioActual) {
  return obtenerRolCanonico(usuarioActual && usuarioActual.rol) === 'administrativo';
}
function usuarioTieneVistaGlobal(usuarioActual) {
  return !usuarioEsSolicitante(usuarioActual);
}
function usuarioPuedeSolicitar(usuarioActual) {
  return usuarioEsSolicitante(usuarioActual) || usuarioEsAdministrativo(usuarioActual);
}
function usuarioPuedeGestionarOperaciones(usuarioActual) {
  return usuarioEsTecnico(usuarioActual) || usuarioEsAdministrativo(usuarioActual);
}
function usuarioPuedeAccederAInventario(usuarioActual) {
  const rol = obtenerRolCanonico(usuarioActual && usuarioActual.rol);
  return rol === 'tecnico' || rol === 'administrativo';
}
function usuarioPuedeAccederAPlanillaTA(usuarioActual) {
  return usuarioPuedeGestionarOperaciones(usuarioActual);
}
function usuarioPuedeAccederACalendarioTA(usuarioActual) {
  return usuarioPuedeGestionarOperaciones(usuarioActual);
}

function obtenerIdsPersonalBajaTA() {
  return leerStorage(CLAVES_STORAGE.personalBajaTA, []);
}

function guardarIdsPersonalBajaTA(idsPersonal) {
  guardarStorage(CLAVES_STORAGE.personalBajaTA, idsPersonal);
}

function usuarioEstaDadoDeBajaTA(usuarioId) {
  const idsPersonal = obtenerIdsPersonalBajaTA();
  for (let i = 0; i < idsPersonal.length; i++) {
    if (idsPersonal[i] === usuarioId) {
      return true;
    }
  }
  return false;
}

function usuarioEsPersonalDelPlantel(usuario) {
  const rol = obtenerRolCanonico(usuario && usuario.rol);
  return (
    (rol === 'tecnico' || rol === 'administrativo') &&
    !usuarioEstaDadoDeBajaTA(usuario && usuario.id)
  );
}

function obtenerPersonalDelPlantel() {
  const usuarios = obtenerUsuariosRegistrados();
  const personal = [];
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarioEsPersonalDelPlantel(usuarios[i])) {
      personal.push(usuarios[i]);
    }
  }
  personal.sort(function (a, b) {
    const rolA = obtenerRolCanonico(a.rol);
    const rolB = obtenerRolCanonico(b.rol);
    if (rolA !== rolB) {
      if (rolA === 'administrativo') {
        return -1;
      }
      if (rolB === 'administrativo') {
        return 1;
      }
    }
    return a.nombreCompleto.localeCompare(b.nombreCompleto);
  });
  return personal;
}

function obtenerTecnicosDelPlantel() {
  const usuarios = obtenerUsuariosRegistrados();
  const tecnicos = [];
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarioEsTecnico(usuarios[i]) && !usuarioEstaDadoDeBajaTA(usuarios[i].id)) {
      tecnicos.push(usuarios[i]);
    }
  }
  tecnicos.sort(function (a, b) {
    return a.nombreCompleto.localeCompare(b.nombreCompleto);
  });
  return tecnicos;
}

function buscarUsuarioPorId(usuarioId) {
  const usuarios = obtenerUsuariosRegistrados();
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarios[i].id === usuarioId) {
      return usuarios[i];
    }
  }
  return null;
}

function obtenerNombreUsuarioPorId(usuarioId) {
  const usuarioEncontrado = buscarUsuarioPorId(usuarioId);
  return usuarioEncontrado ? usuarioEncontrado.nombreCompleto : 'Tecnico sin asignar';
}

function usuarioPuedeEditarParcelaPlanilla(usuarioIdParcela, usuarioActual) {
  if (!usuarioActual || !usuarioIdParcela) {
    return false;
  }
  if (usuarioEsAdministrativo(usuarioActual)) {
    return true;
  }
  if (usuarioEsTecnico(usuarioActual) && usuarioActual.id === usuarioIdParcela) {
    return true;
  }
  return false;
}

function obtenerModuloPorId(idModulo) {
  for (let i = 0; i < modulosDelPortal.length; i++) {
    if (modulosDelPortal[i].id === idModulo) {
      return modulosDelPortal[i];
    }
  }
  return null;
}

function obtenerModulosDisponiblesParaUsuario(usuarioActual) {
  const rol = obtenerRolCanonico(usuarioActual && usuarioActual.rol);
  const modulosVisibles = [];
  for (let i = 0; i < modulosDelPortal.length; i++) {
    const modulo = modulosDelPortal[i];
    if (!modulo.rolesPermitidos || modulo.rolesPermitidos.includes(rol)) {
      modulosVisibles.push(modulo);
    }
  }
  return modulosVisibles;
}

function obtenerRutasAutorizadasParaUsuario(usuarioActual) {
  const modulos = obtenerModulosDisponiblesParaUsuario(usuarioActual);
  const rutas = ['home.html', 'index.html'];
  for (let i = 0; i < modulos.length; i++) {
    rutas.push(modulos[i].enlace);
  }
  return rutas;
}

function registroPerteneceAUsuario(registro, usuarioActual) {
  if (!usuarioActual || !registro) {
    return false;
  }
  if (registro.solicitanteId) {
    return registro.solicitanteId === usuarioActual.id;
  }
  return registro.solicitante === usuarioActual.nombreCompleto;
}

function filtrarRegistrosVisibles(registros, usuarioActual) {
  if (usuarioTieneVistaGlobal(usuarioActual)) {
    return registros.slice();
  }
  const visibles = [];
  for (let i = 0; i < registros.length; i++) {
    if (registroPerteneceAUsuario(registros[i], usuarioActual)) {
      visibles.push(registros[i]);
    }
  }
  return visibles;
}

function formatearFechaHumana(valor) {
  if (!valor) {
    return '';
  }
  if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    return valor;
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }
  return fecha
    .toLocaleString('es-UY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: valor.includes && valor.includes('T') ? '2-digit' : undefined,
      minute: valor.includes && valor.includes('T') ? '2-digit' : undefined,
    })
    .replace(',', ' |');
}

function obtenerClaseDeEstado(estado) {
  const valor = normalizarTexto(estado);
  if (
    valor.includes('aprob') ||
    valor.includes('resuelto') ||
    valor.includes('activo') ||
    valor.includes('complet') ||
    valor.includes('leida')
  ) {
    return 'success';
  }
  if (valor.includes('pend')) {
    return 'warn';
  }
  if (
    valor.includes('revision') ||
    valor.includes('proceso') ||
    valor.includes('nueva') ||
    valor.includes('nuevo')
  ) {
    return 'info';
  }
  if (
    valor.includes('rechaz') ||
    valor.includes('cancel') ||
    valor.includes('baja') ||
    valor.includes('deneg')
  ) {
    return 'danger';
  }
  return 'primary';
}

function crearIdDeSeccionInventario(nombre) {
  const base = String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || generarId('SEC').toLowerCase();
}

function obtenerFechaCortaInventario() {
  return new Date().toLocaleDateString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function obtenerTipoEquipoInventario(tipo) {
  const valor = String(tipo || '').trim();
  for (let i = 0; i < tiposDeEquipoInventario.length; i++) {
    if (tiposDeEquipoInventario[i].valor === valor) {
      return tiposDeEquipoInventario[i];
    }
  }
  return tiposDeEquipoInventario[0];
}

function obtenerIconoEquipoInventario(tipo) {
  return obtenerTipoEquipoInventario(tipo).icono;
}

function obtenerEtiquetaTipoEquipoInventario(tipo) {
  return obtenerTipoEquipoInventario(tipo).etiqueta;
}

function obtenerSeccionesInventario() {
  const seccionesGuardadas = leerStorage(CLAVES_STORAGE.seccionesInventario, secciones);
  const equiposGuardados = leerStorage(CLAVES_STORAGE.equiposInventario, todosLosEquipos);
  const cantidadesPorSeccion = {};
  for (let i = 0; i < equiposGuardados.length; i++) {
    const equipo = equiposGuardados[i];
    if (!equipo.seccionId) {
      continue;
    }
    cantidadesPorSeccion[equipo.seccionId] = (cantidadesPorSeccion[equipo.seccionId] || 0) + 1;
  }
  const resultado = [];
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    resultado.push(
      Object.assign({}, seccionesGuardadas[i], {
        icono: seccionesGuardadas[i].icono || 'building-2',
        actualizado: seccionesGuardadas[i].actualizado || 'hoy',
        cantidadEquipos: cantidadesPorSeccion[seccionesGuardadas[i].id] || 0,
      }),
    );
  }
  return resultado;
}

function guardarSeccionesInventario(seccionesGuardadas) {
  guardarStorage(CLAVES_STORAGE.seccionesInventario, seccionesGuardadas);
}

function obtenerSeccionInventarioPorId(seccionId) {
  const seccionesGuardadas = obtenerSeccionesInventario();
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (seccionesGuardadas[i].id === seccionId) {
      return seccionesGuardadas[i];
    }
  }
  return null;
}

function obtenerLugaresDisponibles() {
  const seccionesGuardadas = obtenerSeccionesInventario();
  const lugares = [];
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    lugares.push(seccionesGuardadas[i].nombre);
  }
  return lugares;
}

function normalizarEquipoInventario(equipo) {
  const tipo = obtenerTipoEquipoInventario(equipo && equipo.tipo);
  return Object.assign({}, equipo, {
    tipo: tipo.valor,
    tipoEtiqueta: equipo.tipoEtiqueta || tipo.etiqueta,
    icono: equipo.icono || tipo.icono,
    estado: equipo.estado || 'Activo',
    actualizado: equipo.actualizado || 'hoy',
  });
}

function obtenerEquiposInventario() {
  const equiposGuardados = leerStorage(CLAVES_STORAGE.equiposInventario, todosLosEquipos);
  const equiposNormalizados = [];
  for (let i = 0; i < equiposGuardados.length; i++) {
    equiposNormalizados.push(normalizarEquipoInventario(equiposGuardados[i]));
  }
  return equiposNormalizados;
}

function guardarEquiposInventario(equiposGuardados) {
  guardarStorage(CLAVES_STORAGE.equiposInventario, equiposGuardados);
}

function obtenerEquiposPorSeccionInventario(seccionId) {
  const equiposGuardados = obtenerEquiposInventario();
  const equiposFiltrados = [];
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].seccionId === seccionId) {
      equiposFiltrados.push(equiposGuardados[i]);
    }
  }
  return equiposFiltrados;
}

function obtenerEquipoInventarioPorId(equipoId) {
  const equiposGuardados = obtenerEquiposInventario();
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].id === equipoId) {
      return equiposGuardados[i];
    }
  }
  return null;
}

function obtenerHistorialInventario() {
  return leerStorage(CLAVES_STORAGE.historialInventario, historialDeCambios);
}

function guardarHistorialInventario(historialGuardado) {
  guardarStorage(CLAVES_STORAGE.historialInventario, historialGuardado);
}

function obtenerImagenesInventario() {
  return leerStorage(CLAVES_STORAGE.imagenesInventario, imagenesDeSecciones);
}

function registrarCambioInventario(datos) {
  const historialGuardado = obtenerHistorialInventario();
  const usuarioActual = obtenerUsuarioActual();
  const ahora = new Date();
  historialGuardado.unshift({
    color: datos.color || 'azul',
    titulo: datos.titulo,
    etiqueta: datos.etiqueta,
    colorEtiqueta: datos.colorEtiqueta || 'info',
    descripcion: datos.descripcion,
    autor: usuarioActual && usuarioActual.nombreCompleto ? usuarioActual.nombreCompleto : 'Sistema',
    fecha: ahora.toLocaleDateString('es-UY'),
    hora: ahora.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
  });
  guardarHistorialInventario(historialGuardado);
}

function actualizarFechaSeccionInventario(seccionId) {
  const seccionesGuardadas = leerStorage(CLAVES_STORAGE.seccionesInventario, secciones);
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (seccionesGuardadas[i].id === seccionId) {
      seccionesGuardadas[i].actualizado = 'hoy';
      break;
    }
  }
  guardarSeccionesInventario(seccionesGuardadas);
}

function generarIdEquipoInventario(tipo) {
  const infoTipo = obtenerTipoEquipoInventario(tipo);
  const equiposGuardados = obtenerEquiposInventario();
  let id = '';
  let existe = true;
  while (existe) {
    id = infoTipo.prefijo + '-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 90 + 10);
    existe = false;
    for (let i = 0; i < equiposGuardados.length; i++) {
      if (equiposGuardados[i].id === id) {
        existe = true;
        break;
      }
    }
  }
  return id;
}

function guardarNuevaSeccionInventario(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para crear secciones.' };
  }
  const nombre = String(datos && datos.nombre ? datos.nombre : '').trim();
  if (!nombre) {
    return { ok: false, mensaje: 'Escribi un nombre para la seccion.' };
  }
  const seccionesGuardadas = leerStorage(CLAVES_STORAGE.seccionesInventario, secciones);
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (normalizarTexto(seccionesGuardadas[i].nombre) === normalizarTexto(nombre)) {
      return { ok: false, mensaje: 'Ya existe una seccion con ese nombre.' };
    }
  }
  const idBase = crearIdDeSeccionInventario(nombre);
  let id = idBase;
  let contador = 2;
  let idExiste = true;
  while (idExiste) {
    idExiste = false;
    for (let i = 0; i < seccionesGuardadas.length; i++) {
      if (seccionesGuardadas[i].id === id) {
        idExiste = true;
        id = idBase + '-' + contador;
        contador++;
        break;
      }
    }
  }
  const nuevaSeccion = {
    id: id,
    nombre: nombre,
    icono: 'building-2',
    actualizado: 'hoy',
    cantidadEquipos: 0,
  };
  seccionesGuardadas.push(nuevaSeccion);
  guardarSeccionesInventario(seccionesGuardadas);
  registrarCambioInventario({
    color: 'azul',
    titulo: 'Seccion creada',
    etiqueta: 'Nueva seccion',
    colorEtiqueta: 'info',
    descripcion: 'Se creo la seccion "' + nombre + '".',
  });
  return { ok: true, mensaje: 'Seccion creada. Ya aparece en inventario.', seccion: nuevaSeccion };
}

function eliminarSeccionInventario(seccionId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de baja secciones.' };
  }
  const seccionesGuardadas = leerStorage(CLAVES_STORAGE.seccionesInventario, secciones);
  let seccionEliminada = null;
  const seccionesRestantes = [];
  for (let i = 0; i < seccionesGuardadas.length; i++) {
    if (seccionesGuardadas[i].id === seccionId) {
      seccionEliminada = seccionesGuardadas[i];
    } else {
      seccionesRestantes.push(seccionesGuardadas[i]);
    }
  }
  if (!seccionEliminada) {
    return { ok: false, mensaje: 'No encontramos esa seccion.' };
  }
  const equiposGuardados = obtenerEquiposInventario();
  const equiposRestantes = [];
  let equiposDadosDeBaja = 0;
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].seccionId === seccionId) {
      equiposDadosDeBaja++;
    } else {
      equiposRestantes.push(equiposGuardados[i]);
    }
  }
  guardarSeccionesInventario(seccionesRestantes);
  guardarEquiposInventario(equiposRestantes);
  registrarCambioInventario({
    color: 'rojo',
    titulo: 'Seccion dada de baja',
    etiqueta: 'Baja',
    colorEtiqueta: 'danger',
    descripcion:
      'Se dio de baja la seccion "' +
      seccionEliminada.nombre +
      '" junto con ' +
      equiposDadosDeBaja +
      ' equipos asociados.',
  });
  return {
    ok: true,
    mensaje: 'Seccion dada de baja. Tambien se retiraron sus equipos asociados.',
    seccion: seccionEliminada,
  };
}

function guardarNuevoEquipoInventario(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de alta equipos.' };
  }
  const tipoValor = String(datos && datos.tipo ? datos.tipo : '').trim();
  let tipo = null;
  for (let i = 0; i < tiposDeEquipoInventario.length; i++) {
    if (tiposDeEquipoInventario[i].valor === tipoValor) {
      tipo = tiposDeEquipoInventario[i];
      break;
    }
  }
  if (!tipo) {
    return { ok: false, mensaje: 'Elegí un tipo de equipo valido.' };
  }
  const seccion = obtenerSeccionInventarioPorId(datos && datos.seccionId);
  if (!seccion) {
    return { ok: false, mensaje: 'Elegí una seccion valida.' };
  }
  const id = generarIdEquipoInventario(tipo.valor);
  const nombre =
    String(datos && datos.nombre ? datos.nombre : '').trim() || tipo.etiqueta + ' ' + id;
  const nuevoEquipo = {
    id: id,
    nombre: nombre,
    tipo: tipo.valor,
    tipoEtiqueta: tipo.etiqueta,
    icono: tipo.icono,
    seccionId: seccion.id,
    seccion: seccion.nombre,
    fechaAlta: fechaIsoLocal(new Date()),
    actualizado: 'hoy',
    estado: 'Activo',
    observaciones: String(datos && datos.observaciones ? datos.observaciones : '').trim(),
  };
  const equiposGuardados = obtenerEquiposInventario();
  equiposGuardados.unshift(nuevoEquipo);
  guardarEquiposInventario(equiposGuardados);
  actualizarFechaSeccionInventario(seccion.id);
  registrarCambioInventario({
    color: 'verde',
    titulo: 'Equipo agregado al inventario',
    etiqueta: 'Alta',
    colorEtiqueta: 'success',
    descripcion:
      'Se agrego "' + nombre + '" (' + id + ') a la seccion "' + seccion.nombre + '".',
  });
  return { ok: true, mensaje: 'Equipo dado de alta. Ya aparece en la seccion.', equipo: nuevoEquipo };
}

function eliminarEquipoInventario(equipoId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederAInventario(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para dar de baja equipos.' };
  }
  const equiposGuardados = obtenerEquiposInventario();
  const equiposRestantes = [];
  let equipoEliminado = null;
  for (let i = 0; i < equiposGuardados.length; i++) {
    if (equiposGuardados[i].id === equipoId) {
      equipoEliminado = equiposGuardados[i];
    } else {
      equiposRestantes.push(equiposGuardados[i]);
    }
  }
  if (!equipoEliminado) {
    return { ok: false, mensaje: 'No encontramos ese equipo.' };
  }
  guardarEquiposInventario(equiposRestantes);
  actualizarFechaSeccionInventario(equipoEliminado.seccionId);
  registrarCambioInventario({
    color: 'rojo',
    titulo: 'Equipo dado de baja',
    etiqueta: 'Baja',
    colorEtiqueta: 'danger',
    descripcion:
      'Se dio de baja "' +
      equipoEliminado.nombre +
      '" (' +
      equipoEliminado.id +
      ') de la seccion "' +
      equipoEliminado.seccion +
      '".',
  });
  return { ok: true, mensaje: 'Equipo dado de baja. Ya no aparece en inventario.', equipo: equipoEliminado };
}

function limpiarDatosSemillaOperativos() {
  if (leerStorage(CLAVES_STORAGE.limpiezaSemillas, false)) {
    return;
  }
  function quitarIdsSemilla(clave, idsSemilla) {
    const registros = leerStorage(clave, []);
    const registrosFiltrados = [];
    let cambios = false;
    for (let i = 0; i < registros.length; i++) {
      if (idsSemilla.includes(registros[i].id)) {
        cambios = true;
      } else {
        registrosFiltrados.push(registros[i]);
      }
    }
    if (cambios) {
      guardarStorage(clave, registrosFiltrados);
    }
  }
  quitarIdsSemilla(CLAVES_STORAGE.prestamos, ['PRE-001', 'PRE-002', 'PRE-003']);
  quitarIdsSemilla(CLAVES_STORAGE.tickets, ['SUP-001', 'SUP-002']);
  quitarIdsSemilla(CLAVES_STORAGE.solicitudes, ['SER-001', 'SER-002']);
  quitarIdsSemilla(CLAVES_STORAGE.tareasCalendarioTA, [
    'TAR-001',
    'TAR-002',
    'TAR-003',
    'TAR-004',
    'TAR-005',
  ]);
  const planillas = leerStorage(CLAVES_STORAGE.planillaTA, []);
  const fragmentosPlanillaSemilla = [
    'Revisar las solicitudes de prestamo',
    'Revision de solicitudes de prestamo',
    'Revisar equipos en Laboratorio 2',
    'Atencion de tickets de soporte',
    'Diagnosticar conectividad en Teorico',
    'Probar proyector y audio',
    'Hacer mantenimiento preventivo',
    'Mantenimiento preventivo de PCs',
  ];
  let cambiosPlanilla = false;
  for (let i = 0; i < planillas.length; i++) {
    const tareas = String(planillas[i].tareasDelDia || '');
    for (let j = 0; j < fragmentosPlanillaSemilla.length; j++) {
      if (tareas.includes(fragmentosPlanillaSemilla[j])) {
        planillas[i].tareasDelDia = '';
        planillas[i].actualizadoEn = new Date().toISOString();
        cambiosPlanilla = true;
        break;
      }
    }
  }
  if (cambiosPlanilla) {
    guardarStorage(CLAVES_STORAGE.planillaTA, planillas);
  }
  guardarStorage(CLAVES_STORAGE.limpiezaSemillas, true);
}

function inicializarColeccionSiHaceFalta(clave, semilla) {
  if (!window.localStorage.getItem(clave)) {
    guardarStorage(clave, clonarProfundo(semilla));
  }
}

function sincronizarUsuariosSemilla() {
  const usuariosGuardados = leerStorage(CLAVES_STORAGE.usuarios, usuariosSemilla);
  let cambios = false;
  let usuarioActualizado = false;
  for (let i = 0; i < usuariosGuardados.length; i++) {
    const rolCorregido = obtenerEtiquetaRol(usuariosGuardados[i].rol);
    if (usuariosGuardados[i].rol !== rolCorregido) {
      usuariosGuardados[i].rol = rolCorregido;
      cambios = true;
    }
  }
  for (let i = 0; i < usuariosSemilla.length; i++) {
    const usuarioSemilla = usuariosSemilla[i];
    let existe = false;
    for (let j = 0; j < usuariosGuardados.length; j++) {
      const coincideCedula =
        normalizarCedula(usuariosGuardados[j].cedula) === normalizarCedula(usuarioSemilla.cedula);
      const coincideCorreo =
        normalizarTexto(usuariosGuardados[j].correo) === normalizarTexto(usuarioSemilla.correo);
      if (coincideCedula || coincideCorreo) {
        existe = true;
        break;
      }
    }
    if (!existe) {
      usuariosGuardados.push(clonarProfundo(usuarioSemilla));
      cambios = true;
    }
  }
  if (cambios) {
    guardarUsuariosRegistrados(usuariosGuardados);
  }
  const usuarioEnSesion = obtenerUsuarioActual();
  if (usuarioEnSesion) {
    for (let i = 0; i < usuariosGuardados.length; i++) {
      if (
        usuariosGuardados[i].id === usuarioEnSesion.id ||
        normalizarCedula(usuariosGuardados[i].cedula) ===
          normalizarCedula(usuarioEnSesion.cedula) ||
        normalizarTexto(usuariosGuardados[i].correo) === normalizarTexto(usuarioEnSesion.correo)
      ) {
        guardarUsuarioActual(usuariosGuardados[i]);
        usuarioActualizado = true;
        break;
      }
    }
  }
  return usuarioActualizado;
}

function sincronizarPlanillaTASemilla() {
  const planillas = leerStorage(CLAVES_STORAGE.planillaTA, planillaTASemilla);
  const usuarios = leerStorage(CLAVES_STORAGE.usuarios, usuariosSemilla);
  const idsPersonalBaja = obtenerIdsPersonalBajaTA();
  let cambios = false;
  const idsConRegistro = {};
  const idsDadosDeBaja = {};
  for (let i = 0; i < idsPersonalBaja.length; i++) {
    idsDadosDeBaja[idsPersonalBaja[i]] = true;
  }
  for (let i = 0; i < planillas.length; i++) {
    idsConRegistro[planillas[i].usuarioId] = true;
  }
  for (let i = 0; i < planillaTASemilla.length; i++) {
    const semilla = planillaTASemilla[i];
    if (idsDadosDeBaja[semilla.usuarioId]) {
      continue;
    }
    if (!idsConRegistro[semilla.usuarioId]) {
      planillas.push(clonarProfundo(semilla));
      idsConRegistro[semilla.usuarioId] = true;
      cambios = true;
    }
  }
  for (let i = 0; i < usuarios.length; i++) {
    const miembro = usuarios[i];
    if (!usuarioEsPersonalDelPlantel(miembro) || idsConRegistro[miembro.id]) {
      continue;
    }
    planillas.push({
      usuarioId: miembro.id,
      horaEntrada: '08:00',
      horaSalida: '16:00',
      tareasDelDia: '',
      actualizadoEn: new Date().toISOString(),
    });
    idsConRegistro[miembro.id] = true;
    cambios = true;
  }
  if (cambios) {
    guardarStorage(CLAVES_STORAGE.planillaTA, planillas);
  }
}

function sincronizarTareasCalendarioTASemilla() {
  const tareas = leerStorage(CLAVES_STORAGE.tareasCalendarioTA, tareasCalendarioTASemilla);
  const idsCargados = {};
  let cambios = false;
  for (let i = 0; i < tareas.length; i++) {
    idsCargados[tareas[i].id] = true;
  }
  for (let i = 0; i < tareasCalendarioTASemilla.length; i++) {
    const tareaSemilla = tareasCalendarioTASemilla[i];
    if (!idsCargados[tareaSemilla.id]) {
      tareas.push(clonarProfundo(tareaSemilla));
      idsCargados[tareaSemilla.id] = true;
      cambios = true;
    }
  }
  if (cambios) {
    guardarStorage(CLAVES_STORAGE.tareasCalendarioTA, tareas);
  }
}

function sincronizarTextosDemoActualizados() {
  function aplicarCambiosPorId(claveStorage, fallback, cambiosPorId, campoId) {
    const registros = leerStorage(claveStorage, fallback);
    let cambios = false;
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      const idRegistro = registro[campoId || 'id'];
      const cambiosRegistro = cambiosPorId[idRegistro];
      if (!cambiosRegistro) {
        continue;
      }
      for (const campo in cambiosRegistro) {
        const cambio = cambiosRegistro[campo];
        if (registro[campo] === cambio.desde) {
          registro[campo] = cambio.hacia;
          cambios = true;
        }
      }
    }
    if (cambios) {
      guardarStorage(claveStorage, registros);
    }
  }
  aplicarCambiosPorId(CLAVES_STORAGE.usuarios, usuariosSemilla, {
    'USR-001': {
      descripcion: {
        desde: 'Coordina inventario, incidencias tecnicas y solicitudes institucionales.',
        hacia:
          'Coordina prioridades del area TI, revisa solicitudes y mantiene ordenado el inventario.',
      },
    },
    'USR-002': {
      descripcion: {
        desde: 'Atiende incidencias tecnicas, prepara salones y controla recursos de soporte.',
        hacia:
          'Acompana incidencias tecnicas, prepara espacios de clase y da seguimiento a los pedidos de soporte.',
      },
    },
    'USR-003': {
      descripcion: {
        desde: 'Docente que solicita prestamos, soporte y preparacion de espacios para sus clases.',
        hacia:
          'Docente que usa el portal para pedir recursos, preparar clases y seguir el estado de sus solicitudes.',
      },
    },
    'USR-004': {
      descripcion: {
        desde:
          'Especialista en redes y conectividad del plantel. Mantiene laboratorios y salas teoricas.',
        hacia:
          'Especialista en conectividad. Revisa redes, laboratorios y salas teoricas para que las clases no se detengan.',
      },
    },
    'USR-005': {
      descripcion: {
        desde: 'Encargada de multimedia y proyeccion en auditorios y salones de gran capacidad.',
        hacia:
          'Acompana actividades multimedia, proyeccion y audio en auditorios y salones de gran capacidad.',
      },
    },
    'USR-006': {
      descripcion: {
        desde: 'Soporte de hardware y mantenimiento preventivo de equipos en laboratorios.',
        hacia:
          'Se ocupa del hardware, las revisiones preventivas y el estado diario de los equipos de laboratorio.',
      },
    },
  });
}

function inicializarPortalDemo() {
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.usuarios, usuariosSemilla);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.solicitudesRegistro, []);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.prestamos, prestamosSemilla);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.tickets, ticketsSoporteSemilla);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.solicitudes, solicitudesServicioSemilla);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.planillaTA, planillaTASemilla);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.tareasCalendarioTA, tareasCalendarioTASemilla);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.personalBajaTA, []);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.seccionesInventario, secciones);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.equiposInventario, todosLosEquipos);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.historialInventario, historialDeCambios);
  inicializarColeccionSiHaceFalta(CLAVES_STORAGE.imagenesInventario, imagenesDeSecciones);
  limpiarDatosSemillaOperativos();
  sincronizarUsuariosSemilla();
  sincronizarPlanillaTASemilla();
  sincronizarTareasCalendarioTASemilla();
  sincronizarTextosDemoActualizados();
  sincronizarUsuariosSemilla();
}

function obtenerUsuariosRegistrados() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.usuarios, usuariosSemilla);
}

function guardarUsuariosRegistrados(usuariosGuardados) {
  guardarStorage(CLAVES_STORAGE.usuarios, usuariosGuardados);
}

function obtenerUsuarioActual() {
  try {
    const recordarSesion = leerStorage(CLAVES_STORAGE.recordarSesion, false);
    if (recordarSesion) {
      return leerStorage(CLAVES_STORAGE.usuarioActual, null);
    }
    const valorSesion = window.sessionStorage.getItem(CLAVES_STORAGE.usuarioActual);
    if (!valorSesion) {
      return null;
    }
    return JSON.parse(valorSesion);
  } catch (error) {
    return null;
  }
}

function guardarUsuarioActual(usuarioActual, opciones) {
  const persistir = !opciones || opciones.persistir !== false;
  if (persistir) {
    guardarStorage(CLAVES_STORAGE.usuarioActual, usuarioActual);
    guardarStorage(CLAVES_STORAGE.recordarSesion, true);
    try {
      window.sessionStorage.removeItem(CLAVES_STORAGE.usuarioActual);
    } catch (error) {
      /* sin sesion temporal */
    }
    return;
  }
  try {
    window.sessionStorage.setItem(CLAVES_STORAGE.usuarioActual, JSON.stringify(usuarioActual));
  } catch (error) {
    guardarStorage(CLAVES_STORAGE.usuarioActual, usuarioActual);
  }
  window.localStorage.removeItem(CLAVES_STORAGE.usuarioActual);
  guardarStorage(CLAVES_STORAGE.recordarSesion, false);
}

function usuarioEstaActivoEnPortal(usuario) {
  if (!usuario) {
    return false;
  }
  if (usuario.estadoRegistro === 'pendiente' || usuario.estadoRegistro === 'rechazado') {
    return false;
  }
  return true;
}

function requiereAprobacionDeRegistro(rol) {
  const rolCanonico = obtenerRolCanonico(rol);
  return rolCanonico === 'tecnico';
}

function obtenerSolicitudesRegistro() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.solicitudesRegistro, []);
}

function guardarSolicitudesRegistro(solicitudes) {
  guardarStorage(CLAVES_STORAGE.solicitudesRegistro, solicitudes);
}

function buscarSolicitudRegistroPendiente(identificador) {
  const solicitudes = obtenerSolicitudesRegistro();
  const correoBuscado = normalizarTexto(identificador);
  const cedulaBuscada = normalizarCedula(identificador);
  for (let i = 0; i < solicitudes.length; i++) {
    const solicitud = solicitudes[i];
    if (solicitud.estado !== 'pendiente') {
      continue;
    }
    if (
      normalizarCedula(solicitud.cedula) === cedulaBuscada ||
      normalizarTexto(solicitud.correo) === correoBuscado
    ) {
      return solicitud;
    }
  }
  return null;
}

function aprobarSolicitudRegistro(solicitudId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioEsAdministrativo(usuarioActual)) {
    return { ok: false, mensaje: 'Solo un usuario administrativo puede aprobar registros.' };
  }
  const solicitudes = obtenerSolicitudesRegistro();
  let solicitud = null;
  for (let i = 0; i < solicitudes.length; i++) {
    if (solicitudes[i].id === solicitudId) {
      solicitud = solicitudes[i];
      break;
    }
  }
  if (!solicitud) {
    return { ok: false, mensaje: 'No encontramos esa solicitud de registro.' };
  }
  if (solicitud.estado !== 'pendiente') {
    return { ok: false, mensaje: 'Esta solicitud ya fue revisada.' };
  }
  const usuarios = obtenerUsuariosRegistrados();
  for (let i = 0; i < usuarios.length; i++) {
    if (
      normalizarCedula(usuarios[i].cedula) === normalizarCedula(solicitud.cedula) ||
      normalizarTexto(usuarios[i].correo) === normalizarTexto(solicitud.correo)
    ) {
      return { ok: false, mensaje: 'Ya existe un usuario activo con esa cedula o ese correo.' };
    }
  }
  const nuevoUsuario = {
    id: generarId('USR'),
    cedula: solicitud.cedula,
    nombreCompleto: solicitud.nombreCompleto,
    correo: solicitud.correo,
    contrasena: solicitud.contrasena,
    rol: solicitud.rol,
    descripcion: 'Usuario aprobado por un administrador desde el portal.',
    fotoPerfil: '',
    fechaRegistro: new Date().toISOString().slice(0, 10),
    area: 'Area sin definir',
    estadoRegistro: 'activo',
  };
  usuarios.unshift(nuevoUsuario);
  guardarUsuariosRegistrados(usuarios);
  solicitud.estado = 'aprobada';
  solicitud.revisadoEn = new Date().toISOString();
  solicitud.revisadoPorId = usuarioActual.id;
  guardarSolicitudesRegistro(solicitudes);
  return {
    ok: true,
    mensaje: 'Registro aprobado. La persona ya puede iniciar sesion.',
    usuario: nuevoUsuario,
  };
}

function rechazarSolicitudRegistro(solicitudId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioEsAdministrativo(usuarioActual)) {
    return { ok: false, mensaje: 'Solo un usuario administrativo puede rechazar registros.' };
  }
  const solicitudes = obtenerSolicitudesRegistro();
  let solicitud = null;
  for (let i = 0; i < solicitudes.length; i++) {
    if (solicitudes[i].id === solicitudId) {
      solicitud = solicitudes[i];
      break;
    }
  }
  if (!solicitud) {
    return { ok: false, mensaje: 'No encontramos esa solicitud de registro.' };
  }
  if (solicitud.estado !== 'pendiente') {
    return { ok: false, mensaje: 'Esta solicitud ya fue revisada.' };
  }
  solicitud.estado = 'rechazada';
  solicitud.revisadoEn = new Date().toISOString();
  solicitud.revisadoPorId = usuarioActual.id;
  guardarSolicitudesRegistro(solicitudes);
  return { ok: true, mensaje: 'Solicitud de registro rechazada.' };
}

function obtenerPrestamos() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.prestamos, prestamosSemilla);
}
function guardarPrestamos(prestamos) {
  guardarStorage(CLAVES_STORAGE.prestamos, prestamos);
}
function obtenerTicketsSoporte() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.tickets, ticketsSoporteSemilla);
}
function guardarTicketsSoporte(tickets) {
  guardarStorage(CLAVES_STORAGE.tickets, tickets);
}
function obtenerSolicitudesServicio() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.solicitudes, solicitudesServicioSemilla);
}
function guardarSolicitudesServicio(solicitudes) {
  guardarStorage(CLAVES_STORAGE.solicitudes, solicitudes);
}
function obtenerPlanillaTA() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.planillaTA, planillaTASemilla);
}
function guardarPlanillaTA(planillas) {
  guardarStorage(CLAVES_STORAGE.planillaTA, planillas);
}
function obtenerTareasCalendarioTA() {
  inicializarPortalDemo();
  return leerStorage(CLAVES_STORAGE.tareasCalendarioTA, tareasCalendarioTASemilla);
}
function guardarTareasCalendarioTA(tareas) {
  guardarStorage(CLAVES_STORAGE.tareasCalendarioTA, tareas);
}

function obtenerTareaCalendarioPorId(tareaId) {
  const tareas = obtenerTareasCalendarioTA();
  for (let i = 0; i < tareas.length; i++) {
    if (tareas[i].id === tareaId) {
      return tareas[i];
    }
  }
  return null;
}

function obtenerTareasPendientesCalendarioTA() {
  const tareas = obtenerTareasCalendarioTA();
  const pendientes = [];
  for (let i = 0; i < tareas.length; i++) {
    if (normalizarTexto(tareas[i].estado) !== 'completado') {
      pendientes.push(tareas[i]);
    }
  }
  return pendientes;
}

function fechaIsoLocal(fecha) {
  const valorFecha = fecha || new Date();
  const anio = valorFecha.getFullYear();
  const mes = String(valorFecha.getMonth() + 1).padStart(2, '0');
  const dia = String(valorFecha.getDate()).padStart(2, '0');
  return anio + '-' + mes + '-' + dia;
}

function normalizarFechaIso(valor, valorPorDefecto) {
  const texto = String(valor || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }
  return valorPorDefecto || fechaIsoLocal(new Date());
}

function compararFechasIso(fechaA, fechaB) {
  if (fechaA === fechaB) {
    return 0;
  }
  return fechaA > fechaB ? 1 : -1;
}

function obtenerTecnicoIdValido(tecnicoId) {
  const tecnicos = obtenerTecnicosDelPlantel();
  for (let i = 0; i < tecnicos.length; i++) {
    if (tecnicos[i].id === tecnicoId) {
      return tecnicoId;
    }
  }
  return tecnicos.length > 0 ? tecnicos[0].id : '';
}

function normalizarValorPermitido(valor, permitidos, valorPorDefecto) {
  for (let i = 0; i < permitidos.length; i++) {
    if (permitidos[i] === valor) {
      return valor;
    }
  }
  return valorPorDefecto;
}

function crearDatosTareaCalendario(datos, tareaExistente) {
  const base = tareaExistente || {};
  const hoy = fechaIsoLocal(new Date());
  const tieneDescripcion = Object.prototype.hasOwnProperty.call(datos, 'descripcion');
  const plazoInicio = normalizarFechaIso(datos.plazoInicio || base.plazoInicio, hoy);
  let plazoFin = normalizarFechaIso(datos.plazoFin || base.plazoFin, plazoInicio);
  if (compararFechasIso(plazoFin, plazoInicio) < 0) {
    plazoFin = plazoInicio;
  }
  return {
    id: base.id || generarId('TAR'),
    titulo: String(datos.titulo || base.titulo || 'Nueva tarea').trim(),
    descripcion: String(tieneDescripcion ? datos.descripcion : base.descripcion || '').trim(),
    dificultad: normalizarValorPermitido(
      datos.dificultad || base.dificultad,
      dificultadesTareaTA,
      'Media',
    ),
    categoria: normalizarValorPermitido(
      datos.categoria || base.categoria,
      categoriasTareaTA,
      'Otro',
    ),
    estado: normalizarValorPermitido(datos.estado || base.estado, estadosKanbanTA, 'Pendiente'),
    fechaAgregada: normalizarFechaIso(base.fechaAgregada || datos.fechaAgregada, hoy),
    plazoInicio: plazoInicio,
    plazoFin: plazoFin,
    tecnicoId: obtenerTecnicoIdValido(datos.tecnicoId || base.tecnicoId),
    color: String(datos.color || base.color || '#16A34A').trim(),
  };
}

function guardarNuevaTareaCalendarioTA(datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederACalendarioTA(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para crear tareas.' };
  }
  const tareas = obtenerTareasCalendarioTA();
  const nuevaTarea = crearDatosTareaCalendario(datos || {}, null);
  tareas.unshift(nuevaTarea);
  guardarTareasCalendarioTA(tareas);
  return {
    ok: true,
    mensaje: 'Tarea creada. Ya aparece en el tablero y en el calendario.',
    tarea: nuevaTarea,
  };
}

function actualizarTareaCalendarioTA(tareaId, datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederACalendarioTA(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para modificar tareas.' };
  }
  const tareas = obtenerTareasCalendarioTA();
  let tareaActualizada = null;
  for (let i = 0; i < tareas.length; i++) {
    if (tareas[i].id === tareaId) {
      tareaActualizada = crearDatosTareaCalendario(datos || {}, tareas[i]);
      tareas[i] = tareaActualizada;
      break;
    }
  }
  if (!tareaActualizada) {
    return { ok: false, mensaje: 'No encontramos esa tarea.' };
  }
  guardarTareasCalendarioTA(tareas);
  return {
    ok: true,
    mensaje: 'Tarea actualizada. Los cambios ya quedaron guardados.',
    tarea: tareaActualizada,
  };
}

function eliminarTareaCalendarioTA(tareaId) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeAccederACalendarioTA(usuarioActual)) {
    return { ok: false, mensaje: 'Tu perfil no tiene permiso para eliminar tareas.' };
  }
  const tareas = obtenerTareasCalendarioTA();
  const tareasFiltradas = [];
  let tareaEliminada = null;
  for (let i = 0; i < tareas.length; i++) {
    if (tareas[i].id === tareaId) {
      tareaEliminada = tareas[i];
    } else {
      tareasFiltradas.push(tareas[i]);
    }
  }
  if (!tareaEliminada) {
    return { ok: false, mensaje: 'No encontramos esa tarea.' };
  }
  guardarTareasCalendarioTA(tareasFiltradas);
  return {
    ok: true,
    mensaje: 'Tarea eliminada. Ya no aparece en el calendario.',
    tarea: tareaEliminada,
  };
}

function obtenerRegistroPlanillaPorUsuario(usuarioId) {
  const planillas = obtenerPlanillaTA();
  for (let i = 0; i < planillas.length; i++) {
    if (planillas[i].usuarioId === usuarioId) {
      return planillas[i];
    }
  }
  return null;
}

function obtenerParcelasPlanillaTA() {
  const personal = obtenerPersonalDelPlantel();
  const parcelas = [];
  for (let i = 0; i < personal.length; i++) {
    const miembro = personal[i];
    let registro = obtenerRegistroPlanillaPorUsuario(miembro.id);
    if (!registro) {
      registro = {
        usuarioId: miembro.id,
        horaEntrada: '08:00',
        horaSalida: '16:00',
        tareasDelDia: '',
        actualizadoEn: new Date().toISOString(),
      };
    }
    parcelas.push({ usuario: miembro, planilla: registro });
  }
  return parcelas;
}

function actualizarParcelaPlanillaTA(usuarioIdParcela, datos) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeEditarParcelaPlanilla(usuarioIdParcela, usuarioActual)) {
    return {
      ok: false,
      mensaje: 'Tu perfil no tiene permiso para modificar esta persona en la planilla.',
    };
  }
  const planillas = obtenerPlanillaTA();
  let indice = -1;
  for (let i = 0; i < planillas.length; i++) {
    if (planillas[i].usuarioId === usuarioIdParcela) {
      indice = i;
      break;
    }
  }
  const registroActualizado = {
    usuarioId: usuarioIdParcela,
    horaEntrada: datos.horaEntrada || '08:00',
    horaSalida: datos.horaSalida || '16:00',
    tareasDelDia: datos.tareasDelDia || '',
    actualizadoEn: new Date().toISOString(),
  };
  if (indice >= 0) {
    planillas[indice] = registroActualizado;
  } else {
    planillas.push(registroActualizado);
  }
  guardarPlanillaTA(planillas);
  return {
    ok: true,
    mensaje: 'Planilla actualizada. Los cambios ya estan visibles para el equipo.',
  };
}

function eliminarParcelaPlanillaTA(usuarioIdParcela) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioEsAdministrativo(usuarioActual)) {
    return {
      ok: false,
      mensaje: 'Solo un usuario administrativo puede quitar personas de la planilla.',
    };
  }
  const usuarioParcela = buscarUsuarioPorId(usuarioIdParcela);
  if (!usuarioParcela || !usuarioEsTecnico(usuarioParcela)) {
    return { ok: false, mensaje: 'Solo se pueden quitar usuarios tecnicos de esta planilla.' };
  }
  const idsPersonal = obtenerIdsPersonalBajaTA();
  let yaEstabaDadoDeBaja = false;
  for (let i = 0; i < idsPersonal.length; i++) {
    if (idsPersonal[i] === usuarioIdParcela) {
      yaEstabaDadoDeBaja = true;
      break;
    }
  }
  if (!yaEstabaDadoDeBaja) {
    idsPersonal.push(usuarioIdParcela);
    guardarIdsPersonalBajaTA(idsPersonal);
  }
  const planillas = obtenerPlanillaTA();
  const planillasActivas = [];
  for (let i = 0; i < planillas.length; i++) {
    if (planillas[i].usuarioId !== usuarioIdParcela) {
      planillasActivas.push(planillas[i]);
    }
  }
  guardarPlanillaTA(planillasActivas);
  return { ok: true, mensaje: 'Persona quitada de la planilla T.A.' };
}

function obtenerPrestamosVisibles() {
  const usuarioActual = obtenerUsuarioActual();
  return filtrarRegistrosVisibles(obtenerPrestamos(), usuarioActual);
}
function obtenerTicketsVisibles() {
  const usuarioActual = obtenerUsuarioActual();
  return filtrarRegistrosVisibles(obtenerTicketsSoporte(), usuarioActual);
}
function obtenerSolicitudesVisibles() {
  const usuarioActual = obtenerUsuarioActual();
  return filtrarRegistrosVisibles(obtenerSolicitudesServicio(), usuarioActual);
}

function buscarUsuarioPorIdentificador(identificador) {
  const usuarios = obtenerUsuariosRegistrados();
  const correoBuscado = normalizarTexto(identificador);
  const cedulaBuscada = normalizarCedula(identificador);
  for (let i = 0; i < usuarios.length; i++) {
    const usuarioGuardado = usuarios[i];
    if (normalizarCedula(usuarioGuardado.cedula) === cedulaBuscada) {
      return usuarioGuardado;
    }
    if (normalizarTexto(usuarioGuardado.correo) === correoBuscado) {
      return usuarioGuardado;
    }
  }
  return null;
}

function iniciarSesion(identificador, contrasena, opciones) {
  const solicitudPendiente = buscarSolicitudRegistroPendiente(identificador);
  if (solicitudPendiente) {
    if (solicitudPendiente.contrasena !== contrasena) {
      return { ok: false, mensaje: 'La contraseña ingresada no coincide con esta cuenta.' };
    }
    return {
      ok: false,
      mensaje:
        'Tu solicitud de registro sigue en revision. Un administrador debe aprobarla antes de ingresar.',
    };
  }
  const usuarioEncontrado = buscarUsuarioPorIdentificador(identificador);
  if (!usuarioEncontrado) {
    const solicitudesRegistro = obtenerSolicitudesRegistro();
    let solicitudRechazada = null;
    for (let i = 0; i < solicitudesRegistro.length; i++) {
      const solicitud = solicitudesRegistro[i];
      if (
        solicitud.estado === 'rechazada' &&
        (normalizarCedula(solicitud.cedula) === normalizarCedula(identificador) ||
          normalizarTexto(solicitud.correo) === normalizarTexto(identificador))
      ) {
        solicitudRechazada = solicitud;
        break;
      }
    }
    if (solicitudRechazada && solicitudRechazada.contrasena === contrasena) {
      return { ok: false, mensaje: 'Tu solicitud de registro fue rechazada por un administrador.' };
    }
    return { ok: false, mensaje: 'No encontramos una cuenta con esa cedula o ese correo.' };
  }
  if (!usuarioEstaActivoEnPortal(usuarioEncontrado)) {
    return {
      ok: false,
      mensaje:
        'Tu solicitud de registro sigue en revision. Un administrador debe aprobarla antes de ingresar.',
    };
  }
  if (
    (usuarioEsTecnico(usuarioEncontrado) || usuarioEsAdministrativo(usuarioEncontrado)) &&
    usuarioEstaDadoDeBajaTA(usuarioEncontrado.id)
  ) {
    return {
      ok: false,
      mensaje: 'Este usuario fue dado de baja del plantel tecnico-administrativo.',
    };
  }
  if (usuarioEncontrado.contrasena !== contrasena) {
    return { ok: false, mensaje: 'La contraseña ingresada no coincide con esta cuenta.' };
  }
  const recordarme = !!(opciones && opciones.recordarme);
  guardarUsuarioActual(usuarioEncontrado, { persistir: recordarme });
  return { ok: true, mensaje: 'Sesion iniciada.', usuario: usuarioEncontrado };
}

function registrarUsuario(datos) {
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
  const usuarios = obtenerUsuariosRegistrados();
  for (let i = 0; i < usuarios.length; i++) {
    if (normalizarCedula(usuarios[i].cedula) === cedula) {
      return { ok: false, mensaje: 'Ya existe una cuenta registrada con esa cedula.' };
    }
    if (normalizarTexto(usuarios[i].correo) === correo) {
      return { ok: false, mensaje: 'Ya existe una cuenta registrada con ese correo.' };
    }
  }
  const solicitudes = obtenerSolicitudesRegistro();
  for (let i = 0; i < solicitudes.length; i++) {
    if (solicitudes[i].estado !== 'pendiente') {
      continue;
    }
    if (normalizarCedula(solicitudes[i].cedula) === cedula) {
      return { ok: false, mensaje: 'Ya hay una solicitud de registro pendiente con esa cedula.' };
    }
    if (normalizarTexto(solicitudes[i].correo) === correo) {
      return { ok: false, mensaje: 'Ya hay una solicitud de registro pendiente con ese correo.' };
    }
  }
  const rolEtiqueta = obtenerEtiquetaRol(rol);
  if (requiereAprobacionDeRegistro(rolEtiqueta)) {
    const nuevaSolicitud = {
      id: generarId('REG'),
      cedula: cedula,
      nombreCompleto: nombreCompleto,
      correo: correo,
      contrasena: contrasena,
      rol: rolEtiqueta,
      estado: 'pendiente',
      creadoEn: new Date().toISOString(),
      revisadoEn: '',
      revisadoPorId: '',
    };
    solicitudes.unshift(nuevaSolicitud);
    guardarSolicitudesRegistro(solicitudes);
    return {
      ok: true,
      mensaje:
        'Solicitud enviada. Un administrador revisara tu registro antes de habilitar el acceso.',
      pendiente: true,
      solicitud: nuevaSolicitud,
    };
  }
  const nuevoUsuario = {
    id: generarId('USR'),
    cedula: cedula,
    nombreCompleto: nombreCompleto,
    correo: correo,
    contrasena: contrasena,
    rol: rolEtiqueta,
    descripcion: 'Usuario registrado desde el portal SGRSI.',
    fotoPerfil: '',
    fechaRegistro: new Date().toISOString().slice(0, 10),
    area: 'Area sin definir',
    estadoRegistro: 'activo',
  };
  usuarios.unshift(nuevoUsuario);
  guardarUsuariosRegistrados(usuarios);
  guardarUsuarioActual(nuevoUsuario, { persistir: false });
  return {
    ok: true,
    mensaje: 'Cuenta creada. Ya podes ingresar al portal.',
    usuario: nuevoUsuario,
  };
}

function protegerRuta() {
  inicializarPortalDemo();
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
  inicializarPortalDemo();
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

function guardarNuevoPrestamo(datos) {
  const usuarioEnSesion = obtenerUsuarioActual();
  const prestamos = obtenerPrestamos();
  const recursosDetalle = [];
  let cantidadTotal = Number(datos.cantidad) || 0;
  let recurso = String(datos.recurso || '').trim();
  if (Array.isArray(datos.recursosDetalle)) {
    cantidadTotal = 0;
    for (let i = 0; i < datos.recursosDetalle.length; i++) {
      const nombre = String(datos.recursosDetalle[i].nombre || '').trim();
      const cantidad = Number(datos.recursosDetalle[i].cantidad);
      if (!nombre || !Number.isInteger(cantidad) || cantidad < 1) {
        continue;
      }
      recursosDetalle.push({ nombre: nombre, cantidad: cantidad });
      cantidadTotal += cantidad;
    }
  }
  if (recursosDetalle.length > 0) {
    const partes = [];
    for (let i = 0; i < recursosDetalle.length; i++) {
      partes.push(recursosDetalle[i].cantidad + ' ' + recursosDetalle[i].nombre);
    }
    recurso = partes.join(' + ');
  }
  if (!recurso) {
    recurso = datos.categoria;
  }
  const nuevoPrestamo = {
    id: generarId('PRE'),
    categoria: datos.categoria,
    recurso: recurso,
    cantidad: cantidadTotal || datos.cantidad,
    recursosDetalle: recursosDetalle,
    fecha: datos.fecha,
    jornada: datos.jornada,
    ubicacion: datos.ubicacion,
    estado: 'Pendiente',
    detalle: datos.detalle,
    solicitante: usuarioEnSesion ? usuarioEnSesion.nombreCompleto : 'Usuario',
    solicitanteId: usuarioEnSesion ? usuarioEnSesion.id : '',
    creadoEn: new Date().toISOString(),
  };
  prestamos.unshift(nuevoPrestamo);
  guardarPrestamos(prestamos);
  return nuevoPrestamo;
}

function actualizarEstadoGestionado(obtenerRegistros, guardarRegistros, idRegistro, nuevoEstado) {
  const usuarioActual = obtenerUsuarioActual();
  if (!usuarioPuedeGestionarOperaciones(usuarioActual)) {
    return null;
  }
  const registros = obtenerRegistros();
  let registroActualizado = null;
  for (let i = 0; i < registros.length; i++) {
    if (registros[i].id === idRegistro) {
      registros[i].estado = nuevoEstado;
      registros[i].gestionadoPor = usuarioActual.nombreCompleto;
      registros[i].gestionadoEn = new Date().toISOString();
      registroActualizado = registros[i];
      break;
    }
  }
  if (!registroActualizado) {
    return null;
  }
  guardarRegistros(registros);
  return registroActualizado;
}

function actualizarEstadoPrestamo(idPrestamo, nuevoEstado) {
  return actualizarEstadoGestionado(obtenerPrestamos, guardarPrestamos, idPrestamo, nuevoEstado);
}

function guardarNuevoTicket(datos) {
  const usuarioEnSesion = obtenerUsuarioActual();
  const tickets = obtenerTicketsSoporte();
  const nuevoTicket = {
    id: generarId('SUP'),
    asunto: datos.asunto,
    categoria: datos.categoria,
    prioridad: datos.prioridad || '',
    estado: 'En revision',
    ubicacion: datos.ubicacion,
    mensaje: datos.mensaje,
    solicitante: usuarioEnSesion ? usuarioEnSesion.nombreCompleto : 'Usuario',
    solicitanteId: usuarioEnSesion ? usuarioEnSesion.id : '',
    creadoEn: new Date().toISOString(),
  };
  tickets.unshift(nuevoTicket);
  guardarTicketsSoporte(tickets);
  return nuevoTicket;
}

function actualizarEstadoTicket(idTicket, nuevoEstado) {
  return actualizarEstadoGestionado(
    obtenerTicketsSoporte,
    guardarTicketsSoporte,
    idTicket,
    nuevoEstado,
  );
}

function guardarNuevaSolicitud(datos) {
  const usuarioEnSesion = obtenerUsuarioActual();
  const solicitudes = obtenerSolicitudesServicio();
  const nuevaSolicitud = {
    id: generarId('SER'),
    titulo: datos.titulo || datos.tipo,
    tipo: datos.tipo,
    fecha: datos.fecha,
    lugar: datos.lugar,
    estado: 'Pendiente',
    detalle: datos.detalle,
    solicitante: usuarioEnSesion ? usuarioEnSesion.nombreCompleto : 'Usuario',
    solicitanteId: usuarioEnSesion ? usuarioEnSesion.id : '',
    creadoEn: new Date().toISOString(),
  };
  solicitudes.unshift(nuevaSolicitud);
  guardarSolicitudesServicio(solicitudes);
  return nuevaSolicitud;
}

function actualizarEstadoSolicitud(idSolicitud, nuevoEstado) {
  return actualizarEstadoGestionado(
    obtenerSolicitudesServicio,
    guardarSolicitudesServicio,
    idSolicitud,
    nuevoEstado,
  );
}

function actualizarPerfil(datosParciales) {
  const usuarioEnSesion = obtenerUsuarioActual();
  if (!usuarioEnSesion) {
    return null;
  }
  const usuarios = obtenerUsuariosRegistrados();
  let usuarioActualizado = null;
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarios[i].id === usuarioEnSesion.id) {
      usuarios[i] = Object.assign({}, usuarios[i], datosParciales);
      usuarioActualizado = usuarios[i];
      break;
    }
  }
  if (!usuarioActualizado) {
    return null;
  }
  guardarUsuariosRegistrados(usuarios);
  guardarUsuarioActual(usuarioActualizado);
  return usuarioActualizado;
}

function convertirArchivoABase64(archivo) {
  return new Promise(function (resolve, reject) {
    if (!archivo) {
      resolve('');
      return;
    }
    const lector = new FileReader();
    lector.onload = function () {
      resolve(lector.result);
    };
    lector.onerror = function () {
      reject(new Error('No se pudo leer el archivo.'));
    };
    lector.readAsDataURL(archivo);
  });
}

function esEstadoActivo(estado) {
  const valor = normalizarTexto(estado);
  return (
    !valor.includes('resuelto') &&
    !valor.includes('completado') &&
    !valor.includes('cancelado') &&
    !valor.includes('rechazado')
  );
}

function obtenerResumenPortal() {
  const usuarioActual = obtenerUsuarioActual();
  const prestamos = obtenerPrestamosVisibles();
  const tickets = obtenerTicketsVisibles();
  const solicitudes = obtenerSolicitudesVisibles();
  let prestamosActivos = 0;
  let ticketsActivos = 0;
  let solicitudesActivas = 0;
  for (let i = 0; i < prestamos.length; i++) {
    if (esEstadoActivo(prestamos[i].estado)) {
      prestamosActivos++;
    }
  }
  for (let i = 0; i < tickets.length; i++) {
    if (esEstadoActivo(tickets[i].estado)) {
      ticketsActivos++;
    }
  }
  for (let i = 0; i < solicitudes.length; i++) {
    if (esEstadoActivo(solicitudes[i].estado)) {
      solicitudesActivas++;
    }
  }
  return {
    secciones: usuarioPuedeAccederAInventario(usuarioActual)
      ? obtenerSeccionesInventario().length
      : 0,
    equipos: usuarioPuedeAccederAInventario(usuarioActual) ? obtenerEquiposInventario().length : 0,
    prestamosActivos: prestamosActivos,
    ticketsActivos: ticketsActivos,
    solicitudesActivas: solicitudesActivas,
  };
}

aplicarTemaGuardado();
aplicarIdiomaGuardado();
inicializarPortalDemo();
