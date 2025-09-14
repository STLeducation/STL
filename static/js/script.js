// STL Dashboard - Sistema de Preferências, Temas e Modo Fullscreen
class STLDashboard {
  constructor() {
    this.initElements();
    this.initSocket();
    this.initState();
    this.initPreferences();
    this.initThemes();
    this.initFullscreen();
    this.bindEvents();
    this.loadSavedPreferences();
    this.applySavedCamera();
    console.log("STL Dashboard carregado - Preferências e temas ativos");
  }

  initElements() {
    // Core elements
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.toggleBtn = document.getElementById("toggleBtn");
    this.resultDiv = document.getElementById("result");
    this.statusCorner = document.getElementById("statusCorner");
    this.videoPlaceholder = document.querySelector(".video-placeholder");
    this.navItems = document.querySelectorAll(".globalnav-link");

    // New elements
    this.themeToggle = document.getElementById("themeToggle");
    this.fullscreenToggle = document.getElementById("fullscreenToggle");
    this.exitFullscreen = document.getElementById("exitFullscreen");
    this.mainLayout = document.getElementById("mainLayout");
    this.globalNav = document.getElementById("globalNav");
    this.rightSection = document.getElementById("rightSection");
    this.bottomSection = document.getElementById("bottomSection");
    this.themeTransition = document.getElementById("themeTransition");

    // Settings display elements
    this.savedCameraDisplay = document.getElementById("savedCamera");
    this.lastSessionDisplay = document.getElementById("lastSession");
  }

  initSocket() {
    this.socket = io();

    this.socket.on("connect", () => this.setStatusConnected(true));
    this.socket.on("disconnect", () => this.setStatusConnected(false));
    this.socket.on("prediction_result", (data) => {
      this.showResult(data.letter && data.letter !== "?" ? data.letter : "?");
      this.updateLastActivity();
    });
  }

  initState() {
    this.stream = null;
    this.isProcessing = false;
    this.processingInterval = null;
    this.isStreaming = false;
    this.isFullscreen = false;
    this.sessionStartTime = null;
  }

  initPreferences() {
    this.preferences = {
      lastCamera: null,
      preferredResolution: { width: 1280, height: 720 },
      theme: "dark",
      lastSession: null,
      sessionCount: 0,
      totalRecognitions: 0,
    };
  }

  initThemes() {
    // Set initial theme
    const savedTheme = localStorage.getItem("stl-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.preferences.theme = savedTheme;
  }

  initFullscreen() {
    // Fullscreen API events
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });

    document.addEventListener("webkitfullscreenchange", () => {
      this.handleFullscreenChange();
    });

    document.addEventListener("mozfullscreenchange", () => {
      this.handleFullscreenChange();
    });
  }

  bindEvents() {
    // Core functionality
    this.toggleBtn.addEventListener("click", () =>
      this.isStreaming ? this.stopCamera() : this.startCamera()
    );

    // Theme toggle
    this.themeToggle.addEventListener("click", () => {
      this.toggleTheme();
    });

    // Fullscreen toggle
    this.fullscreenToggle.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Exit fullscreen
    this.exitFullscreen.addEventListener("click", () => {
      this.exitFullscreenMode();
    });

    // Navigation
    this.navItems.forEach((item) => {
      item.addEventListener("click", this.handleNavigation.bind(this));
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.savePreferences();
      if (this.isStreaming) {
        this.stopCamera();
      }
    });

    // Save preferences periodically
    setInterval(() => {
      this.savePreferences();
    }, 30000); // Every 30 seconds
  }

  loadSavedPreferences() {
    try {
      const saved = localStorage.getItem("stl-preferences");
      if (saved) {
        const savedPrefs = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...savedPrefs };
        this.updateSettingsDisplay();
      }
    } catch (error) {
      console.warn("Erro ao carregar preferências:", error);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem("stl-preferences", JSON.stringify(this.preferences));
      localStorage.setItem("stl-theme", this.preferences.theme);
    } catch (error) {
      console.warn("Erro ao salvar preferências:", error);
    }
  }

  updateSettingsDisplay() {
    // Update saved camera display
    if (this.preferences.lastCamera) {
      this.savedCameraDisplay.textContent =
        this.preferences.lastCamera.label || "Câmera padrão";
    } else {
      this.savedCameraDisplay.textContent = "Nenhuma";
    }

    // Update last session display
    if (this.preferences.lastSession) {
      const lastSession = new Date(this.preferences.lastSession);
      const now = new Date();
      const diffTime = Math.abs(now - lastSession);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        this.lastSessionDisplay.textContent = "Hoje";
      } else if (diffDays === 1) {
        this.lastSessionDisplay.textContent = "Ontem";
      } else {
        this.lastSessionDisplay.textContent = `${diffDays} dias atrás`;
      }
    } else {
      this.lastSessionDisplay.textContent = "Primeira vez";
    }
  }

  async applySavedCamera() {
    if (!this.preferences.lastCamera) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const savedCamera = devices.find(
        (device) => device.deviceId === this.preferences.lastCamera.deviceId
      );

      if (savedCamera) {
        console.log("Câmera salva encontrada:", savedCamera.label);
      }
    } catch (error) {
      console.warn("Erro ao verificar câmera salva:", error);
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    // Show transition overlay
    this.themeTransition.classList.add("active");

    setTimeout(() => {
      document.documentElement.setAttribute("data-theme", newTheme);
      this.preferences.theme = newTheme;
      this.savePreferences();

      setTimeout(() => {
        this.themeTransition.classList.remove("active");
      }, 150);
    }, 150);
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      this.enterFullscreenMode();
    } else {
      this.exitFullscreenMode();
    }
  }

  enterFullscreenMode() {
    // Request fullscreen API
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else {
      // Fallback: Manual fullscreen mode
      this.enableManualFullscreen();
    }
  }

  exitFullscreenMode() {
    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    ) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
    } else {
      // Manual fullscreen mode
      this.disableManualFullscreen();
    }
  }

  enableManualFullscreen() {
    this.mainLayout.classList.add("fullscreen-mode");
    this.exitFullscreen.style.display = "flex";
    this.isFullscreen = true;

    // Hide scrollbars
    document.body.style.overflow = "hidden";
  }

  disableManualFullscreen() {
    this.mainLayout.classList.remove("fullscreen-mode");
    this.exitFullscreen.style.display = "none";
    this.isFullscreen = false;

    // Restore scrollbars
    document.body.style.overflow = "hidden"; // Keep hidden for this layout
  }

  handleFullscreenChange() {
    const isInFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    );

    if (isInFullscreen && !this.isFullscreen) {
      this.enableManualFullscreen();
    } else if (!isInFullscreen && this.isFullscreen) {
      this.disableManualFullscreen();
    }
  }

  handleKeyboardShortcuts(e) {
    // Prevent default browser shortcuts that might interfere
    if (e.key === "F11") {
      e.preventDefault();
      this.toggleFullscreen();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "t") {
      e.preventDefault();
      this.toggleTheme();
    }

    if (e.key === "Escape" && this.isFullscreen) {
      this.exitFullscreenMode();
    }

    if (e.key === " " && !this.isStreaming) {
      e.preventDefault();
      this.startCamera();
    }
  }

  updateLastActivity() {
    this.preferences.lastSession = new Date().toISOString();
    this.preferences.totalRecognitions++;
    this.updateSettingsDisplay();
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

    // Simple color change without animation
    if (letter !== "?") {
      this.resultDiv.style.color = "var(--color-apple-blue)";
      setTimeout(() => {
        this.resultDiv.style.color = "var(--color-text-primary)";
      }, 1000);
    }
  }

  async startCamera() {
    if (this.isStreaming) return;

    try {
      this.toggleBtn.innerHTML = "<span>Iniciando...</span>";
      this.toggleBtn.disabled = true;
      this.toggleBtn.classList.add("loading");

      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      let constraints = {
        video: {
          width: { ideal: this.preferences.preferredResolution.width },
          height: { ideal: this.preferences.preferredResolution.height },
          facingMode: "user",
        },
        audio: false,
      };

      // Try to use saved camera
      if (
        this.preferences.lastCamera &&
        videoDevices.find(
          (d) => d.deviceId === this.preferences.lastCamera.deviceId
        )
      ) {
        constraints.video.deviceId = {
          exact: this.preferences.lastCamera.deviceId,
        };
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;

      this.video.onloadedmetadata = () => {
        this.canvas.width =
          this.video.videoWidth || this.preferences.preferredResolution.width;
        this.canvas.height =
          this.video.videoHeight || this.preferences.preferredResolution.height;

        this.showVideo();

        // Save camera information
        const track = this.stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          this.preferences.lastCamera = {
            deviceId:
              settings.deviceId || track.getConstraints().deviceId?.exact,
            label: track.label || "Câmera padrão",
          };
          this.updateSettingsDisplay();
        }
      };

      this.isStreaming = true;
      this.sessionStartTime = new Date().toISOString();
      this.preferences.sessionCount++;

      this.toggleBtn.disabled = false;
      this.toggleBtn.classList.remove("loading");
      this.toggleBtn.classList.add("active");
      this.toggleBtn.innerHTML = "<span>Parar Câmera</span>";

      this.startProcessing();
      this.updateLastActivity();
    } catch (err) {
      console.error("Erro na câmera:", err);
      this.showError("Erro ao acessar a câmera. Verifique as permissões.");
      this.resetToggleButton();
    }
  }

  stopCamera() {
    if (!this.isStreaming) return;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.video.srcObject = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.hideVideo();

    this.isStreaming = false;
    this.stopProcessing();
    this.resetToggleButton();

    this.resultDiv.textContent = "?";
    this.resultDiv.style.color = "var(--color-text-primary)";

    this.savePreferences();
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
      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      const imageData = this.canvas.toDataURL("image/jpeg", 0.8);
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

    this.navItems.forEach((nav) => nav.classList.remove("active"));
    e.currentTarget.classList.add("active");

    switch (item) {
      case "dashboard":
        break;
      case "configuracoes":
        this.savePreferences();
        window.location.href = "/configuracoes";
        break;
      case "sobre":
        this.savePreferences();
        window.location.href = "/sobre";
        break;
    }
  }

  showError(message) {
    // Create a more sophisticated error notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(255, 59, 48, 0.95);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 59, 48, 0.3);
      max-width: 300px;
      box-shadow: 0 20px 40px rgba(255, 59, 48, 0.3);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Public API for debugging and external access
  getPreferences() {
    return { ...this.preferences };
  }

  updatePreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
    this.savePreferences();
    this.updateSettingsDisplay();
  }

  resetPreferences() {
    localStorage.removeItem("stl-preferences");
    localStorage.removeItem("stl-theme");
    this.initPreferences();
    this.updateSettingsDisplay();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Set initial result
  document.getElementById("result").textContent = "?";

  // Initialize dashboard
  const dashboard = new STLDashboard();

  // Make globally available for debugging
  window.STLDashboard = dashboard;

  // Console info
  console.log("STL Dashboard carregado com:");
  console.log("• Sistema de preferências");
  console.log("• Modo claro/escuro");
  console.log("• Modo tela cheia/imersivo");
  console.log("• Atalhos: F11 (fullscreen), Ctrl+T (tema), Espaço (iniciar)");
});

// Prevent scroll and zoom
document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("keydown", (e) => {
  // Allow theme and fullscreen shortcuts
  if ((e.ctrlKey || e.metaKey) && e.key === "t") return;
  if (e.key === "F11") return;
  if (e.key === "Escape") return;
  if (e.key === " ") return;

  // Prevent other scroll keys
  if (
    ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(
      e.key
    )
  ) {
    e.preventDefault();
  }
});

// Prevent zoom
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "+" || e.key === "-" || e.key === "=")
  ) {
    e.preventDefault();
  }
});

// Prevent touch scroll
document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);
