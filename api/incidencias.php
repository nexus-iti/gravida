<?php
declare(strict_types=1);
use Nexus\Features\Incidencia\Application\IncidenciaService;
use Nexus\Features\Incidencia\Domain\EstadoIncidencia;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Features\Incidencia\Infrastructure\PdoIncidenciaRepository;
use Nexus\Shared\DomainException;
require_once __DIR__ . '/common.php';
exigirMetodo(['GET','POST','PUT','PATCH','DELETE']);
$sesionActual=autorizarEndpoint('incidencias');
$servicio=new IncidenciaService(new PdoIncidenciaRepository($pdo));
ejecutar(function() use($servicio,$sesionActual): void {
    $metodo=$_SERVER['REQUEST_METHOD'];
    $usuario=new Cedula((string)$sesionActual['cedula']);
    $puedeGestionar=in_array($sesionActual['rol'],['Tecnico_Asistente','Administrador'],true);
    if($metodo==='GET'){
        if(texto($_GET['bajas']??'',1)==='1'){if(!$puedeGestionar) throw new DomainException('No tenes permisos para gestionar incidencias.',403);responder($servicio->listarBajas());}
        responder($servicio->listar($usuario,$puedeGestionar));
    }
    $datos=cuerpoJson();
    if($metodo==='POST'){
        $idEquipo=isset($datos['idEquipo'])&&$datos['idEquipo']!==''?entero($datos['idEquipo'],'idEquipo'):null;
        $id=$servicio->crear(['categoria'=>texto($datos['categoria']??'',60),'titulo'=>texto($datos['asunto']??'',100),'lugar'=>texto($datos['ubicacion']??'',100),'descripcion'=>texto($datos['mensaje']??'',65535),'idEquipo'=>$idEquipo],$usuario);
        responder(['ok'=>true,'id'=>(string)$id],201);
    }
    $id=entero($datos['id']??null,'id');
    if(!$puedeGestionar) throw new DomainException('No tenes permisos para gestionar incidencias.',403);
    if($metodo==='DELETE'){$servicio->baja($id);responder(['ok'=>true]);}
    $accion=texto($datos['accion']??'',30);
    if($accion==='comentar') $servicio->comentar($id,texto($datos['comentario']??'',65535));
    elseif($accion==='modificar_diagnostico') $servicio->diagnostico($id,texto($datos['diagnostico']??'',65535),texto($datos['solucion']??'',65535));
    elseif($accion==='baja_diagnostico') $servicio->diagnostico($id,null,null);
    elseif($accion==='tomar') $servicio->tomar($id,$usuario);
    elseif($accion==='asignar') $servicio->asignar($id,new Cedula(texto($datos['tecnicoId']??'',15)));
    else {
        $estado=EstadoIncidencia::desdeCliente((string)($datos['estado']??''));
        if($accion==='cerrar'&&!$estado->esFinal()) throw new DomainException('El cierre solo admite los estados Resuelto o Cerrado.');
        $servicio->estado($id,$estado,$usuario,texto($datos['diagnostico']??'',65535),texto($datos['solucion']??'',65535));
    }
    responder(['ok'=>true]);
});
