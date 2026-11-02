# AA9 - Monitor de Mensagens TCP/UDP com WSS e HTTPS

Aluno: Lucas Ramos  
Disciplina: Programação para Web (INE5646) - UFSC  
Servidor: aa.ramos.lucas.vms.ufsc.br (150.162.244.198)

---

## URLs da Atividade

- Aplicação: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/
- Documentação (README): https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/README.md
- Teste TCP: `aa.ramos.lucas.vms.ufsc.br:8080`
- Teste UDP: `aa.ramos.lucas.vms.ufsc.br:8081`

### Arquivos de Implementação

- 000-default.conf: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/000-default.conf
- default-ssl.conf: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/default-ssl.conf
- index.html: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/index.html
- css/wss.css: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/css/wss.css
- js/wss.js: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/js/wss.js
- py/server_manager.py: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/py/server_manager.py
- py/server.py: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/py/server.py
- clients/tcp_client.py: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/clients/tcp_client.py
- clients/udp_client.py: https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/clients/udp_client.py

---

## Arquitetura

```
Cliente TCP (8080) ──┐
                     ├──► server.py ──(WSS: 8082)──► Apache (Proxy /wss) ──► Navegador (HTTPS/WSS)
Cliente UDP (8081) ──┘
```

- TCP na porta 8080 e UDP na porta 8081 escutando conexões.
- server.py recebe as mensagens, responde ACK ao cliente e repassa via WebSocket (WSS) na porta 8082 para as abas abertas.
- Apache na porta 443 faz proxy reverso de `/wss` para o backend `wss://127.0.0.1:8082/` via `mod_proxy_wstunnel` com TLS fim a fim.
- server_manager.py é chamado via CGI pelo Apache para gerenciar status, início e parada do processo, usando arquivo de lock e PID.
- Timeout de inatividade de 180s configurado no servidor, sincronizado com o contador na página web.

---

## Instalação e Configuração no Servidor

### 1. Pacotes necessários no VPS

```bash
sudo apt update
sudo apt install -y python3-pip python3-psutil apache2
sudo pip3 install simple-websocket-server --break-system-packages
```

### 2. Módulos do Apache

```bash
sudo a2enmod ssl headers rewrite cgi proxy proxy_wstunnel
```

### 3. Certificado SSL autoassinado

```bash
sudo mkdir -p /etc/apache2/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/apache2/ssl/apache.key \
  -out /etc/apache2/ssl/apache.crt \
  -subj "/C=BR/ST=SC/L=Florianopolis/O=UFSC/OU=INE/CN=aa.ramos.lucas.vms.ufsc.br"

sudo chgrp www-data /etc/apache2/ssl/apache.crt /etc/apache2/ssl/apache.key
sudo chmod 644 /etc/apache2/ssl/apache.key /etc/apache2/ssl/apache.crt
```

### 4. Estrutura de diretórios e permissões

```bash
sudo mkdir -p /var/www/html/AA/AA9/{css,js,py,tmp,clients}

# Permissão para execução dos scripts e escrita do www-data na pasta tmp
sudo chmod +x /var/www/html/AA/AA9/py/server_manager.py
sudo chmod +x /var/www/html/AA/AA9/py/server.py
sudo chown -R www-data:www-data /var/www/html/AA/AA9/tmp
sudo chmod 777 /var/www/html/AA/AA9/tmp
```

### 5. Configuração dos VirtualHosts

Copiar os arquivos de configuração para o Apache:

```bash
sudo cp /var/www/html/AA/AA9/000-default.conf /etc/apache2/sites-available/000-default.conf
sudo cp /var/www/html/AA/AA9/default-ssl.conf /etc/apache2/sites-available/default-ssl.conf
sudo a2ensite 000-default.conf default-ssl.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## Testando a Aplicação

1. Abrir no navegador: `https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/`
2. Clicar em "Iniciar Servidor" caso esteja offline.
3. Executar o cliente TCP:
   ```bash
   python3 tcp_client.py
   ```
4. Executar o cliente UDP:
   ```bash
   python3 udp_client.py
   ```
5. As mensagens aparecem em tempo real na tela separadas por protocolo (TCP/UDP), com horário e IP/porta de origem.
