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

        $sql = "INSERT INTO Usuario (usuario, correo, contraseña, nombres, paterno, materno, avatar, fechaNacimiento, descripcion, estatusConexion, fechaRegistro) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            // Manejo del error de preparación
            error_log("Error al preparar la sentencia: " . $this->conn->error);
            return false;
        }

        // Valores por defecto si son null en el objeto y la BD los maneja (excepto CURRENT_TIMESTAMP)
        $descripcion = $usuario->descripcion ?? null;
        $estatusConexion = $usuario->estatusConexion ?? false;

        // Cambiar el tipo para estatusConexion de 's' a 'i'
        $stmt->bind_param(
            "sssssssssi", // La última 's' cambia a 'i'
            $usuario->usuario,
            $usuario->correo,
            $contraseñaHasheada,
            $usuario->nombres,
            $usuario->paterno,
            $usuario->materno,
            $usuario->avatar, // Este es $avatarParaBD que es string o null
            $usuario->fechaNacimiento, // Asegúrate que esto sea un string en formato 'YYYY-MM-DD'
            $descripcion,
            $estatusConexion // Usar el entero
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
        $sql = "SELECT idUsuario, usuario, correo, contraseña, nombres, paterno, materno, avatar, fechaNacimiento, descripcion, estatusConexion, fechaRegistro 
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

            return $usuario; // Devolver el objeto Usuario
        }
        return null; // Usuario no encontrado o contraseña incorrecta
    }

}

?>