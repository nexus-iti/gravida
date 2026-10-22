<?php
declare(strict_types=1);
namespace Nexus\Shared\Security;
interface PasswordHasher{public function hash(string $plain):string;public function verify(string $plain,string $hash):bool;}
