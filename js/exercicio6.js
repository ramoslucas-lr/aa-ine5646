function tratadorDeCliqueExercicio6() {
    let str = window.prompt("Informe uma string para inverter:");
    if (str !== null) {
        let strInvertida = str.split('').reverse().join('');
        console.log(strInvertida);
    }
}
