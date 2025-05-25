// itsrulini/poi-pia/poi-pia-44270a69551716e536b52fa192f96beb7e44033b/views/webrtc-handler.js

// Elementos del DOM
let localVideo;
let remoteVideo;
let callButton;
let hangupButton;
// Podrías añadir más elementos para mostrar el estado, myClientId, etc.
// let myIdDisplay;
// let callStatusDisplay;

// Conexión WebSocket y WebRTC
let ws;
let peerConnection;
let localStream;
let remoteStream;

let myClientId = null; // ID de este cliente asignado por el servidor de señalización
let targetClientId = null; // ID del cliente al que se está llamando o está en llamada
let isCallActive = false; // Estado de la llamada

// Configuración de STUN server (puedes añadir servidores TURN para mayor robustez)
const peerConnectionConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // { urls: 'stun:stun1.l.google.com:19302' },
        // Añade tus servidores TURN aquí si los tienes
        // {
        //   urls: 'turn:tu-servidor-turn.com:3478',
        //   username: 'tu-usuario',
        //   credential: 'tu-password'
        // }
    ]
};

// --- INICIALIZACIÓN ---
// Esta función se puede llamar cuando el DOM esté listo, por ejemplo desde MAIN.js
function initializeWebRTCHandler() {
    console.log("Inicializando WebRTC Handler...");

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    callButton = document.getElementById('callButton');
    hangupButton = document.getElementById('hangupButton');
    // myIdDisplay = document.getElementById('myIdDisplay'); // Si tienes un elemento para mostrar tu ID
    // callStatusDisplay = document.getElementById('callStatusDisplay'); // Para mostrar el estado de la llamada

    if (!localVideo || !remoteVideo || !callButton || !hangupButton) {
        console.error("Error: No se encontraron todos los elementos HTML necesarios para WebRTC.");
        return;
    }

    callButton.onclick = () => {
        // Para pruebas, podrías pedir el targetId aquí.
        // En la aplicación real, MAIN.js debería proveer el targetId.
        const idToCall = prompt("Ingresa el ID del cliente al que quieres llamar:");
        if (idToCall) {
            initiateCall(idToCall);
        }
    };
    hangupButton.onclick = hangupCall;

    updateCallButtons(false); // Inicialmente, no hay llamada activa

    connectToSignalingServer();
}

function connectToSignalingServer() {
    // Asegúrate de que la URL y el puerto coincidan con tu servidor de señalización
    // Si tu página se sirve por HTTPS, el WebSocket también debería ser seguro (wss://)
    // Si estás probando localmente con HTTP, ws:// está bien.
    const wsUrl = `ws://${window.location.hostname}:8080`; // Asume que el servidor de señalización está en el mismo host
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("Conectado al servidor de señalización WebSocket.");
    };

    ws.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        console.log("Mensaje recibido del servidor de señalización:", data);

        switch (data.type) {
            case 'your-id':
                myClientId = data.id;
                console.log(`Mi ID de cliente asignado: ${myClientId}`);
                // if (myIdDisplay) myIdDisplay.textContent = `Mi ID: ${myClientId}`;
                // Una vez que tenemos el ID, podemos habilitar el botón de llamar
                // (si la lógica de obtener stream local se mueve a initiateCall)
                // updateCallButtons(false); // Ya se hizo, pero por si acaso
                break;
            case 'offer':
                // Aquí es donde idealmente notificarías al usuario y le darías opciones
                // Por ahora, responderemos automáticamente para simplificar
                console.log(`Recibida oferta de ${data.senderId}`);
                await handleOffer(data);
                break;
            case 'answer':
                console.log(`Recibida respuesta de ${data.senderId}`);
                await handleAnswer(data);
                break;
            case 'candidate':
                console.log(`Recibido candidato ICE de ${data.senderId}`);
                await handleCandidate(data);
                break;
            case 'hangup':
                console.log(`Llamada finalizada por ${data.senderId}`);
                handleRemoteHangup();
                break;
            case 'error': // Mensajes de error desde el servidor de señalización
                console.error("Error del servidor de señalización:", data.message);
                // Podrías mostrar esto al usuario
                break;
            default:
                console.log("Mensaje desconocido recibido:", data);
        }
    };

    ws.onerror = (error) => {
        console.error("Error en WebSocket:", error);
        // Podrías intentar reconectar o informar al usuario
        // updateCallStatus("Error de conexión con el servidor de señalización.");
    };

    ws.onclose = () => {
        console.log("Desconectado del servidor de señalización WebSocket.");
        myClientId = null; // Resetear el ID
        // updateCallStatus("Desconectado del servidor de señalización.");
        // updateCallButtons(false); // Deshabilitar botones si es necesario
    };
}

// --- MANEJO DE MEDIA Y PEERCONNECTION ---

async function prepareForCall() {
    if (!peerConnection) {
        createPeerConnection();
    }
    if (!localStream) {
        await getLocalMedia();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => {
            // Evitar añadir la misma pista múltiples veces si ya existe
            if (!peerConnection.getSenders().find(sender => sender.track === track)) {
                peerConnection.addTrack(track, localStream);
            }
        });
    } else {
        console.error("No se pudo obtener el stream local. La llamada no puede continuar.");
        // updateCallStatus("Error: No se pudo acceder a la cámara/micrófono.");
        return false;
    }
    return true;
}


async function getLocalMedia() {
    try {
        // Solicitar solo video para este ejemplo, puedes añadir audio: true
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localVideo.muted = true; // Siempre silenciar el video local para evitar eco
        console.log("Stream local obtenido.");
    } catch (error) {
        console.error("Error al obtener media local (getUserMedia):", error);
        localStream = null; // Asegurarse de que localStream es null si falla
        // Aquí podrías informar al usuario que necesita dar permisos o que no hay dispositivos.
        // updateCallStatus("Error al acceder a cámara/micrófono. Verifica los permisos.");
    }
}

function createPeerConnection() {
    console.log("Creando RTCPeerConnection...");
    // Cerrar cualquier conexión existente antes de crear una nueva
    if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(peerConnectionConfig);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && targetClientId) { // Asegúrate de tener un targetClientId
            console.log("Enviando candidato ICE a:", targetClientId);
            sendSignalingMessage({
                type: 'candidate',
                candidate: event.candidate,
                targetId: targetClientId, // El ID del otro par
                // senderId ya no es necesario aquí porque el servidor lo añade
            });
        }
    };

    peerConnection.ontrack = (event) => {
        console.log("Track remoto recibido:", event.streams);
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteStream = event.streams[0];
        } else {
            // A veces el track viene sin stream, y hay que construirlo
            if (!remoteStream) {
                remoteStream = new MediaStream();
            }
            remoteStream.addTrack(event.track);
            remoteVideo.srcObject = remoteStream;
        }
        isCallActive = true;
        updateCallButtons(true);
        // updateCallStatus("Llamada activa.");
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log(`Estado de conexión ICE: ${peerConnection.iceConnectionState}`);
        switch (peerConnection.iceConnectionState) {
            case 'connected':
            case 'completed':
                isCallActive = true;
                updateCallButtons(true);
                // updateCallStatus("Llamada conectada.");
                break;
            case 'disconnected':
            case 'failed':
            case 'closed':
                isCallActive = false;
                // Podrías intentar reconectar o simplemente cerrar la llamada.
                // Por ahora, la cerramos.
                handleRemoteHangup(); // O una función de limpieza más general
                break;
        }
    };
    console.log("RTCPeerConnection creada.");
}

// --- LÓGICA DE LLAMADA (INICIAR, RESPONDER, COLGAR) ---

async function initiateCall(idToCall) {
    if (!myClientId) {
        alert("Aún no estás conectado al servidor de señalización o no tienes ID.");
        return;
    }
    if (isCallActive) {
        alert("Ya estás en una llamada. Cuélgala primero.");
        return;
    }
    console.log(`Iniciando llamada a ${idToCall}...`);
    targetClientId = idToCall; // Establecer a quién estamos llamando

    if (!await prepareForCall()) return; // Prepara media y peerConnection

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("Oferta creada y establecida localmente. Enviando a:", targetClientId);
        sendSignalingMessage({
            type: 'offer',
            sdp: peerConnection.localDescription, // Enviar la descripción completa
            targetId: targetClientId,
            // senderId se añade en el servidor, pero también es bueno tenerlo explícito aquí si se desea
            // senderId: myClientId
        });
        // updateCallStatus(`Llamando a ${targetClientId}...`);
        updateCallButtons(true); // Muestra "colgar"
    } catch (error) {
        console.error("Error al crear o enviar oferta:", error);
        // updateCallStatus("Error al iniciar llamada.");
        resetCallState();
    }
}

async function handleOffer(data) {
    if (isCallActive && targetClientId !== data.senderId) {
        // Ya está en una llamada con otra persona, podría enviar 'busy'
        console.log("Ocupado, rechazando nueva oferta de:", data.senderId);
        sendSignalingMessage({ type: 'busy', targetId: data.senderId });
        return;
    }

    console.log(`Manejando oferta de ${data.senderId}`);
    targetClientId = data.senderId; // Establecer con quién es la llamada (quién nos llamó)

    if (!await prepareForCall()) return;

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        console.log("Descripción remota (oferta) establecida.");

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log("Respuesta creada y establecida localmente. Enviando a:", targetClientId);

        sendSignalingMessage({
            type: 'answer',
            sdp: peerConnection.localDescription, // Enviar la descripción completa
            targetId: targetClientId
        });
        isCallActive = true;
        updateCallButtons(true);
        // updateCallStatus(`En llamada con ${targetClientId}.`);
    } catch (error) {
        console.error("Error al manejar oferta o crear respuesta:", error);
        // updateCallStatus("Error al responder llamada.");
        resetCallState();
    }
}

async function handleAnswer(data) {
    console.log(`Manejando respuesta de ${data.senderId}`);
    if (!peerConnection.currentRemoteDescription) { // Solo establecer si no hay ya una (evita glare)
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log("Descripción remota (respuesta) establecida.");
            isCallActive = true; // La conexión se establecerá pronto
            updateCallButtons(true);
            // updateCallStatus(`Llamada establecida con ${data.senderId}.`);
        } catch (error) {
            console.error("Error al establecer descripción remota (respuesta):", error);
            // updateCallStatus("Error al establecer conexión.");
            resetCallState();
        }
    } else {
        console.warn("Descripción remota ya establecida, ignorando respuesta duplicada o tardía.");
    }
}

async function handleCandidate(data) {
    console.log(`Manejando candidato ICE de ${data.senderId}`);
    if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log("Candidato ICE añadido.");
        } catch (error) {
            console.error("Error al añadir candidato ICE:", error);
        }
    }
}

function hangupCall() {
    console.log("Colgando llamada...");
    if (targetClientId) { // Si sabemos con quién estábamos hablando
        sendSignalingMessage({
            type: 'hangup',
            targetId: targetClientId
        });
    }
    resetCallState();
}

function handleRemoteHangup() {
    console.log("El otro usuario ha colgado.");
    resetCallState();
    // updateCallStatus("Llamada finalizada por el otro usuario.");
}

// --- UTILIDADES ---

function sendSignalingMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // El servidor ahora espera `targetId` y añade `senderId` si no está.
        // Por consistencia y claridad, podemos seguir añadiendo `senderId` en el cliente
        // si es una comunicación directa que el servidor solo retransmite.
        // Para `offer`, `answer`, `candidate`, `hangup`, el `senderId` es `myClientId`.
        const messageToSend = { ...message, senderId: myClientId };

        ws.send(JSON.stringify(messageToSend));
        console.log("Mensaje de señalización enviado:", messageToSend);
    } else {
        console.error("WebSocket no está conectado. No se puede enviar mensaje:", message);
    }
}

function resetCallState() {
    console.log("Restableciendo estado de la llamada.");
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
        remoteVideo.srcObject = null;
    }

    if (peerConnection) {
        peerConnection.close(); // Cierra la conexión
        peerConnection = null; // Libera la referencia
    }
    
    // Importante: Crear una nueva instancia de PeerConnection para la siguiente llamada
    // createPeerConnection(); // Lo hacemos en prepareForCall o al inicio de una nueva llamada

    isCallActive = false;
    targetClientId = null;
    updateCallButtons(false);
    // updateCallStatus("Llamada finalizada. Listo para nueva llamada.");
}

function updateCallButtons(callInProgress) {
    if (callButton && hangupButton) {
        callButton.disabled = callInProgress || !myClientId; // Deshabilitar si en llamada o sin ID
        hangupButton.disabled = !callInProgress;
    }
}

// function updateCallStatus(status) {
//     if (callStatusDisplay) {
//         callStatusDisplay.textContent = status;
//     }
//     console.log("Estado de llamada:", status);
// }

// --- INICIO ---
// Esperar a que el DOM esté completamente cargado antes de inicializar.
// Esto es importante si este script se carga en el <head>.
// Si se carga al final del <body>, document.addEventListener no es estrictamente necesario
// pero es una buena práctica.
document.addEventListener('DOMContentLoaded', initializeWebRTCHandler);

// También podrías exponer funciones globalmente si necesitas llamarlas desde MAIN.js
// window.webRTCHandler = {
//     initiateCall,
//     hangupCall,
//     getMyClientId: () => myClientId
// };