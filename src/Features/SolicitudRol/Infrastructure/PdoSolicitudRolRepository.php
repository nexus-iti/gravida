<?php
declare(strict_types=1);
namespace Nexus\Features\SolicitudRol\Infrastructure;
use Nexus\Features\SolicitudRol\Domain\SolicitudRolRepository;use Nexus\Shared\Domain\ValueObject\Cedula;
final class PdoSolicitudRolRepository implements SolicitudRolRepository
{
    private \PDO $pdo;public function __construct(\PDO $pdo){$this->pdo=$pdo;}
    public function listar():array{$q=$this->pdo->query("SELECT s.id_solicitud_cambio_rol id,s.cedula_solicitante cedula,CONCAT(u.nombre,' ',u.apellido) usuario,s.rol_actual rolActual,s.rol_solicitado rolSolicitado,s.motivo,s.estado,s.cedula_revisor revisorId,s.fecha_solicitud fechaSolicitud,s.fecha_revision fechaRevision FROM SOLICITUD_CAMBIO_ROL s INNER JOIN USUARIO u ON u.cedula=s.cedula_solicitante ORDER BY s.id_solicitud_cambio_rol DESC");return $q->fetchAll(\PDO::FETCH_ASSOC);}
    public function rolActivo(Cedula $c):?string{$q=$this->pdo->prepare("SELECT rol FROM USUARIO WHERE cedula=? AND estado='Activo' AND esta_activo=1");$q->execute([$c->value()]);$v=$q->fetchColumn();return $v===false?null:(string)$v;}
    public function tienePendiente(Cedula $c):bool{$q=$this->pdo->prepare("SELECT 1 FROM SOLICITUD_CAMBIO_ROL WHERE cedula_solicitante=? AND estado='Pendiente'");$q->execute([$c->value()]);return (bool)$q->fetchColumn();}
    public function crear(Cedula $c,string $a,string $s,string $m):int{$q=$this->pdo->prepare('INSERT INTO SOLICITUD_CAMBIO_ROL(cedula_solicitante,rol_actual,rol_solicitado,motivo) VALUES(?,?,?,?)');$q->execute([$c->value(),$a,$s,$m]);return (int)$this->pdo->lastInsertId();}
    public function resolver(int $id,string $estado,Cedula $r):bool{$this->pdo->beginTransaction();try{$q=$this->pdo->prepare("SELECT cedula_solicitante,rol_solicitado FROM SOLICITUD_CAMBIO_ROL WHERE id_solicitud_cambio_rol=? AND estado='Pendiente' FOR UPDATE");$q->execute([$id]);$s=$q->fetch(\PDO::FETCH_ASSOC);if(!$s){$this->pdo->rollBack();return false;}if($estado==='Aprobado'){$q=$this->pdo->prepare('UPDATE USUARIO SET rol=? WHERE cedula=?');$q->execute([$s['rol_solicitado'],$s['cedula_solicitante']]);}$q=$this->pdo->prepare('UPDATE SOLICITUD_CAMBIO_ROL SET estado=?,cedula_revisor=?,fecha_revision=NOW() WHERE id_solicitud_cambio_rol=?');$q->execute([$estado,$r->value(),$id]);$this->pdo->commit();return true;}catch(\Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}}
}
