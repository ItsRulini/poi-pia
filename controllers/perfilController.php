<?php
// controllers/perfilController.php

header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/RecompensaDAO.php'; // Añadir DAO de Recompensa
session_start();

$response = ['status' => 'error', 'message' => 'No autenticado o datos no encontrados.'];

if (isset($_SESSION['usuario']) && $_SESSION['usuario'] instanceof Usuario) {
    $usuario = $_SESSION['usuario'];

    $datosUsuario = [ /* ... tus datos de usuario ... */
        'idUsuario' => $usuario->idUsuario,
        'usuario' => $usuario->usuario,
        'correo' => $usuario->correo,
        'nombres' => $usuario->nombres,
        'paterno' => $usuario->paterno,
        'materno' => $usuario->materno,
        'avatar' => $usuario->avatar,
        'fechaNacimiento' => $usuario->fechaNacimiento,
        'descripcion' => $usuario->descripcion,
        'fechaRegistro' => $usuario->fechaRegistro
    ];

    $recompensas = [];
    if (isset($conn)) {
        $recompensaDAO = new RecompensaDAO($conn);
        $recompensas = $recompensaDAO->obtenerRecompensasUsuario($usuario->idUsuario);
    } else {
        $response['message'] = 'Error de conexión, no se pueden cargar recompensas.';
        // Podrías decidir si continuar sin recompensas o devolver error
    }
    

    $response = [
        'status' => 'success',
        'usuario' => $datosUsuario,
        'recompensas' => $recompensas
    ];

} else {
    $response['message'] = 'Usuario no encontrado en la sesión.';
}

echo json_encode($response);
?>