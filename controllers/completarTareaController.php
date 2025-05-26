<?php
// controllers/completarTareaController.php (Corregido para tu modelo)
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al completar la tarea.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datosJSON = file_get_contents('php://input');
    $datos = json_decode($datosJSON, true);

    $idTarea = $datos['idTarea'] ?? null;
    $idUsuarioActual = $_SESSION['usuario']->idUsuario;

    if (empty($idTarea)) {
        $response['message'] = 'ID de tarea no proporcionado.';
        echo json_encode($response);
        exit;
    }

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $conn->begin_transaction();

    try {
        // Verificar que la tarea existe y está pendiente para este usuario
        $sqlVerificar = "SELECT tu.*, r.contenido as recompensa 
                       FROM Tarea_Usuario tu
                       LEFT JOIN Tarea t ON tu.idTarea = t.idTarea
                       LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                       WHERE tu.idTarea = ? AND tu.idUsuario = ? AND tu.estatus = 'Pendiente'";
        $stmtVerificar = $conn->prepare($sqlVerificar);
        $stmtVerificar->bind_param("ii", $idTarea, $idUsuarioActual);
        $stmtVerificar->execute();
        $result = $stmtVerificar->get_result();

        if ($result->num_rows === 0) {
            throw new Exception("Tarea no encontrada o ya completada.");
        }

        $tareaData = $result->fetch_assoc();
        $recompensa = $tareaData['recompensa'];

        // Marcar como completada
        $sqlCompletar = "UPDATE Tarea_Usuario SET estatus = 'Completada', fechaCompletada = NOW() WHERE idTarea = ? AND idUsuario = ?";
        $stmtCompletar = $conn->prepare($sqlCompletar);
        $stmtCompletar->bind_param("ii", $idTarea, $idUsuarioActual);
        
        if (!$stmtCompletar->execute()) {
            throw new Exception("Error al completar la tarea: " . $stmtCompletar->error);
        }

        $conn->commit();
        
        $response['status'] = 'success';
        $response['message'] = 'Tarea completada exitosamente.';
        $response['recompensa'] = $recompensa;

    } catch (Exception $e) {
        $conn->rollback();
        $response['message'] = $e->getMessage();
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>