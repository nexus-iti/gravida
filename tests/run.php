<?php
declare(strict_types=1);

/*
 * Pruebas sin dependencias: `php tests/run.php`. Cada tests/*_test.php registra casos con prueba()
 * y usa repositorios en memoria (tests/Support), asi que no necesitan base de datos.
 * Salida distinta de 0 si algun caso falla.
 */

require_once __DIR__ . '/../src/autoload.php';
require_once __DIR__ . '/Support/Memoria.php';

$GLOBALS['casos'] = [];

function prueba(string $nombre, callable $caso): void
{
    $GLOBALS['casos'][] = [$nombre, $caso];
}

function afirmar(bool $condicion, string $mensaje = 'la condicion no se cumple'): void
{
    if (!$condicion) {
        throw new RuntimeException($mensaje);
    }
}

function afirmarIgual($esperado, $obtenido, string $contexto = ''): void
{
    if ($esperado !== $obtenido) {
        throw new RuntimeException(sprintf(
            '%sesperado %s, obtenido %s',
            $contexto === '' ? '' : $contexto . ': ',
            var_export($esperado, true),
            var_export($obtenido, true)
        ));
    }
}

/** Ejecuta $accion y exige que lance DomainException (con http $estado si se indica). */
function afirmarRechazo(callable $accion, string $contexto = '', int $estado = 400): void
{
    try {
        $accion();
    } catch (Nexus\Shared\DomainException $e) {
        afirmarIgual($estado, $e->httpStatus(), $contexto . ' (estado HTTP)');
        return;
    }
    throw new RuntimeException($contexto . ': deberia haberse rechazado y se acepto');
}

foreach (glob(__DIR__ . '/*_test.php') ?: [] as $archivo) {
    require $archivo;
}

$fallos = 0;
foreach ($GLOBALS['casos'] as [$nombre, $caso]) {
    try {
        $caso();
        echo "ok    $nombre\n";
    } catch (Throwable $e) {
        $fallos++;
        echo "FALLA $nombre\n      " . $e->getMessage() . "\n";
    }
}
echo sprintf("\n%d casos, %d fallas\n", count($GLOBALS['casos']), $fallos);
exit($fallos === 0 ? 0 : 1);
