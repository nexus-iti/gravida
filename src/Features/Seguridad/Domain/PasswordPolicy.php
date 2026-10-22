<?php
declare(strict_types=1);
namespace Nexus\Features\Seguridad\Domain;
interface PasswordPolicy{public function validar(string $password):void;}
