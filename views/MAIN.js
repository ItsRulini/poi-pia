// MAIN.js Completo con implementación de videollamadas Agora

// Variables globales
let idUsuarioActualGlobal = null;
let avatarUsuarioActualGlobal = '../multimedia/logo.jpg';
let nombreUsuarioActualGlobal = 'Yo';
let chatActivoId = null; // Este se usará como nombre del canal de Agora
let pollingIntervalId = null;
let ultimoIdMensajeRecibido = 0;
let selectedUsersForNewChat = [];
// let videoCallManager = null; // Removido, usaremos funciones directas de Agora

// --- AGORA CONFIGURATION ---
const AGORA_APP_ID = 'ee7d538a95e24249bf0930ff97722936'; // Tu App ID de Agora
let agoraClient = null;
let localAudioTrack = null;
let localVideoTrack = null;
let remoteUsers = {}; // Para rastrear usuarios remotos y sus streams
let currentAgoraChannel = null; // Nombre del canal actual de Agora
let agoraUID = null; // UID del usuario actual en el canal de Agora

// Para desarrollo, puedes usar null si tu proyecto Agora no tiene certificado habilitado.
// Para producción, DEBES generar tokens en un servidor.
let AGORA_TOKEN = null; // O un token temporal de la consola Agora si tu proyecto lo requiere.

let isMicEnabled = true; // Estado inicial del micrófono
let isVideoEnabled = true; // Estado inicial del video

// --- INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener("DOMContentLoaded", function () {
    cargarDatosUsuarioSidebar();
    cargarUltimosChats();
    inicializarListenersFormularioMensajes();
    inicializarListenersPopUps();
    inicializarListenersOtros();
    // El código de Agora se inicializa cuando se inicia una llamada.
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

                idUsuarioActualGlobal = data.idUsuario; // Importante para Agora si decides usarlo como UID
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
            } else {
                console.warn('Sidebar: Datos de usuario no cargados.', data.message);
                if (data.message && data.message.toLowerCase().includes('no autenticado')) window.location.href = 'LOGIN.html';
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
                    chatDiv.dataset.chatNombre = chat.nombreMostrado; // Guardamos el nombre para usarlo en videollamada

                    let avatarSrc = '../multimedia/logo.jpg';
                    if (chat.tipo === 'Privado' && chat.avatarMostrado) {
                        avatarSrc = `../multimedia/imagenPerfil/${chat.avatarMostrado}`;
                    } else if (chat.tipo === 'Grupo') {
                        avatarSrc = '../multimedia/group_avatar_default.png';
                    }
                    const ultimoMensajeTexto = chat.ultimoMensajeTexto || "Haz clic para ver la conversación...";

                    // --- EJEMPLO DE CÓMO PODRÍAS AÑADIR EL BOTÓN DE VIDEOLLAMADA DIRECTAMENTE EN EL CHAT LIST ITEM ---
                    // (Esto es opcional, tu actual trigger puede estar en la cabecera del chat una vez abierto)
                    
                    const videoCallIcon = document.createElement('i');
                    videoCallIcon.classList.add('fa-solid', 'fa-video', 'chat-list-video-icon'); // Añade una clase para estilizar
                    videoCallIcon.style.cursor = 'pointer';
                    videoCallIcon.style.marginLeft = '10px';
                    videoCallIcon.title = 'Iniciar videollamada';
                    videoCallIcon.addEventListener('click', (event) => {
                        event.stopPropagation(); // Prevenir que se abra el chat si solo se quiere llamar
                        iniciarVideollamada(chat.idChat, chat.nombreMostrado);
                    });
                    

                    chatDiv.innerHTML = `
                        <div class="user-display-photo">
                            <img class="Pic" alt="Chat" src="${avatarSrc}" onerror="this.src='../multimedia/logo.jpg';">
                        </div>
                        <div class="user-convo">
                            <p class="username">${chat.nombreMostrado}</p>
                            <p class="conversation">${ultimoMensajeTexto}</p>
                        </div>
                        `;
                    // chatDiv.querySelector('.user-convo').appendChild(videoCallIcon); // Si decides añadir el ícono arriba

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
    chatActivoId = idChat; // Usado para Agora channel name y para enviar mensajes

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
    iniciarPollingNuevosMensajes(idChat);
}


// --- AGORA VIDEO CALL FUNCTIONS ---
async function joinAgoraChannel(channelName) {
    if (!AGORA_APP_ID) {
        console.error("Agora App ID no está configurado.");
        alert("Error de configuración: Falta el App ID de Agora.");
        document.querySelector('.PopUpCall').style.display = 'none';
        return;
    }

    const loadingImg = document.querySelector('.PopUpCall .new-call-img');
    if (loadingImg) loadingImg.style.display = 'block';
    document.getElementById('local-video-container').innerHTML = '';
    document.getElementById('remote-video-container').innerHTML = '';


    currentAgoraChannel = String(channelName); // Asegurar que el nombre del canal es un string
    agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    agoraClient.on('user-published', handleUserPublished);
    agoraClient.on('user-unpublished', handleUserUnpublished);
    agoraClient.on('user-left', handleUserLeft);

    try {
        // Puedes usar idUsuarioActualGlobal si es numérico y quieres un UID específico,
        // o null para que Agora asigne uno. Para tokens, el UID debe coincidir.
        agoraUID = await agoraClient.join(AGORA_APP_ID, currentAgoraChannel, AGORA_TOKEN, null);

        [localAudioTrack, localVideoTrack] = await Promise.all([
            AgoraRTC.createMicrophoneAudioTrack(),
            AgoraRTC.createCameraVideoTrack()
        ]);

        isMicEnabled = true;
        isVideoEnabled = true;

        const localPlayerContainer = document.getElementById('local-video-container');
        localPlayerContainer.innerHTML = '';
        localPlayerContainer.style.display = 'block';
        localVideoTrack.play(localPlayerContainer, { fit: 'cover' });

        if (loadingImg) loadingImg.style.display = 'none';

        await agoraClient.publish([localAudioTrack, localVideoTrack]);
        console.log('Publicación local exitosa. UID:', agoraUID);
        updateCallButtonIcons();

    } catch (error) {
        console.error('Error al unirse al canal o publicar:', error);
        alert('No se pudo iniciar la videollamada. Revisa la consola (permisos de mic/cam denegados?).');
        if (loadingImg) loadingImg.style.display = 'block';
        await leaveAgoraCall();
    }
}

async function handleUserPublished(user, mediaType) {
    await agoraClient.subscribe(user, mediaType);
    console.log(`Usuario ${user.uid} publicó ${mediaType}`);
    remoteUsers[user.uid] = user;

    if (mediaType === 'video') {
        const remoteVideoContainer = document.getElementById('remote-video-container');
        let playerContainer = document.getElementById(`player-container-${user.uid}`);
        if (!playerContainer) {
            playerContainer = document.createElement('div');
            playerContainer.id = `player-container-${user.uid}`;
            playerContainer.className = 'remote-player-wrapper'; // Para estilizar
            // Ajusta estos estilos según necesites para múltiples usuarios
            playerContainer.style.width = '200px';
            playerContainer.style.height = '150px';
            playerContainer.style.margin = '5px';
            playerContainer.style.backgroundColor = '#000';
            remoteVideoContainer.append(playerContainer);
        }
        user.videoTrack.play(playerContainer, { fit: 'cover' });
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

function handleUserUnpublished(user, mediaType) {
    console.log(`Usuario ${user.uid} dejó de publicar ${mediaType}`);
    if (mediaType === 'video') {
        const playerContainer = document.getElementById(`player-container-${user.uid}`);
        if (playerContainer) {
            playerContainer.remove();
        }
    }
    // El audio se maneja internamente al despublicar o irse.
}

function handleUserLeft(user) {
    console.log(`Usuario ${user.uid} abandonó el canal`);
    delete remoteUsers[user.uid];
    const playerContainer = document.getElementById(`player-container-${user.uid}`);
    if (playerContainer) {
        playerContainer.remove();
    }
}

async function leaveAgoraCall() {
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        localAudioTrack = null;
    }
    if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        localVideoTrack = null;
    }

    const localPlayerContainer = document.getElementById('local-video-container');
    if (localPlayerContainer) localPlayerContainer.innerHTML = '';
    const remoteVideoContainer = document.getElementById('remote-video-container');
    if (remoteVideoContainer) remoteVideoContainer.innerHTML = '';

    if (agoraClient) {
        await agoraClient.leave();
        console.log('Cliente de Agora abandonó el canal');
        agoraClient.removeAllListeners(); // Buena práctica
        agoraClient = null;
    }
    currentAgoraChannel = null;
    agoraUID = null;
    remoteUsers = {};

    const popUpCall = document.querySelector('.PopUpCall');
    if (popUpCall) popUpCall.style.display = 'none';

    const loadingImg = document.querySelector('.PopUpCall .new-call-img');
    if (loadingImg) loadingImg.style.display = 'block';
}

function updateCallButtonIcons() {
    const micButtonIcon = document.querySelector('.mute-call i');
    const videoButtonIcon = document.querySelector('.add-call i');

    if (micButtonIcon) {
        if (isMicEnabled) {
            micButtonIcon.classList.remove('fa-microphone-slash');
            micButtonIcon.classList.add('fa-microphone');
        } else {
            micButtonIcon.classList.remove('fa-microphone');
            micButtonIcon.classList.add('fa-microphone-slash');
        }
    }

    if (videoButtonIcon) {
        if (isVideoEnabled) {
            videoButtonIcon.classList.remove('fa-video-slash');
            videoButtonIcon.classList.add('fa-video');
            document.getElementById('local-video-container').style.visibility = 'visible';
        } else {
            videoButtonIcon.classList.remove('fa-video');
            videoButtonIcon.classList.add('fa-video-slash');
            document.getElementById('local-video-container').style.visibility = 'hidden';
        }
    }
}

// --- FUNCIONES DE CONTROL DE LLAMADA (GLOBALES POR `onclick`) ---
// Estas funciones son llamadas por los `onclick` en tu MAIN.html
function toggleMic(buttonElement) {
    if (localAudioTrack) {
        isMicEnabled = !isMicEnabled;
        localAudioTrack.setMuted(!isMicEnabled); // setMuted(true) es silenciado
        updateCallButtonIcons();
    } else {
        console.log("Pista de audio local no disponible.");
    }
}

function toggleVideo(buttonElement) {
    if (localVideoTrack) {
        isVideoEnabled = !isVideoEnabled;
        localVideoTrack.setEnabled(isVideoEnabled); // setEnabled(false) "apaga" la cámara
        updateCallButtonIcons();
    } else {
        console.log("Pista de video local no disponible.");
    }
}

// --- FUNCIONES DE MENSAJERÍA (EXISTENTES) ---
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
        } else { // Archivo genérico
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.textContent = (mensaje.texto && mensaje.texto !== '[Archivo Adjunto]') ? mensaje.texto : (url.substring(url.lastIndexOf('/') + 1) || "Ver Archivo Adjunto");
            link.prepend(document.createElement('i').classList.add('fa-solid', 'fa-file-arrow-down', 'file-icon')); // Ícono de archivo
            mediaContainer.appendChild(link);
            if (mensaje.texto === '[Archivo Adjunto]' || mensaje.texto === link.textContent) contenidoPrincipalMostrado = true;
        }
        textContainerDiv.appendChild(mediaContainer);
    }
    
    if (!contenidoPrincipalMostrado || (mensaje.texto && mensaje.texto !== '[Imagen]' && mensaje.texto !== '[Video]' && mensaje.texto !== '[Audio]' && mensaje.texto !== '[Ubicación]' && mensaje.texto !== '[Archivo Adjunto]')) {
        textP.textContent = mensaje.texto || '';
        textContainerDiv.appendChild(textP);
    } else if (textContainerDiv.childNodes.length === 0 && mensaje.texto) { // Si solo hay texto (ej. solo "[Imagen]" sin URL)
        textP.textContent = mensaje.texto;
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
        // Scroll inteligente: solo si el usuario está cerca del final
        if (windowChatMessages.scrollHeight - windowChatMessages.scrollTop < windowChatMessages.clientHeight + 200) { // 200px de margen
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
                    // Asegurar que ultimoIdMensajeRecibido se actualiza con el último mensaje real
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
    pollingIntervalId = setInterval(() => fetchNuevosMensajes(idChat), 3000); // Revisa cada 3 segundos
}

function fetchNuevosMensajes(idChat) {
    if (!idChat || idUsuarioActualGlobal === null) return; // No hacer fetch si no hay chat activo o usuario
    fetch(`../controllers/getNuevosMensajesController.php?idChat=${idChat}&ultimoIdMensaje=${ultimoIdMensajeRecibido}`)
        .then(response => {
            if (!response.ok) {
                console.warn('Polling: ' + response.statusText + ' para chat ' + idChat); return null;
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


// --- INICIALIZACIÓN DE LISTENERS Y FUNCIONES (EXISTENTES) ---
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
            if (file && chatActivoId) {
                subirArchivoACloudinary(file);
            }
            inputMediaFile.value = null; // Resetear para permitir seleccionar el mismo archivo de nuevo
        });
    }

    if(btnEnviarUbicacion) {
        btnEnviarUbicacion.addEventListener('click', () => {
            if (!chatActivoId) { alert("Selecciona un chat para enviar tu ubicación."); return; }
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    // Usar una URL que no dependa de cookies de terceros para mostrar en iframes o imágenes si es posible
                    // o simplemente enviar las coordenadas y que el receptor las abra en Google Maps.
                    // Por ahora, enviaremos una URL simple.
                    const googleMapsUrl = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
                    enviarMensajeAlServidor(null, googleMapsUrl, 'location');
                }, error => {
                    console.error("Error obteniendo ubicación: ", error);
                    alert("No se pudo obtener tu ubicación. Asegúrate de tener los permisos activados y conexión a internet.");
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
            if (texto) { // Solo enviar si hay texto, los adjuntos se envían por su propio flujo
                enviarMensajeAlServidor(texto, null);
            }
        });
    }
}

// --- FUNCIONES DE SUBIDA CON CLOUDINARY (EXISTENTES) ---
function subirArchivoACloudinary(file) {
    if (!file || !chatActivoId) return;

    // Mensaje temporal de "Subiendo..."
    const tempMessageId = `temp_${Date.now()}`;
    mostrarMensajeEnUI({
        idMensaje: tempMessageId, // ID temporal
        idRemitente: idUsuarioActualGlobal,
        texto: `Subiendo ${file.name}...`,
        remitenteUsuario: nombreUsuarioActualGlobal, // 'Yo' o tu nombre de usuario
        remitenteAvatar: avatarUsuarioActualGlobal,
        fechaEnvio: new Date().toISOString().slice(0, 19).replace('T', ' '), // Hora actual
        esTemporal: true // Flag para posible manejo especial (ej. no re-renderizar si ya existe)
    });

    const cloudName = 'ddrffjanq'; 
    const uploadPreset = 'poi_unsigned'; 
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'poi'); // Opcional: carpeta en Cloudinary

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.secure_url) {
            const downloadURL = data.secure_url;
            // El texto del input se puede enviar junto o como un mensaje separado.
            // Aquí asumimos que el archivo es el mensaje principal.
            // const textoOriginal = document.getElementById('inputMensajeTexto').value.trim(); 
            let tipoParaPlaceholder = file.type || '';
            if(!tipoParaPlaceholder && file.name) { // Intentar deducir de la extensión si el tipo no está
                const ext = file.name.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) tipoParaPlaceholder = 'image/';
                else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) tipoParaPlaceholder = 'video/';
                else if (['mp3', 'wav', 'aac'].includes(ext)) tipoParaPlaceholder = 'audio/';
            }

            enviarMensajeAlServidor(null, downloadURL, tipoParaPlaceholder); // Enviar URL al backend
            // document.getElementById('inputMensajeTexto').value = ''; // Limpiar input si se envió texto asociado
        } else {
            throw new Error(data.error ? data.error.message : "Error desconocido de Cloudinary");
        }
        // Eliminar el mensaje temporal "Subiendo..."
        const el = document.querySelector(`[data-message-id='${tempMessageId}']`); if (el) el.remove();
    })
    .catch(error => {
        console.error("Error al subir a Cloudinary:", error);
        alert("No se pudo subir el archivo: " + error.message);
        const el = document.querySelector(`[data-message-id='${tempMessageId}']`); if (el) el.remove();
    });
}

function enviarMensajeAlServidor(texto, multimediaUrl = null, tipoMultimedia = null) {
    if (!chatActivoId) { alert("Selecciona un chat."); return; }
    if ((texto === null || texto.trim() === '') && !multimediaUrl) return; // No enviar mensajes vacíos

    let textoParaEnviar = texto; // El texto que el usuario escribió
    
    // Si no hay texto explícito pero sí multimedia, generar un placeholder
    if ((texto === null || texto.trim() === '') && multimediaUrl) {
        if (tipoMultimedia && tipoMultimedia.startsWith('image/')) textoParaEnviar = '[Imagen]';
        else if (tipoMultimedia && tipoMultimedia.startsWith('video/')) textoParaEnviar = '[Video]';
        else if (tipoMultimedia && tipoMultimedia.startsWith('audio/')) textoParaEnviar = '[Audio]';
        else if (tipoMultimedia === 'location') textoParaEnviar = '[Ubicación]';
        else textoParaEnviar = '[Archivo Adjunto]';
    }

    const datosMensaje = {
        idChat: chatActivoId,
        textoMensaje: textoParaEnviar,
        multimediaUrl: multimediaUrl 
    };

    fetch('../controllers/enviarMensajeController.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosMensaje)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' && data.mensaje) {
            mostrarMensajeEnUI(data.mensaje); // Mostrar el mensaje confirmado por el servidor
            if (texto !== null && texto.trim() !== '' && textoParaEnviar === texto) { // Si se envió texto del input
                document.getElementById('inputMensajeTexto').value = ''; // Limpiar el input
            }
        } else {
            alert(data.message || "Error al enviar mensaje.");
        }
    })
    .catch(error => {
        console.error('Error enviarMensajeAlServidor:', error);
        alert('Error de conexión al enviar el mensaje.');
    });
}


// --- INICIALIZACIÓN DE LISTENERS PARA POPUPS Y OTROS (EXISTENTES Y MODIFICADOS) ---
function inicializarListenersPopUps() {
    const popUpConfigs = [
        { btnId: 'Crear',       popUpSelector: '.PopUp',         closeSelector: '.PopUp .close' },
        { btnId: 'CrearReward', popUpSelector: '.PopUpReward',   closeSelector: '.PopUpReward .close-reward' },
        { btnId: 'CrearChat',   popUpSelector: '.PopUpChat',     closeSelector: '.PopUpChat .close-chat', action: loadUsersForNewChat },
        { btnId: 'CrearDelete', popUpSelector: '.PopUpDelete',   closeSelector: '.PopUpDelete .close-delete' }
        // El PopUpCall se maneja por separado para videollamadas
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

    // Listeners para PopUpCall (videollamada)
    const popUpCall = document.querySelector('.PopUpCall');
    if (popUpCall) {
        const closeCallButton = popUpCall.querySelector('.close-call'); // Botón X
        const hangupCallButton = popUpCall.querySelector('#hangupButton'); // Botón rojo

        if (closeCallButton) {
            closeCallButton.addEventListener('click', async () => {
                await leaveAgoraCall();
            });
        }
        if (hangupCallButton) {
            hangupCallButton.addEventListener('click', async () => {
                await leaveAgoraCall();
            });
        }
    }
}


function inicializarListenersOtros() {
    const chatToContainerScrollOriginal = document.querySelector(".PopUpChat .chat-to");
    if (chatToContainerScrollOriginal) {
        chatToContainerScrollOriginal.addEventListener("wheel", (event) => {
            event.preventDefault();
            chatToContainerScrollOriginal.scrollLeft += event.deltaY;
        });
    }

    const startChatButton = document.getElementById('startChatButton');
    const groupChatNameInput = document.getElementById('groupChatNameInput');

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
                idsUsuarios: selectedUsersForNewChat // Ya contiene el ID del usuario actual si es necesario
            };

            fetch('../controllers/crearChatController.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatData)
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message); // Mostrar mensaje del servidor
                const popUpChatElement = document.querySelector('.PopUpChat');
                if (data.status === 'success') {
                    if(popUpChatElement) popUpChatElement.style.display = 'none';
                    resetNewChatPopup();
                    cargarUltimosChats(); // Recargar lista de chats
                }
            })
            .catch(error => {
                console.error('Error al crear chat:', error);
                alert('Error de conexión al crear el chat.');
            });
        });
    }
}

// --- FUNCIONES PARA INICIAR VIDEOLLAMADA ---
// Esta función será llamada cuando el usuario haga clic en el ícono de videollamada.
// Asegúrate de que tu HTML/JS que maneja el clic en el ícono de videollamada
// llame a esta función con el chatId y chatName correctos.
async function iniciarVideollamada(chatIdParaLlamada, chatNombreParaLlamada) {
    if (!chatIdParaLlamada || !chatNombreParaLlamada) {
        alert("No se pudo identificar el chat para iniciar la videollamada.");
        console.error("iniciarVideollamada: chatId o chatNombre no proporcionados.", chatIdParaLlamada, chatNombreParaLlamada);
        return;
    }
    console.log(`Iniciando videollamada para el chat: ${chatNombreParaLlamada} (ID: ${chatIdParaLlamada})`);

    const popUpCall = document.querySelector('.PopUpCall');
    if (popUpCall) popUpCall.style.display = 'flex';

    // Unirse al canal de Agora. El ID del chat se usa como nombre del canal.
    await joinAgoraChannel(String(chatIdParaLlamada));
}


// --- EJEMPLO: TRIGGER PARA INICIAR VIDEOLLAMADA ---
// Debes tener una lógica similar a esta en tu código para cuando un usuario hace clic en un ícono de videollamada.
// Por ejemplo, si el ícono está en la cabecera del chat activo:

const botonIconoVideollamadaEnCabecera = document.getElementById('videoCallButtonInHeader'); // Asume que tienes un botón con este ID
if (botonIconoVideollamadaEnCabecera) {
    botonIconoVideollamadaEnCabecera.addEventListener('click', () => {
        if (chatActivoId) {
            const nombreChatActivo = document.getElementById('chatActivoNombre').textContent;
            iniciarVideollamada(chatActivoId, nombreChatActivo);
        } else {
            alert("Por favor, abre un chat antes de iniciar una videollamada.");
        }
    });
}
// O, si el ícono de videollamada está asociado a cada item de chat en la lista de chats (como en el ejemplo de `cargarUltimosChats`):
// El listener ya estaría en `cargarUltimosChats`.

// O como tenías antes, un listener global de clicks que busca la clase 'fa-video':
document.addEventListener('click', function(event) {
    const target = event.target;
    const videoIcon = target.classList.contains('fa-video') ? target : target.closest('.fa-video');

    if (videoIcon) {
        // Intenta obtener el ID y nombre del chat del contexto del ícono.
        // Esto es un ejemplo, necesitas adaptarlo a cómo está estructurado tu HTML
        // para los botones de videollamada.
        let chatId, chatName;

        // Opción 1: El ícono está en la cabecera del chat activo
        if (videoIcon.closest('#chatHeader')) { // Si el ícono está en un elemento con ID 'chatHeader'
            chatId = chatActivoId;
            chatName = document.getElementById('chatActivoNombre').textContent;
        }
        // Opción 2: El ícono está en un elemento de la lista de chats que tiene data-attributes
        else {
            const chatElement = videoIcon.closest('[data-chat-id]');
            if (chatElement) {
                chatId = chatElement.dataset.chatId;
                chatName = chatElement.dataset.chatNombre; // Asegúrate que este data-attribute exista
            }
        }
        
        if (chatId && chatName) {
            iniciarVideollamada(chatId, chatName);
        } else if (chatId && !chatName && chatActivoId === chatId) { // Si solo tenemos el ID pero es el chat activo
             chatName = document.getElementById('chatActivoNombre').textContent;
             iniciarVideollamada(chatId, chatName);
        }
         else {
            // console.warn("No se pudo determinar el chat para la videollamada desde el ícono clickeado.", videoIcon);
            // Podrías intentar usar el chatActivoId como último recurso si el ícono no tiene contexto directo
             if (chatActivoId && videoIcon.closest('.message-input-icons')) { //Asumiendo que el ícono de video está en el input de mensajes
                chatName = document.getElementById('chatActivoNombre').textContent;
                iniciarVideollamada(chatActivoId, chatName);
             } else {
                console.warn("No se pudo determinar el chat para la videollamada desde el ícono clickeado.", videoIcon);
             }
        }
    }
});


// --- FUNCIONES DE CREAR NUEVO CHAT (EXISTENTES) ---
function resetNewChatPopup() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    
    selectedUsersForNewChat = []; // Limpiar usuarios seleccionados

    if (userListForNewChatContainer) {
        userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Cargando usuarios...</p>';
    }
    if (chatToContainerNewChat) { // Limpiar los botones de usuarios seleccionados
        const toLabel = chatToContainerNewChat.querySelector('p'); // No borrar el "To:"
        chatToContainerNewChat.innerHTML = '';
        if(toLabel) chatToContainerNewChat.appendChild(toLabel);
    }
    if (groupChatNameInputContainer) groupChatNameInputContainer.style.display = 'none';
    if (groupChatNameInput) groupChatNameInput.value = '';

    // Desmarcar visualmente a los usuarios en la lista
    const allUserDivs = document.querySelectorAll('#userListForNewChat .new-convo.selected-for-chat');
    allUserDivs.forEach(div => div.classList.remove('selected-for-chat'));
}

function loadUsersForNewChat() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    
    if (!userListForNewChatContainer) return;
    resetNewChatPopup(); // Asegurar que el popup esté limpio antes de cargar

    userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Cargando usuarios...</p>';
    
    fetch('../controllers/getUsuariosController.php') // Asume que este endpoint devuelve todos los usuarios excepto el actual
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar usuarios: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            userListForNewChatContainer.innerHTML = ''; // Limpiar mensaje de "cargando"
            if (data.status === 'success' && data.usuarios) {
                if (data.usuarios.length === 0) {
                    userListForNewChatContainer.innerHTML = '<p style="text-align:center; color: #8b6247;">No hay otros usuarios para chatear.</p>';
                    return;
                }
                data.usuarios.forEach(user => {
                    // No añadir el usuario actual a la lista para chatear consigo mismo
                    if (String(user.idUsuario) === String(idUsuarioActualGlobal)) {
                        return;
                    }

                    const userDiv = document.createElement('div');
                    userDiv.classList.add('new-convo'); // Clase para estilizar cada item de usuario
                    userDiv.style.cursor = 'pointer';
                    userDiv.dataset.userId = user.idUsuario;
                    userDiv.dataset.username = user.usuario; // Nombre de usuario para mostrar

                    const userImg = document.createElement('img');
                    userImg.classList.add('new-pfp'); // Profile picture
                    userImg.src = user.avatar ? `../multimedia/imagenPerfil/${user.avatar}` : '../multimedia/logo.jpg';
                    userImg.alt = user.usuario;
                    userImg.onerror = function() { this.src = '../multimedia/logo.jpg'; };

                    const userNameP = document.createElement('p');
                    userNameP.textContent = `${user.nombres || ''} ${user.paterno || ''} (${user.usuario})`;

                    userDiv.appendChild(userImg);
                    userDiv.appendChild(userNameP);

                    userDiv.addEventListener('click', function() {
                        toggleUserSelectionForNewChat(user.idUsuario, user.usuario); // Pasar ID y nombre de usuario
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
                userListForNewChatContainer.innerHTML = '<p style-align:center; color: red;">Error de conexión al cargar usuarios.</p>';
            }
        });
}

function toggleUserSelectionForNewChat(userId, username) {
    const userListContainer = document.getElementById('userListForNewChat');
    const chatToCont = document.querySelector('.PopUpChat .chat-to');
    const groupChatNameCont = document.querySelector('.PopUpChat .group-chat-name-container');

    const index = selectedUsersForNewChat.indexOf(userId); // userId debe ser el ID numérico/string
    const userElementInList = userListContainer.querySelector(`.new-convo[data-user-id='${userId}']`);

    if (index > -1) { // Si ya está seleccionado, deseleccionar
        selectedUsersForNewChat.splice(index, 1);
        const buttonToRemove = chatToCont.querySelector(`button[data-user-id='${userId}']`);
        if (buttonToRemove) buttonToRemove.remove();
        if (userElementInList) userElementInList.classList.remove('selected-for-chat'); // Quitar clase visual
    } else { // Si no está seleccionado, seleccionar
        selectedUsersForNewChat.push(userId);
        const userButton = document.createElement('button'); // Crear botón en la parte superior "To:"
        userButton.setAttribute('data-user-id', userId);
        userButton.innerHTML = `${username} <i class="fa-solid fa-xmark"></i>`; // Mostrar nombre de usuario
        userButton.addEventListener('click', function() { // Permitir deseleccionar desde el botón "To:"
            toggleUserSelectionForNewChat(userId, username);
        });
        if (chatToCont) chatToCont.appendChild(userButton);
        if (userElementInList) userElementInList.classList.add('selected-for-chat'); // Añadir clase visual
    }

    // Mostrar/ocultar campo de nombre de grupo
    if (groupChatNameCont) {
        if (selectedUsersForNewChat.length > 1) {
            groupChatNameCont.style.display = 'block';
        } else {
            groupChatNameCont.style.display = 'none';
        }
    }
}

// --- FUNCIONES DE UTILIDAD (EXISTENTES) ---
async function obtenerUsuariosDelChat(chatId) {
    try {
        const response = await fetch(`../controllers/getUsuariosChatController.php?idChat=${chatId}`);
        if (!response.ok) throw new Error('Error al obtener usuarios del chat');
        const data = await response.json();
        return data.usuarios || []; // Devuelve un array de usuarios
    } catch (error) {
        console.error('Error obteniendo usuarios del chat:', error);
        return []; // Devuelve array vacío en caso de error
    }
}


// --- ESTILOS CSS DINÁMICOS (EXISTENTES) ---
// (Ya los tienes al final de tu archivo, los mantengo como estaban)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .video-loading { /* Estilo para cuando Agora está cargando/conectando */
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        color: #fff;
        font-size: 18px;
        background-color: #1e1e1e;
    }
    
    .video-error { /* Estilo para errores de video */
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        color: #ff4757;
        font-size: 16px;
        text-align: center;
        padding: 20px;
        background-color: #1e1e1e;
    }
    
    /* Estilo para los contenedores de video remoto */
    .remote-player-wrapper {
        border: 1px solid #555;
        background-color: #000; /* Fondo negro para los videos */
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
        overflow: hidden; /* Para que el video no se salga del contenedor */
    }

    /* Estilo para los elementos de video dentro de los contenedores */
    #local-video-container video, /* Video local */
    .remote-player-wrapper video { /* Videos remotos */
        width: 100%;
        height: 100%;
        object-fit: cover; /* 'cover' para llenar, 'contain' para mostrar todo */
    }

    #local-video-container {
        background-color: #000; /* Fondo negro para el contenedor local también */
    }

    .selected-for-chat { /* Clase para resaltar usuarios seleccionados en "Crear Chat" */
        background-color: #e0eafc; /* Un color de resaltado suave */
        border-left: 3px solid #4a9eff;
    }
    .PopUpChat .chat-to button { /* Estilo para los botones de usuario en el "To:" */
        background-color: #4a9eff;
        color: white;
        border: none;
        padding: 5px 10px;
        margin: 2px;
        border-radius: 15px;
        font-size: 0.9em;
    }
    .PopUpChat .chat-to button i {
        margin-left: 5px;
        cursor: pointer;
    }
    .file-icon { margin-right: 5px; } /* Para el ícono de archivo en mensajes */

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