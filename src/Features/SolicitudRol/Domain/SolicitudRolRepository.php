<?php
declare(strict_types=1);
namespace Nexus\Features\SolicitudRol\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface SolicitudRolRepository
{
    public function listar():array;
    public function rolActivo(Cedula $cedula):?string;
    public function tienePendiente(Cedula $cedula):bool;
    public function crear(Cedula $cedula,string $actual,string $solicitado,string $motivo):int;
    public function resolver(int $id,string $estado,Cedula $revisor):bool;
}
