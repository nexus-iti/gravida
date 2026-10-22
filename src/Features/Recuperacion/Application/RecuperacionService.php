<?php
declare(strict_types=1);
namespace Nexus\Features\Recuperacion\Application;
use Nexus\Features\Recuperacion\Domain\RecuperacionRepository;
use Nexus\Shared\Security\PasswordHasher;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\DomainException;
final class RecuperacionService
{
    private RecuperacionRepository $repo;private PasswordHasher $hasher;
    public function __construct(RecuperacionRepository $repo,PasswordHasher $hasher){$this->repo=$repo;$this->hasher=$hasher;}
    public function listar():array{return $this->repo->listar();}
    public function solicitar(Cedula $cedula,string $correo):array
    {
        if(!filter_var($correo,FILTER_VALIDATE_EMAIL))throw new DomainException('Los datos no corresponden a una cuenta activa.',404);
        $cuenta=$this->repo->buscarCuentaActiva($cedula,$correo);if(!$cuenta)throw new DomainException('Los datos no corresponden a una cuenta activa.',404);
        $existente=$this->repo->codigoPendiente($cedula);if($existente)return ['ok'=>true,'codigo'=>$existente,'existente'=>true];
        $codigo=strtoupper(substr(bin2hex(random_bytes(8)),0,12));$ticket=$this->repo->crearConTicket($cedula,trim($cuenta['nombre'].' '.$cuenta['apellido']),$codigo);
        return ['ok'=>true,'codigo'=>$codigo,'ticketId'=>(string)$ticket];
    }
    public function consultar(Cedula $cedula,string $codigo):array
    {
        $r=$this->repo->consultar($cedula,strtoupper($codigo));if(!$r)throw new DomainException('No existe una solicitud con esos datos.',404);
        $salida=['id'=>(string)$r['id_recuperacion'],'ticketId'=>(string)$r['id_ticket'],'estado'=>$r['estado'],'creadoEn'=>$r['fecha_creacion'],'resueltoEn'=>$r['fecha_resolucion']];
        if($r['estado']==='Resuelto'&&!(int)$r['credencial_vista']&&!empty($r['contrasena_temporal'])){$salida['contrasenaTemporal']=$r['contrasena_temporal'];$salida['mostrarUnaVez']=true;$this->repo->consumirCredencial((int)$r['id_recuperacion']);}
        return $salida;
    }
    public function gestionar(int $id,string $accion,Cedula $responsable):array
    {
        $s=$this->repo->buscarPendiente($id);if(!$s)throw new DomainException('La solicitud ya no esta pendiente.',409);
        if($accion==='tomar'){$this->repo->tomar($id,(int)$s['id_ticket'],$responsable);return ['ok'=>true];}
        if(!in_array($accion,['resolver','rechazar'],true))throw new DomainException('Accion no valida.');
        $temporal=$accion==='resolver'?'Nx'.random_int(100000,999999).'!':null;$hash=$temporal===null?null:$this->hasher->hash($temporal);
        if($temporal!==null&&!$this->hasher->verify($temporal,(string)$hash))throw new \RuntimeException('No se pudo validar la contraseña temporal.');
        $this->repo->resolver($id,$s,$responsable,$temporal,$hash);return ['ok'=>true,'estado'=>$accion==='resolver'?'Resuelto':'Rechazado'];
    }
}
