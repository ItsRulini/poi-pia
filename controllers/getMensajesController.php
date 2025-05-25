<?php
// controllers/getMensajesController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/MensajeDAO.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al cargar mensajes.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $idChat = $_GET['idChat'] ?? null;

    if (empty($idChat)) {
        $response['message'] = 'ID de chat no proporcionado.';
        echo json_encode($response);
        exit;
    }

    // Validación: El usuario debe ser parte del chat para ver sus mensajes (implementar en DAO o aquí)

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $mensajeDAO = new MensajeDAO($conn);
    // Podrías añadir paginación aquí con limit y offset si lo deseas
    $mensajes = $mensajeDAO->obtenerMensajesPorChat((int)$idChat);

    if ($mensajes !== null) { // obtenerMensajesPorChat devuelve [] en caso de no error pero sin mensajes
        $response['status'] = 'success';
        $response['message'] = 'Mensajes cargados.';
        $response['mensajes'] = $mensajes;
    } else {
        // Esto no debería ocurrir si el DAO devuelve [] en lugar de null en caso de error de BD
        $response['message'] = 'Error al obtener los mensajes desde la base de datos.';
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>