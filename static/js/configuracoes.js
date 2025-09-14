// STL Configurações - Sistema Integrado com Temas e Preferências
class STLConfiguracao {
  constructor() {
    this.currentStream = null;
    this.selectedCameraId = null;
    this.isInitialized = false;

    this.elements = {
      cameraSelect: document.getElementById("cameraSelect"),
      cameraPreview: document.getElementById("cameraPreview"),
      previewOverlay: document.querySelector(".preview-overlay"),
      statusText: document.querySelector(".status-text"),
      cameraInfo: document.getElementById("cameraInfo"),
      testCameraBtn: document.getElementById("testCameraBtn"),
      saveBtn: document.getElementById("saveConfig"),
      loadingOverlay: document.getElementById("loadingOverlay"),
      toastContainer: document.getElementById("toastContainer"),

      // Theme controls
      themeDark: document.getElementById("themeDark"),
      themeLight: document.getElementById("themeLight"),

      // Settings toggles
      highPerformanceToggle: document.getElementById("highPerformance"),
      voiceOutputToggle: document.getElementById("voiceOutput"),
      highContrastToggle: document.getElementById("highContrast"),
    };

    this.preferences = {};
    this.init();
  }

  async init() {
    try {
      this.showLoading("Inicializando configurações...");

      this.loadSavedTheme();
      this.loadSavedPreferences();
      await this.checkPermissions();
      await this.loadCameras();
      this.bindEvents();
      this.setupThemeControls();
      this.setupNavigation();

      this.hideLoading();
      this.showToast("Configurações carregadas com sucesso", "success");
    } catch (error) {
      this.hideLoading();
      this.handleError("Erro ao inicializar configurações", error);
    }
  }

  loadSavedTheme() {
    const savedTheme = localStorage.getItem("stl-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    if (savedTheme === "light") {
      this.elements.themeLight.checked = true;
    } else {
      this.elements.themeDark.checked = true;
    }
  }

  loadSavedPreferences() {
    try {
      const saved = localStorage.getItem("stl-preferences");
      if (saved) {
        this.preferences = JSON.parse(saved);
        this.applyPreferencesToUI();
      }
    } catch (error) {
      console.warn("Erro ao carregar preferências:", error);
      this.preferences = {};
    }
  }

  applyPreferencesToUI() {
    if (this.preferences.highPerformance !== undefined) {
      this.elements.highPerformanceToggle.checked =
        this.preferences.highPerformance;
    }
    if (this.preferences.voiceOutput !== undefined) {
      this.elements.voiceOutputToggle.checked = this.preferences.voiceOutput;
    } else {
      this.elements.voiceOutputToggle.checked = true; // Default true
    }
    if (this.preferences.highContrast !== undefined) {
      this.elements.highContrastToggle.checked = this.preferences.highContrast;
    }
  }

  setupThemeControls() {
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    themeInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.changeTheme(e.target.value);
        }
      });
    });
  }

  changeTheme(newTheme) {
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("stl-theme", newTheme);
    this.showToast(
      `Tema ${newTheme === "dark" ? "escuro" : "claro"} ativado`,
      "info"
    );
  }

  async checkPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Permissão de câmera negada. Por favor, permita o acesso à câmera."
        );
      } else if (error.name === "NotFoundError") {
        throw new Error("Nenhuma câmera encontrada no dispositivo.");
      }
      throw error;
    }
  }

  async loadCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (videoDevices.length === 0) {
        throw new Error("Nenhuma câmera detectada");
      }

      this.populateCameraSelect(videoDevices);

      // Auto-select saved camera or first camera
      const savedCameraId = this.preferences.lastCamera?.deviceId;
      if (
        savedCameraId &&
        videoDevices.find((d) => d.deviceId === savedCameraId)
      ) {
        this.selectedCameraId = savedCameraId;
        this.elements.cameraSelect.value = savedCameraId;
      } else if (videoDevices.length > 0) {
        this.selectedCameraId = videoDevices[0].deviceId;
        this.elements.cameraSelect.value = this.selectedCameraId;
      }

      await this.startCamera(this.selectedCameraId);
    } catch (error) {
      console.error("Erro ao carregar câmeras:", error);
      this.elements.cameraSelect.innerHTML =
        '<option value="">Erro ao carregar câmeras</option>';
      throw error;
    }
  }

  populateCameraSelect(devices) {
    this.elements.cameraSelect.innerHTML = "";
    devices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Câmera ${index + 1}`;
      this.elements.cameraSelect.appendChild(option);
    });
  }

  async startCamera(deviceId) {
    try {
      this.showCameraStatus("Conectando à câmera...", "loading");

      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      };

      this.currentStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      this.elements.cameraPreview.srcObject = this.currentStream;

      await new Promise((resolve) => {
        this.elements.cameraPreview.onloadedmetadata = resolve;
      });

      this.hideCameraStatus();
      this.updateCameraInfo(deviceId);
      this.selectedCameraId = deviceId;

      // Save camera preference
      const selectedOption = this.elements.cameraSelect.querySelector(
        `option[value="${deviceId}"]`
      );
      this.preferences.lastCamera = {
        deviceId: deviceId,
        label: selectedOption
          ? selectedOption.textContent
          : "Câmera desconhecida",
      };
    } catch (error) {
      console.error("Erro ao iniciar câmera:", error);
      this.showCameraStatus("Falha na conexão da câmera", "error");
      this.updateCameraInfo(null);
      throw error;
    }
  }

  showCameraStatus(message, type = "loading") {
    this.elements.previewOverlay.classList.remove("hidden");
    this.elements.statusText.textContent = message;
    const statusIcon =
      this.elements.previewOverlay.querySelector(".status-icon");
    statusIcon.className = `status-icon ${type}`;
  }

  hideCameraStatus() {
    this.elements.previewOverlay.classList.add("hidden");
  }

  updateCameraInfo(deviceId) {
    if (!deviceId) {
      this.elements.cameraInfo.textContent = "Nenhuma câmera conectada";
      return;
    }

    const selectedOption = this.elements.cameraSelect.querySelector(
      `option[value="${deviceId}"]`
    );
    const cameraName = selectedOption
      ? selectedOption.textContent
      : "Câmera desconhecida";

    if (this.elements.cameraPreview.videoWidth) {
      const width = this.elements.cameraPreview.videoWidth;
      const height = this.elements.cameraPreview.videoHeight;
      this.elements.cameraInfo.textContent = `${cameraName} • ${width}×${height}`;
    } else {
      this.elements.cameraInfo.textContent = cameraName;
    }
  }

  bindEvents() {
    // Camera selection
    this.elements.cameraSelect.addEventListener("change", async (e) => {
      if (e.target.value) {
        try {
          await this.startCamera(e.target.value);
          this.showToast("Câmera alterada com sucesso", "success");
        } catch (error) {
          this.handleError("Erro ao trocar câmera", error);
        }
      }
    });

    // Test camera button
    this.elements.testCameraBtn.addEventListener("click", () => {
      this.testCamera();
    });

    // Save configuration
    this.elements.saveBtn.addEventListener("click", () => {
      this.saveConfiguration();
    });

    // Toggle controls
    this.elements.highPerformanceToggle.addEventListener("change", (e) => {
      this.handleToggleChange("highPerformance", e.target.checked);
    });

    this.elements.voiceOutputToggle.addEventListener("change", (e) => {
      this.handleToggleChange("voiceOutput", e.target.checked);
    });

    this.elements.highContrastToggle.addEventListener("change", (e) => {
      this.handleToggleChange("highContrast", e.target.checked);
    });

    // Page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.currentStream) {
        this.currentStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      } else if (!document.hidden && this.currentStream) {
        this.currentStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.cleanup();
      this.savePreferences();
    });
  }

  setupNavigation() {
    document.querySelectorAll("a[href]").forEach((link) => {
      if (link.href.includes("/")) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          this.savePreferences();

          document.body.style.opacity = "0.5";
          document.body.style.transition = "opacity 0.3s ease";

          setTimeout(() => {
            window.location.href = link.href;
          }, 200);
        });
      }
    });
  }

  testCamera() {
    if (!this.currentStream) {
      this.showToast("Nenhuma câmera conectada para testar", "error");
      return;
    }

    // Flash effect for camera test
    const flashOverlay = document.createElement("div");
    flashOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      opacity: 0;
      z-index: 10;
      pointer-events: none;
      transition: opacity 0.2s ease;
    `;

    this.elements.cameraPreview.parentElement.appendChild(flashOverlay);

    // Trigger flash
    requestAnimationFrame(() => {
      flashOverlay.style.opacity = "1";
      setTimeout(() => {
        flashOverlay.style.opacity = "0";
        setTimeout(() => {
          flashOverlay.remove();
        }, 200);
      }, 100);
    });

    this.showToast("Teste de câmera realizado", "success");
  }

  saveConfiguration() {
    try {
      this.savePreferences();
      this.showToast("Configurações salvas com sucesso", "success");

      // Animate save button
      this.elements.saveBtn.style.transform = "scale(0.95)";
      setTimeout(() => {
        this.elements.saveBtn.style.transform = "";
      }, 150);
    } catch (error) {
      this.handleError("Erro ao salvar configurações", error);
    }
  }

  savePreferences() {
    try {
      const config = {
        selectedCameraId: this.selectedCameraId,
        lastCamera: this.preferences.lastCamera,
        highPerformance: this.elements.highPerformanceToggle.checked,
        voiceOutput: this.elements.voiceOutputToggle.checked,
        highContrast: this.elements.highContrastToggle.checked,
        theme: document.documentElement.getAttribute("data-theme"),
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem("stl-preferences", JSON.stringify(config));
      this.preferences = config;
    } catch (error) {
      console.warn("Erro ao salvar preferências:", error);
    }
  }

  handleToggleChange(setting, value) {
    const messages = {
      highPerformance: value
        ? "Modo alta performance ativado"
        : "Modo alta performance desativado",
      voiceOutput: value ? "Saída de voz ativada" : "Saída de voz desativada",
      highContrast: value
        ? "Alto contraste ativado"
        : "Alto contraste desativado",
    };

    this.showToast(messages[setting], "info");

    // Apply high contrast immediately
    if (setting === "highContrast") {
      document.body.classList.toggle("high-contrast", value);
    }
  }

  showLoading(message = "Carregando...") {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.querySelector(".loading-text").textContent =
        message;
      this.elements.loadingOverlay.classList.add("show");
    }
  }

  hideLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.remove("show");
    }
  }

  showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
      success:
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error:
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="L12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="L12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    };

    toast.innerHTML = `
      <div class="toast-icon ${type}">
        ${icons[type] || icons.info}
      </div>
      <span>${message}</span>
    `;

    this.elements.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);

    return toast;
  }

  handleError(message, error) {
    console.error(message, error);
    let errorMessage = message;
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    this.showToast(errorMessage, "error", 5000);
  }

  cleanup() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  // Public API
  getCurrentCameraId() {
    return this.selectedCameraId;
  }

  isHighPerformanceEnabled() {
    return this.elements.highPerformanceToggle.checked;
  }

  isVoiceOutputEnabled() {
    return this.elements.voiceOutputToggle.checked;
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme");
  }

  getPreferences() {
    return { ...this.preferences };
  }
}

// Enhanced error handling
class ErrorHandler {
  static getReadableError(error) {
    const errorMap = {
      NotAllowedError:
        "Permissão de câmera negada. Verifique as configurações do navegador.",
      NotFoundError:
        "Nenhuma câmera encontrada. Verifique se uma câmera está conectada.",
      NotReadableError: "Câmera em uso por outro aplicativo.",
      OverconstrainedError: "Configurações de câmera não suportadas.",
      SecurityError: "Erro de segurança ao acessar a câmera.",
      TypeError: "Erro de configuração. Tente recarregar a página.",
    };

    return errorMap[error.name] || error.message || "Erro desconhecido";
  }
}

// Device capabilities detection
const ConfigUtils = {
  getDeviceCapabilities() {
    return {
      hasCamera: !!navigator.mediaDevices?.getUserMedia,
      hasNotifications: "Notification" in window,
      hasLocalStorage: typeof Storage !== "undefined",
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      supportsWebGL: !!window.WebGLRenderingContext,
      supportsFullscreen: !!(
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled
      ),
    };
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check device capabilities
  const capabilities = ConfigUtils.getDeviceCapabilities();
  console.log("📱 Device capabilities:", capabilities);

  if (!capabilities.hasCamera) {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; color: var(--color-text-primary); font-family: Inter, sans-serif;">
        <div>
          <h1>Câmera não suportada</h1>
          <p>Este dispositivo não suporta acesso à câmera.</p>
        </div>
      </div>
    `;
    return;
  }

  // Initialize configuration manager
  const configManager = new STLConfiguracao();

  // Make globally available
  window.STLConfig = configManager;
  window.ConfigUtils = ConfigUtils;

  console.log("🚀 STL Configurações carregadas com:");
  console.log("• Sistema de temas claro/escuro");
  console.log("• Integração com preferências do dashboard");
  console.log("• Configurações de câmera avançadas");
  console.log("• Interface Apple design");
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (window.STLConfig) {
    window.STLConfig.cleanup();
  }
});
