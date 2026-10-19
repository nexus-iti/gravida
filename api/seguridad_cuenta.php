<?php
declare(strict_types=1);

/*
 * F-08 (3ra entrega): herramientas del usuario contra el phishing y el robo de cuentas.
 *   GET                                   -> estado de la verificacion en dos pasos y actividad reciente.
 *   POST accion=iniciar_2fa   (contrasena)          -> genera un secreto nuevo (aun no queda activo).
 *   POST accion=confirmar_2fa (codigo)              -> activa la verificacion si el codigo es correcto.
 *   POST accion=desactivar_2fa (contrasena, codigo) -> la quita (no permitido a administradores).
 *   POST accion=restablecer_2fa (cedula)            -> solo admin: para quien perdio el telefono.
 *   POST accion=cerrar_sesiones                     -> cierra todas las demas sesiones abiertas.
 *   POST accion=cambiar_contrasena (actual, nueva)  -> y cierra todas las demas sesiones.
 */

require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST']);

const EVENTOS_VISIBLES = [
    'login_ok', 'login_fallido', 'login_bloqueado', '2fa_fallido', '2fa_activado', '2fa_desactivado',
    '2fa_restablecido', 'sesiones_cerradas', 'contrasena_cambiada', 'logout',
];

function segundoFactorDe(PDO $pdo, string $cedula): array {
    $consulta = $pdo->prepare('SELECT totp_secreto, totp_ultimo_paso FROM USUARIO WHERE cedula = ?');
    $consulta->execute([$cedula]);
    return $consulta->fetch(PDO::FETCH_ASSOC) ?: ['totp_secreto' => null, 'totp_ultimo_paso' => null];
}

function exigirContrasena(PDO $pdo, string $cedula, string $contrasena): void {
    $consulta = $pdo->prepare('SELECT contrasena FROM USUARIO WHERE cedula = ?');
    $consulta->execute([$cedula]);
    $guardada = (string) $consulta->fetchColumn();
    if ($contrasena === '' || strlen($contrasena) > 1024 || !segEsHash($guardada) || !password_verify($contrasena, $guardada)) {
        segRegistrarEvento($pdo, 'reautenticacion_fallida', $cedula);
        errorApi('La contrasena actual no es correcta.', 403);
    }
}

function exigirCodigoActual(PDO $pdo, string $cedula, string $codigo): void {
    $factor = segundoFactorDe($pdo, $cedula);
    $ultimo = $factor['totp_ultimo_paso'] === null ? null : (int) $factor['totp_ultimo_paso'];
    $paso = totpVerificar((string) $factor['totp_secreto'], $codigo, $ultimo);
    if ($paso === null) {
        segRegistrarEvento($pdo, '2fa_fallido', $cedula, 'gestion de cuenta');
        errorApi('El codigo de verificacion no es correcto.', 403);
    }
    $pdo->prepare('UPDATE USUARIO SET totp_ultimo_paso = ? WHERE cedula = ?')->execute([$paso, $cedula]);
}

/* Sube la version: todas las sesiones abiertas quedan invalidas salvo la actual, que se actualiza. */
function cerrarOtrasSesiones(PDO $pdo, string $cedula, bool $mantenerActual = true): void {
    $pdo->prepare('UPDATE USUARIO SET sesion_version = sesion_version + 1 WHERE cedula = ?')->execute([$cedula]);
    if ($mantenerActual) {
        $version = $pdo->prepare('SELECT sesion_version FROM USUARIO WHERE cedula = ?');
        $version->execute([$cedula]);
        $_SESSION['usuario']['version'] = (int) $version->fetchColumn();
        session_regenerate_id(true);
        segReenviarCookie();
    }
}

ejecutar(function () use ($pdo): void {
    $actual = segExigirRol(SEG_TODOS);
    $cedula = $actual['cedula'];
    $esAdmin = $actual['rol'] === 'Administrador';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $marcadores = implode(',', array_fill(0, count(EVENTOS_VISIBLES), '?'));
        $consulta = $pdo->prepare(
            "SELECT fecha, tipo, ip, agente FROM seguridad_eventos
             WHERE cedula = ? AND tipo IN ($marcadores) ORDER BY id DESC LIMIT 15"
        );
        $consulta->execute(array_merge([$cedula], EVENTOS_VISIBLES));
        responder([
            'dosFactores' => [
                'activo' => (string) (segundoFactorDe($pdo, $cedula)['totp_secreto'] ?? '') !== '',
                'obligatorio' => $esAdmin && SEG_2FA_OBLIGATORIO_ADMIN,
            ],
            'esAdmin' => $esAdmin,
            'actividad' => $consulta->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }

    exigirCsrf();

    $datos = cuerpoJson();
    $accion = texto($datos['accion'] ?? '', 30);
    // Las acciones que piden contrasena o codigo tienen su propio limite: una sesion robada no
    // puede usarlas para adivinar la contrasena.
    segLimitarPeticiones('cuenta-' . $cedula, 10, 900, true);

    if ($accion === 'iniciar_2fa') {
        exigirContrasena($pdo, $cedula, (string) ($datos['contrasena'] ?? ''));
        $secreto = totpGenerarSecreto();
        $_SESSION['totp_nuevo'] = ['secreto' => $secreto, 'inicio' => time()];
        responder(['ok' => true, 'secreto' => $secreto, 'uri' => totpUri($secreto, $cedula)]);
    }

    if ($accion === 'confirmar_2fa') {
        $nuevo = $_SESSION['totp_nuevo'] ?? null;
        if (!is_array($nuevo) || time() - $nuevo['inicio'] > 600) {
            unset($_SESSION['totp_nuevo']);
            errorApi('La activacion vencio. Empeza de nuevo.', 400);
        }
        $paso = totpVerificar($nuevo['secreto'], (string) ($datos['codigo'] ?? ''), null);
        if ($paso === null) {
            errorApi('El codigo no coincide. Revisa que el reloj del telefono este en hora.', 400);
        }
        $pdo->prepare('UPDATE USUARIO SET totp_secreto = ?, totp_ultimo_paso = ? WHERE cedula = ?')
            ->execute([$nuevo['secreto'], $paso, $cedula]);
        unset($_SESSION['totp_nuevo']);
        segRegistrarEvento($pdo, '2fa_activado', $cedula);
        responder(['ok' => true]);
    }

    if ($accion === 'desactivar_2fa') {
        if ($esAdmin && SEG_2FA_OBLIGATORIO_ADMIN) {
            errorApi('Para los administradores la verificacion en dos pasos es obligatoria.', 403);
        }
        exigirContrasena($pdo, $cedula, (string) ($datos['contrasena'] ?? ''));
        exigirCodigoActual($pdo, $cedula, (string) ($datos['codigo'] ?? ''));
        $pdo->prepare('UPDATE USUARIO SET totp_secreto = NULL, totp_ultimo_paso = NULL WHERE cedula = ?')->execute([$cedula]);
        segRegistrarEvento($pdo, '2fa_desactivado', $cedula);
        responder(['ok' => true]);
    }

    if ($accion === 'restablecer_2fa') {
        segExigirRol(['Administrador']);
        $objetivo = preg_replace('/\D/', '', texto($datos['cedula'] ?? '', 15));
        if ($objetivo === '' || $objetivo === $cedula) {
            errorApi('Indica la cedula de otro usuario.');
        }
        $existe = $pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula = ?');
        $existe->execute([$objetivo]);
        if (!$existe->fetch()) {
            errorApi('No existe el usuario indicado.', 404);
        }
        // Tambien se cierran sus sesiones: si el telefono se perdio, quien lo tenga queda afuera.
        $pdo->prepare(
            'UPDATE USUARIO SET totp_secreto = NULL, totp_ultimo_paso = NULL, sesion_version = sesion_version + 1 WHERE cedula = ?'
        )->execute([$objetivo]);
        segRegistrarEvento($pdo, '2fa_restablecido', $objetivo, 'por ' . $cedula);
        responder(['ok' => true]);
    }

    if ($accion === 'cerrar_sesiones') {
        cerrarOtrasSesiones($pdo, $cedula);
        segRegistrarEvento($pdo, 'sesiones_cerradas', $cedula);
        responder(['ok' => true, 'csrf' => segCsrf()]);
    }

    if ($accion === 'cambiar_contrasena') {
        exigirContrasena($pdo, $cedula, (string) ($datos['actual'] ?? ''));
        $nueva = (string) ($datos['nueva'] ?? '');
        segValidarContrasenaNueva($nueva);
        if (hash_equals((string) ($datos['actual'] ?? ''), $nueva)) {
            errorApi('La nueva contrasena tiene que ser distinta de la actual.');
        }
        $pdo->prepare('UPDATE USUARIO SET contrasena = ? WHERE cedula = ?')->execute([segHashContrasena($nueva), $cedula]);
        cerrarOtrasSesiones($pdo, $cedula);
        segRegistrarEvento($pdo, 'contrasena_cambiada', $cedula);
        responder(['ok' => true, 'csrf' => segCsrf()]);
    }

    errorApi('Accion no reconocida.');
});
