<?php
declare(strict_types=1);
namespace Nexus\Shared\Security;

/*
 * La Ñ no se admite en contraseñas: segun el dispositivo se escribe precompuesta
 * (U+00D1/U+00F1) o como N/n + tilde combinante (U+0303), y los bytes distintos
 * producen hashes distintos para la misma clave tipeada.
 */
final class PasswordCharset
{
    public const MENSAJE = 'La contraseña no puede contener la letra Ñ.';

    public static function contieneEnie(string $password): bool
    {
        return preg_match('/[\x{00D1}\x{00F1}]|[Nn]\x{0303}/u', $password) === 1;
    }
}
