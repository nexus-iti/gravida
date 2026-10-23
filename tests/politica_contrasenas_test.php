<?php
declare(strict_types=1);

use Nexus\Features\SolicitudRegistro\Application\SolicitudRegistroService;
use Nexus\Features\Usuario\Application\UsuarioService;
use Nexus\Shared\Domain\ValueObject\Cedula;
use Nexus\Shared\Security\PasswordRules;

/* Contraseñas que el servidor debe rechazar en cualquier camino que fije una clave. */
const CLAVES_DEBILES = [
    'corta (7 caracteres)' => 'Ab1cdef',
    'solo digitos' => '12345678',
    'sin numero' => 'Abcdefgh',
    'sin mayuscula' => 'abcdefg1',
    'sin minuscula' => 'ABCDEFG1',
    'solo minusculas' => 'contrasena',
    'con enie' => 'Contraseña1',
    'comun' => 'Password1',
    'mas de 128 caracteres' => 'Aa1' . 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
];
const CLAVE_FUERTE = 'Segura2026x';

function datosAlta(string $clave, string $rol = 'Solicitante'): array
{
    return [
        'cedula' => new Cedula('51234567'), 'nombre' => 'Ana', 'apellido' => 'Perez',
        'correo' => 'ana@example.test', 'contrasena' => $clave, 'rol' => $rol, 'estado' => 'Activo',
    ];
}

/* ---- PasswordRules ---- */

prueba('PasswordRules acepta una clave fuerte', function () {
    afirmarIgual(null, PasswordRules::error(CLAVE_FUERTE));
});

foreach (CLAVES_DEBILES as $motivo => $clave) {
    prueba("PasswordRules rechaza: $motivo", function () use ($clave) {
        afirmar(PasswordRules::error($clave) !== null, 'se acepto una clave debil');
    });
}

prueba('PasswordRules acepta 8 y 128 caracteres exactos', function () {
    afirmarIgual(null, PasswordRules::error('Abcdef1x'));
    afirmarIgual(null, PasswordRules::error('Aa1' . str_repeat('x', 125)));
});

/* ---- Cambio obligatorio tras una recuperacion (UsuarioService::cambiarContrasena) ---- */

foreach (CLAVES_DEBILES as $motivo => $clave) {
    prueba("cambio obligatorio rechaza: $motivo y no toca el hash", function () use ($clave, $motivo) {
        $repo = (new UsuarioEnMemoria())->conUsuario('90000004');
        $servicio = new UsuarioService($repo);
        afirmarRechazo(fn () => $servicio->cambiarContrasena(new Cedula('90000004'), $clave), $motivo);
        afirmarIgual('hash:Inicial2026', $repo->filas['90000004']['contrasena'], 'el hash cambio pese al rechazo');
    });
}

prueba('cambio obligatorio acepta una clave fuerte y guarda su hash', function () {
    $repo = (new UsuarioEnMemoria())->conUsuario('90000004');
    (new UsuarioService($repo))->cambiarContrasena(new Cedula('90000004'), CLAVE_FUERTE);
    afirmar(password_verify(CLAVE_FUERTE, $repo->filas['90000004']['contrasena']), 'el hash guardado no corresponde a la clave');
});

prueba('cambio obligatorio sigue exigiendo que el usuario exista', function () {
    $servicio = new UsuarioService(new UsuarioEnMemoria());
    afirmarRechazo(fn () => $servicio->cambiarContrasena(new Cedula('90000004'), CLAVE_FUERTE), 'usuario inexistente', 404);
});

/* ---- Alta por administrador (UsuarioService::crear) ---- */

foreach (CLAVES_DEBILES as $motivo => $clave) {
    prueba("alta por administrador rechaza: $motivo", function () use ($clave, $motivo) {
        $repo = new UsuarioEnMemoria();
        afirmarRechazo(fn () => (new UsuarioService($repo))->crear(datosAlta($clave)), $motivo);
        afirmarIgual([], $repo->filas, 'se creo la cuenta pese al rechazo');
    });
}

prueba('alta por administrador acepta una clave fuerte', function () {
    $repo = new UsuarioEnMemoria();
    (new UsuarioService($repo))->crear(datosAlta(CLAVE_FUERTE));
    afirmarIgual(1, count($repo->filas));
});

/* ---- Registro publico (SolicitudRegistroService::crear) ---- */

foreach (CLAVES_DEBILES as $motivo => $clave) {
    prueba("registro publico rechaza: $motivo", function () use ($clave, $motivo) {
        $repo = new RegistroEnMemoria();
        $servicio = new SolicitudRegistroService($repo, new HasherFalso());
        afirmarRechazo(fn () => $servicio->crear(datosAlta($clave)), $motivo);
        afirmarIgual([], $repo->usuarios, 'se creo la solicitud pese al rechazo');
    });
}

prueba('registro publico acepta una clave fuerte y guarda solo el hash', function () {
    $repo = new RegistroEnMemoria();
    (new SolicitudRegistroService($repo, new HasherFalso()))->crear(datosAlta(CLAVE_FUERTE));
    afirmarIgual(1, count($repo->usuarios));
    afirmarIgual('hash:' . CLAVE_FUERTE, $repo->usuarios[0]['hash']);
});

/* ---- El registro publico no concede Administrador ---- */

foreach (['Administrador', 'administrador', ' ADMIN ', 'Usuario administrativo'] as $rol) {
    prueba("registro publico con rol \"$rol\" queda como Solicitante", function () use ($rol) {
        $repo = new RegistroEnMemoria();
        (new SolicitudRegistroService($repo, new HasherFalso()))->crear(datosAlta(CLAVE_FUERTE, $rol));
        afirmarIgual('Solicitante', $repo->usuarios[0]['rol']);
    });
}

prueba('registro publico conserva el rol Tecnico (lo revisa un administrador)', function () {
    $repo = new RegistroEnMemoria();
    (new SolicitudRegistroService($repo, new HasherFalso()))->crear(datosAlta(CLAVE_FUERTE, 'Usuario tecnico'));
    afirmarIgual('Tecnico_Asistente', $repo->usuarios[0]['rol']);
});
