<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
$sesionActual = autorizarEndpoint('prestamos');

ejecutar(function () use ($pdo, $sesionActual): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            'SELECT p.id_prestamo, p.categoria, p.estado, p.fecha_solicitado, p.fecha_devolucion,
                    p.recursos_solicitados, p.jornada, p.lugar_entrega, p.descripcion, p.cedula,
                    u.nombre, u.apellido, e.id_equipo, e.nombre_equipo
             FROM PRESTAMO p
             INNER JOIN USUARIO u ON u.cedula = p.cedula
             INNER JOIN EQUIPO e ON e.id_equipo = p.id_equipo
             WHERE p.esta_activo = 1 ORDER BY p.id_prestamo DESC'
        );
        $consulta->execute();
        $prestamos = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            if (!in_array($sesionActual['rol'], ['Tecnico_Asistente', 'Administrador'], true)
                && (string) $fila['cedula'] !== (string) $sesionActual['cedula']) {
                continue;
            }
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
        $cedula = (string) $sesionActual['cedula'];
        $fechaDevolucion = fecha($datos['fecha'] ?? '', 'fecha');
        $maximo = (int) ($pdo->query("SELECT valor FROM CONFIGURACION_SISTEMA WHERE clave='dias_maximos_prestamo'")->fetchColumn() ?: 30);
        $hoy = new DateTime('today');
        $devolucion = new DateTime($fechaDevolucion);
        if ($devolucion < $hoy || (int) $hoy->diff($devolucion)->format('%a') > $maximo) {
            errorApi('La fecha del prestamo debe estar dentro de los proximos ' . $maximo . ' dias.');
        }
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
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $consulta = $pdo->prepare("UPDATE PRESTAMO SET esta_activo = 0, estado = 'Cancelado' WHERE id_prestamo = ? AND esta_activo = 1");
        $consulta->execute([$id]);
        if (!$consulta->rowCount()) errorApi('No existe el prestamo activo indicado.', 404);
        responder(['ok' => true]);
    }
    $estado = estadoPrestamoBase((string) ($datos['estado'] ?? ''));
    $consulta = $pdo->prepare('UPDATE PRESTAMO SET estado = ? WHERE id_prestamo = ?');
    $consulta->execute([$estado, $id]);
    if ($consulta->rowCount() === 0) {
        errorApi('No existe el prestamo indicado.', 404);
    }
    responder(['ok' => true]);
});
