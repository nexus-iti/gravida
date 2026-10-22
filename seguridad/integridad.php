<?php
declare(strict_types=1);

/*
 * F-11: monitor de integridad de archivos y detector de webshells.
 *
 *   php seguridad/integridad.php generar   -> guarda la huella SHA-256 de todo el codigo (hacerlo tras cada despliegue)
 *   php seguridad/integridad.php verificar -> compara contra la huella y busca codigo sospechoso
 *
 * Codigo de salida 0 = todo bien, 2 = hay hallazgos (sirve para el Programador de tareas).
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$raiz = dirname(__DIR__);
$manifiesto = __DIR__ . '/almacen/manifiesto.json';
$extensionesCodigo = ['php', 'phtml', 'phar', 'js', 'html', 'htaccess', 'css'];
$ignorar = ['seguridad/almacen/', 'uploads/perfiles/', '.git/', 'config.php'];

function listarArchivos(string $raiz, array $ignorar, array $extensiones): array {
    $resultado = [];
    $iterador = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($raiz, FilesystemIterator::SKIP_DOTS));
    foreach ($iterador as $archivo) {
        $relativo = str_replace('\\', '/', substr($archivo->getPathname(), strlen($raiz) + 1));
        foreach ($ignorar as $prefijo) {
            if (str_starts_with($relativo, $prefijo)) {
                continue 2;
            }
        }
        $nombre = $archivo->getFilename();
        $extension = $nombre === '.htaccess' ? 'htaccess' : strtolower($archivo->getExtension());
        if (in_array($extension, $extensiones, true)) {
            // Un archivo que no se puede leer (bloqueado, en uso o cifrado por un ransomware) no puede
            // tumbar el escaneo: se guarda como ILEGIBLE y se reporta como hallazgo.
            $hash = @hash_file('sha256', $archivo->getPathname());
            $resultado[$relativo] = $hash === false ? 'ILEGIBLE' : $hash;
        }
    }
    ksort($resultado);
    return $resultado;
}

$accion = $argv[1] ?? 'verificar';
$actual = listarArchivos($raiz, $ignorar, $extensionesCodigo);

if ($accion === 'generar') {
    if (!is_dir(dirname($manifiesto))) {
        mkdir(dirname($manifiesto), 0700, true);
    }
    file_put_contents($manifiesto, json_encode($actual, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    printf("Manifiesto generado con %d archivos.\n", count($actual));
    exit(0);
}

$hallazgos = [];

if (!is_file($manifiesto)) {
    fwrite(STDERR, "No hay manifiesto. Ejecuta primero: php seguridad/integridad.php generar\n");
    exit(1);
}
$esperado = json_decode((string) file_get_contents($manifiesto), true) ?: [];
foreach ($actual as $ruta => $hash) {
    if ($hash === 'ILEGIBLE') {
        $hallazgos[] = "ILEGIBLE    $ruta (no se puede leer: en uso, bloqueado o posiblemente cifrado)";
    } elseif (!isset($esperado[$ruta])) {
        $hallazgos[] = "NUEVO       $ruta";
    } elseif (!hash_equals((string) $esperado[$ruta], $hash)) {
        $hallazgos[] = "MODIFICADO  $ruta";
    }
}
foreach (array_diff_key($esperado, $actual) as $ruta => $_) {
    $hallazgos[] = "BORRADO     $ruta";
}

// En la carpeta de fotos solo puede haber imagenes con nombre aleatorio.
$fotos = $raiz . '/uploads/perfiles';
foreach (is_dir($fotos) ? scandir($fotos) : [] as $nombre) {
    if (in_array($nombre, ['.', '..', '.htaccess', '.gitkeep'], true)) {
        continue;
    }
    $ruta = $fotos . '/' . $nombre;
    // La subida web limita a 2 MB: un archivo de mas de 5 MB ya es anomalo y no se deja sin revisar.
    if (filesize($ruta) > 5242880) {
        $hallazgos[] = "SOSPECHOSO  uploads/perfiles/$nombre (supera 5 MB, la subida admite 2 MB)";
        continue;
    }
    $info = @getimagesize($ruta);
    $contenido = (string) @file_get_contents($ruta);
    if (!preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $nombre) || $info === false || preg_match('/<\?php|<\?=|<script/i', $contenido)) {
        $hallazgos[] = "SOSPECHOSO  uploads/perfiles/$nombre (no es una imagen limpia)";
    }
}

// Firmas tipicas de webshells en el codigo PHP.
$firmas = '/\b(eval\s*\(\s*(base64_decode|gzinflate|str_rot13|\$_(GET|POST|REQUEST|COOKIE))|assert\s*\(\s*\$_|shell_exec|passthru|proc_open|popen\s*\(|system\s*\(\s*\$_|preg_replace\s*\(.*\/e[\'"])/i';
foreach ($actual as $ruta => $_) {
    // Solo se salta este mismo archivo (contiene las firmas); el resto de seguridad/ tambien se analiza.
    // Este archivo sigue cubierto por el hash del manifiesto.
    if (!str_ends_with($ruta, '.php') || $ruta === 'seguridad/integridad.php') {
        continue;
    }
    $contenido = @file_get_contents($raiz . '/' . $ruta);
    if ($contenido === false) {
        continue; // ya reportado como ILEGIBLE arriba
    }
    if (preg_match($firmas, $contenido, $coincidencia)) {
        $hallazgos[] = "WEBSHELL?   $ruta  ->  " . trim($coincidencia[0]);
    }
}

if (!$hallazgos) {
    echo "Integridad OK: " . count($actual) . " archivos sin cambios.\n";
    exit(0);
}
$informe = date('c') . "\n" . implode("\n", $hallazgos) . "\n";
@file_put_contents(__DIR__ . '/almacen/logs/integridad-' . date('Y-m-d') . '.log', $informe, FILE_APPEND);
echo $informe;
exit(2);
