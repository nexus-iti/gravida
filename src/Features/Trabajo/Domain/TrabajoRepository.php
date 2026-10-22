<?php
declare(strict_types=1);
namespace Nexus\Features\Trabajo\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface TrabajoRepository
{
    public function listarTareas():array;public function responsableValido(?Cedula $c):bool;public function crearTarea(array $d,?Cedula $c):int;public function actualizarTarea(int $id,array $d,?Cedula $c):bool;public function eliminarTarea(int $id):bool;
    public function listarPlanillas():array;public function guardarPlanilla(Cedula $c,array $d):void;
}
