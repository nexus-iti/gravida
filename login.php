<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','samesite'=>'Lax','path'=>'/']);
    session_start();
}
function salidaLogin(string $status, string $message, $data, int $code): never {
    http_response_code($code);
    echo json_encode(compact('status','message','data'), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    salidaLogin('error','Metodo no permitido.',null,405);
}
require __DIR__ . '/config.php';
$identificador=trim((string)($_POST['identificador']??''));
$contrasena=(string)($_POST['contrasena']??'');
if($identificador===''||$contrasena==='') salidaLogin('error','Faltan datos.',null,400);
$campo=filter_var($identificador,FILTER_VALIDATE_EMAIL)?'correo_electronico':'cedula';
$q=$pdo->prepare("SELECT cedula,nombre,apellido,contrasena,estado,rol,debe_cambiar_contrasena FROM USUARIO WHERE $campo=? AND esta_activo=1");
$q->execute([$identificador]);
$u=$q->fetch(PDO::FETCH_ASSOC);
$valida=false;$migrar=false;
if($u){
    $hash=(string)$u['contrasena'];$info=password_get_info($hash);
    if(($info['algoName']??'unknown')!=='unknown'){
        $valida=password_verify($contrasena,$hash);
        $migrar=$valida&&password_needs_rehash($hash,PASSWORD_DEFAULT);
    }else{$valida=hash_equals($hash,$contrasena);$migrar=$valida;}
}
if(!$u||!$valida) salidaLogin('error','Usuario o contraseña incorrectos.',null,401);
if($u['estado']!=='Activo') salidaLogin('error','Usuario inactivo.',null,403);
if($migrar){$up=$pdo->prepare('UPDATE USUARIO SET contrasena=? WHERE cedula=?');$up->execute([password_hash($contrasena,PASSWORD_DEFAULT),$u['cedula']]);}
session_regenerate_id(true);
$_SESSION['usuario']=['cedula'=>(string)$u['cedula'],'rol'=>(string)$u['rol']];
$_SESSION['csrf']=bin2hex(random_bytes(32));
salidaLogin('success','Sesion iniciada.',[
    'cedula'=>(string)$u['cedula'],'nombre'=>(string)$u['nombre'],'apellido'=>(string)$u['apellido'],
    'rol'=>(string)$u['rol'],'debeCambiarContrasena'=>(bool)$u['debe_cambiar_contrasena'],'csrfToken'=>(string)$_SESSION['csrf'],
],200);
