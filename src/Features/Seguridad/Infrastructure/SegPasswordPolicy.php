<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Infrastructure;
use Nexus\Features\Seguridad\Domain\PasswordPolicy;
final class SegPasswordPolicy implements PasswordPolicy{public function validar(string $p):void{segValidarContrasenaNueva($p);}}
