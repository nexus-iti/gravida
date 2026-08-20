<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PATCH']);

function exigirUsuario(PDO $pdo, string $cedula, string $mensaje): void {
    $consulta = $pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula = ?');
    $consulta->execute([$cedula]);
    if (!$consulta->fetch()) {
        errorApi($mensaje, 404);
    }
}

function exigirIncidencia(PDO $pdo, int $id): void {
    $consulta = $pdo->prepare('SELECT 1 FROM INCIDENCIA WHERE id_ticket = ?');
    $consulta->execute([$id]);
    if (!$consulta->fetch()) {
        errorApi('No existe la incidencia indicada.', 404);
    }
}

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        
        $consulta = $pdo->prepare(
            'SELECT i.id_ticket, i.categoria, i.descripcion, i.titulo, i.fecha_de_solicitud, i.lugar,
                    i.fecha_cierre, i.estado, i.diagnostico, i.solucion, i.id_equipo,
                    i.cedula_crea, i.cedula_responde,
                    creador.nombre AS nombre_crea, creador.apellido AS apellido_crea,
                    responsable.nombre AS nombre_responde, responsable.apellido AS apellido_responde
             FROM INCIDENCIA i
             INNER JOIN USUARIO creador ON creador.cedula = i.cedula_crea
             LEFT JOIN USUARIO responsable ON responsable.cedula = i.cedula_responde
             ORDER BY i.id_ticket DESC'
        );
        $consulta->execute();
        $tickets = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $gestionadoPor = $fila['cedula_responde'] === null
                ? ''
                : trim($fila['nombre_responde'] . ' ' . $fila['apellido_responde']);
            $tickets[] = [
                'id' => (string) $fila['id_ticket'],
                'asunto' => $fila['titulo'],
                'categoria' => $fila['categoria'],
                'estado' => estadoIncidenciaCliente($fila['estado']),
                'ubicacion' => $fila['lugar'],
                'mensaje' => $fila['descripcion'],
                'solicitante' => trim($fila['nombre_crea'] . ' ' . $fila['apellido_crea']),
                'solicitanteId' => (string) $fila['cedula_crea'],
                'gestionadoPor' => $gestionadoPor,
                'tecnicoId' => $fila['cedula_responde'] === null ? '' : (string) $fila['cedula_responde'],
                'equipoId' => $fila['id_equipo'] === null ? '' : (string) $fila['id_equipo'],
                'creadoEn' => $fila['fecha_de_solicitud'],
                'diagnostico' => $fila['diagnostico'],
                'solucion' => $fila['solucion'],
                'fechaCierre' => $fila['fecha_cierre'],
            ];
        }
        responder($tickets);
    }

    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
        if ($cedula === '') {
            errorApi('El solicitante es obligatorio.');
        }
        exigirUsuario($pdo, $cedula, 'No existe el usuario solicitante indicado.');
        
        $categoria = texto($datos['categoria'] ?? '', 60);
        $titulo = texto($datos['asunto'] ?? '', 100);
        $lugar = texto($datos['ubicacion'] ?? '', 100);
        $descripcion = texto($datos['mensaje'] ?? '', 65535);
        if ($titulo === '' || $descripcion === '') {
            errorApi('El asunto y el mensaje son obligatorios.');
        }
        $idEquipo = isset($datos['idEquipo']) && $datos['idEquipo'] !== ''
            ? entero($datos['idEquipo'], 'idEquipo')
            : null;
        if ($idEquipo !== null) {
            $equipo = $pdo->prepare('SELECT 1 FROM EQUIPO WHERE id_equipo = ?');
            $equipo->execute([$idEquipo]);
            if (!$equipo->fetch()) {
                errorApi('No existe el equipo indicado.', 404);
            }
        }
        
        $consulta = $pdo->prepare(
            "INSERT INTO INCIDENCIA
             (categoria, descripcion, titulo, fecha_de_solicitud, lugar, estado, id_equipo, cedula_crea)
             VALUES (?, ?, ?, CURDATE(), ?, 'Pendiente', ?, ?)"
        );
        $consulta->execute([$categoria, $descripcion, $titulo, $lugar, $idEquipo, $cedula]);
        responder(['ok' => true, 'id' => (string) $pdo->lastInsertId()], 201);
    }

    $accion = texto($datos['accion'] ?? '', 30);
    $id = entero($datos['id'] ?? null, 'id');
    $tecnico = preg_replace('/\\D/', '', texto($datos['tecnicoCedula'] ?? '', 15));

    if ($accion === 'tomar') {
        if ($tecnico === '') {
            errorApi('La cedula del tecnico responsable es obligatoria.');
        }
        exigirIncidencia($pdo, $id);
        exigirUsuario($pdo, $tecnico, 'No existe el tecnico responsable indicado.');
        $consulta = $pdo->prepare(
            "UPDATE INCIDENCIA SET cedula_responde = ?, estado = 'En proceso' WHERE id_ticket = ?"
        );
        $consulta->execute([$tecnico, $id]);
        responder(['ok' => true]);
    }

    if ($accion === 'cerrar') {
        $estado = estadoIncidenciaBase((string) ($datos['estado'] ?? ''));
        if (!in_array($estado, ['Resuelto', 'Cerrado'], true)) {
            errorApi('El cierre solo admite los estados Resuelto o Cerrado.');
        }
        exigirIncidencia($pdo, $id);
        if ($tecnico !== '') {
            exigirUsuario($pdo, $tecnico, 'No existe el tecnico responsable indicado.');
        }
        $diagnostico = texto($datos['diagnostico'] ?? '', 65535);
        $solucion = texto($datos['solucion'] ?? '', 65535);
        $consulta = $pdo->prepare(
            'UPDATE INCIDENCIA
             SET estado = ?, diagnostico = ?, solucion = ?, fecha_cierre = CURDATE(),
                 cedula_responde = COALESCE(NULLIF(?, \'\'), cedula_responde)
             WHERE id_ticket = ?'
        );
        $consulta->execute([$estado, $diagnostico, $solucion, $tecnico, $id]);
        responder(['ok' => true]);
    }

    
    $estado = estadoIncidenciaBase((string) ($datos['estado'] ?? ''));
    exigirIncidencia($pdo, $id);
    if ($tecnico !== '') {
        exigirUsuario($pdo, $tecnico, 'No existe el tecnico responsable indicado.');
    }
    $cerrar = in_array($estado, ['Resuelto', 'Cerrado'], true) ? date('Y-m-d') : null;
    $consulta = $pdo->prepare(
        'UPDATE INCIDENCIA
         SET estado = ?, fecha_cierre = ?,
             cedula_responde = COALESCE(NULLIF(?, \'\'), cedula_responde)
         WHERE id_ticket = ?'
    );
    $consulta->execute([$estado, $cerrar, $tecnico, $id]);
    responder(['ok' => true]);
});
