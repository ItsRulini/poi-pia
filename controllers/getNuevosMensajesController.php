<?php
// controllers/getNuevosMensajesController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/MensajeDAO.php'; // Asumimos que MensajeDAO tiene el nuevo método
session_start();

$response = ['status' => 'error', 'message' => 'Error al cargar nuevos mensajes.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $idChat = filter_input(INPUT_GET, 'idChat', FILTER_VALIDATE_INT);
    $ultimoIdMensaje = filter_input(INPUT_GET, 'ultimoIdMensaje', FILTER_VALIDATE_INT);

    if ($idChat === false || $idChat === null) {
        $response['message'] = 'ID de chat no válido o no proporcionado.';
        echo json_encode($response);
        exit;
    }
    // ultimoIdMensaje puede ser 0 si es la primera vez o no hay mensajes previos
    if ($ultimoIdMensaje === false || $ultimoIdMensaje === null) {
        $ultimoIdMensaje = 0;
    }


    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $mensajeDAO = new MensajeDAO($conn);
    $nuevosMensajes = $mensajeDAO->obtenerNuevosMensajesPorChat($idChat, $ultimoIdMensaje);

    if ($nuevosMensajes !== null) {
        $response['status'] = 'success';
        $response['mensajes'] = $nuevosMensajes;
    } else {
        $response['message'] = 'Error al consultar nuevos mensajes.';
    }

} else {
    $response['message'] = 'Método no permitido.';
}

echo json_encode($response);
?>