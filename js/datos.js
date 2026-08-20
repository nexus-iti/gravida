
const usuario = { nombre: 'Invitado' };


const rolesDisponibles = [
  {
    valor: 'Usuario solicitante',
    etiqueta: 'Usuario solicitante',
    descripcion:
      'Para docentes y ersonal administrativo.',
  },
  {
    valor: 'Usuario tecnico',
    etiqueta: 'Usuario tecnico',
    descripcion:
      'Para el equipo del ITI.',
  },
  {
    valor: 'Usuario administrativo',
    etiqueta: 'Usuario administrativo',
    descripcion:
      'Para el coordinador de los tecnicos.',
  },
];

const usuariosSemilla = [
  {
    id: 'USR-001',
    cedula: '12345678',
    nombreCompleto: 'Ana Perez',
    correo: 'admin@mail.local',
    contrasena: 'Admin123*',
    rol: 'Usuario administrativo',
    descripcion:
      'Coordinadora',
    fotoPerfil: '',
    fechaRegistro: '2026-05-14',
    area: '---',
  },
  {
    id: 'USR-002',
    cedula: '23456789',
    nombreCompleto: 'Carlos Silva',
    correo: 'tecnico@mail.local',
    contrasena: 'Tecnico123*',
    rol: 'Usuario tecnico',
    descripcion:
      'Otorga prestamos, resuelve incidencias y brinda soporte.',
    fotoPerfil: '',
    fechaRegistro: '2026-05-14',
    area: 'tecnico',
  },
  {
    id: 'USR-003',
    cedula: '34567890',
    nombreCompleto: 'Laura Gomez',
    correo: 'docente@mail.local',
    contrasena: 'Docente123*',
    rol: 'Usuario solicitante',
    descripcion:
      'Docente que usa el SGRSI para pedir prestamos, solicitar servicios y reportar incidencias tecnicas.',
    fotoPerfil: '',
    fechaRegistro: '2026-05-14',
    area: 'Docencia',
  },
  {
    id: 'USR-004',
    cedula: '45678901',
    nombreCompleto: 'Miguel Torres',
    correo: 'miguel.torres@mail.local',
    contrasena: 'Tecnico123*',
    rol: 'Usuario tecnico',
    descripcion:
      'Otorga prestamos, resuelve incidencias y brinda soporte.',
    fotoPerfil:
      'https://ui-avatars.com/api/?name=Miguel+Torres&background=2563eb&color=fff&size=128',
    fechaRegistro: '2026-05-15',
    area: 'tecnico',
  },
  {
    id: 'USR-005',
    cedula: '56789012',
    nombreCompleto: 'Sofia Ramirez',
    correo: 'sofia.ramirez@mail.local',
    contrasena: 'Tecnico123*',
    rol: 'Usuario tecnico',
    descripcion:
      'Otorga prestamos, resuelve incidencias y brinda soporte.',
    fotoPerfil:
      'https://ui-avatars.com/api/?name=Sofia+Ramirez&background=7c3aed&color=fff&size=128',
    fechaRegistro: '2026-05-15',
    area: 'tecnico',
  },
  {
    id: 'USR-006',
    cedula: '67890123',
    nombreCompleto: 'Diego Morales',
    correo: 'diego.morales@mail.local',
    contrasena: 'Tecnico123*',
    rol: 'Usuario tecnico',
    descripcion:
      'Otorga prestamos, resuelve incidencias y brinda soporte.',
    fotoPerfil:
      'https://ui-avatars.com/api/?name=Diego+Morales&background=059669&color=fff&size=128',
    fechaRegistro: '2026-05-15',
    area: 'tecnico',
  },
];

const modulosDelPortal = [
  {
    id: 'inventario',
    icono: 'package',
    titulo: 'Inventario',
    descripcion:
      'Encuentra secciones, equipos, historial de cambios y backups de respaldo.',
    enlace: 'inventario.html',
    rolesPermitidos: ['tecnico', 'administrativo'],
  },
  {
    id: 'prestamos',
    icono: 'briefcase',
    titulo: 'Prestamos',
    descripcion: 'Pide PCs, perifericos o monitores indicando fecha, lugar y motivo de uso.',
    enlace: 'prestamos.html',
    rolesPermitidos: ['solicitante', 'tecnico', 'administrativo'],
  },
  {
    id: 'soporte',
    icono: 'life-buoy',
    titulo: 'Incidencias tecnicas',
    descripcion:
      'Cuenta que esta pasando y envia el caso al equipo tecnico para darle seguimiento.',
    enlace: 'soporte.html',
    rolesPermitidos: ['solicitante', 'tecnico', 'administrativo'],
  },
  {
    id: 'solicitudes',
    icono: 'clipboard-list',
    titulo: 'Solicitudes de servicio',
    descripcion: 'Coordina software, salones y materiales para que la clase llegue preparada.',
    enlace: 'solicitudes.html',
    rolesPermitidos: ['solicitante', 'tecnico', 'administrativo'],
  },
  {
    id: 'planilla-ta',
    icono: 'users',
    titulo: 'Planilla de T.A.',
    descripcion:
      'Mira horarios, tareas del dia y disponibilidad del plantel tecnico-administrativo.',
    enlace: 'planilla-ta.html',
    rolesPermitidos: ['tecnico', 'administrativo'],
  },
  {
    id: 'cuenta',
    icono: 'user',
    titulo: 'Cuenta',
    descripcion: 'Mantene tus datos, area y foto de perfil actualizados.',
    enlace: 'cuenta.html',
    rolesPermitidos: ['solicitante', 'tecnico', 'administrativo'],
  },
];

const categoriasDePrestamo = ['PCs', 'Perifericos', 'Monitores'];


const recursosPorCategoriaPrestamo = {
  PCs: ['Torres', 'All in ones'],
  Perifericos: ['Mouse', 'Teclados', 'Parlantes'],
  Monitores: ['Monitores'],
};


const lugaresDePrestamo = [
  'Laboratorio 1',
  'Laboratorio 2',
  'Laboratorio 3',
  'Laboratorio 4',
  'Laboratorio 5',
  'Teorico 1',
  'Teorico 2',
  'Teorico 3',
  'Teorico 4',
  'Teorico 5',
  'Adscripcion 1',
  'Adscripcion 2',
  'Direccion',
  'Administracion',
];


const prestamosSemilla = [];

const categoriasDeSoporte = [
  'Hardware',
  'Software',
  'Redes',
  'Cuenta',
  'Otro',
];

const ticketsSoporteSemilla = []; 

const tiposDeSolicitud = [
  'Instalacion de software en los equipos',
  'Preparacion de salones',
  'Solicitud de material didactico para usar en clase',
]; 
const planillaTASemilla = []; 
const estadosKanbanTA = ['Pendiente', 'En curso', 'En revision', 'Completado'];
const categoriasTareaTA = [
  'Hardware',
  'Software',
  'Redes',
  'Inventario',
  'Mantenimiento',
  'Otro',
];
const dificultadesTareaTA = ['Baja', 'Media', 'Alta', 'Critica'];

const tareasCalendarioTASemilla = [];

const solicitudesServicioSemilla = []; 

const secciones = [
  { id: 'laboratorio-1', nombre: 'Laboratorio 1', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'laboratorio-2', nombre: 'Laboratorio 2', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'laboratorio-3', nombre: 'Laboratorio 3', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'laboratorio-4', nombre: 'Laboratorio 4', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'laboratorio-5', nombre: 'Laboratorio 5', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'teorico-1', nombre: 'Teorico 1', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'teorico-2', nombre: 'Teorico 2', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'teorico-3', nombre: 'Teorico 3', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'teorico-4', nombre: 'Teorico 4', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'teorico-5', nombre: 'Teorico 5', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'adscripcion-1', nombre: 'Adscripcion 1', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'adscripcion-2', nombre: 'Adscripcion 2', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'direccion', nombre: 'Direccion', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
  { id: 'administracion', nombre: 'Administracion', icono: 'building-2', actualizado: 'hoy', cantidadEquipos: 0 },
];

const tiposDeEquipoInventario = [
  { valor: 'tv', etiqueta: 'Televisor', prefijo: 'TV', icono: 'tv' },
  { valor: 'all-in-one', etiqueta: 'All in one', prefijo: 'AIO', icono: 'monitor' },
  { valor: 'torre', etiqueta: 'Torre', prefijo: 'TOR', icono: 'cpu' },
  { valor: 'teclado', etiqueta: 'Teclado', prefijo: 'TEC', icono: 'keyboard' },
  { valor: 'mouse', etiqueta: 'Mouse', prefijo: 'MOU', icono: 'mouse' },
  { valor: 'parlante', etiqueta: 'Parlante', prefijo: 'PAR', icono: 'speaker' },
  { valor: 'monitor', etiqueta: 'Monitor', prefijo: 'MON', icono: 'monitor' },
];


const equiposPorSeccion = {};
const todosLosEquipos = [];
const equipoDetalle = null;
const historialDeCambios = [];
const imagenesDeSecciones = [];

const coloresPorNombre = {
  azul: 'var(--color-primario)',
  verde: 'var(--color-exito)',
  rojo: 'var(--color-peligro)',
  amarillo: 'var(--color-advertencia)',
  morado: 'var(--color-purpura)',
};



