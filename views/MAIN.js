// --- Cargar Datos del Usuario para el Sidebar ---
function cargarDatosUsuarioSidebar() {
    fetch('../controllers/getMainUsuarioController.php') // Ajustar ruta si es necesario
        .then(response => {
            if (!response.ok) {
                throw new Error('Respuesta de red no fue OK: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                const sidebarUsernameElement = document.getElementById('sidebarUsername');
                const sidebarUserAvatarElement = document.getElementById('sidebarUserAvatar');

                if (sidebarUsernameElement) {
                    sidebarUsernameElement.textContent = data.usuario || 'Usuario';
                }

                if (sidebarUserAvatarElement) {
                    if (data.avatar) {
                        sidebarUserAvatarElement.src = `../multimedia/imagenPerfil/${data.avatar}`;
                    } else {
                        sidebarUserAvatarElement.src = '../multimedia/logo.jpg'; // Imagen por defecto
                    }
                }
            } else {
                console.warn('No se pudieron cargar los datos del usuario para el sidebar:', data.message);
                // Mantener los valores por defecto o manejar el error como prefieras
                // Si es crítico, podrías redirigir a LOGIN.html
                // if (data.message.includes('No autenticado')) {
                //     window.location.href = 'LOGIN.html';
                // }
            }
        })
        .catch(error => {
            console.error('Error al cargar datos del usuario para el sidebar:', error);
            // Podrías poner placeholders si falla la carga
            const sidebarUsernameElement = document.getElementById('sidebarUsername');
            const sidebarUserAvatarElement = document.getElementById('sidebarUserAvatar');
            if (sidebarUsernameElement) sidebarUsernameElement.textContent = 'Usuario';
            if (sidebarUserAvatarElement) sidebarUserAvatarElement.src = '../multimedia/logo.jpg';
        });
}


// --- MODIFICACIÓN DEL DOMContentLoaded ---
// Asegúrate de que el código existente de DOMContentLoaded se mantenga y añade la llamada
document.addEventListener("DOMContentLoaded", function () {
    // LLAMAR A LA NUEVA FUNCIÓN PARA CARGAR DATOS DEL USUARIO
    cargarDatosUsuarioSidebar();

    const chatToContainer = document.querySelector(".chat-to"); //
    const userElements = document.querySelectorAll(".new-convo"); //

    if (chatToContainer) { // Verificar si el elemento existe
        chatToContainer.addEventListener("wheel", (event) => { //
          event.preventDefault(); // Evita el scroll de la página
          chatToContainer.scrollLeft += event.deltaY; // Mueve el contenido horizontalmente
        });
    }


    userElements.forEach(user => { //
        user.addEventListener("click", function () { //
            const username = this.dataset.username || this.querySelector("p").textContent.trim(); //Obtener el nombre del usuario seleccionado

            //Se crea el boton
            const button = document.createElement("button"); //
            //Se pone el nombre del usuario seleccionado
            button.setAttribute("data-username", username); //
            button.innerHTML = `${username} <i class="fa-solid fa-xmark"></i>`; //

            //Elimina el boton al hacer click
            button.addEventListener("click", function () { //
                button.remove(); //
            });

            //Agregar el botón al contenedor
            if (chatToContainer) { // Verificar si el contenedor existe
                 chatToContainer.appendChild(button); //
            }
        });
    });

    // --- PopUps (tu código existente para los pop-ups) ---
    const crearButton = document.getElementById('Crear'); //
    const popUp = document.querySelector('.PopUp'); //
    const closeButton = popUp ? popUp.querySelector('.close') : null; //
    // ... y así para los demás pop-ups

    if (crearButton && popUp) {
        crearButton.addEventListener('click', function () { //
            popUp.style.display = 'flex'; //
        });
    }
    if (closeButton && popUp) {
        closeButton.addEventListener('click', function () { //
            popUp.style.display = 'none'; //
        });
    }

    // CrearReward PopUp
    const crearRewardButton = document.getElementById('CrearReward'); //
    const popUpReward = document.querySelector('.PopUpReward'); //
    const closeRewardButton = popUpReward ? popUpReward.querySelector('.close-reward') : null; //

    if (crearRewardButton && popUpReward) {
        crearRewardButton.addEventListener('click', function () { //
            popUpReward.style.display = 'flex'; //
        });
    }
    if (closeRewardButton && popUpReward) {
        closeRewardButton.addEventListener('click', function () { //
            popUpReward.style.display = 'none'; //
        });
    }

    // CrearChat PopUp
    const crearChatButton = document.getElementById('CrearChat'); //
    const popUpChat = document.querySelector('.PopUpChat'); //
    const closeChatButton = popUpChat ? popUpChat.querySelector('.close-chat') : null; //

    if (crearChatButton && popUpChat) {
        crearChatButton.addEventListener('click', function () { //
            popUpChat.style.display = 'flex'; //
        });
    }
    if (closeChatButton && popUpChat) {
        closeChatButton.addEventListener('click', function () { //
            popUpChat.style.display = 'none'; //
        });
    }
    
    // CrearDelete PopUp
    const crearDeleteButton = document.getElementById('CrearDelete'); //
    const popUpDelete = document.querySelector('.PopUpDelete'); //
    const closeDeleteButton = popUpDelete ? popUpDelete.querySelector('.close-delete') : null; //

    if (crearDeleteButton && popUpDelete) {
        crearDeleteButton.addEventListener('click', function () { //
            popUpDelete.style.display = 'flex'; //
        });
    }
    if (closeDeleteButton && popUpDelete) {
        closeDeleteButton.addEventListener('click', function () { //
            popUpDelete.style.display = 'none'; //
        });
    }

    // PopUpCall
    const callTriggers = document.querySelectorAll('.call-trigger'); //
    const popUpCall = document.querySelector('.PopUpCall'); //
    const closeCallButton = popUpCall ? popUpCall.querySelector('.close-call') : null; //

    if (popUpCall) { // Asegurarse que popUpCall exista
        callTriggers.forEach(icon => { //
            icon.addEventListener('click', function() { //
                popUpCall.style.display = 'flex'; //
            });
        });
    
        if (closeCallButton) {
            closeCallButton.addEventListener('click', function() { //
                popUpCall.style.display = 'none'; //
            });
        }
    }

    // Tu código existente para el scroll horizontal de .chat-to
    // (ya lo moví arriba para que `chatToContainer` esté definido)

    // Tu código existente para agregar botones de usuarios al crear nuevo chat
    // (ya lo moví arriba)
    
    // El código de simulación de participantes de llamada
    const participants = [ //
        { name: "Skibidi", img: "../multimedia/logo.jpg" } // Ajustada ruta de imagen
    ];

    const container_call = document.querySelector(".sep-call"); //
    if (container_call) { // Verificar si el elemento existe
        container_call.innerHTML = ""; //

        participants.forEach(p => { //
            container_call.innerHTML += `
              <div class="new-call">
                <img src="${p.img}" alt="${p.name}">
              </div>
            `; //
        });

        if (participants.length === 1) { //
            container_call.style.display = "flex"; //
            container_call.style.justifyContent = "center"; //
            container_call.style.alignItems = "center"; //
        }
    }

}); // Fin del DOMContentLoaded

// Funciones toggleMic y toggleVideo (tu código existente)
function toggleMic(button) { //
    const icon = button.querySelector('i'); //
    icon.classList.toggle('fa-microphone'); //
    icon.classList.toggle('fa-microphone-slash'); //
}

function toggleVideo(button) { //
    const icon = button.querySelector('i'); //
    icon.classList.toggle('fa-video-slash'); //
    icon.classList.toggle('fa-video'); //
}