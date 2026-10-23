<?php
declare(strict_types=1);
use Nexus\Features\Seguridad\Application\SeguridadCuentaService;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Features\Seguridad\Infrastructure\PdoSeguridadCuentaRepository;use Nexus\Features\Seguridad\Infrastructure\NativeTotpProvider;use Nexus\Features\Seguridad\Infrastructure\SegPasswordHasher;use Nexus\Features\Seguridad\Infrastructure\SegPasswordPolicy;use Nexus\Features\Seguridad\Infrastructure\SessionPendingTotpStore;use Nexus\Shared\DomainException;
require_once __DIR__.'/common.php';exigirMetodo(['GET','POST']);
$servicio=new SeguridadCuentaService(new PdoSeguridadCuentaRepository($pdo),new SegPasswordHasher(),new SegPasswordPolicy(),new NativeTotpProvider(),new SessionPendingTotpStore());
ejecutar(function()use($servicio):void{
    $actual=segExigirRol(SEG_TODOS);$cedula=new Cedula((string)$actual['cedula']);$admin=$actual['rol']==='Administrador';
    if($_SERVER['REQUEST_METHOD']==='GET')responder($servicio->estado($cedula,$admin,SEG_2FA_OBLIGATORIO_ADMIN));
    exigirCsrf();$d=cuerpoJson();$accion=texto($d['accion']??'',30);segLimitarPeticiones('cuenta-'.$cedula->value(),10,900,true);
    if($accion==='iniciar_2fa')responder($servicio->iniciar($cedula,(string)($d['contrasena']??'')));
    if($accion==='confirmar_2fa'){$servicio->confirmar($cedula,(string)($d['codigo']??''),(string)($d['codigoActual']??''));responder(['ok'=>true]);}
    if($accion==='desactivar_2fa'){$servicio->desactivar($cedula,(string)($d['contrasena']??''),(string)($d['codigo']??''),$admin&&SEG_2FA_OBLIGATORIO_ADMIN);responder(['ok'=>true]);}
    if($accion==='restablecer_2fa'){if(!$admin)throw new DomainException('No tenes permisos para realizar esta operacion.',403);$servicio->restablecer($cedula,new Cedula(texto($d['cedula']??'',15)));responder(['ok'=>true]);}
    if($accion==='cerrar_sesiones'){$version=$servicio->cerrarSesiones($cedula);actualizarSesion($version);responder(['ok'=>true,'csrf'=>segCsrf()]);}
    if($accion==='cambiar_contrasena'){$version=$servicio->cambiarPassword($cedula,(string)($d['actual']??''),(string)($d['nueva']??''));actualizarSesion($version);responder(['ok'=>true,'csrf'=>segCsrf()]);}
    throw new DomainException('Accion no reconocida.');
});
function actualizarSesion(int $version):void{$_SESSION['usuario']['version']=$version;session_regenerate_id(true);segReenviarCookie();}
