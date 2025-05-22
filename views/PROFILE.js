// views/PROFILE.js

document.addEventListener('DOMContentLoaded', function () {
    const crearTaskButton = document.getElementById('Crear'); // Botón para abrir pop-up de tareas
    const popUpTask = document.querySelector('.PopUp'); // Pop-up de tareas
    const closeTaskButton = document.querySelector('.PopUp .close'); // Botón para cerrar pop-up de tareas

    // --- PopUp de Tareas ---
    if (crearTaskButton) {
        crearTaskButton.addEventListener('click', function () { //
            if (popUpTask) popUpTask.style.display = 'flex'; //
        });
    }
    if (closeTaskButton) {
        closeTaskButton.addEventListener('click', function () { //
            if (popUpTask) popUpTask.style.display = 'none'; //
        });
    }

    // --- Cargar Datos del Perfil ---
    function cargarDatosPerfil() {
        fetch('../controllers/perfilController.php') // Ajustar ruta si es necesario
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.usuario) {
                    const user = data.usuario;
                    document.getElementById('profileUsername').value = user.usuario || '';
                    document.getElementById('profileBio').value = user.descripcion || 'Sin descripción equipada.'; // Valor por defecto
                    document.getElementById('profileBio').readOnly = true; // Hacerlo readonly según NOTA

                    document.getElementById('profileFirstName').value = user.nombres || '';
                    document.getElementById('profileLastName1').value = user.paterno || '';
                    document.getElementById('profileLastName2').value = user.materno || '';
                    
                    document.getElementById('profileEmail').value = user.correo || '';
                    
                    document.getElementById('profileBirthdate').value = user.fechaNacimiento || '';
                    
                    // Formatear fecha de registro si es necesario (ej. YYYY-MM-DD)
                    const fechaRegistro = user.fechaRegistro ? user.fechaRegistro.split(' ')[0] : '';
                    document.getElementById('profileMemberSince').value = fechaRegistro;
                    document.getElementById('profileMemberSince').readOnly = true;


                    if (user.avatar) {
                        // Asumimos que la carpeta multimedia está en relación al HTML/PHP que sirve la imagen
                        document.getElementById('profilePfpImage').src = `../multimedia/imagenPerfil/${user.avatar}`;
                    } else {
                        document.getElementById('profilePfpImage').src = '../multimedia/logo.jpg'; // Imagen por defecto
                    }

                    // Cargar recompensas (se implementará más adelante)
                    cargarRecompensas(data.recompensas || []);

                } else {
                    alert(data.message || 'No se pudieron cargar los datos del perfil.');
                    // Podrías redirigir al login si no hay sesión
                    // window.location.href = 'LOGIN.html';
                }
            })
            .catch(error => {
                console.error('Error al cargar datos del perfil:', error);
                alert('Error de conexión al cargar el perfil.');
            });
    }

    // --- Funcionalidad de Guardar Cambios (se implementará en el siguiente paso) ---
    const formProfile = document.getElementById('formProfile');
    if (formProfile) {
        formProfile.addEventListener('submit', function(event) {
            event.preventDefault();
            guardarCambiosPerfil();
        });
    }

    function guardarCambiosPerfil() {
        const formData = new FormData(formProfile);
        // No enviar 'usuario' ni 'descripcion' si son readonly y no deben modificarse por el usuario directamente aquí
        // formData.delete('usuario'); 
        // formData.delete('descripcion');
        // Si la contraseña está vacía, podríamos no enviarla para indicar que no se cambia
        if (document.getElementById('profilePassword').value === '') {
            formData.delete('contrasena');
        }

        fetch('../controllers/actualizarPerfilController.php', { // Crear este controlador
            method: 'POST',
            body: formData
            // Si subes imagen de avatar, no necesitas 'Content-Type': 'multipart/form-data', FormData lo hace.
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.status === 'success') {
                // Opcional: recargar datos o actualizar campos específicos si el controlador devuelve los datos actualizados
                if (data.nuevosDatos && data.nuevosDatos.avatar) {
                     document.getElementById('profilePfpImage').src = `../multimedia/imagenPerfil/${data.nuevosDatos.avatar}`;
                }
            }
        })
        .catch(error => {
            console.error('Error al guardar cambios:', error);
            alert('Error de conexión al guardar los cambios.');
        });
    }

    // --- Sección de Recompensas ---
    function cargarRecompensas(recompensas) {
        const rewardsList = document.getElementById('rewardsList');
        const noRewardsMessage = document.getElementById('noRewardsMessage');
        rewardsList.innerHTML = ''; // Limpiar lista previa

        if (recompensas && recompensas.length > 0) {
            noRewardsMessage.style.display = 'none';
            recompensas.forEach(recompensa => {
                const listItem = document.createElement('li');
                
                const rewardText = document.createElement('span');
                rewardText.textContent = recompensa.contenido; // Asumiendo que 'contenido' es la descripción
                
                const equipButton = document.createElement('button');
                equipButton.textContent = 'Set description';
                equipButton.classList.add('btn-set-description'); // Para estilos
                equipButton.dataset.rewardId = recompensa.idRecompensa; // O el contenido mismo si es único
                equipButton.dataset.rewardContent = recompensa.contenido;


                equipButton.addEventListener('click', function() {
                    equiparRecompensa(this.dataset.rewardContent);
                });

                listItem.appendChild(rewardText);
                listItem.appendChild(equipButton);
                rewardsList.appendChild(listItem);
            });
        } else {
            noRewardsMessage.style.display = 'block'; //
        }
    }

    function equiparRecompensa(descripcionRecompensa) {
        // console.log('Equipar recompensa:', descripcionRecompensa);
        fetch('../controllers/equiparRecompensaController.php', { // Crear este controlador
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `descripcion=${encodeURIComponent(descripcionRecompensa)}`
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.status === 'success') {
                document.getElementById('profileBio').value = descripcionRecompensa;
                // Actualizar la sesión en el backend si es necesario o recargar datos
            }
        })
        .catch(error => {
            console.error('Error al equipar recompensa:', error);
            alert('Error de conexión al equipar la recompensa.');
        });
    }


    // Cargar los datos del perfil cuando la página esté lista
    cargarDatosPerfil();
});