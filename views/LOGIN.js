// document.getElementById('Crear').addEventListener('click',
// function(){
//     document.querySelector('.PopUp').style.display = 'flex';
// });

// document.querySelector('.close').addEventListener('click',
// function(){
//     document.querySelector('.PopUp').style.display = 'none';
// });


// views/LOGIN.js

document.addEventListener('DOMContentLoaded', function () {
    const crearButton = document.getElementById('Crear');
    const popUp = document.querySelector('.PopUp');
    const closeButton = document.querySelector('.close');
    const formRegistro = document.getElementById('formRegistro'); // Formulario de registro

    if (crearButton) {
        crearButton.addEventListener('click', function () {
            if (popUp) popUp.style.display = 'flex';
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', function () {
            if (popUp) popUp.style.display = 'none';
        });
    }

    // Manejo del formulario de registro
    if (formRegistro) {
        formRegistro.addEventListener('submit', function (event) {
            event.preventDefault(); // Evitar el envío tradicional del formulario

            const formData = new FormData(formRegistro);

            // Opcional: Validaciones del lado del cliente aquí antes de enviar

            fetch('../controllers/registroController.php', { // Ajusta la ruta si es necesario
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message); // Mostrar mensaje (puedes usar algo más sofisticado)
                if (data.status === 'success') {
                    popUp.style.display = 'none'; // Ocultar pop-up si el registro fue exitoso
                    formRegistro.reset(); // Limpiar el formulario
                    document.getElementById("profile-image").src = "../multimedia/logo.jpg"; // Limpiar la imagen de perfil
                    // Opcional: redirigir o actualizar la interfaz
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al conectar con el servidor. Inténtalo más tarde.');
            });
        });
    }

    // Para la imagen de perfil en el pop-up de registro
    const profilePic = document.getElementById("profile-image");
    const inputFile = document.getElementById("input-file");

    if (inputFile && profilePic) {
        inputFile.onchange = function () {
            if (inputFile.files && inputFile.files[0]) {
                profilePic.src = URL.createObjectURL(inputFile.files[0]);
            }
        }
    }

    // Manejo del formulario de LOGIN
    const formLogin = document.getElementById('Main'); // Asumiendo que este es tu form de login
    if (formLogin) {
        formLogin.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevenir el envío tradicional

            const formData = new FormData(formLogin);

            fetch('../controllers/loginController.php', { // Ajusta la ruta si es necesario
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message); // Mostrar mensaje
                if (data.status === 'success') {
                    // Redirigir a MAIN.html o la página principal de la app
                    window.location.href = data.redirect || 'MAIN.html';
                }
            })
            .catch(error => {
                console.error('Error en login:', error);
                alert('Error al intentar iniciar sesión.');
            });
        });
    }

});

// Las animaciones GSAP pueden permanecer fuera del DOMContentLoaded si prefieres
gsap.from('.main', 1.2, {opacity:0, y:150, delay:1});
gsap.from('h2', 1.2, {opacity:0, y:-170, delay:1});
gsap.from('.text', 1.2, {opacity:0, x:0, delay:2.3});
gsap.from('.SignUp', 1.2, {opacity:0, y:150, delay:1});