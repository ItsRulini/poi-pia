<?php
// controllers/obtenerInfoChatController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al obtener información del chat.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $idChat = $_GET['idChat'] ?? null;

    if (!$idChat) {
        $response['message'] = 'ID de chat no proporcionado.';
        echo json_encode($response);
        exit;
    }

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $idUsuarioActual = $_SESSION['usuario']->idUsuario;

    try {
        // Obtener información básica del chat
        $sqlChat = "SELECT c.*, 
                           (CASE WHEN c.tipo = 'Privado' THEN 
                               (SELECT u.descripcion 
                                FROM Usuario u 
                                JOIN Chat_Usuario cu ON u.idUsuario = cu.idUsuario 
                                WHERE cu.idChat = c.idChat 
                                AND cu.idUsuario != ? 
                                AND cu.activo = TRUE 
                                LIMIT 1)
                           ELSE NULL END) as descripcionOtroUsuario,
                           (CASE WHEN c.tipo = 'Privado' THEN 
                               (SELECT CONCAT(u.nombres, ' ', u.paterno)
                                FROM Usuario u 
                                JOIN Chat_Usuario cu ON u.idUsuario = cu.idUsuario 
                                WHERE cu.idChat = c.idChat 
                                AND cu.idUsuario != ? 
                                AND cu.activo = TRUE 
                                LIMIT 1)
                           ELSE c.nombre END) as nombreMostrado
                    FROM Chat c 
                    WHERE c.idChat = ?";
                    
        $stmt = $conn->prepare($sqlChat);
        $stmt->bind_param("iii", $idUsuarioActual, $idUsuarioActual, $idChat);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $response['status'] = 'success';
            $response['message'] = 'Información del chat obtenida exitosamente.';
            $response['chat'] = $row;
        } else {
            $response['message'] = 'Chat no encontrado o no tienes acceso a él.';
        }
        
    } catch (Exception $e) {
        $response['message'] = 'Error al obtener información del chat: ' . $e->getMessage();
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>