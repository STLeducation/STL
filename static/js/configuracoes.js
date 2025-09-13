// Apple-style STL Configurações JavaScript
// Advanced camera configuration with Apple UX patterns

class STLConfiguracao {
  constructor() {
    this.currentStream = null;
    this.selectedCameraId = null;
    this.isInitialized = false;

    this.elements = {
      cameraSelect: document.getElementById("cameraSelect"),
      cameraPreview: document.getElementById("cameraPreview"),
      previewOverlay: document.querySelector(".preview-overlay"),
      previewStatus: document.getElementById("previewStatus"),
      statusText: document.querySelector(".status-text"),
      cameraInfo: document.getElementById("cameraInfo"),
      testCameraBtn: document.getElementById("testCameraBtn"),
      saveBtn: document.getElementById("saveConfig"),
      loadingOverlay: document.getElementById("loadingOverlay"),
      toastContainer: document.getElementById("toastContainer"),
      highPerformanceToggle: document.getElementById("highPerformance"),
      voiceOutputToggle: document.getElementById("voiceOutput"),
    };

    this.init();
  }

  async init() {
    try {
      this.showLoading("Inicializando configurações...");

      await this.checkPermissions();
      await this.loadCameras();
      this.bindEvents();
      this.loadSavedSettings();
      this.setupNavigation();

      this.hideLoading();
      this.showToast("Configurações carregadas com sucesso", "success");
    } catch (error) {
      this.hideLoading();
      this.handleError("Erro ao inicializar configurações", error);
    }
  }

  async checkPermissions() {
    try {
      // Request camera permission
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

      // Auto-select first camera
      if (videoDevices.length > 0) {
        this.selectedCameraId = videoDevices[0].deviceId;
        this.elements.cameraSelect.value = this.selectedCameraId;
        await this.startCamera(this.selectedCameraId);
      }
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

      // Stop current stream
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => track.stop());
      }

      // Get new stream
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      this.elements.cameraPreview.srcObject = this.currentStream;

      // Wait for video to load
      await new Promise((resolve) => {
        this.elements.cameraPreview.onloadedmetadata = resolve;
      });

      this.hideCameraStatus();
      this.updateCameraInfo(deviceId);
      this.selectedCameraId = deviceId;
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

    // Get video dimensions if available
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

    // Handle page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.currentStream) {
        // Pause camera when page is hidden for performance
        this.currentStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      } else if (!document.hidden && this.currentStream) {
        // Resume camera when page is visible
        this.currentStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
      }
    });

    // Handle beforeunload to cleanup
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  setupNavigation() {
    // Smooth navigation with fade effect
    document.querySelectorAll("a[href]").forEach((link) => {
      if (link.href.includes("/")) {
        link.addEventListener("click", (e) => {
          e.preventDefault();

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
      const config = {
        selectedCameraId: this.selectedCameraId,
        highPerformance: this.elements.highPerformanceToggle.checked,
        voiceOutput: this.elements.voiceOutputToggle.checked,
        savedAt: new Date().toISOString(),
      };

      // Save to localStorage
      localStorage.setItem("stl-config", JSON.stringify(config));

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

  loadSavedSettings() {
    try {
      const saved = localStorage.getItem("stl-config");
      if (saved) {
        const config = JSON.parse(saved);

        if (config.selectedCameraId) {
          this.elements.cameraSelect.value = config.selectedCameraId;
        }

        this.elements.highPerformanceToggle.checked =
          config.highPerformance || false;
        this.elements.voiceOutputToggle.checked = config.voiceOutput !== false; // default true
      }
    } catch (error) {
      console.warn("Erro ao carregar configurações salvas:", error);
    }
  }

  handleToggleChange(setting, value) {
    const messages = {
      highPerformance: value
        ? "Modo alta performance ativado"
        : "Modo alta performance desativado",
      voiceOutput: value ? "Saída de voz ativada" : "Saída de voz desativada",
    };

    this.showToast(messages[setting], "info");
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

    // Show toast
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    // Auto hide
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
}

// Utility functions for enhanced UX
const ConfigUtils = {
  // Smooth scroll to element
  scrollToElement(element, offset = 0) {
    const elementTop = element.offsetTop - offset;
    window.scrollTo({
      top: elementTop,
      behavior: "smooth",
    });
  },

  // Debounce function for performance
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

  // Detect device capabilities
  getDeviceCapabilities() {
    return {
      hasCamera: !!navigator.mediaDevices?.getUserMedia,
      hasNotifications: "Notification" in window,
      hasLocalStorage: typeof Storage !== "undefined",
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      supportsWebGL: !!window.WebGLRenderingContext,
    };
  },
};

// Enhanced error handling with user-friendly messages
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

// Performance monitor for diagnostics
class PerformanceMonitor {
  constructor() {
    this.startTime = performance.now();
    this.marks = {};
  }

  mark(name) {
    this.marks[name] = performance.now();
  }

  measure(name, startMark) {
    const startTime = startMark ? this.marks[startMark] : this.startTime;
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const monitor = new PerformanceMonitor();
  monitor.mark("init-start");

  // Check device capabilities
  const capabilities = ConfigUtils.getDeviceCapabilities();
  console.log("📱 Device capabilities:", capabilities);

  if (!capabilities.hasCamera) {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; color: #f5f5f7; font-family: Inter, sans-serif;">
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

  // Make globally available for debugging
  window.STLConfig = configManager;
  window.ConfigUtils = ConfigUtils;

  monitor.measure("Initialization complete", "init-start");
  console.log("🚀 STL Configurações carregadas com design Apple!");
});

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (window.STLConfig) {
    window.STLConfig.cleanup();
  }
});
