<?php
declare(strict_types=1);
namespace Nexus\Features\SolicitudRegistro\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface SolicitudRegistroRepository
{
    public function listar():array;
    public function registroHabilitado():bool;
    public function crearConUsuario(array $usuario):int;
    public function resolver(int $id,string $estado,Cedula $administrador):bool;
}
