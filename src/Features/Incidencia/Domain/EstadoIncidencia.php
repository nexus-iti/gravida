<?php
declare(strict_types=1);
namespace Nexus\Features\Incidencia\Domain;
use Nexus\Shared\DomainException;
final class EstadoIncidencia
{
    private const PENDIENTE='Pendiente'; private const EN_PROCESO='En proceso'; private const RESUELTO='Resuelto'; private const CERRADO='Cerrado';
    private string $value;
    private function __construct(string $value) {$this->value=$value;}
    public static function desdeCliente(string $value): self {return new self(match(trim($value)){'Pendiente'=>self::PENDIENTE,'En revision','En proceso'=>self::EN_PROCESO,'Resuelto'=>self::RESUELTO,'Denegado','Cerrado'=>self::CERRADO,default=>throw new DomainException('Estado de incidencia no válido.'),});}
    public function value(): string {return $this->value;}
    public function esFinal(): bool {return in_array($this->value,[self::RESUELTO,self::CERRADO],true);}
}
