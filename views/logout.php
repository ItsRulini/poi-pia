<?php
session_start();
$_SESSION = array(); // Vaciar el array de sesión
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();
header("Location: LOGIN.html"); // Ajusta la ruta a tu LOGIN.html
exit;
?>