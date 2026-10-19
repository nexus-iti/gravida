<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

exigirMetodo(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
$sesionActual = autorizarEndpoint('usuarios');

ejecutar(function () use ($pdo, $sesionActual): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $cedula = texto($_GET['cedula'] ?? '', 15);
        $soloResponsablesTarea = texto($_GET['responsablesTarea'] ?? '', 5) === '1';
        $esAdministrador = ($sesionActual['rol'] ?? '') === 'Administrador';
        $esGestion = in_array($sesionActual['rol'] ?? '', ['Tecnico_Asistente', 'Administrador'], true);
        if ($soloResponsablesTarea && !$esGestion) {
            errorApi('No tenes permisos para consultar responsables.', 403);
        }
        if (!$esAdministrador && !$soloResponsablesTarea) {
            if ($cedula !== '' && $cedula !== ($sesionActual['cedula'] ?? '')) {
                errorApi('No podes consultar el perfil de otro usuario.', 403);
            }
            $cedula = (string) ($sesionActual['cedula'] ?? '');
        }
        $sql = 'SELECT cedula, nombre, apellido, correo_electronico, estado, rol,
                       descripcion, fecha_registro, foto_perfil, debe_cambiar_contrasena FROM USUARIO';
        $parametros = [];
        $condiciones = ['esta_activo = 1'];
        if ($cedula !== '') {
            $condiciones[] = 'cedula = ?';
            $parametros[] = $cedula;
        }
        if ($soloResponsablesTarea) {
            $condiciones[] = "estado = 'Activo'";
            $condiciones[] = "rol IN ('Tecnico_Asistente', 'Administrador')";
        }
        if ($condiciones) {
            $sql .= ' WHERE ' . implode(' AND ', $condiciones);
        }
        $sql .= ' ORDER BY nombre, apellido';
        $consulta = $pdo->prepare($sql);
        $consulta->execute($parametros);
        $usuarios = array_map('usuarioCliente', $consulta->fetchAll(PDO::FETCH_ASSOC));
        responder($cedula === '' ? $usuarios : ($usuarios[0] ?? null));
    }

    $datos = cuerpoJson();
    if ($metodo === 'POST') {
        $habilitado = $pdo->query("SELECT valor FROM CONFIGURACION_SISTEMA WHERE clave='registro_habilitado'")->fetchColumn();
        if ($habilitado !== false && $habilitado !== '1') errorApi('El registro de nuevas cuentas esta temporalmente deshabilitado.', 403);
        $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
        $correo = filter_var(texto($datos['correo'] ?? '', 150), FILTER_VALIDATE_EMAIL);
        $contrasena = texto($datos['contrasena'] ?? '', 255);
        if ($cedula === '' || !$correo || $contrasena === '') {
            errorApi('Cedula, correo y contrasena son obligatorios.');
        }
        [$nombre, $apellido] = dividirNombre(texto($datos['nombreCompleto'] ?? '', 161));
        $rol = rolBase((string) ($datos['rol'] ?? ''));
        $estado = texto($datos['estado'] ?? 'Activo', 10) === 'Inactivo' ? 'Inactivo' : 'Activo';
        $consulta = $pdo->prepare(
            'INSERT INTO USUARIO (cedula, nombre, apellido, correo_electronico, contrasena, estado, rol, fecha_registro)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())'
        );
        $consulta->execute([$cedula, $nombre, $apellido, $correo, password_hash($contrasena, PASSWORD_DEFAULT), $estado, $rol]);
        responder(['ok' => true, 'usuario' => usuarioCliente([
            'cedula' => $cedula, 'nombre' => $nombre, 'apellido' => $apellido,
            'correo_electronico' => $correo, 'estado' => $estado, 'rol' => $rol,
            'descripcion' => '', 'fecha_registro' => date('Y-m-d'), 'foto_perfil' => '',
        ])], 201);
    }

    $accion = texto($datos['accion'] ?? '', 30);
    $cedula = preg_replace('/\\D/', '', texto($datos['cedula'] ?? '', 15));
    if ($cedula === '') {
        errorApi('La cedula es obligatoria.');
    }
    if ($metodo === 'DELETE') {
        exigirRol(['Administrador']);
        $consulta = $pdo->prepare("UPDATE USUARIO SET esta_activo = 0, estado = 'Inactivo' WHERE cedula = ? AND esta_activo = 1");
        $consulta->execute([$cedula]);
        if (!$consulta->rowCount()) errorApi('No existe la cuenta activa indicada.', 404);
        responder(['ok' => true]);
    }
    if ($accion === 'cambiar_contrasena') {
        if (($sesionActual['cedula'] ?? '') !== $cedula && ($sesionActual['rol'] ?? '') !== 'Administrador') {
            errorApi('No podes cambiar la contraseña de otro usuario.', 403);
        }
        $contrasena = texto($datos['contrasena'] ?? '', 255);
        if (strlen($contrasena) < 7) errorApi('La contraseña debe tener al menos 7 caracteres.');
        $consulta = $pdo->prepare('UPDATE USUARIO SET contrasena = ?, debe_cambiar_contrasena = 0 WHERE cedula = ?');
        $consulta->execute([password_hash($contrasena, PASSWORD_DEFAULT), $cedula]);
        responder(['ok' => true]);
    }
    if ($accion === 'actualizar_perfil') {
        if (($sesionActual['cedula'] ?? '') !== $cedula && ($sesionActual['rol'] ?? '') !== 'Administrador') {
            errorApi('No podes modificar el perfil de otro usuario.', 403);
        }
        [$nombre, $apellido] = dividirNombre(texto($datos['nombreCompleto'] ?? '', 161));
        $correo = filter_var(texto($datos['correo'] ?? '', 150), FILTER_VALIDATE_EMAIL);
        if (!$correo) {
            errorApi('El correo no es valido.');
        }
        $descripcion = texto($datos['descripcion'] ?? '', 65535);
        $existe = $pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula = ?');
        $existe->execute([$cedula]);
        if (!$existe->fetch()) {
            errorApi('No existe el usuario indicado.', 404);
        }
        $consulta = $pdo->prepare(
            'UPDATE USUARIO SET nombre = ?, apellido = ?, correo_electronico = ?, descripcion = ? WHERE cedula = ?'
        );
        $consulta->execute([$nombre, $apellido, $correo, $descripcion, $cedula]);
        responder(['ok' => true]);
    }
    if ($accion === 'estado') {
        exigirRol(['Administrador']);
        $estado = texto($datos['estado'] ?? '', 10) === 'Inactivo' ? 'Inactivo' : 'Activo';
        $existe = $pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula = ?');
        $existe->execute([$cedula]);
        if (!$existe->fetch()) {
            errorApi('No existe el usuario indicado.', 404);
        }
        $consulta = $pdo->prepare('UPDATE USUARIO SET estado = ? WHERE cedula = ?');
        $consulta->execute([$estado, $cedula]);
        responder(['ok' => true]);
    }
    errorApi('Accion no valida.');
});
