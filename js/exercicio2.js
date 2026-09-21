function tratadorDeCliqueExercicio2() {
    let agora = new Date();
    let horas = agora.getHours();
    let minutos = agora.getMinutes();
    let segundos = agora.getSeconds();
    
    let ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12; 
    
    window.alert("Horário: " + horas + " " + ampm + " : " + minutos + "m : " + segundos + "s");
}