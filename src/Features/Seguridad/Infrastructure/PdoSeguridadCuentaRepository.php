<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Infrastructure;
use Nexus\Features\Seguridad\Domain\SeguridadCuentaRepository;use Nexus\Shared\Domain\ValueObject\Cedula;
final class PdoSeguridadCuentaRepository implements SeguridadCuentaRepository
{
    private \PDO $pdo;public function __construct(\PDO $pdo){$this->pdo=$pdo;}
    public function segundoFactor(Cedula $c):array{$q=$this->pdo->prepare('SELECT totp_secreto,totp_ultimo_paso FROM USUARIO WHERE cedula=?');$q->execute([$c->value()]);return $q->fetch(\PDO::FETCH_ASSOC)?:['totp_secreto'=>null,'totp_ultimo_paso'=>null];}
    public function passwordHash(Cedula $c):string{$q=$this->pdo->prepare('SELECT contrasena FROM USUARIO WHERE cedula=?');$q->execute([$c->value()]);return (string)$q->fetchColumn();}
    public function actividad(Cedula $c,array $tipos,int $limite):array{$m=implode(',',array_fill(0,count($tipos),'?'));$q=$this->pdo->prepare("SELECT fecha,tipo,ip,agente FROM seguridad_eventos WHERE cedula=? AND tipo IN ($m) ORDER BY id DESC LIMIT ".max(1,$limite));$q->execute(array_merge([$c->value()],$tipos));return $q->fetchAll(\PDO::FETCH_ASSOC);}
    public function activarTotp(Cedula $c,string $s,int $p):void{$q=$this->pdo->prepare('UPDATE USUARIO SET totp_secreto=?,totp_ultimo_paso=? WHERE cedula=?');$q->execute([$s,$p,$c->value()]);}
    public function actualizarPaso(Cedula $c,int $p):void{$q=$this->pdo->prepare('UPDATE USUARIO SET totp_ultimo_paso=? WHERE cedula=?');$q->execute([$p,$c->value()]);}
    public function desactivarTotp(Cedula $c):void{$q=$this->pdo->prepare('UPDATE USUARIO SET totp_secreto=NULL,totp_ultimo_paso=NULL WHERE cedula=?');$q->execute([$c->value()]);}
    public function usuarioExiste(Cedula $c):bool{$q=$this->pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula=?');$q->execute([$c->value()]);return (bool)$q->fetchColumn();}
    public function restablecerTotp(Cedula $c):void{$q=$this->pdo->prepare('UPDATE USUARIO SET totp_secreto=NULL,totp_ultimo_paso=NULL,sesion_version=sesion_version+1 WHERE cedula=?');$q->execute([$c->value()]);}
    public function incrementarVersion(Cedula $c):int{$q=$this->pdo->prepare('UPDATE USUARIO SET sesion_version=sesion_version+1 WHERE cedula=?');$q->execute([$c->value()]);$q=$this->pdo->prepare('SELECT sesion_version FROM USUARIO WHERE cedula=?');$q->execute([$c->value()]);return (int)$q->fetchColumn();}
    public function cambiarPassword(Cedula $c,string $h):void{$q=$this->pdo->prepare('UPDATE USUARIO SET contrasena=? WHERE cedula=?');$q->execute([$h,$c->value()]);}
    public function registrarEvento(string $t,Cedula $c,string $d=''):void{segRegistrarEvento($this->pdo,$t,$c->value(),$d);}
}
