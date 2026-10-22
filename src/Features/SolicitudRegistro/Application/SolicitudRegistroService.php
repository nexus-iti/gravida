<?php
declare(strict_types=1);
namespace Nexus\Features\SolicitudRegistro\Application;
use Nexus\Shared\Security\PasswordCharset;
use Nexus\Shared\Security\PasswordHasher;
use Nexus\Features\SolicitudRegistro\Domain\SolicitudRegistroRepository;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\Domain\ValueObject\Rol;
use Nexus\Shared\DomainException;
final class SolicitudRegistroService
{
    private SolicitudRegistroRepository $repo;private PasswordHasher $hasher;
    public function __construct(SolicitudRegistroRepository $repo,PasswordHasher $hasher){$this->repo=$repo;$this->hasher=$hasher;}
    public function listar():array{return array_map([$this,'presentar'],$this->repo->listar());}
    public function crear(array $d):array
    {
        if(!$this->repo->registroHabilitado())throw new DomainException('El registro de nuevas cuentas esta temporalmente deshabilitado.',403);
        if(!filter_var($d['correo'],FILTER_VALIDATE_EMAIL)||$d['contrasena']==='')throw new DomainException('Cedula, correo y contrasena son obligatorios.');
        if($d['nombre']==='')throw new DomainException('El nombre es obligatorio.');
        if(PasswordCharset::contieneEnie($d['contrasena']))throw new DomainException(PasswordCharset::MENSAJE);
        $d['rol']=Rol::desdeCliente($d['rol'])->value();$d['hash']=$this->hasher->hash($d['contrasena']);$id=$this->repo->crearConUsuario($d);
        return ['ok'=>true,'solicitud'=>['id'=>(string)$id,'cedula'=>$d['cedula']->value()]];
    }
    public function resolver(int $id,string $estado,Cedula $admin):void
    {
        if(!in_array($estado,['Aprobado','Rechazado'],true))throw new DomainException('Se requiere un estado de resolucion y un administrador valido.');
        if(!$this->repo->resolver($id,$estado,$admin))throw new DomainException('No existe una solicitud pendiente con ese identificador.',404);
    }
    private function presentar(array $f):array
    {
        $rol=$f['rol']==='Administrador'?'Usuario administrativo':($f['rol']==='Tecnico_Asistente'?'Usuario tecnico':'Usuario solicitante');
        return ['id'=>(string)$f['id_solicitud_registro'],'cedula'=>(string)$f['id_usuario_manda'],'nombreCompleto'=>trim($f['nombre'].' '.$f['apellido']),'correo'=>$f['correo_electronico'],'rol'=>$rol,'estado'=>function_exists('mb_strtolower')?mb_strtolower($f['estado_solicitud'],'UTF-8'):strtolower($f['estado_solicitud']),'revisadoPorId'=>(string)($f['id_usuario_responde']??''),'revisadoPor'=>trim(($f['responde_nombre']??'').' '.($f['responde_apellido']??''))];
    }
}
