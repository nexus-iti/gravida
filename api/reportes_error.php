<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
exigirMetodo(['GET','POST','PUT','PATCH']);
$sesionActual=autorizarEndpoint('reportes_error');
ejecutar(function() use($pdo,$sesionActual):void{
    if($_SERVER['REQUEST_METHOD']==='GET'){
        $q=$pdo->query("SELECT r.id_reporte_error AS id,r.tipo,r.contacto,r.asunto,r.detalle,r.estado,
          r.cedula_responsable AS responsableId,CONCAT(COALESCE(u.nombre,''),' ',COALESCE(u.apellido,'')) AS responsable,
          r.respuesta,r.fecha_creacion AS creadoEn,r.fecha_cierre AS cerradoEn
          FROM REPORTE_ERROR r LEFT JOIN USUARIO u ON u.cedula=r.cedula_responsable ORDER BY r.id_reporte_error DESC");
        responder($q->fetchAll(PDO::FETCH_ASSOC));
    }
    $d=cuerpoJson();
    if($_SERVER['REQUEST_METHOD']==='POST'){
        $tipo=texto($d['tipo']??'',60);$contacto=texto($d['contacto']??'',150);$asunto=texto($d['asunto']??'',120);$detalle=texto($d['detalle']??'',65535);
        if($tipo===''||$contacto===''||$asunto===''||$detalle==='')errorApi('Completa todos los datos del reporte.');
        $q=$pdo->prepare('INSERT INTO REPORTE_ERROR(tipo,contacto,asunto,detalle) VALUES(?,?,?,?)');$q->execute([$tipo,$contacto,$asunto,$detalle]);
        responder(['ok'=>true,'id'=>(string)$pdo->lastInsertId()],201);
    }
    $id=entero($d['id']??null,'id');$estado=texto($d['estado']??'',20);
    if(!in_array($estado,['Pendiente','En proceso','Resuelto','Rechazado'],true))errorApi('Estado no valido.');
    $responsable=(string)$sesionActual['cedula'];
    $q=$pdo->prepare('UPDATE REPORTE_ERROR SET estado=?,cedula_responsable=?,respuesta=?,fecha_cierre=IF(? IN (\'Resuelto\',\'Rechazado\'),NOW(),NULL) WHERE id_reporte_error=?');
    $q->execute([$estado,$responsable?:null,texto($d['respuesta']??'',65535),$estado,$id]);
    if(!$q->rowCount())errorApi('No existe el reporte o no hubo cambios.',404);responder(['ok'=>true]);
});
