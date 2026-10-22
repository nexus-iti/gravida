<?php
// Configuracion para el contenedor de back. Lee el entorno que inyecta compose.
// No reemplaza config.php local (ignorado por git); se copia como config.php dentro de la imagen.

$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: '3306';
$db   = getenv('DB_NAME') ?: 'nexus';
$user = getenv('DB_USER') ?: 'nexus_app';
$pass = getenv('DB_PASSWORD') ?: '';

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
