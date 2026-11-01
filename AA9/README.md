# Atividade Avaliada 9 (AA9) - Monitor de Mensagens TCP e UDP com WSS e HTTPS

**Autor:** Lucas Ramos  
**Instituição:** Universidade Federal de Santa Catarina (UFSC)  
**Disciplina:** INE5646 - Programação para Web  
**Servidor Virtual:** `aa.ramos.lucas.vms.ufsc.br` (IPv4: `150.162.244.198`)

---

## 1. URLs da Atividade

- **URL da Aplicação Web:** [https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/)
- **Documentação e Roteiro (README.md):** [https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/README.md](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/README.md)
- **URLs dos Clientes para Testes:**
  - **Cliente TCP:** `aa.ramos.lucas.vms.ufsc.br:8080`
  - **Cliente UDP:** `aa.ramos.lucas.vms.ufsc.br:8081`
- **URLs dos Arquivos de Implementação:**
  - [000-default.conf](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/000-default.conf)
  - [default-ssl.conf](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/default-ssl.conf)
  - [index.html](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/index.html)
  - [css/wss.css](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/css/wss.css)
  - [js/wss.js](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/js/wss.js)
  - [py/server_manager.py](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/py/server_manager.py)
  - [py/server.py](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/py/server.py)
  - [clients/tcp_client.py](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/clients/tcp_client.py)
  - [clients/udp_client.py](https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/clients/udp_client.py)

---

## 2. Arquitetura da Solução

```
                    ┌──────────────┐
                    │  tcp_client  │ (TCP 8080)
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐                  ┌────────────────────────┐
                    │  server.py   │ ────(WSS:8082)─► │ Apache Proxy (mod_ssl/ │
                    └──────▲───────┘                  │ mod_proxy_wstunnel)    │
                           │                          └───────────┬────────────┘
                    ┌──────┴───────┐                              │ (wss://.../wss)
                    │  udp_client  │ (UDP 8081)                   ▼
                    └──────────────┘                    ┌──────────────────┐
                                                        │ Página Navegador │
                                                        │ (HTTPS / WSS)    │
                                                        └──────────────────┘
```

- **Protocolo de Comunicação dos Clientes:**
  - Sockets nativos TCP na porta `8080` e UDP na porta `8081`.
- **Servidor Combinado (`server.py`):**
  - Executa threads concorrentes para escuta de sockets TCP e UDP.
  - Ao receber qualquer mensagem, gera um payload estruturado em JSON com IP, porta remota, protocolo, mensagem e timestamp.
  - Retransmite as mensagens recebidas via WebSocket Seguro (WSS) para todas as instâncias da página conectadas.
  - Responde ao cliente com mensagem de confirmação (`ACK: <mensagem>`).
  - Monitora o tempo de inatividade: se decorridos 180 segundos sem mensagens TCP/UDP, o processo se encerra de maneira limpa.
- **Gerenciador CGI (`server_manager.py`):**
  - Executado sob Apache via CGI em resposta a requisições HTTP (`?action=start|stop|status|heartbeat`).
  - Controla o ciclo de vida do servidor (início em background com PID registrado, parada limpa via sinais, status via verificação de processo e porta).
  - Garante controle de concorrência com travas (`fcntl.flock`).
- **Página Web e Interface (`index.html` + `wss.js`):**
  - Comunica-se com o backend via WSS (`wss://aa.ramos.lucas.vms.ufsc.br/wss`) através do proxy reverso do Apache.
  - Atualiza status em tempo real com indicador visual (verde online, vermelho offline).
  - Exibe contadores de mensagens (TCP, UDP e Total) e contagem regressiva de inatividade.
  - Filtro por abas (Todas, TCP, UDP).
  - Botões para Iniciar Servidor, Parar Servidor e Limpar Mensagens.
  - Painel de depuração expansível com logs completos.

---

## 3. Roteiro de Instalação e Configuração no Servidor (VPS)

### 3.1. Pré-requisitos e Instalação de Pacotes

Conecte-se ao servidor via SSH:
```bash
ssh ramos.lucas@150.162.244.198
```

Instale os pacotes necessários:
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-psutil apache2
sudo pip3 install simple-websocket-server --break-system-packages
```

### 3.2. Habilitação de Módulos do Apache

Habilite os módulos necessários para SSL, CGI, reescrita e proxy WebSocket:
```bash
sudo a2enmod ssl headers rewrite cgi proxy proxy_wstunnel
```

### 3.3. Criação do Certificado SSL Autoassinado

Crie o diretório `/etc/apache2/ssl/` e gere o par de chaves e certificado para o domínio:
```bash
sudo mkdir -p /etc/apache2/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/apache2/ssl/apache.key \
  -out /etc/apache2/ssl/apache.crt \
  -subj "/C=BR/ST=SC/L=Florianopolis/O=UFSC/OU=INE/CN=aa.ramos.lucas.vms.ufsc.br"

# Ajuste de permissões para leitura pelo Apache e pelo servidor WSS (www-data)
sudo chgrp www-data /etc/apache2/ssl/apache.crt /etc/apache2/ssl/apache.key
sudo chmod 640 /etc/apache2/ssl/apache.key
sudo chmod 644 /etc/apache2/ssl/apache.crt
```

### 3.4. Estrutura de Arquivos e Permissões

Crie a estrutura de diretórios em `/var/www/html/AA/AA9`:
```bash
sudo mkdir -p /var/www/html/AA/AA9/{css,js,py,tmp,clients}
```

Copie os arquivos da atividade para seus respectivos diretórios e aplique as permissões adequadas:
```bash
# Permissão de execução para os scripts Python (CGI e servidor)
sudo chmod +x /var/www/html/AA/AA9/py/server_manager.py
sudo chmod +x /var/www/html/AA/AA9/py/server.py

# Permissões do diretório temporário (pid, lock, logs)
sudo chown -R www-data:www-data /var/www/html/AA/AA9/tmp
sudo chmod 777 /var/www/html/AA/AA9/tmp
```

### 3.5. Configuração dos VirtualHosts do Apache

Copie `000-default.conf` e `default-ssl.conf` para `/etc/apache2/sites-available/`:
```bash
sudo cp /var/www/html/AA/AA9/000-default.conf /etc/apache2/sites-available/000-default.conf
sudo cp /var/www/html/AA/AA9/default-ssl.conf /etc/apache2/sites-available/default-ssl.conf
```

Habilite os sites e verifique a configuração:
```bash
sudo a2ensite 000-default.conf
sudo a2ensite default-ssl.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## 4. Como Testar a Aplicação

1. Acesse no navegador: **`https://aa.ramos.lucas.vms.ufsc.br/AA/AA9/`**
   *(Aceite o aviso de segurança do certificado autoassinado)*.
2. Na página web, clique no botão **"Iniciar Servidor"**.
3. O status mudará para verde (**"Servidor online"**) e a contagem regressiva de inatividade iniciará.
4. Em seu terminal, execute o cliente TCP:
   ```bash
   python3 tcp_client.py
   # Pressione Enter para usar o servidor padrão ou informe aa.ramos.lucas.vms.ufsc.br:8080
   # Digite mensagens e confira a exibição instantânea no navegador
   ```
5. Em outro terminal, execute o cliente UDP:
   ```bash
   python3 udp_client.py
   # Pressione Enter para usar o servidor padrão ou informe aa.ramos.lucas.vms.ufsc.br:8081
   # Digite mensagens e observe a exibição imediata com badge UDP verde
   ```
6. Teste as opções de filtro por protocolo (**Todas**, **TCP**, **UDP**) e a limpeza de mensagens (**"Limpar Mensagens"**).
7. Clique em **"Exibir Informações de Depuração"** para visualizar os registros detalhados das transações em tempo real.
8. Para parar o servidor, clique em **"Parar Servidor"**.
