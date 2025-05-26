<?php
// getUsuariosChatController.php - CORREGIDO
// Controlador para obtener usuarios de un chat específico
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php'; // Para instanceof y el objeto de sesión
require_once '../dao/UsuarioDAO.php';
session_start();

// Verificar si el usuario está autenticado
if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    echo json_encode(['status' => 'error', 'message' => 'Usuario no autenticado']);
    exit();
}

// Verificar si se proporcionó el ID del chat
if (!isset($_GET['idChat'])) {
    echo json_encode(['status' => 'error', 'message' => 'ID del chat no proporcionado']);
    exit();
}

$idChat = intval($_GET['idChat']);
$idUsuarioActual = $_SESSION['usuario']->idUsuario; // ← CORRECCIÓN: Obtener el ID del usuario, no el objeto

try {
    // Verificar que el usuario actual pertenece al chat
    $sqlVerificar = "SELECT idUsuario FROM Chat_Usuario WHERE idChat = ? AND idUsuario = ? AND activo = TRUE";
    $stmtVerificar = $conn->prepare($sqlVerificar);
    $stmtVerificar->bind_param("ii", $idChat, $idUsuarioActual);
    $stmtVerificar->execute();
    $resultVerificar = $stmtVerificar->get_result();
    
    if ($resultVerificar->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'No tienes acceso a este chat']);
        exit();
    }
    
    // Obtener todos los usuarios del chat
    $sqlUsuarios = "
        SELECT 
            u.idUsuario,
            u.usuario,
            u.nombres,
            u.paterno,
            u.materno,
            u.avatar,
            cu.activo,
            CASE WHEN u.idUsuario = ? THEN 1 ELSE 0 END as esUsuarioActual
        FROM Chat_Usuario cu
        INNER JOIN Usuario u ON cu.idUsuario = u.idUsuario
        WHERE cu.idChat = ? AND cu.activo = TRUE
        ORDER BY u.usuario ASC
    ";
    
    $stmtUsuarios = $conn->prepare($sqlUsuarios);
    $stmtUsuarios->bind_param("ii", $idUsuarioActual, $idChat);
    $stmtUsuarios->execute();
    $resultUsuarios = $stmtUsuarios->get_result();
    
    $usuarios = [];
    while ($row = $resultUsuarios->fetch_assoc()) {
        $usuarios[] = [
            'idUsuario' => $row['idUsuario'],
            'usuario' => $row['usuario'],
            'nombreCompleto' => trim($row['nombres'] . ' ' . $row['paterno'] . ' ' . ($row['materno'] ?: '')),
            'avatar' => $row['avatar'],
            'esUsuarioActual' => $row['esUsuarioActual'] == 1
        ];
    }
    
    // Obtener información del chat
    $sqlChat = "SELECT nombre, tipo, idCreador FROM Chat WHERE idChat = ?";
    $stmtChat = $conn->prepare($sqlChat);
    $stmtChat->bind_param("i", $idChat);
    $stmtChat->execute();
    $resultChat = $stmtChat->get_result();
    $chatInfo = $resultChat->fetch_assoc();
    
    echo json_encode([
        'status' => 'success',
        'chat' => [
            'idChat' => $idChat,
            'nombre' => $chatInfo['nombre'],
            'tipo' => $chatInfo['tipo'],
            'idCreador' => $chatInfo['idCreador']
        ],
        'usuarios' => $usuarios,
        'totalUsuarios' => count($usuarios)
    ]);
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener usuarios del chat: ' . $e->getMessage()]);
}

$conn->close();
?>