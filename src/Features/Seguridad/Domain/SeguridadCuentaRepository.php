<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface SeguridadCuentaRepository
{
    public function segundoFactor(Cedula $cedula):array;
    public function passwordHash(Cedula $cedula):string;
    public function actividad(Cedula $cedula,array $tipos,int $limite):array;
    public function activarTotp(Cedula $cedula,string $secreto,int $paso):void;
    public function actualizarPaso(Cedula $cedula,int $paso):void;
    public function desactivarTotp(Cedula $cedula):void;
    public function usuarioExiste(Cedula $cedula):bool;
    public function restablecerTotp(Cedula $cedula):void;
    public function incrementarVersion(Cedula $cedula):int;
    public function cambiarPassword(Cedula $cedula,string $hash):void;
    public function registrarEvento(string $tipo,Cedula $cedula,string $detalle=''):void;
}
