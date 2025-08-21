# 🖐️ STL - Sistema de Tradução de Linguagem de Sinais

Bem-vindo ao **STL**! Este projeto é uma ferramenta que traduz sinais de Libras em tempo real, usando visão computacional e inteligência artificial. O objetivo é promover **acessibilidade e inclusão**, permitindo que pessoas que não conhecem Libras se comuniquem facilmente.

---

## 📂 Estrutura do Projeto (antes da modularização)

```
STL/
├── app.py                  # Arquivo principal do Flask
├── modelY.p               # Modelo de IA para reconhecimento de sinais
├── requirements.txt       # Dependências do projeto
├── venv/                  # Ambiente virtual Python
├── static/
│   └── imagens/          # Imagens usadas na interface (alfabeto, ícones, etc.)
└── templates/
    └── index.html        # Página principal do sistema
```

---

## 🛠 Tecnologias Utilizadas

- **Python 3.10.11** 🔗 [Baixar Python 3.10.11](https://www.python.org/downloads/release/python-31011/)
- **Flask** – para criar o backend e servir as páginas web
- **Socket.IO** – comunicação em tempo real entre servidor e cliente
- **HTML5 / CSS3 / JavaScript** – interface do usuário e interatividade
- **OpenCV / Bibliotecas de visão computacional** – captura e processamento dos sinais
- **Virtual Environment (venv)** – isolamento do ambiente Python

---

## 🐍 Configurando o Ambiente Python

1. Baixe e instale o Python 3.10.11:  
   🔗 [Python 3.10.11](https://www.python.org/downloads/release/python-31011/)

2. Crie o ambiente virtual:

```bash
python3.10 -m venv venv
```

3. Ative o venv:

   **Windows:**

   ```bash
   venv\Scripts\activate
   ```

   **Linux / macOS:**

   ```bash
   source venv/bin/activate
   ```

4. Instale as dependências:

```bash
pip install -r requirements.txt
```

---

## 🚀 Executando o Projeto

1. Ative o venv (como mostrado acima).

2. Execute o Flask:

```bash
python app.py
```

3. Abra o navegador e acesse:

```
http://127.0.0.1:5000
```

---

## 🎨 Interface do Usuário

- **Navbar centralizada** com navegação entre:
  - Dashboard (painel principal da câmera)
  - Configurações
  - Sobre
- **Botão toggle** para iniciar/parar a captura da câmera
- **Status de conexão** no canto superior direito
- **Painel central** com vídeo e resultado do reconhecimento
- **Faixa do alfabeto** fixa na parte inferior

---

## 🔄 Versionamento e Desenvolvimento

### 📋 Estratégia de Versionamento

O projeto STL segue o padrão **Semantic Versioning (SemVer)**:

- **MAJOR** (X.0.0) - Mudanças incompatíveis na API/funcionalidade principal
- **MINOR** (1.X.0) - Novas funcionalidades mantendo compatibilidade
- **PATCH** (1.1.X) - Correções de bugs e pequenas melhorias

**Exemplo:** `v1.2.3` → Major: 1, Minor: 2, Patch: 3

````

### 📝 Convenção de Commits

Utilizamos **Conventional Commits** para padronizar mensagens:

- `feat:` nova funcionalidade
- `fix:` correção de bugs
- `docs:` alterações na documentação
- `style:` formatação, espaços em branco, etc.
- `refactor:` refatoração de código
- `test:` adição ou modificação de testes
- `chore:` atualizações de dependências, configurações

**Exemplos:**
```bash
feat: adicionar reconhecimento de números em Libras
fix: corrigir problema de conexão com a câmera
docs: atualizar README com instruções de instalação
refactor: modularizar código JavaScript da interface
````

### 🏷️ Tags de Versão

```bash
# Criar uma nova versão
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"
git push origin v1.0.0

# Listar versões
git tag -l
```

### 🔧 Configurações Git

- **Python**: 3.10.11
- **Branch principal**: `main`
- **Branch atual**: `STLweb`

---

## 📖 Referência do Repositório

🌐 [STL no GitHub](https://github.com/STLeducation/STL.git)
