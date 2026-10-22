<?php
declare(strict_types=1);
use Nexus\Features\Servicio\Application\ServicioService;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Features\Servicio\Infrastructure\PdoServicioRepository;
require_once __DIR__.'/common.php';exigirMetodo(['GET','POST','PUT','PATCH','DELETE']);$sesionActual=autorizarEndpoint('servicios');$servicio=new ServicioService(new PdoServicioRepository($pdo));
ejecutar(function()use($servicio,$sesionActual):void{
    $metodo=$_SERVER['REQUEST_METHOD'];$usuario=new Cedula((string)$sesionActual['cedula']);$gestiona=in_array($sesionActual['rol'],['Tecnico_Asistente','Administrador'],true);
    if($metodo==='GET')responder($servicio->listar($usuario,$gestiona));$d=cuerpoJson();
    if($metodo==='POST'){$id=$servicio->crear(['tipo'=>texto($d['tipo']??'',60),'titulo'=>texto($d['titulo']??'',100),'lugar'=>texto($d['lugar']??'',100),'detalle'=>texto($d['detalle']??'',65535),'fechaDeseada'=>fecha($d['fechaDeseada']??'','fechaDeseada',true)],$usuario);responder(['ok'=>true,'id'=>(string)$id],201);}
    if(!$gestiona)throw new \Nexus\Shared\DomainException('No tenes permisos para realizar esta operacion.',403);
    $id=entero($d['id']??null,'id');if($metodo==='DELETE')$servicio->baja($id);elseif(texto($d['accion']??'',30)==='modificar')$servicio->modificar($id,['tipo'=>texto($d['tipo']??'',60),'titulo'=>texto($d['titulo']??'',100),'lugar'=>texto($d['lugar']??'',100),'detalle'=>texto($d['detalle']??'',65535),'fechaDeseada'=>fecha($d['fechaDeseada']??'','fechaDeseada',true)]);else $servicio->cambiarEstado($id,(string)($d['estado']??''));responder(['ok'=>true]);
});
