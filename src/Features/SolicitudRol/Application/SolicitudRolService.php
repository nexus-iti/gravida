<?php
declare(strict_types=1);
namespace Nexus\Features\SolicitudRol\Application;
use Nexus\Features\SolicitudRol\Domain\SolicitudRolRepository;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Shared\Domain\ValueObject\Rol;use Nexus\Shared\DomainException;
final class SolicitudRolService
{
    private SolicitudRolRepository $repo;public function __construct(SolicitudRolRepository $repo){$this->repo=$repo;}
    public function listar():array{return $this->repo->listar();}
    public function crear(Cedula $cedula,string $rol,string $motivo):int{$actual=$this->repo->rolActivo($cedula);if($actual===null)throw new DomainException('No existe el usuario activo.',404);if($this->repo->tienePendiente($cedula))throw new DomainException('Ya existe una solicitud pendiente.',409);return $this->repo->crear($cedula,$actual,Rol::desdeCliente($rol)->value(),$motivo);}
    public function resolver(int $id,string $estado,Cedula $revisor):void{if(!in_array($estado,['Aprobado','Rechazado'],true))throw new DomainException('Estado de revision no valido.');if(!$this->repo->resolver($id,$estado,$revisor))throw new DomainException('No existe una solicitud pendiente.',404);}
}
