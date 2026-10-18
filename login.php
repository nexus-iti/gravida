<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/config.php';
$identificador=trim($_POST['identificador']??'');$contrasena=trim($_POST['contrasena']??'');
if($identificador===''||$contrasena===''){http_response_code(400);echo json_encode(['error'=>'Faltan datos']);exit;}
$campo=filter_var($identificador,FILTER_VALIDATE_EMAIL)?'correo_electronico':'cedula';
$q=$pdo->prepare("SELECT cedula,nombre,apellido,contrasena,estado,rol,debe_cambiar_contrasena FROM USUARIO WHERE $campo=? AND esta_activo=1");$q->execute([$identificador]);$u=$q->fetch(PDO::FETCH_ASSOC);
if(!$u||!hash_equals((string)$u['contrasena'],$contrasena)){http_response_code(401);echo json_encode(['error'=>'Usuario o contraseña incorrectos']);exit;}
if($u['estado']!=='Activo'){http_response_code(403);echo json_encode(['error'=>'Usuario inactivo']);exit;}
echo json_encode(['cedula'=>$u['cedula'],'nombre'=>$u['nombre'],'apellido'=>$u['apellido'],'rol'=>$u['rol'],'debeCambiarContrasena'=>(bool)$u['debe_cambiar_contrasena']]);
