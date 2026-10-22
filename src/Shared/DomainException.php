<?php
declare(strict_types=1);
namespace Nexus\Shared;

final class DomainException extends \RuntimeException
{
    private int $httpStatus;

    public function __construct(string $message, int $httpStatus = 400)
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
    }

    public function httpStatus(): int { return $this->httpStatus; }
}
