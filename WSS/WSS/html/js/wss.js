// ============================================================================
// Monitor de Mensagens TCP/UDP - Versão WSS (página HTTPS + WebSocket wss://)
// ============================================================================

// Depuração
const debugInfo = document.getElementById('debugInfo');
const debugToggle = document.getElementById('debugToggle');
let debugMode = false;

// Configurações
// URL do gerenciador do servidor (caminho relativo: funciona na raiz e em /AA/AAx/)
const managerUrl = 'py/server_manager.py';

// WebSocket seguro via PROXY do Apache
const websocketUrl = `wss://${window.location.host}/wss`;

debugToggle.addEventListener('click', () => {
    debugMode = !debugMode;
    debugInfo.style.display = debugMode ? 'block' : 'none';
    debugToggle.textContent = debugMode ? 'Ocultar Informações de Depuração' : 'Exibir Informações de Depuração';
});

function logDebug(message) {
    const now = new Date().toISOString();
    debugInfo.innerHTML += `[${now}] ${message}\n`;
    debugInfo.scrollTop = debugInfo.scrollHeight;
    console.log(`[DEBUG] ${message}`);
}

// Contadores de mensagens
let tcpMessages = 0;
let udpMessages = 0;
let totalMessages = 0;
let websocket = null;
let heartbeatInterval = null;

// Elementos DOM
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const startServerBtn = document.getElementById('startServer');
const stopServerBtn = document.getElementById('stopServer');
const clearMessagesBtn = document.getElementById('clearMessages');
const messageList = document.getElementById('messageList');
const noMessagesElement = document.getElementById('noMessages');
const tcpCountElement = document.getElementById('tcpCount');
const udpCountElement = document.getElementById('udpCount');
const totalCountElement = document.getElementById('totalCount');
const currentYearElement = document.getElementById('currentYear');
const tabs = document.querySelectorAll('.tab');

// Definir o ano atual no rodapé
currentYearElement.textContent = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Contador de inatividade (contagem regressiva sincronizada com o servidor)
// O servidor encerra após N segundos SEM mensagens TCP/UDP; aqui mostramos
// quanto falta. Reseta a cada mensagem recebida.
// ---------------------------------------------------------------------------
const inactivityTimer = document.getElementById('inactivityTimer');
const inactivityValue = document.getElementById('inactivityValue');
let inactivityRemaining = null;   // segundos restantes (null = sem contagem)
let inactivityLimit = 180;        // atualizado pelo servidor
let countdownInterval = null;

function formatMMSS(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function renderCountdown() {
    if (!inactivityTimer) return;
    if (inactivityRemaining === null) {
        inactivityTimer.style.display = 'none';
        return;
    }
    inactivityTimer.style.display = '';
    inactivityValue.textContent = formatMMSS(inactivityRemaining);
    inactivityTimer.classList.remove('ok', 'warn', 'danger');
    const frac = inactivityLimit ? inactivityRemaining / inactivityLimit : 1;
    if (inactivityRemaining <= 15) inactivityTimer.classList.add('danger');
    else if (frac <= 0.34) inactivityTimer.classList.add('warn');
    else inactivityTimer.classList.add('ok');
}

function startCountdown() {
    if (countdownInterval) return;
    countdownInterval = setInterval(() => {
        if (inactivityRemaining === null) return;
        inactivityRemaining = Math.max(0, inactivityRemaining - 1);
        renderCountdown();
        if (inactivityRemaining === 0) {
            inactivityValue.textContent = '00:00';
            statusText.textContent = 'Servidor encerrado por inatividade';
        }
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    inactivityRemaining = null;
    renderCountdown();
}

// Sincroniza com o valor informado pelo servidor (via heartbeat_response)
function syncCountdown(remaining, limit) {
    if (typeof limit === 'number' && limit > 0) inactivityLimit = limit;
    inactivityRemaining = (remaining === null || remaining === undefined) ? null : remaining;
    renderCountdown();
}

// Implemente o restante...
