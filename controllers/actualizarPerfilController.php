<?php
// controllers/actualizarPerfilController.php
require_once '../connection/conexion.php';
require_once '../models/Usuario.php';
require_once '../dao/UsuarioDAO.php';

session_start();
header('Content-Type: application/json');



$response = ['status' => 'error', 'message' => 'No autenticado o datos no encontrados.'];

if (!isset($_SESSION['usuario']) || !($_SESSION['usuario'] instanceof Usuario)) {
    $response['message'] = 'Acceso denegado. Debes iniciar sesión.';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuarioActual = $_SESSION['usuario']; // Objeto Usuario de la sesión

    // Recoger datos del POST (los que se pueden modificar)
    $nombres = $_POST['nombres'] ?? $usuarioActual->nombres;
    $paterno = $_POST['paterno'] ?? $usuarioActual->paterno;
    $materno = $_POST['materno'] ?? $usuarioActual->materno; // Puede ser null si no se envía
    $correo = $_POST['correo'] ?? $usuarioActual->correo;
    $fechaNacimiento = $_POST['fechaNacimiento'] ?? $usuarioActual->fechaNacimiento;
    $nuevaContraseña = $_POST['contrasena'] ?? null; // 'contrasena' según tu HTML de perfil

    // El nombre de usuario y la descripción NO se modifican directamente aquí
    // $usuarioNickname = $usuarioActual->usuario; // Se mantiene el original
    // $descripcion = $usuarioActual->descripcion; // Se mantiene, se cambia por recompensas

    $avatarParaBD = $usuarioActual->avatar; // Mantener avatar actual por defecto
    $subidaDeNuevoAvatarCompletada = false;
    $rutaCompletaParaMoverNuevoAvatar = null;


    // --- Manejo de NUEVO Avatar (similar al registro) ---
    if (isset($_FILES["avatar"]) && $_FILES["avatar"]["error"] == UPLOAD_ERR_OK) {
        $carpetaDestino = "../multimedia/imagenPerfil/";
        if (!file_exists($carpetaDestino)) {
            if (!mkdir($carpetaDestino, 0777, true)) {
                $response['message'] = 'Error: No se pudo crear la carpeta de destino para las imágenes.';
                echo json_encode($response);
                exit;
            }
        }
        
        $nombreOriginal = basename($_FILES["avatar"]["name"]);
        $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
        $extensionesPermitidas = ['jpg', 'jpeg', 'png', 'gif'];

        if (!in_array($extension, $extensionesPermitidas)) {
            $response['message'] = "Error: Tipo de archivo no permitido para el avatar.";
            echo json_encode($response);
            exit;
        }

        // Usar el ID de usuario para el nombre del archivo para asegurar unicidad y fácil asociación
        // Si se usa el nombre de usuario y este cambia, la imagen se desasocia.
        $nombreUsuarioSanitizado = preg_replace("/[^a-zA-Z0-9_.-]/", "_", $usuarioActual->usuario);
        $nombreArchivo = $nombreUsuarioSanitizado . "." . $extension; // O $usuarioActual->idUsuario . "." . $extension;
        
        $rutaCompletaParaMoverNuevoAvatar = $carpetaDestino . $nombreArchivo;

        // Opcional: Eliminar avatar antiguo si existe y el nuevo se sube con el mismo nombre
        // if ($avatarParaBD && $avatarParaBD !== $nombreArchivo && file_exists($carpetaDestino . $avatarParaBD)) {
        //     unlink($carpetaDestino . $avatarParaBD);
        // }

        if (move_uploaded_file($_FILES["avatar"]["tmp_name"], $rutaCompletaParaMoverNuevoAvatar)) {
            $avatarParaBD = $nombreArchivo;
            $subidaDeNuevoAvatarCompletada = true;
        } else {
            $response['message'] = "Error: No se pudo mover el nuevo avatar.";
            echo json_encode($response);
            exit;
        }
    } else if (isset($_FILES["avatar"]) && $_FILES["avatar"]["error"] != UPLOAD_ERR_NO_FILE) {
        $response['message'] = "Error al subir el nuevo avatar. Código: " . $_FILES["avatar"]["error"];
        echo json_encode($response);
        exit;
    }

    // Validaciones
    if (empty($nombres) || empty($paterno) || empty($correo) || empty($fechaNacimiento)) {
        $response['message'] = 'Nombres, Apellido Paterno, Correo y Fecha de Nacimiento son obligatorios.';
        echo json_encode($response);
        exit;
    }

    if (!isset($conn)) {
        $response['message'] = 'Error de conexión a la base de datos.';
        echo json_encode($response);
        exit;
    }
    $usuarioDAO = new UsuarioDAO($conn);

    // Verificar si el nuevo correo ya existe para OTRO usuario
    if ($correo !== $usuarioActual->correo && $usuarioDAO->buscarPorCorreoExcluyendoUsuario($correo, $usuarioActual->idUsuario)) {
        $response['message'] = 'El nuevo correo electrónico ya está registrado por otro usuario.';
        echo json_encode($response);
        exit;
    }

    // Crear un objeto Usuario con los datos a actualizar
    $usuarioModificado = new Usuario();
    $usuarioModificado->idUsuario = $usuarioActual->idUsuario; // MUY IMPORTANTE para el WHERE en UPDATE
    $usuarioModificado->nombres = $nombres;
    $usuarioModificado->paterno = $paterno;
    $usuarioModificado->materno = $materno;
    $usuarioModificado->correo = $correo;
    $usuarioModificado->fechaNacimiento = $fechaNacimiento;
    $usuarioModificado->avatar = $avatarParaBD;
    
    // Campos que no se modifican desde este formulario directamente:
    $usuarioModificado->usuario = $usuarioActual->usuario;
    $usuarioModificado->descripcion = $usuarioActual->descripcion; // La descripción se cambia con recompensas


    if ($usuarioDAO->actualizarUsuario($usuarioModificado, $nuevaContraseña)) {
        // Actualizar el objeto Usuario en la sesión
        $usuarioActual->nombres = $nombres;
        $usuarioActual->paterno = $paterno;
        $usuarioActual->materno = $materno;
        $usuarioActual->correo = $correo;
        $usuarioActual->fechaNacimiento = $fechaNacimiento;
        $usuarioActual->avatar = $avatarParaBD;
        // Si la contraseña se actualizó, el DAO ya la hasheó. No la guardamos en sesión.
        $_SESSION['usuario'] = $usuarioActual; // Guardar el objeto actualizado

        $response['status'] = 'success';
        $response['message'] = 'Perfil actualizado exitosamente.';
        $response['nuevosDatos'] = ['avatar' => $avatarParaBD]; // Para actualizar la imagen en el frontend
    } else {
        $response['message'] = 'Error al actualizar el perfil. Inténtalo de nuevo.';
        if ($subidaDeNuevoAvatarCompletada && $rutaCompletaParaMoverNuevoAvatar && file_exists($rutaCompletaParaMoverNuevoAvatar) && $avatarParaBD !== $usuarioActual->avatar) {
            // Si la actualización de BD falló pero se subió un nuevo avatar, borrar el nuevo avatar subido
            unlink($rutaCompletaParaMoverNuevoAvatar);
        }
    }

} else {
    $response['message'] = 'Método de solicitud no válido.';
}
echo json_encode($response);
?>