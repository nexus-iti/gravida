<?php
declare(strict_types=1);
namespace Nexus\Shared\Domain\ValueObject;

use Nexus\Shared\DomainException;

final class Cedula
{
    private string $value;
    public function __construct(string $value)
    {
        $this->value = preg_replace('/\D/', '', $value) ?? '';
        if ($this->value === '' || strlen($this->value) > 15) {
            throw new DomainException('La cedula no es valida.');
        }
    }
    public function value(): string { return $this->value; }
    public function equals(self $other): bool { return $this->value === $other->value; }
    public function __toString(): string { return $this->value; }
}
