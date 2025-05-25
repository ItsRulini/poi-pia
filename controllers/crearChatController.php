<?php
// controllers/crearChatController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php'; // Para el objeto de sesión
require_once '../models/Chat.php';
require_once '../models/ChatUsuario.php';
require_once '../dao/ChatDAO.php'; // Necesitaremos un ChatDAO

session_start();
$response = ['status' => 'error', 'message' => 'Error al crear el chat.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datosJSON = file_get_contents('php://input');
    $datos = json_decode($datosJSON, true);

    $tipoChat = $datos['tipo'] ?? null;
    $nombreChat = $datos['nombre'] ?? null; // Será null para chats privados
    $idsUsuariosParticipantes = $datos['idsUsuarios'] ?? [];

    $idCreador = $_SESSION['usuario']->idUsuario;

    if (empty($tipoChat) || empty($idsUsuariosParticipantes)) {
        $response['message'] = 'Faltan datos para crear el chat (tipo o participantes).';
        echo json_encode($response);
        exit;
    }

    // Añadir al creador a la lista de participantes si no está (aunque debería estar implícito)
    if (!in_array($idCreador, $idsUsuariosParticipantes)) {
        $idsUsuariosParticipantes[] = $idCreador;
    }
    
    // Validar nombre para chat grupal
    if ($tipoChat === 'Grupo' && empty($nombreChat)) {
        $response['message'] = 'Se requiere un nombre para el chat grupal.';
        echo json_encode($response);
        exit;
    }

    // Si es chat privado (1 a 1), solo debe haber 2 participantes (creador + 1)
    // y el nombre del chat puede ser manejado de forma especial
    if ($tipoChat === 'Privado' && count($idsUsuariosParticipantes) != 2) {
        $response['message'] = 'Los chats privados deben tener exactamente dos participantes.';
        // O podrías ajustar $idsUsuariosParticipantes aquí si solo esperas al otro usuario además del creador
        echo json_encode($response);
        exit;
    }


    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $chatDAO = new ChatDAO($conn); // Crear esta clase DAO
    
    // Construir nombre del chat privado (ej. Nombres concatenados o IDs)
    // Para este ejemplo, si es privado y no se da nombre, se podría dejar null y la UI lo maneja.
    // O podrías generarlo aquí. Por ahora, si es privado, el nombre enviado ($nombreChat) será null.
    // Si es tipo 'Privado', $nombreChat puede ser null. El modelo Chat en la BD permite nombre null.

    $nuevoChat = new Chat();
    $nuevoChat->idCreador = $idCreador;
    $nuevoChat->tipo = $tipoChat;
    $nuevoChat->nombre = ($tipoChat === 'Grupo') ? $nombreChat : null; // Nombre solo para grupos

    $idChatCreado = $chatDAO->crearChat($nuevoChat, $idsUsuariosParticipantes);

    if ($idChatCreado) {
        $response['status'] = 'success';
        $response['message'] = 'Chat creado exitosamente.';
        $response['idChat'] = $idChatCreado;
    } else {
        $response['message'] = $chatDAO->getUltimoError() ?: 'No se pudo crear el chat en la base de datos.';
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>