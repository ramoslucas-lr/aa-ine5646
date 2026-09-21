function tratadorDeCliqueExercicio4() {
    let num1 = window.prompt("Informe o primeiro número:");
    let num2 = window.prompt("Informe o segundo número:");
    
    if (num1 !== null && num2 !== null) {
        num1 = parseInt(num1);
        num2 = parseInt(num2);

        function checarIntervalo(num) {
            if (num >= 30 && num <= 50) {
                console.log(num + " está no intervalo [30,50].");
            } else if (num >= 60 && num <= 100) {
                console.log(num + " está no intervalo [60,100].");
            } else {
                console.log("O número informado não está em nenhum dos dois intervalos.");
            }
        }

        checarIntervalo(num1);
        checarIntervalo(num2);
    }
}
