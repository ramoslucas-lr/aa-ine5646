const formCadastro     = document.getElementById('form-cadastro');
const secaoCadastro    = document.getElementById('secao-cadastro');
const secaoLocalidades = document.getElementById('secao-localidades');
const msgLoading       = document.getElementById('msg-loading');
const msgCadastro      = document.getElementById('msg-cadastro');

// Campos de endereço
const campoCep        = document.getElementById('cep');
const campoLogradouro = document.getElementById('logradouro');
const campoBairro     = document.getElementById('bairro');
const campoCidade     = document.getElementById('cidade');
const campoEstado     = document.getElementById('estado');
const msgCep          = document.getElementById('msg-cep');

// Campos de validação
const campoCpf        = document.getElementById('cpf');
const msgCpf          = document.getElementById('msg-cpf');
const campoSenha      = document.getElementById('senha');
const campoRepitaSenha= document.getElementById('repita-senha');
const msgSenha        = document.getElementById('msg-senha');

const btnCadastrar = document.getElementById('btn-cadastrar');

// Efeitos visuais de Check verde (Nome e Sobrenome)
document.getElementById('nome').addEventListener('input', (e) => {
    document.getElementById('check-nome').style.display = e.target.value.trim() ? 'inline' : 'none';
});
document.getElementById('sobrenome').addEventListener('input', (e) => {
    document.getElementById('check-sobrenome').style.display = e.target.value.trim() ? 'inline' : 'none';
});

function mostrarCadastro() {
    if (msgLoading) msgLoading.hidden = true;
    secaoCadastro.hidden = false;
    secaoLocalidades.hidden = true;
}

function mostrarLocalidades(nomeUsuario) {
    if (msgLoading) msgLoading.hidden = true;
    secaoCadastro.hidden = true;
    secaoLocalidades.hidden = false;
    const boasVindas = document.getElementById('boas-vindas');
    if (boasVindas) boasVindas.textContent = `Bem-vindo(a), ${nomeUsuario}!`;
    if (typeof window.carregarUFs === 'function') window.carregarUFs();
}

// ==== VALIDAÇÕES ====
function validarCPF() {
    const cpfLimpo = campoCpf.value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        msgCpf.textContent = `CPF precisa ter 11 dígitos. Porém, ${cpfLimpo.length} informados.`;
        return false;
    }
    msgCpf.textContent = '';
    return true;
}
campoCpf.addEventListener('blur', validarCPF);

function validarSenhas() {
    if (campoSenha.value !== campoRepitaSenha.value) {
        msgSenha.textContent = 'As senhas não coincidem.';
        return false;
    }
    msgSenha.textContent = '';
    return true;
}
campoRepitaSenha.addEventListener('input', validarSenhas);

// ==== VIACEP ====
async function buscarEnderecoPorCep(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    msgCep.textContent = '';

    if (cepLimpo.length !== 8) {
        msgCep.textContent = 'CEP deve ter 8 dígitos.';
        return;
    }

    try {
        const resp  = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!resp.ok) throw new Error('Falha HTTP');
        const dados = await resp.json();

        if (dados.erro) {
            msgCep.textContent = 'CEP não encontrado.';
            campoLogradouro.value = '';
            campoBairro.value = '';
            campoCidade.value = '';
            campoEstado.value = '';
            return;
        }
        campoLogradouro.value = dados.logradouro || '';
        campoBairro.value     = dados.bairro     || '';
        campoCidade.value     = dados.localidade || '';
        campoEstado.value     = dados.uf         || '';
    } catch (e) {
        console.error('ViaCEP:', e);
        msgCep.textContent = 'Falha ao consultar o CEP.';
    }
}

campoCep.addEventListener('blur', (ev) => {
    if (ev.target.value.trim()) buscarEnderecoPorCep(ev.target.value);
});
campoCep.addEventListener('input', (ev) => {
    if (ev.target.value.replace(/\D/g, '').length === 8) {
        buscarEnderecoPorCep(ev.target.value);
    }
});

// ==== SUBMIT ====
formCadastro.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msgCadastro.textContent = '';

    const cpfValido = validarCPF();
    const senhasValidas = validarSenhas();

    if (!cpfValido || !senhasValidas) {
        return; // Para o envio se CPF ou senha estiverem errados
    }

    const payload = {
        nome:       document.getElementById('nome').value.trim(),
        sobrenome:  document.getElementById('sobrenome').value.trim(),
        cpf:        campoCpf.value.replace(/\D/g, ''),
        email:      document.getElementById('email').value.trim().toLowerCase(),
        senha:      campoSenha.value,
        cep:        campoCep.value.trim(),
        logradouro: campoLogradouro.value.trim(),
        bairro:     campoBairro.value.trim(),
        cidade:     campoCidade.value.trim(),
        estado:     campoEstado.value.trim(),
    };

    btnCadastrar.disabled = true;
    btnCadastrar.textContent = 'Enviando...';

    try {
        const resp = await fetch('api/register.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const dados = await resp.json();

        if (!dados.success) {
            msgCadastro.textContent = dados.message || 'Falha no cadastro.';
            return;
        }

        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        window.location.href = 'login.html';
    } catch (e) {
        console.error('Cadastro:', e);
        msgCadastro.textContent = 'Falha de comunicação com o servidor.';
    } finally {
        btnCadastrar.disabled = false;
        btnCadastrar.textContent = 'Criar conta';
    }
});

window.mostrarCadastro    = mostrarCadastro;
window.mostrarLocalidades = mostrarLocalidades;