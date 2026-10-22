<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
exigirMetodo(['GET']);
$sesion=exigirSesion();
responder(['cedula'=>(string)$sesion['cedula'],'rol'=>(string)$sesion['rol'],'csrfToken'=>tokenCsrf()],200,'Sesion activa.');
