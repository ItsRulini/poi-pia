<?php
// controllers/loginController.php

session_start(); // Iniciar sesión para guardar datos del usuario
header('Content-Type: application/json');

require_once '../connection/conexion.php'; // Ajusta la ruta
require_once '../models/Usuario.php';    // Ajusta la ruta
require_once '../dao/UsuarioDAO.php';      // Ajusta la ruta

$response = ['status' => 'error', 'message' => 'Error de autenticación.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = $_POST['username'] ?? null; // 'username' es el name del input en LOGIN.html
    $contraseña = $_POST['password'] ?? null; // 'password' es el name del input

    if (empty($login) || empty($contraseña)) {
        $response['message'] = 'Usuario/correo y contraseña son requeridos.';
        echo json_encode($response);
        exit;
    }

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }
    $usuarioDAO = new UsuarioDAO($conn);
    $usuarioAutenticado = $usuarioDAO->autenticarUsuario($login, $contraseña);

    if ($usuarioAutenticado instanceof Usuario) {
        // Guardar información del usuario en la sesión
        // No guardes la contraseña, incluso si estuviera en el objeto (que no lo está)
        $_SESSION['usuario'] = $usuarioAutenticado; // Guardar el objeto Usuario completo
        // Puedes guardar más datos si los necesitas globalmente

        $response['status'] = 'success';
        $response['message'] = 'Inicio de sesión exitoso.';
        $response['redirect'] = 'MAIN.html'; // O la página a la que quieras redirigir
    } else {
        $response['message'] = 'Usuario o contraseña incorrectos.';
    }
} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>