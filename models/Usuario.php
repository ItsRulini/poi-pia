<?php

class Usuario {
    public $idUsuario;
    public $usuario;
    public $correo;
    public $contraseña;
    public $nombres;
    public $paterno;
    public $materno;
    public $avatar;
    public $fechaNacimiento;
    public $descripcion;
    public $estatusConexion;
    public $fechaRegistro;
    public $estatusEncriptacion; // NUEVO CAMPO

    public function __construct() { }
}

?>