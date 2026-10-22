<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Infrastructure;
use Nexus\Features\Seguridad\Domain\TotpProvider;
final class NativeTotpProvider implements TotpProvider
{
    public function generar():string{return totpGenerarSecreto();}
    public function uri(string $s,string $c):string{return totpUri($s,$c);}
    public function verificar(string $s,string $c,?int $u):?int{return totpVerificar($s,$c,$u);}
}
