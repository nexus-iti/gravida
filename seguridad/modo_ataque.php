<?php
declare(strict_types=1);

/*
 * F-10 (3ra entrega): "modo de ataque" para cuando el sistema esta bajo un DDoS de aplicacion.
 *
 *   php seguridad/modo_ataque.php activar     -> limites 4 veces mas estrictos, registro publico cerrado,
 *                                                 una IP se bloquea con 2 excesos en vez de 3
 *   php seguridad/modo_ataque.php desactivar  -> vuelve a los limites normales
 *   php seguridad/modo_ataque.php estado      -> muestra si esta activo y las IPs bloqueadas ahora
 *   php seguridad/modo_ataque.php desbloquear -> levanta todos los bloqueos de IP (falso positivo)
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$almacen = __DIR__ . '/almacen';
$marca = $almacen . '/modo-ataque';
$limites = $almacen . '/limites';
$accion = $argv[1] ?? 'estado';

if ($accion === 'activar') {
    if (!is_dir($almacen)) {
        mkdir($almacen, 0700, true);
    }
    file_put_contents($marca, date('c'));
    echo "Modo de ataque ACTIVADO. Desactivalo cuando pase el ataque: php seguridad/modo_ataque.php desactivar\n";
    exit(0);
}

if ($accion === 'desactivar') {
    @unlink($marca);
    echo "Modo de ataque desactivado. Limites normales.\n";
    exit(0);
}

if ($accion === 'desbloquear') {
    $borrados = 0;
    foreach (glob($limites . '/baneo-*') ?: [] as $archivo) {
        $borrados += (int) @unlink($archivo);
    }
    echo "Bloqueos de IP levantados: $borrados\n";
    exit(0);
}

$bloqueadas = 0;
foreach (glob($limites . '/baneo-*') ?: [] as $archivo) {
    $bloqueadas += (int) ((int) @file_get_contents($archivo) > time());
}
echo 'Modo de ataque: ' . (is_file($marca) ? 'ACTIVO desde ' . trim((string) file_get_contents($marca)) : 'inactivo') . "\n";
echo "IPs bloqueadas en este momento: $bloqueadas\n";
echo "Detalle de bloqueos en seguridad/almacen/logs/seguridad-" . date('Y-m') . ".log (tipo ip_bloqueada)\n";
