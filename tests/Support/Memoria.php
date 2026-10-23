<?php
declare(strict_types=1);

use Nexus\Features\SolicitudRegistro\Domain\SolicitudRegistroRepository;
use Nexus\Features\Usuario\Domain\UsuarioRepository;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\Security\PasswordHasher;

/** Hash reversible: alcanza para comprobar que se guarda el hash y no el texto plano. */
final class HasherFalso implements PasswordHasher
{
    public function hash(string $plain): string { return 'hash:' . $plain; }
    public function verify(string $plain, string $hash): bool { return $hash === 'hash:' . $plain; }
}

final class UsuarioEnMemoria implements UsuarioRepository
{
    /** @var array<string,array> cedula => fila */
    public array $filas = [];
    public bool $registroHabilitado = true;

    public function conUsuario(string $cedula, string $hash = 'hash:Inicial2026'): self
    {
        $this->filas[$cedula] = ['cedula' => $cedula, 'contrasena' => $hash, 'estado' => 'Activo'];
        return $this;
    }
    public function listar(?Cedula $cedula, bool $soloResponsables): array { return array_values($this->filas); }
    public function existe(Cedula $cedula): bool { return isset($this->filas[$cedula->value()]); }
    public function crear(array $datos): void
    {
        $this->filas[$datos['cedula']->value()] = [
            'cedula' => $datos['cedula']->value(), 'contrasena' => $datos['hash'], 'rol' => $datos['rol'], 'estado' => $datos['estado'],
        ];
    }
    public function baja(Cedula $cedula): bool { return $this->existe($cedula); }
    public function cambiarContrasena(Cedula $cedula, string $hash): int
    {
        $this->filas[$cedula->value()]['contrasena'] = $hash;
        return 1;
    }
    public function actualizarPerfil(Cedula $cedula, array $datos): void {}
    public function cambiarEstado(Cedula $cedula, string $estado): void {}
    public function registroHabilitado(): bool { return $this->registroHabilitado; }
}

final class RegistroEnMemoria implements SolicitudRegistroRepository
{
    /** @var array<int,array> */
    public array $usuarios = [];
    public bool $registroHabilitado = true;

    public function listar(): array { return []; }
    public function registroHabilitado(): bool { return $this->registroHabilitado; }
    public function crearConUsuario(array $usuario): int
    {
        $this->usuarios[] = $usuario;
        return count($this->usuarios);
    }
    public function resolver(int $id, string $estado, Cedula $administrador): bool { return true; }
}
