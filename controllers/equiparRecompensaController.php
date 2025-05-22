<?php
// controllers/equiparRecompensaController.php

require_once '../connection/conexion.php';
require_once '../models/Usuario.php'; // Para instanceof
require_once '../dao/UsuarioDAO.php';

session_start();
header('Content-Type: application/json');



$response = ['status' => 'error', 'message' => 'Error al equipar la recompensa.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuarioActual = $_SESSION['usuario'];
    $nuevaDescripcion = $_POST['descripcion'] ?? null;

    if ($nuevaDescripcion === null) { // Permitir string vacío, pero no si no se envía el parámetro
        $response['message'] = 'No se proporcionó descripción para equipar.';
        echo json_encode($response);
        exit;
    }
    
    // Podrías añadir una validación para verificar si la descripción
    // realmente es una recompensa que el usuario ha ganado,
    // pero por ahora, actualizaremos directamente.

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }
    $usuarioDAO = new UsuarioDAO($conn);

    if ($usuarioDAO->actualizarDescripcionUsuario($usuarioActual->idUsuario, $nuevaDescripcion)) {
        // Actualizar la descripción en el objeto de sesión
        $usuarioActual->descripcion = $nuevaDescripcion;
        $_SESSION['usuario'] = $usuarioActual;

        $response['status'] = 'success';
        $response['message'] = 'Descripción actualizada exitosamente.';
    } else {
        $response['message'] = 'No se pudo actualizar la descripción.';
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>