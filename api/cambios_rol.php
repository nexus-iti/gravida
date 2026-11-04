<?php
declare(strict_types=1);
use Nexus\Features\SolicitudRol\Application\SolicitudRolService;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Features\SolicitudRol\Infrastructure\PdoSolicitudRolRepository;
require_once __DIR__.'/common.php';exigirMetodo(['GET','POST','PUT','PATCH']);$sesionActual=autorizarEndpoint('cambios_rol');$servicio=new SolicitudRolService(new PdoSolicitudRolRepository($pdo));
ejecutar(function()use($servicio,$sesionActual):void{
    $metodo=$_SERVER['REQUEST_METHOD'];if($metodo==='GET')responder($servicio->listar());$d=cuerpoJson();$usuario=new Cedula((string)$sesionActual['cedula']);
    if($metodo==='POST'){$rolPedido=(string)($d['rolSolicitado']??'');$rolesPorOpcion=['Usuario solicitante'=>'Solicitante','Usuario tecnico'=>'Tecnico_Asistente','Usuario administrativo'=>'Administrador'];if(($rolesPorOpcion[$rolPedido]??null)===(string)$sesionActual['rol'])throw new \Nexus\Shared\DomainException('Ya tenés ese rol.');$id=$servicio->crear($usuario,$rolPedido,texto($d['motivo']??'',65535));responder(['ok'=>true,'id'=>(string)$id],201);}
    $servicio->resolver(entero($d['id']??null,'id'),texto($d['estado']??'',20),$usuario);responder(['ok'=>true]);
});
