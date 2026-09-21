function tratadorDeCliqueExercicio3() {
    let str = window.prompt("Informe uma string:");
    if (str !== null && str.length >= 2) {
        window.alert(str.substring(1, str.length - 1));
    } else if (str !== null) {
        window.alert(""); 
    }
}
