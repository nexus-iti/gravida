<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
exigirMetodo(['GET','POST','PUT','PATCH']);
$sesionActual=autorizarEndpoint('cambios_rol');

ejecutar(function () use ($pdo,$sesionActual): void {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $consulta=$pdo->query("SELECT s.id_solicitud_cambio_rol AS id,s.cedula_solicitante AS cedula,
            CONCAT(u.nombre,' ',u.apellido) AS usuario,s.rol_actual AS rolActual,s.rol_solicitado AS rolSolicitado,
            s.motivo,s.estado,s.cedula_revisor AS revisorId,s.fecha_solicitud AS fechaSolicitud,s.fecha_revision AS fechaRevision
            FROM SOLICITUD_CAMBIO_ROL s INNER JOIN USUARIO u ON u.cedula=s.cedula_solicitante ORDER BY s.id_solicitud_cambio_rol DESC");
        responder($consulta->fetchAll(PDO::FETCH_ASSOC));
    }
    $datos=cuerpoJson();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $cedula=(string)$sesionActual['cedula'];
        $rolSolicitado=rolBase((string)($datos['rolSolicitado']??''));
        $u=$pdo->prepare('SELECT rol FROM USUARIO WHERE cedula=? AND estado=\'Activo\''); $u->execute([$cedula]);
        $rolActual=$u->fetchColumn(); if(!$rolActual) errorApi('No existe el usuario activo.',404);
        $pend=$pdo->prepare("SELECT 1 FROM SOLICITUD_CAMBIO_ROL WHERE cedula_solicitante=? AND estado='Pendiente'");$pend->execute([$cedula]);
        if($pend->fetch()) errorApi('Ya existe una solicitud pendiente.',409);
        $q=$pdo->prepare('INSERT INTO SOLICITUD_CAMBIO_ROL(cedula_solicitante,rol_actual,rol_solicitado,motivo) VALUES(?,?,?,?)');
        $q->execute([$cedula,$rolActual,$rolSolicitado,texto($datos['motivo']??'',65535)]);
        responder(['ok'=>true,'id'=>(string)$pdo->lastInsertId()],201);
    }
    $id=entero($datos['id']??null,'id'); $estado=texto($datos['estado']??'',20);
    if(!in_array($estado,['Aprobado','Rechazado'],true)) errorApi('Estado de revision no valido.');
    $revisor=(string)$sesionActual['cedula'];
    $q=$pdo->prepare("SELECT cedula_solicitante,rol_solicitado FROM SOLICITUD_CAMBIO_ROL WHERE id_solicitud_cambio_rol=? AND estado='Pendiente'");$q->execute([$id]);
    $s=$q->fetch(PDO::FETCH_ASSOC);if(!$s) errorApi('No existe una solicitud pendiente.',404);
    $pdo->beginTransaction();
    try {
        if($estado==='Aprobado'){$u=$pdo->prepare('UPDATE USUARIO SET rol=? WHERE cedula=?');$u->execute([$s['rol_solicitado'],$s['cedula_solicitante']]);}
        $q=$pdo->prepare('UPDATE SOLICITUD_CAMBIO_ROL SET estado=?,cedula_revisor=?,fecha_revision=NOW() WHERE id_solicitud_cambio_rol=?');$q->execute([$estado,$revisor?:null,$id]);
        $pdo->commit(); responder(['ok'=>true]);
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
});
