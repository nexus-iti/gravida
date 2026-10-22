<?php
declare(strict_types=1);
namespace Nexus\Features\Usuario\Domain;
use Nexus\Shared\Domain\ValueObject\Cedula;
interface UsuarioRepository
{
    public function listar(?Cedula $cedula,bool $soloResponsables): array;
    public function existe(Cedula $cedula): bool;
    public function crear(array $datos): void;
    public function baja(Cedula $cedula): bool;
    public function cambiarContrasena(Cedula $cedula,string $hash): void;
    public function actualizarPerfil(Cedula $cedula,array $datos): void;
    public function cambiarEstado(Cedula $cedula,string $estado): void;
    public function registroHabilitado(): bool;
}
