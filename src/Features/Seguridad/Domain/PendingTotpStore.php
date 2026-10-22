<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Domain;
interface PendingTotpStore{public function guardar(string $secreto,int $inicio):void;public function obtener():?array;public function eliminar():void;}
