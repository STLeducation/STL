// Elementos
const socket = io();
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const toggleBtn = document.getElementById("toggleBtn");
const resultDiv = document.getElementById("result");
const statusCorner = document.getElementById("statusCorner");
const navItems = document.querySelectorAll(".nav-item");
const navBackground = document.querySelector(".nav-background");

// Estado
let stream = null;
let isProcessing = false;
let processingInterval = null;
let isStreaming = false;

/* ---------- SOCKET EVENTS ---------- */
socket.on("connect", () => setStatusConnected(true));
socket.on("disconnect", () => setStatusConnected(false));
socket.on("prediction_result", (data) => {
  showResult(data.letter && data.letter !== "?" ? data.letter : "?");
});

function setStatusConnected(connected) {
  statusCorner.textContent = connected ? "Conectado" : "Desconectado";
  statusCorner.classList.toggle("connected", connected);
  statusCorner.classList.toggle("disconnected", !connected);
}
function showResult(letter) {
  resultDiv.textContent = letter;
}

/* ---------- CAMERA ---------- */
async function startCamera() {
  if (isStreaming) return;
  try {
    toggleBtn.textContent = "Iniciando...";
    toggleBtn.disabled = true;

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
    };

    isStreaming = true;
    toggleBtn.disabled = false;
    toggleBtn.textContent = "Parar";

    startProcessing();
  } catch (err) {
    alert("Erro ao acessar a câmera.");
    toggleBtn.disabled = false;
    toggleBtn.textContent = "Iniciar";
    isStreaming = false;
  }
}
function stopCamera() {
  if (!isStreaming) return;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  isStreaming = false;
  stopProcessing();
  toggleBtn.textContent = "Iniciar";
}
function startProcessing() {
  if (processingInterval) return;
  processingInterval = setInterval(() => {
    if (video.readyState === video.HAVE_ENOUGH_DATA && !isProcessing) {
      captureAndSendFrame();
    }
  }, 200);
}
function stopProcessing() {
  clearInterval(processingInterval);
  processingInterval = null;
  isProcessing = false;
}
function captureAndSendFrame() {
  if (isProcessing || !video) return;
  isProcessing = true;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    socket.emit("video_frame", { image: imageData });
  } finally {
    isProcessing = false;
  }
}
toggleBtn.addEventListener("click", () =>
  isStreaming ? stopCamera() : startCamera()
);

/* ---------- NAVBAR ---------- */
function updateBackground(activeItem) {
  navBackground.style.left = `${activeItem.offsetLeft + 8}px`;
  navBackground.style.width = `${activeItem.offsetWidth - 16}px`;
}
function renderSobre() {
  document.querySelector(".main-container").innerHTML = `
    <section class="glass-card camera-card" id="sobre_card">
      <h2>Sobre o STL</h2>
      <p>O <strong>STL</strong> é uma ferramenta para traduzir Libras em tempo real usando IA.</p>
      <p>Ele captura sinais pela câmera, processa os gestos e exibe a tradução imediatamente.</p>
      <p>O objetivo é promover acessibilidade e inclusão, com uma interface simples e intuitiva.</p>
    </section>`;
}
document.addEventListener("DOMContentLoaded", () => {
  resultDiv.textContent = "?";
  const activeItem = document.querySelector(".nav-item.active");
  if (activeItem) updateBackground(activeItem);
});
navItems.forEach((item) =>
  item.addEventListener("click", function (e) {
    e.preventDefault();
    navItems.forEach((n) => n.classList.remove("active"));
    this.classList.add("active");
    updateBackground(this);

    const itemName = this.dataset.item;
    if (itemName === "dashboard") {
      location.reload();
    } else if (itemName === "configuracoes") {
      alert("Página de configurações ainda não implementada.");
    } else if (itemName === "sobre") {
      // Redirecionar para a página sobre.html
      window.location.href = "/sobre";
    }
  })
);
window.addEventListener("resize", () => {
  const activeItem = document.querySelector(".nav-item.active");
  if (activeItem) updateBackground(activeItem);
});
