// STL Dashboard - Layout Fixo sem Animações
class STLDashboard {
  constructor() {
    this.initElements();
    this.initSocket();
    this.initState();
    this.bindEvents();
    console.log("STL Dashboard carregado - Layout fixo ativo");
  }

  initElements() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.toggleBtn = document.getElementById("toggleBtn");
    this.resultDiv = document.getElementById("result");
    this.statusCorner = document.getElementById("statusCorner");
    this.videoPlaceholder = document.querySelector(".video-placeholder");
    this.navItems = document.querySelectorAll(".globalnav-link");
  }

  initSocket() {
    this.socket = io();

    this.socket.on("connect", () => this.setStatusConnected(true));
    this.socket.on("disconnect", () => this.setStatusConnected(false));
    this.socket.on("prediction_result", (data) => {
      this.showResult(data.letter && data.letter !== "?" ? data.letter : "?");
    });
  }

  initState() {
    this.stream = null;
    this.isProcessing = false;
    this.processingInterval = null;
    this.isStreaming = false;
  }

  bindEvents() {
    this.toggleBtn.addEventListener("click", () =>
      this.isStreaming ? this.stopCamera() : this.startCamera()
    );

    // Navigation simples sem animações
    this.navItems.forEach((item) => {
      item.addEventListener("click", this.handleNavigation.bind(this));
    });

    // Cleanup no fechamento
    window.addEventListener("beforeunload", () => {
      if (this.isStreaming) {
        this.stopCamera();
      }
    });
  }

  setStatusConnected(connected) {
    this.statusCorner.className = `status-indicator ${
      connected ? "connected" : "disconnected"
    }`;
    this.statusCorner.querySelector("span").textContent = connected
      ? "Conectado"
      : "Desconectado";
  }

  showResult(letter) {
    this.resultDiv.textContent = letter;

    // Mudança de cor simples sem animação
    if (letter !== "?") {
      this.resultDiv.style.color = "var(--color-apple-blue)";
      setTimeout(() => {
        this.resultDiv.style.color = "var(--color-apple-white)";
      }, 1000);
    }
  }

  async startCamera() {
    if (this.isStreaming) return;

    try {
      // Estado de loading
      this.toggleBtn.innerHTML = "<span>Iniciando...</span>";
      this.toggleBtn.disabled = true;
      this.toggleBtn.classList.add("loading");

      // Solicitar câmera com resolução otimizada
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      this.video.srcObject = this.stream;

      this.video.onloadedmetadata = () => {
        this.canvas.width = this.video.videoWidth || 1280;
        this.canvas.height = this.video.videoHeight || 720;

        // Mostrar vídeo instantaneamente
        this.showVideo();
      };

      this.isStreaming = true;

      // Atualizar botão
      this.toggleBtn.disabled = false;
      this.toggleBtn.classList.remove("loading");
      this.toggleBtn.classList.add("active");
      this.toggleBtn.innerHTML = "<span>Parar Câmera</span>";

      this.startProcessing();
    } catch (err) {
      console.error("Erro na câmera:", err);
      this.showError("Erro ao acessar a câmera. Verifique as permissões.");
      this.resetToggleButton();
    }
  }

  stopCamera() {
    if (!this.isStreaming) return;

    // Parar stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.video.srcObject = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Esconder vídeo instantaneamente
    this.hideVideo();

    this.isStreaming = false;
    this.stopProcessing();
    this.resetToggleButton();

    // Reset do resultado
    this.resultDiv.textContent = "?";
    this.resultDiv.style.color = "var(--color-apple-white)";
  }

  showVideo() {
    this.video.style.display = "block";
    this.canvas.style.display = "block";
    this.videoPlaceholder.style.display = "none";
  }

  hideVideo() {
    this.video.style.display = "none";
    this.canvas.style.display = "none";
    this.videoPlaceholder.style.display = "flex";
  }

  resetToggleButton() {
    this.toggleBtn.disabled = false;
    this.toggleBtn.classList.remove("loading", "active");
    this.toggleBtn.innerHTML = "<span>Iniciar Câmera</span>";
  }

  startProcessing() {
    if (this.processingInterval) return;

    // Processar frames a cada 250ms para estabilidade
    this.processingInterval = setInterval(() => {
      if (
        this.video.readyState === this.video.HAVE_ENOUGH_DATA &&
        !this.isProcessing
      ) {
        this.captureAndSendFrame();
      }
    }, 250);
  }

  stopProcessing() {
    clearInterval(this.processingInterval);
    this.processingInterval = null;
    this.isProcessing = false;
  }

  captureAndSendFrame() {
    if (this.isProcessing || !this.video) return;
    this.isProcessing = true;

    try {
      // Capturar frame do vídeo
      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      const imageData = this.canvas.toDataURL("image/jpeg", 0.8);

      // Enviar para o servidor
      this.socket.emit("video_frame", { image: imageData });
    } catch (error) {
      console.error("Erro na captura:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  handleNavigation(e) {
    e.preventDefault();

    const item = e.currentTarget.dataset.item;

    // Remover classe active de todos os itens
    this.navItems.forEach((nav) => nav.classList.remove("active"));
    e.currentTarget.classList.add("active");

    // Navegar sem transições
    switch (item) {
      case "dashboard":
        // Já estamos no dashboard
        break;
      case "configuracoes":
        window.location.href = "/configuracoes";
        break;
      case "sobre":
        window.location.href = "/sobre";
        break;
    }
  }

  showError(message) {
    // Alerta simples sem animações
    alert(message);
  }
}

// Inicializar quando DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  // Definir resultado inicial
  document.getElementById("result").textContent = "?";

  // Inicializar dashboard
  const dashboard = new STLDashboard();

  // Disponibilizar globalmente para debug
  window.STLDashboard = dashboard;
});

// Prevenir scroll em qualquer situação
document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("keydown", (e) => {
  // Prevenir teclas de scroll
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "Space",
    ].includes(e.key)
  ) {
    e.preventDefault();
  }
});

// Prevenir zoom
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "+" || e.key === "-" || e.key === "=")
  ) {
    e.preventDefault();
  }
});

// Prevenir scroll por touch
document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);
