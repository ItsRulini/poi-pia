<?php
// dao/TareaDAO.php
require_once __DIR__ . '/../models/Tarea.php';
require_once __DIR__ . '/../models/TareaUsuario.php';
require_once __DIR__ . '/../models/Recompensa.php';

class TareaDAO {
    private $conn;
    private $ultimoError;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getUltimoError() {
        return $this->ultimoError;
    }

    public function crearTarea($descripcion, $idChat, $idCreador, $recompensaPersonalizada) {
        $this->conn->begin_transaction();

        try {
            // 1. Crear la tarea
            $sqlTarea = "INSERT INTO Tarea (descripcion, idChat, idCreador, fechaCreacion) VALUES (?, ?, ?, NOW())";
            $stmtTarea = $this->conn->prepare($sqlTarea);
            if ($stmtTarea === false) {
                $this->ultimoError = "Error al preparar sentencia para Tarea: " . $this->conn->error;
                throw new Exception($this->ultimoError);
            }
            $stmtTarea->bind_param("sii", $descripcion, $idChat, $idCreador);
            
            if (!$stmtTarea->execute()) {
                $this->ultimoError = "Error al insertar en Tarea: " . $stmtTarea->error;
                throw new Exception($this->ultimoError);
            }
            $idTareaCreada = $this->conn->insert_id;
            $stmtTarea->close();

            // 2. Crear la recompensa personalizada
            $sqlRecompensa = "INSERT INTO Recompensa (idTarea, contenido) VALUES (?, ?)";
            $stmtRecompensa = $this->conn->prepare($sqlRecompensa);
            if ($stmtRecompensa === false) {
                $this->ultimoError = "Error al preparar sentencia para Recompensa: " . $this->conn->error;
                throw new Exception($this->ultimoError);
            }
            $stmtRecompensa->bind_param("is", $idTareaCreada, $recompensaPersonalizada);
            
            if (!$stmtRecompensa->execute()) {
                $this->ultimoError = "Error al insertar en Recompensa: " . $stmtRecompensa->error;
                throw new Exception($this->ultimoError);
            }
            $stmtRecompensa->close();

            // 3. Asignar la tarea a todos los usuarios del chat (excepto el creador)
            $sqlUsuarios = "SELECT idUsuario FROM Chat_Usuario WHERE idChat = ? AND idUsuario != ? AND activo = TRUE";
            $stmtUsuarios = $this->conn->prepare($sqlUsuarios);
            $stmtUsuarios->bind_param("ii", $idChat, $idCreador);
            $stmtUsuarios->execute();
            $resultUsuarios = $stmtUsuarios->get_result();

            $sqlAsignar = "INSERT INTO Tarea_Usuario (idTarea, idUsuario, idChat, estatus, fechaAsignacion) VALUES (?, ?, ?, 'Pendiente', NOW())";
            $stmtAsignar = $this->conn->prepare($sqlAsignar);

            while ($usuario = $resultUsuarios->fetch_assoc()) {
                $stmtAsignar->bind_param("iii", $idTareaCreada, $usuario['idUsuario'], $idChat);
                if (!$stmtAsignar->execute()) {
                    $this->ultimoError = "Error al asignar tarea al usuario {$usuario['idUsuario']}: " . $stmtAsignar->error;
                    throw new Exception($this->ultimoError);
                }
            }
            
            $stmtUsuarios->close();
            $stmtAsignar->close();

            $this->conn->commit();
            return $idTareaCreada;

        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("Error en transacción crearTarea: " . $e->getMessage());
            return false;
        }
    }

    public function esAdministradorDelChat($idUsuario, $idChat) {
        $sql = "SELECT idCreador FROM Chat WHERE idChat = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $idChat);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            return $row['idCreador'] == $idUsuario;
        }
        return false;
    }

    public function obtenerTareasParaAdministrador($idChat) {
        $sql = "SELECT 
                    t.idTarea,
                    t.descripcion,
                    r.contenido as recompensa,
                    t.fechaCreacion,
                    COUNT(tu.idTareaUsuario) as totalAsignados,
                    COUNT(CASE WHEN tu.estatus = 'Completada' THEN 1 END) as completadas,
                    GROUP_CONCAT(
                        CONCAT(
                            u.idUsuario, ':', 
                            COALESCE(u.nombres, ''), ':', 
                            COALESCE(u.paterno, ''), ':', 
                            COALESCE(u.usuario, ''), ':', 
                            COALESCE(u.avatar, ''), ':', 
                            tu.estatus, ':', 
                            COALESCE(tu.fechaAsignacion, ''), ':', 
                            COALESCE(tu.fechaCompletada, '')
                        ) SEPARATOR '|'
                    ) as usuarios
                FROM Tarea t
                LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                LEFT JOIN Tarea_Usuario tu ON t.idTarea = tu.idTarea
                LEFT JOIN Usuario u ON tu.idUsuario = u.idUsuario
                WHERE t.idChat = ?
                GROUP BY t.idTarea
                ORDER BY t.fechaCreacion DESC";
                
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $idChat);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $tareas = [];
        while ($row = $result->fetch_assoc()) {
            // Procesar la información de usuarios
            $usuarios = [];
            if ($row['usuarios']) {
                $usuariosData = explode('|', $row['usuarios']);
                foreach ($usuariosData as $userData) {
                    $userInfo = explode(':', $userData);
                    if (count($userInfo) >= 8) {
                        $usuarios[] = [
                            'idUsuario' => $userInfo[0],
                            'nombres' => $userInfo[1],
                            'paterno' => $userInfo[2],
                            'usuario' => $userInfo[3],
                            'avatar' => $userInfo[4],
                            'estatus' => $userInfo[5],
                            'fechaAsignacion' => $userInfo[6],
                            'fechaCompletada' => $userInfo[7]
                        ];
                    }
                }
            }
            
            $row['usuarios'] = $usuarios;
            unset($row['usuarios']); // Remover la cadena original
            $row['usuarios'] = $usuarios; // Añadir el array procesado
            $tareas[] = $row;
        }
        
        return $tareas;
    }

    public function obtenerTareasPendientesUsuario($idUsuario, $idChat) {
        $sql = "SELECT 
                    t.idTarea,
                    t.descripcion,
                    r.contenido as recompensa,
                    tu.fechaAsignacion
                FROM Tarea_Usuario tu
                JOIN Tarea t ON tu.idTarea = t.idTarea
                LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                WHERE tu.idUsuario = ? AND tu.idChat = ? AND tu.estatus = 'Pendiente'
                ORDER BY tu.fechaAsignacion DESC";
                
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ii", $idUsuario, $idChat);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $tareas = [];
        while ($row = $result->fetch_assoc()) {
            $tareas[] = $row;
        }
        
        return $tareas;
    }

    public function obtenerTareasCompletadasUsuario($idUsuario, $idChat) {
        $sql = "SELECT 
                    t.idTarea,
                    t.descripcion,
                    r.contenido as recompensa,
                    tu.fechaCompletada
                FROM Tarea_Usuario tu
                JOIN Tarea t ON tu.idTarea = t.idTarea
                LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                WHERE tu.idUsuario = ? AND tu.idChat = ? AND tu.estatus = 'Completada'
                ORDER BY tu.fechaCompletada DESC";
                
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ii", $idUsuario, $idChat);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $tareas = [];
        while ($row = $result->fetch_assoc()) {
            $tareas[] = $row;
        }
        
        return $tareas;
    }

    public function completarTarea($idTarea, $idUsuario) {
        $this->conn->begin_transaction();

        try {
            // Verificar que la tarea existe y está pendiente
            $sqlVerificar = "SELECT tu.*, r.contenido as recompensa 
                           FROM Tarea_Usuario tu
                           LEFT JOIN Tarea t ON tu.idTarea = t.idTarea
                           LEFT JOIN Recompensa r ON t.idTarea = r.idTarea
                           WHERE tu.idTarea = ? AND tu.idUsuario = ? AND tu.estatus = 'Pendiente'";
            $stmtVerificar = $this->conn->prepare($sqlVerificar);
            $stmtVerificar->bind_param("ii", $idTarea, $idUsuario);
            $stmtVerificar->execute();
            $result = $stmtVerificar->get_result();

            if ($result->num_rows === 0) {
                throw new Exception("Tarea no encontrada o ya completada.");
            }

            $tareaData = $result->fetch_assoc();
            $recompensa = $tareaData['recompensa'];

            // Marcar como completada
            $sqlCompletar = "UPDATE Tarea_Usuario SET estatus = 'Completada', fechaCompletada = NOW() WHERE idTarea = ? AND idUsuario = ?";
            $stmtCompletar = $this->conn->prepare($sqlCompletar);
            $stmtCompletar->bind_param("ii", $idTarea, $idUsuario);
            
            if (!$stmtCompletar->execute()) {
                throw new Exception("Error al completar la tarea: " . $stmtCompletar->error);
            }

            $this->conn->commit();
            return [
                'success' => true,
                'recompensa' => $recompensa
            ];

        } catch (Exception $e) {
            $this->conn->rollback();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function obtenerRecompensasDisponiblesUsuario($idUsuario) {
        $sql = "SELECT 
                    r.idRecompensa,
                    r.contenido,
                    t.descripcion as descripcionTarea
                FROM Tarea_Usuario tu
                JOIN Tarea t ON tu.idTarea = t.idTarea
                JOIN Recompensa r ON t.idTarea = r.idTarea
                WHERE tu.idUsuario = ? AND tu.estatus = 'Completada'
                ORDER BY tu.fechaCompletada DESC";
                
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar la sentencia para obtener recompensas: " . $this->conn->error);
            return null;
        }
        
        $stmt->bind_param("i", $idUsuario);
        
        if (!$stmt->execute()) {
            error_log("Error al ejecutar la sentencia para obtener recompensas: " . $stmt->error);
            return null;
        }
        
        $result = $stmt->get_result();
        $recompensas = [];
        
        while ($row = $result->fetch_assoc()) {
            $recompensas[] = $row;
        }
        
        return $recompensas;
    }
}
?>