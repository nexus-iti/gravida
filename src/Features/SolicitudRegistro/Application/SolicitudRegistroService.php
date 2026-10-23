<?php
declare(strict_types=1);
namespace Nexus\Features\SolicitudRegistro\Application;
use Nexus\Shared\Security\PasswordRules;
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
        if(!filter_var($d['correo'],FILTER_VALIDATE_EMAIL)||$d['contrasena']==='')throw new DomainException('Cédula, correo y contraseña son obligatorios.');
        if($d['nombre']==='')throw new DomainException('El nombre es obligatorio.');
        PasswordRules::validar($d['contrasena']);
        // El auto-registro no elige privilegios: Administrador solo se concede desde cambios_rol. El rol tecnico
        // se puede pedir, pero queda inactivo hasta que un administrador lo revise.
        $rol=Rol::desdeCliente($d['rol'])->value();$d['rol']=$rol==='Administrador'?'Solicitante':$rol;$d['hash']=$this->hasher->hash($d['contrasena']);
        try{$id=$this->repo->crearConUsuario($d);}
        catch(\PDOException $e){
            // Cedula o correo ya tomados: misma respuesta que un alta nueva, asi el registro no sirve para saber quien existe.
            if($e->getCode()!=='23000')throw $e;
            return ['ok'=>true,'solicitud'=>['id'=>'0','cedula'=>$d['cedula']->value()]];
        }
        return ['ok'=>true,'solicitud'=>['id'=>(string)$id,'cedula'=>$d['cedula']->value()]];
    }
    public function resolver(int $id,string $estado,Cedula $admin):void
    {
        if(!in_array($estado,['Aprobado','Rechazado'],true))throw new DomainException('Se requiere un estado de resolución y un administrador válido.');
        if(!$this->repo->resolver($id,$estado,$admin))throw new DomainException('No existe una solicitud pendiente con ese identificador.',404);
    }
    private function presentar(array $f):array
    {
        $rol=$f['rol']==='Administrador'?'Usuario administrativo':($f['rol']==='Tecnico_Asistente'?'Usuario tecnico':'Usuario solicitante');
        return ['id'=>(string)$f['id_solicitud_registro'],'cedula'=>(string)$f['id_usuario_manda'],'nombreCompleto'=>trim($f['nombre'].' '.$f['apellido']),'correo'=>$f['correo_electronico'],'rol'=>$rol,'estado'=>function_exists('mb_strtolower')?mb_strtolower($f['estado_solicitud'],'UTF-8'):strtolower($f['estado_solicitud']),'revisadoPorId'=>(string)($f['id_usuario_responde']??''),'revisadoPor'=>trim(($f['responde_nombre']??'').' '.($f['responde_apellido']??''))];
    }
}
