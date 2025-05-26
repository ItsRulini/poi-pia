// MAIN.js Completo con Sistema de Tareas y Recompensas integrado

// Variables globales (existentes)
let idUsuarioActualGlobal = null;
let avatarUsuarioActualGlobal = '../multimedia/logo.jpg';
let nombreUsuarioActualGlobal = 'Yo';
let chatActivoId = null;
let pollingIntervalId = null;
let ultimoIdMensajeRecibido = 0;
let selectedUsersForNewChat = [];
let estatusEncriptacionGlobal = false; // NUEVA VARIABLE

// Nuevas variables para el sistema de tareas
let esAdminChatActivo = false;
let tipoChatActivo = null;
let pollingTareasIntervalId = null;

// --- AGORA CONFIGURATION (existente) ---
const AGORA_APP_ID = 'ee7d538a95e24249bf0930ff97722936';
let agoraClient = null;
let localAudioTrack = null;
let localVideoTrack = null;
let remoteUsers = {};
let currentAgoraChannel = null;
let agoraUID = null;
let AGORA_TOKEN = null;
let isMicEnabled = true;
let isVideoEnabled = true;

// --- INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener("DOMContentLoaded", function () {
    cargarDatosUsuarioSidebar();
    cargarUltimosChats();
    inicializarListenersFormularioMensajes();
    inicializarListenersPopUps();
    inicializarListenersOtros();
    inicializarListenersTareas(); // Nueva función para tareas
});

function actualizarIndicadorEncriptacion() {
    const encryptionIndicator = document.getElementById('encryptionIndicator');
    if (encryptionIndicator) {
        if (estatusEncriptacionGlobal) {
            encryptionIndicator.style.display = 'flex';
        } else {
            encryptionIndicator.style.display = 'none';
        }
    }
}

// Actualizar el estado de encriptación cuando se cambie desde el perfil
function actualizarEstadoEncriptacionEnMemoria(nuevoEstado) {
    estatusEncriptacionGlobal = nuevoEstado;
    actualizarIndicadorEncriptacion();
}

// Función para recargar el estado de encriptación del usuario (útil después de cambios en el perfil)
function recargarEstadoEncriptacion() {
    fetch('../controllers/getMainUsuarioController.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.hasOwnProperty('estatusEncriptacion')) {
                estatusEncriptacionGlobal = data.estatusEncriptacion == 1;
                actualizarIndicadorEncriptacion();
            }
        })
        .catch(error => {
            console.error('Error recargando estado de encriptación:', error);
        });
}

// Verificar cambios en el localStorage (para sincronizar entre pestañas)
window.addEventListener('storage', function(e) {
    if (e.key === 'userEncryptionStatus') {
        estatusEncriptacionGlobal = e.newValue === 'true';
        actualizarIndicadorEncriptacion();
    }
});

// Al volver de la página de perfil, recargar el estado
window.addEventListener('focus', function() {
    recargarEstadoEncriptacion();
});


// --- NUEVA FUNCIÓN: INICIALIZAR LISTENERS DE TAREAS ---
function inicializarListenersTareas() {
    // Listener para el botón de crear tarea (ya existe pero lo mejoramos)
    const crearTareaButton = document.getElementById('Crear');
    if (crearTareaButton) {
        crearTareaButton.addEventListener('click', function() {
            if (!chatActivoId) {
                alert('Por favor selecciona un chat primero.');
                return;
            }
            if (tipoChatActivo !== 'Grupo') {
                alert('Las tareas solo están disponibles en chats grupales.');
                return;
            }
            if (!esAdminChatActivo) {
                alert('Solo el administrador del chat puede crear tareas.');
                return;
            }
            
            // Abrir el popup de crear tarea
            const popUpTarea = document.querySelector('.PopUp');
            if (popUpTarea) {
                popUpTarea.style.display = 'flex';
                cargarUsuariosParaTarea(); // Cargar usuarios para asignar la tarea
            }
        });
    }

    // Listener para enviar nueva tarea
    const taskBtn = document.querySelector('.task-btn');
    if (taskBtn) {
        taskBtn.addEventListener('click', function() {
            enviarNuevaTarea();
        });
    }

    // Listener para elementos de tarea (se añadirán dinámicamente)
    const taskContainer = document.querySelector('.task-container');
    if (taskContainer) {
        taskContainer.addEventListener('click', function(event) {
            const taskElement = event.target.closest('.task-progress');
            if (taskElement && taskElement.dataset.tareaId) {
                manejarClickTarea(taskElement);
            }
        });
    }

    // Listener para el botón de reclamar recompensas
    const crearRewardButton = document.getElementById('CrearReward');
    if (crearRewardButton) {
        crearRewardButton.addEventListener('click', function() {
            const popUpReward = document.querySelector('.PopUpReward');
            if (popUpReward) {
                popUpReward.style.display = 'flex';
                cargarRecompensasDisponibles();
            }
        });
    }

    // Listener para el botón de reclamar recompensa específica
    const claimRewardBtn = document.getElementById('claimRewardBtn');
    if (claimRewardBtn) {
        claimRewardBtn.addEventListener('click', function() {
            reclamarRecompensaSeleccionada();
        });
    }
}

// --- FUNCIONES DE CARGA EXISTENTES (sin cambios importantes) ---
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
                estatusEncriptacionGlobal = data.estatusEncriptacion == 1; // Actualizar estado de encriptación

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
                
                // Actualizar indicador de encriptación
                actualizarIndicadorEncriptacion();
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
                        abrirChat(chat.idChat, chat.nombreMostrado, chat.tipo, chat.idCreador);
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

// --- FUNCIÓN MODIFICADA: ABRIR CHAT CON INFORMACIÓN ADICIONAL ---
function abrirChat(idChat, nombreChat, tipoChat, idCreador) {
    console.log(`Abriendo chat ID: ${idChat}, Nombre: ${nombreChat}, Tipo: ${tipoChat}`);
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    if (pollingTareasIntervalId) clearInterval(pollingTareasIntervalId);
    
    ultimoIdMensajeRecibido = 0;
    chatActivoId = idChat;
    tipoChatActivo = tipoChat;
    esAdminChatActivo = (idCreador == idUsuarioActualGlobal);

    // Obtener información adicional del chat
    obtenerInfoChat(idChat).then(infoChat => {
        const chatDisplayNameElement = document.getElementById('chatActivoNombre');
        if (chatDisplayNameElement) {
            chatDisplayNameElement.textContent = infoChat.nombreMostrado || nombreChat;
        }

        // Si es chat privado, mostrar descripción del otro usuario
        if (tipoChat === 'Privado' && infoChat.descripcionOtroUsuario) {
            mostrarDescripcionChatPrivado(infoChat.descripcionOtroUsuario);
        } else {
            ocultarDescripcionChatPrivado();
        }
    });

    const windowChatMessages = document.getElementById('windowChatMessages');
    if (windowChatMessages) {
        windowChatMessages.innerHTML = `<p class="placeholder-chat-message" style="text-align:center; color: #8b6247;">Cargando mensajes para ${nombreChat}...</p>`;
        cargarMensajesDelChat(idChat);
    }

    // Actualizar estado del botón de tareas
    actualizarEstadoBotonesSegunChat();
    
    iniciarPollingNuevosMensajes(idChat);
    
    // Cargar tareas si es un chat grupal
    if (tipoChat === 'Grupo') {
        cargarTareasDelChat(idChat);
        iniciarPollingTareas(idChat);
    } else {
        limpiarSeccionTareas(); // Limpiar la sección de tareas para chats privados
    }
}

// --- NUEVAS FUNCIONES PARA INFORMACIÓN DEL CHAT ---
async function obtenerInfoChat(idChat) {
    try {
        const response = await fetch(`../controllers/obtenerInfoChatController.php?idChat=${idChat}`);
        if (!response.ok) throw new Error('Error al obtener información del chat');
        const data = await response.json();
        if (data.status === 'success') {
            return data.chat;
        }
        return {};
    } catch (error) {
        console.error('Error obteniendo información del chat:', error);
        return {};
    }
}

function mostrarDescripcionChatPrivado(descripcion) {
    const chatDisplayTop = document.querySelector('.chat-display-top .display-top-aux');
    if (chatDisplayTop) {
        // Remover descripción existente si la hay
        const descripcionExistente = chatDisplayTop.querySelector('.chat-description');
        if (descripcionExistente) {
            descripcionExistente.remove();
        }

        // Añadir nueva descripción
        const descripcionElement = document.createElement('p');
        descripcionElement.classList.add('chat-description');
        descripcionElement.style.fontSize = '14px';
        descripcionElement.style.color = 'rgba(97, 77, 63, 0.7)';
        descripcionElement.style.fontWeight = 'normal';
        descripcionElement.style.marginTop = '2px';
        descripcionElement.textContent = descripcion;
        
        chatDisplayTop.appendChild(descripcionElement);
    }
}

function ocultarDescripcionChatPrivado() {
    const descripcionExistente = document.querySelector('.chat-display-top .display-top-aux .chat-description');
    if (descripcionExistente) {
        descripcionExistente.remove();
    }
}

function actualizarEstadoBotonesSegunChat() {
    const crearTaskButton = document.getElementById('Crear');
    if (crearTaskButton) {
        if (tipoChatActivo === 'Grupo' && esAdminChatActivo) {
            crearTaskButton.style.pointerEvents = 'auto';
            crearTaskButton.style.opacity = '1';
            crearTaskButton.title = 'Crear nueva tarea';
        } else if (tipoChatActivo === 'Grupo' && !esAdminChatActivo) {
            crearTaskButton.style.pointerEvents = 'none';
            crearTaskButton.style.opacity = '0.5';
            crearTaskButton.title = 'Solo el administrador puede crear tareas';
        } else {
            crearTaskButton.style.pointerEvents = 'none';
            crearTaskButton.style.opacity = '0.3';
            crearTaskButton.title = 'Las tareas solo están disponibles en chats grupales';
        }
    }
}

// --- NUEVAS FUNCIONES PARA SISTEMA DE TAREAS ---
function cargarTareasDelChat(idChat) {
    fetch(`../controllers/obtenerTareasController.php?idChat=${idChat}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar tareas: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                if (data.esAdmin) {
                    mostrarTareasAdministrador(data.tareas);
                } else {
                    mostrarTareasUsuario(data.tareasPendientes, data.tareasCompletadas);
                }
            } else {
                console.warn('Error cargando tareas:', data.message);
                mostrarMensajeTareas('No se pudieron cargar las tareas.');
            }
        })
        .catch(error => {
            console.error('Error fetch tareas:', error);
            mostrarMensajeTareas('Error de conexión al cargar tareas.');
        });
}

function mostrarTareasAdministrador(tareas) {
    const taskContainer = document.querySelector('.task-container');
    const taskTitle = document.querySelector('.additional-container-p h1');
    
    if (taskTitle) taskTitle.textContent = 'Tasks Management';
    if (!taskContainer) return;
    
    taskContainer.innerHTML = '';
    
    if (tareas.length === 0) {
        taskContainer.innerHTML = '<p style="text-align:center; padding:20px; color: rgba(87, 71, 60, 0.7);">No hay tareas creadas aún.</p>';
        return;
    }
    
    tareas.forEach(tarea => {
        const taskDiv = document.createElement('div');
        taskDiv.classList.add('task-progress', 'admin-task');
        taskDiv.dataset.tareaId = tarea.idTarea;
        taskDiv.style.cursor = 'pointer';
        
        const progreso = tarea.totalAsignados > 0 ? Math.round((tarea.completadas / tarea.totalAsignados) * 100) : 0;
        
        taskDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1;">
                    <p style="font-weight: bold; margin-bottom: 5px; color: rgb(87, 71, 60);">${tarea.descripcion}</p>
                    <p style="font-size: 12px; color: rgba(87, 71, 60, 0.7);">
                        Progreso: ${tarea.completadas}/${tarea.totalAsignados} (${progreso}%)
                    </p>
                    <p style="font-size: 11px; color: rgba(87, 71, 60, 0.6);">
                        Recompensa: ${tarea.recompensa || 'Sin recompensa'}
                    </p>
                </div>
                <div style="width: 30px; height: 30px; border-radius: 50%; background: conic-gradient(#4caf50 ${progreso * 3.6}deg, #e0e0e0 0deg); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 10px; font-weight: bold; color: #333;">${progreso}%</span>
                </div>
            </div>
        `;
        
        taskDiv.addEventListener('click', () => {
            mostrarDetallesTareaAdmin(tarea);
        });
        
        taskContainer.appendChild(taskDiv);
    });
}

function mostrarTareasUsuario(tareasPendientes, tareasCompletadas) {
    const taskContainer = document.querySelector('.task-container');
    const taskTitle = document.querySelector('.additional-container-p h1');
    
    if (taskTitle) taskTitle.textContent = 'My Tasks';
    if (!taskContainer) return;
    
    taskContainer.innerHTML = '';
    
    // Mostrar tareas pendientes
    if (tareasPendientes.length > 0) {
        const pendientesTitle = document.createElement('h3');
        pendientesTitle.textContent = 'Pendientes';
        pendientesTitle.style.color = 'rgb(87, 71, 60)';
        pendientesTitle.style.fontSize = '16px';
        pendientesTitle.style.marginBottom = '10px';
        taskContainer.appendChild(pendientesTitle);
        
        tareasPendientes.forEach(tarea => {
            const taskDiv = document.createElement('div');
            taskDiv.classList.add('task-progress', 'user-task-pendiente');
            taskDiv.dataset.tareaId = tarea.idTarea;
            taskDiv.style.backgroundColor = '#fff3cd';
            taskDiv.style.borderLeft = '4px solid #ffc107';
            taskDiv.style.cursor = 'pointer';
            
            taskDiv.innerHTML = `
                <div style="width: 100%;">
                    <p style="font-weight: bold; margin-bottom: 5px; color: rgb(87, 71, 60);">${tarea.descripcion}</p>
                    <p style="font-size: 12px; color: rgba(87, 71, 60, 0.7);">
                        Estado: PENDIENTE
                    </p>
                    <p style="font-size: 11px; color: rgba(87, 71, 60, 0.6);">
                        Recompensa: ${tarea.recompensa || 'Sin recompensa'}
                    </p>
                </div>
            `;
            
            taskDiv.addEventListener('click', () => {
                mostrarModalCompletarTarea(tarea);
            });
            
            taskContainer.appendChild(taskDiv);
        });
    }
    
    // Mostrar tareas completadas
    if (tareasCompletadas.length > 0) {
        const completadasTitle = document.createElement('h3');
        completadasTitle.textContent = 'Completadas';
        completadasTitle.style.color = 'rgb(87, 71, 60)';
        completadasTitle.style.fontSize = '16px';
        completadasTitle.style.marginBottom = '10px';
        completadasTitle.style.marginTop = '15px';
        taskContainer.appendChild(completadasTitle);
        
        tareasCompletadas.forEach(tarea => {
            const taskDiv = document.createElement('div');
            taskDiv.classList.add('task-progress', 'user-task-completada');
            taskDiv.style.backgroundColor = '#d4edda';
            taskDiv.style.borderLeft = '4px solid #28a745';
            
            taskDiv.innerHTML = `
                <div style="width: 100%;">
                    <p style="font-weight: bold; margin-bottom: 5px; color: rgb(87, 71, 60);">${tarea.descripcion}</p>
                    <p style="font-size: 12px; color: rgba(87, 71, 60, 0.7);">
                        Estado: COMPLETADA ✓
                    </p>
                    <p style="font-size: 11px; color: rgba(87, 71, 60, 0.6);">
                        Recompensa obtenida: ${tarea.recompensa || 'Sin recompensa'}
                    </p>
                </div>
            `;
            
            taskContainer.appendChild(taskDiv);
        });
    }
    
    if (tareasPendientes.length === 0 && tareasCompletadas.length === 0) {
        taskContainer.innerHTML = '<p style="text-align:center; padding:20px; color: rgba(87, 71, 60, 0.7);">No tienes tareas asignadas.</p>';
    }
}

function limpiarSeccionTareas() {
    const taskContainer = document.querySelector('.task-container');
    const taskTitle = document.querySelector('.additional-container-p h1');
    
    if (taskTitle) taskTitle.textContent = 'Task Progress';
    if (taskContainer) {
        taskContainer.innerHTML = '<p style="text-align:center; padding:20px; color: rgba(87, 71, 60, 0.7);">Las tareas solo están disponibles en chats grupales.</p>';
    }
}

function mostrarMensajeTareas(mensaje) {
    const taskContainer = document.querySelector('.task-container');
    if (taskContainer) {
        taskContainer.innerHTML = `<p style="text-align:center; padding:20px; color: rgba(87, 71, 60, 0.7);">${mensaje}</p>`;
    }
}

function cargarUsuariosParaTarea() {
    if (!chatActivoId) return;
    
    fetch(`../controllers/getUsuariosChatController.php?idChat=${chatActivoId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.usuarios) {
                // CORREGIDO: Buscar el contenedor correcto para mostrar usuarios
                const taskInfoContainer = document.querySelector('.task-info');
                if (!taskInfoContainer) return;
                
                // Buscar o crear el contenedor de usuarios asignados
                let usuariosContainer = taskInfoContainer.querySelector('.usuarios-asignados-container');
                if (!usuariosContainer) {
                    usuariosContainer = document.createElement('div');
                    usuariosContainer.classList.add('usuarios-asignados-container');
                    usuariosContainer.style.marginBottom = '15px';
                    
                    // Insertar antes del contenedor de recompensa personalizada
                    const recompensaContainer = taskInfoContainer.querySelector('.task-check');
                    if (recompensaContainer) {
                        taskInfoContainer.insertBefore(usuariosContainer, recompensaContainer);
                    } else {
                        taskInfoContainer.appendChild(usuariosContainer);
                    }
                }
                
                usuariosContainer.innerHTML = '<h3>Esta tarea será asignada a:</h3>';
                
                const usuariosNoAdmin = data.usuarios.filter(u => !u.esUsuarioActual);
                if (usuariosNoAdmin.length === 0) {
                    usuariosContainer.innerHTML += '<p style="color: #888;">No hay otros usuarios en este chat.</p>';
                } else {
                    usuariosNoAdmin.forEach(usuario => {
                        usuariosContainer.innerHTML += `<p>• ${usuario.nombreCompleto} (@${usuario.usuario})</p>`;
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error cargando usuarios para tarea:', error);
        });
}

function enviarNuevaTarea() {
    const descripcionInput = document.querySelector('#task');
    const recompensaInput = document.querySelector('#recompensaPersonalizada');
    
    if (!descripcionInput || !recompensaInput) {
        alert('Por favor completa la descripción de la tarea y la recompensa personalizada.');
        return;
    }
    
    const descripcion = descripcionInput.value.trim();
    const recompensa = recompensaInput.value.trim();
    
    if (!descripcion) {
        alert('Por favor ingresa una descripción para la tarea.');
        return;
    }
    
    if (!recompensa) {
        alert('Por favor ingresa una recompensa personalizada para la tarea.');
        return;
    }
    
    const datosNuevaTarea = {
        descripcion: descripcion,
        idChat: chatActivoId,
        recompensa: recompensa
    };
    
    fetch('../controllers/crearTareaController.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosNuevaTarea)
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.status === 'success') {
            // Cerrar popup
            const popUp = document.querySelector('.PopUp');
            if (popUp) popUp.style.display = 'none';
            
            // Limpiar formulario
            descripcionInput.value = '';
            recompensaInput.value = '';
            
            // Recargar tareas
            cargarTareasDelChat(chatActivoId);
        }
    })
    .catch(error => {
        console.error('Error creando tarea:', error);
        alert('Error de conexión al crear la tarea.');
    });
}

// --- NUEVAS FUNCIONES PARA RECOMPENSAS ---
function cargarRecompensasDisponibles() {
    const recompensasContainer = document.getElementById('recompensasDisponibles');
    const claimBtn = document.getElementById('claimRewardBtn');
    
    if (!recompensasContainer) return;
    
    recompensasContainer.innerHTML = '<p style="text-align: center; color: rgba(228, 190, 165, 0.7);">Loading rewards...</p>';
    
    fetch('../controllers/obtenerRecompensasDisponiblesController.php')
        .then(response => response.json())
        .then(data => {
            recompensasContainer.innerHTML = '';
            if (data.status === 'success' && data.recompensas && data.recompensas.length > 0) {
                data.recompensas.forEach(recompensa => {
                    const recompensaDiv = document.createElement('div');
                    recompensaDiv.style.cssText = `
                        padding: 10px;
                        margin-bottom: 8px;
                        background-color: rgba(255,255,255,0.5);
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border: 2px solid transparent;
                    `;
                    
                    recompensaDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="margin: 0; font-weight: bold; color: rgb(87, 71, 60); font-size: 14px;">${recompensa.contenido}</p>
                                <p style="margin: 0; font-size: 12px; color: rgba(87, 71, 60, 0.7);">
                                    Tarea: ${recompensa.descripcionTarea}
                                </p>
                            </div>
                            <i class="fa-solid fa-trophy" style="color: #ffd700; font-size: 18px;"></i>
                        </div>
                    `;
                    
                    recompensaDiv.addEventListener('click', function() {
                        // Deseleccionar otras recompensas
                        document.querySelectorAll('#recompensasDisponibles > div').forEach(div => {
                            div.style.borderColor = 'transparent';
                            div.style.backgroundColor = 'rgba(255,255,255,0.5)';
                        });
                        
                        // Seleccionar esta recompensa
                        this.style.borderColor = 'rgb(228, 190, 165)';
                        this.style.backgroundColor = 'rgba(228, 190, 165, 0.2)';
                        
                        // Habilitar botón y guardar ID de recompensa
                        claimBtn.disabled = false;
                        claimBtn.textContent = 'Claim This Reward';
                        claimBtn.dataset.recompensaId = recompensa.idRecompensa;
                        claimBtn.dataset.recompensaContenido = recompensa.contenido;
                    });
                    
                    recompensasContainer.appendChild(recompensaDiv);
                });
            } else {
                recompensasContainer.innerHTML = '<p style="text-align: center; color: rgba(228, 190, 165, 0.7);">No tienes recompensas disponibles. ¡Completa algunas tareas primero!</p>';
                claimBtn.disabled = true;
                claimBtn.textContent = 'No rewards available';
            }
        })
        .catch(error => {
            console.error('Error cargando recompensas:', error);
            recompensasContainer.innerHTML = '<p style="text-align: center; color: red;">Error al cargar recompensas.</p>';
        });
}

function reclamarRecompensaSeleccionada() {
    const claimBtn = document.getElementById('claimRewardBtn');
    if (!claimBtn.dataset.recompensaId) {
        alert('Por favor selecciona una recompensa primero.');
        return;
    }
    
    const recompensaContenido = claimBtn.dataset.recompensaContenido;
    
    if (!confirm(`¿Estás seguro de que quieres equipar esta recompensa como tu descripción?\n\n"${recompensaContenido}"`)) {
        return;
    }
    
    fetch('../controllers/equiparRecompensaController.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `descripcion=${encodeURIComponent(recompensaContenido)}`
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.status === 'success') {
            // Cerrar popup
            const popUpReward = document.querySelector('.PopUpReward');
            if (popUpReward) popUpReward.style.display = 'none';
            
            // La descripción se actualizará automáticamente cuando se abra un chat privado
        }
    })
    .catch(error => {
        console.error('Error equipando recompensa:', error);
        alert('Error de conexión al equipar la recompensa.');
    });
}

function mostrarModalCompletarTarea(tarea) {
    // Crear modal dinámico para completar tarea
    const modalHTML = `
        <div class="PopUpCompletarTarea" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;">
            <div class="modal-completar-tarea" style="width: 400px; background-color: rgb(255, 247, 237); border-radius: 30px; padding: 20px; box-shadow: 2px 9px 49px -5px rgba(0, 0, 0, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: rgb(228, 190, 165); margin: 0;">Completar Tarea</h3>
                    <button class="close-completar-tarea" style="background: none; border: none; font-size: 20px; color: rgb(228, 190, 165); cursor: pointer;">×</button>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: rgb(87, 71, 60); font-weight: bold; margin-bottom: 10px;">Descripción:</p>
                    <p style="color: rgb(87, 71, 60); background-color: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">${tarea.descripcion}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: rgb(87, 71, 60); font-weight: bold; margin-bottom: 10px;">Recompensa al completar:</p>
                    <p style="color: rgb(87, 71, 60); background-color: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">${tarea.recompensa || 'Sin recompensa'}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: rgb(87, 71, 60); font-weight: bold; margin-bottom: 10px;">Adjuntar evidencia (simulado):</p>
                    <input type="file" id="evidenciaTarea" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc;">
                    <p style="font-size: 12px; color: rgba(87, 71, 60, 0.7); margin-top: 5px;">*El archivo es solo para simular el envío, no se guarda realmente.</p>
                </div>
                <button class="btn-completar-tarea" data-tarea-id="${tarea.idTarea}" style="width: 100%; padding: 12px; background-color: rgb(228, 190, 165); color: rgb(255, 247, 237); border: none; border-radius: 30px; cursor: pointer; font-weight: bold;">
                    Marcar como Completada
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.querySelector('.PopUpCompletarTarea');
    const closeBtn = modal.querySelector('.close-completar-tarea');
    const completarBtn = modal.querySelector('.btn-completar-tarea');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    completarBtn.addEventListener('click', () => {
        const evidenciaFile = document.getElementById('evidenciaTarea').files[0];
        if (!evidenciaFile) {
            if (!confirm('¿Estás seguro de completar la tarea sin adjuntar evidencia?')) {
                return;
            }
        }
        
        completarTarea(tarea.idTarea, modal);
    });
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function completarTarea(idTarea, modalElement) {
    const datosTarea = {
        idTarea: idTarea
    };
    
    fetch('../controllers/completarTareaController.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosTarea)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert(`¡Tarea completada! Recompensa obtenida: ${data.recompensa}`);
            modalElement.remove();
            cargarTareasDelChat(chatActivoId); // Recargar tareas
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error completando tarea:', error);
        alert('Error de conexión al completar la tarea.');
    });
}

function mostrarDetallesTareaAdmin(tarea) {
    // Modal para mostrar detalles de la tarea desde vista de administrador
    const modalHTML = `
        <div class="PopUpDetallesTarea" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;">
            <div class="modal-detalles-tarea" style="width: 500px; max-height: 80%; background-color: rgb(255, 247, 237); border-radius: 30px; padding: 20px; box-shadow: 2px 9px 49px -5px rgba(0, 0, 0, 0.1); overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: rgb(228, 190, 165); margin: 0;">Detalles de la Tarea</h3>
                    <button class="close-detalles-tarea" style="background: none; border: none; font-size: 20px; color: rgb(228, 190, 165); cursor: pointer;">×</button>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: rgb(87, 71, 60); font-weight: bold;">Descripción:</p>
                    <p style="color: rgb(87, 71, 60); background-color: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">${tarea.descripcion}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: rgb(87, 71, 60); font-weight: bold;">Recompensa:</p>
                    <p style="color: rgb(87, 71, 60); background-color: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">${tarea.recompensa || 'Sin recompensa'}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: rgb(87, 71, 60); font-weight: bold;">Estado de los usuarios:</p>
                    <div id="usuariosTareaDetalles" style="max-height: 200px; overflow-y: auto;"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.querySelector('.PopUpDetallesTarea');
    const closeBtn = modal.querySelector('.close-detalles-tarea');
    const usuariosContainer = document.getElementById('usuariosTareaDetalles');
    
    // Mostrar usuarios y su estado
    if (tarea.usuarios && tarea.usuarios.length > 0) {
        tarea.usuarios.forEach(usuario => {
            const estadoColor = usuario.estatus === 'Completada' ? '#28a745' : '#ffc107';
            const estadoTexto = usuario.estatus === 'Completada' ? 'COMPLETADA ✓' : 'PENDIENTE';
            const fechaTexto = usuario.estatus === 'Completada' ? 
                `Completada: ${new Date(usuario.fechaCompletada).toLocaleDateString()}` :
                `Asignada: ${new Date(usuario.fechaAsignacion).toLocaleDateString()}`;
            
            usuariosContainer.innerHTML += `
                <div style="display: flex; align-items: center; padding: 10px; margin-bottom: 8px; background-color: rgba(255,255,255,0.3); border-radius: 8px; border-left: 4px solid ${estadoColor};">
                    <img src="${usuario.avatar ? `../multimedia/imagenPerfil/${usuario.avatar}` : '../multimedia/logo.jpg'}" 
                         style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;" 
                         onerror="this.src='../multimedia/logo.jpg';">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-weight: bold; color: rgb(87, 71, 60);">${usuario.nombres || ''} ${usuario.paterno || ''}</p>
                        <p style="margin: 0; font-size: 12px; color: rgba(87, 71, 60, 0.7);">@${usuario.usuario}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-weight: bold; color: ${estadoColor}; font-size: 12px;">${estadoTexto}</p>
                        <p style="margin: 0; font-size: 10px; color: rgba(87, 71, 60, 0.6);">${fechaTexto}</p>
                    </div>
                </div>
            `;
        });
    } else {
        usuariosContainer.innerHTML = '<p style="text-align: center; color: rgba(87, 71, 60, 0.7);">No hay usuarios asignados a esta tarea.</p>';
    }
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function iniciarPollingTareas(idChat) {
    if (pollingTareasIntervalId) clearInterval(pollingTareasIntervalId);
    pollingTareasIntervalId = setInterval(() => {
        cargarTareasDelChat(idChat);
    }, 30000); // Actualizar cada 30 segundos
}

// --- TODAS LAS FUNCIONES EXISTENTES SE MANTIENEN IGUAL ---
// (Mantengo todas las funciones de Agora, mensajería, etc. que ya funcionan)

// --- FUNCIONES DE AGORA EXISTENTES (mantenidas como están) ---
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

    currentAgoraChannel = String(channelName);
    agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    agoraClient.on('user-published', handleUserPublished);
    agoraClient.on('user-unpublished', handleUserUnpublished);
    agoraClient.on('user-left', handleUserLeft);

    try {
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
            playerContainer.className = 'remote-player-wrapper';
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
        agoraClient.removeAllListeners();
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

function toggleMic(buttonElement) {
    if (localAudioTrack) {
        isMicEnabled = !isMicEnabled;
        localAudioTrack.setMuted(!isMicEnabled);
        updateCallButtonIcons();
    } else {
        console.log("Pista de audio local no disponible.");
    }
}

function toggleVideo(buttonElement) {
    if (localVideoTrack) {
        isVideoEnabled = !isVideoEnabled;
        localVideoTrack.setEnabled(isVideoEnabled);
        updateCallButtonIcons();
    } else {
        console.log("Pista de video local no disponible.");
    }
}

async function iniciarVideollamada(chatIdParaLlamada, chatNombreParaLlamada) {
    if (!chatIdParaLlamada || !chatNombreParaLlamada) {
        alert("No se pudo identificar el chat para iniciar la videollamada.");
        console.error("iniciarVideollamada: chatId o chatNombre no proporcionados.", chatIdParaLlamada, chatNombreParaLlamada);
        return;
    }
    console.log(`Iniciando videollamada para el chat: ${chatNombreParaLlamada} (ID: ${chatIdParaLlamada})`);

    const popUpCall = document.querySelector('.PopUpCall');
    if (popUpCall) popUpCall.style.display = 'flex';

    await joinAgoraChannel(String(chatIdParaLlamada));
}

// --- FUNCIONES DE MENSAJERÍA EXISTENTES (mantenidas) ---
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

    // Añadir indicador de encriptación si el mensaje está encriptado
    if (mensaje.esEncriptado == 1) {
        const lockIcon = document.createElement('i');
        lockIcon.className = 'fa-solid fa-lock';
        lockIcon.style.cssText = 'font-size: 10px; margin-left: 5px; color: #4caf50;';
        lockIcon.title = 'Mensaje encriptado';
        senderP.appendChild(lockIcon);
    }
    
    const textContainerDiv = document.createElement('div');
    textContainerDiv.classList.add('message-text-container');

    // --- MANEJO DE MULTIMEDIA ---
    let contenidoPrincipalMostrado = false;

    if (mensaje.multimediaUrl) {
        const mediaContainer = document.createElement('div');
        mediaContainer.classList.add('media-message-container');
        mediaContainer.style.marginBottom = '8px';
        
        const url = mensaje.multimediaUrl;
        const esUrlDeGoogleMaps = url.includes('google.com/maps') || url.includes('googleusercontent.com/maps');

        if (esUrlDeGoogleMaps) {
            // Enlace de ubicación
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: #4a9eff;
                text-decoration: none;
                padding: 8px 12px;
                background-color: rgba(74, 158, 255, 0.1);
                border-radius: 8px;
                border: 1px solid rgba(74, 158, 255, 0.3);
                transition: all 0.3s ease;
            `;
            link.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Ver Ubicación en Mapa`;
            link.onmouseover = () => link.style.backgroundColor = 'rgba(74, 158, 255, 0.2)';
            link.onmouseout = () => link.style.backgroundColor = 'rgba(74, 158, 255, 0.1)';
            
            mediaContainer.appendChild(link);
            contenidoPrincipalMostrado = true;
            
        } else if (mensaje.texto === '[Imagen]' || (/\.(jpeg|jpg|gif|png|webp)$/i).test(url)) {
            // Mostrar imagen
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Imagen adjunta";
            img.style.cssText = `
                max-width: 250px;
                max-height: 200px;
                border-radius: 8px;
                cursor: pointer;
                object-fit: cover;
                border: 1px solid rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            `;
            img.onmouseover = () => img.style.transform = 'scale(1.02)';
            img.onmouseout = () => img.style.transform = 'scale(1)';
            img.onclick = () => window.open(url, '_blank');
            img.onerror = function() {
                this.style.display = 'none';
                const errorText = document.createElement('p');
                errorText.textContent = '❌ Error al cargar la imagen';
                errorText.style.color = '#ff6b6b';
                mediaContainer.appendChild(errorText);
            };
            
            mediaContainer.appendChild(img);
            contenidoPrincipalMostrado = true;
            
        } else if (mensaje.texto === '[Video]' || (/\.(mp4|webm|ogg|mov|avi)$/i).test(url)) {
            // Mostrar video
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.preload = 'metadata';
            video.style.cssText = `
                max-width: 300px;
                max-height: 200px;
                border-radius: 8px;
                border: 1px solid rgba(0,0,0,0.1);
            `;
            
            mediaContainer.appendChild(video);
            contenidoPrincipalMostrado = true;
            
        } else if (mensaje.texto === '[Audio]' || (/\.(mp3|wav|aac|ogg|m4a)$/i).test(url)) {
            // Mostrar reproductor de audio
            const audioContainer = document.createElement('div');
            audioContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background-color: rgba(74, 158, 255, 0.1);
                border-radius: 8px;
                border: 1px solid rgba(74, 158, 255, 0.3);
            `;
            
            const audioIcon = document.createElement('i');
            audioIcon.className = 'fa-solid fa-volume-high';
            audioIcon.style.color = '#4a9eff';
            
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            audio.style.height = '30px';
            
            audioContainer.appendChild(audioIcon);
            audioContainer.appendChild(audio);
            mediaContainer.appendChild(audioContainer);
            contenidoPrincipalMostrado = true;
            
        } else {
            // Archivo genérico/descarga
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: #4a9eff;
                text-decoration: none;
                padding: 8px 12px;
                background-color: rgba(74, 158, 255, 0.1);
                border-radius: 8px;
                border: 1px solid rgba(74, 158, 255, 0.3);
                transition: all 0.3s ease;
            `;
            
            // Determinar ícono según el tipo de archivo
            let iconClass = 'fa-file';
            if (url.includes('.pdf')) iconClass = 'fa-file-pdf';
            else if (url.includes('.doc') || url.includes('.docx')) iconClass = 'fa-file-word';
            else if (url.includes('.xls') || url.includes('.xlsx')) iconClass = 'fa-file-excel';
            else if (url.includes('.zip') || url.includes('.rar')) iconClass = 'fa-file-zipper';
            
            const fileName = url.substring(url.lastIndexOf('/') + 1) || 'Descargar Archivo';
            link.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${fileName}`;
            
            link.onmouseover = () => link.style.backgroundColor = 'rgba(74, 158, 255, 0.2)';
            link.onmouseout = () => link.style.backgroundColor = 'rgba(74, 158, 255, 0.1)';
            
            mediaContainer.appendChild(link);
            contenidoPrincipalMostrado = true;
        }
        
        textContainerDiv.appendChild(mediaContainer);
    }

    // --- MOSTRAR TEXTO ADICIONAL ---
    // Solo mostrar texto si no es un placeholder de multimedia o si hay texto adicional
    if (!contenidoPrincipalMostrado || 
        (mensaje.texto && 
         mensaje.texto !== '[Imagen]' && 
         mensaje.texto !== '[Video]' && 
         mensaje.texto !== '[Audio]' && 
         mensaje.texto !== '[Ubicación]' && 
         mensaje.texto !== '[Archivo Adjunto]')) {
        
        const textP = document.createElement('p');
        textP.classList.add('message-text');
        textP.textContent = mensaje.texto || '';
        textP.style.margin = contenidoPrincipalMostrado ? '5px 0 0 0' : '0';
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

// --- FUNCIONES DE LISTENERS EXISTENTES (mantenidas) ---
// En MAIN.js
/*
function inicializarListenersFormularioMensajes() {
    const formEnviarMensaje = document.getElementById('formEnviarMensaje');
    const inputMensajeTexto = document.getElementById('inputMensajeTexto');
    const btnAdjuntarMedia = document.getElementById('btnAdjuntarMedia');
    const inputMediaFile = document.getElementById('inputMediaFile'); // Este es el input de tipo file
    const btnEnviarUbicacion = document.getElementById('btnEnviarUbicacion');

    // DEBUG: Verificar si los elementos existen
    console.log("inicializarListenersFormularioMensajes: btnAdjuntarMedia:", btnAdjuntarMedia, "inputMediaFile:", inputMediaFile);

    if (btnAdjuntarMedia && inputMediaFile) {
        btnAdjuntarMedia.addEventListener('click', (event) => {
            event.preventDefault(); // Prevenir cualquier acción por defecto del ícono si está en un form
            console.log("Clic en btnAdjuntarMedia"); // DEBUG
            inputMediaFile.click(); // Simular clic en el input file oculto
        });

        inputMediaFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            console.log("Archivo seleccionado por inputMediaFile:", file); // DEBUG
            if (file && chatActivoId) {
                subirArchivoACloudinary(file);
            } else if (!chatActivoId) {
                alert("Por favor, selecciona un chat antes de adjuntar un archivo.");
                console.warn("Intento de subir archivo sin chat activo.");
            }
            // Considera resetear el valor del input para permitir seleccionar el mismo archivo de nuevo
            // inputMediaFile.value = null; // Puedes hacerlo aquí o después de que la subida termine
        });
    }
    // ... (resto de la función para enviar ubicación y mensajes de texto)
    // Asegúrate que el listener del form no interfiera.
    if (formEnviarMensaje && inputMensajeTexto) {
        formEnviarMensaje.addEventListener('submit', (event) => {
            event.preventDefault();
            const texto = inputMensajeTexto.value.trim();
            if (!chatActivoId) { alert("Selecciona un chat para enviar mensajes."); return; }
            if (texto) { // Solo enviar si hay texto, los adjuntos se envían por su propio flujo
                enviarMensajeAlServidor(texto, null);
            } else if (!texto && !document.querySelector('#inputMediaFile').files.length) {
                // No hacer nada si el input está vacío y no se está subiendo un archivo
                // (la subida de archivo ya se maneja por el 'change' event)
            }
        });
    }
}

function enviarMensajeAlServidor(texto, multimediaUrl = null) {
    if (!chatActivoId) { alert("Selecciona un chat."); return; }
    if ((texto === null || texto.trim() === '') && !multimediaUrl) return;

    const datosMensaje = {
        idChat: chatActivoId,
        textoMensaje: texto,
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
            mostrarMensajeEnUI(data.mensaje);
            if (texto !== null && texto.trim() !== '') {
                document.getElementById('inputMensajeTexto').value = '';
            }
        } else {
            alert(data.message || "Error al enviar mensaje.");
        }
    })
    .catch(error => {
        console.error('Error enviarMensajeAlServidor:', error);
        alert('Error de conexión al enviar el mensaje.');
    });
}*/

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


function inicializarListenersPopUps() {
    const popUpConfigs = [
        { btnId: 'Crear', popUpSelector: '.PopUp', closeSelector: '.PopUp .close' },
        { btnId: 'CrearReward', popUpSelector: '.PopUpReward', closeSelector: '.PopUpReward .close-reward' },
        { btnId: 'CrearChat', popUpSelector: '.PopUpChat', closeSelector: '.PopUpChat .close-chat', action: loadUsersForNewChat },
        { btnId: 'CrearDelete', popUpSelector: '.PopUpDelete', closeSelector: '.PopUpDelete .close-delete' }
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
                
                // Acciones específicas para cada popup
                if (config.btnId === 'CrearReward') {
                    cargarRecompensasDisponibles();
                }
            });
        }
        if (closeBtn && popUp) {
            closeBtn.addEventListener('click', () => {
                popUp.style.display = 'none';
                if (config.popUpSelector === '.PopUpChat') resetNewChatPopup();
                if (config.popUpSelector === '.PopUpReward') resetRewardPopup();
            });
        }
    });

    const popUpCall = document.querySelector('.PopUpCall');
    if (popUpCall) {
        const closeCallButton = popUpCall.querySelector('.close-call');
        const hangupCallButton = popUpCall.querySelector('#hangupButton');

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

function resetRewardPopup() {
    const recompensasContainer = document.getElementById('recompensasDisponibles');
    const claimBtn = document.getElementById('claimRewardBtn');
    
    if (recompensasContainer) {
        recompensasContainer.innerHTML = '<p style="text-align: center; color: rgba(228, 190, 165, 0.7);">Loading rewards...</p>';
    }
    
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Select a reward first';
        delete claimBtn.dataset.recompensaId;
        delete claimBtn.dataset.recompensaContenido;
    }
}

function inicializarListenersOtros() {
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

    // Listener para videollamadas
    const botonIconoVideollamadaEnCabecera = document.getElementById('videoCallButtonInHeader');
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
}

// Funciones para crear nuevo chat (simplificadas)
function resetNewChatPopup() {
    selectedUsersForNewChat = [];
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    const chatToContainerNewChat = document.querySelector(".PopUpChat .chat-to");
    const groupChatNameInputContainer = document.querySelector('.PopUpChat .group-chat-name-container');
    const groupChatNameInput = document.getElementById('groupChatNameInput');
    
    if (userListForNewChatContainer) {
        userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Cargando usuarios...</p>';
    }
    if (chatToContainerNewChat) {
        const toLabel = chatToContainerNewChat.querySelector('p');
        chatToContainerNewChat.innerHTML = '';
        if(toLabel) chatToContainerNewChat.appendChild(toLabel);
    }
    if (groupChatNameInputContainer) groupChatNameInputContainer.style.display = 'none';
    if (groupChatNameInput) groupChatNameInput.value = '';
}

function loadUsersForNewChat() {
    const userListForNewChatContainer = document.getElementById('userListForNewChat');
    
    if (!userListForNewChatContainer) return;
    resetNewChatPopup();

    userListForNewChatContainer.innerHTML = '<p class="loading-users-message" style="text-align:center; color: #8b6247;">Cargando usuarios...</p>';
    
    fetch('../controllers/getUsuariosController.php')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar usuarios: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            userListForNewChatContainer.innerHTML = '';
            if (data.status === 'success' && data.usuarios) {
                if (data.usuarios.length === 0) {
                    userListForNewChatContainer.innerHTML = '<p style="text-align:center; color: #8b6247;">No hay otros usuarios para chatear.</p>';
                    return;
                }
                data.usuarios.forEach(user => {
                    if (String(user.idUsuario) === String(idUsuarioActualGlobal)) {
                        return;
                    }

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
                userListForNewChatContainer.innerHTML = '<p style-align:center; color: red;">Error de conexión al cargar usuarios.</p>';
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