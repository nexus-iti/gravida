/* Archivo extraído de app.js durante la modularización. */

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

function usuarioPuedeRecibirTareas(usuario) {
  const rol = obtenerRolCanonico(usuario && usuario.rol);
  return (
    (rol === 'tecnico' || rol === 'administrativo') &&
    usuario && usuario.estadoRegistro !== 'inactivo'
  );
}

async function obtenerIdsPersonalBajaTA() {
  const usuarios = await obtenerUsuariosRegistrados();
  const idsInactivos = [];
  for (let i = 0; i < usuarios.length; i++) {
    if (
      (usuarioEsTecnico(usuarios[i]) || usuarioEsAdministrativo(usuarios[i])) &&
      usuarios[i].estadoRegistro === 'inactivo'
    ) {
      idsInactivos.push(usuarios[i].id);
    }
  }
  return idsInactivos;
}

async function guardarIdsPersonalBajaTA(idsPersonal) {
  const usuarios = await obtenerUsuariosRegistrados();
  const idsDadosDeBaja = new Set(idsPersonal || []);
  const actualizaciones = [];
  for (let i = 0; i < usuarios.length; i++) {
    const usuario = usuarios[i];
    if (!usuarioEsTecnico(usuario) && !usuarioEsAdministrativo(usuario)) {
      continue;
    }
    const estado = idsDadosDeBaja.has(usuario.id) ? 'Inactivo' : 'Activo';
    actualizaciones.push(
      solicitarApi('api/usuarios.php', {
        method: 'PATCH',
        body: JSON.stringify({ accion: 'estado', cedula: usuario.cedula, estado: estado }),
      }),
    );
  }
  await Promise.all(actualizaciones);
}

function usuarioEsPersonalDelPlantel(usuario) {
  return usuarioPuedeRecibirTareas(usuario);
}

async function obtenerPersonalDelPlantel() {
  const usuarios = await obtenerUsuariosRegistrados();
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

function obtenerResponsablesTareaDelPlantel() {
  const usuarios = responsablesTareaCache.length > 0 ? responsablesTareaCache : usuariosRegistradosCache;
  const responsables = [];
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarioPuedeRecibirTareas(usuarios[i])) {
      responsables.push(usuarios[i]);
    }
  }
  responsables.sort(function (a, b) {
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
  return responsables;
}

function buscarUsuarioPorId(usuarioId) {
  for (let i = 0; i < usuariosRegistradosCache.length; i++) {
    if (usuariosRegistradosCache[i].id === usuarioId) {
      return usuariosRegistradosCache[i];
    }
  }
  return null;
}

function obtenerNombreUsuarioPorId(usuarioId) {
  const usuarioEncontrado = buscarUsuarioPorId(usuarioId);
  return usuarioEncontrado ? usuarioEncontrado.nombreCompleto : 'Responsable sin asignar';
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


