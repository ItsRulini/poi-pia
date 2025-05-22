<?php
// dao/RecompensaDAO.php

class RecompensaDAO {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    // Asumimos que tienes una tabla que vincula usuarios con recompensas obtenidas.
    // Si la recompensa es la descripción misma y se obtiene al completar una Tarea,
    // y Recompensa.contenido es la descripción, entonces necesitamos saber qué tareas completó el usuario
    // y qué recompensas (contenidos) tienen esas tareas.

    // Este método es un EJEMPLO. Necesitarás ajustarlo a cómo realmente almacenas
    // las recompensas obtenidas por el usuario.
    // Por ahora, vamos a simular que obtenemos todas las recompensas de tareas que el usuario ha completado
    // y cuyo contenido es una frase/descripción.

    public function obtenerRecompensasUsuario($idUsuario) {
        $recompensas = [];
        // Ejemplo: Seleccionar el contenido de las recompensas de las tareas completadas por el usuario
        // Esto es una simplificación. En tu modelo, Recompensa está ligada a Tarea,
        // y Tarea_Usuario liga Usuario con Tarea y su estatus.
        // Recompensa.contenido puede ser URL de avatar O frase. Necesitamos filtrar por frases.
        $sql = "SELECT DISTINCT r.idRecompensa, r.contenido 
                FROM Recompensa r
                JOIN Tarea t ON r.idTarea = t.idTarea
                JOIN Tarea_Usuario tu ON t.idTarea = tu.idTarea
                WHERE tu.idUsuario = ? AND tu.estatus = 'Completada'
                AND r.contenido NOT LIKE 'http%' AND r.contenido NOT LIKE 'www.%' AND r.contenido NOT LIKE '%.png' AND r.contenido NOT LIKE '%.jpg' AND r.contenido NOT LIKE '%.gif'"; // Un intento de filtrar frases

        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar la sentencia para obtener recompensas: " . $this->conn->error);
            return [];
        }
        $stmt->bind_param("i", $idUsuario);
        
        if (!$stmt->execute()) {
            error_log("Error al ejecutar la sentencia para obtener recompensas: " . $stmt->error);
            return [];
        }
        
        $resultado = $stmt->get_result();
        while ($fila = $resultado->fetch_assoc()) {
            $recompensas[] = $fila; // Cada fila tiene idRecompensa y contenido
        }
        return $recompensas;
    }
}
?>