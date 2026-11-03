const IBGE_UFS = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
const IBGE_MUN = (uf) =>
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;

let ufsCarregadas = false;

window.carregarUFs = async function () {
    const selectUf = document.getElementById('select-uf');
    if (!selectUf || ufsCarregadas) return;
    ufsCarregadas = true;

    try {
        selectUf.innerHTML = '<option value="">Carregando UFs...</option>';
        const resp = await fetch(IBGE_UFS);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const ufs = await resp.json();

        ufs.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        selectUf.innerHTML = '<option value="">Selecione uma UF</option>';
        ufs.forEach(uf => {
            const opt = document.createElement('option');
            opt.value = uf.sigla;
            opt.textContent = `${uf.sigla} - ${uf.nome}`;
            selectUf.appendChild(opt);
        });
    } catch (e) {
        console.error('IBGE UFs:', e);
        selectUf.innerHTML = '<option value="">Erro ao carregar UFs</option>';
        ufsCarregadas = false;
    }
};

async function carregarMunicipios(sigla) {
    const selectMunicipio = document.getElementById('select-municipio');
    if (!selectMunicipio) return;

    selectMunicipio.disabled = true;
    selectMunicipio.innerHTML = '<option value="">Carregando municípios...</option>';

    try {
        const resp = await fetch(IBGE_MUN(sigla));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const muns = await resp.json();

        muns.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        selectMunicipio.innerHTML = '<option value="">Selecione um município</option>';
        muns.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nome;
            selectMunicipio.appendChild(opt);
        });
        selectMunicipio.disabled = false;
    } catch (e) {
        console.error('IBGE municípios:', e);
        selectMunicipio.innerHTML = '<option value="">Erro ao carregar municípios</option>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const selectUf = document.getElementById('select-uf');
    const selectMunicipio = document.getElementById('select-municipio');
    const btnLogout = document.getElementById('btn-logout');

    if (selectUf) {
        selectUf.addEventListener('change', (ev) => {
            const uf = ev.target.value;
            if (uf) {
                carregarMunicipios(uf);
            } else {
                selectMunicipio.innerHTML = '<option value="">Selecione uma UF primeiro</option>';
                selectMunicipio.disabled = true;
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await fetch('api/logout.php', { method: 'POST' });
            } catch (e) {
                console.error('Logout:', e);
            }
            window.location.href = 'login.html';
        });
    }
});