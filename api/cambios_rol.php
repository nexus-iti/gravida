<?php
declare(strict_types=1);
use Nexus\Features\SolicitudRol\Application\SolicitudRolService;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Features\SolicitudRol\Infrastructure\PdoSolicitudRolRepository;
require_once __DIR__.'/common.php';exigirMetodo(['GET','POST','PUT','PATCH']);$sesionActual=autorizarEndpoint('cambios_rol');$servicio=new SolicitudRolService(new PdoSolicitudRolRepository($pdo));
ejecutar(function()use($servicio,$sesionActual):void{
    $metodo=$_SERVER['REQUEST_METHOD'];if($metodo==='GET')responder($servicio->listar());$d=cuerpoJson();$usuario=new Cedula((string)$sesionActual['cedula']);
    if($metodo==='POST'){$id=$servicio->crear($usuario,(string)($d['rolSolicitado']??''),texto($d['motivo']??'',65535));responder(['ok'=>true,'id'=>(string)$id],201);}
    $servicio->resolver(entero($d['id']??null,'id'),texto($d['estado']??'',20),$usuario);responder(['ok'=>true]);
});
