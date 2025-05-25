<?php
// controllers/enviarMensajeController.php
header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../models/Mensaje.php';
require_once '../dao/MensajeDAO.php';
session_start();

$response = ['status' => 'error', 'message' => 'Error al enviar el mensaje.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $idUsuarioActual = $_SESSION['usuario']->idUsuario;
    
    // Los datos ahora siempre vendrán como JSON desde el nuevo flujo de enviarMensajeAlServidor
    $datosJSON = file_get_contents('php://input');
    $datos = json_decode($datosJSON, true);

    $idChat = $datos['idChat'] ?? null;
    $textoMensaje = $datos['textoMensaje'] ?? null; // Este puede ser "[Imagen]", "[Video]", o texto real.
    $multimediaUrl = $datos['multimediaUrl'] ?? null;

    if (empty($idChat) || ($textoMensaje === null && $multimediaUrl === null)) {
        $response['message'] = 'Faltan datos (ID de chat o contenido del mensaje).';
        echo json_encode($response);
        exit;
    }
    
    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $mensajeDAO = new MensajeDAO($conn);
    
    $nuevoMensaje = new Mensaje();
    $nuevoMensaje->idRemitente = $idUsuarioActual;
    $nuevoMensaje->idChat = (int)$idChat;
    $nuevoMensaje->texto = $textoMensaje; // Puede ser el texto o el placeholder
    $nuevoMensaje->multimediaUrl = $multimediaUrl;

    $idMensajeGuardado = $mensajeDAO->guardarMensaje($nuevoMensaje);

    if ($idMensajeGuardado) {
        $response['status'] = 'success';
        $response['message'] = 'Mensaje enviado.';
        // Devolver el mensaje completo con datos del servidor
        $response['mensaje'] = [
            'idMensaje' => $idMensajeGuardado,
            'idRemitente' => $idUsuarioActual,
            'idChat' => (int)$idChat,
            'texto' => $textoMensaje, // El texto que se guardó
            'multimediaUrl' => $multimediaUrl,
            'fechaEnvio' => date('Y-m-d H:i:s'), // O mejor obtenerlo de la BD post-inserción
            'remitenteUsuario' => $_SESSION['usuario']->usuario,
            'remitenteAvatar' => $_SESSION['usuario']->avatar
        ];
    } else {
        $response['message'] = $mensajeDAO->getUltimoError() ?: 'No se pudo guardar el mensaje.';
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>