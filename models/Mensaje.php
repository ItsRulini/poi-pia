<?php

class Mensaje {
    public $idMensaje;
    public $idRemitente;
    public $idChat;
    public $texto;
    public $multimediaUrl;
    public $fechaEnvio;
    public $esEncriptado; // NUEVO CAMPO

    public function __construct() { }

    // Métodos CRUD y otros específicos del mensaje
}

?>