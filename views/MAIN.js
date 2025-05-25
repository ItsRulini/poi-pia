// MAIN.js

// Variables globales para el usuario y el chat activo
let idUsuarioActualGlobal = null;
let avatarUsuarioActualGlobal = '../multimedia/logo.jpg'; // Valor por defecto
let nombreUsuarioActualGlobal = 'Yo'; // Valor por defecto
let chatActivoId = null;
let pollingIntervalId = null;
let ultimoIdMensajeRecibido = 0;

// --- Cargar Datos del Usuario para el Sidebar (y guardar su ID y avatar) ---
function cargarDatosUsuarioSidebar() {
    fetch('../controllers/getMainUsuarioController.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Respuesta de red no fue OK para getMainUsuarioController: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.idUsuario) {
                const sidebarUsernameElement = document.getElementById('sidebarUsername');
                const sidebarUserAvatarElement = document.getElementById('sidebarUserAvatar');

                idUsuarioActualGlobal = data.idUsuario;
                nombreUsuarioActualGlobal = data.usuario;

                if (sidebarUsernameElement) {
                    sidebarUsernameElement.textContent = data.usuario || 'Usuario';
                }
                if (sidebarUserAvatarElement) {
                    if (data.avatar) {
                        avatarUsuarioActualGlobal = `../multimedia/imagenPerfil/${data.avatar}`;
                        sidebarUserAvatarElement.src = avatarUsuarioActualGlobal;
                    } else {
                        // Mantener la imagen por defecto si no hay avatar específico
                        sidebarUserAvatarElement.src = '../multimedia/logo.jpg'; //
                        avatarUsuarioActualGlobal = '../multimedia/logo.jpg'; // Actualizar global también
                    }
                }
            } else {
                console.warn('No se pudieron cargar los datos del usuario para el sidebar:', data.message);
                if (data.message.toLowerCase().includes('no autenticado') || data.message.toLowerCase().includes('acceso denegado')) {
                    // Considerar redirigir al login si es un error crítico de autenticación
                    // window.location.href = 'LOGIN.html';
                }
            }
        })
        .catch(error => {
            console.error('Error al cargar datos del usuario para el sidebar:', error);
            // Considerar redirigir al login si es un error crítico de conexión
            // window.location.href = 'LOGIN.html';
        });
}

// --- Abrir un Chat y Cargar sus Mensajes ---
function abrirChat(idChat, nombreChat, tipoChat) {
    console.log(`Abriendo chat ID: ${idChat}, Nombre: ${nombreChat}, Tipo: ${tipoChat}`);
    
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
    }
    ultimoIdMensajeRecibido = 0; 

    chatActivoId = idChat;

    const chatDisplayNameElement = document.getElementById('chatActivoNombre'); // ID que pusimos en MAIN.html
    if (chatDisplayNameElement) {
        chatDisplayNameElement.textContent = nombreChat;
    }

    const windowChatMessages = document.getElementById('windowChatMessages'); // ID que pusimos en MAIN.html
    if (windowChatMessages) {
        windowChatMessages.innerHTML = `<p class="placeholder-chat-message" style="text-align:center; color: #8b6247;">Cargando mensajes para ${nombreChat}...</p>`;
        cargarMensajesDelChat(idChat);
    }

    const crearTaskButton = document.getElementById('Crear'); // Botón Tasks del header
    if (crearTaskButton) {
        if (tipoChat === 'Grupo') {
            crearTaskButton.style.pointerEvents = 'auto';
            crearTaskButton.style.opacity = '1';
            // Aquí también podrías verificar si el usuario actual es el creador del chat
            // para habilitar opciones específicas de admin dentro del pop-up de tareas.
        } else { // Privado
            crearTaskButton.style.pointerEvents = 'none';
            crearTaskButton.style.opacity = '0.5';
        }
    }
    iniciarPollingNuevosMensajes(idChat);
}

function formatearTimestamp(sqlTimestamp) {
    if (!sqlTimestamp) return '';

    // Intenta parsear la fecha directamente.
    // JavaScript new Date() con una cadena como "YYYY-MM-DD HH:MM:SS"
    // a menudo la interpreta como hora local por defecto.
    const fechaString = sqlTimestamp.replace(' ', 'T');
    const fecha = new Date(fechaString);

    // Verifica si la fecha es válida después del parseo
    if (isNaN(fecha.getTime())) {
        console.error("Fecha inválida recibida del servidor:", sqlTimestamp);
        return "Fecha inválida"; 
    }

    return fecha.toLocaleString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit', 
        day: 'numeric', // 'numeric' o '2-digit'
        month: 'short', // 'short', 'long', 'numeric', '2-digit'
        // year: 'numeric' // Opcional
        // timeZoneName: 'short' // Opcional, para ver qué zona horaria está usando el navegador
    });
}

// --- Mostrar un Mensaje en la UI ---
function mostrarMensajeEnUI(mensaje, agregarAlInicio = false) {
    const windowChatMessages = document.getElementById('windowChatMessages');
    if (!windowChatMessages) return;

    const placeholderMessage = windowChatMessages.querySelector('p.placeholder-chat-message');
    if (placeholderMessage) {
        placeholderMessage.remove();
    }

    // Comprobar si el mensaje ya existe para evitar duplicados por polling
    if (document.querySelector(`.window-bubble[data-message-id='${mensaje.idMensaje}'], .window-bubble-dos[data-message-id='${mensaje.idMensaje}']`)) {
        // Si el mensaje ya existe, solo nos aseguramos de actualizar el ultimoIdMensajeRecibido si es necesario
        if (parseInt(mensaje.idMensaje, 10) > ultimoIdMensajeRecibido) {
            ultimoIdMensajeRecibido = parseInt(mensaje.idMensaje, 10);
        }
        return; // No añadir el mensaje de nuevo
    }

    const esMensajePropio = parseInt(mensaje.idRemitente, 10) === parseInt(idUsuarioActualGlobal, 10);

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add(esMensajePropio ? 'window-bubble-dos' : 'window-bubble'); //
    bubbleDiv.classList.add(esMensajePropio ? 'message-sent' : 'message-received');
    bubbleDiv.dataset.messageId = mensaje.idMensaje;

    const imgAvatar = document.createElement('img');
    imgAvatar.alt = esMensajePropio ? nombreUsuarioActualGlobal : mensaje.remitenteUsuario;
    imgAvatar.src = esMensajePropio ? avatarUsuarioActualGlobal : (mensaje.remitenteAvatar ? `../multimedia/imagenPerfil/${mensaje.remitenteAvatar}` : '../multimedia/logo.jpg');
    imgAvatar.classList.add(esMensajePropio ? 'BubblePicDos' : 'BubblePic'); //

    const messageContentDiv = document.createElement('div');
    messageContentDiv.classList.add('message-content');

    const senderP = document.createElement('p');
    senderP.classList.add('message-sender');
    senderP.textContent = esMensajePropio ? 'Tú' : (mensaje.remitenteUsuario || 'Usuario Desconocido');
    
    const textContainerDiv = document.createElement('div');
    textContainerDiv.classList.add('message-text-container');

    const textP = document.createElement('p');
    textP.classList.add('message-text');
    textP.textContent = mensaje.texto || '';

    if (mensaje.multimediaUrl) {
        // ... (lógica para multimedia como en la respuesta anterior) ...
        const mediaLink = document.createElement('a');
        mediaLink.href = mensaje.multimediaUrl;
        mediaLink.target = "_blank";
        const extension = mensaje.multimediaUrl.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
            const imgMedia = document.createElement('img');
            imgMedia.src = mensaje.multimediaUrl;
            imgMedia.style.maxWidth = '200px'; imgMedia.style.maxHeight = '200px';
            imgMedia.style.borderRadius = '10px'; imgMedia.style.marginTop = '5px';
            mediaLink.appendChild(imgMedia);
        } else {
            mediaLink.textContent = "Ver Archivo Adjunto";
        }
        textP.appendChild(document.createElement('br'));
        textP.appendChild(mediaLink);
    }
    
    textContainerDiv.appendChild(textP);

    const timestampP = document.createElement('p');
    timestampP.classList.add('message-timestamp');
    timestampP.textContent = formatearTimestamp(mensaje.fechaEnvio);

    messageContentDiv.appendChild(senderP);
    messageContentDiv.appendChild(textContainerDiv);
    messageContentDiv.appendChild(timestampP);

    if (esMensajePropio) {
        bubbleDiv.appendChild(messageContentDiv);
        bubbleDiv.appendChild(imgAvatar);
    } else {
        bubbleDiv.appendChild(imgAvatar);
        bubbleDiv.appendChild(messageContentDiv);
    }

    if (agregarAlInicio) {
        windowChatMessages.prepend(bubbleDiv);
    } else {
        windowChatMessages.appendChild(bubbleDiv);
        windowChatMessages.scrollTop = windowChatMessages.scrollHeight;
    }
    
    if (parseInt(mensaje.idMensaje, 10) > ultimoIdMensajeRecibido) {
        ultimoIdMensajeRecibido = parseInt(mensaje.idMensaje, 10);
    }
}

// --- Cargar Historial de Mensajes ---
function cargarMensajesDelChat(idChat) {
    const windowChatMessages = document.getElementById('windowChatMessages');
    if (!windowChatMessages) return;
    ultimoIdMensajeRecibido = 0; // Resetear al cargar historial

    fetch(`../controllers/getMensajesController.php?idChat=${idChat}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar mensajes: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            windowChatMessages.innerHTML = '';
            if (data.status === 'success' && data.mensajes) {
                if (data.mensajes.length === 0) {
                    windowChatMessages.innerHTML = '<p class="placeholder-chat-message" style="text-align:center; color: #8b6247;">No hay mensajes aún. ¡Envía el primero!</p>';
                    return;
                }
                data.mensajes.forEach(mensaje => {
                    mostrarMensajeEnUI(mensaje);
                });
                 // Asegurar que ultimoIdMensajeRecibido sea el del último mensaje cargado del historial
                if (data.mensajes.length > 0) {
                    ultimoIdMensajeRecibido = parseInt(data.mensajes[data.mensajes.length - 1].idMensaje, 10);
                }

            } else {
                windowChatMessages.innerHTML = `<p class="placeholder-chat-message" style="text-align:center; color: red;">${data.message || 'Error al cargar mensajes.'}</p>`;
            }
            windowChatMessages.scrollTop = windowChatMessages.scrollHeight;
        })
        .catch(error => {
            console.error('Fetch error para getMensajesController:', error);
            if (windowChatMessages) {
                 windowChatMessages.innerHTML = '<p class="placeholder-chat-message" style="text-align:center; color: red;">Error de conexión al cargar mensajes.</p>';
            }
        });
}

// --- Polling para Nuevos Mensajes ---
function iniciarPollingNuevosMensajes(idChat) {
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
    }
    pollingIntervalId = setInterval(() => {
        fetchNuevosMensajes(idChat);
    }, 3000);
}

function fetchNuevosMensajes(idChat) {
    if (!idChat || idUsuarioActualGlobal === null) return;

    fetch(`../controllers/getNuevosMensajesController.php?idChat=${idChat}&ultimoIdMensaje=${ultimoIdMensajeRecibido}`)
        .then(response => {
            if (!response.ok) {
                console.warn('Error en polling de nuevos mensajes: ' + response.statusText);
                return null; 
            }
            return response.json();
        })
        .then(data => {
            if (data && data.status === 'success' && data.mensajes && data.mensajes.length > 0) {
                data.mensajes.forEach(mensaje => {
                    mostrarMensajeEnUI(mensaje);
                });
            } else if (data && data.status === 'error') {
                console.warn('Error del servidor al obtener nuevos mensajes:', data.message);
            }
        })
        .catch(error => {
            console.warn('Error de conexión en polling de nuevos mensajes:', error);
        });
}

// --- Lógica para Cargar Últimos Chats ---
function cargarUltimosChats() {
    const chatsDisplayContainer = document.querySelector('.chats-display'); //
    if (!chatsDisplayContainer) return;
    chatsDisplayContainer.innerHTML = '<p style="text-align:center; color: #8b6247;">Cargando tus chats...</p>'; 

    fetch('../controllers/getChatsController.php')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar chats: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            chatsDisplayContainer.innerHTML = '';
            if (data.status === 'success' && data.chats) {
                if (data.chats.length === 0) {
                    chatsDisplayContainer.innerHTML = '<p style="text-align:center; color: #8b6247;">No tienes chats aún. ¡Crea uno!</p>';
                    return;
                }
                data.chats.forEach(chat => {
                    const chatDiv = document.createElement('div');
                    chatDiv.classList.add('chats-active'); //
                    chatDiv.dataset.chatId = chat.idChat;
                    chatDiv.dataset.chatTipo = chat.tipo;
                    chatDiv.dataset.chatNombre = chat.nombreMostrado;

                    let avatarSrc = '../multimedia/logo.jpg'; //
                    if (chat.tipo === 'Privado' && chat.avatarMostrado) {
                        avatarSrc = `../multimedia/imagenPerfil/${chat.avatarMostrado}`;
                    } else if (chat.tipo === 'Grupo') {
                         avatarSrc = '../multimedia/logo.jpg'; // Placeholder para avatar de grupo
                    }
                    const ultimoMensaje = chat.ultimoMensajeTexto || "Haz clic para ver la conversación..."; // Necesitarías traer esto del backend

                    chatDiv.innerHTML = `
                        <div class="user-display-photo">
                            <img class="Pic" alt="Chat" src="${avatarSrc}">
                        </div>
                        <div class="user-convo">
                            <p class="username">${chat.nombreMostrado}</p>
                            <p class="conversation">${ultimoMensaje}</p>
                        </div>
                    `;
                    chatDiv.addEventListener('click', function() {
                        abrirChat(chat.idChat, chat.nombreMostrado, chat.tipo);
                    });
                    chatsDisplayContainer.appendChild(chatDiv);
                });
            } else {
                chatsDisplayContainer.innerHTML = `<p style="text-align:center; color: red;">${data.message || 'Error al cargar chats.'}</p>`;
            }
        })
        .catch(error => {
            console.error('Fetch error para getChatsController:', error);
            if (chatsDisplayContainer) {
                chatsDisplayContainer.innerHTML = '<p style="text-align:center; color: red;">Error de conexión al cargar chats.</p>';
            }
        });
}

// --- TODO EL CÓDIGO DEBE ESTAR DENTRO O SER LLAMADO DESDE DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", function () {
    cargarDatosUsuarioSidebar();
    cargarUltimosChats();

    // --- Selectores y Lógica para PopUp de Crear Chat ---
    const crearChatButton = document.getElementById('CrearChat'); //
    const popUpChat = document.querySelector('.PopUpChat'); //
    const closeChatButton = popUpChat ? popUpChat.querySelector('.close-chat') : null; //
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = popUpChat ? popUpChat.querySelector(".chat-to") : null; // Renombrado para evitar confusión
    const startChatButton = document.getElementById('startChatButton');
    const groupChatNameInputContainer = popUpChat ? popUpChat.querySelector('.group-chat-name-container') : null;
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    let selectedUsersForNewChat = [];

    if (crearChatButton && popUpChat) {
        crearChatButton.addEventListener('click', function () { //
            popUpChat.style.display = 'flex'; //
            loadUsersForNewChat();
        });
    }
    if (closeChatButton && popUpChat) {
        closeChatButton.addEventListener('click', function () { //
            popUpChat.style.display = 'none'; //
            resetNewChatPopup();
        });
    }

    function resetNewChatPopup() {
        if (userListForNewChatContainer) {
            userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Loading users...</p>';
        }
        if (chatToContainerNewChat) {
            while (chatToContainerNewChat.children.length > 1) {
                chatToContainerNewChat.removeChild(chatToContainerNewChat.lastChild);
            }
        }
        selectedUsersForNewChat = [];
        if (groupChatNameInputContainer) groupChatNameInputContainer.style.display = 'none';
        if (groupChatNameInput) groupChatNameInput.value = '';
    }

    function loadUsersForNewChat() {
        // ... (código de loadUsersForNewChat como en la respuesta anterior, usando chatToContainerNewChat)
        if (!userListForNewChatContainer) return;
        userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Loading users...</p>';
        selectedUsersForNewChat = []; 
        if (chatToContainerNewChat) { 
            while (chatToContainerNewChat.children.length > 1) {
                chatToContainerNewChat.removeChild(chatToContainerNewChat.lastChild);
            }
        }
        if (groupChatNameInputContainer) groupChatNameInputContainer.style.display = 'none';

        fetch('../controllers/getUsuariosController.php')
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar usuarios: ' + response.statusText);
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.usuarios) {
                    userListForNewChatContainer.innerHTML = ''; 
                    if (data.usuarios.length === 0) {
                        userListForNewChatContainer.innerHTML = '<p style="text-align:center; color: #8b6247;">No hay otros usuarios para chatear.</p>';
                        return;
                    }
                    data.usuarios.forEach(user => {
                        const userDiv = document.createElement('div');
                        userDiv.classList.add('new-convo'); //
                        userDiv.style.cursor = 'pointer';
                        userDiv.dataset.userId = user.idUsuario;
                        userDiv.dataset.username = user.usuario;

                        const userImg = document.createElement('img');
                        userImg.classList.add('new-pfp'); //
                        userImg.src = user.avatar ? `../multimedia/imagenPerfil/${user.avatar}` : '../multimedia/logo.jpg';
                        userImg.alt = user.usuario;

                        const userNameP = document.createElement('p');
                        userNameP.textContent = `${user.nombres || ''} ${user.paterno || ''} (${user.usuario})`;

                        userDiv.appendChild(userImg);
                        userDiv.appendChild(userNameP);

                        userDiv.addEventListener('click', function() {
                            toggleUserSelection(user.idUsuario, user.usuario);
                        });
                        userListForNewChatContainer.appendChild(userDiv);
                    });
                } else {
                    userListForNewChatContainer.innerHTML = `<p style="text-align:center; color: red;">${data.message || 'Error al cargar usuarios.'}</p>`;
                }
            })
            .catch(error => {
                console.error('Fetch error para getUsuariosController:', error);
                if (userListForNewChatContainer) {
                    userListForNewChatContainer.innerHTML = '<p style="text-align:center; color: red;">Error de conexión al cargar usuarios.</p>';
                }
            });
    }

    function toggleUserSelection(userId, username) {
        // ... (código de toggleUserSelection como en la respuesta anterior, usando chatToContainerNewChat)
        const index = selectedUsersForNewChat.indexOf(userId);
        const userElementInList = userListForNewChatContainer.querySelector(`.new-convo[data-user-id='${userId}']`);

        if (index > -1) { 
            selectedUsersForNewChat.splice(index, 1);
            const buttonToRemove = chatToContainerNewChat.querySelector(`button[data-user-id='${userId}']`);
            if (buttonToRemove) buttonToRemove.remove();
            if (userElementInList) userElementInList.classList.remove('selected-for-chat');
        } else { 
            selectedUsersForNewChat.push(userId);
            const userButton = document.createElement('button');
            userButton.setAttribute('data-user-id', userId);
            userButton.innerHTML = `${username} <i class="fa-solid fa-xmark"></i>`; //
            userButton.addEventListener('click', function() {
                toggleUserSelection(userId, username);
            });
            if (chatToContainerNewChat) chatToContainerNewChat.appendChild(userButton);
            if (userElementInList) userElementInList.classList.add('selected-for-chat');
        }

        if (groupChatNameInputContainer) {
            if (selectedUsersForNewChat.length > 1) {
                groupChatNameInputContainer.style.display = 'block';
            } else {
                groupChatNameInputContainer.style.display = 'none';
            }
        }
    }
    
    if (startChatButton) {
        startChatButton.addEventListener('click', function() {
            // ... (código del listener de startChatButton como en la respuesta anterior)
            if (selectedUsersForNewChat.length === 0) {
                alert("Please select at least one user to start a chat.");
                return;
            }
            let chatName = null;
            let chatType = selectedUsersForNewChat.length > 1 ? 'Grupo' : 'Privado';
            if (chatType === 'Grupo') {
                chatName = groupChatNameInput.value.trim();
                if (!chatName) {
                    alert("Please enter a name for the group chat.");
                    return;
                }
            }
            const chatData = {
                tipo: chatType,
                nombre: chatName,
                idsUsuarios: selectedUsersForNewChat
            };
            fetch('../controllers/crearChatController.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatData)
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                if (data.status === 'success') {
                    if(popUpChat) popUpChat.style.display = 'none';
                    resetNewChatPopup();
                    cargarUltimosChats();
                }
            })
            .catch(error => {
                console.error('Error al crear chat:', error);
                alert('Error de conexión al crear el chat.');
            });
        });
    }

    // --- Formulario de Envío de Mensajes ---
    const formEnviarMensaje = document.getElementById('formEnviarMensaje');
    const inputMensajeTexto = document.getElementById('inputMensajeTexto');

    if (formEnviarMensaje && inputMensajeTexto) {
        formEnviarMensaje.addEventListener('submit', function(event) {
            event.preventDefault();
            const texto = inputMensajeTexto.value.trim();

            if (!chatActivoId) {
                alert("Selecciona un chat para enviar mensajes.");
                return;
            }
            if (!texto) return;

            const datosMensaje = {
                idChat: chatActivoId,
                textoMensaje: texto
            };

            fetch('../controllers/enviarMensajeController.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosMensaje)
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.mensaje) {
                    mostrarMensajeEnUI(data.mensaje);
                    inputMensajeTexto.value = '';
                } else {
                    alert(data.message || "Error al enviar el mensaje.");
                }
            })
            .catch(error => {
                console.error('Error al enviar mensaje:', error);
                alert('Error de conexión al enviar el mensaje.');
            });
        });
    }

    // --- Manejo de otros PopUps (Tareas, Recompensas, Eliminar, Llamada) ---
    // (Reintegrar la lógica de los event listeners de tu MAIN.js original aquí,
    //  asegurándote de que los selectores .querySelector sean específicos para cada popup
    //  o que las variables de los popups no se sobrescriban)

    // PopUp Tareas (del header)
    const crearTaskBtnHeader = document.getElementById('Crear'); // Botón "Tasks" del header
    const popUpTasksView = document.querySelector('.PopUp'); // Este es el .PopUp para crear tareas según tu HTML original
    const closeTasksPopupBtn = popUpTasksView ? popUpTasksView.querySelector('.close') : null; //

    if (crearTaskBtnHeader && popUpTasksView) {
        crearTaskBtnHeader.addEventListener('click', function() { //
             // La lógica de habilitar/deshabilitar ya está en abrirChat()
            if (this.style.pointerEvents !== 'none') {
                 popUpTasksView.style.display = 'flex'; //
            } else {
                // Opcional: un mensaje más amigable
                // alert("Las tareas solo están disponibles en chats grupales."); 
            }
        });
    }
    if (closeTasksPopupBtn && popUpTasksView) {
        closeTasksPopupBtn.addEventListener('click', function() { //
            popUpTasksView.style.display = 'none'; //
        });
    }

    // PopUp Reclamar Recompensa
    const crearRewardButton = document.getElementById('CrearReward'); //
    const popUpReward = document.querySelector('.PopUpReward'); //
    const closeRewardButton = popUpReward ? popUpReward.querySelector('.close-reward') : null; //

    if (crearRewardButton && popUpReward) {
        // Este listener podría necesitar ser delegado si CrearReward se añade dinámicamente
        document.body.addEventListener('click', function(event) {
            if (event.target.id === 'CrearReward' || event.target.closest('#CrearReward')) {
                 popUpReward.style.display = 'flex'; //
            }
        });
    }
    if (closeRewardButton && popUpReward) {
        closeRewardButton.addEventListener('click', function() { //
            popUpReward.style.display = 'none'; //
        });
    }

    // PopUp Eliminar Chat
    const crearDeleteButton = document.getElementById('CrearDelete'); //
    const popUpDelete = document.querySelector('.PopUpDelete'); //
    const closeDeleteButton = popUpDelete ? popUpDelete.querySelector('.close-delete') : null; //

    if (crearDeleteButton && popUpDelete) {
        crearDeleteButton.addEventListener('click', function() { //
            popUpDelete.style.display = 'flex'; //
        });
    }
    if (closeDeleteButton && popUpDelete) {
        closeDeleteButton.addEventListener('click', function() { //
            popUpDelete.style.display = 'none'; //
        });
    }

    // PopUp Llamada
    const callTriggers = document.querySelectorAll('.call-trigger'); //
    const popUpCall = document.querySelector('.PopUpCall'); //
    const closeCallButton = popUpCall ? popUpCall.querySelector('.close-call') : null; //

    if (popUpCall) {
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
    
    // Scroll para usuarios en PopUpChat (tu código original, pero con selector específico)
    const chatToContainerScrollOriginal = document.querySelector(".PopUpChat .chat-to"); // Más específico
    if (chatToContainerScrollOriginal) {
        chatToContainerScrollOriginal.addEventListener("wheel", (event) => { //
          event.preventDefault(); //
          chatToContainerScrollOriginal.scrollLeft += event.deltaY; //
        });
    }

    // Agregar botones de usuarios al crear nuevo chat (código original, adaptado)
    // Esta parte de tu código original ya está integrada en `loadUsersForNewChat` y `toggleUserSelection`
    // por lo que no es necesario duplicarla aquí.

    // Simulación de participantes de llamada (tu código original)
    const participants = [ { name: "Skibidi", img: "../multimedia/logo.jpg" } ]; //
    const container_call = document.querySelector(".sep-call"); //
    if (container_call) {
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

// Funciones globales que no dependen directamente de que el DOM esté listo para su *definición*
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