<?php
// dao/MensajeDAO.php
require_once __DIR__ . '/../models/Mensaje.php';

class MensajeDAO {
    private $conn;
    private $ultimoError;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getUltimoError() {
        return $this->ultimoError;
    }

    public function guardarMensaje(Mensaje $mensaje) {
        $sql = "INSERT INTO Mensaje (idRemitente, idChat, texto, multimediaUrl, fechaEnvio) 
                VALUES (?, ?, ?, ?, NOW())";
        
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            $this->ultimoError = "Error al preparar sentencia para Mensaje: " . $this->conn->error;
            error_log($this->ultimoError);
            return false;
        }

        // multimediaUrl puede ser null si no es un mensaje multimedia
        $multimedia = $mensaje->multimediaUrl ?? null;

        $stmt->bind_param("iiss", 
            $mensaje->idRemitente, 
            $mensaje->idChat, 
            $mensaje->texto,
            $multimedia 
        );

        if ($stmt->execute()) {
            $idMensajeInsertado = $this->conn->insert_id;
            $stmt->close();
            return $idMensajeInsertado; // Devolver el ID del mensaje guardado
        } else {
            $this->ultimoError = "Error al insertar en Mensaje: " . $stmt->error;
            error_log($this->ultimoError);
            $stmt->close();
            return false;
        }
    }

    public function obtenerMensajesPorChat($idChat, $limit = 50, $offset = 0) {
        $mensajes = [];
        // Unir con Usuario para obtener el nombre del remitente y su avatar
        $sql = "SELECT m.idMensaje, m.idRemitente, m.idChat, m.texto, m.multimediaUrl, m.fechaEnvio,
                       u.usuario AS remitenteUsuario, u.avatar AS remitenteAvatar
                FROM Mensaje m
                JOIN Usuario u ON m.idRemitente = u.idUsuario
                WHERE m.idChat = ?
                ORDER BY m.fechaEnvio ASC 
                LIMIT ? OFFSET ?"; 
                // ASC para mostrar los más antiguos primero, o DESC para los más recientes

        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar SQL para obtener mensajes: " . $this->conn->error);
            return [];
        }

        $stmt->bind_param("iii", $idChat, $limit, $offset);
        
        if (!$stmt->execute()) {
            error_log("Error al ejecutar SQL para obtener mensajes: " . $stmt->error);
            $stmt->close();
            return [];
        }

        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $mensajes[] = $row;
        }
        $stmt->close();
        return $mensajes;
    }

    public function obtenerNuevosMensajesPorChat($idChat, $ultimoIdMensajeConocido, $limit = 50) {
        $mensajes = [];
        $sql = "SELECT m.idMensaje, m.idRemitente, m.idChat, m.texto, m.multimediaUrl, m.fechaEnvio,
                    u.usuario AS remitenteUsuario, u.avatar AS remitenteAvatar
                FROM Mensaje m
                JOIN Usuario u ON m.idRemitente = u.idUsuario
                WHERE m.idChat = ? AND m.idMensaje > ?
                ORDER BY m.fechaEnvio ASC
                LIMIT ?"; 
                // ASC para que el JS los procese en orden y el último ID se actualice correctamente

        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar SQL para obtener NUEVOS mensajes: " . $this->conn->error);
            return null; // Devolver null en caso de error de preparación
        }

        $stmt->bind_param("iii", $idChat, $ultimoIdMensajeConocido, $limit);
        
        if (!$stmt->execute()) {
            error_log("Error al ejecutar SQL para obtener NUEVOS mensajes: " . $stmt->error);
            $stmt->close();
            return null; // Devolver null en caso de error de ejecución
        }

        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $mensajes[] = $row;
        }
        $stmt->close();
        return $mensajes; // Devuelve array vacío si no hay nuevos, o los mensajes si los hay
    }
}
?>