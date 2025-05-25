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
    
    // Para mensajes enviados vía FormData (como cuando hay archivos)
    $idChat = $_POST['idChat'] ?? null;
    $textoMensaje = $_POST['textoMensaje'] ?? null;
    // Lógica para multimediaUrl (se implementará más adelante con Firebase)
    $multimediaUrl = null; 

    // Si los datos vienen como JSON (para mensajes de solo texto desde JS puro sin FormData)
    if (empty($idChat) && empty($textoMensaje)) {
        $datosJSON = file_get_contents('php://input');
        $datos = json_decode($datosJSON, true);
        $idChat = $datos['idChat'] ?? null;
        $textoMensaje = $datos['textoMensaje'] ?? null;
    }


    if (empty($idChat) || ($textoMensaje === null && $multimediaUrl === null)) {
        $response['message'] = 'Faltan datos (ID de chat o contenido del mensaje).';
        echo json_encode($response);
        exit;
    }
    
    // Validación: El usuario debe ser parte del chat (esto se podría verificar en el DAO o aquí)


    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }

    $mensajeDAO = new MensajeDAO($conn);
    
    $nuevoMensaje = new Mensaje();
    $nuevoMensaje->idRemitente = $idUsuarioActual;
    $nuevoMensaje->idChat = (int)$idChat;
    $nuevoMensaje->texto = $textoMensaje;
    $nuevoMensaje->multimediaUrl = $multimediaUrl;

    $idMensajeGuardado = $mensajeDAO->guardarMensaje($nuevoMensaje);

    if ($idMensajeGuardado) {
        $response['status'] = 'success';
        $response['message'] = 'Mensaje enviado.';
        $response['idMensaje'] = $idMensajeGuardado;
        // Podrías devolver el mensaje completo para añadirlo a la UI inmediatamente
        $response['mensaje'] = [
            'idMensaje' => $idMensajeGuardado,
            'idRemitente' => $idUsuarioActual,
            'idChat' => (int)$idChat,
            'texto' => $textoMensaje,
            'multimediaUrl' => $multimediaUrl,
            'fechaEnvio' => date('Y-m-d H:i:s'), // O tomar de la BD
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