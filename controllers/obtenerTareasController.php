<?php
// controllers/obtenerTareasController.php (Corregido para tu modelo)
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al obtener las tareas.'];

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

    $idUsuarioActual = $_SESSION['usuario']->idUsuario;

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    try {
        // Verificar si el usuario es administrador del chat
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
        $esAdmin = ($chatData['idCreador'] == $idUsuarioActual);
        
        if ($esAdmin) {
            // Vista de administrador: todas las tareas con progreso
            $sqlTareas = "SELECT 
                            t.idTarea,
                            t.descripcion,
                            r.contenido as recompensa,
                            COUNT(tu.idTarea) as totalAsignados,
                            COUNT(CASE WHEN tu.estatus = 'Completada' THEN 1 END) as completadas
                        FROM Tarea t
                        LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                        LEFT JOIN Tarea_Usuario tu ON t.idTarea = tu.idTarea
                        WHERE t.idChat = ?
                        GROUP BY t.idTarea
                        ORDER BY t.idTarea DESC";
                        
            $stmtTareas = $conn->prepare($sqlTareas);
            $stmtTareas->bind_param("i", $idChat);
            $stmtTareas->execute();
            $resultTareas = $stmtTareas->get_result();
            
            $tareas = [];
            while ($row = $resultTareas->fetch_assoc()) {
                // Obtener detalles de usuarios para esta tarea
                $sqlUsuarios = "SELECT 
                                    u.idUsuario,
                                    u.nombres,
                                    u.paterno,
                                    u.usuario,
                                    u.avatar,
                                    tu.estatus,
                                    tu.fechaAsignacion,
                                    tu.fechaCompletada
                                FROM Tarea_Usuario tu
                                JOIN Usuario u ON tu.idUsuario = u.idUsuario
                                WHERE tu.idTarea = ?
                                ORDER BY u.nombres";
                                
                $stmtUsuarios = $conn->prepare($sqlUsuarios);
                $stmtUsuarios->bind_param("i", $row['idTarea']);
                $stmtUsuarios->execute();
                $resultUsuarios = $stmtUsuarios->get_result();
                
                $usuarios = [];
                while ($usuario = $resultUsuarios->fetch_assoc()) {
                    $usuarios[] = $usuario;
                }
                
                $row['usuarios'] = $usuarios;
                $tareas[] = $row;
            }
            
            $response['status'] = 'success';
            $response['message'] = 'Tareas cargadas para administrador.';
            $response['tareas'] = $tareas;
            $response['esAdmin'] = true;
            
        } else {
            // Vista de usuario: solo sus tareas
            $sqlTareasPendientes = "SELECT 
                                        t.idTarea,
                                        t.descripcion,
                                        r.contenido as recompensa,
                                        tu.fechaAsignacion
                                    FROM Tarea_Usuario tu
                                    JOIN Tarea t ON tu.idTarea = t.idTarea
                                    LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                                    WHERE tu.idUsuario = ? AND t.idChat = ? AND tu.estatus = 'Pendiente'
                                    ORDER BY tu.fechaAsignacion DESC";
                                    
            $stmtPendientes = $conn->prepare($sqlTareasPendientes);
            $stmtPendientes->bind_param("ii", $idUsuarioActual, $idChat);
            $stmtPendientes->execute();
            $resultPendientes = $stmtPendientes->get_result();
            
            $tareasPendientes = [];
            while ($row = $resultPendientes->fetch_assoc()) {
                $tareasPendientes[] = $row;
            }
            
            $sqlTareasCompletadas = "SELECT 
                                        t.idTarea,
                                        t.descripcion,
                                        r.contenido as recompensa,
                                        tu.fechaCompletada
                                    FROM Tarea_Usuario tu
                                    JOIN Tarea t ON tu.idTarea = t.idTarea
                                    LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                                    WHERE tu.idUsuario = ? AND t.idChat = ? AND tu.estatus = 'Completada'
                                    ORDER BY tu.fechaCompletada DESC";
                                    
            $stmtCompletadas = $conn->prepare($sqlTareasCompletadas);
            $stmtCompletadas->bind_param("ii", $idUsuarioActual, $idChat);
            $stmtCompletadas->execute();
            $resultCompletadas = $stmtCompletadas->get_result();
            
            $tareasCompletadas = [];
            while ($row = $resultCompletadas->fetch_assoc()) {
                $tareasCompletadas[] = $row;
            }
            
            $response['status'] = 'success';
            $response['message'] = 'Tareas cargadas para usuario.';
            $response['tareasPendientes'] = $tareasPendientes;
            $response['tareasCompletadas'] = $tareasCompletadas;
            $response['esAdmin'] = false;
        }
        
    } catch (Exception $e) {
        $response['message'] = 'Error al obtener las tareas: ' . $e->getMessage();
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>