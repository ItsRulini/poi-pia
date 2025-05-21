document.getElementById('Crear').addEventListener('click',
    function(){
        document.querySelector('.PopUp').style.display = 'flex';
    });
    
    document.querySelector('.close').addEventListener('click',
    function(){
        document.querySelector('.PopUp').style.display = 'none';
    });

document.getElementById('CrearReward').addEventListener('click',   
    function(){
    document.querySelector('.PopUpReward').style.display = 'flex';
    });
        
    document.querySelector('.close-reward').addEventListener('click',
    function(){
    document.querySelector('.PopUpReward').style.display = 'none';
    });

document.getElementById('CrearChat').addEventListener('click',   
    function(){
    document.querySelector('.PopUpChat').style.display = 'flex';
    });
            
    document.querySelector('.close-chat').addEventListener('click',
    function(){
    document.querySelector('.PopUpChat').style.display = 'none';
    });

document.getElementById('CrearDelete').addEventListener('click',   
    function(){
    document.querySelector('.PopUpDelete').style.display = 'flex';
    });
                
    document.querySelector('.close-delete').addEventListener('click',
    function(){
    document.querySelector('.PopUpDelete').style.display = 'none';
    });

    document.querySelectorAll('.call-trigger').forEach(icon => {
        icon.addEventListener('click', function() {
            document.querySelector('.PopUpCall').style.display = 'flex';
        });
    });
    
    document.querySelector('.close-call').addEventListener('click', function() {
        document.querySelector('.PopUpCall').style.display = 'none';
    });
    

//Scroll para los usuarios q quieres crear el nuevo chat
const container = document.querySelector(".chat-to");

container.addEventListener("wheel", (event) => {
  event.preventDefault(); // Evita el scroll de la página
  container.scrollLeft += event.deltaY; // Mueve el contenido horizontalmente
});

//agregar botones de los usuarios con los q se crea un nuevo chat
document.addEventListener("DOMContentLoaded", function () {
    const chatToContainer = document.querySelector(".chat-to");
    const userElements = document.querySelectorAll(".new-convo");

    userElements.forEach(user => {
        user.addEventListener("click", function () {
            const username = this.dataset.username || this.querySelector("p").textContent.trim(); //Obtener el nombre del usuario seleccionado

            //Se crea el boton
            const button = document.createElement("button");
            //Se pone el nombre del usuario seleccionado
            button.setAttribute("data-username", username);
            button.innerHTML = `${username} <i class="fa-solid fa-xmark"></i>`;

            //Elimina el boton al hacer click
            button.addEventListener("click", function () {
                button.remove();
            });

            //Agregar el botón al contenedor
            chatToContainer.appendChild(button);
        });
    });
});
//mirco
function toggleMic(button) {
    const icon = button.querySelector('i');
    icon.classList.toggle('fa-microphone');
    icon.classList.toggle('fa-microphone-slash');
}
//videollamada
function toggleVideo(button) {
    const icon = button.querySelector('i');
    icon.classList.toggle('fa-video-slash');
    icon.classList.toggle('fa-video');
}

// Simulando una lista de usuarios
const participants = [
    { name: "Skibidi", img: "logo.jpg" }
];

const container_call = document.querySelector(".sep-call");
container_call.innerHTML = "";

// Crear los container para cada usuario en la llamada
participants.forEach(p => {
    container_call.innerHTML += `
      <div class="new-call">
        <img src="${p.img}" alt="${p.name}">
      </div>
    `;
});

if (participants.length === 1) {
    // Si hay solo un participante, centrar el contenedor
    container_call.style.display = "flex";
    container_call.style.justifyContent = "center";
    container_call.style.alignItems = "center";
}
