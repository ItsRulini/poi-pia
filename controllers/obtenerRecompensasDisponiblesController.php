<?php
// controllers/obtenerRecompensasDisponiblesController.php (Corregido para tu modelo)
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al obtener las recompensas.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

$idUsuarioActual = $_SESSION['usuario']->idUsuario;

if (!isset($conn)) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

try {
    // Obtener recompensas de tareas completadas por el usuario
    $sql = "SELECT 
                r.idRecompensa,
                r.contenido,
                t.descripcion as descripcionTarea
            FROM Tarea_Usuario tu
            JOIN Tarea t ON tu.idTarea = t.idTarea
            JOIN Recompensa r ON t.idTarea = r.idTarea
            WHERE tu.idUsuario = ? AND tu.estatus = 'Completada'
            ORDER BY tu.fechaCompletada DESC";
            
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Error al preparar la sentencia: " . $conn->error);
    }
    
    $stmt->bind_param("i", $idUsuarioActual);
    
    if (!$stmt->execute()) {
        throw new Exception("Error al ejecutar la sentencia: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $recompensas = [];
    
    while ($row = $result->fetch_assoc()) {
        $recompensas[] = $row;
    }
    
    $response['status'] = 'success';
    $response['message'] = 'Recompensas obtenidas exitosamente.';
    $response['recompensas'] = $recompensas;
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
?>