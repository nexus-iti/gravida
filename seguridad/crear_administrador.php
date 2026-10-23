<?php
declare(strict_types=1);

/*
 * Crea el primer Administrador de una instalacion nueva. database.sql ya no trae cuentas:
 * un volcado con usuarios reales (correos, hashes y secreto TOTP) no puede vivir en el repositorio.
 *
 *   C:\xampp\php\php.exe seguridad\crear_administrador.php <cedula> <correo> "<nombre completo>"
 *
 * La contrasena se lee de la variable SGRSI_ADMIN_PASSWORD o, si no esta, de la primera linea de la
 * entrada estandar (no se pasa por argumentos: quedaria en el historial del shell). La cuenta nace con
 * debe_cambiar_contrasena=1 y sin segundo factor: en el primer ingreso se fuerza el cambio de
 * contrasena y el enrolamiento de TOTP, que es obligatorio para administradores.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$cedula = preg_replace('/\D/', '', (string) ($argv[1] ?? ''));
$correo = trim((string) ($argv[2] ?? ''));
$nombreCompleto = trim((string) ($argv[3] ?? ''));
if ($cedula === '' || strlen($cedula) > 15 || !filter_var($correo, FILTER_VALIDATE_EMAIL) || $nombreCompleto === '') {
    fwrite(STDERR, "Uso: php seguridad/crear_administrador.php <cedula> <correo> \"<nombre completo>\"\n");
    exit(1);
}

$contrasena = (string) (getenv('SGRSI_ADMIN_PASSWORD') ?: '');
if ($contrasena === '') {
    fwrite(STDERR, "Contrasena del administrador (una linea): ");
    $contrasena = rtrim((string) fgets(STDIN), "\r\n");
}
if (strlen($contrasena) < 12 || strlen($contrasena) > 128
    || !preg_match('/[A-Z]/', $contrasena) || !preg_match('/[a-z]/', $contrasena) || !preg_match('/\d/', $contrasena)
    || preg_match('/[\x{00D1}\x{00F1}]/u', $contrasena)) {
    fwrite(STDERR, "La contrasena necesita entre 12 y 128 caracteres, una mayuscula, una minuscula, un numero y sin la letra enie.\n");
    exit(1);
}

require dirname(__DIR__) . '/config.php';
require __DIR__ . '/bootstrap.php';

$partes = preg_split('/\s+/', $nombreCompleto, -1, PREG_SPLIT_NO_EMPTY);
$nombre = array_shift($partes);
$apellido = implode(' ', $partes) ?: '-';

try {
    $alta = $pdo->prepare(
        "INSERT INTO USUARIO (cedula, nombre, apellido, correo_electronico, contrasena, estado, rol, fecha_registro, debe_cambiar_contrasena)
         VALUES (?, ?, ?, ?, ?, 'Activo', 'Administrador', CURDATE(), 1)"
    );
    $alta->execute([$cedula, $nombre, $apellido, $correo, segHashContrasena($contrasena)]);
} catch (PDOException $error) {
    fwrite(STDERR, $error->getCode() === '23000'
        ? "Ya existe una cuenta con esa cedula o ese correo.\n"
        : "No se pudo crear la cuenta: " . $error->getMessage() . "\n");
    exit(1);
}
segRegistrarEvento($pdo, 'usuario_creado', $cedula, 'administrador inicial desde la consola del servidor');
echo "Administrador $cedula creado. En el primer ingreso debe cambiar la contrasena y configurar el segundo factor.\n";
