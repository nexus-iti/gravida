<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Domain;
interface TotpProvider{public function generar():string;public function uri(string $secreto,string $cuenta):string;public function verificar(string $secreto,string $codigo,?int $ultimoPaso):?int;}
