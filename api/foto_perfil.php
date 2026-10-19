<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['POST']);
$sesionActual = autorizarEndpoint('foto_perfil');

function recodificarImagen(string $origen, string $destino, string $mime): bool {
    if (!extension_loaded('gd')) {
        return false;
    }
    $imagen = match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($origen),
        'image/png' => @imagecreatefrompng($origen),
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($origen) : false,
        default => false,
    };
    if (!$imagen) {
        errorApi('El archivo enviado no es una imagen valida.');
    }
    // Si GD lee WebP pero no puede codificarlo se rechaza: devolver false haria guardar el original sin recodificar.
    if ($mime === 'image/webp' && !function_exists('imagewebp')) {
        imagedestroy($imagen);
        errorApi('El servidor no admite fotos WebP. Usa una imagen JPG o PNG.');
    }
    imagesavealpha($imagen, true);
    $ok = match ($mime) {
        'image/jpeg' => imagejpeg($imagen, $destino, 88),
        'image/png' => imagepng($imagen, $destino),
        'image/webp' => imagewebp($imagen, $destino, 88),
        default => false,
    };
    imagedestroy($imagen);
    return $ok;
}

ejecutar(function () use ($pdo, $sesionActual): void {
    // La foto siempre pertenece a la identidad autenticada; no se acepta una cedula del cliente.
    $cedula = (string) $sesionActual['cedula'];

    if (!isset($_FILES['foto']) || !is_array($_FILES['foto'])) {
        errorApi('Debe enviar un archivo de foto.');
    }

    $archivo = $_FILES['foto'];
    if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) $archivo['tmp_name'])) {
        errorApi('No se pudo recibir el archivo de foto.');
    }

    if (($archivo['size'] ?? 0) > 2 * 1024 * 1024) {
        errorApi('La foto no puede superar 2 MB.');
    }

    $infoImagen = getimagesize($archivo['tmp_name']);
    if ($infoImagen === false) {
        errorApi('El archivo enviado no es una imagen valida.');
    }

    $extensionesPermitidas = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    $mime = (string) ($infoImagen['mime'] ?? '');
    if (!isset($extensionesPermitidas[$mime])) {
        errorApi('Solo se permiten imagenes JPG, PNG o WebP.');
    }
    $extension = $extensionesPermitidas[$mime];

    $existe = $pdo->prepare('SELECT foto_perfil FROM USUARIO WHERE cedula = ?');
    $existe->execute([$cedula]);
    $fotoAnterior = $existe->fetchColumn();
    if ($fotoAnterior === false) {
        errorApi('No existe el usuario indicado.', 404);
    }

    $directorio = dirname(__DIR__) . '/uploads/perfiles';
    if (!is_dir($directorio) && !mkdir($directorio, 0755, true)) {
        errorApi('No se pudo preparar el directorio de fotos.', 500);
    }

    $nombreArchivo = bin2hex(random_bytes(16)) . '.' . $extension;
    $rutaDestino = $directorio . '/' . $nombreArchivo;
    // F-11: la imagen se SIEMPRE se re-codifica y se descarta todo lo que no sea pixeles
    // (codigo PHP/JS escondido en metadatos o archivos "poliglota"). Fail-closed: si GD no esta
    // disponible o no puede codificar, la foto se rechaza. Nunca se guarda el archivo original.
    if (!extension_loaded('gd')) {
        errorApi('El servidor no puede procesar fotos en este momento. Avisa al administrador.', 503);
    }
    if (!recodificarImagen((string) $archivo['tmp_name'], $rutaDestino, $mime)) {
        @unlink($rutaDestino);
        errorApi('No se pudo procesar la foto. Prueba con otra imagen JPG o PNG.', 400);
    }
    @chmod($rutaDestino, 0644);
    if (is_string($fotoAnterior) && preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $fotoAnterior)) {
        @unlink($directorio . '/' . $fotoAnterior);
    }

    $consulta = $pdo->prepare('UPDATE USUARIO SET foto_perfil = ? WHERE cedula = ?');
    $consulta->execute([$nombreArchivo, $cedula]);

    responder([
        'ok' => true,
        'fotoPerfil' => 'uploads/perfiles/' . $nombreArchivo,
    ]);
});
