<?php
declare(strict_types=1);

/*
 * Autenticacion de SGRSI.
 *   GET                 -> estado de la sesion y token CSRF.
 *   POST                -> iniciar sesion (identificador = correo o cedula, contrasena, recordarme).
 *   POST accion=verificar_2fa (codigo) -> segundo paso si la cuenta usa verificacion en dos pasos.
 *   POST accion=salir   -> cerrar sesion.
 */

$metodosPublicos = ['GET', 'POST'];
require_once __DIR__ . '/api/common.php';

exigirMetodo(['GET', 'POST']);

function datosLogin(): array {
    $tipo = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_contains($tipo, 'application/json')) {
        return cuerpoJson();
    }
    return $_POST;
}

function usuarioSesionCliente(PDO $pdo, string $cedula): ?array {
    $consulta = $pdo->prepare(
        'SELECT cedula, nombre, apellido, correo_electronico, estado, rol, descripcion, fecha_registro, foto_perfil, debe_cambiar_contrasena
         FROM USUARIO WHERE cedula = ?'
    );
    $consulta->execute([$cedula]);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    return $fila ? usuarioCliente($fila) : null;
}

function registrarIntento(PDO $pdo, string $identificador, bool $exito): void {
    $consulta = $pdo->prepare('INSERT INTO seguridad_intentos_login (ip, identificador, exito) VALUES (?, ?, ?)');
    $consulta->execute([segIp(), $identificador, $exito ? 1 : 0]);
}

function segundosDeBloqueo(PDO $pdo, string $columna, string $valor, int $maximo, ?string $ip = null): int {
    // Por cuenta, un ingreso correcto reinicia el contador; por IP no (si no, una cuenta propia lo resetearia).
    $desdeExito = $columna === 'identificador'
        ? "AND fecha > COALESCE((SELECT MAX(fecha) FROM seguridad_intentos_login
                                 WHERE identificador = :valor2 AND exito = 1), '1970-01-01')"
        : '';
    $porIp = $ip !== null ? 'AND ip = :ip' : '';
    $consulta = $pdo->prepare(
        "SELECT COUNT(*) AS fallos,
                TIMESTAMPDIFF(SECOND, NOW(), MAX(fecha) + INTERVAL " . SEG_LOGIN_VENTANA . " SECOND) AS espera
         FROM seguridad_intentos_login
         WHERE {$columna} = :valor AND exito = 0 AND fecha > NOW() - INTERVAL " . SEG_LOGIN_VENTANA . " SECOND
         {$desdeExito} {$porIp}"
    );
    $parametros = ['valor' => $valor];
    if ($desdeExito) {
        $parametros['valor2'] = $valor;
    }
    if ($ip !== null) {
        $parametros['ip'] = $ip;
    }
    $consulta->execute($parametros);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    return (int) $fila['fallos'] >= $maximo ? max(1, (int) $fila['espera']) : 0;
}


function bloquearSiCorresponde(PDO $pdo, string $identificadorHash): void {
    // Los fallos de la cuenta se cuentan por IP de origen: cinco intentos de un tercero cierran la
    // puerta a ese tercero, no al titular que entra desde otra IP. El tope por cuenta sin importar
    // la IP queda alto, solo para frenar un ataque distribuido.
    $espera = max(
        segundosDeBloqueo($pdo, 'identificador', $identificadorHash, SEG_LOGIN_MAX_FALLOS_CUENTA, segIp()),
        segundosDeBloqueo($pdo, 'identificador', $identificadorHash, SEG_LOGIN_MAX_FALLOS_CUENTA_TOTAL),
        segundosDeBloqueo($pdo, 'ip', segIp(), SEG_LOGIN_MAX_FALLOS_IP)
    );
    if ($espera > 0) {
        segRegistrarEvento($pdo, 'login_bloqueado', null, 'identificador=' . substr($identificadorHash, 0, 12));
        header('Retry-After: ' . $espera);
        errorApi('Demasiados intentos fallidos. Intenta de nuevo en ' . (int) ceil($espera / 60) . ' minuto(s).', 429);
    }
}

/* Ultimo paso comun: contrasena (y segundo factor, si corresponde) ya verificados. */
function completarIngreso(PDO $pdo, string $cedula, string $rol, bool $recordar, string $identificadorHash): void {
    $anterior = $pdo->prepare(
        "SELECT fecha, ip FROM seguridad_eventos WHERE cedula = ? AND tipo = 'login_ok' ORDER BY id DESC LIMIT 1"
    );
    $anterior->execute([$cedula]);
    $ultimoAcceso = $anterior->fetch(PDO::FETCH_ASSOC) ?: null;

    $version = $pdo->prepare('SELECT sesion_version FROM USUARIO WHERE cedula = ?');
    $version->execute([$cedula]);

    registrarIntento($pdo, $identificadorHash, true);
    segAbrirSesionUsuario($cedula, $rol, $recordar, (int) $version->fetchColumn());
    segRegistrarEvento($pdo, 'login_ok', $cedula, $recordar ? 'recordar' : '');

    responder([
        'ok' => true,
        'cedula' => $cedula,
        'usuario' => usuarioSesionCliente($pdo, $cedula),
        'csrf' => segCsrf(),
        // F-08: mostrar el ultimo acceso ayuda a detectar el uso de una cuenta robada.
        'ultimoAcceso' => $ultimoAcceso,
    ]);
}

/* F-08 (3ra entrega): segundo paso del login con el codigo TOTP. */
function verificarSegundoFactor(PDO $pdo, array $datos): void {
    $pendiente = $_SESSION['pre2fa'] ?? null;
    if (!is_array($pendiente) || time() - $pendiente['inicio'] > SEG_2FA_VENTANA_LOGIN) {
        unset($_SESSION['pre2fa']);
        errorApi('El tiempo para ingresar el código venció. Volvé a escribir tu contraseña.', 401);
    }
    bloquearSiCorresponde($pdo, $pendiente['clave']);

    $enrolando = isset($pendiente['secretoNuevo']);
    if ($enrolando) {
        $secreto = $pendiente['secretoNuevo'];
        $ultimoPaso = null;
    } else {
        $consulta = $pdo->prepare('SELECT totp_secreto, totp_ultimo_paso FROM USUARIO WHERE cedula = ?');
        $consulta->execute([$pendiente['cedula']]);
        $fila = $consulta->fetch(PDO::FETCH_ASSOC);
        $secreto = (string) ($fila['totp_secreto'] ?? '');
        $ultimoPaso = isset($fila['totp_ultimo_paso']) ? (int) $fila['totp_ultimo_paso'] : null;
    }

    $paso = totpVerificar($secreto, (string) ($datos['codigo'] ?? ''), $ultimoPaso);
    if ($paso === null) {
        // Cuenta como intento fallido de la cuenta: 5 codigos malos la bloquean igual que 5 contrasenas.
        registrarIntento($pdo, $pendiente['clave'], false);
        segRegistrarEvento($pdo, '2fa_fallido', $pendiente['cedula']);
        $_SESSION['pre2fa']['intentos'] = ($pendiente['intentos'] ?? 0) + 1;
        if ($_SESSION['pre2fa']['intentos'] >= SEG_2FA_MAX_INTENTOS) {
            unset($_SESSION['pre2fa']);
            errorApi('Demasiados códigos incorrectos. Volvé a escribir tu contraseña.', 401);
        }
        errorApi('El código no es correcto o ya fue usado. Espera el siguiente e intenta de nuevo.', 401);
    }

    // Se guarda el paso usado: el mismo codigo no sirve dos veces (aunque lo capture un sitio falso).
    if ($enrolando) {
        $guardar = $pdo->prepare('UPDATE USUARIO SET totp_secreto = ?, totp_ultimo_paso = ? WHERE cedula = ?');
        $guardar->execute([$secreto, $paso, $pendiente['cedula']]);
        segRegistrarEvento($pdo, '2fa_activado', $pendiente['cedula'], 'en el login (obligatorio)');
    } else {
        $guardar = $pdo->prepare('UPDATE USUARIO SET totp_ultimo_paso = ? WHERE cedula = ?');
        $guardar->execute([$paso, $pendiente['cedula']]);
    }
    unset($_SESSION['pre2fa']);
    completarIngreso($pdo, $pendiente['cedula'], $pendiente['rol'], $pendiente['recordar'], $pendiente['clave']);
}

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $usuario = segUsuario();
        responder([
            'autenticado' => $usuario !== null,
            'usuario' => $usuario ? usuarioSesionCliente($pdo, $usuario['cedula']) : null,
            'csrf' => segCsrf(),
        ]);
    }

    // El POST de login no lleva token (todavia no hay sesion), pero no puede venir de otro sitio.
    segExigirOrigenPropio();

    $datos = datosLogin();
    $accion = texto($datos['accion'] ?? '', 20);
    if ($accion === 'salir') {
        $usuario = segUsuario();
        if ($usuario) {
            exigirCsrf();
        }
        if ($usuario) {
            segRegistrarEvento($pdo, 'logout', $usuario['cedula']);
        }
        segCerrarSesion();
        responder(['ok' => true]);
    }

    // F-01: limite rapido por IP antes de tocar la BD.
    segLimitarPeticiones('login', 30, 60, true);

    if ($accion === 'verificar_2fa') {
        verificarSegundoFactor($pdo, $datos);
    }

    $identificadorEntrada = mb_strtolower(trim((string) ($datos['identificador'] ?? '')), 'UTF-8');
    $contrasena = (string) ($datos['contrasena'] ?? '');
    $recordar = in_array((string) ($datos['recordarme'] ?? ''), ['1', 'true', 'on'], true);
    if ($identificadorEntrada === '' || $contrasena === '' || strlen($identificadorEntrada) > 150 || strlen($contrasena) > 1024) {
        errorApi('Ingresa tu correo o cédula y tu contraseña.');
    }
    // Se canoniza el identificador y se resuelve la cuenta ANTES de contar intentos: el bloqueo
    // por cuenta se indexa por la cedula real, asi variar el formato (correo <-> cedula, puntos,
    // espacios, mayusculas) no reinicia el contador de F-01.
    $sinSeparadores = preg_replace('/[.\-\s]/', '', $identificadorEntrada);
    $esCedula = preg_match('/^\d{1,15}$/', $sinSeparadores) === 1;
    $valorBusqueda = $esCedula ? $sinSeparadores : preg_replace('/\s+/', '', $identificadorEntrada);
    $consulta = $pdo->prepare(
        'SELECT cedula, contrasena, estado, rol, totp_secreto FROM USUARIO WHERE '
        . ($esCedula ? 'cedula = ?' : 'LOWER(correo_electronico) = ?')
    );
    $consulta->execute([$valorBusqueda]);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    $identificadorHash = hash('sha256', $fila
        ? 'cuenta:' . $fila['cedula']
        : ($esCedula ? 'cedula:' : 'correo:') . $valorBusqueda);

    bloquearSiCorresponde($pdo, $identificadorHash);

    // Hash ficticio: el tiempo de respuesta es el mismo exista o no la cuenta.
    $guardada = $fila ? (string) $fila['contrasena'] : segHashFicticio();
    $esHash = segEsHash($guardada);
    $valida = $esHash
        ? password_verify($contrasena, $guardada)
        : hash_equals($guardada, $contrasena); // cuenta heredada en texto plano: se migra abajo
    if (!$esHash) {
        password_verify($contrasena, segHashFicticio());
    }

    if (!$fila || !$valida) {
        registrarIntento($pdo, $identificadorHash, false);
        segRegistrarEvento($pdo, 'login_fallido', $fila ? (string) $fila['cedula'] : null);
        errorApi('Correo, cédula o contraseña incorrectos.', 401);
    }
    if ($fila['estado'] !== 'Activo') {
        // Credenciales correctas pero cuenta pendiente: no es un fallo, no se cuenta para el bloqueo.
        segRegistrarEvento($pdo, 'login_inactivo', (string) $fila['cedula']);
        errorApi('Tu cuenta todavía no está habilitada. Un administrador debe aprobarla.', 403);
    }

    // F-03: se migra a Argon2id/bcrypt al primer ingreso correcto.
    if (!$esHash || password_needs_rehash($guardada, segAlgoritmo())) {
        $actualizar = $pdo->prepare('UPDATE USUARIO SET contrasena = ? WHERE cedula = ?');
        $actualizar->execute([segHashContrasena($contrasena), $fila['cedula']]);
    }

    $cedula = (string) $fila['cedula'];
    $rol = (string) $fila['rol'];
    $tieneSegundoFactor = (string) ($fila['totp_secreto'] ?? '') !== '';
    $debeActivar = !$tieneSegundoFactor && $rol === 'Administrador' && SEG_2FA_OBLIGATORIO_ADMIN;
    if ($tieneSegundoFactor || $debeActivar) {
        // F-08: la contrasena sola no alcanza. La sesion todavia NO se abre: queda un estado
        // pendiente que solo se completa con el codigo del telefono. Tampoco se registra exito,
        // asi la contrasena correcta no reinicia el contador de codigos fallidos.
        session_regenerate_id(true);
        $_SESSION['pre2fa'] = [
            'cedula' => $cedula,
            'rol' => $rol,
            'recordar' => $recordar,
            'clave' => $identificadorHash,
            'inicio' => time(),
            'intentos' => 0,
        ];
        if ($debeActivar) {
            $secreto = totpGenerarSecreto();
            $_SESSION['pre2fa']['secretoNuevo'] = $secreto;
            responder([
                'ok' => true,
                'paso' => 'activar_2fa',
                'secreto' => $secreto,
                'uri' => totpUri($secreto, $cedula),
                'csrf' => segCsrf(),
            ]);
        }
        responder(['ok' => true, 'paso' => 'codigo_2fa', 'csrf' => segCsrf()]);
    }

    completarIngreso($pdo, $cedula, $rol, $recordar, $identificadorHash);
});
