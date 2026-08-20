/* =============================================================
   app.js
   -------------------------------------------------------------
   Utilidades globales del portal:

   - renderizado basico de HTML
   - iconos Lucide
   - modales y buscadores
   - comunicacion con la API PHP
   - estado de interfaz y sesion del navegador
   - helpers de perfil
   ============================================================= */



const CLAVES_STORAGE = {
  usuarioActual: 'campus_ti_usuario_actual',
  recordarSesion: 'campus_ti_recordar_sesion',
  imagenesInventario: 'campus_ti_imagenes_inventario',
  tema: 'tema',
  idioma: 'idioma',
};

let usuariosRegistradosCache = [];
let responsablesTareaCache = [];



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


document.addEventListener('click', async function (evento) {
  const elementoClickeado = evento.target;
  const botonCancelarBaja = elementoClickeado.closest('[data-cancel-delete-equipo]');
  if (botonCancelarBaja) {
    evento.preventDefault();
    const modalPadre = botonCancelarBaja.closest('[data-modal]');
    if (modalPadre) {
      cancelarBajaEquipoInventario(modalPadre.id);
    }
    evento.stopImmediatePropagation();
    return;
  }
  const botonCancelarBajaSeccion = elementoClickeado.closest('[data-cancel-delete-seccion]');
  if (botonCancelarBajaSeccion) {
    evento.preventDefault();
    const modalPadre = botonCancelarBajaSeccion.closest('[data-modal]');
    if (modalPadre) {
      cancelarBajaSeccionInventario(modalPadre.id);
    }
    evento.stopImmediatePropagation();
    return;
  }
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
    const respuesta = await aprobarSolicitudRegistro(
      botonAprobarRegistro.getAttribute('data-aprobar-registro'),
    );
    alert(respuesta.mensaje);
    return;
  }
  const botonRechazarRegistro = elementoClickeado.closest('[data-rechazar-registro]');
  if (botonRechazarRegistro) {
    const respuesta = await rechazarSolicitudRegistro(
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


