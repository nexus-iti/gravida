<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
exigirMetodo(['GET','POST','PATCH']);

function codigoSeguimiento():string{return strtoupper(substr(bin2hex(random_bytes(8)),0,12));}
function contrasenaTemporal():string{return 'Nx'.random_int(100000,999999).'!';}

ejecutar(function() use($pdo):void{
    if($_SERVER['REQUEST_METHOD']==='GET'){
        $cedula=preg_replace('/\D/','',texto($_GET['cedula']??'',15));$codigo=strtoupper(texto($_GET['codigo']??'',12));
        if($cedula!==''&&$codigo!==''){
            $q=$pdo->prepare('SELECT id_recuperacion,id_ticket,estado,contrasena_temporal,credencial_vista,fecha_creacion,fecha_resolucion FROM RECUPERACION_CONTRASENA WHERE cedula=? AND codigo_seguimiento=?');$q->execute([$cedula,$codigo]);
            $r=$q->fetch(PDO::FETCH_ASSOC);if(!$r)errorApi('No existe una solicitud con esos datos.',404);
            $respuesta=['id'=>(string)$r['id_recuperacion'],'ticketId'=>(string)$r['id_ticket'],'estado'=>$r['estado'],'creadoEn'=>$r['fecha_creacion'],'resueltoEn'=>$r['fecha_resolucion']];
            if($r['estado']==='Resuelto' && !(int)$r['credencial_vista'] && $r['contrasena_temporal']){
                $respuesta['contrasenaTemporal']=$r['contrasena_temporal'];$respuesta['mostrarUnaVez']=true;
                $u=$pdo->prepare('UPDATE RECUPERACION_CONTRASENA SET credencial_vista=1,contrasena_temporal=NULL WHERE id_recuperacion=?');$u->execute([$r['id_recuperacion']]);
            }
            responder($respuesta);
        }
        $q=$pdo->query("SELECT r.id_recuperacion AS id,r.id_ticket AS ticketId,r.cedula,r.codigo_seguimiento AS codigo,r.estado,
          CONCAT(u.nombre,' ',u.apellido) AS usuario,r.fecha_creacion AS creadoEn,r.fecha_resolucion AS resueltoEn
          FROM RECUPERACION_CONTRASENA r INNER JOIN USUARIO u ON u.cedula=r.cedula ORDER BY r.id_recuperacion DESC");
        responder($q->fetchAll(PDO::FETCH_ASSOC));
    }
    $d=cuerpoJson();
    if($_SERVER['REQUEST_METHOD']==='POST'){
        $cedula=preg_replace('/\D/','',texto($d['cedula']??'',15));$correo=filter_var(texto($d['correo']??'',150),FILTER_VALIDATE_EMAIL);
        $q=$pdo->prepare("SELECT nombre,apellido FROM USUARIO WHERE cedula=? AND correo_electronico=? AND estado='Activo'");$q->execute([$cedula,$correo]);$u=$q->fetch(PDO::FETCH_ASSOC);
        if(!$u)errorApi('Los datos no corresponden a una cuenta activa.',404);
        $pend=$pdo->prepare("SELECT codigo_seguimiento FROM RECUPERACION_CONTRASENA WHERE cedula=? AND estado IN ('Pendiente','En proceso') ORDER BY id_recuperacion DESC LIMIT 1");$pend->execute([$cedula]);
        $existente=$pend->fetchColumn();if($existente)responder(['ok'=>true,'codigo'=>$existente,'existente'=>true]);
        $codigo=codigoSeguimiento();$pdo->beginTransaction();
        try{
            $t=$pdo->prepare("INSERT INTO INCIDENCIA(categoria,descripcion,titulo,fecha_de_solicitud,lugar,estado,cedula_crea,tipo_ticket) VALUES('Cuenta',?,'Recuperacion de contraseña',CURDATE(),'Portal','Pendiente',?,'Recuperacion')");
            $t->execute(['Solicitud de recuperacion creada por '.$u['nombre'].' '.$u['apellido'].'.',$cedula]);$ticket=(int)$pdo->lastInsertId();
            $q=$pdo->prepare('INSERT INTO RECUPERACION_CONTRASENA(id_ticket,cedula,codigo_seguimiento) VALUES(?,?,?)');$q->execute([$ticket,$cedula,$codigo]);
            $pdo->commit();responder(['ok'=>true,'codigo'=>$codigo,'ticketId'=>(string)$ticket],201);
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    }
    $id=entero($d['id']??null,'id');$accion=texto($d['accion']??'',20);$responsable=preg_replace('/\D/','',texto($d['responsableCedula']??'',15));
    $q=$pdo->prepare('SELECT id_ticket,cedula,estado FROM RECUPERACION_CONTRASENA WHERE id_recuperacion=?');$q->execute([$id]);$r=$q->fetch(PDO::FETCH_ASSOC);
    if(!$r||!in_array($r['estado'],['Pendiente','En proceso'],true))errorApi('La solicitud ya no esta pendiente.',409);
    if($accion==='tomar'){
        $q=$pdo->prepare("UPDATE RECUPERACION_CONTRASENA SET estado='En proceso',cedula_responsable=? WHERE id_recuperacion=?");$q->execute([$responsable,$id]);
        $q=$pdo->prepare("UPDATE INCIDENCIA SET estado='En proceso',cedula_responde=? WHERE id_ticket=?");$q->execute([$responsable,$r['id_ticket']]);responder(['ok'=>true]);
    }
    if(!in_array($accion,['resolver','rechazar'],true))errorApi('Accion no valida.');
    $estado=$accion==='resolver'?'Resuelto':'Rechazado';$temporal=$accion==='resolver'?contrasenaTemporal():null;$pdo->beginTransaction();
    try{
        if($temporal){$u=$pdo->prepare('UPDATE USUARIO SET contrasena=?,debe_cambiar_contrasena=1 WHERE cedula=?');$u->execute([$temporal,$r['cedula']]);}
        $q=$pdo->prepare('UPDATE RECUPERACION_CONTRASENA SET estado=?,contrasena_temporal=?,cedula_responsable=?,fecha_resolucion=NOW() WHERE id_recuperacion=?');$q->execute([$estado,$temporal,$responsable?:null,$id]);
        $q=$pdo->prepare("UPDATE INCIDENCIA SET estado=?,fecha_cierre=CURDATE(),cedula_responde=?,diagnostico=?,solucion=? WHERE id_ticket=?");
        $q->execute([$accion==='resolver'?'Resuelto':'Cerrado',$responsable?:null,'Solicitud de recuperacion revisada.',$accion==='resolver'?'Se genero una contraseña temporal.':'Solicitud rechazada.',$r['id_ticket']]);
        $pdo->commit();responder(['ok'=>true,'estado'=>$estado]);
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
});
