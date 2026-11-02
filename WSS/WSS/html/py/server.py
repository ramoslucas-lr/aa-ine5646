#!/usr/bin/python3

'''
Servidor Combinado TCP/UDP com WebSocket para a página web.

- TCP 8080 (tcp_client.py), UDP 8081 (udp_client.py), WebSocket (wss://) 8082.
- As mensagens TCP/UDP são retransmitidas (broadcast) às páginas conectadas no
  WebSocket, que as exibe em tempo real.
'''

import socket
import sys
import threading
import json
import time
import os
import ssl
from simple_websocket_server import WebSocketServer, WebSocket

# ---------------------------------------------------------------------------
# Configurações
# ---------------------------------------------------------------------------
# Diretório temporário (pid/lock/atividade). Deve coincidir com server_manager.py.
# Padrão = produção; pode ser sobrescrito por env (lançador local run_local.py).
PATH = os.environ.get('WS_TMP_DIR', '/var/www/html/tmp/')
BUFFER_SIZE = 1024
TCP_PORT = 8080
UDP_PORT = 8081
WEBSOCKET_PORT = 8082
HOST = '0.0.0.0'  # TCP/UDP escutam em todas as interfaces

# Host do WebSocket.
# 127.0.0.1 (via SetEnv WS_WS_HOST 127.0.0.1), para a 8082 não ficar exposta.
WEBSOCKET_HOST = os.environ.get('WS_WS_HOST', HOST)

# TLS do WebSocket (wss direto no 8082). Se SSL_CERT/SSL_KEY estiverem definidos
# (via SetEnv no Apache), o server.py faz TLS -> TLS FIM A FIM atrás do proxy.
SSL_CERT = os.environ.get('WS_SSL_CERT')
SSL_KEY = os.environ.get('WS_SSL_KEY')

# Arquivo para registro de atividade
ACTIVITY_FILE = f'{PATH}message_server_activity.txt'
# Encerra o servidor após este tempo (s) SEM mensagens TCP/UDP (inatividade).
# A página mostra uma contagem regressiva sincronizada. 0 = nunca encerra.
INACTIVITY_LIMIT = int(os.environ.get('WS_INACTIVITY', '180'))
TCP_IDLE_TIMEOUT = 180  # s: fecha conexão TCP ociosa (evita vazar thread 24/7)

# Logs verbosos só quando WS_DEBUG=1. Em produção (padrão) o servidor fica
# "quieto" — assim o server.log NÃO cresce com o servidor rodando 24/7.
# Mensagens de ERRO são sempre exibidas.
DEBUG = os.environ.get('WS_DEBUG', '0') == '1'


# Implemente o restante...
