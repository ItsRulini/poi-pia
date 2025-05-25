// webrtc-handler.js
class VideoCallManager {
    constructor() {
        this.localStream = null;
        this.remoteStreams = new Map();
        this.peerConnections = new Map();
        this.socket = null;
        this.currentChatId = null;
        this.currentUserId = null;
        this.isInitiator = false;
        this.callActive = false;
        
        // Configuración de servidores STUN/TURN
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                // Puedes agregar servidores TURN aquí si los necesitas
            ]
        };
        
        //this.init();
    }
    
    init() {
        // Conectar al servidor de WebSocket para señalización
        this.connectSignalingServer();
        
        // Configurar listeners para los botones de llamada
        this.setupCallButtons();
    }

    // Método para ser llamado desde MAIN.js después de que idUsuarioActualGlobal esté disponible
    initializeAfterUserLoad(userId) {
        this.currentUserId = userId;
        this.connectSignalingServer(); // Ahora podemos registrarnos con el ID de usuario
        this.setupCallButtons(); // Los botones ya existen en el DOM en este punto
    }

    connectSignalingServer() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.log("WebSocket ya conectado o conectando.");
            return;
        }

        this.socket = new WebSocket('ws://localhost:8080'); // Asegúrate que tu servidor WebSocket corra aquí
        
        this.socket.onopen = () => {
            console.log('Conectado al servidor de señalización WebSocket.');
            if (this.currentUserId) {
                console.log('Registrando usuario en WebSocket con ID:', this.currentUserId);
                this.socket.send(JSON.stringify({
                    type: 'register',
                    userId: this.currentUserId
                }));
            } else {
                console.warn("currentUserId no está definido al intentar registrarse en WebSocket.");
            }
        };
        
        this.socket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("Mensaje de señalización recibido:", message);
                await this.handleSignalingMessage(message);
            } catch (e) {
                console.error("Error parseando mensaje de señalización:", e, "Mensaje original:", event.data);
            }
        };
        
        this.socket.onerror = (error) => {
            console.error('Error en WebSocket:', error);
        };
        
        this.socket.onclose = (event) => {
            console.log('Desconectado del servidor de señalización. Código:', event.code, 'Razón:', event.reason);
            // Opcional: intentar reconectar con backoff exponencial
            // setTimeout(() => this.connectSignalingServer(), 5000); 
        };
    }
    
    // connectSignalingServer() {
    //     // Conectar al servidor WebSocket (ajusta la URL según tu configuración)
    //     this.socket = new WebSocket('ws://localhost:8080');
        
    //     this.socket.onopen = () => {
    //         console.log('Conectado al servidor de señalización');
    //         // Registrar usuario en el servidor
    //         if (idUsuarioActualGlobal) {
    //             this.currentUserId = idUsuarioActualGlobal;
    //             this.socket.send(JSON.stringify({
    //                 type: 'register',
    //                 userId: this.currentUserId
    //             }));
    //         }
    //     };
        
    //     this.socket.onmessage = async (event) => {
    //         const message = JSON.parse(event.data);
    //         await this.handleSignalingMessage(message);
    //     };
        
    //     this.socket.onerror = (error) => {
    //         console.error('Error en WebSocket:', error);
    //     };
        
    //     this.socket.onclose = () => {
    //         console.log('Desconectado del servidor de señalización');
    //         // Intentar reconectar después de 3 segundos
    //         setTimeout(() => this.connectSignalingServer(), 3000);
    //     };
    // }
    
    async handleSignalingMessage(message) {
        switch (message.type) {
            case 'offer':
                await this.handleOffer(message);
                break;
            case 'answer':
                await this.handleAnswer(message);
                break;
            case 'ice-candidate':
                await this.handleIceCandidate(message);
                break;
            case 'join-call':
                await this.handleUserJoined(message);
                break;
            case 'leave-call':
                this.handleUserLeft(message);
                break;
            case 'call-rejected':
                this.handleCallRejected(message);
                break;
        }
    }
    
    setupCallButtons() {
        // Configurar botones de llamada de voz y video
        const callTriggers = document.querySelectorAll('.call-trigger');
        callTriggers.forEach(trigger => {
            trigger.addEventListener('click', async (e) => {
                e.preventDefault();
                const isVideo = trigger.classList.contains('fa-video');
                await this.startCall(isVideo);
            });
        });
        
        // Configurar botón de terminar llamada
        const endCallBtn = document.querySelector('.end-call');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => this.endCall());
        }
        
        // Configurar botones de mute/unmute
        const muteBtn = document.querySelector('.mute-call');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleAudio());
        }
        
        const videoBtn = document.querySelector('.add-call');
        if (videoBtn) {
            videoBtn.addEventListener('click', () => this.toggleVideo());
        }
    }
    
    async startCall(withVideo = true) {
        if (!chatActivoId) {
            alert('Por favor selecciona un chat primero');
            return;
        }
        
        this.currentChatId = chatActivoId;
        this.isInitiator = true;
        this.callActive = true;
        
        try {
            // Obtener acceso a la cámara y micrófono
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: withVideo,
                audio: true
            });
            
            // Mostrar el modal de llamada
            this.showCallModal();
            
            // Agregar el stream local al UI
            this.addVideoStream('local', this.localStream, nombreUsuarioActualGlobal, true);
            
            // Notificar a otros usuarios del chat sobre la llamada
            this.socket.send(JSON.stringify({
                type: 'start-call',
                chatId: this.currentChatId,
                userId: this.currentUserId,
                withVideo: withVideo
            }));
            
        } catch (error) {
            console.error('Error al acceder a los dispositivos:', error);
            alert('No se pudo acceder a la cámara o micrófono');
        }
    }
    
    async handleUserJoined(message) {
        const { userId, chatId } = message;
        
        if (chatId !== this.currentChatId) return;
        
        // Crear conexión peer para el nuevo usuario
        const peerConnection = new RTCPeerConnection(this.iceServers);
        this.peerConnections.set(userId, peerConnection);
        
        // Agregar tracks locales
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Manejar ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    to: userId,
                    from: this.currentUserId
                }));
            }
        };
        
        // Manejar streams remotos
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            this.remoteStreams.set(userId, remoteStream);
            this.addVideoStream(userId, remoteStream, `Usuario ${userId}`, false);
        };
        
        // Crear y enviar oferta
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        this.socket.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            to: userId,
            from: this.currentUserId
        }));
    }
    
    async handleOffer(message) {
        const { offer, from, chatId } = message;
        
        // Si no estamos en una llamada, mostrar notificación de llamada entrante
        if (!this.callActive) {
            const accept = confirm(`Llamada entrante de Usuario ${from}. ¿Aceptar?`);
            if (!accept) {
                this.socket.send(JSON.stringify({
                    type: 'call-rejected',
                    to: from,
                    from: this.currentUserId
                }));
                return;
            }
            
            // Preparar para la llamada
            this.currentChatId = chatId;
            this.callActive = true;
            
            // Obtener stream local
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            this.showCallModal();
            this.addVideoStream('local', this.localStream, nombreUsuarioActualGlobal, true);
        }
        
        // Crear conexión peer
        const peerConnection = new RTCPeerConnection(this.iceServers);
        this.peerConnections.set(from, peerConnection);
        
        // Agregar tracks locales
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Manejar ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    to: from,
                    from: this.currentUserId
                }));
            }
        };
        
        // Manejar streams remotos
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            this.remoteStreams.set(from, remoteStream);
            this.addVideoStream(from, remoteStream, `Usuario ${from}`, false);
        };
        
        // Establecer descripción remota y crear respuesta
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        this.socket.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            to: from,
            from: this.currentUserId
        }));
    }
    
    async handleAnswer(message) {
        const { answer, from } = message;
        const peerConnection = this.peerConnections.get(from);
        
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }
    
    async handleIceCandidate(message) {
        const { candidate, from } = message;
        const peerConnection = this.peerConnections.get(from);
        
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
    
    handleUserLeft(message) {
        const { userId } = message;
        
        // Cerrar conexión peer
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
        }
        
        // Remover stream remoto
        this.remoteStreams.delete(userId);
        
        // Remover video del UI
        const videoElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (videoElement) {
            videoElement.remove();
        }
        
        // Reorganizar grid de videos
        this.updateVideoGrid();
    }
    
    handleCallRejected(message) {
        alert('La llamada fue rechazada');
        this.endCall();
    }
    
    showCallModal() {
        const callModal = document.querySelector('.PopUpCall');
        if (callModal) {
            callModal.style.display = 'flex';
        }
    }
    
    hideCallModal() {
        const callModal = document.querySelector('.PopUpCall');
        if (callModal) {
            callModal.style.display = 'none';
        }
    }
    
    addVideoStream(userId, stream, userName, isLocal = false) {
        const container = document.querySelector('.sep-call');
        if (!container) return;
        
        // Crear contenedor para el video
        const videoContainer = document.createElement('div');
        videoContainer.classList.add('new-call');
        videoContainer.setAttribute('data-user-id', userId);
        
        // Crear elemento de video
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        if (isLocal) {
            video.muted = true; // Mutear video local para evitar feedback
        }
        
        // Crear overlay con nombre de usuario
        const nameOverlay = document.createElement('div');
        nameOverlay.classList.add('video-name-overlay');
        nameOverlay.textContent = userName;
        nameOverlay.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            background-color: rgba(0,0,0,0.5);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 14px;
        `;
        
        videoContainer.appendChild(video);
        videoContainer.appendChild(nameOverlay);
        container.appendChild(videoContainer);
        
        // Actualizar grid según número de participantes
        this.updateVideoGrid();
    }
    
    updateVideoGrid() {
        const container = document.querySelector('.sep-call');
        if (!container) return;
        
        const participantCount = container.children.length;
        
        // Ajustar grid según número de participantes
        if (participantCount === 1) {
            container.style.gridTemplateColumns = '1fr';
            container.style.gridTemplateRows = '1fr';
        } else if (participantCount === 2) {
            container.style.gridTemplateColumns = '1fr 1fr';
            container.style.gridTemplateRows = '1fr';
        } else if (participantCount <= 4) {
            container.style.gridTemplateColumns = '1fr 1fr';
            container.style.gridTemplateRows = '1fr 1fr';
        } else if (participantCount <= 6) {
            container.style.gridTemplateColumns = '1fr 1fr 1fr';
            container.style.gridTemplateRows = '1fr 1fr';
        } else {
            container.style.gridTemplateColumns = '1fr 1fr 1fr';
            container.style.gridTemplateRows = 'repeat(auto-fit, 1fr)';
        }
    }
    
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                
                // Actualizar icono del botón
                const muteBtn = document.querySelector('.mute-call i');
                if (muteBtn) {
                    if (audioTrack.enabled) {
                        muteBtn.classList.remove('fa-microphone-slash');
                        muteBtn.classList.add('fa-microphone');
                    } else {
                        muteBtn.classList.remove('fa-microphone');
                        muteBtn.classList.add('fa-microphone-slash');
                    }
                }
            }
        }
    }
    
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                
                // Actualizar icono del botón
                const videoBtn = document.querySelector('.add-call i');
                if (videoBtn) {
                    if (videoTrack.enabled) {
                        videoBtn.classList.remove('fa-video');
                        videoBtn.classList.add('fa-video-slash');
                    } else {
                        videoBtn.classList.remove('fa-video-slash');
                        videoBtn.classList.add('fa-video');
                    }
                }
            }
        }
    }
    
    endCall() {
        // Notificar a otros usuarios
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'leave-call',
                chatId: this.currentChatId,
                userId: this.currentUserId
            }));
        }
        
        // Cerrar todas las conexiones peer
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        // Detener stream local
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Limpiar streams remotos
        this.remoteStreams.clear();
        
        // Limpiar UI
        const container = document.querySelector('.sep-call');
        if (container) {
            container.innerHTML = '';
        }
        
        // Ocultar modal
        this.hideCallModal();
        
        // Reset estado
        this.callActive = false;
        this.isInitiator = false;
    }
}

// Inicializar el gestor de videollamadas cuando el DOM esté listo
// let videoCallManager;
// document.addEventListener('DOMContentLoaded', function() {
//     // Esperar un poco para asegurar que las variables globales estén disponibles
//     setTimeout(() => {
//         videoCallManager = new VideoCallManager();
//     }, 1000);
// });