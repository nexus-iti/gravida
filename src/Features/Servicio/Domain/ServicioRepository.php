<?php
declare(strict_types=1);
namespace Nexus\Features\Servicio\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface ServicioRepository{public function listar(Cedula $u,bool $g):array;public function usuarioExiste(Cedula $u):bool;public function crear(array $d,Cedula $u):int;public function baja(int $id):bool;public function cambiarEstado(int $id,string $e):bool;public function estadoActivo(int $id):?string;public function modificar(int $id,array $d):void;}
