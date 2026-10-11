// ==========================================================================
// INE5646 - Programação para Web | Atividade de Aprendizagem 6 (AA6)
// Implementação do fluxo de navegação, validações e classes em JavaScript
// ==========================================================================

// --------------------------------------------------------------------------
// 1. Classes: CPF e Conta
// --------------------------------------------------------------------------

class CPF {
    constructor(valor) {
        if (!valor || valor.trim() === "") {
            throw new Error("O campo CPF não pode estar vazio.");
        }

        const apenasNumeros = valor.replace(/\D/g, '');
        const cpfLimpo = apenasNumeros.length === 11 ? apenasNumeros : valor.trim();

        if (cpfLimpo.length !== 11) {
            throw new Error("O CPF deve conter exatamente 11 dígitos.");
        }

        if (!/^\d{11}$/.test(cpfLimpo)) {
            throw new Error("O CPF deve conter apenas números.");
        }

        // Verifica se todos os dígitos são iguais
        let todosIguais = true;
        for (let i = 1; i < 11; i++) {
            if (cpfLimpo[i] !== cpfLimpo[0]) {
                todosIguais = false;
                break;
            }
        }
        if (todosIguais) {
            throw new Error("O CPF não pode ter todos os 11 dígitos iguais.");
        }

        // 1º Dígito verificador
        let soma1 = 0;
        for (let i = 0; i < 9; i++) {
            soma1 += parseInt(cpfLimpo[i]) * (10 - i);
        }
        let resto1 = (soma1 * 10) % 11;
        if (resto1 === 10) resto1 = 0;
        if (resto1 !== parseInt(cpfLimpo[9])) {
            throw new Error("O 1º dígito verificador do CPF é inválido.");
        }

        // 2º Dígito verificador
        let soma2 = 0;
        for (let i = 0; i < 10; i++) {
            soma2 += parseInt(cpfLimpo[i]) * (11 - i);
        }
        let resto2 = (soma2 * 10) % 11;
        if (resto2 === 10) resto2 = 0;
        if (resto2 !== parseInt(cpfLimpo[10])) {
            throw new Error("O 2º dígito verificador do CPF é inválido.");
        }

        this.valor = cpfLimpo;
    }
}

class Conta {
    constructor(nome, sobrenome, cpfObj, email, senha) {
        this.nome = nome;
        this.sobrenome = sobrenome;
        this.cpf = cpfObj;
        this.email = email;
        this.senha = senha;
        this.criadoEm = new Date();
    }
}

// --------------------------------------------------------------------------
// 2. Funções de Navegação e Alternância de Telas
// --------------------------------------------------------------------------

function ocultarTudo() {
    const elementos = ['divHome', 'login-body', 'nova-conta', 'areaLogada'];
    elementos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (typeof fecharDropdowns === 'function') {
        fecharDropdowns();
    }
}

function mostrarApenasHome() {
    ocultarTudo();
    const home = document.getElementById('divHome');
    if (home) home.style.display = 'block';
}

function mostrarApenasLogin() {
    ocultarTudo();
    const login = document.getElementById('login-body');
    if (login) login.style.display = 'block';

    // Reseta todos os campos do formulário de login
    const emailLogin = document.getElementById('login-email');
    const senhaLogin = document.getElementById('login-password');
    const manterConectado = document.getElementById('login-manter-conectado');
    const botaoLogin = document.getElementById('botaoLogin');

    if (emailLogin) emailLogin.value = '';
    if (senhaLogin) senhaLogin.value = '';
    if (manterConectado) manterConectado.checked = false;

    if (typeof ocultarSenha === 'function') {
        ocultarSenha();
    }

    if (botaoLogin) botaoLogin.disabled = true;
}

function mostrarApenasConta() {
    ocultarTudo();
    const conta = document.getElementById('nova-conta');
    if (conta) conta.style.display = 'block';

    // Reseta todos os campos e status do formulário de criação de conta
    const campos = ['campoNome', 'campoSobrenome', 'campoCPF', 'campoEmail', 'campoSenha', 'campoRepitaSenha'];
    campos.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });

    const statusIds = ['statusNome', 'statusSobrenome', 'statusCPF', 'statusEmail', 'statusSenha', 'statusRepitaSenha'];
    statusIds.forEach(id => {
        const p = document.getElementById(id);
        if (p) {
            p.textContent = '';
            p.className = '';
        }
    });

    const botaoCriarConta = document.getElementById('botaoCriarConta');
    if (botaoCriarConta) botaoCriarConta.disabled = true;
}

// --------------------------------------------------------------------------
// 3. Validação e Ações da Tela de Login
// --------------------------------------------------------------------------

function validarFormularioLogin() {
    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-password');
    const botaoLogin = document.getElementById('botaoLogin');

    if (!emailInput || !senhaInput || !botaoLogin) return;

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    // Regra: campo de e-mail deve conter um e apenas um caractere @
    const arrobas = (email.match(/@/g) || []).length;
    const emailValido = arrobas === 1 && email.indexOf('@') > 0 && email.indexOf('@') < (email.length - 1);
    const senhaValida = senha.length > 0;

    botaoLogin.disabled = !(emailValido && senhaValida);
}

function fazerLogin(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : 'usuário';

    ocultarTudo();

    // Exibe tela com sessão iniciada e botão de logout
    const areaLogada = document.getElementById('areaLogada');
    const usuarioLogadoEmail = document.getElementById('usuarioLogadoEmail');
    if (usuarioLogadoEmail) usuarioLogadoEmail.textContent = email;
    if (areaLogada) areaLogada.style.display = 'block';

    // Atualiza menu dropdown para exibir botão Logout
    const linkMenuLogin = document.getElementById('linkMenuLogin');
    const linkMenuConta = document.getElementById('linkMenuConta');
    const linkMenuLogout = document.getElementById('linkMenuLogout');
    const linhaDropdown = document.getElementById('linhaDropdown');

    if (linkMenuLogin) linkMenuLogin.style.display = 'none';
    if (linkMenuConta) linkMenuConta.style.display = 'none';
    if (linhaDropdown) linhaDropdown.style.display = 'none';
    if (linkMenuLogout) linkMenuLogout.style.display = 'block';
}

function fazerLogout() {
    // Encerra a sessão do usuário
    const linkMenuLogin = document.getElementById('linkMenuLogin');
    const linkMenuConta = document.getElementById('linkMenuConta');
    const linkMenuLogout = document.getElementById('linkMenuLogout');
    const linhaDropdown = document.getElementById('linhaDropdown');

    if (linkMenuLogin) linkMenuLogin.style.display = 'block';
    if (linkMenuConta) linkMenuConta.style.display = 'block';
    if (linhaDropdown) linhaDropdown.style.display = 'block';
    if (linkMenuLogout) linkMenuLogout.style.display = 'none';

    mostrarApenasHome();
}

// --------------------------------------------------------------------------
// 4. Validação da Tela de Criação de Conta
// --------------------------------------------------------------------------

function definirStatus(idStatus, valido, mensagemErro = '') {
    const p = document.getElementById(idStatus);
    if (!p) return;

    if (valido) {
        p.className = 'status-ok';
        p.innerHTML = '<i class="material-icons" style="font-size:16px; vertical-align:middle;">check_circle</i>';
    } else {
        p.className = 'status-fail';
        p.textContent = mensagemErro;
    }
}

function validaTextoEmBranco(elemento, idStatus, nomeCampo) {
    const valor = elemento ? elemento.value.trim() : '';
    if (valor === '') {
        definirStatus(idStatus, false, `${nomeCampo} não deve estar vazio.`);
        validarFormularioConta();
        return false;
    }
    definirStatus(idStatus, true);
    validarFormularioConta();
    return true;
}

function validarCPF(elemento) {
    const valor = elemento ? elemento.value.trim() : '';
    try {
        const cpfObj = new CPF(valor);
        definirStatus('statusCPF', true);
        validarFormularioConta();
        return cpfObj;
    } catch (erro) {
        definirStatus('statusCPF', false, erro.message);
        validarFormularioConta();
        return null;
    }
}

function validarEmailConta(elemento) {
    const valor = elemento ? elemento.value.trim() : '';
    if (valor === '') {
        definirStatus('statusEmail', false, 'O e-mail não deve estar vazio.');
        validarFormularioConta();
        return false;
    }
    const arrobas = (valor.match(/@/g) || []).length;
    if (arrobas !== 1 || valor.indexOf('@') === 0 || valor.indexOf('@') === (valor.length - 1)) {
        definirStatus('statusEmail', false, 'O e-mail deve conter uma e apenas uma @.');
        validarFormularioConta();
        return false;
    }
    definirStatus('statusEmail', true);
    validarFormularioConta();
    return true;
}

function validarSenhaConta() {
    const senhaInput = document.getElementById('campoSenha');
    const repitaInput = document.getElementById('campoRepitaSenha');

    const senha = senhaInput ? senhaInput.value : '';
    const repita = repitaInput ? repitaInput.value : '';

    let senhaValida = false;
    let repitaValida = false;

    if (senha === '') {
        definirStatus('statusSenha', false, 'A senha não deve estar vazia.');
    } else {
        // Indicação opcional de segurança
        let seguranca = 'Fraca';
        if (senha.length >= 8 && /[A-Z]/.test(senha) && /[0-9]/.test(senha)) {
            seguranca = 'Forte';
        } else if (senha.length >= 6) {
            seguranca = 'Média';
        }
        definirStatus('statusSenha', true);
        const pSenha = document.getElementById('statusSenha');
        if (pSenha) {
            pSenha.innerHTML += ` (Segurança: ${seguranca})`;
        }
        senhaValida = true;
    }

    if (repita === '') {
        definirStatus('statusRepitaSenha', false, 'Repita a senha.');
    } else if (senha !== repita) {
        definirStatus('statusRepitaSenha', false, 'As senhas não conferem.');
    } else {
        definirStatus('statusRepitaSenha', true);
        repitaValida = true;
    }

    validarFormularioConta();
    return senhaValida && repitaValida;
}

function formularioContaValido() {
    const nome = document.getElementById('campoNome')?.value.trim();
    const sobrenome = document.getElementById('campoSobrenome')?.value.trim();
    const cpfValor = document.getElementById('campoCPF')?.value.trim();
    const email = document.getElementById('campoEmail')?.value.trim();
    const senha = document.getElementById('campoSenha')?.value;
    const repita = document.getElementById('campoRepitaSenha')?.value;

    if (!nome || !sobrenome || !cpfValor || !email || !senha || !repita) {
        return false;
    }

    const arrobas = (email.match(/@/g) || []).length;
    if (arrobas !== 1 || email.indexOf('@') === 0 || email.indexOf('@') === (email.length - 1)) {
        return false;
    }

    if (senha !== repita) {
        return false;
    }

    try {
        new CPF(cpfValor);
    } catch {
        return false;
    }

    return true;
}

function validarFormularioConta() {
    const botaoCriarConta = document.getElementById('botaoCriarConta');
    if (botaoCriarConta) {
        botaoCriarConta.disabled = !formularioContaValido();
    }
}

function criarConta() {
    if (!formularioContaValido()) {
        alert('Por favor, preencha todos os campos corretamente antes de criar a conta.');
        return;
    }

    const nome = document.getElementById('campoNome').value.trim();
    const sobrenome = document.getElementById('campoSobrenome').value.trim();
    const cpfValor = document.getElementById('campoCPF').value.trim();
    const email = document.getElementById('campoEmail').value.trim();
    const senha = document.getElementById('campoSenha').value;

    try {
        const cpfObj = new CPF(cpfValor);
        const novaConta = new Conta(nome, sobrenome, cpfObj, email, senha);

        console.log("Conta criada com sucesso:", novaConta);
        alert("Conta criada com sucesso! Redirecionando para o login...");

        // Redireciona para a tela de login
        mostrarApenasLogin();
    } catch (e) {
        alert("Erro na validação do CPF: " + e.message);
    }
}

// --------------------------------------------------------------------------
// 5. Inicialização da Página
// --------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    mostrarApenasHome();
});
