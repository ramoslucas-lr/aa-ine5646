const formLogin = document.getElementById('form-login');
const msgLogin  = document.getElementById('msg-login');
const btnLogin  = document.getElementById('btn-login');

formLogin.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msgLogin.textContent = '';

    const payload = {
        email: document.getElementById('login-email').value.trim().toLowerCase(),
        senha: document.getElementById('login-senha').value,
    };

    if (!payload.email || !payload.senha) {
        msgLogin.textContent = 'Preencha e-mail e senha.';
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    try {
        const resp  = await fetch('api/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const dados = await resp.json();

        if (!dados.success) {
            msgLogin.textContent = dados.message || 'E-mail ou senha inválidos.';
            return;
        }

        window.location.href = 'index.html';
    } catch (e) {
        console.error('Login:', e);
        msgLogin.textContent = 'Falha de comunicação com o servidor.';
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});