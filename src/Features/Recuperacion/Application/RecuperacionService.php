<?php
declare(strict_types=1);
namespace Nexus\Features\Recuperacion\Application;
use Nexus\Features\Recuperacion\Domain\RecuperacionRepository;
use Nexus\Shared\Security\PasswordHasher;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\DomainException;
final class RecuperacionService
{
    private const VIGENCIA_TEMPORAL=86400; // la contraseña temporal solo se puede retirar durante 24 h
    private RecuperacionRepository $repo;private PasswordHasher $hasher;
    public function __construct(RecuperacionRepository $repo,PasswordHasher $hasher){$this->repo=$repo;$this->hasher=$hasher;}
    public function listar():array{return $this->repo->listar();}
    /* El codigo de seguimiento NO se devuelve al solicitante: autoriza leer la contraseña temporal y
       quien lo pide todavia no probo ser el titular. Lo entrega un tecnico (lo ve en su bandeja) tras
       verificar la identidad. La respuesta es la misma exista o no la cuenta, para no servir de oraculo. */
    public function solicitar(Cedula $cedula,string $correo):array
    {
        $respuesta=['ok'=>true];
        if(!filter_var($correo,FILTER_VALIDATE_EMAIL))return $respuesta;
        $cuenta=$this->repo->buscarCuentaActiva($cedula,$correo);if(!$cuenta)return $respuesta;
        if($this->repo->codigoPendiente($cedula))return $respuesta;
        $codigo=strtoupper(substr(bin2hex(random_bytes(8)),0,12));$this->repo->crearConTicket($cedula,trim($cuenta['nombre'].' '.$cuenta['apellido']),$codigo);
        return $respuesta;
    }
    public function consultar(Cedula $cedula,string $codigo):array
    {
        $r=$this->repo->consultar($cedula,strtoupper($codigo));if(!$r)throw new DomainException('No existe una solicitud con esos datos.',404);
        $vigente=empty($r['fecha_resolucion'])||strtotime((string)$r['fecha_resolucion'])+self::VIGENCIA_TEMPORAL>time();
        $salida=['id'=>(string)$r['id_recuperacion'],'ticketId'=>(string)$r['id_ticket'],'estado'=>$r['estado'],'creadoEn'=>$r['fecha_creacion'],'resueltoEn'=>$r['fecha_resolucion']];
        if($r['estado']==='Resuelto'&&$vigente&&!(int)$r['credencial_vista']&&!empty($r['contrasena_temporal'])){$salida['contrasenaTemporal']=$r['contrasena_temporal'];$salida['mostrarUnaVez']=true;$this->repo->consumirCredencial((int)$r['id_recuperacion']);}
        return $salida;
    }
    public function gestionar(int $id,string $accion,Cedula $responsable):array
    {
        $s=$this->repo->buscarPendiente($id);if(!$s)throw new DomainException('La solicitud ya no está pendiente.',409);
        if($s['cedula']===$responsable->value())throw new DomainException('No podés gestionar tu propia solicitud de recuperación.',403);
        if($accion==='tomar'){$this->repo->tomar($id,(int)$s['id_ticket'],$responsable);return ['ok'=>true];}
        if(!in_array($accion,['resolver','rechazar'],true))throw new DomainException('Acción no valida.');
        $temporal=$accion==='resolver'?'Nx'.random_int(10000000,99999999).'!':null;$hash=$temporal===null?null:$this->hasher->hash($temporal);
        if($temporal!==null&&!$this->hasher->verify($temporal,(string)$hash))throw new \RuntimeException('No se pudo validar la contraseña temporal.');
        $this->repo->resolver($id,$s,$responsable,$temporal,$hash);return ['ok'=>true,'estado'=>$accion==='resolver'?'Resuelto':'Rechazado'];
    }
}
