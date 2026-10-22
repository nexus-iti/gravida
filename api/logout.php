<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
exigirMetodo(['POST']);
exigirSesion();
exigirCsrf();
segRegistrarEvento($pdo, 'logout', (string) exigirSesion()['cedula']);
segCerrarSesion();
responder(null,200,'Sesion cerrada.');
