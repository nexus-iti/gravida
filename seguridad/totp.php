<?php
declare(strict_types=1);

/*
 * F-08 (3ra entrega): segundo factor TOTP (RFC 6238), el mismo que usan Google Authenticator,
 * Microsoft Authenticator o Authy. Codigos de 6 digitos que cambian cada 30 segundos.
 * Si un usuario cae en un phishing y entrega su contrasena, el atacante igual necesita el telefono.
 */

const TOTP_PERIODO = 30;
const TOTP_DIGITOS = 6;
const TOTP_TOLERANCIA = 1; // acepta el codigo anterior y el siguiente (relojes desfasados hasta 30 s)
const TOTP_ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function totpBase32Codificar(string $binario): string {
    $bits = '';
    foreach (str_split($binario) as $byte) {
        $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
    }
    $salida = '';
    foreach (str_split($bits, 5) as $grupo) {
        $salida .= TOTP_ALFABETO[bindec(str_pad($grupo, 5, '0'))];
    }
    return $salida;
}

function totpBase32Decodificar(string $texto): string {
    $texto = strtoupper(preg_replace('/[\s=-]/', '', $texto));
    $bits = '';
    foreach (str_split($texto) as $caracter) {
        $valor = strpos(TOTP_ALFABETO, $caracter);
        if ($valor === false) {
            return '';
        }
        $bits .= str_pad(decbin($valor), 5, '0', STR_PAD_LEFT);
    }
    $binario = '';
    foreach (str_split($bits, 8) as $byte) {
        if (strlen($byte) === 8) {
            $binario .= chr(bindec($byte));
        }
    }
    return $binario;
}

function totpGenerarSecreto(): string {
    return totpBase32Codificar(random_bytes(20)); // 160 bits, lo que recomienda el RFC 4226
}

function totpCodigo(string $secreto, int $paso): string {
    $clave = totpBase32Decodificar($secreto);
    $hmac = hash_hmac('sha1', pack('J', $paso), $clave, true);
    $desplazamiento = ord($hmac[19]) & 0x0F;
    $numero = ((ord($hmac[$desplazamiento]) & 0x7F) << 24)
        | (ord($hmac[$desplazamiento + 1]) << 16)
        | (ord($hmac[$desplazamiento + 2]) << 8)
        | ord($hmac[$desplazamiento + 3]);
    return str_pad((string) ($numero % (10 ** TOTP_DIGITOS)), TOTP_DIGITOS, '0', STR_PAD_LEFT);
}

/**
 * Devuelve el paso de tiempo que coincidio, o null. Un paso ya usado (o anterior) se rechaza:
 * asi un codigo interceptado por un sitio de phishing no se puede reutilizar.
 */
function totpVerificar(string $secreto, string $codigo, ?int $ultimoPasoUsado, ?int $ahora = null): ?int {
    $codigo = preg_replace('/\D/', '', $codigo);
    if (strlen($codigo) !== TOTP_DIGITOS || totpBase32Decodificar($secreto) === '') {
        return null;
    }
    $pasoActual = intdiv($ahora ?? time(), TOTP_PERIODO);
    for ($desvio = -TOTP_TOLERANCIA; $desvio <= TOTP_TOLERANCIA; $desvio++) {
        $paso = $pasoActual + $desvio;
        if ($ultimoPasoUsado !== null && $paso <= $ultimoPasoUsado) {
            continue;
        }
        if (hash_equals(totpCodigo($secreto, $paso), $codigo)) {
            return $paso;
        }
    }
    return null;
}

function totpUri(string $secreto, string $cuenta): string {
    return 'otpauth://totp/' . rawurlencode('SGRSI:' . $cuenta)
        . '?secret=' . $secreto . '&issuer=SGRSI&algorithm=SHA1&digits=' . TOTP_DIGITOS . '&period=' . TOTP_PERIODO;
}
