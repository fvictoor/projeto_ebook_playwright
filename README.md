# Projeto E-book Playwright

## 📋 Descrição

Este projeto contém testes automatizados utilizando Playwright para validação de funcionalidades de cadastro e login de usuários. O projeto testa tanto a interface frontend quanto a API backend do sistema ServeRest, incluindo cenários de sucesso e falha.

## 🛠️ Tecnologias Utilizadas

- **Playwright** - Framework de automação de testes
- **Node.js** - Runtime JavaScript
- **Faker.js** - Geração de dados fictícios para testes
- **Axios** - Cliente HTTP para testes de API
- **Nunjucks** - Template engine para geração de relatórios
- **GitHub Actions** - CI/CD para execução automatizada

## 📁 Estrutura do Projeto

```
projeto_ebook_playwright/
├── .github/
│   └── workflows/
│       └── playwright.yml          # Pipeline CI/CD
├── libs/
│   ├── Dashboard/
│   │   ├── main.js                 # Gerador de dashboard customizado
│   │   ├── parser.js               # Parser de resultados XML
│   │   └── templates/              # Templates HTML
│   └── Webhook/
│       ├── .env                    # Variáveis de ambiente
│       └── report-webhook.js       # Notificações via webhook
├── logs/                           # Relatórios e evidências
├── resources/
│   ├── Login.js                    # Page Object - Login
│   └── SubmitHome.js               # Page Object - Cadastro
├── services/
│   └── UsuarioService.js           # Serviços de API
├── tests/
│   ├── api/
│   │   └── CadastroApi.spec.js     # Testes de API
│   └── frontend/
│       ├── CadastroFront.spec.js   # Testes de UI - Cadastro
│       └── LoginFront.spec.js      # Testes de UI - Login
├── package.json                    # Dependências do projeto
├── playwright.config.js            # Configurações do Playwright
└── README.md                       # Documentação
```

## ⚙️ Pré-requisitos

- **Node.js** versão 18 ou superior
- **npm** (gerenciador de pacotes)
- Conexão com a internet (para acessar o ServeRest)

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/fvictoor/projeto_ebook_playwright.git
cd projeto_ebook_playwright
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Instale os navegadores do Playwright
```bash
npx playwright install
```

### 4. Configure variáveis de ambiente (opcional)
Para notificações via webhook, configure o arquivo `.env` em `libs/Webhook/.env`:
```env
WEBHOOK_URL=sua_url_do_webhook
```

## 🎯 Execução dos Testes

### Executar todos os testes
```bash
npx playwright test
```

### Executar testes específicos
```bash
# Apenas testes de frontend
npx playwright test tests/frontend/

# Apenas testes de API
npx playwright test tests/api/

# Teste específico
npx playwright test tests/frontend/CadastroFront.spec.js
```

### Executar com interface gráfica
```bash
npx playwright test --ui
```

### Executar em modo debug
```bash
npx playwright test --debug
```

### Gerar relatório HTML
```bash
npx playwright show-report
```

## 📊 Relatórios e Evidências

O projeto gera múltiplos tipos de relatórios:

- **HTML Report**: `logs/report/index.html`
- **JUnit XML**: `logs/results/output.xml`
- **JSON Results**: `logs/results/test-results.json`
- **Dashboard Customizado**: `logs/dashboard_playwright.html`
- **Screenshots**: `logs/test-output/` (apenas em falhas)
- **Vídeos**: `logs/test-output/` (apenas em falhas)
- **Traces**: `logs/test-output/` (apenas em falhas)

## 🔧 Configurações do Playwright

O arquivo `playwright.config.js` contém as seguintes configurações:

- **Modo headless**: Ativado por padrão
- **Paralelização**: Totalmente paralelo
- **Retries**: 2 tentativas em CI, 0 localmente
- **Timeout**: Configurado para operações lentas
- **Navegadores**: Chrome (outros comentados)
- **Evidências**: Screenshots, vídeos e traces apenas em falhas

## 🧪 Resumo dos Testes Automatizados

### 📱 Testes de Frontend (UI)

#### **CadastroFront.spec.js**
- ✅ **Cadastro de usuário comum com sucesso**
  - Valida cadastro de usuário sem privilégios administrativos
- ✅ **Cadastro de usuário administrador com sucesso**
  - Valida cadastro de usuário com privilégios administrativos
- ❌ **Cadastro de usuário sem nome**
  - Valida mensagem de erro quando nome não é preenchido
- ❌ **Cadastro de usuário sem nome e sem email**
  - Valida múltiplas mensagens de erro para campos obrigatórios
- ❌ **Cadastro de usuário sem nome, sem email e sem senha**
  - Valida todas as validações de campos obrigatórios
- ❌ **Cadastro de usuário com email já cadastrado**
  - Valida prevenção de emails duplicados

#### **LoginFront.spec.js**
- ✅ **Login com usuário comum sucesso**
  - Cria usuário via API, faz login e valida redirecionamento
- ✅ **Login com usuário administrador sucesso**
  - Valida login de admin e interface específica
- ❌ **Não deve logar com senha incorreta**
  - Valida mensagem de erro para credenciais inválidas
- ❌ **Não deve logar com senha em branco**
  - Valida obrigatoriedade do campo senha
- ❌ **Não deve logar com email em branco**
  - Valida obrigatoriedade do campo email
- ❌ **Não deve logar com senha e email em branco**
  - Valida ambos os campos obrigatórios
- ❌ **Não deve logar com email inválido**
  - Valida formato de email

### 🔌 Testes de API

#### **CadastroApi.spec.js**
- ✅ **Cadastro de usuário administrador com sucesso**
  - Testa endpoint POST /usuarios com admin=true
- ✅ **Cadastro de usuário comum com sucesso**
  - Testa endpoint POST /usuarios com admin=false
- ❌ **Cadastro de usuário comum sem o nome**
  - Valida validação de campo obrigatório via API
- ❌ **Cadastro de usuário com email já utilizado**
  - Testa prevenção de duplicação via API
- ❌ **Cadastro de usuário sem senha**
  - Valida campo password obrigatório
- ❌ **Cadastro de usuário sem email**
  - Valida campo email obrigatório



## 🎨 Dashboard Customizado
![Dashboard demo](https://github.com/fvictoor/projeto_ebook_playwright/blob/main/dashboard.png?raw=true)
O projeto inclui um gerador de dashboard personalizado que:
- Processa resultados XML do Playwright
- Gera visualizações interativas
- Calcula métricas de qualidade
- Identifica testes recuperados (flaky tests)

### Como gerar o dashboard personalizado

#### 🎯 Configuração Automática (Recomendado)
O dashboard agora detecta automaticamente as configurações do projeto:

```bash
# Comando simples - detecta tudo automaticamente
node ./libs/Dashboard/main.js

# Ou especificando o arquivo XML (se diferente do padrão)
node ./libs/Dashboard/main.js ./logs/results/output.xml
```

**O que é detectado automaticamente:**
- ✅ **URLs dos ambientes**: `https://front.serverest.dev` e `https://serverest.dev`
- ✅ **Browsers executados**: Extraídos do XML de resultados (ex: Chromium, Firefox, WebKit)
- ✅ **Devices configurados**: Lidos do `playwright.config.js` (Desktop Chrome, Desktop Firefox, Desktop Safari)
- ✅ **Diretório de saída**: Baseado nas configurações do Playwright
- ✅ **Suítes disponíveis**: Lidas diretamente do arquivo XML de resultados
- ✅ **Resolução**: Extraída dos devices configurados no Playwright

#### 🔧 Sobrescrevendo configurações (Opcional)
Se necessário, você ainda pode sobrescrever configurações específicas:

```bash
node ./libs/Dashboard/main.js \
  --output-dir "./relatorios" \
  --filename "dashboard_customizado.html" \
  --resolution "1920x1080"
```

#### Opções de sobrescrita disponíveis

| Opção | Descrição | Valor Automático |
|-------|-----------|------------------|
| `--output-dir` | Pasta de destino para o relatório | `logs` (do playwright.config.js) |
| `--filename` | Nome do arquivo HTML gerado | `dashboard_playwright.html` |
| `--browser` | Nome do browser usado nos testes | Extraído do playwright.config.js |
| `--resolution` | Resolução da tela (ex: 1920x1080) | `1280x720` (padrão) |
| `--frontend-url` | URL do ambiente de Frontend testado | `https://front.serverest.dev` |
| `--backend-url` | URL do ambiente de Backend testado | `https://serverest.dev` |
| `--suites` | Lista de suítes específicas (separadas por vírgula) | Todas as suítes do XML |

#### Exemplo de uso completo
```bash
# 1. Execute os testes
npx playwright test

# 2. Gere o dashboard (configuração automática)
node ./libs/Dashboard/main.js

# 3. O dashboard será criado automaticamente em: logs/dashboard_playwright.html
```

#### 📁 Arquivo de configuração
As configurações automáticas são gerenciadas pelo arquivo `libs/Dashboard/config.js`, que:
- **Lê o `playwright.config.js`** para extrair:
  - Devices configurados (Desktop Chrome, Desktop Firefox, Desktop Safari)
  - Configurações de viewport e resolução
  - Diretório de saída dos logs
- **Analisa o XML de resultados** para identificar:
  - Suítes disponíveis executadas
  - Browsers realmente executados (chromium, firefox, webkit)
  - Estatísticas por browser quando múltiplos browsers são usados
- **Permite sobrescrita** via parâmetros de linha de comando

#### Recursos do dashboard
- **Métricas de qualidade**: Taxa de sucesso, falhas, recuperações
- **Gráficos interativos**: Visualização por suíte de testes
- **Detalhes de execução**: Tempo total, workers utilizados, data de execução
- **Lista de falhas**: Testes que falharam com detalhes
- **Identificação de flaky tests**: Testes que falharam e depois passaram

## 🔄 CI/CD com GitHub Actions

O pipeline automatizado (`playwright.yml`) executa:

1. **Setup do ambiente** (Node.js 18, dependências)
2. **Instalação dos navegadores**
3. **Execução dos testes**
4. **Geração de dashboard customizado**
5. **Upload de artefatos** (logs, relatórios)
6. **Notificações via webhook** (opcional)

---