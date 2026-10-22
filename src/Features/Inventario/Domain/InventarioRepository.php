<?php
declare(strict_types=1);
namespace Nexus\Features\Inventario\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface InventarioRepository
{
    public function listarEquipos():array;public function ubicacionExiste(int $id,bool $activa=false):bool;public function crearEquipo(array $d,Cedula $autor):int;public function editarEquipo(int $id,array $d,Cedula $autor):bool;public function trasladarEquipo(int $id,int $destino,Cedula $autor):?bool;public function bajaEquipo(int $id,Cedula $autor):?bool;
    public function esquemaUbicacionesActualizado():bool;public function listarUbicaciones():array;public function crearUbicacion(string $nombre,Cedula $autor):int;public function renombrarUbicacion(int $id,string $nombre,Cedula $autor):bool;public function bajaUbicacion(int $id,?int $destino,Cedula $autor):?array;
}
