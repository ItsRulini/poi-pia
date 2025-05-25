<?php
// controllers/getChatsController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/ChatDAO.php';
session_start();

$response = ['status' => 'error', 'message' => 'No se pudieron cargar los chats.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if (!isset($conn)) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

$usuarioActual = $_SESSION['usuario'];
error_log("ID Usuario para buscar chats: " . $usuarioActual->idUsuario);
$chatDAO = new ChatDAO($conn);
$chats = $chatDAO->obtenerChatsPorUsuario($usuarioActual->idUsuario);

if ($chats !== null) {
    $response['status'] = 'success';
    $response['message'] = 'Chats cargados exitosamente.';
    $response['chats'] = $chats;
} else {
    $response['message'] = 'Error al obtener la lista de chats desde la base de datos.';
}

echo json_encode($response);
?>