<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PATCH']);

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            'SELECT p.id_prestamo, p.categoria, p.estado, p.fecha_solicitado, p.fecha_devolucion,
                    p.recursos_solicitados, p.jornada, p.lugar_entrega, p.descripcion, p.cedula,
                    u.nombre, u.apellido, e.id_equipo, e.nombre_equipo
             FROM PRESTAMO p
             INNER JOIN USUARIO u ON u.cedula = p.cedula
             INNER JOIN EQUIPO e ON e.id_equipo = p.id_equipo
             ORDER BY p.id_prestamo DESC'
        );
        $consulta->execute();
        $prestamos = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $recurso = trim((string) ($fila['recursos_solicitados'] ?: $fila['nombre_equipo']));
            $cantidad = 1;
            if (preg_match('/^(\\d+)\\s+(.+)$/u', $recurso, $coincidencias)) {
                $cantidad = (int) $coincidencias[1];
                $recurso = $coincidencias[2];
            }
            $prestamos[] = [
                'id' => (string) $fila['id_prestamo'],
                'categoria' => $fila['categoria'],
                'recurso' => $recurso,
                'cantidad' => $cantidad,
                'fecha' => $fila['fecha_devolucion'],
                'jornada' => $fila['jornada'],
                'ubicacion' => $fila['lugar_entrega'],
                'estado' => estadoPrestamoCliente($fila['estado']),
                'detalle' => $fila['descripcion'],
                'solicitante' => trim($fila['nombre'] . ' ' . $fila['apellido']),
                'solicitanteId' => (string) $fila['cedula'],
                'equipoId' => (string) $fila['id_equipo'],
                'creadoEn' => $fila['fecha_solicitado'],
            ];
        }
        responder($prestamos);
    }

    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
        $fechaDevolucion = fecha($datos['fecha'] ?? '', 'fecha');
        if ($cedula === '') {
            errorApi('El solicitante es obligatorio.');
        }
        $recursosEntrada = $datos['recursos'] ?? null;
        if (!is_array($recursosEntrada)) {
            $recursosEntrada = [[
                'idEquipo' => $datos['idEquipo'] ?? null,
                'nombre' => $datos['recurso'] ?? '',
                'cantidad' => 1,
            ]];
        }
        if (count($recursosEntrada) === 0) {
            errorApi('Debes indicar al menos un equipo para el prestamo.');
        }
        $recursos = [];
        foreach ($recursosEntrada as $recursoEntrada) {
            if (!is_array($recursoEntrada)) {
                errorApi('Cada recurso debe tener un equipo y una cantidad validos.');
            }
            $idEquipo = entero($recursoEntrada['idEquipo'] ?? null, 'idEquipo');
            $nombre = texto($recursoEntrada['nombre'] ?? '', 230);
            $cantidad = filter_var($recursoEntrada['cantidad'] ?? null, FILTER_VALIDATE_INT);
            if ($nombre === '' || $cantidad === false || $cantidad < 1) {
                errorApi('Cada recurso debe tener un nombre y una cantidad valida.');
            }
            $recursos[] = ['idEquipo' => $idEquipo, 'descripcion' => $cantidad . ' ' . $nombre];
        }
        $pdo->beginTransaction();
        try {
            $consulta = $pdo->prepare(
                "INSERT INTO PRESTAMO
                 (categoria, estado, fecha_solicitado, fecha_devolucion, recursos_solicitados, jornada,
                  lugar_entrega, descripcion, cedula, id_equipo)
                 VALUES (?, 'Solicitado', CURDATE(), ?, ?, ?, ?, ?, ?, ?)"
            );
            $vinculo = $pdo->prepare('INSERT INTO SOLICITA_PRESTAMO (cedula, id_prestamo) VALUES (?, ?)');
            $ids = [];
            foreach ($recursos as $recurso) {
                $consulta->execute([
                    texto($datos['categoria'] ?? '', 60), $fechaDevolucion,
                    $recurso['descripcion'], texto($datos['jornada'] ?? '', 30),
                    texto($datos['ubicacion'] ?? '', 100), texto($datos['detalle'] ?? '', 65535),
                    $cedula, $recurso['idEquipo'],
                ]);
                $id = (int) $pdo->lastInsertId();
                $vinculo->execute([$cedula, $id]);
                $ids[] = (string) $id;
            }
            $pdo->commit();
            responder(['ok' => true, 'id' => $ids[0], 'ids' => $ids], 201);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    }

    $id = entero($datos['id'] ?? null, 'id');
    $estado = estadoPrestamoBase((string) ($datos['estado'] ?? ''));
    $consulta = $pdo->prepare('UPDATE PRESTAMO SET estado = ? WHERE id_prestamo = ?');
    $consulta->execute([$estado, $id]);
    if ($consulta->rowCount() === 0) {
        errorApi('No existe el prestamo indicado.', 404);
    }
    responder(['ok' => true]);
});
