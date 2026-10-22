<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Infrastructure;
use Nexus\Features\Seguridad\Domain\PendingTotpStore;
final class SessionPendingTotpStore implements PendingTotpStore
{
    public function guardar(string $s,int $i):void{$_SESSION['totp_nuevo']=['secreto'=>$s,'inicio'=>$i];}
    public function obtener():?array{$v=$_SESSION['totp_nuevo']??null;return is_array($v)?$v:null;}
    public function eliminar():void{unset($_SESSION['totp_nuevo']);}
}
