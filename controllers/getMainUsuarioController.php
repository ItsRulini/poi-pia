<?php
// controllers/getMainUsuarioController.php
header('Content-Type: application/json');

require_once '../models/Usuario.php'; // Para instanceof

session_start();
$response = ['status' => 'error', 'message' => 'No autenticado o datos no encontrados.'];

// La comprobación ahora debería funcionar si el objeto se guardó correctamente
if (isset($_SESSION['usuario']) && $_SESSION['usuario'] instanceof Usuario) {
    $usuario = $_SESSION['usuario'];
    $response = [
        'status' => 'success',
        'usuario' => $usuario->usuario,
        'avatar' => $usuario->avatar
    ];
} else {
    // Para depurar, puedes ver qué hay realmente en $_SESSION['usuario']
    error_log('Contenido de $_SESSION[\'usuario\']: ' . print_r($_SESSION['usuario'] ?? 'No definido', true));
    error_log('¿Es instancia de Usuario?: ' . (($_SESSION['usuario'] ?? null) instanceof Usuario ? 'Sí' : 'No'));
}

echo json_encode($response);
?>