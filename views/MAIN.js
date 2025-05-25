// MAIN.js (Cloudinary version)

// Variables globales
let idUsuarioActualGlobal = null;
let avatarUsuarioActualGlobal = '../multimedia/logo.jpg';
let nombreUsuarioActualGlobal = 'Yo';
let chatActivoId = null;
let pollingIntervalId = null;
let ultimoIdMensajeRecibido = 0;

// --- INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener("DOMContentLoaded", function () {
    cargarDatosUsuarioSidebar();
    cargarUltimosChats();
    inicializarListenersFormularioMensajes();
    inicializarListenersPopUps();
    inicializarListenersOtros();
});

// ... (otras funciones intactas hasta subirArchivoAFirebase)

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

// Reemplazamos la llamada en los listeners
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
                        sidebarUserAvatarElement.src = '../multimedia/logo.jpg'; //
                        avatarUsuarioActualGlobal = '../multimedia/logo.jpg';
                    }
                }
            } else {
                console.warn('Sidebar: Datos de usuario no cargados.', data.message);
                if (data.message.toLowerCase().includes('no autenticado')) window.location.href = 'LOGIN.html';
            }
        })
        .catch(error => {
            console.error('Error fatal cargando datos del sidebar:', error);
            // window.location.href = 'LOGIN.html'; // Opcional: redirigir
        });
}

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
                        avatarSrc = '../multimedia/group_avatar_default.png'; // Considera tener un avatar de grupo
                        // Si no, usa el logo: avatarSrc = '../multimedia/logo.jpg';
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

    const chatDisplayNameElement = document.getElementById('chatActivoNombre');
    if (chatDisplayNameElement) chatDisplayNameElement.textContent = nombreChat;

    const windowChatMessages = document.getElementById('windowChatMessages');
    if (windowChatMessages) {
        windowChatMessages.innerHTML = `<p class="placeholder-chat-message" style="text-align:center; color: #8b6247;">Cargando mensajes para ${nombreChat}...</p>`;
        cargarMensajesDelChat(idChat);
    }

    const crearTaskButton = document.getElementById('Crear'); // Botón Tasks del header
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

// --- FUNCIONES DE MENSAJERÍA ---
function formatearTimestamp(sqlTimestamp) {
    if (!sqlTimestamp) return '';
    const fechaString = sqlTimestamp.replace(' ', 'T'); // No añadir 'Z' para que se interprete como local
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) {
        console.error("Fecha inválida recibida del servidor:", sqlTimestamp);
        // Intentar un parseo más robusto o un formato por defecto si es necesario
        const parts = sqlTimestamp.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            // parts[0] es el match completo, parts[1] es año, parts[2] mes (0-11), etc.
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
    bubbleDiv.classList.add(esMensajePropio ? 'window-bubble-dos' : 'window-bubble'); //
    bubbleDiv.classList.add(esMensajePropio ? 'message-sent' : 'message-received');
    bubbleDiv.dataset.messageId = mensaje.idMensaje;

    const imgAvatar = document.createElement('img');
    imgAvatar.alt = esMensajePropio ? nombreUsuarioActualGlobal : mensaje.remitenteUsuario;
    imgAvatar.src = esMensajePropio ? avatarUsuarioActualGlobal : (mensaje.remitenteAvatar ? `../multimedia/imagenPerfil/${mensaje.remitenteAvatar}` : '../multimedia/logo.jpg');
    imgAvatar.classList.add(esMensajePropio ? 'BubblePicDos' : 'BubblePic'); //
    imgAvatar.onerror = function() { this.src = '../multimedia/logo.jpg'; }; // Fallback para avatares rotos

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
        const esUrlDeGoogleMaps = url.includes('google.com/maps') || url.includes('googleusercontent.com/maps'); //

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
            // Si el texto del mensaje es solo el placeholder, no lo mostramos de nuevo
            if (mensaje.texto === '[Archivo Adjunto]' || mensaje.texto === link.textContent) contenidoPrincipalMostrado = true;
        }
        textContainerDiv.appendChild(mediaContainer);
    }
    
    // Mostrar texto si no es un placeholder ya cubierto por la multimedia o si hay texto adicional
    if (!contenidoPrincipalMostrado || (mensaje.texto && mensaje.texto !== '[Imagen]' && mensaje.texto !== '[Video]' && mensaje.texto !== '[Audio]' && mensaje.texto !== '[Ubicación]' && mensaje.texto !== '[Archivo Adjunto]')) {
        textP.textContent = mensaje.texto || '';
        textContainerDiv.appendChild(textP);
    } else if (textContainerDiv.childNodes.length === 0) { // Si no hay multimedia y el texto era placeholder
        textP.textContent = mensaje.texto || ''; // Mostrar el placeholder si no hay nada más
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
        // Solo hacer auto-scroll si el usuario no ha hecho scroll hacia arriba para ver mensajes antiguos
        // Esta es una heurística simple, se puede mejorar
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
/*
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
            if (file && chatActivoId) subirArchivoAFirebase(file);
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
            if (texto) enviarMensajeAlServidor(texto, null); // Solo envía si hay texto
            // La subida de archivos se maneja por separado con su propio botón/evento
        });
    }
} */

function subirArchivoAFirebase(file) {
    if (!file || !chatActivoId) return;
    const { storageInstance, ref, uploadBytesResumable, getDownloadURL } = window.firebaseStorage;
    if (!storageInstance) { alert("Firebase Storage no inicializado."); return; }

    const tempMessageId = `temp_${Date.now()}`;
    mostrarMensajeEnUI({
        idMensaje: tempMessageId, idRemitente: idUsuarioActualGlobal,
        texto: `Subiendo ${file.name}...`, remitenteUsuario: nombreUsuarioActualGlobal,
        remitenteAvatar: avatarUsuarioActualGlobal, fechaEnvio: new Date().toISOString().slice(0, 19).replace('T', ' '),
        esTemporal: true
    });

    const filePath = `chats/${chatActivoId}/${idUsuarioActualGlobal}_${Date.now()}_${file.name}`;
    const storageRef = ref(storageInstance, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const tempMsgElement = document.querySelector(`[data-message-id='${tempMessageId}'] .message-text`);
            if (tempMsgElement) tempMsgElement.textContent = `Subiendo ${file.name} (${Math.round(progress)}%)...`;
        },
        (error) => {
            console.error("Error Firebase Upload:", error);
            alert("Error al subir archivo: " + error.message);
            const el = document.querySelector(`[data-message-id='${tempMessageId}']`); if (el) el.remove();
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
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
            }).catch(error => {
                console.error("Error URL Firebase:", error); alert("Error obteniendo URL de descarga.");
                const el = document.querySelector(`[data-message-id='${tempMessageId}']`); if (el) el.remove();
            });
        }
    );
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
        { btnId: 'Crear',       popUpSelector: '.PopUp',         closeSelector: '.PopUp .close' }, // Tasks PopUp desde header
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
                // Para el botón "Tasks", respetar si está deshabilitado visualmente
                if (config.btnId === 'Crear' && btn.style.pointerEvents === 'none') {
                    alert("Las tareas solo están disponibles en chats grupales."); // O manejar de otra forma
                    return;
                }
                popUp.style.display = 'flex';
                if (config.action) config.action();
            });
        }
        if (closeBtn && popUp) {
            closeBtn.addEventListener('click', () => {
                popUp.style.display = 'none';
                if (config.popUpSelector === '.PopUpChat') resetNewChatPopup(); // Resetear específico
            });
        }
    });

    // PopUp Llamada (tiene múltiples triggers)
    const callTriggers = document.querySelectorAll('.call-trigger'); //
    const popUpCall = document.querySelector('.PopUpCall'); //
    const closeCallButton = popUpCall ? popUpCall.querySelector('.close-call') : null; //
    if (popUpCall) {
        callTriggers.forEach(icon => icon.addEventListener('click', () => popUpCall.style.display = 'flex')); //
        if (closeCallButton) closeCallButton.addEventListener('click', () => popUpCall.style.display = 'none'); //
    }
}

function inicializarListenersOtros() {
    // Scroll para usuarios en PopUpChat
    const chatToContainerScrollOriginal = document.querySelector(".PopUpChat .chat-to"); //
    if (chatToContainerScrollOriginal) {
        chatToContainerScrollOriginal.addEventListener("wheel", (event) => { //
          event.preventDefault(); //
          chatToContainerScrollOriginal.scrollLeft += event.deltaY; //
        });
    }

    // Lógica para el PopUp de "Crear Chat" (ya está integrada en inicializarListenersPopUps y las funciones llamadas)
    const startChatButton = document.getElementById('startChatButton');
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    let selectedUsersForNewChat = []; // Esta variable debe ser accesible por las funciones del PopUpChat
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');


    // (Las funciones resetNewChatPopup, loadUsersForNewChat, toggleUserSelection deben estar definidas globalmente
    //  o pasadas como callbacks si se mueven dentro de DOMContentLoaded y se necesitan fuera)
    //  En esta estructura, las he dejado globales.

    if (startChatButton) {
        startChatButton.addEventListener('click', function() {
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
                const popUpChatElement = document.querySelector('.PopUpChat');
                if (data.status === 'success') {
                    if(popUpChatElement) popUpChatElement.style.display = 'none';
                    resetNewChatPopup(); // Llama a la función global
                    cargarUltimosChats();
                }
            })
            .catch(error => {
                console.error('Error al crear chat:', error);
                alert('Error de conexión al crear el chat.');
            });
        });
    }


    // Simulación de participantes de llamada (código original)
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
}

// Funciones globales de utilidad (pueden ir al final o donde prefieras)
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


// Globales para el PopUp de Crear Chat (para que sean accesibles por las funciones)
// Estas deben estar definidas en el mismo scope que las funciones que las usan.
// Si las funciones están dentro de DOMContentLoaded, estas también deberían estarlo o ser pasadas.
// Para simplicidad, si las funciones loadUsersForNewChat, etc., son globales, estas también.
// Sin embargo, es mejor encapsular. Por ahora, las funciones que usan estas variables están dentro de DOMContentLoaded.
// let selectedUsersForNewChat = []; // Ya definida dentro de DOMContentLoaded
// const userListForNewChatContainer = document.getElementById('userListForNewChat'); // Se obtiene dentro de DOMContentLoaded
// const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to"); // Se obtiene dentro de DOMContentLoaded
// const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container'); // Se obtiene
// const groupChatNameInput = document.getElementById('groupChatNameInput'); // Se obtiene


// Definición de funciones globales para crear nuevo chat (para que sean accesibles desde los listeners)
// Mantenemos las definiciones de estas funciones fuera del DOMContentLoaded para que sean globales,
// pero se llamarán desde los listeners que sí están en DOMContentLoaded.
function resetNewChatPopup() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    // selectedUsersForNewChat se resetea donde se declara, o aquí si es global.
    // Por seguridad, vamos a asumir que selectedUsersForNewChat se maneja en el scope del listener de CrearChat
    // Lo ideal es que esta función sea llamada desde un scope donde selectedUsersForNewChat esté definida.
    // Si selectedUsersForNewChat es global, esta función puede accederla.
    // selectedUsersForNewChat = []; // Si la variable es global, esta línea sería aquí.
                                // Pero la hemos puesto dentro del listener de DOMContentLoaded para el pop-up de crear chat.


    if (userListForNewChatContainer) {
        userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Loading users...</p>';
    }
    if (chatToContainerNewChat) {
        while (chatToContainerNewChat.children.length > 1) {
            chatToContainerNewChat.removeChild(chatToContainerNewChat.lastChild);
        }
    }
    // selectedUsersForNewChat es reseteada dentro del listener de CrearChat en DOMContentLoaded
    if (groupChatNameInputContainer) groupChatNameInputContainer.style.display = 'none';
    if (groupChatNameInput) groupChatNameInput.value = '';
}

function loadUsersForNewChat() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');
    // selectedUsersForNewChat también se resetea en el listener de CrearChat de DOMContentLoaded

    if (!userListForNewChatContainer) return;
    userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Loading users...</p>';
    
    //selectedUsersForNewChat = []; // Ya se hace en el listener de CrearChat

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
                    userImg.onerror = function() { this.src = '../multimedia/logo.jpg'; };


                    const userNameP = document.createElement('p');
                    userNameP.textContent = `${user.nombres || ''} ${user.paterno || ''} (${user.usuario})`;

                    userDiv.appendChild(userImg);
                    userDiv.appendChild(userNameP);

                    userDiv.addEventListener('click', function() {
                        // Necesitamos que selectedUsersForNewChat sea accesible aquí.
                        // Si toggleUserSelection es global, selectedUsersForNewChat también debe serlo o pasarse.
                        // O, definir toggleUserSelection dentro del mismo scope que selectedUsersForNewChat.
                        // Por ahora, asumimos que toggleUserSelection puede acceder/modificar la selectedUsersForNewChat
                        // definida en el scope del DOMContentLoaded para el PopUpChat.
                        // Esto es un poco problemático si las funciones son realmente globales y no están dentro de DOMContentLoaded.
                        // La solución es que selectedUsersForNewChat sea global o que toggleUserSelection se defina donde está el array.
                        // Para este caso, la variable selectedUsersForNewChat está definida dentro del DOMContentLoaded,
                        // y toggleUserSelection también.

                        // Esta llamada está bien porque toggleUserSelection está definida dentro del mismo DOMContentLoaded
                        // donde se define `selectedUsersForNewChat`.
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

// Se renombra para evitar colisión si hubiera otra función toggleUserSelection
function toggleUserSelectionForNewChat(userId, username) {
    // Estas variables necesitan ser accesibles. Si esta función es global,
    // las variables deben ser globales o pasadas como parámetros.
    // En la estructura actual, estas se obtienen dentro de DOMContentLoaded
    // y selectedUsersForNewChat también está allí.
    // Si esta función es llamada desde loadUsersForNewChat (que es global),
    // necesitará acceder a selectedUsersForNewChat (que está en DOMContentLoaded)
    // LO MEJOR ES MANTENER ESTAS FUNCIONES DENTRO DE DOMContentLoaded
    // O REESTRUCTURAR para que selectedUsersForNewChat sea manejado adecuadamente.

    // Re-obteniendo selectores aquí para asegurar que están disponibles,
    // asumiendo que esta función podría ser llamada desde un contexto donde
    // las variables originales de DOMContentLoaded no están directamente en scope.
    // ESTO NO ES IDEAL. Lo ideal es que esta función esté dentro del mismo scope que las variables
    // o que las variables sean pasadas.
    const localUserListContainer = document.getElementById('userListForNewChat');
    const localChatToContainer = document.querySelector(".PopUpChat .chat-to");
    const localGroupChatNameContainer = document.querySelector('.PopUpChat .group-chat-name-container');
    // Y selectedUsersForNewChat debe ser la del scope correcto.
    // Voy a asumir que esta función se moverá DENTRO del DOMContentLoaded o
    // que selectedUsersForNewChat se hará más global (no recomendado).
    
    // Para la corrección, voy a asumir que esta función *es* llamada desde
    // dentro de DOMContentLoaded donde `selectedUsersForNewChat` está definida.
    // Y que localUserListContainer y localChatToContainer son los correctos.
    // Las variables usadas serán las del scope superior (DOMContentLoaded)
    // si esta función también está dentro de DOMContentLoaded.

    const selectedUsersArray = window.currentSelectedUsersForNewChat; // Usar una variable global temporalmente
    const userListContainer = document.getElementById('userListForNewChat');
    const chatToCont = document.querySelector('.PopUpChat .chat-to');
    const groupChatNameCont = document.querySelector('.PopUpChat .group-chat-name-container');


    const index = selectedUsersArray.indexOf(userId);
    const userElementInList = userListContainer.querySelector(`.new-convo[data-user-id='${userId}']`);

    if (index > -1) { 
        selectedUsersArray.splice(index, 1);
        const buttonToRemove = chatToCont.querySelector(`button[data-user-id='${userId}']`);
        if (buttonToRemove) buttonToRemove.remove();
        if (userElementInList) userElementInList.classList.remove('selected-for-chat');
    } else { 
        selectedUsersArray.push(userId);
        const userButton = document.createElement('button');
        userButton.setAttribute('data-user-id', userId);
        userButton.innerHTML = `${username} <i class="fa-solid fa-xmark"></i>`;
        userButton.addEventListener('click', function() {
            toggleUserSelectionForNewChat(userId, username); // Recursivo para el botón
        });
        if (chatToCont) chatToCont.appendChild(userButton);
        if (userElementInList) userElementInList.classList.add('selected-for-chat');
    }

    if (groupChatNameCont) {
        if (selectedUsersArray.length > 1) {
            groupChatNameCont.style.display = 'block';
        } else {
            groupChatNameCont.style.display = 'none';
        }
    }
}