<?php
declare(strict_types=1);namespace Nexus\Features\Perfil\Domain;use Nexus\Shared\Domain\ValueObject\Cedula;interface FotoPerfilRepository{public function fotoActual(Cedula $c):?string;public function guardar(Cedula $c,string $archivo):void;}
