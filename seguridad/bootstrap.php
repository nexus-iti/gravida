<?php
declare(strict_types=1);

/*
 * Capa de seguridad central de SGRSI.
 * La cargan api/common.php y login.php. Cada bloque indica la ficha que cubre.
 */

const SEG_INACTIVIDAD = 1800;            // F-04: 30 min sin actividad cierra la sesion
const SEG_DURACION_MAXIMA = 28800;       // F-04: 8 h como maximo por sesion normal
const SEG_DURACION_RECORDAR = 604800;    // F-04: 7 dias con "mantener sesion iniciada"
const SEG_ROTAR_ID = 900;                // F-04: nuevo id de sesion cada 15 min
const SEG_LOGIN_VENTANA = 900;           // F-01: ventana de 15 min para contar fallos
const SEG_LOGIN_MAX_FALLOS_CUENTA = 5;   // F-01: fallos por cuenta antes de bloquear
const SEG_LOGIN_MAX_FALLOS_IP = 20;      // F-01: fallos por IP antes de bloquear
const SEG_API_PETICIONES_POR_MINUTO = 120; // F-10: limite por usuario autenticado
const SEG_API_PETICIONES_POR_IP = 600;     // F-10: limite por IP (amplio: un aula entera comparte IP)
const SEG_REGISTROS_POR_HORA = 5;        // F-10: altas publicas por IP
const SEG_TAMANO_MAXIMO_CUERPO = 3145728;  // F-10: 3 MB (la foto admite 2 MB)
const SEG_ALMACEN = __DIR__ . '/almacen';

// 3ra entrega - DDoS
const SEG_FALTAS_VENTANA = 600;          // F-10: 10 min para contar excesos de limite de una IP
const SEG_FALTAS_PARA_BANEO = 3;         // F-10: 3 ventanas excedidas -> la IP queda bloqueada
const SEG_BANEO_DURACION = 900;          // F-10: 15 min de bloqueo total para esa IP
const SEG_LIMPIEZA_LIMITES = 7200;       // F-10: borra contadores de mas de 2 h (IPs falsas en masa)
// 3ra entrega - Phishing
const SEG_2FA_OBLIGATORIO_ADMIN = true;  // F-08: los administradores no entran sin segundo factor
const SEG_2FA_VENTANA_LOGIN = 300;       // F-08: 5 min para escribir el codigo tras la contrasena
const SEG_2FA_MAX_INTENTOS = 5;          // F-08: codigos erroneos antes de volver a pedir la contrasena

// Rangos publicados por Cloudflare (https://www.cloudflare.com/ips/). Solo se confia en
// CF-Connecting-IP si la conexion llega desde uno de ellos y Apache define SGRSI_DETRAS_DE_CLOUDFLARE=1.
const SEG_RANGOS_CLOUDFLARE = [
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
    '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
    '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
    '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
    '2a06:98c0::/29', '2c0f:f248::/32',
];

require_once __DIR__ . '/totp.php';

/* ---------- Utilidades ---------- */

function segIpEnRango(string $ip, string $rango): bool {
    [$red, $bits] = explode('/', $rango);
    $ipBin = @inet_pton($ip);
    $redBin = @inet_pton($red);
    if ($ipBin === false || $redBin === false || strlen($ipBin) !== strlen($redBin)) {
        return false;
    }
    $bits = (int) $bits;
    $bytes = intdiv($bits, 8);
    if (substr($ipBin, 0, $bytes) !== substr($redBin, 0, $bytes)) {
        return false;
    }
    $resto = $bits % 8;
    if ($resto === 0) {
        return true;
    }
    $mascara = (0xFF << (8 - $resto)) & 0xFF;
    return (ord($ipBin[$bytes]) & $mascara) === (ord($redBin[$bytes]) & $mascara);
}

function segDetrasDeCloudflare(): bool {
    return ($_SERVER['SGRSI_DETRAS_DE_CLOUDFLARE'] ?? $_SERVER['REDIRECT_SGRSI_DETRAS_DE_CLOUDFLARE'] ?? getenv('SGRSI_DETRAS_DE_CLOUDFLARE')) === '1';
}

function segIp(): string {
    static $ip = null;
    if ($ip !== null) {
        return $ip;
    }
    // Por defecto solo REMOTE_ADDR: X-Forwarded-For lo controla el atacante y permitiria saltar los limites.
    $remota = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $ip = filter_var($remota, FILTER_VALIDATE_IP) ? $remota : '0.0.0.0';
    // Detras de Cloudflare todas las conexiones vienen de sus servidores: sin esto, los limites
    // por IP se aplicarian a Cloudflare entero. Solo se acepta el encabezado si viene de sus rangos.
    if (segDetrasDeCloudflare()) {
        $real = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');
        foreach (SEG_RANGOS_CLOUDFLARE as $rango) {
            if (segIpEnRango($ip, $rango)) {
                if (filter_var($real, FILTER_VALIDATE_IP)) {
                    $ip = $real;
                }
                break;
            }
        }
    }
    return $ip;
}

function segEsHttps(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

function segEsLocal(): bool {
    $host = strtolower((string) parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST));
    return in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true) || str_ends_with($host, '.localhost');
}

function segAgente(): string {
    return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
}

function segFalla(string $mensaje, int $estado, array $extra = []): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code($estado);
    echo json_encode([
        'status' => 'error',
        'message' => $mensaje,
        'data' => $extra ?: null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function segAsegurarAlmacen(string $subcarpeta): string {
    $ruta = SEG_ALMACEN . '/' . $subcarpeta;
    if (!is_dir($ruta)) {
        @mkdir($ruta, 0700, true);
    }
    return $ruta;
}

/* ---------- Encabezados (F-06, F-08, Nota HTTPS) ---------- */

function segEncabezados(): void {
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    header('Cache-Control: no-store, max-age=0');
    if (segEsHttps()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function segExigirHttps(): void {
    // En localhost se permite HTTP para desarrollar; en cualquier otro host se rechaza.
    if (!segEsHttps() && !segEsLocal()) {
        segFalla('Conexion no segura: el sistema solo acepta HTTPS.', 403);
    }
}

/* ---------- Limite de peticiones (F-10, F-01) ---------- */

function segLimitarPeticiones(string $grupo, int $maximo, int $ventanaSegundos, bool $cerrarSiFalla = false): void {
    $carpeta = segAsegurarAlmacen('limites');
    $archivo = $carpeta . '/' . hash('sha256', $grupo . '|' . segIp()) . '.json';
    $manejador = @fopen($archivo, 'c+');
    if ($manejador === false || !flock($manejador, LOCK_EX)) {
        // Nunca en silencio: queda en el log de PHP y en seguridad_eventos (la BD no depende del disco local).
        error_log('segLimitarPeticiones: no se pudo usar ' . $archivo . ' (grupo ' . $grupo . ')');
        segRegistrarEvento(null, 'limite_no_disponible', segUsuario()['cedula'] ?? null, $grupo);
        if ($manejador !== false) {
            fclose($manejador);
        }
        // Rutas criticas (login, registro publico) fallan cerradas: sin limite no se atienden.
        // El resto de la API sigue abierta para no tirar el servicio por un problema de disco.
        if ($cerrarSiFalla) {
            header('Retry-After: 60');
            segFalla('Servicio temporalmente no disponible. Intenta de nuevo en un minuto.', 503);
        }
        return;
    }
    // Bajo ataque (modo-ataque activado) todos los limites se cuatriplican en dureza.
    if (segModoAtaque()) {
        $maximo = max(1, intdiv($maximo, 4));
    }
    $datos = json_decode((string) stream_get_contents($manejador), true);
    $ahora = time();
    if (!is_array($datos) || ($datos['inicio'] ?? 0) + $ventanaSegundos <= $ahora) {
        $datos = ['inicio' => $ahora, 'cantidad' => 0];
    }
    $datos['cantidad']++;
    ftruncate($manejador, 0);
    rewind($manejador);
    fwrite($manejador, json_encode($datos));
    flock($manejador, LOCK_UN);
    fclose($manejador);
    if (random_int(1, 200) === 1) {
        segLimpiarLimites($carpeta);
    }
    if ($datos['cantidad'] > $maximo) {
        // Solo el primer exceso de cada ventana suma una falta: una rafaga corta de un aula no
        // banea a nadie, pero un bot que insiste ventana tras ventana si.
        if ($datos['cantidad'] === $maximo + 1) {
            segSumarFalta($grupo);
        }
        $espera = max(1, $datos['inicio'] + $ventanaSegundos - $ahora);
        header('Retry-After: ' . $espera);
        segFalla('Demasiadas solicitudes. Espera unos segundos y volve a intentar.', 429);
    }
}

/* ---------- Bloqueo escalonado de IPs y modo de ataque (F-10, 3ra entrega) ---------- */

function segModoAtaque(): bool {
    // Se activa con: php seguridad/modo_ataque.php activar
    static $activo = null;
    return $activo ??= is_file(SEG_ALMACEN . '/modo-ataque');
}

function segArchivoIp(string $tipo): string {
    return segAsegurarAlmacen('limites') . '/' . $tipo . '-' . hash('sha256', segIp());
}

function segSegundosDeBaneo(): int {
    $archivo = segArchivoIp('baneo');
    if (!is_file($archivo)) {
        return 0;
    }
    $hasta = (int) @file_get_contents($archivo);
    if ($hasta <= time()) {
        @unlink($archivo);
        return 0;
    }
    return $hasta - time();
}

function segSumarFalta(string $grupo): void {
    $archivo = segArchivoIp('faltas');
    $manejador = @fopen($archivo, 'c+');
    if ($manejador === false || !flock($manejador, LOCK_EX)) {
        return;
    }
    $datos = json_decode((string) stream_get_contents($manejador), true);
    $ahora = time();
    if (!is_array($datos) || ($datos['inicio'] ?? 0) + SEG_FALTAS_VENTANA <= $ahora) {
        $datos = ['inicio' => $ahora, 'cantidad' => 0];
    }
    $datos['cantidad']++;
    $banear = $datos['cantidad'] >= (segModoAtaque() ? 2 : SEG_FALTAS_PARA_BANEO);
    if ($banear) {
        $datos = ['inicio' => $ahora, 'cantidad' => 0];
    }
    ftruncate($manejador, 0);
    rewind($manejador);
    fwrite($manejador, json_encode($datos));
    flock($manejador, LOCK_UN);
    fclose($manejador);
    if ($banear) {
        @file_put_contents(segArchivoIp('baneo'), (string) ($ahora + SEG_BANEO_DURACION), LOCK_EX);
        segRegistrarEvento(null, 'ip_bloqueada', null, 'grupo=' . $grupo . ' duracion=' . SEG_BANEO_DURACION . 's');
    }
}

function segLimpiarLimites(string $carpeta): void {
    // Un ataque con miles de IPs falsas crea miles de contadores: se borran los viejos.
    $limite = time() - SEG_LIMPIEZA_LIMITES;
    foreach (glob($carpeta . '/*') ?: [] as $archivo) {
        if (@filemtime($archivo) < $limite) {
            @unlink($archivo);
        }
    }
}

/* Primer filtro de cada peticion: corre ANTES de conectar a la base de datos, asi una
   inundacion no agota las conexiones de MySQL. Solo usa encabezados y archivos locales. */
function segFiltroTemprano(): void {
    segEncabezados();
    segExigirHttps();
    $baneo = segSegundosDeBaneo();
    if ($baneo > 0) {
        header('Retry-After: ' . $baneo);
        segFalla('Tu conexion quedo bloqueada temporalmente por exceso de solicitudes.', 429, ['codigo' => 'bloqueada']);
    }
    segLimitarTamanoCuerpo();
    segLimitarPeticiones('api', SEG_API_PETICIONES_POR_IP, 60);
}

function segExigirRegistroAbierto(): void {
    if (segModoAtaque()) {
        header('Retry-After: 900');
        segFalla('El registro esta cerrado temporalmente. Intenta mas tarde.', 503);
    }
}

function segLimitarTamanoCuerpo(): void {
    $largo = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($largo > SEG_TAMANO_MAXIMO_CUERPO) {
        segFalla('La solicitud es demasiado grande.', 413);
    }
}

/* ---------- Sesion (F-04) ---------- */

function segIniciarSesion(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.sid_length', '48');
    ini_set('session.sid_bits_per_character', '6');
    ini_set('session.gc_maxlifetime', (string) SEG_DURACION_RECORDAR);
    $carpeta = segAsegurarAlmacen('sesiones');
    if (is_dir($carpeta) && is_writable($carpeta)) {
        session_save_path($carpeta);
    }
    session_name(segEsHttps() ? '__Host-SGRSI' : 'SGRSI');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => segEsHttps(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();

    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    if (empty($_SESSION['usuario'])) {
        return;
    }
    $ahora = time();
    $sesion = $_SESSION['usuario'];
    $limite = $sesion['recordar'] ? SEG_DURACION_RECORDAR : SEG_DURACION_MAXIMA;
    $vencida = ($ahora - $sesion['ultimaActividad']) > ($sesion['recordar'] ? SEG_DURACION_RECORDAR : SEG_INACTIVIDAD)
        || ($ahora - $sesion['inicio']) > $limite;
    // La huella del navegador detecta una cookie robada usada desde otro cliente.
    $huellaDistinta = !hash_equals($sesion['huella'], hash('sha256', segAgente()));
    if ($vencida || $huellaDistinta) {
        segCerrarSesion();
        segIniciarSesion();
        return;
    }
    $_SESSION['usuario']['ultimaActividad'] = $ahora;
    if ($ahora - ($sesion['rotada'] ?? 0) > SEG_ROTAR_ID) {
        session_regenerate_id(true);
        $_SESSION['usuario']['rotada'] = $ahora;
        segReenviarCookie();
    }
}

function segReenviarCookie(): void {
    $recordar = !empty($_SESSION['usuario']['recordar']);
    setcookie(session_name(), session_id(), [
        'expires' => $recordar ? time() + SEG_DURACION_RECORDAR : 0,
        'path' => '/',
        'secure' => segEsHttps(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function segAbrirSesionUsuario(string $cedula, string $rol, bool $recordar, int $version = 0): void {
    segIniciarSesion();
    session_regenerate_id(true); // evita fijacion de sesion
    $ahora = time();
    $_SESSION = [
        'csrf' => bin2hex(random_bytes(32)),
        'usuario' => [
            'cedula' => $cedula,
            'rol' => $rol,
            'recordar' => $recordar,
            'inicio' => $ahora,
            'ultimaActividad' => $ahora,
            'rotada' => $ahora,
            'huella' => hash('sha256', segAgente()),
            // F-08: "cerrar todas las sesiones" sube la version en la BD y las sesiones viejas dejan de valer.
            'version' => $version,
        ],
    ];
    segReenviarCookie();
}

function segCerrarSesion(): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }
    $_SESSION = [];
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => segEsHttps(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_destroy();
}

function segCsrf(): string {
    return (string) ($_SESSION['csrf'] ?? '');
}

function segVerificarCsrf(): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($metodo, ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }
    $origen = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origen !== '') {
        $hostOrigen = parse_url($origen, PHP_URL_HOST) . (parse_url($origen, PHP_URL_PORT) ? ':' . parse_url($origen, PHP_URL_PORT) : '');
        if (strcasecmp($hostOrigen, (string) ($_SERVER['HTTP_HOST'] ?? '')) !== 0) {
            segFalla('Origen de la solicitud no permitido.', 403, ['codigo' => 'origen']);
        }
    }
    $token = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($token === '' || !hash_equals(segCsrf(), $token)) {
        segFalla('La sesion de seguridad expiro. Recarga la pagina.', 403, ['codigo' => 'csrf']);
    }
}

/* ---------- Usuario autenticado y roles (F-02) ---------- */

$SEG_USUARIO = null;

function segUsuario(): ?array {
    global $SEG_USUARIO;
    return $SEG_USUARIO;
}

function segCargarUsuario(PDO $pdo): ?array {
    global $SEG_USUARIO;
    if (empty($_SESSION['usuario']['cedula'])) {
        return null;
    }
    // Se relee de la BD en cada peticion: si un admin desactiva o cambia el rol, aplica al instante.
    $consulta = $pdo->prepare('SELECT cedula, rol, estado, sesion_version FROM USUARIO WHERE cedula = ?');
    $consulta->execute([$_SESSION['usuario']['cedula']]);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    // Tambien se corta si el usuario cerro todas sus sesiones o cambio la contrasena (F-08).
    if (!$fila || $fila['estado'] !== 'Activo'
        || (int) $fila['sesion_version'] !== (int) ($_SESSION['usuario']['version'] ?? 0)) {
        segCerrarSesion();
        return null;
    }
    $SEG_USUARIO = ['cedula' => (string) $fila['cedula'], 'rol' => (string) $fila['rol']];
    return $SEG_USUARIO;
}

function segExigirRol(array $roles): array {
    $usuario = segUsuario();
    if ($usuario === null) {
        segFalla('Necesitas iniciar sesion.', 401, ['codigo' => 'sesion']);
    }
    if (!in_array($usuario['rol'], $roles, true)) {
        segRegistrarEvento(null, 'acceso_denegado', $usuario['cedula'], ($_SERVER['REQUEST_METHOD'] ?? '') . ' ' . basename((string) ($_SERVER['SCRIPT_NAME'] ?? '')));
        segFalla('Tu rol no tiene permiso para esta accion.', 403, ['codigo' => 'rol']);
    }
    return $usuario;
}

function segEsAdmin(): bool {
    return (segUsuario()['rol'] ?? '') === 'Administrador';
}

function segEsPersonal(): bool {
    return in_array(segUsuario()['rol'] ?? '', ['Administrador', 'Tecnico_Asistente'], true);
}

const SEG_PERSONAL = ['Administrador', 'Tecnico_Asistente'];
const SEG_TODOS = ['Administrador', 'Tecnico_Asistente', 'Solicitante'];

/* ---------- Contrasenas (F-03) ---------- */

function segAlgoritmo(): string|int {
    return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
}

function segHashFicticio(): string {
    return defined('PASSWORD_ARGON2ID')
        ? '$argon2id$v=19$m=65536,t=4,p=1$QWFSWFJWdThvUlJGV0tzRQ$L+6n1hSfl/jAIBI5lD/hqcEZXnEidK3J5S9NgpoYW2Q'
        : '$2y$12$TUapymrEie3o012Rwui42ehp/eFm2CN8nmWZi74xARQbmXJ0vd6wS';
}

function segHashContrasena(string $contrasena): string {
    return password_hash($contrasena, segAlgoritmo());
}

function segEsHash(string $valor): bool {
    return password_get_info($valor)['algo'] !== null;
}

function segValidarContrasenaNueva(string $contrasena): void {
    $largo = function_exists('mb_strlen') ? mb_strlen($contrasena, 'UTF-8') : strlen($contrasena);
    if ($largo < 8 || $largo > 128
        || !preg_match('/[A-Z]/', $contrasena) || !preg_match('/[a-z]/', $contrasena) || !preg_match('/\d/', $contrasena)) {
        segFalla('La contrasena necesita entre 8 y 128 caracteres, una mayuscula, una minuscula y un numero.', 400);
    }
    $comunes = ['Password1', 'Contrasena1', 'Qwerty123', 'Abc12345', 'Admin123', 'Welcome1', 'Iloveyou1', 'Usuario1', 'Cept2026', 'Nexus123'];
    foreach ($comunes as $comun) {
        if (strcasecmp($contrasena, $comun) === 0) {
            segFalla('Esa contrasena es demasiado comun. Elegi otra.', 400);
        }
    }
}

/* ---------- Registro de eventos de seguridad (F-01, F-02, F-11) ---------- */

$SEG_PDO = null;

function segRegistrarEvento(?PDO $pdo, string $tipo, ?string $cedula, string $detalle = ''): void {
    global $SEG_PDO;
    $pdo = $pdo ?? $SEG_PDO;
    $linea = sprintf("%s\t%s\t%s\t%s\t%s\n", date('c'), $tipo, segIp(), $cedula ?? '-', str_replace(["\n", "\t"], ' ', $detalle));
    @file_put_contents(segAsegurarAlmacen('logs') . '/seguridad-' . date('Y-m') . '.log', $linea, FILE_APPEND | LOCK_EX);
    if ($pdo === null) {
        return;
    }
    try {
        $consulta = $pdo->prepare(
            'INSERT INTO seguridad_eventos (tipo, cedula, ip, agente, detalle) VALUES (?, ?, ?, ?, ?)'
        );
        $consulta->execute([$tipo, $cedula, segIp(), segAgente(), substr($detalle, 0, 500)]);
    } catch (Throwable $error) {
        error_log('seguridad_eventos: ' . $error->getMessage());
    }
}

function segAsegurarTablas(PDO $pdo): void {
    $marca = SEG_ALMACEN . '/.tablas-v2';
    if (is_file($marca)) {
        return;
    }
    try {
        $pdo->exec(file_get_contents(__DIR__ . '/tablas.sql'));
    } catch (Throwable $error) {
        // Con el usuario de BD de minimo privilegio no hay CREATE/ALTER: ejecutar seguridad/migracion.sql a mano.
        error_log('No se pudieron crear las tablas de seguridad: ' . $error->getMessage());
    }
    // Sin las columnas de la 3ra entrega el login no puede funcionar: se avisa claro en vez de un 500 opaco.
    $columnas = $pdo->query(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIO'
           AND COLUMN_NAME IN ('totp_secreto', 'totp_ultimo_paso', 'sesion_version')"
    )->fetchColumn();
    if ((int) $columnas !== 3) {
        segFalla('Falta ejecutar seguridad/migracion.sql en la base de datos (columnas de la 3ra entrega).', 500);
    }
    segAsegurarAlmacen('');
    @file_put_contents($marca, date('c'));
}

/* ---------- Punto de entrada para la API ---------- */

function segProtegerApi(PDO $pdo, array $publicos = []): void {
    global $SEG_PDO;
    $SEG_PDO = $pdo;
    // Encabezados, HTTPS, IP bloqueada, tamano y limite por IP ya los aplico segFiltroTemprano().
    segIniciarSesion();
    segVerificarCsrf();
    segCargarUsuario($pdo);
    if (segUsuario() !== null) {
        segLimitarPeticiones('api-usuario-' . segUsuario()['cedula'], SEG_API_PETICIONES_POR_MINUTO, 60);
    }

    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    // Denegar por defecto: solo lo listado como publico funciona sin sesion.
    if (segUsuario() === null && !in_array($metodo, $publicos, true)) {
        segFalla('Necesitas iniciar sesion.', 401, ['codigo' => 'sesion']);
    }
}
