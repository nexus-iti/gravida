<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

function estadoEquipoBase(string $estado): array {
    return match (texto($estado, 20)) {
        'Mantenimiento' => [1, 'Mantenimiento'],
        'Baja' => [0, 'Baja'],
        default => [1, 'Disponible'],
    };
}

function equipoCliente(array $fila): array {
    return [
        'id' => (string) $fila['id_equipo'], 'nombre' => $fila['nombre_equipo'],
        'tipo' => $fila['categoria_equipo'] ?: 'otro', 'tipoEtiqueta' => $fila['categoria_equipo'] ?: 'Otro',
        'icono' => 'package', 'seccionId' => (string) $fila['id_ubicacion'],
        'seccion' => $fila['seccion_inventario'], 'fechaAlta' => $fila['fecha_agregado'],
        'actualizado' => 'hoy',
        'estaActivo' => (int) $fila['esta_activo'] === 1,
        'estado' => $fila['estado_equipo'] === 'Baja' ? 'Baja' : ($fila['estado_equipo'] === 'Mantenimiento' ? 'Mantenimiento' : 'Activo'),
        'observaciones' => $fila['descripcion'] ?? '', 'marca' => $fila['marca_equipo'] ?? '',
        'cantidad' => (int) $fila['cantidad_del_equipo'],
    ];
}

function historialEquipoTieneDescripcion(PDO $pdo): bool {
    $consulta = $pdo->prepare(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HISTORIAL_EQUIPO' AND COLUMN_NAME = 'descripcion'"
    );
    $consulta->execute();
    return (bool) $consulta->fetch();
}

function asegurarDescripcionHistorialEquipo(PDO $pdo): bool {
    return historialEquipoTieneDescripcion($pdo);
}

function registrarHistorialEquipo(PDO $pdo, int $idEquipo, string $categoria, string $descripcion = '', ?bool $usarDescripcion = null): void {
    if ($usarDescripcion === null) {
        $usarDescripcion = $descripcion !== '' && asegurarDescripcionHistorialEquipo($pdo);
    }
    if ($usarDescripcion) {
        $historial = $pdo->prepare(
            'INSERT INTO HISTORIAL_EQUIPO (categoria, descripcion, id_equipo) VALUES (?, ?, ?)'
        );
        $historial->execute([$categoria, $descripcion, $idEquipo]);
        return;
    }
    $historial = $pdo->prepare(
        'INSERT INTO HISTORIAL_EQUIPO (categoria, id_equipo) VALUES (?, ?)'
    );
    $historial->execute([$categoria, $idEquipo]);
}

exigirMetodo(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
autorizarEndpoint('equipos');

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            "SELECT e.id_equipo, e.nombre_equipo, e.categoria_equipo, e.descripcion, e.marca_equipo,
                    e.cantidad_del_equipo, e.esta_activo, e.estado_equipo, e.fecha_agregado,
                    e.id_ubicacion, u.seccion_inventario
             FROM EQUIPO e INNER JOIN UBICACION u ON u.id_ubicacion = e.id_ubicacion
             WHERE e.esta_activo = 1 AND e.estado_equipo <> 'Baja'
             ORDER BY e.id_equipo DESC"
        );
        $consulta->execute();
        responder(array_map('equipoCliente', $consulta->fetchAll(PDO::FETCH_ASSOC)));
    }

    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $idUbicacion = entero($datos['seccionId'] ?? null, 'seccionId');
        $nombre = texto($datos['nombre'] ?? '', 100);
        if ($nombre === '') {
            errorApi('El nombre del equipo es obligatorio.');
        }
        $categoria = texto($datos['tipo'] ?? 'Otro', 60);
        $descripcion = texto($datos['observaciones'] ?? '', 65535);
        $marca = texto($datos['marca'] ?? '', 60);
        $cantidad = filter_var($datos['cantidad'] ?? 1, FILTER_VALIDATE_INT);
        if ($cantidad === false || $cantidad < 1) {
            errorApi('La cantidad del equipo debe ser un entero positivo.');
        }
        $existe = $pdo->prepare('SELECT 1 FROM UBICACION WHERE id_ubicacion = ?');
        $existe->execute([$idUbicacion]);
        if (!$existe->fetch()) {
            errorApi('No existe la seccion indicada.', 404);
        }
        [$activo, $estado] = estadoEquipoBase((string) ($datos['estado'] ?? 'Activo'));
        $consulta = $pdo->prepare(
            'INSERT INTO EQUIPO
             (nombre_equipo, categoria_equipo, descripcion, marca_equipo, cantidad_del_equipo,
              esta_activo, estado_equipo, fecha_agregado, id_ubicacion)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)'
        );
        $consulta->execute([
            $nombre, $categoria, $descripcion, $marca, $cantidad, $activo, $estado, $idUbicacion,
        ]);
        $id = (int) $pdo->lastInsertId();
        registrarHistorialEquipo($pdo, $id, 'Alta');
        responder(['ok' => true, 'id' => (string) $id], 201);
    }

    if (in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'], true)) {
        $id = entero($datos['id'] ?? null, 'id');
        if (texto($datos['accion'] ?? '', 30) === 'editar') {
            $nombre = texto($datos['nombre'] ?? '', 100);
            $categoria = texto($datos['tipo'] ?? '', 60);
            $marca = texto($datos['marca'] ?? '', 60);
            $descripcion = texto($datos['observaciones'] ?? '', 65535);
            $cantidad = filter_var($datos['cantidad'] ?? null, FILTER_VALIDATE_INT);
            $estado = texto($datos['estado'] ?? '', 30);
            $idUbicacion = entero($datos['seccionId'] ?? null, 'seccionId');
            if ($nombre === '' || $categoria === '' || $cantidad === false || $cantidad < 1) {
                errorApi('Nombre, categoria y cantidad valida son obligatorios.');
            }
            if (!in_array($estado, ['Disponible', 'Mantenimiento'], true)) {
                errorApi('El estado del equipo no es valido.');
            }
            $existe = $pdo->prepare('SELECT 1 FROM EQUIPO WHERE id_equipo = ? AND esta_activo = 1');
            $existe->execute([$id]);
            if (!$existe->fetch()) errorApi('No existe el equipo activo indicado.', 404);
            $ubicacion = $pdo->prepare('SELECT 1 FROM UBICACION WHERE id_ubicacion = ? AND esta_activa = 1');
            $ubicacion->execute([$idUbicacion]);
            if (!$ubicacion->fetch()) errorApi('No existe la seccion activa indicada.', 404);
            $consulta = $pdo->prepare('UPDATE EQUIPO SET nombre_equipo=?, categoria_equipo=?, descripcion=?, marca_equipo=?, cantidad_del_equipo=?, estado_equipo=?, id_ubicacion=? WHERE id_equipo=?');
            $consulta->execute([$nombre, $categoria, $descripcion, $marca, $cantidad, $estado, $idUbicacion, $id]);
            registrarHistorialEquipo($pdo, $id, 'Modificacion', 'Datos generales del equipo actualizados.');
            responder(['ok' => true]);
        }
        $idUbicacion = entero($datos['seccionId'] ?? null, 'seccionId');
        $consultaEquipo = $pdo->prepare(
            'SELECT e.id_equipo, e.nombre_equipo, e.id_ubicacion, u.seccion_inventario
             FROM EQUIPO e INNER JOIN UBICACION u ON u.id_ubicacion = e.id_ubicacion
             WHERE e.id_equipo = ?'
        );
        $consultaEquipo->execute([$id]);
        $equipo = $consultaEquipo->fetch(PDO::FETCH_ASSOC);
        if (!$equipo) {
            errorApi('No existe el equipo indicado.', 404);
        }
        $consultaDestino = $pdo->prepare(
            'SELECT id_ubicacion, seccion_inventario FROM UBICACION WHERE id_ubicacion = ?'
        );
        $consultaDestino->execute([$idUbicacion]);
        $destino = $consultaDestino->fetch(PDO::FETCH_ASSOC);
        if (!$destino) {
            errorApi('No existe la seccion indicada.', 404);
        }
        if ((int) $equipo['id_ubicacion'] === $idUbicacion) {
            responder(['ok' => true, 'sinCambios' => true]);
        }

        $usarDescripcion = asegurarDescripcionHistorialEquipo($pdo);
        $pdo->beginTransaction();
        try {
            $actualizar = $pdo->prepare('UPDATE EQUIPO SET id_ubicacion = ? WHERE id_equipo = ?');
            $actualizar->execute([$idUbicacion, $id]);
            $descripcion = sprintf(
                'Equipo "%s" trasladado de "%s" a "%s".',
                (string) $equipo['nombre_equipo'],
                (string) $equipo['seccion_inventario'],
                (string) $destino['seccion_inventario']
            );
            registrarHistorialEquipo($pdo, $id, 'Traslado de equipo', $descripcion, $usarDescripcion);
            $pdo->commit();
            responder(['ok' => true]);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    }

    $id = entero($datos['id'] ?? null, 'id');
    $consultaEquipo = $pdo->prepare(
        'SELECT e.id_equipo, e.nombre_equipo, e.esta_activo, e.estado_equipo, u.seccion_inventario
         FROM EQUIPO e INNER JOIN UBICACION u ON u.id_ubicacion = e.id_ubicacion
         WHERE e.id_equipo = ?'
    );
    $consultaEquipo->execute([$id]);
    $equipo = $consultaEquipo->fetch(PDO::FETCH_ASSOC);
    if (!$equipo) {
        errorApi('No existe el equipo indicado.', 404);
    }
    if ((int) $equipo['esta_activo'] === 0 || $equipo['estado_equipo'] === 'Baja') {
        responder(['ok' => true, 'sinCambios' => true]);
    }

    $usarDescripcion = asegurarDescripcionHistorialEquipo($pdo);
    $pdo->beginTransaction();
    try {
        $consulta = $pdo->prepare(
            "UPDATE EQUIPO SET esta_activo = 0, estado_equipo = 'Baja' WHERE id_equipo = ?"
        );
        $consulta->execute([$id]);
        $descripcion = sprintf(
            'Equipo "%s" dado de baja desde "%s".',
            (string) $equipo['nombre_equipo'],
            (string) $equipo['seccion_inventario']
        );
        registrarHistorialEquipo($pdo, $id, 'Baja de equipo', $descripcion, $usarDescripcion);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    responder(['ok' => true]);
});
