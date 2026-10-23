<?php
declare(strict_types=1);
namespace Nexus\Shared\Security;

use Nexus\Shared\DomainException;

/*
 * Politica unica de contraseñas nuevas. La usan todos los caminos que fijan una clave:
 * cambio desde Cuenta, cambio obligatorio tras una recuperacion, registro publico y alta
 * por un administrador. Validar solo en el navegador deja el servidor abierto a cualquier
 * cliente que llame a la API directamente.
 */
final class PasswordRules
{
    public const MENSAJE = 'La contraseña necesita entre 8 y 128 caracteres, una mayúscula, una minúscula y un número.';
    public const MENSAJE_COMUN = 'Esa contraseña es demasiado comun. Elegí otra.';

    private const LARGO_MINIMO = 8;
    private const LARGO_MAXIMO = 128;
    private const COMUNES = ['Password1', 'Contrasena1', 'Qwerty123', 'Abc12345', 'Admin123', 'Welcome1', 'Iloveyou1', 'Usuario1', 'Cept2026', 'Nexus123'];

    /** Mensaje del primer incumplimiento, o null si la contraseña es aceptable. */
    public static function error(string $password): ?string
    {
        if (PasswordCharset::contieneEnie($password)) {
            return PasswordCharset::MENSAJE;
        }
        $largo = function_exists('mb_strlen') ? mb_strlen($password, 'UTF-8') : strlen($password);
        if ($largo < self::LARGO_MINIMO || $largo > self::LARGO_MAXIMO
            || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/\d/', $password)) {
            return self::MENSAJE;
        }
        foreach (self::COMUNES as $comun) {
            if (strcasecmp($password, $comun) === 0) {
                return self::MENSAJE_COMUN;
            }
        }
        return null;
    }

    public static function validar(string $password): void
    {
        $error = self::error($password);
        if ($error !== null) {
            throw new DomainException($error);
        }
    }
}
