document.getElementById('Crear').addEventListener('click',
    function(){
        document.querySelector('.PopUp').style.display = 'flex';
    });
    
    document.querySelector('.close').addEventListener('click',
    function(){
        document.querySelector('.PopUp').style.display = 'none';
    });