# FENIC 2025 - Tradutor de Libras

Sistema de reconhecimento de linguagem de sinais em tempo real usando IA e visão computacional.

![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.1-green.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.19-orange.svg)

---

## 📋 Pré-requisitos

- Python 3.11 ou 3.12
- Git
- Webcam funcional
- Windows, Linux ou macOS

---

## 🚀 Instalação

### 1️⃣ Clone o Repositório

```bash
git clone -b STLwebFENIC https://github.com/STLeducation/STL.git
cd STL
```

### 2️⃣ Instale o Python 3.11

#### Windows:
1. Baixe o Python 3.11 em: https://www.python.org/downloads/
2. Durante a instalação, marque a opção **"Add Python to PATH"**
3. Verifique a instalação:
```bash
python --version
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
```

#### macOS:
```bash
brew install python@3.11
```

### 3️⃣ Crie o Ambiente Virtual

#### Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

#### Linux/macOS:
```bash
python3.11 -m venv venv
source venv/bin/activate
```

**Nota:** Você saberá que o ambiente está ativo quando ver `(venv)` no início da linha do terminal.

### 4️⃣ Instale as Dependências

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Tempo estimado:** 5-10 minutos dependendo da sua conexão.

## ▶️ Executando a Aplicação

### 1️⃣ Inicie o Servidor

```bash
python app.py
```

Você verá uma saída similar a:

```
============================================================
🔍 DIAGNÓSTICO DE INICIALIZAÇÃO
============================================================

📁 Verificando arquivos:
   hand_landmarker.task: True
   ModelY2.0.keras: True
   Encoder.p: True
✓ Hand detector carregado
✓ Modelo carregado
✓ Encoder carregado
   Classes: ['dia']

============================================================
🚀 Servidor Flask iniciado!
📱 Acesse: http://localhost:5000
============================================================
```

### 2️⃣ Acesse no Navegador

Abra seu navegador e acesse:

```
http://localhost:5000
```


---
