// signaling-server.js
// Servidor de señalización WebSocket para WebRTC
// Ejecutar con: node signaling-server.js

const WebSocket = require('ws');
const http = require('http');

// Crear servidor HTTP
const server = http.createServer();

// Crear servidor WebSocket
const wss = new WebSocket.Server({ server });

// Almacenar usuarios conectados
const users = new Map();
const userChats = new Map(); // userId -> chatId

// Manejar conexiones WebSocket
wss.on('connection', (ws) => {
    console.log('Nueva conexión WebSocket');
    
    let userId = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'register':
                    // Registrar usuario
                    userId = data.userId;
                    users.set(userId, ws);
                    console.log(`Usuario ${userId} registrado`);
                    break;
                    
                case 'start-call':
                    // Iniciar llamada en un chat
                    const { chatId, withVideo } = data;
                    userChats.set(userId, chatId);
                    
                    // Notificar a todos los usuarios del chat
                    broadcastToChat(chatId, {
                        type: 'incoming-call',
                        chatId: chatId,
                        callerId: userId,
                        withVideo: withVideo
                    }, userId);
                    
                    console.log(`Usuario ${userId} inició llamada en chat ${chatId}`);
                    break;
                    
                case 'join-call':
                    // Usuario se une a una llamada
                    userChats.set(data.userId, data.chatId);
                    
                    // Notificar a otros usuarios en la llamada
                    broadcastToChat(data.chatId, {
                        type: 'join-call',
                        userId: data.userId,
                        chatId: data.chatId
                    }, data.userId);
                    break;
                    
                case 'offer':
                    // Reenviar oferta al destinatario
                    sendToUser(data.to, {
                        type: 'offer',
                        offer: data.offer,
                        from: data.from,
                        chatId: userChats.get(data.from)
                    });
                    break;
                    
                case 'answer':
                    // Reenviar respuesta al destinatario
                    sendToUser(data.to, {
                        type: 'answer',
                        answer: data.answer,
                        from: data.from
                    });
                    break;
                    
                case 'ice-candidate':
                    // Reenviar candidato ICE
                    sendToUser(data.to, {
                        type: 'ice-candidate',
                        candidate: data.candidate,
                        from: data.from
                    });
                    break;
                    
                case 'leave-call':
                    // Usuario deja la llamada
                    const chatIdToLeave = userChats.get(data.userId);
                    if (chatIdToLeave) {
                        broadcastToChat(chatIdToLeave, {
                            type: 'leave-call',
                            userId: data.userId
                        }, data.userId);
                        userChats.delete(data.userId);
                    }
                    break;
                    
                case 'call-rejected':
                    // Llamada rechazada
                    sendToUser(data.to, {
                        type: 'call-rejected',
                        from: data.from
                    });
                    break;
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`Conexión cerrada para usuario ${userId}`);
        if (userId) {
            // Notificar si estaba en una llamada
            const chatId = userChats.get(userId);
            if (chatId) {
                broadcastToChat(chatId, {
                    type: 'leave-call',
                    userId: userId
                }, userId);
                userChats.delete(userId);
            }
            users.delete(userId);
        }
    });
    
    ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
    });
});

// Función para enviar mensaje a un usuario específico
function sendToUser(userId, message) {
    const userWs = users.get(userId.toString());
    if (userWs && userWs.readyState === WebSocket.OPEN) {
        userWs.send(JSON.stringify(message));
    }
}

// Función para broadcast a todos los usuarios en un chat (excepto el remitente)
function broadcastToChat(chatId, message, excludeUserId) {
    // En una implementación real, necesitarías obtener los usuarios del chat desde la base de datos
    // Por ahora, enviamos a todos los usuarios conectados que estén en el mismo chat
    userChats.forEach((userChatId, userId) => {
        if (userChatId === chatId && userId !== excludeUserId) {
            sendToUser(userId, message);
        }
    });
}

// Iniciar servidor
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor de señalización escuchando en puerto ${PORT}`);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('Cerrando servidor...');
    wss.close(() => {
        server.close(() => {
            console.log('Servidor cerrado');
            process.exit(0);
        });
    });
});