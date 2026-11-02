#!/usr/bin/python3

'''
TCP Socket: Cliente para conectar ao servidor (porta TCP 8080).

Uso:
    python3 tcp_client.py
    Informe o host (ou pressione Enter para o padrão) e digite mensagens.
    Digite "exit" ou "quit" para encerrar.

OBS.: TCP/UDP são sockets brutos (sem TLS). Este cliente é o MESMO para as
versões WS e WSS - o que muda (ws:// vs wss://) é apenas o WebSocket da página.
'''

import socket
import sys
import signal
import re
import urllib.parse


BUFFER_SIZE = 1024
timeout = 2 * 60   # [segundos]
# >>> ALTERE: nome do seu servidor <<<
url = 'wss.idUFSC.vms.ufsc.br'
p = 8080


def TimeOut(signum, frame):
    raise Exception(
        "\n>>> Aplicação encerrada devido a inatividade: {} segundos.\n".format(str(timeout)))


signal.signal(signal.SIGALRM, TimeOut)
signal.alarm(timeout)


def extract_host_port(url):
    # Verifica se a URL contém um protocolo (http://, https://, ws://, wss://)
    if not re.match(r'^[a-zA-Z]+://', url):
        url = 'http://' + url

    parsed_url = urllib.parse.urlparse(url)
    host = parsed_url.netloc

    # Se houver porta explícita, extrai; senão usa a padrão TCP
    if ':' in host:
        host, port_str = host.split(':')
        port = int(port_str)
    else:
        port = 8080  # Porta padrão TCP

    return host, port


def main() -> None:
    print("=== Cliente TCP para Servidor Web ===")
    string = input(f'URL do servidor [Padrão: {url}:{p}]: ')

    if not string:
        HOST = url
        PORT = p
    else:
        HOST, PORT = extract_host_port(string)

    print(f"Conectando a {HOST} na porta {PORT} (TCP)")

    try:
        signal.alarm(timeout)
        while True:
            try:
                # Cria um novo socket para cada mensagem
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  # socket TCP
                s.connect((HOST, PORT))
                print(f"Conectado ao servidor {HOST}:{PORT}")

                msg = input('Mensagem para enviar (exit/quit para sair): ')

                if msg.lower() in ['exit', 'quit']:
                    print("Enviando comando para encerrar conexão...")
                    s.sendall(msg.encode('utf-8'))
                    data = s.recv(BUFFER_SIZE)
                    print("Resposta do servidor: {}".format(data.decode('utf-8')))
                    print("Conexão encerrada.")
                    break

                s.sendall(msg.encode('utf-8'))
                data = s.recv(BUFFER_SIZE)
                print("Resposta do servidor: {}".format(data.decode('utf-8')))

            except socket.error as e:
                print(f"Erro de socket: {e}")
                break
            finally:
                s.close()

        signal.alarm(0)
    except Exception as e:
        print(e)
        sys.exit()

    sys.exit(0)


if __name__ == "__main__":
    main()
