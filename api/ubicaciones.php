<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

function ubicacionTieneEstadoActivo(PDO $pdo): bool {
    $consulta = $pdo->prepare(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UBICACION' AND COLUMN_NAME = 'esta_activa'"
    );
    $consulta->execute();
    return (bool) $consulta->fetch();
}

function asegurarEstadoActivoUbicacion(PDO $pdo): bool {
    if (ubicacionTieneEstadoActivo($pdo)) {
        return true;
    }
    try {
        $pdo->exec('ALTER TABLE UBICACION ADD COLUMN esta_activa TINYINT(1) NOT NULL DEFAULT 1');
        return true;
    } catch (Throwable $error) {
        error_log($error->getMessage());
        return false;
    }
}

function registrarHistorialUbicacion(PDO $pdo, int $idUbicacion, string $descripcion): void {
    $historial = $pdo->prepare(
        'INSERT INTO HISTORIAL_UBICACION (descripcion, id_ubicacion) VALUES (?, ?)'
    );
    $historial->execute([$descripcion, $idUbicacion]);
}

function historialEquipoTieneDescripcionDesdeUbicacion(PDO $pdo): bool {
    $consulta = $pdo->prepare(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HISTORIAL_EQUIPO' AND COLUMN_NAME = 'descripcion'"
    );
    $consulta->execute();
    return (bool) $consulta->fetch();
}

function asegurarDescripcionHistorialEquipoDesdeUbicacion(PDO $pdo): bool {
    if (historialEquipoTieneDescripcionDesdeUbicacion($pdo)) {
        return true;
    }
    try {
        $pdo->exec('ALTER TABLE HISTORIAL_EQUIPO ADD COLUMN descripcion TEXT NULL AFTER categoria');
        return true;
    } catch (Throwable $error) {
        error_log($error->getMessage());
        return false;
    }
}

function registrarHistorialEquipoDesdeUbicacion(
    PDO $pdo,
    int $idEquipo,
    string $categoria,
    string $descripcion,
    bool $usarDescripcion
): void {
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

exigirMetodo(['GET', 'POST', 'DELETE']);

ejecutar(function () use ($pdo): void {
    asegurarEstadoActivoUbicacion($pdo);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            "SELECT u.id_ubicacion, u.seccion_inventario, COUNT(e.id_equipo) AS cantidad_equipos
             FROM UBICACION u LEFT JOIN EQUIPO e
                ON e.id_ubicacion = u.id_ubicacion
               AND e.esta_activo = 1
               AND e.estado_equipo <> 'Baja'
             WHERE u.esta_activa = 1
             GROUP BY u.id_ubicacion, u.seccion_inventario ORDER BY u.seccion_inventario"
        );
        $consulta->execute();
        $ubicaciones = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $ubicaciones[] = [
                'id' => (string) $fila['id_ubicacion'], 'nombre' => $fila['seccion_inventario'],
                'icono' => 'building-2', 'actualizado' => 'hoy', 'cantidadEquipos' => (int) $fila['cantidad_equipos'],
            ];
        }
        responder($ubicaciones);
    }
    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $nombre = texto($datos['nombre'] ?? '', 100);
        if ($nombre === '') {
            errorApi('El nombre de la ubicacion es obligatorio.');
        }
        $consulta = $pdo->prepare('INSERT INTO UBICACION (seccion_inventario) VALUES (?)');
        $consulta->execute([$nombre]);
        responder(['ok' => true, 'id' => (string) $pdo->lastInsertId()], 201);
    }
    $id = entero($datos['id'] ?? null, 'id');
    $consultaUbicacion = $pdo->prepare(
        'SELECT id_ubicacion, seccion_inventario, esta_activa FROM UBICACION WHERE id_ubicacion = ?'
    );
    $consultaUbicacion->execute([$id]);
    $ubicacion = $consultaUbicacion->fetch(PDO::FETCH_ASSOC);
    if (!$ubicacion) {
        errorApi('No existe la ubicacion indicada.', 404);
    }
    if ((int) $ubicacion['esta_activa'] === 0) {
        responder(['ok' => true, 'sinCambios' => true]);
    }

    $consultaEquiposActivos = $pdo->prepare(
        "SELECT id_equipo, nombre_equipo
         FROM EQUIPO
         WHERE id_ubicacion = ? AND esta_activo = 1 AND estado_equipo <> 'Baja'
         ORDER BY id_equipo"
    );
    $consultaEquiposActivos->execute([$id]);
    $equiposActivos = $consultaEquiposActivos->fetchAll(PDO::FETCH_ASSOC);
    $idDestino = null;
    $destino = null;
    if ($equiposActivos) {
        $destinoTexto = texto($datos['seccionDestinoId'] ?? '', 15);
        if ($destinoTexto === '') {
            errorApi('Elegi una seccion destino para trasladar los equipos antes de eliminar.');
        }
        $idDestino = entero($destinoTexto, 'seccionDestinoId');
        if ($idDestino === $id) {
            errorApi('La seccion destino debe ser distinta a la seccion eliminada.');
        }
        $consultaDestino = $pdo->prepare(
            'SELECT id_ubicacion, seccion_inventario, esta_activa
             FROM UBICACION
             WHERE id_ubicacion = ? AND esta_activa = 1'
        );
        $consultaDestino->execute([$idDestino]);
        $destino = $consultaDestino->fetch(PDO::FETCH_ASSOC);
        if (!$destino) {
            errorApi('No existe una seccion destino activa para trasladar los equipos.', 404);
        }
    }

    $usarDescripcionEquipo = $equiposActivos
        ? asegurarDescripcionHistorialEquipoDesdeUbicacion($pdo)
        : false;
    $pdo->beginTransaction();
    try {
        if ($equiposActivos) {
            $equipos = $pdo->prepare(
                "UPDATE EQUIPO
                 SET id_ubicacion = ?
                 WHERE id_ubicacion = ? AND esta_activo = 1 AND estado_equipo <> 'Baja'"
            );
            $equipos->execute([$idDestino, $id]);
            foreach ($equiposActivos as $equipo) {
                $descripcion = sprintf(
                    'Equipo "%s" trasladado de "%s" a "%s" por eliminacion de seccion.',
                    (string) $equipo['nombre_equipo'],
                    (string) $ubicacion['seccion_inventario'],
                    (string) $destino['seccion_inventario']
                );
                registrarHistorialEquipoDesdeUbicacion(
                    $pdo,
                    (int) $equipo['id_equipo'],
                    'Traslado de equipo',
                    $descripcion,
                    $usarDescripcionEquipo
                );
            }
        }
        $consulta = $pdo->prepare('UPDATE UBICACION SET esta_activa = 0 WHERE id_ubicacion = ?');
        $consulta->execute([$id]);
        $descripcionUbicacion = $equiposActivos
            ? sprintf(
                'Seccion "%s" dada de baja. %d equipo%s trasladado%s a "%s".',
                (string) $ubicacion['seccion_inventario'],
                count($equiposActivos),
                count($equiposActivos) === 1 ? '' : 's',
                count($equiposActivos) === 1 ? '' : 's',
                (string) $destino['seccion_inventario']
            )
            : 'Seccion "' . (string) $ubicacion['seccion_inventario'] . '" dada de baja.';
        registrarHistorialUbicacion(
            $pdo,
            $id,
            $descripcionUbicacion
        );
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    responder([
        'ok' => true,
        'equiposTrasladados' => count($equiposActivos),
        'seccionDestinoId' => $idDestino !== null ? (string) $idDestino : '',
    ]);
});
