<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['POST']);

ejecutar(function () use ($pdo): void {
    $cedula = preg_replace('/\\D/', '', texto($_POST['cedula'] ?? '', 15));
    if ($cedula === '') {
        errorApi('La cedula es obligatoria.');
    }

    if (!isset($_FILES['foto']) || !is_array($_FILES['foto'])) {
        errorApi('Debe enviar un archivo de foto.');
    }

    $archivo = $_FILES['foto'];
    if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
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

    $existe = $pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula = ?');
    $existe->execute([$cedula]);
    if (!$existe->fetch()) {
        errorApi('No existe el usuario indicado.', 404);
    }

    $directorio = dirname(__DIR__) . '/uploads/perfiles';
    if (!is_dir($directorio) && !mkdir($directorio, 0755, true)) {
        errorApi('No se pudo preparar el directorio de fotos.', 500);
    }

    $nombreArchivo = bin2hex(random_bytes(16)) . '.' . $extension;
    $rutaDestino = $directorio . '/' . $nombreArchivo;
    if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
        errorApi('No se pudo guardar la foto de perfil.', 500);
    }

    $consulta = $pdo->prepare('UPDATE USUARIO SET foto_perfil = ? WHERE cedula = ?');
    $consulta->execute([$nombreArchivo, $cedula]);

    responder([
        'ok' => true,
        'fotoPerfil' => 'uploads/perfiles/' . $nombreArchivo,
    ]);
});
