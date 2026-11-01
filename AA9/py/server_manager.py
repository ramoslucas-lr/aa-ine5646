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
import urllib.parse

# ---------------------------------------------------------------------------
# Configurações (caminhos no SISTEMA DE ARQUIVOS do servidor).
# ---------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
DEFAULT_TMP_DIR = os.path.join(BASE_DIR, 'tmp') + os.sep
DEFAULT_PY_DIR = CURRENT_DIR + os.sep

PATH = os.environ.get('WS_PY_DIR', DEFAULT_PY_DIR)
PATH_TMP = os.environ.get('WS_TMP_DIR', DEFAULT_TMP_DIR)

try:
    os.makedirs(PATH_TMP, exist_ok=True)
except Exception:
    pass

SERVER_SCRIPT = os.path.join(PATH, 'server.py')          # Caminho completo para server.py
PID_FILE = os.path.join(PATH_TMP, 'message_server.pid')  # PID do servidor
LOCK_FILE = os.path.join(PATH_TMP, 'message_server.lock')  # Lock de concorrência
ACTIVITY_FILE = os.path.join(PATH_TMP, 'message_server_activity.txt')  # Última atividade
SERVER_LOG = os.path.join(PATH_TMP, 'server.log')

TIMEOUT = 300          # 5 minutos sem atividade para encerrar o servidor
WEBSOCKET_PORT = 8082  # Porta usada para confirmar que o servidor subiu
START_TIMEOUT = 5      # Espera máxima (s) para o servidor ficar no ar
STOP_TIMEOUT = 5       # Espera máxima (s) para o servidor encerrar


def send_response(data, status_code=200):
    print("Content-Type: application/json; charset=utf-8")
    print("Cache-Control: no-cache, no-store, must-revalidate")
    print(f"Status: {status_code}")
    print()
    print(json.dumps(data))
    sys.stdout.flush()
    sys.exit(0)


def get_server_pid():
    if not os.path.exists(PID_FILE):
        return None
    try:
        with open(PID_FILE, 'r') as f:
            content = f.read().strip()
            if content:
                return int(content)
    except Exception:
        pass
    return None


def is_server_running():
    pid = get_server_pid()
    if pid is None:
        return False, None

    if not psutil.pid_exists(pid):
        try:
            os.remove(PID_FILE)
        except Exception:
            pass
        return False, None

    try:
        proc = psutil.Process(pid)
        if proc.status() == psutil.STATUS_ZOMBIE:
            try:
                os.remove(PID_FILE)
            except Exception:
                pass
            return False, None

        cmdline = " ".join(proc.cmdline())
        if 'server.py' in cmdline or 'python' in proc.name().lower():
            return True, pid
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass

    return False, None


def is_port_open(port, host='127.0.0.1', timeout=0.5):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False


def handle_status():
    running, pid = is_server_running()
    if running:
        send_response({
            "success": True,
            "message": f"Servidor em execução com PID {pid}",
            "server_status": "running"
        })
    else:
        send_response({
            "success": True,
            "message": "Servidor não está em execução",
            "server_status": "stopped"
        })


def handle_start():
    running, pid = is_server_running()
    if running:
        send_response({
            "success": True,
            "message": "Servidor já está em execução",
            "server_status": "running"
        })

    env = os.environ.copy()
    env['WS_TMP_DIR'] = PATH_TMP
    env['WS_PY_DIR'] = PATH

    try:
        log_fp = open(SERVER_LOG, 'a')
        proc = subprocess.Popen(
            [sys.executable, SERVER_SCRIPT],
            stdin=subprocess.DEVNULL,
            stdout=log_fp,
            stderr=subprocess.STDOUT,
            env=env,
            close_fds=True,
            start_new_session=True
        )
        log_fp.close()
        pid = proc.pid
        with open(PID_FILE, 'w') as f:
            f.write(str(pid))
        with open(ACTIVITY_FILE, 'w') as f:
            f.write(str(time.time()))
    except Exception as e:
        send_response({
            "success": False,
            "message": f"Erro ao iniciar servidor: {e}",
            "server_status": "stopped"
        })

    # Aguarda o servidor responder na porta do WebSocket ou confirmar processo
    start_time = time.time()
    started = False
    while time.time() - start_time < START_TIMEOUT:
        time.sleep(0.3)
        if is_port_open(WEBSOCKET_PORT):
            started = True
            break
        r, _ = is_server_running()
        if r:
            started = True
            break

    if started:
        send_response({
            "success": True,
            "message": "Servidor iniciado com sucesso",
            "server_status": "running"
        })
    else:
        send_response({
            "success": False,
            "message": "Falha ao iniciar o servidor",
            "server_status": "stopped"
        })


def handle_stop():
    running, pid = is_server_running()
    if not running:
        if os.path.exists(PID_FILE):
            try:
                os.remove(PID_FILE)
            except Exception:
                pass
        send_response({
            "success": True,
            "message": "Servidor encerrado com sucesso",
            "server_status": "stopped"
        })

    try:
        try:
            pgid = os.getpgid(pid)
            os.killpg(pgid, signal.SIGTERM)
        except Exception:
            os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    except Exception:
        pass

    start_time = time.time()
    while time.time() - start_time < STOP_TIMEOUT:
        if not psutil.pid_exists(pid):
            break
        time.sleep(0.2)

    if psutil.pid_exists(pid):
        try:
            try:
                pgid = os.getpgid(pid)
                os.killpg(pgid, signal.SIGKILL)
            except Exception:
                os.kill(pid, signal.SIGKILL)
        except Exception:
            pass

    if os.path.exists(PID_FILE):
        try:
            os.remove(PID_FILE)
        except Exception:
            pass

    send_response({
        "success": True,
        "message": "Servidor encerrado com sucesso",
        "server_status": "stopped"
    })


def handle_heartbeat():
    try:
        with open(ACTIVITY_FILE, 'w') as f:
            f.write(str(time.time()))
    except Exception:
        pass
    send_response({"success": True, "message": "Heartbeat registrado"})


def handle_check_timeout():
    running, pid = is_server_running()
    if not running:
        send_response({"success": True, "timed_out": False, "server_status": "stopped"})

    last_activity = None
    if os.path.exists(ACTIVITY_FILE):
        try:
            with open(ACTIVITY_FILE, 'r') as f:
                last_activity = float(f.read().strip())
        except Exception:
            pass

    if last_activity and (time.time() - last_activity > TIMEOUT):
        handle_stop()
        send_response({"success": True, "timed_out": True, "server_status": "stopped"})

    send_response({"success": True, "timed_out": False, "server_status": "running"})


def main():
    query_string = os.environ.get('QUERY_STRING', '')
    params = urllib.parse.parse_qs(query_string)
    action = params.get('action', ['status'])[0]

    # Controle de concorrência com LOCK_FILE
    lock_file_obj = None
    try:
        lock_file_obj = open(LOCK_FILE, 'w')
        fcntl.flock(lock_file_obj, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (BlockingIOError, IOError):
        send_response({
            "success": False,
            "message": "Operação em andamento, tente novamente em alguns segundos",
            "server_status": "unknown"
        })

    try:
        if action == 'start':
            handle_start()
        elif action == 'stop':
            handle_stop()
        elif action == 'status':
            handle_status()
        elif action == 'heartbeat':
            handle_heartbeat()
        elif action == 'check_timeout':
            handle_check_timeout()
        else:
            send_response({
                "success": False,
                "message": f"Ação desconhecida: {action}",
                "server_status": "unknown"
            })
    finally:
        if lock_file_obj:
            try:
                fcntl.flock(lock_file_obj, fcntl.LOCK_UN)
                lock_file_obj.close()
            except Exception:
                pass


if __name__ == '__main__':
    main()
