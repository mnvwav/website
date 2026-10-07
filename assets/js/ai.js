/* Side quests: cameras that see you (hands, face, body, objects). On-device AI via Google's MediaPipe; frames never leave the browser.
   Models download only when someone turns on that experiment's camera. */
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODELS = {
  seg: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  pose: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
};
const $ = (s, c = document) => c.querySelector(s);
const exp = (id) => document.querySelector(`[data-x="${id}"]`);
const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
const rand = (a, b) => a + Math.random() * (b - a);
const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
const INK = "#16151A", PAPER = "#F1EDE4", INDIGO = "#3D3AE8", MARIGOLD = "#FFB224", ROSE = "#F17FA6", TEAL = "#2FBF9B", CORAL = "#F2735F", BG = "#0B0A10";

/* ---------- Lazy model loading, shared between experiments ---------- */
let visionP;
const vision = () => (visionP ||= import(`${MP}/vision_bundle.mjs`).then(async (m) => ({ m, files: await m.FilesetResolver.forVisionTasks(`${MP}/wasm`) })));
const cache = {};
async function model(kind, mode = "VIDEO") {
  const key = kind + mode;
  if (cache[key]) return cache[key];
  const { m, files } = await vision();
  const base = (path) => ({ baseOptions: { modelAssetPath: path, delegate: "GPU" }, runningMode: mode });
  cache[key] =
    kind === "seg" ? await m.ImageSegmenter.createFromOptions(files, { ...base(MODELS.seg), outputCategoryMask: false, outputConfidenceMasks: true })
    : kind === "hand" ? await m.HandLandmarker.createFromOptions(files, { ...base(MODELS.hand), numHands: 2 })
    : kind === "pose" ? await m.PoseLandmarker.createFromOptions(files, { ...base(MODELS.pose), numPoses: 1 })
    : await m.FaceLandmarker.createFromOptions(files, { ...base(MODELS.face), outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true, numFaces: 1 });
  return cache[key];
}

/* ---------- Camera session: one toggle button, frame callback, clean stop ---------- */
function camera(root, { onFrame, onStop, models = [] }) {
  const go = act(root, "go"), note = act(root, "note");
  let stream, video, raf, running = false, label = go.textContent;
  const setNote = (t) => note && (note.textContent = t);
  async function start() {
    go.disabled = true; go.textContent = "Starting…";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
    } catch { go.disabled = false; go.textContent = label; setNote("Camera blocked or unavailable. Allow camera access and try again."); return; }
    video = root.querySelector("video.xlive") || document.createElement("video");
    Object.assign(video, { srcObject: stream, muted: true, playsInline: true }); await video.play();
    if (models.length) { go.textContent = "Loading AI…"; setNote("Loading the on-device AI model (first time only)…"); }
    let loaded;
    try { loaded = await Promise.all(models.map((k) => model(k))); }
    catch { setNote("Couldn't load the AI model. Check your connection and try again."); stop(); return; }
    go.disabled = false; go.textContent = "Turn off camera"; running = true;
    setNote("Runs on your device with on-device AI. Nothing is recorded or sent.");
    let last = -1;
    const loop = () => {
      if (!running) return;
      if (video.readyState >= 2 && video.currentTime !== last) { last = video.currentTime; onFrame(video, loaded, performance.now()); }
      raf = requestAnimationFrame(loop);
    };
    loop();
  }
  function stop() {
    running = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); stream = null;
    go.disabled = false; go.textContent = label; onStop?.();
  }
  go.addEventListener("click", () => (stream ? stop() : start()));
  document.addEventListener("visibilitychange", () => { if (document.hidden && stream) stop(); });
  return { video: () => video, live: () => !!stream };
}

/* Draw a mirrored video frame (selfie view) covering the canvas. */
function drawMirrored(g, src, W, H) {
  const vw = src.videoWidth || src.width, vh = src.videoHeight || src.height, k = Math.max(W / vw, H / vh);
  g.save(); g.translate(W, 0); g.scale(-1, 1);
  g.drawImage(src, (W - vw * k) / 2, (H - vh * k) / 2, vw * k, vh * k);
  g.restore();
}
function idle(g, W, H, line1, line2) {
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.fillStyle = "rgba(237,235,230,.85)"; g.font = `800 ${Math.round(W / 22)}px "Bricolage Grotesque", sans-serif`;
  g.fillText(line1, W / 2, H / 2 - 10);
  g.fillStyle = "rgba(237,235,230,.45)"; g.font = `600 ${Math.round(W / 64)}px "JetBrains Mono", monospace`; g.fillText(line2, W / 2, H / 2 + 34);
  g.textAlign = "left";
}
function countdown(root, seconds, done) {
  const badge = document.createElement("div"); badge.className = "xcount"; root.append(badge);
  let n = seconds; badge.textContent = n;
  const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); badge.remove(); done(); } else badge.textContent = n; }, 1000);
}
const flash = (root) => { const f = document.createElement("div"); f.className = "xflash"; root.append(f); setTimeout(() => f.remove(), 450); };


/* ---------- Draw in the air ---------- */
(() => {
  const root = exp("air"); if (!root) return;
  const cv = $("canvas", root), g = cv.getContext("2d"), W = cv.width, H = cv.height, inkEl = act(root, "ink");
  const ink = document.createElement("canvas"); ink.width = W; ink.height = H; const ig = ink.getContext("2d");
  const COLORS = [MARIGOLD, ROSE, TEAL, "#6E6BFF", CORAL, "#FFFFFF"];
  let col = 0, prev = null, pinched = false, smooth = null;
  const paintInk = () => { inkEl.style.background = COLORS[col]; inkEl.title = "Current colour"; };
  paintInk();
  idle(g, W, H, "Draw in the air", "Turn on the camera and point your index finger");
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ext = (lm, tip, pip) => lm[tip].y < lm[pip].y;     // finger extended (pointing up-ish)
  camera(root, {
    models: ["hand"],
    onFrame(video, [hands], ts) {
      g.globalAlpha = 0.45; drawMirrored(g, video, W, H); g.globalAlpha = 1;
      g.fillStyle = "rgba(11,10,16,.45)"; g.fillRect(0, 0, W, H);
      const res = hands.detectForVideo(video, ts), lm = res.landmarks?.[0];
      g.drawImage(ink, 0, 0);
      if (!lm) { prev = null; return; }
      // Landmarks are normalised to the raw (unmirrored) video; flip x to match the selfie view.
      const P = (i) => ({ x: (1 - lm[i].x) * W, y: lm[i].y * H });
      const tip = P(8), thumb = P(4), handSize = dist(P(0), P(9));
      smooth = smooth ? { x: smooth.x * 0.55 + tip.x * 0.45, y: smooth.y * 0.55 + tip.y * 0.45 } : tip;
      const pinch = dist(tip, thumb) < handSize * 0.35;
      const open = [8, 12, 16, 20].every((t) => ext(lm, t, t - 2));
      const pointing = ext(lm, 8, 6) && !ext(lm, 12, 10) && !ext(lm, 16, 14);
      if (pinch && !pinched) { col = (col + 1) % COLORS.length; paintInk(); }
      pinched = pinch;
      if (open) { ig.save(); ig.globalCompositeOperation = "destination-out"; ig.beginPath(); ig.arc(P(9).x, P(9).y, handSize * 1.3, 0, 7); ig.fill(); ig.restore(); prev = null; }
      else if (pointing && !pinch) {
        if (prev) { ig.strokeStyle = COLORS[col]; ig.lineWidth = 9; ig.lineCap = "round"; ig.shadowColor = COLORS[col]; ig.shadowBlur = 22; ig.beginPath(); ig.moveTo(prev.x, prev.y); ig.lineTo(smooth.x, smooth.y); ig.stroke(); ig.shadowBlur = 0; }
        prev = { ...smooth };
      } else prev = null;
      // Cursor
      g.strokeStyle = COLORS[col]; g.lineWidth = 3; g.beginPath(); g.arc(smooth.x, smooth.y, pinch ? 8 : open ? handSize * 1.3 : 16, 0, 7); g.stroke();
    },
    onStop() { idle(g, W, H, "Draw in the air", "Turn on the camera and point your index finger"); },
  });
  act(root, "clear").addEventListener("click", () => ig.clearRect(0, 0, W, H));
  act(root, "save").addEventListener("click", () => { const out = document.createElement("canvas"); out.width = W; out.height = H; const o = out.getContext("2d"); o.fillStyle = BG; o.fillRect(0, 0, W, H); o.drawImage(ink, 0, 0); download(out, "air-drawing.png"); });
})();











/* ---------- Neon skeleton (pose): six looks, light trails, hand sparks, 10-second recording ---------- */
(() => {
  const root = exp("neon"); if (!root) return;
  const cv = $("canvas", root), g = cv.getContext("2d"), W = cv.width, H = cv.height, styleBtn = act(root, "style"), recBtn = act(root, "rec"), sparkBtn = act(root, "sparks");
  const LOOKS = ["Neon", "Fire", "Ghost", "Rainbow", "Wireframe", "Stick figure"];
  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [15, 19], [16, 20]];
  let look = 0, sparksOn = true, sparks = [], prevHands = {}, recorder = null;
  const trail = document.createElement("canvas"); trail.width = W; trail.height = H; const tg = trail.getContext("2d");
  const colour = (k, ts) => [`hsl(190 100% 60%)`, `hsl(${18 + (k % 3) * 12} 100% 55%)`, "rgba(220,230,255,.85)", `hsl(${(k * 24 + ts / 10) % 360} 100% 60%)`, "#6E6BFF", "#F1EDE4"][look];
  idle(g, W, H, "Neon skeleton", "Turn on the camera and step back until your whole body fits");
  camera(root, {
    models: ["pose"],
    onFrame(video, [pose], ts) {
      const lm = pose.detectForVideo(video, ts).landmarks?.[0];
      const fade = 1 - +act(root, "trail").value / 100, glow = +act(root, "glow").value;
      tg.globalCompositeOperation = "destination-out"; tg.fillStyle = `rgba(0,0,0,${Math.max(0.05, fade)})`; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = look === 5 ? "source-over" : "lighter";
      if (lm) {
        const P = (i) => ({ x: (1 - lm[i].x) * W, y: lm[i].y * H, v: lm[i].visibility ?? 1 });
        if (look === 4) {   // wireframe: every joint connected to its neighbours, thin and technical
          tg.strokeStyle = "rgba(110,107,255,.7)"; tg.lineWidth = 1.5; tg.shadowBlur = 0;
          for (let i = 11; i < 33; i++) for (let j = i + 1; j < 33; j++) { const A = P(i), B = P(j); if (A.v > 0.5 && B.v > 0.5 && Math.hypot(A.x - B.x, A.y - B.y) < 220) { tg.beginPath(); tg.moveTo(A.x, A.y); tg.lineTo(B.x, B.y); tg.stroke(); } }
          for (let i = 11; i < 33; i++) { const A = P(i); if (A.v > 0.5) { tg.fillStyle = "#FFB224"; tg.fillRect(A.x - 3, A.y - 3, 6, 6); } }
        } else {
          BONES.forEach(([a2, b2], k) => {
            const A = P(a2), B = P(b2); if (A.v < 0.4 || B.v < 0.4) return;
            tg.strokeStyle = colour(k, ts); tg.lineWidth = look === 5 ? 14 : 10; tg.lineCap = "round";
            tg.shadowColor = tg.strokeStyle; tg.shadowBlur = look === 5 ? 0 : glow;
            tg.beginPath(); tg.moveTo(A.x, A.y); tg.lineTo(B.x, B.y); tg.stroke();
          });
          const nose = P(0); if (nose.v > 0.4) { const r = Math.abs(P(7).x - P(8).x) * 0.7 + 12; tg.lineWidth = 8; tg.strokeStyle = colour(0, ts); tg.shadowBlur = look === 5 ? 0 : glow; tg.beginPath(); tg.arc(nose.x, nose.y, r, 0, 7); look === 5 ? (tg.fillStyle = "#F1EDE4", tg.fill()) : tg.stroke(); }
        }
        tg.shadowBlur = 0;
        // Sparks fly off your hands, more of them the faster you move.
        if (sparksOn) [15, 16].forEach((i) => {
          const h = P(i), pv = prevHands[i]; if (h.v < 0.5) return;
          const speed = pv ? Math.hypot(h.x - pv.x, h.y - pv.y) : 0;
          for (let n = 0; n < Math.min(20, speed / 3); n++) sparks.push({ x: h.x, y: h.y, vx: (h.x - (pv?.x ?? h.x)) * 0.3 + rand(-3, 3), vy: (h.y - (pv?.y ?? h.y)) * 0.3 + rand(-3, 3), life: 1, hue: look === 1 ? rand(15, 50) : look === 3 ? rand(0, 360) : rand(170, 220) });
          prevHands[i] = h;
        });
      }
      sparks = sparks.filter((p) => (p.life -= 0.03) > 0);
      for (const p of sparks) { p.vy += 0.25; p.x += p.vx; p.y += p.vy; tg.fillStyle = `hsla(${p.hue} 100% 65% / ${p.life})`; tg.fillRect(p.x, p.y, 3, 3); }
      g.fillStyle = look === 5 ? "#16151A" : "#05040A"; g.fillRect(0, 0, W, H); g.drawImage(trail, 0, 0);
      if (recorder) { g.fillStyle = "#F2735F"; g.beginPath(); g.arc(40, 40, 10, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = '600 18px "JetBrains Mono", monospace'; g.fillText("REC", 58, 46); }
    },
    onStop() { tg.clearRect(0, 0, W, H); sparks = []; idle(g, W, H, "Neon skeleton", "Turn on the camera and step back until your whole body fits"); },
  });
  styleBtn.addEventListener("click", () => { look = (look + 1) % LOOKS.length; styleBtn.textContent = "Look: " + LOOKS[look]; });
  sparkBtn.addEventListener("click", () => { sparksOn = !sparksOn; sparkBtn.textContent = "Hand sparks: " + (sparksOn ? "On" : "Off"); });
  act(root, "save").addEventListener("click", () => download(cv, "neon-skeleton.png"));
  recBtn.addEventListener("click", () => {
    if (recorder || !window.MediaRecorder) return;
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const chunks = []; recorder = new MediaRecorder(cv.captureStream(30), { mimeType: type, videoBitsPerSecond: 6e6 });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => { const a2 = document.createElement("a"); a2.href = URL.createObjectURL(new Blob(chunks, { type })); a2.download = "neon-skeleton." + (type.includes("mp4") ? "mp4" : "webm"); a2.click(); recorder = null; recBtn.textContent = "● Record 10s"; };
    recorder.start(); let left = 10; recBtn.textContent = `Recording… ${left}s`;
    const t = setInterval(() => { left--; recBtn.textContent = `Recording… ${left}s`; if (left <= 0) { clearInterval(t); recorder.stop(); } }, 1000);
  });
})();


