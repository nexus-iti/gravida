<?php
declare(strict_types=1);
namespace Nexus\Features\Prestamo\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface PrestamoRepository
{
    public function listar(Cedula $usuario,bool $gestiona):array;
    public function diasMaximos():int;
    public function crear(array $datos,Cedula $usuario):array;
    public function baja(int $id,Cedula $responsable):bool;
    public function comentar(int $id,string $comentario,Cedula $responsable):bool;
    public function estadoActivo(int $id):?array;
    public function modificar(int $id,array $datos):void;
    public function cambiarEstado(int $id,string $estado,Cedula $responsable,string $observacion=''):bool;
}
