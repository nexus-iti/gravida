<?php
declare(strict_types=1);
namespace Nexus\Features\Perfil\Infrastructure;
use Nexus\Features\Perfil\Domain\AlmacenImagen;use Nexus\Shared\DomainException;
final class GdAlmacenImagen implements AlmacenImagen
{
    private string $directorio;public function __construct(string $d){$this->directorio=$d;}
    public function almacenar(array $a):string
    {
        $tmp=(string)($a['tmp_name']??'');if(($a['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK||!is_uploaded_file($tmp))throw new DomainException('No se pudo recibir el archivo de foto.');if(($a['size']??0)>2*1024*1024)throw new DomainException('La foto no puede superar 2 MB.');$info=getimagesize($tmp);if($info===false||($info[0]??0)<1||($info[1]??0)<1)throw new DomainException('El archivo enviado no es una imagen válida.');$permitidos=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];$mime=(string)($info['mime']??'');if(!isset($permitidos[$mime]))throw new DomainException('Solo se permiten imágenes JPG, PNG o WebP.');if(!is_dir($this->directorio)&&!mkdir($this->directorio,0755,true))throw new DomainException('No se pudo preparar el directorio de fotos.',500);$nombre=bin2hex(random_bytes(16)).'.'.$permitidos[$mime];$ruta=$this->directorio.'/'.$nombre;
        if(!extension_loaded('gd')){if(!move_uploaded_file($tmp,$ruta)){@unlink($ruta);throw new DomainException('No se pudo guardar la foto en el servidor.',500);}@chmod($ruta,0644);return $nombre;}
        $imagen=$mime==='image/jpeg'?@imagecreatefromjpeg($tmp):($mime==='image/png'?@imagecreatefrompng($tmp):(function_exists('imagecreatefromwebp')?@imagecreatefromwebp($tmp):false));if(!$imagen)throw new DomainException('El archivo enviado no es una imagen válida.');if($mime==='image/webp'&&!function_exists('imagewebp')){imagedestroy($imagen);throw new DomainException('El servidor no admite fotos WebP. Usa una imagen JPG o PNG.');}imagesavealpha($imagen,true);$ok=$mime==='image/jpeg'?imagejpeg($imagen,$ruta,88):($mime==='image/png'?imagepng($imagen,$ruta):imagewebp($imagen,$ruta,88));imagedestroy($imagen);if(!$ok){@unlink($ruta);throw new DomainException('No se pudo procesar la foto. Prueba con otra imagen JPG o PNG.');}@chmod($ruta,0644);return $nombre;
    }
    public function eliminarAnterior(?string $a):void{if(is_string($a)&&preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/',$a))@unlink($this->directorio.'/'.$a);}
}
