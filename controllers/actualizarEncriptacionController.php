<?php
// controllers/actualizarEncriptacionController.php
require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/UsuarioDAO.php';

session_start();
header('Content-Type: application/json');

$response = ['status' => 'error', 'message' => 'No autenticado o error al actualizar.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuarioActual = $_SESSION['usuario'];
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    $nuevoEstado = isset($input['estatusEncriptacion']) ? (int)$input['estatusEncriptacion'] : 0;

    
    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }
    
    $sql = "UPDATE Usuario SET estatusEncriptacion = ? WHERE idUsuario = ?";
    $stmt = $conn->prepare($sql);
    
    if ($stmt) {
        $stmt->bind_param("ii", $nuevoEstado, $usuarioActual->idUsuario);
        
        if ($stmt->execute()) {
            // Actualizar el objeto en sesión
            $usuarioActual->estatusEncriptacion = $nuevoEstado;
            $_SESSION['usuario'] = $usuarioActual;
            
            $response['status'] = 'success';
            $response['message'] = 'Estado de encriptación actualizado correctamente.';
            $response['estatusEncriptacion'] = $nuevoEstado;
        } else {
            $response['message'] = 'Error al actualizar el estado de encriptación.';
        }
        
        $stmt->close();
    } else {
        $response['message'] = 'Error al preparar la consulta.';
    }
} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>