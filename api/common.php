<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$config = dirname(__DIR__) . '/config.php';
if (!is_file($config)) {
    http_response_code(500);
    echo json_encode(['error' => 'Falta config.php. Copiá config.example.php a config.php y ajustá la conexión.']);
    exit;
}
require_once $config;

function responder($datos, int $estado = 200): void {
    http_response_code($estado);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function errorApi(string $mensaje, int $estado = 400): void {
    responder(['error' => $mensaje], $estado);
}

function cuerpoJson(): array {
    $cuerpo = file_get_contents('php://input');
    if ($cuerpo === false || trim($cuerpo) === '') {
        return [];
    }
    $datos = json_decode($cuerpo, true);
    if (!is_array($datos)) {
        errorApi('El cuerpo de la solicitud debe ser JSON valido.');
    }
    return $datos;
}

function exigirMetodo(array $metodos): void {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $metodos, true)) {
        header('Allow: ' . implode(', ', $metodos));
        errorApi('Metodo no permitido.', 405);
    }
}

function texto($valor, int $maximo = 65535): string {
    $limpio = trim(strip_tags((string) ($valor ?? '')));
    return function_exists('mb_substr')
        ? mb_substr($limpio, 0, $maximo, 'UTF-8')
        : substr($limpio, 0, $maximo);
}

function entero($valor, string $campo): int {
    if (filter_var($valor, FILTER_VALIDATE_INT) === false || (int) $valor < 1) {
        errorApi('El campo ' . $campo . ' debe ser un identificador valido.');
    }
    return (int) $valor;
}

function fecha($valor, string $campo, bool $opcional = false): ?string {
    $valor = texto($valor, 10);
    if ($valor === '' && $opcional) {
        return null;
    }
    $fecha = DateTime::createFromFormat('Y-m-d', $valor);
    if (!$fecha || $fecha->format('Y-m-d') !== $valor) {
        errorApi('El campo ' . $campo . ' debe tener formato AAAA-MM-DD.');
    }
    return $valor;
}

function hora($valor, string $campo): ?string {
    $valor = texto($valor, 8);
    if ($valor === '') {
        return null;
    }
    if (!preg_match('/^([01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$/', $valor)) {
        errorApi('El campo ' . $campo . ' debe tener formato HH:MM.');
    }
    return strlen($valor) === 5 ? $valor . ':00' : $valor;
}

function dividirNombre(string $nombreCompleto): array {
    $partes = preg_split('/\\s+/', texto($nombreCompleto, 161), -1, PREG_SPLIT_NO_EMPTY);
    if (!$partes) {
        errorApi('El nombre es obligatorio.');
    }
    $nombre = array_shift($partes);
    return [$nombre, implode(' ', $partes) ?: '-'];
}

function rolBase(string $rol): string {
    $rol = mb_strtolower(texto($rol, 40), 'UTF-8');
    if (str_contains($rol, 'admin')) {
        return 'Administrador';
    }
    if (str_contains($rol, 'tecn')) {
        return 'Tecnico_Asistente';
    }
    return 'Solicitante';
}

function rolCliente(string $rol): string {
    if ($rol === 'Administrador') {
        return 'Usuario administrativo';
    }
    if ($rol === 'Tecnico_Asistente') {
        return 'Usuario tecnico';
    }
    return 'Usuario solicitante';
}

function usuarioCliente(array $fila, bool $incluirContrasena = false): array {
    $fotoPerfil = '';
    if (!empty($fila['foto_perfil'])) {
        $fotoPerfil = 'uploads/perfiles/' . (string) $fila['foto_perfil'];
    }
    $usuario = [
        'id' => (string) $fila['cedula'],
        'cedula' => (string) $fila['cedula'],
        'nombreCompleto' => trim((string) $fila['nombre'] . ' ' . (string) $fila['apellido']),
        'correo' => (string) $fila['correo_electronico'],
        'rol' => rolCliente((string) $fila['rol']),
        'estadoRegistro' => (string) $fila['estado'] === 'Activo' ? 'activo' : 'inactivo',
        'descripcion' => (string) ($fila['descripcion'] ?? ''),
        'fotoPerfil' => $fotoPerfil,
        'fechaRegistro' => isset($fila['fecha_registro']) && $fila['fecha_registro'] !== null
            ? (string) $fila['fecha_registro']
            : '',
        'area' => '',
    ];
    if ($incluirContrasena && array_key_exists('contrasena', $fila)) {
        $usuario['contrasena'] = (string) $fila['contrasena'];
    }
    return $usuario;
}

function ejecutar(callable $operacion): void {
    try {
        $operacion();
    } catch (PDOException $error) {
        error_log($error->getMessage());
        if ($error->getCode() === '23000') {
            errorApi('La operacion viola una restriccion de datos relacionada.', 409);
        }
        errorApi('No se pudo completar la operacion en la base de datos.', 500);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        errorApi('No se pudo completar la solicitud.', 500);
    }
}

function estadoPrestamoBase(string $estado): string {
    return match (texto($estado, 20)) {
        'Pendiente', 'Solicitado' => 'Solicitado',
        'Aprobado', 'Activo' => 'Activo',
        'Devuelto' => 'Devuelto',
        'Denegado', 'Cancelado' => 'Cancelado',
        default => errorApi('Estado de prestamo no valido.'),
    };
}

function estadoPrestamoCliente(string $estado): string {
    return match ($estado) {
        'Solicitado' => 'Pendiente',
        'Activo' => 'Aprobado',
        'Cancelado' => 'Denegado',
        default => $estado,
    };
}

function estadoIncidenciaBase(string $estado): string {
    return match (texto($estado, 20)) {
        'Pendiente' => 'Pendiente',
        'En revision', 'En proceso' => 'En proceso',
        'Resuelto' => 'Resuelto',
        
        'Denegado', 'Cerrado' => 'Cerrado',
        default => errorApi('Estado de incidencia no valido.'),
    };
}

function estadoIncidenciaCliente(string $estado): string {
    return match ($estado) {
        'En proceso' => 'En revision',
        'Cerrado' => 'Denegado',
        default => $estado,
    };
}

function estadoServicioBase(string $estado): string {
    return match (texto($estado, 20)) {
        'Pendiente' => 'Pendiente',
        'En proceso' => 'En proceso',
        'Completado', 'Finalizado' => 'Finalizado',
        'Denegado', 'Cancelado' => 'Cancelado',
        default => errorApi('Estado de servicio no valido.'),
    };
}

function estadoServicioCliente(string $estado): string {
    return match ($estado) {
        'Finalizado' => 'Completado',
        'Cancelado' => 'Denegado',
        default => $estado,
    };
}
