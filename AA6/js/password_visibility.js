// ==========================================================================
// AA6 - Controle de visibilidade da senha (password_visibility.js)
// ==========================================================================

function alternarVisibilidadeSenha() {
    const inputSenha = document.getElementById('login-password');
    if (!inputSenha) return;

    if (inputSenha.type === 'password') {
        mostrarSenha();
    } else {
        ocultarSenha();
    }
}

function mostrarSenha() {
    const inputSenha = document.getElementById('login-password');
    const olho = document.getElementById('olho');
    if (inputSenha) {
        inputSenha.type = 'text';
    }
    if (olho) {
        olho.classList.add('senha-visivel');
        olho.title = "Clique para ocultar a senha";
        // Altera o filtro do ícone para indicar visualmente que a senha está visível
        olho.style.filter = "invert(35%) sepia(85%) saturate(2000%) hue-rotate(190deg)";
    }
}

function ocultarSenha() {
    const inputSenha = document.getElementById('login-password');
    const olho = document.getElementById('olho');
    if (inputSenha) {
        inputSenha.type = 'password';
    }
    if (olho) {
        olho.classList.remove('senha-visivel');
        olho.title = "Clique para exibir a senha";
        olho.style.filter = "none";
    }
}