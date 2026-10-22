<?php
declare(strict_types=1);
namespace Nexus\Features\Administracion\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface AdministracionRepository
{
    public function listarReportes():array;public function crearReporte(array $d):int;public function actualizarReporte(int $id,array $d,Cedula $r):bool;
    public function listarCatalogo(string $tipo,bool $inactivos):array;public function crearCatalogo(string $tipo,string $nombre,string $descripcion):int;public function editarCatalogo(string $tipo,int $id,array $d):bool;public function bajaCatalogo(string $tipo,int $id):bool;
    public function configuracion():array;public function guardarConfiguracion(string $clave,string $valor,Cedula $usuario):void;public function historial():array;
}
