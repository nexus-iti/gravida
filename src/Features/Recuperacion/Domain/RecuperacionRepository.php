<?php
declare(strict_types=1);
namespace Nexus\Features\Recuperacion\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface RecuperacionRepository
{
    public function listar():array;
    public function buscarCuentaActiva(Cedula $cedula,string $correo):?array;
    public function codigoPendiente(Cedula $cedula):?string;
    public function crearConTicket(Cedula $cedula,string $nombre,string $codigo):int;
    public function consultar(Cedula $cedula,string $codigo):?array;
    public function consumirCredencial(int $id):void;
    public function buscarPendiente(int $id):?array;
    public function tomar(int $id,int $ticket,Cedula $responsable):void;
    public function resolver(int $id,array $solicitud,Cedula $responsable,?string $temporal,?string $hash):void;
}
