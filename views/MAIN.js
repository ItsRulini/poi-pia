// MAIN.js Completo con implementación de videollamadas

// Variables globales
let idUsuarioActualGlobal = null;
let avatarUsuarioActualGlobal = '../multimedia/logo.jpg';
let nombreUsuarioActualGlobal = 'Yo';
let chatActivoId = null;
let pollingIntervalId = null;
let ultimoIdMensajeRecibido = 0;
let selectedUsersForNewChat = [];
let videoCallManager = null;

// --- INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener("DOMContentLoaded", function () {
    cargarDatosUsuarioSidebar();
    cargarUltimosChats();
    inicializarListenersFormularioMensajes();
    inicializarListenersPopUps();
    inicializarListenersOtros();
    
    // Inicializar el gestor de videollamadas después de cargar datos del usuario
    // setTimeout(() => {
    //     if (window.VideoCallManager) {
    //         videoCallManager = new VideoCallManager();
    //     }
    // }, 1000);
});

// --- CARGA DE DATOS INICIALES ---
function cargarDatosUsuarioSidebar() {
    fetch('../controllers/getMainUsuarioController.php')
        .then(response => {
            if (!response.ok) throw new Error('Error en getMainUsuarioController: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.idUsuario) {
                const sidebarUsernameElement = document.getElementById('sidebarUsername');
                const sidebarUserAvatarElement = document.getElementById('sidebarUserAvatar');

                idUsuarioActualGlobal = data.idUsuario;
                nombreUsuarioActualGlobal = data.usuario;

                if (sidebarUsernameElement) sidebarUsernameElement.textContent = data.usuario || 'Usuario';
                if (sidebarUserAvatarElement) {
                    if (data.avatar) {
                        avatarUsuarioActualGlobal = `../multimedia/imagenPerfil/${data.avatar}`;
                        sidebarUserAvatarElement.src = avatarUsuarioActualGlobal;
                    } else {
                        sidebarUserAvatarElement.src = '../multimedia/logo.jpg';
                        avatarUsuarioActualGlobal = '../multimedia/logo.jpg';
                    }
                }

                // UNA VEZ QUE idUsuarioActualGlobal ESTÁ LISTO, INICIALIZAMOS VideoCallManager
                if (window.VideoCallManager && !videoCallManager) { // Inicializar solo una vez
                    videoCallManager = new VideoCallManager();
                    videoCallManager.initializeAfterUserLoad(idUsuarioActualGlobal); // Pasar el ID
                }
            } else {
                console.warn('Sidebar: Datos de usuario no cargados.', data.message);
                if (data.message.toLowerCase().includes('no autenticado')) window.location.href = 'LOGIN.html';
            }
        })
        .catch(error => {
            console.error('Error fatal cargando datos del sidebar:', error);
        });
}

function cargarUltimosChats() {
    const chatsDisplayContainer = document.querySelector('.chats-display');
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
                    chatDiv.classList.add('chats-active');
                    chatDiv.dataset.chatId = chat.idChat;
                    chatDiv.dataset.chatTipo = chat.tipo;
                    chatDiv.dataset.chatNombre = chat.nombreMostrado;

                    let avatarSrc = '../multimedia/logo.jpg';
                    if (chat.tipo === 'Privado' && chat.avatarMostrado) {
                        avatarSrc = `../multimedia/imagenPerfil/${chat.avatarMostrado}`;
                    } else if (chat.tipo === 'Grupo') {
                        avatarSrc = '../multimedia/group_avatar_default.png';
                    }
                    const ultimoMensajeTexto = chat.ultimoMensajeTexto || "Haz clic para ver la conversación...";

                    chatDiv.innerHTML = `
                        <div class="user-display-photo">
                            <img class="Pic" alt="Chat" src="${avatarSrc}" onerror="this.src='../multimedia/logo.jpg';">
                        </div>
                        <div class="user-convo">
                            <p class="username">${chat.nombreMostrado}</p>
                            <p class="conversation">${ultimoMensajeTexto}</p>
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

// --- MANEJO DE CHAT ACTIVO ---
function abrirChat(idChat, nombreChat, tipoChat) {
    console.log(`Abriendo chat ID: ${idChat}, Nombre: ${nombreChat}, Tipo: ${tipoChat}`);
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    ultimoIdMensajeRecibido = 0;
    chatActivoId = idChat;

    if (videoCallManager) { // Verificar que la instancia exista
        videoCallManager.currentChatId = idChat;
    }

    const chatDisplayNameElement = document.getElementById('chatActivoNombre');
    if (chatDisplayNameElement) chatDisplayNameElement.textContent = nombreChat;

    const windowChatMessages = document.getElementById('windowChatMessages');
    if (windowChatMessages) {
        windowChatMessages.innerHTML = `<p class="placeholder-chat-message" style="text-align:center; color: #8b6247;">Cargando mensajes para ${nombreChat}...</p>`;
        cargarMensajesDelChat(idChat);
    }

    const crearTaskButton = document.getElementById('Crear');
    if (crearTaskButton) {
        if (tipoChat === 'Grupo') {
            crearTaskButton.style.pointerEvents = 'auto';
            crearTaskButton.style.opacity = '1';
        } else {
            crearTaskButton.style.pointerEvents = 'none';
            crearTaskButton.style.opacity = '0.5';
        }
    }
    
    // Notificar al VideoCallManager si existe
    if (window.videoCallManager) {
        window.videoCallManager.currentChatId = idChat;
    }
    
    iniciarPollingNuevosMensajes(idChat);
}

// --- FUNCIONES DE MENSAJERÍA ---
function formatearTimestamp(sqlTimestamp) {
    if (!sqlTimestamp) return '';
    const fechaString = sqlTimestamp.replace(' ', 'T');
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) {
        console.error("Fecha inválida recibida del servidor:", sqlTimestamp);
        const parts = sqlTimestamp.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            const dateFromParts = new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
            if (!isNaN(dateFromParts.getTime())) return dateFromParts.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
        }
        return "Fecha inválida";
    }
    return fecha.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}

function mostrarMensajeEnUI(mensaje, agregarAlInicio = false) {
    const windowChatMessages = document.getElementById('windowChatMessages');
    if (!windowChatMessages) return;

    const placeholderMessage = windowChatMessages.querySelector('p.placeholder-chat-message');
    if (placeholderMessage) placeholderMessage.remove();

    if (document.querySelector(`.window-bubble[data-message-id='${mensaje.idMensaje}'], .window-bubble-dos[data-message-id='${mensaje.idMensaje}']`)) {
        if (parseInt(mensaje.idMensaje, 10) > ultimoIdMensajeRecibido) {
            ultimoIdMensajeRecibido = parseInt(mensaje.idMensaje, 10);
        }
        return;
    }

    const esMensajePropio = parseInt(mensaje.idRemitente, 10) === parseInt(idUsuarioActualGlobal, 10);

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add(esMensajePropio ? 'window-bubble-dos' : 'window-bubble');
    bubbleDiv.classList.add(esMensajePropio ? 'message-sent' : 'message-received');
    bubbleDiv.dataset.messageId = mensaje.idMensaje;

    const imgAvatar = document.createElement('img');
    imgAvatar.alt = esMensajePropio ? nombreUsuarioActualGlobal : mensaje.remitenteUsuario;
    imgAvatar.src = esMensajePropio ? avatarUsuarioActualGlobal : (mensaje.remitenteAvatar ? `../multimedia/imagenPerfil/${mensaje.remitenteAvatar}` : '../multimedia/logo.jpg');
    imgAvatar.classList.add(esMensajePropio ? 'BubblePicDos' : 'BubblePic');
    imgAvatar.onerror = function() { this.src = '../multimedia/logo.jpg'; };

    const messageContentDiv = document.createElement('div');
    messageContentDiv.classList.add('message-content');

    const senderP = document.createElement('p');
    senderP.classList.add('message-sender');
    senderP.textContent = esMensajePropio ? 'Tú' : (mensaje.remitenteUsuario || 'Usuario');
    
    const textContainerDiv = document.createElement('div');
    textContainerDiv.classList.add('message-text-container');

    const textP = document.createElement('p');
    textP.classList.add('message-text');
    
    let contenidoPrincipalMostrado = false;

    if (mensaje.multimediaUrl) {
        const mediaContainer = document.createElement('div');
        mediaContainer.classList.add('media-message-container');
        const url = mensaje.multimediaUrl;
        const esUrlDeGoogleMaps = url.includes('google.com/maps') || url.includes('googleusercontent.com/maps');

        if (esUrlDeGoogleMaps) {
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Ver Ubicación en Mapa`;
            mediaContainer.appendChild(link);
            contenidoPrincipalMostrado = true;
        } else if (mensaje.texto === '[Imagen]' || (/\.(jpeg|jpg|gif|png)$/i).test(url)) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Imagen adjunta";
            img.style.maxWidth = "200px"; img.style.maxHeight = "200px";
            img.style.borderRadius = "10px"; img.style.cursor = "pointer";
            img.style.marginTop = "5px";
            img.onclick = () => window.open(url, '_blank');
            mediaContainer.appendChild(img);
            contenidoPrincipalMostrado = true;
        } else if (mensaje.texto === '[Video]' || (/\.(mp4|webm|ogg|mov)$/i).test(url)) {
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.style.maxWidth = "250px"; video.style.borderRadius = "10px";
            mediaContainer.appendChild(video);
            contenidoPrincipalMostrado = true;
        } else if (mensaje.texto === '[Audio]' || (/\.(mp3|wav|aac|ogg)$/i).test(url)) {
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            mediaContainer.appendChild(audio);
            contenidoPrincipalMostrado = true;
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.textContent = (mensaje.texto && mensaje.texto !== '[Archivo Adjunto]') ? mensaje.texto : (url.substring(url.lastIndexOf('/') + 1) || "Ver Archivo Adjunto");
            mediaContainer.appendChild(link);
            if (mensaje.texto === '[Archivo Adjunto]' || mensaje.texto === link.textContent) contenidoPrincipalMostrado = true;
        }
        textContainerDiv.appendChild(mediaContainer);
    }
    
    if (!contenidoPrincipalMostrado || (mensaje.texto && mensaje.texto !== '[Imagen]' && mensaje.texto !== '[Video]' && mensaje.texto !== '[Audio]' && mensaje.texto !== '[Ubicación]' && mensaje.texto !== '[Archivo Adjunto]')) {
        textP.textContent = mensaje.texto || '';
        textContainerDiv.appendChild(textP);
    } else if (textContainerDiv.childNodes.length === 0) {
        textP.textContent = mensaje.texto || '';
         textContainerDiv.appendChild(textP);
    }

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
        if (windowChatMessages.scrollHeight - windowChatMessages.scrollTop < windowChatMessages.clientHeight + 200) {
             windowChatMessages.scrollTop = windowChatMessages.scrollHeight;
        }
    }
    
    if (parseInt(mensaje.idMensaje, 10) > ultimoIdMensajeRecibido) {
        ultimoIdMensajeRecibido = parseInt(mensaje.idMensaje, 10);
    }
}

function cargarMensajesDelChat(idChat) {
    const windowChatMessages = document.getElementById('windowChatMessages');
    if (!windowChatMessages) return;
    ultimoIdMensajeRecibido = 0;

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
                data.mensajes.forEach(mensaje => mostrarMensajeEnUI(mensaje));
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

function iniciarPollingNuevosMensajes(idChat) {
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    pollingIntervalId = setInterval(() => fetchNuevosMensajes(idChat), 3000);
}

function fetchNuevosMensajes(idChat) {
    if (!idChat || idUsuarioActualGlobal === null) return;
    fetch(`../controllers/getNuevosMensajesController.php?idChat=${idChat}&ultimoIdMensaje=${ultimoIdMensajeRecibido}`)
        .then(response => {
            if (!response.ok) {
                console.warn('Polling: ' + response.statusText); return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.status === 'success' && data.mensajes && data.mensajes.length > 0) {
                data.mensajes.forEach(mensaje => mostrarMensajeEnUI(mensaje));
            } else if (data && data.status === 'error') {
                console.warn('Polling error:', data.message);
            }
        })
        .catch(error => console.warn('Polling connection error:', error));
}

// --- INICIALIZACIÓN DE LISTENERS Y FUNCIONES ---
function inicializarListenersFormularioMensajes() {
    const formEnviarMensaje = document.getElementById('formEnviarMensaje');
    const inputMensajeTexto = document.getElementById('inputMensajeTexto');
    const btnAdjuntarMedia = document.getElementById('btnAdjuntarMedia');
    const inputMediaFile = document.getElementById('inputMediaFile');
    const btnEnviarUbicacion = document.getElementById('btnEnviarUbicacion');

    if (btnAdjuntarMedia && inputMediaFile) {
        btnAdjuntarMedia.addEventListener('click', () => inputMediaFile.click());
        inputMediaFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && chatActivoId) subirArchivoACloudinary(file);
            inputMediaFile.value = null;
        });
    }

    if(btnEnviarUbicacion) {
        btnEnviarUbicacion.addEventListener('click', () => {
            if (!chatActivoId) { alert("Selecciona un chat para enviar tu ubicación."); return; }
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const googleMapsUrl = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
                    enviarMensajeAlServidor(null, googleMapsUrl, 'location');
                }, error => {
                    console.error("Error obteniendo ubicación: ", error);
                    alert("No se pudo obtener tu ubicación. Asegúrate de tener los permisos activados.");
                });
            } else {
                alert("La geolocalización no es soportada por este navegador.");
            }
        });
    }

    if (formEnviarMensaje && inputMensajeTexto) {
        formEnviarMensaje.addEventListener('submit', (event) => {
            event.preventDefault();
            const texto = inputMensajeTexto.value.trim();
            if (!chatActivoId) { alert("Selecciona un chat para enviar mensajes."); return; }
            if (texto) enviarMensajeAlServidor(texto, null);
        });
    }
}

// --- FUNCIONES DE SUBIDA CON CLOUDINARY ---
function subirArchivoACloudinary(file) {
    if (!file || !chatActivoId) return;

    const tempMessageId = `temp_${Date.now()}`;
    mostrarMensajeEnUI({
        idMensaje: tempMessageId,
        idRemitente: idUsuarioActualGlobal,
        texto: `Subiendo ${file.name}...`,
        remitenteUsuario: nombreUsuarioActualGlobal,
        remitenteAvatar: avatarUsuarioActualGlobal,
        fechaEnvio: new Date().toISOString().slice(0, 19).replace('T', ' '),
        esTemporal: true
    });

    const cloudName = 'ddrffjanq';
    const uploadPreset = 'poi_unsigned';
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'poi');

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        const downloadURL = data.secure_url;
        const textoOriginal = document.getElementById('inputMensajeTexto').value.trim();
        let tipoParaPlaceholder = file.type || '';
        if (!tipoParaPlaceholder && file.name) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) tipoParaPlaceholder = 'image/';
            else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) tipoParaPlaceholder = 'video/';
            else if (['mp3', 'wav', 'aac'].includes(ext)) tipoParaPlaceholder = 'audio/';
        }
        enviarMensajeAlServidor(textoOriginal, downloadURL, tipoParaPlaceholder);
        const el = document.querySelector(`[data-message-id='${tempMessageId}']`); if (el) el.remove();
        if (textoOriginal) document.getElementById('inputMensajeTexto').value = '';
    })
    .catch(error => {
        console.error("Error al subir a Cloudinary:", error);
        alert("No se pudo subir el archivo.");
        const el = document.querySelector(`[data-message-id='${tempMessageId}']`); if (el) el.remove();
    });
}

function enviarMensajeAlServidor(texto, multimediaUrl = null, tipoMultimedia = null) {
    if (!chatActivoId) { alert("Selecciona un chat."); return; }
    if ((texto === null || texto.trim() === '') && !multimediaUrl) return;

    let textoParaEnviar = texto;
    if ((texto === null || texto.trim() === '') && multimediaUrl) {
        if (tipoMultimedia && tipoMultimedia.startsWith('image/')) textoParaEnviar = '[Imagen]';
        else if (tipoMultimedia && tipoMultimedia.startsWith('video/')) textoParaEnviar = '[Video]';
        else if (tipoMultimedia && tipoMultimedia.startsWith('audio/')) textoParaEnviar = '[Audio]';
        else if (tipoMultimedia === 'location') textoParaEnviar = '[Ubicación]';
        else textoParaEnviar = '[Archivo Adjunto]';
    }

    const datosMensaje = { idChat: chatActivoId, textoMensaje: textoParaEnviar, multimediaUrl: multimediaUrl };

    fetch('../controllers/enviarMensajeController.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosMensaje)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' && data.mensaje) {
            mostrarMensajeEnUI(data.mensaje);
            if (texto !== null && texto.trim() !== '' && textoParaEnviar === texto) {
                document.getElementById('inputMensajeTexto').value = '';
            }
        } else { alert(data.message || "Error al enviar mensaje."); }
    })
    .catch(error => { console.error('Error enviarMensajeAlServidor:', error); alert('Error de conexión.'); });
}

// --- INICIALIZACIÓN DE LISTENERS PARA POPUPS Y OTROS ---
function inicializarListenersPopUps() {
    const popUpConfigs = [
        { btnId: 'Crear',       popUpSelector: '.PopUp',         closeSelector: '.PopUp .close' },
        { btnId: 'CrearReward', popUpSelector: '.PopUpReward',   closeSelector: '.PopUpReward .close-reward' },
        { btnId: 'CrearChat',   popUpSelector: '.PopUpChat',     closeSelector: '.PopUpChat .close-chat', action: loadUsersForNewChat },
        { btnId: 'CrearDelete', popUpSelector: '.PopUpDelete',   closeSelector: '.PopUpDelete .close-delete' }
    ];

    popUpConfigs.forEach(config => {
        const btn = document.getElementById(config.btnId);
        const popUp = document.querySelector(config.popUpSelector);
        const closeBtn = popUp ? popUp.querySelector(config.closeSelector) : null;

        if (btn && popUp) {
            btn.addEventListener('click', () => {
                if (config.btnId === 'Crear' && btn.style.pointerEvents === 'none') {
                    alert("Las tareas solo están disponibles en chats grupales.");
                    return;
                }
                popUp.style.display = 'flex';
                if (config.action) config.action();
            });
        }
        if (closeBtn && popUp) {
            closeBtn.addEventListener('click', () => {
                popUp.style.display = 'none';
                if (config.popUpSelector === '.PopUpChat') resetNewChatPopup();
            });
        }
    });
}

function inicializarListenersOtros() {
    // Scroll para usuarios en PopUpChat
    const chatToContainerScrollOriginal = document.querySelector(".PopUpChat .chat-to");
    if (chatToContainerScrollOriginal) {
        chatToContainerScrollOriginal.addEventListener("wheel", (event) => {
            event.preventDefault();
            chatToContainerScrollOriginal.scrollLeft += event.deltaY;
        });
    }

    // Lógica para el PopUp de "Crear Chat"
    const startChatButton = document.getElementById('startChatButton');
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');

    if (startChatButton) {
        startChatButton.addEventListener('click', function() {
            if (selectedUsersForNewChat.length === 0) {
                alert("Por favor selecciona al menos un usuario para iniciar un chat.");
                return;
            }
            let chatName = null;
            let chatType = selectedUsersForNewChat.length > 1 ? 'Grupo' : 'Privado';
            if (chatType === 'Grupo') {
                chatName = groupChatNameInput.value.trim();
                if (!chatName) {
                    alert("Por favor ingresa un nombre para el chat grupal.");
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
                const popUpChatElement = document.querySelector('.PopUpChat');
                if (data.status === 'success') {
                    if(popUpChatElement) popUpChatElement.style.display = 'none';
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
}

// Funciones para crear nuevo chat
function resetNewChatPopup() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    
    selectedUsersForNewChat = [];

    if (userListForNewChatContainer) {
        userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Cargando usuarios...</p>';
    }
    if (chatToContainerNewChat) {
        while (chatToContainerNewChat.children.length > 1) {
            chatToContainerNewChat.removeChild(chatToContainerNewChat.lastChild);
        }
    }
    if (groupChatNameInputContainer) groupChatNameInputContainer.style.display = 'none';
    if (groupChatNameInput) groupChatNameInput.value = '';
}

function loadUsersForNewChat() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');

    if (!userListForNewChatContainer) return;
    userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Cargando usuarios...</p>';
    
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
                    userDiv.classList.add('new-convo');
                    userDiv.style.cursor = 'pointer';
                    userDiv.dataset.userId = user.idUsuario;
                    userDiv.dataset.username = user.usuario;

                    const userImg = document.createElement('img');
                    userImg.classList.add('new-pfp');
                    userImg.src = user.avatar ? `../multimedia/imagenPerfil/${user.avatar}` : '../multimedia/logo.jpg';
                    userImg.alt = user.usuario;
                    userImg.onerror = function() { this.src = '../multimedia/logo.jpg'; };

                    const userNameP = document.createElement('p');
                    userNameP.textContent = `${user.nombres || ''} ${user.paterno || ''} (${user.usuario})`;

                    userDiv.appendChild(userImg);
                    userDiv.appendChild(userNameP);

                    userDiv.addEventListener('click', function() {
                        toggleUserSelectionForNewChat(user.idUsuario, user.usuario);
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

function toggleUserSelectionForNewChat(userId, username) {
    const userListContainer = document.getElementById('userListForNewChat');
    const chatToCont = document.querySelector('.PopUpChat .chat-to');
    const groupChatNameCont = document.querySelector('.PopUpChat .group-chat-name-container');

    const index = selectedUsersForNewChat.indexOf(userId);
    const userElementInList = userListContainer.querySelector(`.new-convo[data-user-id='${userId}']`);

    if (index > -1) { 
        selectedUsersForNewChat.splice(index, 1);
        const buttonToRemove = chatToCont.querySelector(`button[data-user-id='${userId}']`);
        if (buttonToRemove) buttonToRemove.remove();
        if (userElementInList) userElementInList.classList.remove('selected-for-chat');
    } else { 
        selectedUsersForNewChat.push(userId);
        const userButton = document.createElement('button');
        userButton.setAttribute('data-user-id', userId);
        userButton.innerHTML = `${username} <i class="fa-solid fa-xmark"></i>`;
        userButton.addEventListener('click', function() {
            toggleUserSelectionForNewChat(userId, username);
        });
        if (chatToCont) chatToCont.appendChild(userButton);
        if (userElementInList) userElementInList.classList.add('selected-for-chat');
    }

    if (groupChatNameCont) {
        if (selectedUsersForNewChat.length > 1) {
            groupChatNameCont.style.display = 'block';
        } else {
            groupChatNameCont.style.display = 'none';
        }
    }
}

// Función para obtener usuarios del chat actual
async function obtenerUsuariosDelChat(chatId) {
    try {
        const response = await fetch(`../controllers/getUsuariosChatController.php?idChat=${chatId}`);
        if (!response.ok) throw new Error('Error al obtener usuarios del chat');
        const data = await response.json();
        return data.usuarios || [];
    } catch (error) {
        console.error('Error obteniendo usuarios del chat:', error);
        return [];
    }
}

// Agregar estilos CSS dinámicamente para las videollamadas
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .video-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #fff;
        font-size: 18px;
    }
    
    .video-error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #ff4757;
        font-size: 16px;
        text-align: center;
        padding: 20px;
    }
    
    .call-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4a9eff;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(74, 158, 255, 0.5);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    }
    
    .call-notification-buttons {
        margin-top: 10px;
        display: flex;
        gap: 10px;
    }
    
    .call-notification-buttons button {
        padding: 5px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    
    .call-notification-buttons .accept-call {
        background-color: #4caf50;
        color: white;
    }
    
    .call-notification-buttons .accept-call:hover {
        background-color: #45a049;
    }
    
    .call-notification-buttons .reject-call {
        background-color: #f44336;
        color: white;
    }
    
    .call-notification-buttons .reject-call:hover {
        background-color: #da190b;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(styleSheet);