<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PATCH']);

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            'SELECT sr.id_solicitud_registro, sr.estado_solicitud, sr.id_usuario_manda,
                    sr.id_usuario_responde, u.nombre, u.apellido, u.correo_electronico, u.rol,
                    r.nombre AS responde_nombre, r.apellido AS responde_apellido
             FROM SOLICITUD_REGISTRO sr
             INNER JOIN USUARIO u ON u.cedula = sr.id_usuario_manda
             LEFT JOIN USUARIO r ON r.cedula = sr.id_usuario_responde
             ORDER BY sr.id_solicitud_registro DESC'
        );
        $consulta->execute();
        $solicitudes = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $solicitudes[] = [
                'id' => (string) $fila['id_solicitud_registro'],
                'cedula' => (string) $fila['id_usuario_manda'],
                'nombreCompleto' => trim($fila['nombre'] . ' ' . $fila['apellido']),
                'correo' => $fila['correo_electronico'],
                'rol' => rolCliente($fila['rol']),
                'estado' => mb_strtolower($fila['estado_solicitud'], 'UTF-8'),
                'revisadoPorId' => (string) ($fila['id_usuario_responde'] ?? ''),
                'revisadoPor' => trim((string) ($fila['responde_nombre'] ?? '') . ' ' . (string) ($fila['responde_apellido'] ?? '')),
            ];
        }
        responder($solicitudes);
    }

    $datos = cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
        $correo = filter_var(texto($datos['correo'] ?? '', 150), FILTER_VALIDATE_EMAIL);
        $contrasena = texto($datos['contrasena'] ?? '', 255);
        if ($cedula === '' || !$correo || $contrasena === '') {
            errorApi('Cedula, correo y contrasena son obligatorios.');
        }
        [$nombre, $apellido] = dividirNombre(texto($datos['nombreCompleto'] ?? '', 161));
        $rol = rolBase((string) ($datos['rol'] ?? ''));
        $pdo->beginTransaction();
        try {
            $usuario = $pdo->prepare(
                "INSERT INTO USUARIO (cedula, nombre, apellido, correo_electronico, contrasena, estado, rol)
                 VALUES (?, ?, ?, ?, ?, 'Inactivo', ?)"
            );
            $usuario->execute([$cedula, $nombre, $apellido, $correo, $contrasena, $rol]);
            $solicitud = $pdo->prepare(
                "INSERT INTO SOLICITUD_REGISTRO (estado_solicitud, id_usuario_manda) VALUES ('Pendiente', ?)"
            );
            $solicitud->execute([$cedula]);
            $id = (int) $pdo->lastInsertId();
            $pdo->commit();
            responder(['ok' => true, 'solicitud' => ['id' => (string) $id, 'cedula' => $cedula]], 201);
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }
    }

    $id = entero($datos['id'] ?? null, 'id');
    $administrador = preg_replace('/\\D/', '', texto($datos['administradorCedula'] ?? '', 15));
    $estado = texto($datos['estado'] ?? '', 12);
    if (!in_array($estado, ['Aprobado', 'Rechazado'], true) || $administrador === '') {
        errorApi('Se requiere un estado de resolucion y un administrador valido.');
    }
    $pdo->beginTransaction();
    try {
        $buscar = $pdo->prepare('SELECT id_usuario_manda FROM SOLICITUD_REGISTRO WHERE id_solicitud_registro = ? AND estado_solicitud = \'Pendiente\'');
        $buscar->execute([$id]);
        $cedulaSolicitante = $buscar->fetchColumn();
        if (!$cedulaSolicitante) {
            $pdo->rollBack();
            errorApi('No existe una solicitud pendiente con ese identificador.', 404);
        }
        $actualizar = $pdo->prepare('UPDATE SOLICITUD_REGISTRO SET estado_solicitud = ?, id_usuario_responde = ? WHERE id_solicitud_registro = ?');
        $actualizar->execute([$estado, $administrador, $id]);
        if ($estado === 'Aprobado') {
            $activar = $pdo->prepare("UPDATE USUARIO SET estado = 'Activo' WHERE cedula = ?");
            $activar->execute([$cedulaSolicitante]);
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
