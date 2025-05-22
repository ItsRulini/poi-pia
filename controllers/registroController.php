<?php
// controllers/registroController.php

header('Content-Type: application/json');

require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/UsuarioDAO.php';

$response = ['status' => 'error', 'message' => 'Ocurrió un error inesperado.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // (Tu código para recoger datos del POST: nombres, paterno, etc. va aquí)
    $nombres = $_POST['nombres'] ?? null;
    $paterno = $_POST['paterno'] ?? null;
    $materno = $_POST['materno'] ?? null;
    $fechaNacimiento = $_POST['fechaNacimiento'] ?? null;
    $usuario = $_POST['usuario'] ?? null;
    $contraseña = $_POST['pass'] ?? null;
    $correo = $_POST['correo'] ?? null;

    // --- Inicio: Manejo Mejorado de la Imagen ---
    $avatarParaBD = null; // Nombre del archivo que se guardará en la BD
    $subidaDeArchivoCompletada = false; // Para controlar si el archivo se movió

    // Verificar si se subió un archivo y no hubo errores
    if (isset($_FILES["avatar"]) && $_FILES["avatar"]["error"] == UPLOAD_ERR_OK) {
        $carpetaDestino = "../multimedia/imagenPerfil/"; // Ruta relativa desde este script

        // Asegurarse de que la carpeta de destino exista, si no, intentar crearla
        if (!file_exists($carpetaDestino)) {
            if (!mkdir($carpetaDestino, 0777, true)) { // 0777 es permisivo, ajusta según seguridad
                $response['message'] = 'Error: No se pudo crear la carpeta de destino para las imágenes.';
                echo json_encode($response);
                exit;
            }
        }
        
        // Obtener la extensión original del archivo
        $nombreOriginal = basename($_FILES["avatar"]["name"]); // basename() por seguridad
        $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));

        // Validar extensiones permitidas
        $extensionesPermitidas = ['jpg', 'jpeg', 'png', 'gif'];
        if (!in_array($extension, $extensionesPermitidas)) {
            $response['message'] = "Error: Tipo de archivo no permitido. Solo se aceptan JPG, JPEG, PNG, GIF.";
            echo json_encode($response);
            exit;
        }

        // Crear el nuevo nombre de archivo: nombreUsuario.extensionOriginal
        // Es crucial que $usuario esté definido y validado antes de este punto
        if (empty($usuario)) {
            $response['message'] = "Error: El nombre de usuario es necesario para nombrar la imagen.";
            echo json_encode($response);
            exit;
        }
        // Sanitizar el nombre de usuario para usarlo en el nombre del archivo (opcional pero buena idea)
        $nombreUsuarioSanitizado = preg_replace("/[^a-zA-Z0-9_.-]/", "_", $usuario);
        $nombreArchivo = $nombreUsuarioSanitizado . "." . $extension;
        
        $rutaCompletaParaMover = $carpetaDestino . $nombreArchivo;

        // Mover el archivo de la ubicación temporal a la carpeta de destino
        if (move_uploaded_file($_FILES["avatar"]["tmp_name"], $rutaCompletaParaMover)) {
            $avatarParaBD = $nombreArchivo; // Este es el nombre que irá a la BD
            $subidaDeArchivoCompletada = true;
        } else {
            $response['message'] = "Error: No se pudo mover la imagen subida a la carpeta de destino.";
            // Podrías añadir más detalles del error de $_FILES aquí para depuración
            echo json_encode($response);
            exit;
        }

    } else if (isset($_FILES["avatar"]) && $_FILES["avatar"]["error"] != UPLOAD_ERR_NO_FILE) {
        // Hubo un error diferente a "no se subió archivo"
        // Es importante enviar un JSON válido y luego salir.
        $response['message'] = "Error al subir la imagen. Código: " . $_FILES["avatar"]["error"];
        echo json_encode($response);
        exit;
    }
    // Si no se subió archivo (UPLOAD_ERR_NO_FILE), $avatarParaBD seguirá siendo null, lo cual es correcto.

    // (Validaciones de otros campos, como en el código anterior)
    if (empty($nombres) || empty($paterno) || empty($usuario) || empty($contraseña) || empty($correo) || empty($fechaNacimiento)) {
        $response['message'] = 'Todos los campos obligatorios deben ser completados.';
        echo json_encode($response);
        exit;
    }

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }
    $usuarioDAO = new UsuarioDAO($conn);

    // Verificar si el usuario o correo ya existen
    if ($usuarioDAO->buscarPorUsuario($usuario)) {
        $response['message'] = 'El nombre de usuario ya está en uso.';
        echo json_encode($response);
        exit;
    }
    if ($usuarioDAO->buscarPorCorreo($correo)) {
        $response['message'] = 'El correo electrónico ya está registrado.';
        echo json_encode($response);
        exit;
    }
    // --- Fin: Manejo Mejorado de la Imagen ---

    // Crear un nuevo objeto Usuario
    $nuevoUsuario = new Usuario();
    $nuevoUsuario->nombres = $nombres;
    $nuevoUsuario->paterno = $paterno;
    $nuevoUsuario->materno = $materno;
    $nuevoUsuario->fechaNacimiento = $fechaNacimiento;
    $nuevoUsuario->usuario = $usuario;
    $nuevoUsuario->contraseña = $contraseña; // El DAO se encargará de hashear
    $nuevoUsuario->correo = $correo;
    $nuevoUsuario->avatar = $avatarParaBD; // Aquí se asigna el nombre del archivo o null

    if ($usuarioDAO->insertarUsuario($nuevoUsuario)) {
        // Si la subida del archivo no fue necesaria o fue exitosa Y la inserción en BD fue exitosa
        $response['status'] = 'success';
        $response['message'] = 'Usuario registrado exitosamente.';
        // Si $subidaDeArchivoCompletada es true y $avatarParaBD no es null, el archivo se movió.
        // Si $avatarParaBD es null (no se subió archivo), también es un éxito de registro.
    } else {
        $response['message'] = 'Error al registrar el usuario en la base de datos. Inténtalo de nuevo.';
        // Si la inserción falló, y se había subido un archivo, podrías considerar eliminar el archivo subido
        // para no dejar archivos huérfanos, aunque esto añade complejidad.
        if ($subidaDeArchivoCompletada && $rutaCompletaParaMover && file_exists($rutaCompletaParaMover)) {
            unlink($rutaCompletaParaMover); // Intenta eliminar el archivo
        }
    }
} else {
    $response['message'] = 'Método de solicitud no válido.';
}

echo json_encode($response);
?>