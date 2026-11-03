(async function verificarSessao() {
    try {
        const resp = await fetch('api/session.php', { cache: 'no-store' });
        if (resp.ok) {
            const dados = await resp.json();
            if (dados.logged) {
                window.mostrarLocalidades(dados.nome || dados.email);
                return;
            }
        }
        window.mostrarCadastro();
    } catch (e) {
        console.error('Session:', e);
        window.mostrarCadastro();
    }
})();