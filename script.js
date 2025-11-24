// ======================
// CONFIGURACIÓN BÁSICA
// ======================
const canvas = document.getElementById("waves");
const ctx = canvas.getContext("2d");

let width, height;

// --- Variables para grabar GIF ---
let recording = false;
let gif = null;
let recordingStart = 0;
const RECORD_DURATION = 2500; // ms, ~2.5 s de GIF (más ligero)

// ======================
// REDIMENSIONAR CANVAS
// ======================
const colors = [
  "#ffd4ea", // rosa
  "#ffeaa0", // amarillo
  "#c9f6cf", // menta
  "#c0e1ff", // azul
  "#e5cffc", // lila
  "#fff6d9"  // crema
];

const waves = [];
const waveCount = 10;

for (let i = 0; i < waveCount; i++) {
  waves.push({
    color: colors[i % colors.length],
    baseY: 0, // se ajusta en resize()
    amplitude: 40 + Math.random() * 25,
    frequency: 0.04 + Math.random() * 0.002,
    phase: Math.random() * Math.PI * 2,
    // “Golpe de sonido”
    shockActive: false,
    shockStart: 0,
    shockDuration: 1100 // ms
  });
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Actualizamos la posición base de cada onda
  waves.forEach((wave, i) => {
    wave.baseY = (height / (waveCount + 1)) * (i + 1);
  });
}

window.addEventListener("resize", resize);
resize(); // inicial

let lastTime = 0;

// ======================
// LOOP DE DIBUJO
// ======================
function draw(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Fondo suave
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fffaf0");
  gradient.addColorStop(1, "#f3f7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Dibujar cada “banda” arcoíris
  waves.forEach((wave, index) => {
    const { color, baseY, amplitude, frequency, phase } = wave;

    // Probabilidad de que llegue un “golpe de sonido”
    if (!wave.shockActive && Math.random() < 0.029) {
      wave.shockActive = true;
      wave.shockStart = timestamp;
    }

    // Energía del golpe en este momento
    let shockFactor = 0;
    if (wave.shockActive) {
      const progress = (timestamp - wave.shockStart) / wave.shockDuration;
      if (progress >= 1) {
        wave.shockActive = false;
      } else {
        // Envolvente: sube y baja (como un bombo)
        shockFactor = Math.sin(progress * Math.PI);
      }
    }

    ctx.beginPath();

    for (let x = -60; x <= width + 60; x += 8) {
      // Forma base: leve ondulación estática
      const staticOffset =
        Math.sin(x * frequency + phase) * (amplitude * 0.75) +
        Math.cos(x * frequency * 0.1 + phase * 1.7) * (amplitude * 0.22);

      // Vibración por sonido: solo se ve cuando hay “shock”
      let shockOffset = 0;
      if (shockFactor > 0) {
        shockOffset =
          Math.sin(x * frequency * 2.5 + timestamp * 0.02) *
          (amplitude * 0.9 * shockFactor);
      }

      const y = baseY + staticOffset + shockOffset;

      if (x === -60) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Cerramos la banda
    ctx.lineTo(width + 80, height + 80);
    ctx.lineTo(-80, height + 80);
    ctx.closePath();

    // Relleno de color
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.fill();

    // Contorno
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 4.6; // grosor de las ondas
    ctx.strokeStyle = "rgba(38, 53, 71, 0.25)";
    ctx.stroke();
  });

  // ======================
  // GRABAR GIF (si está activo)
  // ======================
  if (recording && gif) {
    gif.addFrame(canvas, {
      copy: true,
      delay: 1000 / 20 // ~20 fps para que pese menos
    });

    if (timestamp - recordingStart >= RECORD_DURATION) {
      recording = false;
      gif.render(); // generar el GIF
    }
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

// ======================
// BOTÓN DE GRABACIÓN GIF
// ======================
const recordBtn = document.getElementById("recordBtn");

recordBtn.addEventListener("click", () => {
  // Evitamos doble click mientras está grabando
  if (recording) return;

  // Comprobar que la librería gif.js está cargada
  if (typeof GIF === "undefined") {
    alert("Falta cargar la librería gif.js en el HTML.");
    return;
  }

  recordBtn.textContent = "Grabando...";

  gif = new GIF({
    workers: 2,
    quality: 15, // mayor número = menor calidad = más ligero
    // Hacemos el GIF a media resolución para que tarde menos
    width: Math.floor(width / 2),
    height: Math.floor(height / 2),
    workerScript:
      "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js"
  });

  // Cuando termine de generar el GIF
  gif.on("finished", function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ondas.gif";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    recordBtn.textContent = "Grabar GIF";
  });

  recording = true;
  recordingStart = performance.now();
});
