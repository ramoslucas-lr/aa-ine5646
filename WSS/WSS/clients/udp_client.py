#!/usr/bin/python3

'''
UDP Socket: Cliente para enviar mensagens ao servidor (porta UDP 8081).

Uso:
    python3 udp_client.py
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
p = 8081


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

    # Se houver porta explícita, extrai; senão usa a padrão UDP
    if ':' in host:
        host, port_str = host.split(':')
        port = int(port_str)
    else:
        port = 8081  # Porta padrão UDP

    return host, port


def main() -> None:
    print("=== Cliente UDP para Servidor Web ===")
    string = input(f'URL do servidor [Padrão: {url}:{p}]: ')

    if not string:
        HOST = url
        PORT = p
    else:
        HOST, PORT = extract_host_port(string)

    print(f"Conectando a {HOST} na porta {PORT} (UDP)")

    # Criar socket UDP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)  # socket UDP
        print(f"Socket UDP criado para enviar mensagens para {HOST}:{PORT}")
    except socket.error:
        print("Falha ao criar socket")
        sys.exit()

    try:
        signal.alarm(timeout)
        while True:
            try:
                msg = input('Mensagem para enviar (exit/quit para sair): ')

                # Enviar mensagem
                s.sendto(msg.encode('utf-8'), (HOST, PORT))

                # Receber resposta
                d = s.recvfrom(BUFFER_SIZE)
                reply = d[0]
                print("Resposta do servidor: {}".format(reply.decode('utf-8')))

                # Verificar se é para sair
                if msg.lower() in ['exit', 'quit']:
                    print("Conexão encerrada.")
                    break

            except socket.error as e:
                print(f"Erro de socket: {e}")
                break

        signal.alarm(0)
    except Exception as e:
        print(e)
        sys.exit()
    finally:
        s.close()

    sys.exit(0)


if __name__ == "__main__":
    main()
