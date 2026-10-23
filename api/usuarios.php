<?php
declare(strict_types=1);
use Nexus\Features\Usuario\Application\UsuarioService;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Features\Usuario\Infrastructure\PdoUsuarioRepository;
use Nexus\Shared\DomainException;
require_once __DIR__.'/common.php';
exigirMetodo(['GET','POST','PUT','PATCH','DELETE']);
$sesionActual=autorizarEndpoint('usuarios');
$servicio=new UsuarioService(new PdoUsuarioRepository($pdo));
ejecutar(function()use($servicio,$sesionActual):void{
    $metodo=$_SERVER['REQUEST_METHOD'];$esAdmin=($sesionActual['rol']??'')==='Administrador';
    if($metodo==='GET'){
        $valor=texto($_GET['cedula']??'',15);$individual=$valor!=='';$responsables=texto($_GET['responsablesTarea']??'',5)==='1';
        if($responsables&&!in_array($sesionActual['rol']??'',['Tecnico_Asistente','Administrador'],true))throw new DomainException('No tenés permisos para consultar responsables.',403);
        if(!$esAdmin&&!$responsables){if($valor!==''&&preg_replace('/\D/','',$valor)!==($sesionActual['cedula']??''))throw new DomainException('No podés consultar el perfil de otro usuario.',403);$valor=(string)$sesionActual['cedula'];}
        $cedula=$valor===''?null:new Cedula($valor);$usuarios=$servicio->listar($cedula,$responsables);responder($individual?($usuarios[0]??null):$usuarios);
    }
    $d=cuerpoJson();
    if($metodo==='POST'){
        [$nombre,$apellido]=dividirNombre(texto($d['nombreCompleto']??'',161));
        $usuario=$servicio->crear(['cedula'=>new Cedula(texto($d['cedula']??'',15)),'nombre'=>$nombre,'apellido'=>$apellido,'correo'=>texto($d['correo']??'',150),'contrasena'=>texto($d['contrasena']??'',255),'estado'=>texto($d['estado']??'Activo',10),'rol'=>(string)($d['rol']??'')]);
        responder(['ok'=>true,'usuario'=>$usuario],201);
    }
    $cedula=new Cedula(texto($d['cedula']??'',15));
    if($metodo==='DELETE'){$servicio->baja($cedula);responder(['ok'=>true]);}
    $accion=texto($d['accion']??'',30);
    if($accion==='cambiar_contrasena'){
        if(($sesionActual['cedula']??'')!==$cedula->value()&&!$esAdmin)throw new DomainException('No podés cambiar la contraseña de otro usuario.',403);
        $version=$servicio->cambiarContrasena($cedula,texto($d['contrasena']??'',255));
        // Las demas sesiones del titular quedan revocadas; la que hizo el cambio sigue valida.
        if(($sesionActual['cedula']??'')===$cedula->value()){$_SESSION['usuario']['version']=$version;session_regenerate_id(true);segReenviarCookie();}
    }elseif($accion==='actualizar_perfil'){
        if(($sesionActual['cedula']??'')!==$cedula->value()&&!$esAdmin)throw new DomainException('No podés modificar el perfil de otro usuario.',403);
        [$nombre,$apellido]=dividirNombre(texto($d['nombreCompleto']??'',161));
        $servicio->actualizarPerfil($cedula,['nombre'=>$nombre,'apellido'=>$apellido,'correo'=>texto($d['correo']??'',150),'descripcion'=>texto($d['descripcion']??'',65535)]);
    }elseif($accion==='estado'){
        if(!$esAdmin)throw new DomainException('No tenés permisos para realizar esta operación.',403);
        $servicio->cambiarEstado($cedula,texto($d['estado']??'',10));
    }else throw new DomainException('Acción no valida.');
    responder(['ok'=>true]);
});
