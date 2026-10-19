<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
autorizarEndpoint('catalogos');

$definiciones = [
    'categoria_tecnologica' => ['tabla' => 'CATEGORIA_TECNOLOGICA', 'id' => 'id_categoria_tecnologica', 'activo' => 'esta_activa'],
    'categoria_prestamo' => ['tabla' => 'CATEGORIA_PRESTAMO', 'id' => 'id_categoria_prestamo', 'activo' => 'esta_activa'],
    'servicio_disponible' => ['tabla' => 'SERVICIO_DISPONIBLE', 'id' => 'id_servicio_disponible', 'activo' => 'esta_activo'],
];

ejecutar(function () use ($pdo, $definiciones): void {
    $tipo = texto($_GET['tipo'] ?? '', 40);
    if (!isset($definiciones[$tipo])) {
        errorApi('Catalogo no valido.');
    }
    $d = $definiciones[$tipo];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $incluirInactivos = ($_GET['incluirInactivos'] ?? '') === '1';
        $sql = "SELECT {$d['id']} AS id, nombre, descripcion, {$d['activo']} AS activo FROM {$d['tabla']}";
        if (!$incluirInactivos) $sql .= " WHERE {$d['activo']} = 1";
        $sql .= ' ORDER BY nombre';
        responder($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC));
    }
    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $nombre = texto($datos['nombre'] ?? '', 100);
        if ($nombre === '') errorApi('El nombre es obligatorio.');
        $consulta = $pdo->prepare("INSERT INTO {$d['tabla']} (nombre, descripcion) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), {$d['activo']} = 1");
        $consulta->execute([$nombre, texto($datos['descripcion'] ?? '', 255)]);
        responder(['ok' => true, 'id' => (string) $pdo->lastInsertId()], 201);
    }
    $id = entero($datos['id'] ?? null, 'id');
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $consulta = $pdo->prepare("UPDATE {$d['tabla']} SET {$d['activo']} = 0 WHERE {$d['id']} = ?");
        $consulta->execute([$id]);
        if (!$consulta->rowCount()) errorApi('No existe el registro activo indicado.', 404);
        responder(['ok' => true]);
    }
    $nombre = texto($datos['nombre'] ?? '', 100);
    if ($nombre === '') errorApi('El nombre es obligatorio.');
    $consulta = $pdo->prepare("UPDATE {$d['tabla']} SET nombre = ?, descripcion = ?, {$d['activo']} = ? WHERE {$d['id']} = ?");
    $consulta->execute([$nombre, texto($datos['descripcion'] ?? '', 255), !empty($datos['activo']) ? 1 : 0, $id]);
    if (!$consulta->rowCount()) errorApi('No existe el registro indicado o no hubo cambios.', 404);
    responder(['ok' => true]);
});
