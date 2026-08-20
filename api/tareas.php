<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

function estadoTareaBase(string $estado): string {
    return match (texto($estado, 20)) {
        'Pendiente' => 'Pendiente',
        'En curso', 'En revision', 'En proceso' => 'En proceso',
        'Completado', 'Completada' => 'Completada',
        default => errorApi('Estado de tarea no valido.'),
    };
}

function estadoTareaCliente(string $estado): string {
    return match ($estado) {
        'En proceso' => 'En curso',
        'Completada' => 'Completado',
        default => $estado,
    };
}

function exigirResponsableTarea(PDO $pdo, string $cedula): void {
    if ($cedula === '') {
        return;
    }
    $consulta = $pdo->prepare(
        "SELECT 1 FROM USUARIO
         WHERE cedula = ? AND estado = 'Activo' AND rol IN ('Tecnico_Asistente', 'Administrador')"
    );
    $consulta->execute([$cedula]);
    if (!$consulta->fetch()) {
        errorApi('El responsable debe ser un usuario activo con rol tecnico o administrador.');
    }
}

exigirMetodo(['GET', 'POST', 'PATCH', 'DELETE']);

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            'SELECT t.id_tarea, t.titulo_tarea, t.descripcion_tarea, t.plazo_tarea, t.categoria_tarea,
                    t.estado_tarea, t.color_tarea, t.fecha_agregada, MIN(rt.cedula) AS tecnico_cedula
             FROM TAREAS t LEFT JOIN REALIZA_TAREA rt ON rt.id_tarea = t.id_tarea
             GROUP BY t.id_tarea, t.titulo_tarea, t.descripcion_tarea, t.plazo_tarea, t.categoria_tarea,
                      t.estado_tarea, t.color_tarea, t.fecha_agregada
             ORDER BY t.plazo_tarea, t.id_tarea DESC'
        );
        $consulta->execute();
        $tareas = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $tareas[] = [
                'id' => (string) $fila['id_tarea'], 'titulo' => $fila['titulo_tarea'],
                'descripcion' => $fila['descripcion_tarea'], 'categoria' => $fila['categoria_tarea'] ?: 'Otro',
                'estado' => estadoTareaCliente($fila['estado_tarea']), 'color' => $fila['color_tarea'] ?: '#16A34A',
                'fechaAgregada' => $fila['fecha_agregada'], 'plazoInicio' => $fila['plazo_tarea'],
                'plazoFin' => $fila['plazo_tarea'], 'tecnicoId' => (string) ($fila['tecnico_cedula'] ?? ''),
                'dificultad' => 'Media',
            ];
        }
        responder($tareas);
    }

    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $id = entero($datos['id'] ?? null, 'id');
        $pdo->beginTransaction();
        try {
            $eliminarAsignacion = $pdo->prepare('DELETE FROM REALIZA_TAREA WHERE id_tarea = ?');
            $eliminarAsignacion->execute([$id]);
            $consulta = $pdo->prepare('DELETE FROM TAREAS WHERE id_tarea = ?');
            $consulta->execute([$id]);
            if ($consulta->rowCount() === 0) {
                $pdo->rollBack();
                errorApi('No existe la tarea indicada.', 404);
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
        responder(['ok' => true]);
    }

    $tecnico = preg_replace('/\\D/', '', texto($datos['tecnicoId'] ?? '', 15));
    exigirResponsableTarea($pdo, $tecnico);
    $titulo = texto($datos['titulo'] ?? '', 100);
    if ($titulo === '') {
        errorApi('El titulo de la tarea es obligatorio.');
    }
    $plazo = fecha($datos['plazoFin'] ?? ($datos['plazoInicio'] ?? ''), 'plazoFin', true);
    $valores = [
        $titulo, texto($datos['descripcion'] ?? '', 65535), $plazo,
        texto($datos['categoria'] ?? 'Otro', 60), estadoTareaBase((string) ($datos['estado'] ?? 'Pendiente')),
        texto($datos['color'] ?? '#16A34A', 7), $tecnico,
    ];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $pdo->beginTransaction();
        try {
            $consulta = $pdo->prepare(
                'INSERT INTO TAREAS (titulo_tarea, descripcion_tarea, plazo_tarea, categoria_tarea,
                 estado_tarea, color_tarea, fecha_agregada) VALUES (?, ?, ?, ?, ?, ?, CURDATE())'
            );
            $consulta->execute(array_slice($valores, 0, 6));
            $id = (int) $pdo->lastInsertId();
            if ($tecnico !== '') {
                $asignar = $pdo->prepare('INSERT INTO REALIZA_TAREA (cedula, id_tarea) VALUES (?, ?)');
                $asignar->execute([$tecnico, $id]);
            }
            $pdo->commit();
            responder(['ok' => true, 'id' => (string) $id], 201);
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }
    }

    $id = entero($datos['id'] ?? null, 'id');
    $pdo->beginTransaction();
    try {
        $actualizar = $pdo->prepare(
            'UPDATE TAREAS SET titulo_tarea = ?, descripcion_tarea = ?, plazo_tarea = ?, categoria_tarea = ?,
             estado_tarea = ?, color_tarea = ? WHERE id_tarea = ?'
        );
        $actualizar->execute([...array_slice($valores, 0, 6), $id]);
        if ($actualizar->rowCount() === 0) {
            $pdo->rollBack();
            errorApi('No existe la tarea indicada.', 404);
        }
        $eliminarAsignacion = $pdo->prepare('DELETE FROM REALIZA_TAREA WHERE id_tarea = ?');
        $eliminarAsignacion->execute([$id]);
        if ($tecnico !== '') {
            $asignar = $pdo->prepare('INSERT INTO REALIZA_TAREA (cedula, id_tarea) VALUES (?, ?)');
            $asignar->execute([$tecnico, $id]);
        }
        $pdo->commit();
        responder(['ok' => true]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
});
