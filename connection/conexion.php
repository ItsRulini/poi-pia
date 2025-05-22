<?php
$db_server="localhost";
$db_user="root";
$db_pass="admin";
$db_name="POI";

$conn=mysqli_connect(hostname: $db_server,
           username: $db_user,
           password: $db_pass,
           database: $db_name);

if($conn){
    //echo "Todo Funcionando";
}

else{ echo "YAMA";
}




?>