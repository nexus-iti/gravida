<?php
declare(strict_types=1);
namespace Nexus\Features\Servicio\Infrastructure;
use Nexus\Features\Servicio\Domain\ServicioRepository;use Nexus\Shared\Domain\ValueObject\Cedula;
final class PdoServicioRepository implements ServicioRepository
{
    private \PDO $pdo;public function __construct(\PDO $p){$this->pdo=$p;}
    public function listar(Cedula $u,bool $g):array{$sql='SELECT s.id_servicio,s.tipo_de_servicio,s.estado,s.descripcion,s.titulo,s.lugar,s.fecha_de_solicitud,s.fecha_deseada,s.cedula,solicitante.nombre nombre_solicitante,solicitante.apellido apellido_solicitante FROM SERVICIO s INNER JOIN USUARIO solicitante ON solicitante.cedula=s.cedula WHERE s.esta_activo=1';$p=[];if(!$g){$sql.=' AND s.cedula=?';$p[]=$u->value();}$sql.=' ORDER BY s.id_servicio DESC';$q=$this->pdo->prepare($sql);$q->execute($p);return $q->fetchAll(\PDO::FETCH_ASSOC);}
    public function usuarioExiste(Cedula $u):bool{$q=$this->pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula=?');$q->execute([$u->value()]);return (bool)$q->fetchColumn();}
    public function crear(array $d,Cedula $u):int{$q=$this->pdo->prepare("INSERT INTO SERVICIO(tipo_de_servicio,estado,descripcion,titulo,lugar,fecha_de_solicitud,fecha_deseada,cedula) VALUES(?,'Pendiente',?,?,?,CURDATE(),?,?)");$q->execute([$d['tipo'],$d['detalle'],$d['titulo'],$d['lugar'],$d['fechaDeseada'],$u->value()]);return (int)$this->pdo->lastInsertId();}
    public function baja(int $id):bool{$q=$this->pdo->prepare("UPDATE SERVICIO SET esta_activo=0,estado='Cancelado' WHERE id_servicio=? AND esta_activo=1");$q->execute([$id]);return $q->rowCount()===1;}
    public function cambiarEstado(int $id,string $e):bool{$q=$this->pdo->prepare('SELECT 1 FROM SERVICIO WHERE id_servicio=?');$q->execute([$id]);if(!$q->fetchColumn())return false;$q=$this->pdo->prepare('UPDATE SERVICIO SET estado=? WHERE id_servicio=?');$q->execute([$e,$id]);return true;}
}
