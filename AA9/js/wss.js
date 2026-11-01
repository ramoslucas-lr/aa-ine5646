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
if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
}

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

// Filtro de mensagens
let currentFilter = 'all';

function applyFilter(filter) {
    currentFilter = filter;
    const messages = messageList.querySelectorAll('.message');
    let visibleCount = 0;
    messages.forEach(msg => {
        const proto = msg.getAttribute('data-protocol');
        if (filter === 'all' || proto === filter) {
            msg.style.display = '';
            visibleCount++;
        } else {
            msg.style.display = 'none';
        }
    });
    if (visibleCount === 0) {
        noMessagesElement.style.display = 'block';
    } else {
        noMessagesElement.style.display = 'none';
    }
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        applyFilter(filter);
    });
});

function addMessage(data) {
    totalMessages++;
    const proto = (data.protocol || 'TCP').toUpperCase();
    if (proto === 'TCP') {
        tcpMessages++;
    } else if (proto === 'UDP') {
        udpMessages++;
    }
    tcpCountElement.textContent = tcpMessages;
    udpCountElement.textContent = udpMessages;
    totalCountElement.textContent = totalMessages;

    const div = document.createElement('div');
    div.className = `message ${proto.toLowerCase()}`;
    div.setAttribute('data-protocol', proto.toLowerCase());

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    const leftSpan = document.createElement('span');
    const badge = document.createElement('span');
    badge.className = `protocol-badge ${proto.toLowerCase()}-badge`;
    badge.textContent = proto;
    leftSpan.appendChild(badge);
    leftSpan.appendChild(document.createTextNode(` ${data.ip}:${data.port}`));

    const rightSpan = document.createElement('span');
    rightSpan.textContent = data.timestamp || '';

    headerDiv.appendChild(leftSpan);
    headerDiv.appendChild(rightSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = data.message || '';

    div.appendChild(headerDiv);
    div.appendChild(contentDiv);

    messageList.prepend(div);
    noMessagesElement.style.display = 'none';
    applyFilter(currentFilter);
}

// WebSocket Management
function connectWebSocket() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        return;
    }
    logDebug(`Conectando ao WebSocket: ${websocketUrl}`);
    try {
        websocket = new WebSocket(websocketUrl);
    } catch (err) {
        logDebug(`Erro ao abrir WebSocket: ${err}`);
        return;
    }

    websocket.onopen = function () {
        logDebug('WebSocket conectado');
        startHeartbeat();
    };

    websocket.onmessage = function (event) {
        logDebug(`Mensagem recebida: ${event.data}`);
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'heartbeat_response') {
                syncCountdown(data.inactivity_remaining, data.inactivity_limit);
                startCountdown();
                return;
            }
            addMessage(data);
        } catch (e) {
            console.error('Erro ao processar mensagem recebida:', e);
        }
    };

    websocket.onclose = function () {
        logDebug('WebSocket desconectado');
        stopHeartbeat();
        websocket = null;
    };

    websocket.onerror = function (error) {
        console.error('Erro no WebSocket:', error);
    };
}

function disconnectWebSocket() {
    if (websocket) {
        logDebug('Desconectando WebSocket...');
        stopHeartbeat();
        websocket.close();
        websocket = null;
    }
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'heartbeat' }));
        }
    }, 5000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Server Manager HTTP Communication (usando XMLHttpRequest)
function callManager(action, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${managerUrl}?action=${action}&_=${Date.now()}`, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    callback(null, data, xhr.responseText);
                } catch (e) {
                    callback(e, null, xhr.responseText);
                }
            } else {
                callback(new Error(`HTTP ${xhr.status}`), null, xhr.responseText);
            }
        }
    };
    xhr.onerror = function () {
        callback(new Error('Falha de rede ao contatar gerenciador'), null, null);
    };
    xhr.send();
}

function updateServerStatus(status, message) {
    logDebug(`Atualizando status do servidor: ${status}`);
    if (status === 'running') {
        statusDot.className = 'status-dot status-online';
        statusText.textContent = message || 'Servidor online';
        startServerBtn.disabled = true;
        stopServerBtn.disabled = false;
        connectWebSocket();
    } else if (status === 'stopped') {
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = message || 'Servidor offline';
        startServerBtn.disabled = false;
        stopServerBtn.disabled = true;
        disconnectWebSocket();
        stopCountdown();
    } else {
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = message || 'Status desconhecido';
    }
}

function checkServerStatus() {
    logDebug('Verificando status do servidor...');
    callManager('status', (err, data, raw) => {
        if (err || !data) {
            logDebug('Erro ao verificar status: ' + (err ? err.message : 'Sem resposta'));
            return;
        }
        logDebug(`Status recebido: ${raw.trim()}`);
        updateServerStatus(data.server_status, data.message);
    });
}

startServerBtn.addEventListener('click', () => {
    startServerBtn.disabled = true;
    statusText.textContent = 'Iniciando servidor...';
    logDebug('Solicitando início do servidor...');
    callManager('start', (err, data, raw) => {
        if (err || !data) {
            logDebug('Erro ao iniciar servidor: ' + (err ? err.message : 'Sem resposta'));
            startServerBtn.disabled = false;
            return;
        }
        logDebug(`Resposta do início: ${raw.trim()}`);
        updateServerStatus(data.server_status, data.message);
    });
});

stopServerBtn.addEventListener('click', () => {
    stopServerBtn.disabled = true;
    statusText.textContent = 'Parando servidor...';
    logDebug('Solicitando parada do servidor...');
    disconnectWebSocket();
    callManager('stop', (err, data, raw) => {
        if (err || !data) {
            logDebug('Erro ao parar servidor: ' + (err ? err.message : 'Sem resposta'));
            stopServerBtn.disabled = false;
            return;
        }
        logDebug(`Resposta bruta: ${raw.trim()}`);
        logDebug(`Resposta da parada: ${JSON.stringify(data)}`);
        updateServerStatus(data.server_status, data.message);
        logDebug('Desconectando WebSocket...');
    });
});

clearMessagesBtn.addEventListener('click', () => {
    logDebug('Limpando mensagens');
    tcpMessages = 0;
    udpMessages = 0;
    totalMessages = 0;
    tcpCountElement.textContent = '0';
    udpCountElement.textContent = '0';
    totalCountElement.textContent = '0';
    const messages = messageList.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    noMessagesElement.style.display = 'block';
});

// Inicialização imediata
checkServerStatus();

// Polling periódico de verificação a cada 60 segundos
setInterval(checkServerStatus, 60000);
