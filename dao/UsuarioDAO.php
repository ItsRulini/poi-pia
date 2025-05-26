<?php
require_once '../connection/conexion.php';
require_once '../models/Usuario.php';

class UsuarioDAO
{
    private $conn;
    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    public function insertarUsuario(Usuario $usuario)
    {
        // Hashear la contraseña ANTES de guardarla
        $contraseñaHasheada = password_hash($usuario->contraseña, PASSWORD_DEFAULT);
        if ($contraseñaHasheada === false) {
            // Manejo del error de hashing
            error_log("Error al hashear la contraseña para el usuario: " . $usuario->usuario);
            return false;
        }

        $sql = "INSERT INTO Usuario (usuario, correo, contraseña, nombres, paterno, materno, avatar, fechaNacimiento, descripcion, estatusConexion, estatusEncriptacion, fechaRegistro) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            // Manejo del error de preparación
            error_log("Error al preparar la sentencia: " . $this->conn->error);
            return false;
        }

        // Valores por defecto si son null en el objeto y la BD los maneja (excepto CURRENT_TIMESTAMP)
        $descripcion = "I am a new user"; // Valor por defecto
        $estatusConexion = $usuario->estatusConexion ?? false;
        $estatusEncriptacion = $usuario->estatusEncriptacion ?? false;

        // Cambiar el tipo para estatusConexion de 's' a 'i'
        $stmt->bind_param(
            "sssssssssii", // La última 's' cambia a 'i' y agregamos otro 'i' para estatusEncriptacion
            $usuario->usuario,
            $usuario->correo,
            $contraseñaHasheada,
            $usuario->nombres,
            $usuario->paterno,
            $usuario->materno,
            $usuario->avatar, // Este es $avatarParaBD que es string o null
            $usuario->fechaNacimiento, // Asegúrate que esto sea un string en formato 'YYYY-MM-DD'
            $descripcion,
            $estatusConexion, // Usar el entero
            $estatusEncriptacion // Usar el entero
        );

        if ($stmt->execute()) {
            return true;
        } else {
            // Manejo del error de ejecución
            error_log("Error al ejecutar la sentencia: " . $stmt->error);
            return false;
        }
    }

    public function buscarPorUsuario($nombreUsuario)
    {
        $sql = "SELECT idUsuario FROM Usuario WHERE usuario = ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            return null;
        }
        $stmt->bind_param("s", $nombreUsuario);
        $stmt->execute();
        $resultado = $stmt->get_result();
        return $resultado->fetch_assoc();
    }

    public function buscarPorCorreo($correo)
    {
        $sql = "SELECT idUsuario FROM Usuario WHERE correo = ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            return null;
        }
        $stmt->bind_param("s", $correo);
        $stmt->execute();
        $resultado = $stmt->get_result();
        return $resultado->fetch_assoc();
    }

    public function autenticarUsuario($login, $contraseña)
    {
        // Buscar por usuario o correo
        $sql = "SELECT idUsuario, usuario, correo, contraseña, nombres, paterno, materno, avatar, fechaNacimiento, descripcion, estatusConexion, fechaRegistro, estatusEncriptacion 
                FROM Usuario WHERE usuario = ? OR correo = ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar la sentencia de autenticación: " . $this->conn->error);
            return null;
        }
        $stmt->bind_param("ss", $login, $login);
        
        if (!$stmt->execute()) {
            error_log("Error al ejecutar la sentencia de autenticación: " . $stmt->error);
            return null;
        }
        
        $resultado = $stmt->get_result();
        $usuarioData = $resultado->fetch_assoc();

        if ($usuarioData && password_verify($contraseña, $usuarioData['contraseña'])) {
            // Crear y devolver un objeto Usuario
            $usuario = new Usuario();
            $usuario->idUsuario = $usuarioData['idUsuario'];
            $usuario->usuario = $usuarioData['usuario'];
            $usuario->correo = $usuarioData['correo'];
            $usuario->nombres = $usuarioData['nombres'];
            $usuario->paterno = $usuarioData['paterno'];
            $usuario->materno = $usuarioData['materno'];
            $usuario->avatar = $usuarioData['avatar'];
            $usuario->fechaNacimiento = $usuarioData['fechaNacimiento'];
            $usuario->descripcion = $usuarioData['descripcion'];
            $usuario->estatusConexion = $usuarioData['estatusConexion'];
            $usuario->fechaRegistro = $usuarioData['fechaRegistro'];
            $usuario->estatusEncriptacion = $usuarioData['estatusEncriptacion'];

            return $usuario; // Devolver el objeto Usuario
        }
        return null; // Usuario no encontrado o contraseña incorrecta
    }

    public function actualizarUsuario(Usuario $usuario, $nuevaContraseña = null)
    {
        $campos = [];
        $tipos = "";
        $valores = [];

        // Campos que siempre se actualizan si se proporcionan (o se mantienen desde el objeto)
        if ($usuario->nombres !== null) { $campos[] = "nombres = ?"; $tipos .= "s"; $valores[] = $usuario->nombres; }
        if ($usuario->paterno !== null) { $campos[] = "paterno = ?"; $tipos .= "s"; $valores[] = $usuario->paterno; }
        // Materno puede ser null
        $campos[] = "materno = ?"; $tipos .= "s"; $valores[] = $usuario->materno; // Siempre se envía, puede ser null
        
        if ($usuario->correo !== null) { $campos[] = "correo = ?"; $tipos .= "s"; $valores[] = $usuario->correo; }
        if ($usuario->fechaNacimiento !== null) { $campos[] = "fechaNacimiento = ?"; $tipos .= "s"; $valores[] = $usuario->fechaNacimiento; }
        if ($usuario->avatar !== null) { $campos[] = "avatar = ?"; $tipos .= "s"; $valores[] = $usuario->avatar; }
        // Descripción se actualiza por otro mecanismo (recompensas)
        // if ($usuario->descripcion !== null) { $campos[] = "descripcion = ?"; $tipos .= "s"; $valores[] = $usuario->descripcion; }


        // Actualizar contraseña solo si se proporciona una nueva
        if (!empty($nuevaContraseña)) {
            $contraseñaHasheada = password_hash($nuevaContraseña, PASSWORD_DEFAULT);
            if ($contraseñaHasheada === false) {
                error_log("Error al hashear la nueva contraseña para el usuario ID: " . $usuario->idUsuario);
                return false;
            }
            $campos[] = "contraseña = ?";
            $tipos .= "s";
            $valores[] = $contraseñaHasheada;
        }

        if (empty($campos)) {
            return true; // No hay nada que actualizar (o solo se actualizó la contraseña y ya se hizo)
        }

        $sql = "UPDATE Usuario SET " . implode(", ", $campos) . " WHERE idUsuario = ?";
        $tipos .= "i"; // Para idUsuario
        $valores[] = $usuario->idUsuario;

        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar la sentencia de actualización: " . $this->conn->error . " SQL: " . $sql);
            return false;
        }

        // Necesario usar call_user_func_array para bind_param dinámico
        $stmt->bind_param($tipos, ...$valores);

        if ($stmt->execute()) {
            return $stmt->affected_rows >= 0; // Exitoso si no hay error, incluso si no se afectan filas (datos iguales)
        } else {
            error_log("Error al ejecutar la actualización: " . $stmt->error);
            return false;
        }
    }

    public function buscarPorCorreoExcluyendoUsuario($correo, $idUsuarioExcluir)
    {
        $sql = "SELECT idUsuario FROM Usuario WHERE correo = ? AND idUsuario != ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            return null;
        }
        $stmt->bind_param("si", $correo, $idUsuarioExcluir);
        $stmt->execute();
        $resultado = $stmt->get_result();
        return $resultado->fetch_assoc();
    }

    // Método para actualizar solo la descripción (usado por recompensas)
    public function actualizarDescripcionUsuario($idUsuario, $nuevaDescripcion) {
        $sql = "UPDATE Usuario SET descripcion = ? WHERE idUsuario = ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar la sentencia para actualizar descripción: " . $this->conn->error);
            return false;
        }
        $stmt->bind_param("si", $nuevaDescripcion, $idUsuario);
        if ($stmt->execute()) {
            return true;
        } else {
            error_log("Error al ejecutar la actualización de descripción: " . $stmt->error);
            return false;
        }
    }

    public function obtenerTodosLosUsuariosMenosActual($idUsuarioActual)
    {
        $usuarios = [];
        $sql = "SELECT idUsuario, usuario, nombres, paterno, materno, avatar 
                FROM Usuario 
                WHERE idUsuario != ? 
                ORDER BY usuario ASC";
        
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("Error al preparar la sentencia para obtener usuarios: " . $this->conn->error);
            return null;
        }
        
        $stmt->bind_param("i", $idUsuarioActual);
        
        if (!$stmt->execute()) {
            error_log("Error al ejecutar la sentencia para obtener usuarios: " . $stmt->error);
            return null;
        }
        
        $resultado = $stmt->get_result();
        while ($fila = $resultado->fetch_assoc()) {
            // No necesitamos crear objetos Usuario completos aquí, solo los datos para mostrar
            $usuarios[] = $fila;
        }
        $stmt->close();
        return $usuarios;
    }
}

?>