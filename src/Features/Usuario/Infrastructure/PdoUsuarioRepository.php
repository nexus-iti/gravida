<?php
declare(strict_types=1);
namespace Nexus\Features\Usuario\Infrastructure;
use Nexus\Features\Usuario\Domain\UsuarioRepository;
use Nexus\Shared\Domain\ValueObject\Cedula;
final class PdoUsuarioRepository implements UsuarioRepository
{
    private \PDO $pdo;
    public function __construct(\PDO $pdo){$this->pdo=$pdo;}
    public function listar(?Cedula $cedula,bool $soloResponsables): array
    {
        $sql='SELECT cedula,nombre,apellido,correo_electronico,estado,rol,descripcion,fecha_registro,foto_perfil,debe_cambiar_contrasena FROM USUARIO WHERE esta_activo=1';$p=[];
        if($cedula){$sql.=' AND cedula=?';$p[]=$cedula->value();}
        if($soloResponsables)$sql.=" AND estado='Activo' AND rol IN ('Tecnico_Asistente','Administrador')";
        $sql.=' ORDER BY nombre,apellido';$q=$this->pdo->prepare($sql);$q->execute($p);return $q->fetchAll(\PDO::FETCH_ASSOC);
    }
    public function existe(Cedula $c): bool{$q=$this->pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula=?');$q->execute([$c->value()]);return (bool)$q->fetchColumn();}
    public function crear(array $d): void{$q=$this->pdo->prepare('INSERT INTO USUARIO(cedula,nombre,apellido,correo_electronico,contrasena,estado,rol,fecha_registro) VALUES(?,?,?,?,?,?,?,CURDATE())');$q->execute([$d['cedula']->value(),$d['nombre'],$d['apellido'],$d['correo'],$d['hash'],$d['estado'],$d['rol']]);}
    public function baja(Cedula $c): bool{$q=$this->pdo->prepare("UPDATE USUARIO SET esta_activo=0,estado='Inactivo' WHERE cedula=? AND esta_activo=1");$q->execute([$c->value()]);return $q->rowCount()===1;}
    public function cambiarContrasena(Cedula $c,string $h): void{$q=$this->pdo->prepare('UPDATE USUARIO SET contrasena=?,debe_cambiar_contrasena=0 WHERE cedula=?');$q->execute([$h,$c->value()]);}
    public function actualizarPerfil(Cedula $c,array $d): void{$q=$this->pdo->prepare('UPDATE USUARIO SET nombre=?,apellido=?,correo_electronico=?,descripcion=? WHERE cedula=?');$q->execute([$d['nombre'],$d['apellido'],$d['correo'],$d['descripcion'],$c->value()]);}
    public function cambiarEstado(Cedula $c,string $e): void{$q=$this->pdo->prepare('UPDATE USUARIO SET estado=? WHERE cedula=?');$q->execute([$e,$c->value()]);}
    public function registroHabilitado(): bool{$v=$this->pdo->query("SELECT valor FROM CONFIGURACION_SISTEMA WHERE clave='registro_habilitado'")->fetchColumn();return $v===false||$v==='1';}
}
