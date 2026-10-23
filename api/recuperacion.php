<?php
declare(strict_types=1);
use Nexus\Features\Recuperacion\Application\RecuperacionService;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Features\Recuperacion\Infrastructure\PdoRecuperacionRepository;
use Nexus\Features\Seguridad\Infrastructure\SegPasswordHasher;
require_once __DIR__.'/common.php';
exigirMetodo(['GET','POST','PUT','PATCH']);
$sesionActual=autorizarEndpoint('recuperacion');
$servicio=new RecuperacionService(new PdoRecuperacionRepository($pdo),new SegPasswordHasher());
ejecutar(function()use($servicio,$sesionActual):void{
    $metodo=$_SERVER['REQUEST_METHOD'];if($metodo==='GET')responder($servicio->listar());$d=cuerpoJson();
    if($metodo==='POST'){
        $cedula=new Cedula(texto($d['cedula']??'',15));
        if(texto($d['accion']??'',20)==='consultar')responder($servicio->consultar($cedula,texto($d['codigo']??'',12)));
        responder($servicio->solicitar($cedula,texto($d['correo']??'',150)));
    }
    $resultado=$servicio->gestionar(entero($d['id']??null,'id'),texto($d['accion']??'',20),new Cedula((string)$sesionActual['cedula']));responder($resultado);
});
