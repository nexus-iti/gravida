<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Infrastructure;
use Nexus\Shared\Security\PasswordHasher;
final class SegPasswordHasher implements PasswordHasher
{
    public function hash(string $plain):string{return segHashContrasena($plain);}
    public function verify(string $plain,string $hash):bool{return segEsHash($hash)&&password_verify($plain,$hash);}
}
