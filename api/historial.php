<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET']);

ejecutar(function () use ($pdo): void {
    $consultaColumnas = $pdo->prepare(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HISTORIAL_EQUIPO' AND COLUMN_NAME = 'descripcion'"
    );
    $consultaColumnas->execute();
    $descripcionEquipo = $consultaColumnas->fetch() ? 'h.descripcion' : 'NULL';

    $consulta = $pdo->prepare(
        "SELECT h.id_historial_equipo AS id, h.fecha_registrado AS fecha_registrado,
                CASE WHEN h.categoria = 'Traslado' THEN 'Traslado de equipo' ELSE h.categoria END AS etiqueta,
                {$descripcionEquipo} AS descripcion, COALESCE(e.nombre_equipo, CONCAT('Equipo #', h.id_equipo)) AS referencia, 'equipo' AS tipo
         FROM HISTORIAL_EQUIPO h LEFT JOIN EQUIPO e ON e.id_equipo = h.id_equipo
         UNION ALL
         SELECT h.id_historial_ubicacion AS id, h.fecha_registrado AS fecha_registrado, 'Ubicacion' AS etiqueta,
                h.descripcion AS descripcion, COALESCE(u.seccion_inventario, CONCAT('Ubicacion #', h.id_ubicacion)) AS referencia, 'ubicacion' AS tipo
         FROM HISTORIAL_UBICACION h LEFT JOIN UBICACION u ON u.id_ubicacion = h.id_ubicacion
         ORDER BY fecha_registrado DESC"
    );
    $consulta->execute();
    $historial = [];
    foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
        $fecha = new DateTime($fila['fecha_registrado']);
        $historial[] = [
            'id' => $fila['tipo'] . '-' . $fila['id'], 'color' => 'azul',
            'titulo' => $fila['etiqueta'] . ': ' . $fila['referencia'], 'etiqueta' => $fila['etiqueta'],
            'colorEtiqueta' => 'info', 'descripcion' => $fila['descripcion'] ?: '', 'autor' => 'Sistema',
            'fecha' => $fecha->format('d/m/Y'), 'hora' => $fecha->format('H:i'), 'tipo' => $fila['tipo'],
        ];
    }
    responder($historial);
});
