// itsrulini/poi-pia/poi-pia-44270a69551716e536b52fa192f96beb7e44033b/servidor/signaling-server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Usaremos un Map para almacenar los clientes conectados, asociando un ID único a cada conexión WebSocket.
const clients = new Map();
let clientIdCounter = 0; // Un simple contador para generar IDs únicos

console.log('Servidor de señalización WebSocket iniciado en el puerto 8080');

wss.on('connection', (ws) => {
    // Generar un ID único para este cliente
    clientIdCounter++;
    const clientId = clientIdCounter.toString();
    clients.set(clientId, ws);
    ws.clientId = clientId; // También podemos adjuntar el ID al objeto ws para fácil referencia

    console.log(`Cliente ${clientId} conectado.`);

    // Enviar al cliente su ID asignado
    ws.send(JSON.stringify({ type: 'your-id', id: clientId }));

    ws.on('message', (messageAsString) => {
        let message;
        try {
            message = JSON.parse(messageAsString);
            console.log(`Mensaje recibido del cliente ${ws.clientId}:`, message);
        } catch (error) {
            console.error(`Error al parsear mensaje del cliente ${ws.clientId}: ${messageAsString}`, error);
            // Opcionalmente, enviar un error de vuelta al cliente
            // ws.send(JSON.stringify({ type: 'error', message: 'Mensaje malformado.' }));
            return;
        }

        const targetId = message.targetId;

        if (targetId) {
            // Si el mensaje tiene un targetId, reenviarlo solo a ese cliente
            const targetClient = clients.get(targetId);
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                // Asegurarse de que el senderId esté presente para que el destinatario sepa quién envió
                const messageToSend = { ...message, senderId: ws.clientId };
                delete messageToSend.targetId; // El destinatario no necesita el targetId en el mensaje reenviado

                targetClient.send(JSON.stringify(messageToSend), (error) => {
                    if (error) {
                        console.error(`Error al enviar mensaje al cliente ${targetId}:`, error);
                    }
                });
                console.log(`Mensaje reenviado de ${ws.clientId} a ${targetId}`);
            } else {
                console.log(`Cliente objetivo ${targetId} no encontrado o no conectado.`);
                // Opcionalmente, informar al remitente que el destinatario no está disponible
                // ws.send(JSON.stringify({ type: 'error', message: `Usuario ${targetId} no disponible.`}));
            }
        } else {
            // Si no hay targetId, podrías decidir difundir a todos los demás o manejarlo como un error
            // Para WebRTC 1-a-1, los mensajes de señalización importantes (offer, answer, candidate)
            // siempre deberían tener un targetId.
            console.warn(`Mensaje del cliente ${ws.clientId} sin targetId. Tipo de mensaje: ${message.type}. Contenido:`, message);
            // Ejemplo de difusión a todos los demás (considera si esto es deseado para tu caso de uso):
            /*
            clients.forEach((client, id) => {
                if (id !== ws.clientId && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ ...message, senderId: ws.clientId }));
                }
            });
            console.log(`Mensaje difundido de ${ws.clientId} a todos los demás clientes.`);
            */
        }
    });

    ws.on('close', () => {
        clients.delete(ws.clientId);
        console.log(`Cliente ${ws.clientId} desconectado.`);
        // Opcionalmente, notificar a otros usuarios sobre la desconexión si es relevante
        // por ejemplo, si estaban en una llamada con este cliente.
    });

    ws.on('error', (error) => {
        console.error(`Error en la conexión del cliente ${ws.clientId}:`, error);
        // Asegurarse de limpiar el cliente si ocurre un error que cause la desconexión
        if (ws.clientId && clients.has(ws.clientId)) {
            clients.delete(ws.clientId);
            console.log(`Cliente ${ws.clientId} eliminado debido a un error.`);
        }
    });
});

// Pequeña función para manejar la salida limpia del servidor (Ctrl+C)
process.on('SIGINT', () => {
    console.log("Apagando el servidor de señalización...");
    wss.clients.forEach(client => {
        client.close();
    });
    wss.close(() => {
        console.log("Servidor de señalización cerrado.");
        process.exit(0);
    });
});