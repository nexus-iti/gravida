<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'PATCH']);

ejecutar(function () use ($pdo): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta = $pdo->prepare(
            'SELECT id_plantilla, cedula, comentario_ta, horario_entrada_ta, horario_salida_ta
             FROM PLANTILLA_TECNICO_ASISTENTE ORDER BY cedula'
        );
        $consulta->execute();
        $planillas = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $planillas[] = [
                'id' => (string) $fila['id_plantilla'],
                'usuarioId' => (string) $fila['cedula'],
                'horaEntrada' => substr((string) ($fila['horario_entrada_ta'] ?? '08:00'), 0, 5),
                'horaSalida' => substr((string) ($fila['horario_salida_ta'] ?? '16:00'), 0, 5),
                'tareasDelDia' => (string) ($fila['comentario_ta'] ?? ''),
            ];
        }
        responder($planillas);
    }

    $datos = cuerpoJson();
    $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
    if ($cedula === '') {
        errorApi('La cedula es obligatoria.');
    }
    $consulta = $pdo->prepare(
        'INSERT INTO PLANTILLA_TECNICO_ASISTENTE
         (cedula, comentario_ta, horario_entrada_ta, horario_salida_ta)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE comentario_ta = VALUES(comentario_ta),
             horario_entrada_ta = VALUES(horario_entrada_ta), horario_salida_ta = VALUES(horario_salida_ta)'
    );
    $consulta->execute([
        $cedula, texto($datos['tareasDelDia'] ?? '', 65535),
        hora($datos['horaEntrada'] ?? '08:00', 'horaEntrada'), hora($datos['horaSalida'] ?? '16:00', 'horaSalida'),
    ]);
    responder(['ok' => true]);
});
