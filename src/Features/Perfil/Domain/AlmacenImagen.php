<?php
declare(strict_types=1);namespace Nexus\Features\Perfil\Domain;interface AlmacenImagen{public function almacenar(array $archivo):string;public function eliminarAnterior(?string $archivo):void;}
