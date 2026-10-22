<?php
declare(strict_types=1);
namespace Nexus\Features\Incidencia\Domain;

use Nexus\Shared\Domain\ValueObject\Cedula;

interface IncidenciaRepository
{
    public function listar(Cedula $usuario, bool $puedeGestionar): array;
    public function crear(array $datos, Cedula $creador): int;
    public function existe(int $id): bool;
    public function usuarioExiste(Cedula $cedula): bool;
    public function equipoExiste(int $id): bool;
    public function baja(int $id): void;
    public function comentar(int $id, string $comentario): bool;
    public function actualizarDiagnostico(int $id, ?string $diagnostico, ?string $solucion): void;
    public function tomar(int $id, Cedula $tecnico): void;
    public function cambiarEstado(int $id, EstadoIncidencia $estado, Cedula $tecnico, string $diagnostico = '', string $solucion = ''): void;
}
