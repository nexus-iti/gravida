<?php
declare(strict_types=1);
namespace Nexus\Features\Servicio\Application;
use Nexus\Features\Servicio\Domain\ServicioRepository;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Shared\DomainException;
final class ServicioService
{
    private ServicioRepository $repo;public function __construct(ServicioRepository $r){$this->repo=$r;}
    public function listar(Cedula $u,bool $g):array{return array_map([$this,'presentar'],$this->repo->listar($u,$g));}
    public function crear(array $d,Cedula $u):int
    {
        if(!$this->repo->usuarioExiste($u))throw new DomainException('No existe el usuario solicitante indicado.',404);
        foreach(['tipo'=>'tipo de servicio','titulo'=>'titulo','lugar'=>'lugar','detalle'=>'detalle'] as $campo=>$etiqueta){
            if(trim((string)($d[$campo]??''))==='')throw new DomainException('El '.$etiqueta.' es obligatorio.');
        }
        if(($d['fechaDeseada']??null)===null)throw new DomainException('La fecha deseada es obligatoria.');
        $f=\DateTimeImmutable::createFromFormat('!Y-m-d',(string)$d['fechaDeseada']);
        if(!$f||$f->format('Y-m-d')!==$d['fechaDeseada'])throw new DomainException('El campo fechaDeseada debe usar el formato YYYY-MM-DD.');
        if($f<new \DateTimeImmutable('today'))throw new DomainException('La fecha deseada no puede ser anterior a hoy.');
        return $this->repo->crear($d,$u);
    }
    public function modificar(int $id,array $d):void
    {
        $estado=$this->repo->estadoActivo($id);
        if($estado===null)throw new DomainException('No existe la solicitud activa indicada.',404);
        if(!in_array($estado,['Pendiente','En proceso'],true))throw new DomainException('Solo se puede modificar una solicitud pendiente o en proceso.',409);
        foreach(['tipo'=>'tipo de servicio','titulo'=>'titulo','lugar'=>'lugar','detalle'=>'detalle'] as $campo=>$etiqueta){
            if(trim((string)($d[$campo]??''))==='')throw new DomainException('El '.$etiqueta.' es obligatorio.');
        }
        if(($d['fechaDeseada']??null)===null)throw new DomainException('La fecha deseada es obligatoria.');
        $f=\DateTimeImmutable::createFromFormat('!Y-m-d',(string)$d['fechaDeseada']);
        if(!$f||$f->format('Y-m-d')!==$d['fechaDeseada'])throw new DomainException('El campo fechaDeseada debe usar el formato YYYY-MM-DD.');
        $this->repo->modificar($id,$d);
    }
    public function baja(int $id):void{if(!$this->repo->baja($id))throw new DomainException('No existe la solicitud activa indicada.',404);}
    public function cambiarEstado(int $id,string $e):void{$m=['Pendiente'=>'Pendiente','En proceso'=>'En proceso','Completado'=>'Finalizado','Finalizado'=>'Finalizado','Denegado'=>'Cancelado','Cancelado'=>'Cancelado'];if(!isset($m[$e]))throw new DomainException('Estado de servicio no valido.');if(!$this->repo->cambiarEstado($id,$m[$e]))throw new DomainException('No existe el servicio indicado.',404);}
    private function presentar(array $f):array{$e=['Finalizado'=>'Completado','Cancelado'=>'Denegado'][$f['estado']]??$f['estado'];return ['id'=>(string)$f['id_servicio'],'titulo'=>$f['titulo'],'tipo'=>$f['tipo_de_servicio'],'fecha'=>$f['fecha_de_solicitud'],'fechaDeseada'=>$f['fecha_deseada']??'','lugar'=>$f['lugar'],'estado'=>$e,'detalle'=>$f['descripcion'],'solicitante'=>trim($f['nombre_solicitante'].' '.$f['apellido_solicitante']),'solicitanteId'=>(string)$f['cedula'],'creadoEn'=>$f['fecha_de_solicitud']];}
}
