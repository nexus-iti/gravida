<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PATCH']);

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            'SELECT s.id_servicio, s.tipo_de_servicio, s.estado, s.descripcion, s.titulo, s.lugar,
                    s.fecha_de_solicitud, s.fecha_deseada, s.cedula,
                    solicitante.nombre AS nombre_solicitante, solicitante.apellido AS apellido_solicitante
             FROM SERVICIO s
             INNER JOIN USUARIO solicitante ON solicitante.cedula = s.cedula
             ORDER BY s.id_servicio DESC'
        );
        $consulta->execute();
        $servicios = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $servicios[] = [
                'id' => (string) $fila['id_servicio'], 'titulo' => $fila['titulo'],
                'tipo' => $fila['tipo_de_servicio'], 'fecha' => $fila['fecha_de_solicitud'],
                'fechaDeseada' => $fila['fecha_deseada'] ?? '',
                'lugar' => $fila['lugar'], 'estado' => estadoServicioCliente($fila['estado']),
                'detalle' => $fila['descripcion'],
                'solicitante' => trim($fila['nombre_solicitante'] . ' ' . $fila['apellido_solicitante']),
                'solicitanteId' => (string) $fila['cedula'], 'creadoEn' => $fila['fecha_de_solicitud'],
            ];
        }
        responder($servicios);
    }

    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
        if ($cedula === '') {
            errorApi('El solicitante es obligatorio.');
        }
        $solicitante = $pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula = ?');
        $solicitante->execute([$cedula]);
        if (!$solicitante->fetch()) {
            errorApi('No existe el usuario solicitante indicado.', 404);
        }
        $tipo = texto($datos['tipo'] ?? '', 60);
        $titulo = texto($datos['titulo'] ?? '', 100);
        $lugar = texto($datos['lugar'] ?? '', 100);
        $descripcion = texto($datos['detalle'] ?? '', 65535);
    
        $fechaDeseada = fecha($datos['fechaDeseada'] ?? '', 'fechaDeseada', true);
       
        $consulta = $pdo->prepare(
            "INSERT INTO SERVICIO
             (tipo_de_servicio, estado, descripcion, titulo, lugar, fecha_de_solicitud, fecha_deseada, cedula)
             VALUES (?, 'Pendiente', ?, ?, ?, CURDATE(), ?, ?)"
        );
        $consulta->execute([$tipo, $descripcion, $titulo, $lugar, $fechaDeseada, $cedula]);
        responder(['ok' => true, 'id' => (string) $pdo->lastInsertId()], 201);
    }

    $id = entero($datos['id'] ?? null, 'id');
    $estado = estadoServicioBase((string) ($datos['estado'] ?? ''));
    $existe = $pdo->prepare('SELECT 1 FROM SERVICIO WHERE id_servicio = ?');
    $existe->execute([$id]);
    if (!$existe->fetch()) {
        errorApi('No existe el servicio indicado.', 404);
    }
    $consulta = $pdo->prepare('UPDATE SERVICIO SET estado = ? WHERE id_servicio = ?');
    $consulta->execute([$estado, $id]);
    responder(['ok' => true]);
});
