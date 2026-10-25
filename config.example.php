<?php
/*
 * Conexion a la base de datos. Copiar a config.php (ignorado por git).
 *
 * Los valores salen del entorno, en este orden:
 *   1. variables de entorno reales (compose, Apache SetEnv, la CI);
 *   2. el archivo .env de la raiz del proyecto (copiar .env.example a .env);
 *   3. los valores por defecto de abajo (XAMPP recien instalado).
 * Asi config.php no guarda credenciales: viven en .env, que tampoco se versiona
 * y que el .htaccess no deja descargar.
 */

function nexusCargarEnv(string $archivo): void {
    if (!is_readable($archivo)) {
        return;
    }
    foreach (file($archivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        $linea = trim($linea);
        if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) {
            continue;
        }
        [$clave, $valor] = array_map('trim', explode('=', $linea, 2));
        $valor = preg_replace('/^(["\'])(.*)\1$/', '$2', $valor);
        // Una variable real del entorno gana siempre sobre el archivo.
        if ($clave !== '' && getenv($clave) === false) {
            putenv("$clave=$valor");
        }
    }
}

function nexusEnv(string $clave, string $porDefecto = ''): string {
    $valor = getenv($clave);
    return $valor === false || $valor === '' ? $porDefecto : $valor;
}

nexusCargarEnv(__DIR__ . '/.env');

$host = nexusEnv('DB_HOST', '127.0.0.1');
$port = nexusEnv('DB_PORT', '3306');
$db   = nexusEnv('DB_NAME', 'nexus');
$user = nexusEnv('DB_USER', 'root');
$pass = getenv('DB_PASSWORD') === false ? '' : (string) getenv('DB_PASSWORD');

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["status" => "error", "message" => "No se pudo conectar a la base de datos", "data" => null]));
}
