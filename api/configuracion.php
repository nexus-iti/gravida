<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
exigirMetodo(['GET','PUT','PATCH']);
$sesionActual=autorizarEndpoint('configuracion');
ejecutar(function() use($pdo,$sesionActual):void{
    if($_SERVER['REQUEST_METHOD']==='GET'){
        $filas=$pdo->query('SELECT clave,valor,descripcion,actualizado_en AS actualizadoEn,actualizado_por AS actualizadoPor FROM CONFIGURACION_SISTEMA ORDER BY clave')->fetchAll(PDO::FETCH_ASSOC);
        $salida=[];foreach($filas as $f)$salida[$f['clave']]=$f;responder($salida);
    }
    $d=cuerpoJson();$clave=texto($d['clave']??'',60);
    if(!in_array($clave,['dias_maximos_prestamo','registro_habilitado'],true))errorApi('Configuracion no permitida.');
    $valor=texto($d['valor']??'',255);
    if($clave==='dias_maximos_prestamo' && (!ctype_digit($valor)||(int)$valor<1||(int)$valor>365))errorApi('Los dias deben estar entre 1 y 365.');
    if($clave==='registro_habilitado'&&!in_array($valor,['0','1'],true))errorApi('Valor de registro no valido.');
    $q=$pdo->prepare('INSERT INTO CONFIGURACION_SISTEMA(clave,valor,actualizado_por) VALUES(?,?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor),actualizado_por=VALUES(actualizado_por)');
    $q->execute([$clave,$valor,$sesionActual['cedula']]);responder(['ok'=>true]);
});
