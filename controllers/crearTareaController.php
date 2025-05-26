<?php
// controllers/crearTareaController.php (Corregido para tu modelo)
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al crear la tarea.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datosJSON = file_get_contents('php://input');
    $datos = json_decode($datosJSON, true);

    $descripcion = $datos['descripcion'] ?? null;
    $idChat = $datos['idChat'] ?? null;
    $recompensa = $datos['recompensa'] ?? null;

    $idCreador = $_SESSION['usuario']->idUsuario;

    if (empty($descripcion) || empty($idChat) || empty($recompensa)) {
        $response['message'] = 'Faltan datos para crear la tarea (descripción, chat o recompensa).';
        echo json_encode($response);
        exit;
    }

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    // Verificar que el usuario sea el creador del chat (admin)
    $sqlVerificarAdmin = "SELECT idCreador FROM Chat WHERE idChat = ?";
    $stmtVerificar = $conn->prepare($sqlVerificarAdmin);
    $stmtVerificar->bind_param("i", $idChat);
    $stmtVerificar->execute();
    $resultVerificar = $stmtVerificar->get_result();
    
    if ($resultVerificar->num_rows === 0) {
        $response['message'] = 'Chat no encontrado.';
        echo json_encode($response);
        exit;
    }
    
    $chatData = $resultVerificar->fetch_assoc();
    if ($chatData['idCreador'] != $idCreador) {
        $response['message'] = 'Solo el administrador del chat puede crear tareas.';
        echo json_encode($response);
        exit;
    }

    $conn->begin_transaction();

    try {
        // 1. Insertar la tarea
        $sqlTarea = "INSERT INTO Tarea (descripcion, idChat) VALUES (?, ?)";
        $stmtTarea = $conn->prepare($sqlTarea);
        if ($stmtTarea === false) {
            throw new Exception("Error al preparar sentencia para Tarea: " . $conn->error);
        }
        $stmtTarea->bind_param("si", $descripcion, $idChat);
        
        if (!$stmtTarea->execute()) {
            throw new Exception("Error al insertar en Tarea: " . $stmtTarea->error);
        }
        $idTareaCreada = $conn->insert_id;
        $stmtTarea->close();

        // 2. Crear la recompensa personalizada
        $sqlRecompensa = "INSERT INTO Recompensa (idTarea, contenido) VALUES (?, ?)";
        $stmtRecompensa = $conn->prepare($sqlRecompensa);
        if ($stmtRecompensa === false) {
            throw new Exception("Error al preparar sentencia para Recompensa: " . $conn->error);
        }
        $stmtRecompensa->bind_param("is", $idTareaCreada, $recompensa);
        
        if (!$stmtRecompensa->execute()) {
            throw new Exception("Error al insertar en Recompensa: " . $stmtRecompensa->error);
        }
        $stmtRecompensa->close();

        // 3. Asignar la tarea a todos los usuarios del chat (excepto el creador)
        $sqlUsuarios = "SELECT idUsuario FROM Chat_Usuario WHERE idChat = ? AND idUsuario != ? AND activo = TRUE";
        $stmtUsuarios = $conn->prepare($sqlUsuarios);
        $stmtUsuarios->bind_param("ii", $idChat, $idCreador);
        $stmtUsuarios->execute();
        $resultUsuarios = $stmtUsuarios->get_result();

        $sqlAsignar = "INSERT INTO Tarea_Usuario (idTarea, idUsuario, estatus, fechaAsignacion) VALUES (?, ?, 'Pendiente', NOW())";
        $stmtAsignar = $conn->prepare($sqlAsignar);

        while ($usuario = $resultUsuarios->fetch_assoc()) {
            $stmtAsignar->bind_param("ii", $idTareaCreada, $usuario['idUsuario']);
            if (!$stmtAsignar->execute()) {
                throw new Exception("Error al asignar tarea al usuario {$usuario['idUsuario']}: " . $stmtAsignar->error);
            }
        }
        
        $stmtUsuarios->close();
        $stmtAsignar->close();

        $conn->commit();
        
        $response['status'] = 'success';
        $response['message'] = 'Tarea creada exitosamente.';
        $response['idTarea'] = $idTareaCreada;

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Error en transacción crearTarea: " . $e->getMessage());
        $response['message'] = $e->getMessage();
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>