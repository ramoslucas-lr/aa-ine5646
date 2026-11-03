# AA10 — Fetch API com HTTPS, ViaCEP e Localidades IBGE

**Disciplina:** INE5646 — Programação Web (UFSC)  
**Autores:** Lais Portela e Lucas Ramos  
**URL da Atividade:** https://aa.ramos.lucas.vms.ufsc.br/AA/AA10/index.html  
**Protocolo:** HTTPS obrigatório  

---

## 1. Descrição

Implementação da atividade avaliativa **AA10** no servidor virtual da UFSC (VPS-UFSC), utilizando **HTTPS** e **Fetch API** no frontend com backend PHP para controle de sessão e persistência.

A atividade é composta por duas etapas principais:

1. **Cadastro de Usuário com Autocompletar via ViaCEP:**
   - Na página `index.html`, formulário de criação de conta contendo dados pessoais e endereço (`CEP`, `Logradouro`, `Bairro`, `Cidade` e `Estado`).
   - Ao digitar ou perder o foco do campo `CEP`, a aplicação consome a API do ViaCEP (`https://viacep.com.br/ws/{CEP}/json/`) via `fetch()` e preenche os campos de endereço automaticamente.
   - Após validação e submissão dos dados para `api/register.php`, o usuário é redirecionado para a página de autenticação (`login.html`).

2. **Seletores de Localidades do IBGE após Login:**
   - O usuário realiza a autenticação em `login.html` (validado contra `api/login.php` com hash de senha `password_hash`).
   - Ao retornar autenticado para `index.html`, a aplicação detecta a sessão ativa (`api/session.php`) e exibe a seção de consulta de localidades.
   - O primeiro dropdown (`select-uf`) consome a API de localidades do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/estados`), ordenando as UFs em ordem alfabética crescente.
   - O segundo dropdown (`select-municipio`) permanece desabilitado até a seleção de uma UF. Ao selecionar uma UF, faz requisição para a API do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`), ordenando os municípios em ordem alfabética crescente e populando a lista.
   - Botão para efetuar logout e encerrar a sessão.

---

## 2. Estrutura de Arquivos

```text
AA10/
├── index.html              # Cadastro + tela de localidades (condicional via sessão)
├── login.html              # Tela de autenticação
├── README.md               # Documentação da atividade
├── css/
│   └── style.css           # Estilos da aplicação
├── js/
│   ├── cadastro.js         # Manipulação do formulário e chamada ao ViaCEP
│   ├── login.js            # Requisição de autenticação para login.php
│   ├── login-helper.js     # Checagem de sessão ativa no carregamento
│   └── localidades.js      # Integração com a API de Localidades do IBGE
└── api/
    ├── register.php        # Endpoint para registro de novo usuário
    ├── login.php           # Endpoint de autenticação e início de sessão
    ├── session.php         # Verificação de status de sessão
    ├── logout.php          # Encerramento de sessão
    └── data/
        └── users.json      # Base de dados em JSON
```

---

## 3. Endpoints e APIs Externas

- **ViaCEP API:** `https://viacep.com.br/ws/{CEP}/json/`
- **IBGE Estados:** `https://servicodados.ibge.gov.br/api/v1/localidades/estados`
- **IBGE Municípios:** `https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`

---

## 4. Roteiro de Testes

1. Acesse `https://aa.ramos.lucas.vms.ufsc.br/AA/AA10/index.html`.
2. Preencha os campos de cadastro. No campo **CEP**, digite por exemplo `13085415` ou `88040370`.
3. Verifique se os campos de Logradouro, Bairro, Cidade e Estado foram preenchidos automaticamente.
4. Conclua o cadastro clicando em **Criar conta**. A página alertará sucesso e redirecionará para `login.html`.
5. Em `login.html`, informe o e-mail e a senha cadastrados e clique em **Entrar**.
6. Após o redirecionamento para `index.html`, confirme que a área de **Consulta de Localidades (IBGE)** é exibida com uma saudação.
7. Selecione uma UF no primeiro seletor (ex: `SC - Santa Catarina`).
8. Verifique se o segundo seletor é habilitado contendo os municípios da UF em ordem alfabética.
9. Clique em **Sair** para testar o encerramento da sessão e retorno à tela de login.
