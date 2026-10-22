<?php
declare(strict_types=1);
namespace Nexus\Features\Prestamo\Application;
use Nexus\Features\Prestamo\Domain\PrestamoRepository;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Shared\DomainException;
final class PrestamoService
{
    private PrestamoRepository $repo;public function __construct(PrestamoRepository $r){$this->repo=$r;}
    public function listar(Cedula $u,bool $g):array{return array_map([$this,'presentar'],$this->repo->listar($u,$g));}
    public function crear(array $d,Cedula $u):array
    {
        $fecha=\DateTimeImmutable::createFromFormat('!Y-m-d',$d['fecha']);if(!$fecha||$fecha->format('Y-m-d')!==$d['fecha'])throw new DomainException('El campo fecha debe usar el formato YYYY-MM-DD.');
        $hoy=new \DateTimeImmutable('today');$max=$this->repo->diasMaximos();if($fecha<$hoy||(int)$hoy->diff($fecha)->format('%a')>$max)throw new DomainException('La fecha del prestamo debe estar dentro de los proximos '.$max.' dias.');
        if(!$d['recursos'])throw new DomainException('Debes indicar al menos un equipo para el prestamo.');$recursos=[];
        foreach($d['recursos'] as $r){if(!is_array($r))throw new DomainException('Cada recurso debe tener un equipo y una cantidad validos.');$cantidad=filter_var($r['cantidad']??null,FILTER_VALIDATE_INT);$nombre=trim((string)($r['nombre']??''));if($nombre===''||$cantidad===false||$cantidad<1)throw new DomainException('Cada recurso debe tener un nombre y una cantidad valida.');$id=filter_var($r['idEquipo']??null,FILTER_VALIDATE_INT);if($id===false||$id<1)throw new DomainException('El campo idEquipo debe ser un entero valido.');$recursos[]=['idEquipo'=>(int)$id,'descripcion'=>$cantidad.' '.$nombre,'categoria'=>trim((string)($r['categoria']??''))];}
        $d['recursos']=$recursos;$ids=$this->repo->crear($d,$u);return ['ok'=>true,'id'=>(string)$ids[0],'ids'=>array_map('strval',$ids)];
    }
    public function modificar(int $id,array $d):void
    {
        $actual=$this->repo->estadoActivo($id);
        if($actual===null)throw new DomainException('No existe el prestamo activo indicado.',404);
        if(!in_array($actual['estado'],['Solicitado','Activo'],true))throw new DomainException('Solo se puede modificar un prestamo pendiente o aprobado.',409);
        $fecha=\DateTimeImmutable::createFromFormat('!Y-m-d',$d['fecha']);
        if(!$fecha||$fecha->format('Y-m-d')!==$d['fecha'])throw new DomainException('El campo fecha debe usar el formato YYYY-MM-DD.');
        if($d['fecha']!==$actual['fecha_devolucion']){$hoy=new \DateTimeImmutable('today');$max=$this->repo->diasMaximos();if($fecha<$hoy||(int)$hoy->diff($fecha)->format('%a')>$max)throw new DomainException('La fecha del prestamo debe estar dentro de los proximos '.$max.' dias.');}
        if(trim($d['jornada'])===''||trim($d['ubicacion'])==='')throw new DomainException('La categoria y la ubicacion son obligatorias.');
        $this->repo->modificar($id,$d);
    }
    public function baja(int $id,Cedula $responsable):void{if(!$this->repo->baja($id,$responsable))throw new DomainException('No existe el prestamo activo indicado.',404);}
    public function comentar(int $id,string $c,Cedula $responsable):void{if($c==='')throw new DomainException('El comentario no puede quedar vacio.');if(!$this->repo->comentar($id,$c,$responsable))throw new DomainException('Solo se puede agregar un comentario una vez y luego de atender el prestamo.',409);}
    public function cambiarEstado(int $id,string $estado,Cedula $responsable,string $observacion=''):void{$map=['Aprobado'=>'Activo','Activo'=>'Activo','Devuelto'=>'Devuelto','Denegado'=>'Cancelado','Cancelado'=>'Cancelado'];if(!isset($map[$estado]))throw new DomainException('Estado de prestamo no valido.');if(!$this->repo->cambiarEstado($id,$map[$estado],$responsable,$observacion))throw new DomainException('No existe el prestamo activo indicado.',404);}
    private function presentar(array $f):array{$recurso=trim((string)($f['recursos_solicitados']?:$f['nombre_equipo']));$cantidad=1;if(preg_match('/^(\d+)\s+(.+)$/u',$recurso,$m)){$cantidad=(int)$m[1];$recurso=$m[2];}$estado=['Solicitado'=>'Pendiente','Activo'=>'Aprobado','Cancelado'=>'Denegado'][$f['estado']]??$f['estado'];return ['id'=>(string)$f['id_prestamo'],'categoria'=>$f['categoria'],'recurso'=>$recurso,'cantidad'=>$cantidad,'cantidadTotal'=>(int)($f['cantidad_del_equipo']??0),'cantidadReservada'=>(int)($f['cantidad_reservada']??0),'cantidadDisponible'=>(int)($f['cantidad_disponible']??0),'fecha'=>$f['fecha_devolucion'],'fechaDevolucionReal'=>$f['fecha_devolucion_real']??null,'jornada'=>$f['jornada'],'ubicacion'=>$f['lugar_entrega'],'estado'=>$estado,'detalle'=>$f['descripcion'],'comentarioResolucion'=>$f['comentario_resolucion']??'','solicitante'=>trim($f['nombre'].' '.$f['apellido']),'solicitanteId'=>(string)$f['cedula'],'equipoId'=>(string)$f['id_equipo'],'creadoEn'=>$f['fecha_solicitado']];}
}
