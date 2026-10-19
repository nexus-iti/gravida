<?php
declare(strict_types=1);

/*
 * F-08 (3ra entrega): quita la verificacion en dos pasos de una cuenta desde la consola del servidor.
 * Para cuando el unico administrador pierde el telefono (si hay otro admin, puede hacerlo desde Cuenta).
 *
 *   C:\xampp\php\php.exe seguridad\restablecer_2fa.php 57324099
 *
 * Tambien cierra todas las sesiones de esa cuenta. En el proximo ingreso, si es administrador,
 * el sistema le pide configurar el segundo factor otra vez.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$cedula = preg_replace('/\D/', '', (string) ($argv[1] ?? ''));
if ($cedula === '') {
    fwrite(STDERR, "Uso: php seguridad/restablecer_2fa.php <cedula>\n");
    exit(1);
}

require dirname(__DIR__) . '/config.php';
require __DIR__ . '/bootstrap.php';

$consulta = $pdo->prepare(
    'UPDATE USUARIO SET totp_secreto = NULL, totp_ultimo_paso = NULL, sesion_version = sesion_version + 1 WHERE cedula = ?'
);
$consulta->execute([$cedula]);
if ($consulta->rowCount() === 0) {
    fwrite(STDERR, "No existe el usuario $cedula.\n");
    exit(1);
}
segRegistrarEvento($pdo, '2fa_restablecido', $cedula, 'desde la consola del servidor');
echo "Verificacion en dos pasos quitada para $cedula y sus sesiones cerradas.\n";
