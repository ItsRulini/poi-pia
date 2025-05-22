<?php

class Chat {
    public $idChat;
    public $idCreador;
    public $tipo; // ENUM('Privado', 'Grupo')
    public $fechaCreacion;
    public $nombre;

    public function __construct() {}

    // Métodos CRUD y otros específicos del chat
}

?>