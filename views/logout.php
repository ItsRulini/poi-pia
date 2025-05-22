<?php
session_start();
session_destroy();
header("Location: LOGIN.html"); // Ajusta el path si es necesario
exit();
?>
