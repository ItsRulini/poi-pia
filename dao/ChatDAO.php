<?php
// dao/ChatDAO.php
require_once __DIR__ . '/../models/Chat.php'; // O la ruta correcta
require_once __DIR__ . '/../models/ChatUsuario.php';

class ChatDAO {
    private $conn;
    private $ultimoError;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getUltimoError() {
        return $this->ultimoError;
    }

    public function crearChat(Chat $chat, array $idsUsuarios) {
        $this->conn->begin_transaction();

        try {
            // 1. Insertar en la tabla Chat
            $sqlChat = "INSERT INTO Chat (idCreador, tipo, nombre, fechaCreacion) VALUES (?, ?, ?, NOW())";
            $stmtChat = $this->conn->prepare($sqlChat);
            if ($stmtChat === false) {
                $this->ultimoError = "Error al preparar sentencia para Chat: " . $this->conn->error;
                throw new Exception($this->ultimoError);
            }
            $stmtChat->bind_param("iss", $chat->idCreador, $chat->tipo, $chat->nombre);
            
            if (!$stmtChat->execute()) {
                $this->ultimoError = "Error al insertar en Chat: " . $stmtChat->error;
                throw new Exception($this->ultimoError);
            }
            $idChatCreado = $this->conn->insert_id;
            $stmtChat->close();

            if (!$idChatCreado) {
                 $this->ultimoError = "No se pudo obtener el ID del chat creado.";
                throw new Exception($this->ultimoError);
            }

            // 2. Insertar en la tabla Chat_Usuario para cada participante
            $sqlChatUsuario = "INSERT INTO Chat_Usuario (idUsuario, idChat, activo) VALUES (?, ?, ?)";
            $stmtChatUsuario = $this->conn->prepare($sqlChatUsuario);
            if ($stmtChatUsuario === false) {
                $this->ultimoError = "Error al preparar sentencia para Chat_Usuario: " . $this->conn->error;
                throw new Exception($this->ultimoError);
            }

            $activo = true; // Asumimos que los usuarios están activos al crear el chat
                            // Podrías obtener su `estatusConexion` real aquí si es necesario

            foreach ($idsUsuarios as $idUsuario) {
                $stmtChatUsuario->bind_param("iii", $idUsuario, $idChatCreado, $activo);
                if (!$stmtChatUsuario->execute()) {
                    $this->ultimoError = "Error al insertar en Chat_Usuario para usuario ID $idUsuario: " . $stmtChatUsuario->error;
                    throw new Exception($this->ultimoError);
                }
            }
            $stmtChatUsuario->close();

            $this->conn->commit();
            return $idChatCreado;

        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("Error en transacción crearChat: " . $e->getMessage());
            // $this->ultimoError ya está seteado
            return false;
        }
    }

    // TODO: Método para obtener los chats del usuario actual para el sidebar
    public function obtenerChatsPorUsuario($idUsuario) {
        $chats = [];
        $sql = "SELECT
                    c.idChat,
                    c.nombre AS nombreChatOriginal,
                    c.tipo,
                    c.idCreador,
                    -- Subconsulta para obtener el nombre del otro usuario si es chat privado
                    (SELECT usr.usuario 
                    FROM Usuario usr 
                    JOIN Chat_Usuario cu_o ON usr.idUsuario = cu_o.idUsuario 
                    WHERE cu_o.idChat = c.idChat AND cu_o.idUsuario != cu_main.idUsuario AND cu_o.activo = TRUE 
                    LIMIT 1) AS nombreOtroUsuario,
                    -- Subconsulta para obtener el avatar del otro usuario si es chat privado
                    (SELECT usr.avatar 
                    FROM Usuario usr 
                    JOIN Chat_Usuario cu_o ON usr.idUsuario = cu_o.idUsuario 
                    WHERE cu_o.idChat = c.idChat AND cu_o.idUsuario != cu_main.idUsuario AND cu_o.activo = TRUE 
                    LIMIT 1) AS avatarOtroUsuario
                FROM
                    Chat c
                JOIN
                    Chat_Usuario cu_main ON c.idChat = cu_main.idChat
                WHERE
                    cu_main.idUsuario = ? 
                    AND cu_main.activo = TRUE
                ORDER BY
                    c.fechaCreacion DESC"; // O por fecha del último mensaje si la tuvieras

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            error_log("Error preparando SQL para obtener chats: " . $this->conn->error . " SQL: " . $sql);
            return [];
        }
        
        // Solo un placeholder para el idUsuario del usuario actual
        $stmt->bind_param("i", $idUsuario);
        
        if (!$stmt->execute()) {
            error_log("Error ejecutando SQL para obtener chats: " . $stmt->error);
            $stmt->close();
            return [];
        }
        
        $resultado = $stmt->get_result();
        error_log("Número de chats encontrados para usuario $idUsuario: " . $resultado->num_rows);

        while ($fila = $resultado->fetch_assoc()) {
            if ($fila['tipo'] === 'Privado') {
                $fila['nombreMostrado'] = $fila['nombreOtroUsuario'] ?: ($fila['nombreChatOriginal'] ?: 'Chat Privado'); // Fallback
                $fila['avatarMostrado'] = $fila['avatarOtroUsuario'];
            } else { // Grupo
                $fila['nombreMostrado'] = $fila['nombreChatOriginal'] ?: 'Grupo';
                $fila['avatarMostrado'] = '../multimedia/logo.jpg'; // Puedes poner un avatar de grupo por defecto
            }
            $chats[] = $fila;
        }
        $stmt->close();
        return $chats;
    }
}
?>