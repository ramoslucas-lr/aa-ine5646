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
import signal
from simple_websocket_server import WebSocketServer, WebSocket

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
DEFAULT_TMP_DIR = os.path.join(BASE_DIR, 'tmp') + os.sep

PATH = os.environ.get('WS_TMP_DIR', DEFAULT_TMP_DIR)
try:
    os.makedirs(PATH, exist_ok=True)
except Exception:
    pass

BUFFER_SIZE = 1024
TCP_PORT = 8080
UDP_PORT = 8081
WEBSOCKET_PORT = 8082
HOST = '0.0.0.0'

WEBSOCKET_HOST = os.environ.get('WS_WS_HOST', '127.0.0.1')
SSL_CERT = os.environ.get('WS_SSL_CERT')
SSL_KEY = os.environ.get('WS_SSL_KEY')

ACTIVITY_FILE = os.path.join(PATH, 'message_server_activity.txt')
PID_FILE = os.path.join(PATH, 'message_server.pid')

INACTIVITY_LIMIT = int(os.environ.get('WS_INACTIVITY', '180'))
TCP_IDLE_TIMEOUT = 180
DEBUG = os.environ.get('WS_DEBUG', '0') == '1'

running = True
last_activity_time = time.time()
ws_server = None
ws_clients = set()
ws_clients_lock = threading.Lock()


def log(msg, error=False):
    if DEBUG or error:
        ts = time.strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{ts}] {msg}", flush=True)


def update_activity():
    global last_activity_time
    last_activity_time = time.time()
    try:
        with open(ACTIVITY_FILE, 'w') as f:
            f.write(str(last_activity_time))
    except Exception:
        pass


def broadcast(payload):
    json_str = json.dumps(payload)
    with ws_clients_lock:
        to_remove = []
        for client in list(ws_clients):
            try:
                client.send_message(json_str)
            except Exception as e:
                log(f"Erro no envio para WebSocket: {e}")
                to_remove.append(client)
        for client in to_remove:
            ws_clients.discard(client)


class MessageWebSocket(WebSocket):
    def connected(self):
        log(f"WebSocket conectado: {self.address}")
        with ws_clients_lock:
            ws_clients.add(self)
        now = time.time()
        elapsed = now - last_activity_time
        remaining = max(0, int(INACTIVITY_LIMIT - elapsed)) if INACTIVITY_LIMIT > 0 else 0
        resp = {
            "type": "heartbeat_response",
            "timestamp": now,
            "inactivity_remaining": remaining,
            "inactivity_limit": INACTIVITY_LIMIT
        }
        try:
            self.send_message(json.dumps(resp))
        except Exception:
            pass

    def handle_close(self):
        log(f"WebSocket desconectado: {self.address}")
        with ws_clients_lock:
            ws_clients.discard(self)

    def handle(self):
        now = time.time()
        elapsed = now - last_activity_time
        remaining = max(0, int(INACTIVITY_LIMIT - elapsed)) if INACTIVITY_LIMIT > 0 else 0
        resp = {
            "type": "heartbeat_response",
            "timestamp": now,
            "inactivity_remaining": remaining,
            "inactivity_limit": INACTIVITY_LIMIT
        }
        try:
            self.send_message(json.dumps(resp))
        except Exception:
            pass


def handle_tcp_client(conn, addr):
    conn.settimeout(TCP_IDLE_TIMEOUT)
    client_ip, client_port = addr[0], addr[1]
    log(f"Conexão TCP estabelecida de {client_ip}:{client_port}")
    try:
        while running:
            data = conn.recv(BUFFER_SIZE)
            if not data:
                break
            msg_str = data.decode('utf-8', errors='replace').rstrip('\r\n')
            update_activity()
            timestamp = time.strftime('%d/%m/%Y %H:%M:%S')
            payload = {
                "ip": client_ip,
                "port": client_port,
                "protocol": "TCP",
                "message": msg_str,
                "timestamp": timestamp
            }
            log(f"TCP recebido de {client_ip}:{client_port}: {msg_str}")
            broadcast(payload)

            conn.sendall(f"ACK: {msg_str}".encode('utf-8'))
            if msg_str.lower() in ['exit', 'quit']:
                break
    except Exception as e:
        log(f"Erro na conexão TCP de {client_ip}:{client_port}: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


def tcp_server_loop():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, TCP_PORT))
    s.listen(10)
    s.settimeout(1.0)
    log(f"Servidor TCP escutando em {HOST}:{TCP_PORT}")

    while running:
        try:
            conn, addr = s.accept()
            t = threading.Thread(target=handle_tcp_client, args=(conn, addr), daemon=True)
            t.start()
        except socket.timeout:
            continue
        except Exception as e:
            if running:
                log(f"Erro no accept TCP: {e}", error=True)
            break
    try:
        s.close()
    except Exception:
        pass


def udp_server_loop():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, UDP_PORT))
    s.settimeout(1.0)
    log(f"Servidor UDP escutando em {HOST}:{UDP_PORT}")

    while running:
        try:
            data, addr = s.recvfrom(BUFFER_SIZE)
            if not data:
                continue
            client_ip, client_port = addr[0], addr[1]
            msg_str = data.decode('utf-8', errors='replace').rstrip('\r\n')
            update_activity()
            timestamp = time.strftime('%d/%m/%Y %H:%M:%S')
            payload = {
                "ip": client_ip,
                "port": client_port,
                "protocol": "UDP",
                "message": msg_str,
                "timestamp": timestamp
            }
            log(f"UDP recebido de {client_ip}:{client_port}: {msg_str}")
            broadcast(payload)

            s.sendto(f"ACK: {msg_str}".encode('utf-8'), addr)
        except socket.timeout:
            continue
        except Exception as e:
            if running:
                log(f"Erro no recvfrom UDP: {e}", error=True)
            break
    try:
        s.close()
    except Exception:
        pass


def inactivity_monitor():
    while running:
        time.sleep(1)
        if INACTIVITY_LIMIT > 0:
            elapsed = time.time() - last_activity_time
            if elapsed >= INACTIVITY_LIMIT:
                log(f"Servidor encerrando por inatividade ({int(elapsed)}s sem mensagens)")
                shutdown()
                break


def shutdown(signum=None, frame=None):
    global running
    if not running:
        return
    running = False
    log("Encerrando servidor...")
    if ws_server:
        try:
            ws_server.close()
        except Exception:
            pass
    if os.path.exists(PID_FILE):
        try:
            os.remove(PID_FILE)
        except Exception:
            pass
    sys.exit(0)


def main():
    global ws_server
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    update_activity()

    tcp_thread = threading.Thread(target=tcp_server_loop, daemon=True)
    tcp_thread.start()

    udp_thread = threading.Thread(target=udp_server_loop, daemon=True)
    udp_thread.start()

    inac_thread = threading.Thread(target=inactivity_monitor, daemon=True)
    inac_thread.start()

    cert = SSL_CERT if (SSL_CERT and os.path.exists(SSL_CERT)) else None
    key = SSL_KEY if (SSL_KEY and os.path.exists(SSL_KEY)) else None

    if cert and key:
        log(f"Iniciando WebSocket com TLS (WSS) em {WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(certfile=cert, keyfile=key)
        ws_server = WebSocketServer(WEBSOCKET_HOST, WEBSOCKET_PORT, MessageWebSocket, ssl_context=context)
    else:
        log(f"Iniciando WebSocket sem TLS direto em {WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        ws_server = WebSocketServer(WEBSOCKET_HOST, WEBSOCKET_PORT, MessageWebSocket)

    log(f"Servidor pronto. TCP={TCP_PORT}, UDP={UDP_PORT}, WS={WEBSOCKET_PORT}")

    try:
        while running:
            ws_server.handle_request()
    except KeyboardInterrupt:
        shutdown()
    except Exception as e:
        if running:
            log(f"Exceção no WebSocketServer: {e}", error=True)
            shutdown()


if __name__ == '__main__':
    main()
