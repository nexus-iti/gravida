<?php
declare(strict_types=1);

/*
 * Router del servidor embebido de PHP (php -S) para el modo "user" de deploy.sh.
 * Reemplaza lo que en Apache hacen .htaccess y uploads/perfiles/.htaccess, que php -S no lee:
 * bloqueos, rutas limpias de pages/, metodos permitidos, tamano maximo y cabeceras.
 * Si cambia el .htaccess, cambiar tambien este archivo.
 */

$raiz = rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/');
$ruta = rawurldecode((string) parse_url((string) $_SERVER['REQUEST_URI'], PHP_URL_PATH));
if ($ruta === '' || $ruta[0] !== '/' || str_contains($ruta, "\0") || str_contains($ruta, '..')) {
    http_response_code(400);
    exit;
}

function cabeceras(bool $https): void
{
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://ui-avatars.com; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
    if ($https) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function cortar(int $codigo): never
{
    http_response_code($codigo);
    exit;
}

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
cabeceras($https);

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true)) {
    cortar(405);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 3145728) {
    cortar(413);
}

// Rutas limpias: /pages -> pages/index.html, /pages/home -> pages/home.html
if (preg_match('#^/pages/?$#', $ruta)) {
    $ruta = '/pages/index.html';
} elseif (preg_match('#^/pages/([a-z0-9-]+)/?$#', $ruta, $m)) {
    $ruta = '/pages/' . $m[1] . '.html';
}

// Bloqueos del .htaccess raiz: ocultos, extensiones sensibles, config y seguridad/.
$nombre = basename($ruta);
if (
    preg_match('#(^|/)\.#', $ruta)
    || preg_match('#\.(sql|md|log|bak|old|orig|swp|ini|conf|ps1|bat|sh|json\.lock)$#i', $ruta)
    || preg_match('#^config(\.example)?\.php$|^test-api\.html$#', $nombre)
    || preg_match('#^/seguridad(/|$)#', $ruta)
) {
    cortar(403);
}

// uploads/: solo imagenes con nombre de 32 hex, nunca se ejecuta nada (uploads/perfiles/.htaccess).
$esUpload = str_starts_with($ruta, '/uploads/');
if ($esUpload && !preg_match('#^/uploads/perfiles/[a-f0-9]{32}\.(jpg|png|webp)$#', $ruta)) {
    cortar(403);
}

$archivo = $raiz . $ruta;
if (is_dir($archivo)) {
    $archivo = rtrim($archivo, '/');
    foreach (['index.php', 'index.html'] as $indice) {
        if (is_file($archivo . '/' . $indice)) {
            $ruta = rtrim($ruta, '/') . '/' . $indice;
            $archivo .= '/' . $indice;
            break;
        }
    }
}
if (!is_file($archivo)) {
    cortar(404);
}

if (str_ends_with($ruta, '.php')) {
    // Ejecuta el script con el contexto normal del servidor (SCRIPT_NAME, $_SERVER, etc.).
    $_SERVER['SCRIPT_NAME'] = $ruta;
    $_SERVER['SCRIPT_FILENAME'] = $archivo;
    chdir(dirname($archivo));
    require $archivo;
    return true;
}

// Estaticos: se sirven aca porque php -S ignora los header() previos cuando devuelve false.
$tipos = [
    'html' => 'text/html; charset=utf-8', 'css' => 'text/css; charset=utf-8',
    'js' => 'text/javascript; charset=utf-8', 'json' => 'application/json',
    'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp',
    'svg' => 'image/svg+xml', 'ico' => 'image/x-icon', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
];
$ext = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
if (!isset($tipos[$ext])) {
    cortar(403);
}
header('Content-Type: ' . $tipos[$ext]);
if ($esUpload) {
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox");
    header('Content-Disposition: inline');
} elseif ($ext === 'css' || $ext === 'js') {
    header('Cache-Control: public, max-age=3600, must-revalidate');
} elseif (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'svg', 'ico', 'woff', 'woff2'], true)) {
    header('Cache-Control: public, max-age=604800');
}
$tam = (int) filesize($archivo);
header('Content-Length: ' . $tam);
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    readfile($archivo);
}
return true;
