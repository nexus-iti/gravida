<?php
declare(strict_types=1);
use Nexus\Features\Trabajo\Application\TrabajoService;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Features\Trabajo\Infrastructure\PdoTrabajoRepository;
require_once __DIR__.'/common.php';exigirMetodo(['GET','PUT','PATCH']);$sesionActual=autorizarEndpoint('planilla_ta');$servicio=new TrabajoService(new PdoTrabajoRepository($pdo));
ejecutar(function()use($servicio,$sesionActual):void{if($_SERVER['REQUEST_METHOD']==='GET')responder($servicio->planillas());$d=cuerpoJson();$textoCedula=texto($d['cedula']??'',15);if($textoCedula==='')throw new \Nexus\Shared\DomainException('La cédula es obligatoria.');$servicio->guardarPlanilla(new Cedula($textoCedula),new Cedula((string)$sesionActual['cedula']),($sesionActual['rol']??'')==='Administrador',['tareas'=>texto($d['tareasDelDia']??'',65535),'entrada'=>hora($d['horaEntrada']??'08:00','horaEntrada'),'salida'=>hora($d['horaSalida']??'16:00','horaSalida')]);responder(['ok'=>true]);});
