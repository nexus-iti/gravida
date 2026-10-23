<?php
declare(strict_types=1);

/*
 * F-03: convierte a hash (Argon2id o bcrypt) todas las contrasenas guardadas en texto plano.
 * Uso (solo consola):  C:\xampp\php\php.exe seguridad\migrar_contrasenas.php
 * Es idempotente: las que ya son hash no se tocan.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/config.php';

$algoritmo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
$filas = $pdo->query('SELECT cedula, contrasena FROM USUARIO')->fetchAll(PDO::FETCH_ASSOC);
$actualizar = $pdo->prepare('UPDATE USUARIO SET contrasena = ? WHERE cedula = ?');

$migradas = 0;
$pdo->beginTransaction();
foreach ($filas as $fila) {
    if (password_get_info((string) $fila['contrasena'])['algo'] !== null) {
        continue;
    }
    $actualizar->execute([password_hash((string) $fila['contrasena'], $algoritmo), $fila['cedula']]);
    $migradas++;
}
$pdo->commit();

printf("Usuarios revisados: %d. Contraseñas convertidas a hash: %d.\n", count($filas), $migradas);
