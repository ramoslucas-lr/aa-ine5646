#!/usr/bin/python3

'''
Gerenciador do servidor TCP/UDP - executado como script CGI pelo Apache2.

Recebe ?action=start|stop|status|heartbeat|check_timeout e responde em JSON,
iniciando/parando o processo server.py e controlando o timeout de inatividade.
'''

import os
import sys
import json
import time
import signal
import socket
import subprocess
import psutil
import fcntl

# ---------------------------------------------------------------------------
# Configurações (caminhos no SISTEMA DE ARQUIVOS do servidor).
# ---------------------------------------------------------------------------
PATH = os.environ.get('WS_PY_DIR', '/var/www/html/py/')
PATH_TMP = os.environ.get('WS_TMP_DIR', '/var/www/html/tmp/')
SERVER_SCRIPT = f'{PATH}server.py'          # Caminho completo para server.py
PID_FILE = f'{PATH_TMP}message_server.pid'  # PID do servidor
LOCK_FILE = f'{PATH_TMP}message_server.lock'  # Lock de concorrência
ACTIVITY_FILE = f'{PATH_TMP}message_server_activity.txt'  # Última atividade
TIMEOUT = 300  # 5 minutos sem atividade para encerrar o servidor
WEBSOCKET_PORT = 8082  # Porta usada para confirmar que o servidor subiu
START_TIMEOUT = 5      # Espera máxima (s) para o servidor ficar no ar
STOP_TIMEOUT = 5       # Espera máxima (s) para o servidor encerrar


# Implemente o restante...
