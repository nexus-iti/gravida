<?php
declare(strict_types=1);
namespace Nexus\Features\Incidencia\Infrastructure;

use Nexus\Features\Incidencia\Domain\EstadoIncidencia;
use Nexus\Features\Incidencia\Domain\IncidenciaRepository;
use Nexus\Shared\Domain\ValueObject\Cedula;

final class PdoIncidenciaRepository implements IncidenciaRepository
{
    private \PDO $pdo;
    public function __construct(\PDO $pdo) {$this->pdo=$pdo;}
    public function listar(Cedula $usuario, bool $puedeGestionar): array
    {
        $sql='SELECT i.*, creador.nombre nombre_crea, creador.apellido apellido_crea, responsable.nombre nombre_responde, responsable.apellido apellido_responde FROM INCIDENCIA i INNER JOIN USUARIO creador ON creador.cedula=i.cedula_crea LEFT JOIN USUARIO responsable ON responsable.cedula=i.cedula_responde WHERE i.esta_activa=1';
        $params=[]; if(!$puedeGestionar){$sql.=' AND i.cedula_crea=?';$params[]=$usuario->value();}$sql.=' ORDER BY i.id_ticket DESC';
        $q=$this->pdo->prepare($sql);$q->execute($params);return $q->fetchAll(\PDO::FETCH_ASSOC);
    }
    public function crear(array $d, Cedula $c): int {$q=$this->pdo->prepare("INSERT INTO INCIDENCIA(categoria,descripcion,titulo,fecha_de_solicitud,lugar,estado,id_equipo,cedula_crea) VALUES(?,?,?,CURDATE(),?,'Pendiente',?,?)");$q->execute([$d['categoria'],$d['descripcion'],$d['titulo'],$d['lugar'],$d['idEquipo'],$c->value()]);return (int)$this->pdo->lastInsertId();}
    public function existe(int $id): bool {$q=$this->pdo->prepare('SELECT 1 FROM INCIDENCIA WHERE id_ticket=?');$q->execute([$id]);return (bool)$q->fetchColumn();}
    public function usuarioExiste(Cedula $c): bool {$q=$this->pdo->prepare('SELECT 1 FROM USUARIO WHERE cedula=? AND esta_activo=1');$q->execute([$c->value()]);return (bool)$q->fetchColumn();}
    public function equipoExiste(int $id): bool {$q=$this->pdo->prepare('SELECT 1 FROM EQUIPO WHERE id_equipo=? AND esta_activo=1');$q->execute([$id]);return (bool)$q->fetchColumn();}
    public function baja(int $id): void {$q=$this->pdo->prepare("UPDATE INCIDENCIA SET esta_activa=0,estado='Cerrado',fecha_cierre=CURDATE() WHERE id_ticket=?");$q->execute([$id]);}
    public function comentar(int $id,string $c): bool {$q=$this->pdo->prepare("UPDATE INCIDENCIA SET comentario_resolucion=? WHERE id_ticket=? AND estado IN ('Resuelto','Cerrado')");$q->execute([$c,$id]);return $q->rowCount()===1;}
    public function actualizarDiagnostico(int $id,?string $d,?string $s): void {$q=$this->pdo->prepare('UPDATE INCIDENCIA SET diagnostico=?,solucion=? WHERE id_ticket=?');$q->execute([$d,$s,$id]);}
    public function tomar(int $id,Cedula $t): void {$q=$this->pdo->prepare("UPDATE INCIDENCIA SET cedula_responde=?,estado='En proceso' WHERE id_ticket=?");$q->execute([$t->value(),$id]);}
    public function cambiarEstado(int $id,EstadoIncidencia $e,Cedula $t,string $d='',string $s=''): void {$q=$this->pdo->prepare("UPDATE INCIDENCIA SET estado=?,fecha_cierre=?,cedula_responde=?,diagnostico=CASE WHEN ?='' THEN diagnostico ELSE ? END,solucion=CASE WHEN ?='' THEN solucion ELSE ? END WHERE id_ticket=?");$q->execute([$e->value(),$e->esFinal()?date('Y-m-d'):null,$t->value(),$d,$d,$s,$s,$id]);}
}
