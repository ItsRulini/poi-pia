<?php

class TareaUsuario {
    public $idTareaUsuario;
    public $idTarea;
    public $idUsuario;
    public $idChat;
    public $estatus; // ENUM('Pendiente', 'Completada')
    public $fechaAsignacion;
    public $fechaCompletada;

    public function __construct() {}

    // Métodos para gestionar la asignación y estado de tareas a usuarios en chats
}

?>