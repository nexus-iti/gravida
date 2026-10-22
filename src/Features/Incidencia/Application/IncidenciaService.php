<?php
declare(strict_types=1);
namespace Nexus\Features\Incidencia\Application;

use Nexus\Features\Incidencia\Domain\EstadoIncidencia;
use Nexus\Features\Incidencia\Domain\IncidenciaRepository;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\DomainException;

final class IncidenciaService
{
    private IncidenciaRepository $repo;
    public function __construct(IncidenciaRepository $repo) {$this->repo=$repo;}
    private function exigir(int $id): void {if(!$this->repo->existe($id))throw new DomainException('No existe la incidencia indicada.',404);}
    public function listar(Cedula $u,bool $gestiona): array {return array_map([$this,'presentar'],$this->repo->listar($u,$gestiona));}
    public function crear(array $d,Cedula $u): int {if(!$this->repo->usuarioExiste($u))throw new DomainException('No existe el usuario solicitante indicado.',404);if(trim((string)($d['titulo']??''))===''||trim((string)($d['descripcion']??''))==='')throw new DomainException('El asunto y el mensaje son obligatorios.');if(trim((string)($d['categoria']??''))===''||trim((string)($d['lugar']??''))==='')throw new DomainException('La categoria y la ubicacion son obligatorias.');if(($d['idEquipo']??null)!==null&&!$this->repo->equipoExiste($d['idEquipo']))throw new DomainException('No existe el equipo indicado.',404);return $this->repo->crear($d,$u);}
    public function listarBajas(): array {return array_map([$this,'presentar'],$this->repo->listarBajas());}
    public function asignar(int $id,Cedula $responsable): void {$this->exigir($id);if(!$this->repo->responsableValido($responsable))throw new DomainException('El responsable debe ser un usuario activo con rol tecnico o administrador.');$this->repo->asignar($id,$responsable);}
    public function baja(int $id): void {$this->exigir($id);$this->repo->baja($id);}
    public function comentar(int $id,string $c): void {$this->exigir($id);if($c==='')throw new DomainException('El comentario no puede quedar vacio.');if(!$this->repo->comentar($id,$c))throw new DomainException('Solo se puede comentar una incidencia resuelta o cerrada.',409);}
    public function diagnostico(int $id,?string $d,?string $s): void {$this->exigir($id);$this->repo->actualizarDiagnostico($id,$d,$s);}
    public function tomar(int $id,Cedula $t): void {$this->exigir($id);if(!$this->repo->usuarioExiste($t))throw new DomainException('No existe el tecnico responsable indicado.',404);$this->repo->tomar($id,$t);}
    public function estado(int $id,EstadoIncidencia $e,Cedula $t,string $d='',string $s=''): void {$this->exigir($id);if(!$this->repo->usuarioExiste($t))throw new DomainException('No existe el tecnico responsable indicado.',404);$this->repo->cambiarEstado($id,$e,$t,$d,$s);}
    public function presentar(array $f): array {return ['id'=>(string)$f['id_ticket'],'asunto'=>$f['titulo'],'categoria'=>$f['categoria'],'estado'=>$f['estado']==='En proceso'?'En revision':($f['estado']==='Cerrado'?'Denegado':$f['estado']),'ubicacion'=>$f['lugar'],'mensaje'=>$f['descripcion'],'solicitante'=>trim($f['nombre_crea'].' '.$f['apellido_crea']),'solicitanteId'=>(string)$f['cedula_crea'],'gestionadoPor'=>$f['cedula_responde']===null?'':trim(($f['nombre_responde']??'').' '.($f['apellido_responde']??'')),'tecnicoId'=>$f['cedula_responde']===null?'':(string)$f['cedula_responde'],'equipoId'=>$f['id_equipo']===null?'':(string)$f['id_equipo'],'creadoEn'=>$f['fecha_de_solicitud'],'diagnostico'=>$f['diagnostico'],'solucion'=>$f['solucion'],'comentarioResolucion'=>$f['comentario_resolucion']??'','fechaCierre'=>$f['fecha_cierre']];}
}
