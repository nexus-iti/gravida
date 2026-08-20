<?php

$host = "127.0.0.1";
$port = "3306";
$db   = "proyecto";
$user = "root";
$pass = "";

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "No se pudo conectar a la base de datos"]));
}
