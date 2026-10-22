<?php
declare(strict_types=1);
namespace Nexus\Features\Usuario\Application;
use Nexus\Features\Usuario\Domain\UsuarioRepository;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\Domain\ValueObject\Rol;
use Nexus\Shared\DomainException;
use Nexus\Shared\Security\PasswordCharset;
final class UsuarioService
{
    private UsuarioRepository $repo;
    public function __construct(UsuarioRepository $repo){$this->repo=$repo;}
    public function listar(?Cedula $cedula,bool $responsables): array{return array_map([$this,'presentar'],$this->repo->listar($cedula,$responsables));}
    public function crear(array $d): array
    {
        if(!$this->repo->registroHabilitado())throw new DomainException('El registro de nuevas cuentas esta temporalmente deshabilitado.',403);
        if(!filter_var($d['correo'],FILTER_VALIDATE_EMAIL)||$d['contrasena']==='')throw new DomainException('Cedula, correo y contrasena son obligatorios.');
        if(trim($d['nombre'])==='')throw new DomainException('El nombre es obligatorio.');
        $this->validarCaracteres($d['contrasena']);
        $d['hash']=password_hash($d['contrasena'],PASSWORD_DEFAULT);$d['estado']=$d['estado']==='Inactivo'?'Inactivo':'Activo';$d['rol']=Rol::desdeCliente($d['rol'])->value();
        $this->repo->crear($d);
        return $this->presentar(['cedula'=>$d['cedula']->value(),'nombre'=>$d['nombre'],'apellido'=>$d['apellido'],'correo_electronico'=>$d['correo'],'estado'=>$d['estado'],'rol'=>$d['rol'],'descripcion'=>'','fecha_registro'=>date('Y-m-d'),'foto_perfil'=>'','debe_cambiar_contrasena'=>0]);
    }
    public function baja(Cedula $c): void{if(!$this->repo->baja($c))throw new DomainException('No existe la cuenta activa indicada.',404);}
    public function cambiarContrasena(Cedula $c,string $clave): void{if(strlen($clave)<7)throw new DomainException('La contraseña debe tener al menos 7 caracteres.');$this->validarCaracteres($clave);$this->exigir($c);$this->repo->cambiarContrasena($c,password_hash($clave,PASSWORD_DEFAULT));}
    public function actualizarPerfil(Cedula $c,array $d): void{if(!filter_var($d['correo'],FILTER_VALIDATE_EMAIL))throw new DomainException('El correo no es valido.');$this->exigir($c);$this->repo->actualizarPerfil($c,$d);}
    public function cambiarEstado(Cedula $c,string $estado): void{$this->exigir($c);$this->repo->cambiarEstado($c,$estado==='Inactivo'?'Inactivo':'Activo');}
    private function validarCaracteres(string $clave): void{if(PasswordCharset::contieneEnie($clave))throw new DomainException(PasswordCharset::MENSAJE);}
    private function exigir(Cedula $c): void{if(!$this->repo->existe($c))throw new DomainException('No existe el usuario indicado.',404);}
    private function presentar(array $f): array
    {
        $rol=$f['rol']==='Tecnico_Asistente'?'Técnico/Asistente':$f['rol'];
        $foto=!empty($f['foto_perfil'])?'uploads/perfiles/'.(string)$f['foto_perfil']:'';
        return ['id'=>(string)$f['cedula'],'cedula'=>(string)$f['cedula'],'nombreCompleto'=>trim($f['nombre'].' '.$f['apellido']),'correo'=>$f['correo_electronico'],'rol'=>$rol,'estadoRegistro'=>$f['estado']==='Activo'?'activo':'inactivo','descripcion'=>$f['descripcion']??'','fotoPerfil'=>$foto,'fechaRegistro'=>(string)($f['fecha_registro']??''),'area'=>'','debeCambiarContrasena'=>!empty($f['debe_cambiar_contrasena'])];
    }
}
