<?php
declare(strict_types=1);
namespace Nexus\Shared\Domain\ValueObject;
use Nexus\Shared\DomainException;
final class Rol
{
    private string $value;
    private function __construct(string $value){$this->value=$value;}
    public static function desdeCliente(string $value): self
    {
        $normalizado=function_exists('mb_strtolower')?mb_strtolower(trim($value),'UTF-8'):strtolower(trim($value));
        if(strpos($normalizado,'admin')!==false)return new self('Administrador');
        if(strpos($normalizado,'tecn')!==false)return new self('Tecnico_Asistente');
        return new self('Solicitante');
    }
    public function value(): string{return $this->value;}
}
