<?php
declare(strict_types=1);
namespace Nexus\Features\Trabajo\Application;
use Nexus\Features\Trabajo\Domain\TrabajoRepository;use Nexus\Shared\Domain\ValueObject\Cedula;use Nexus\Shared\DomainException;
final class TrabajoService
{
    private TrabajoRepository $repo;public function __construct(TrabajoRepository $r){$this->repo=$r;}
    public function tareas():array{return array_map(function($f){$e=$f['estado_tarea']==='En proceso'?'En curso':($f['estado_tarea']==='Completada'?'Completado':$f['estado_tarea']);return ['id'=>(string)$f['id_tarea'],'titulo'=>$f['titulo_tarea'],'descripcion'=>$f['descripcion_tarea'],'categoria'=>$f['categoria_tarea']?:'Otro','estado'=>$e,'color'=>$f['color_tarea']?:'#16A34A','fechaAgregada'=>$f['fecha_agregada'],'plazoInicio'=>$f['fecha_inicio_tarea']??$f['plazo_tarea'],'plazoFin'=>$f['plazo_tarea'],'tecnicoId'=>(string)($f['tecnico_cedula']??''),'prioridad'=>$f['dificultad_tarea']?:'Media'];},$this->repo->listarTareas());}
    public function crearTarea(array $d):int{$this->validarTarea($d);return $this->repo->crearTarea($d,$d['tecnico']);}
    public function actualizarTarea(int $id,array $d):void{$this->validarTarea($d);if(!$this->repo->actualizarTarea($id,$d,$d['tecnico']))throw new DomainException('No existe la tarea indicada.',404);}
    public function eliminarTarea(int $id):void{if(!$this->repo->eliminarTarea($id))throw new DomainException('No existe la tarea indicada.',404);}
    public function planillas():array{return array_map(fn($f)=>['id'=>(string)($f['id_plantilla']??''),'usuarioId'=>(string)$f['cedula'],'horaEntrada'=>substr((string)($f['horario_entrada_ta']??'08:00'),0,5),'horaSalida'=>substr((string)($f['horario_salida_ta']??'16:00'),0,5),'tareasDelDia'=>(string)($f['comentario_ta']??'')],$this->repo->listarPlanillas());}
    public function guardarPlanilla(Cedula $objetivo,Cedula $actual,bool $admin,array $d):void{if(!$admin&&!$objetivo->equals($actual))throw new DomainException('Solo podes modificar tu propia planilla.',403);$this->repo->guardarPlanilla($objetivo,$d);}
    private function validarTarea(array &$d):void
    {
        if(trim((string)($d['titulo']??''))==='')throw new DomainException('El titulo de la tarea es obligatorio.');
        if(trim((string)($d['descripcion']??''))==='')throw new DomainException('La descripcion de la tarea es obligatoria.');
        if(trim((string)($d['categoria']??''))==='')throw new DomainException('La categoria de la tarea es obligatoria.');
        if(($d['plazo']??null)===null)throw new DomainException('El plazo de la tarea es obligatorio.');
        $plazo=\DateTimeImmutable::createFromFormat('!Y-m-d',(string)$d['plazo']);
        if(!$plazo||$plazo->format('Y-m-d')!==$d['plazo'])throw new DomainException('El plazo debe usar el formato YYYY-MM-DD.');
        if(($d['inicio']??null)!==null&&$d['inicio']>$d['plazo'])throw new DomainException('La fecha de inicio no puede ser posterior al plazo.');
        if(!$this->repo->responsableValido($d['tecnico']??null))throw new DomainException('El responsable debe ser un usuario activo con rol tecnico o administrador.');
        $estados=['Pendiente'=>'Pendiente','En curso'=>'En curso','En proceso'=>'En curso','En revision'=>'En revision','Completado'=>'Completada','Completada'=>'Completada'];
        if(!isset($estados[$d['estado']??'']))throw new DomainException('Estado de tarea no valido.');
        $d['estado']=$estados[$d['estado']];
        if(!in_array($d['prioridad']??'', ['Baja','Media','Alta','Critica'],true))throw new DomainException('Prioridad de tarea no valida.');
        if(!preg_match('/^#[0-9A-Fa-f]{6}$/',(string)($d['color']??'')))throw new DomainException('Color de tarea no valido.');
    }
}
