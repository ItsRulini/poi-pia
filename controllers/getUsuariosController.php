<?php
// controllers/getUsuariosController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php'; // Para instanceof y el objeto de sesión
require_once '../dao/UsuarioDAO.php';
session_start();

$response = ['status' => 'error', 'message' => 'No se pudieron cargar los usuarios.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if (!isset($conn)) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

$usuarioActual = $_SESSION['usuario'];
$usuarioDAO = new UsuarioDAO($conn);
$usuarios = $usuarioDAO->obtenerTodosLosUsuariosMenosActual($usuarioActual->idUsuario);

if ($usuarios !== null) {
    $response['status'] = 'success';
    $response['message'] = 'Usuarios cargados exitosamente.';
    $response['usuarios'] = $usuarios;
} else {
    $response['message'] = 'Error al obtener la lista de usuarios desde la base de datos.';
}

echo json_encode($response);
?>