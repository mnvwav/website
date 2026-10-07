/* Side quests: an experiments gallery. Each experiment is self-contained. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const exp = (id) => document.querySelector(`[data-x="${id}"]`);
  const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  // Run something once, the first time an element comes near the viewport.
  const onView = (el, fn) => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: "300px" }).observe(el);

  /* A built-in sample image so the photo experiments look good before anyone uploads anything:
     a dusk sky, a low sun, layered hills. */
  function sample(w = 1200, h = 800) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1B1A4A"); sky.addColorStop(0.45, "#6E3B8F"); sky.addColorStop(0.7, "#F2735F"); sky.addColorStop(1, "#FFB224");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.62, h * 0.62, 0, w * 0.62, h * 0.62, h * 0.22);
    sun.addColorStop(0, "#FFF4D6"); sun.addColorStop(0.6, "#FFD07A"); sun.addColorStop(1, "rgba(255,178,36,0)");
    g.fillStyle = sun; g.beginPath(); g.arc(w * 0.62, h * 0.62, h * 0.22, 0, 7); g.fill();
    [["#3A2350", 0.68, 60], ["#24183A", 0.76, 90], ["#120E20", 0.86, 120]].forEach(([col, base, amp], k) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, h * base - Math.sin(x / (180 + k * 60) + k) * amp * 0.5 - Math.sin(x / 61 + k * 2) * amp * 0.12);
      g.lineTo(w, h); g.fill();
    });
    return c;
  }
  const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

  /* ---------- Signal: live ASCII camera ---------- */
  (() => {
    const root = exp("signal"); if (!root) return;
    const cv = $("canvas", root), g = cv.getContext("2d"), go = act(root, "go"), modeBtn = act(root, "mode");
    const RAMP = " .:-=+*#%@", MODES = ["Mono", "Marigold", "Colour"];
    const COLS = 120, CW = cv.width / COLS, ROWS = Math.round(cv.height / (CW * 1.8)), RH = cv.height / ROWS;
    const tiny = document.createElement("canvas"); tiny.width = COLS; tiny.height = ROWS;
    const tg = tiny.getContext("2d", { willReadFrequently: true });
    let mode = 0, stream, video, raf;
    function render(source, mirror) {
      tg.save(); if (mirror) { tg.translate(COLS, 0); tg.scale(-1, 1); } tg.drawImage(source, 0, 0, COLS, ROWS); tg.restore();
      const d = tg.getImageData(0, 0, COLS, ROWS).data;
      g.fillStyle = "#0B0A10"; g.fillRect(0, 0, cv.width, cv.height);
      g.font = `600 ${RH * 0.95}px "JetBrains Mono", monospace`; g.textBaseline = "top";
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = (y * COLS + x) * 4, l = Math.pow(lum(d, i) / 255, 0.65), ch = RAMP[Math.min(RAMP.length - 1, (l * RAMP.length) | 0)];
        if (ch === " ") continue;
        g.fillStyle = mode === 0 ? `rgba(237,235,230,${0.35 + l * 0.65})` : mode === 1 ? `hsl(${34 + l * 10} 100% ${28 + l * 45}%)` : `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
        g.fillText(ch, x * CW, y * RH);
      }
    }
    // Until the camera is on, show the sample scene in ASCII so it's never an empty box.
    const idle = sample(640, 400);
    onView(cv, () => document.fonts.ready.then(() => !stream && render(idle)));
    async function start() {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false }); }
      catch { go.textContent = "Camera not available"; return; }
      video = Object.assign(document.createElement("video"), { srcObject: stream, muted: true, playsInline: true });
      await video.play();
      go.textContent = "Turn off camera";
      const loop = () => { render(video, true); raf = requestAnimationFrame(loop); };
      loop();
    }
    function stop() { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); stream = null; go.textContent = "Turn on camera"; render(idle); }
    go.addEventListener("click", () => (stream ? stop() : start()));
    modeBtn.addEventListener("click", () => { mode = (mode + 1) % MODES.length; modeBtn.textContent = "Style: " + MODES[mode]; if (!stream) render(idle); });
    act(root, "save").addEventListener("click", () => download(cv, "signal.png"));
    document.addEventListener("visibilitychange", () => { if (document.hidden && stream) stop(); });
  })();







  /* ---------- Life in weeks ---------- */
  (() => {
    const root = exp("weeks"); if (!root) return;
    const cv = $("canvas", root), g = cv.getContext("2d"), input = act(root, "date"), text = act(root, "text");
    const YEARS = 90, PER = 52;
    let lived = -1, pulse = 0, raf;
    input.max = new Date().toISOString().slice(0, 10);
    const saved = store.get("mnv-birthday", null);
    if (saved) input.value = saved;
    function draw() {
      const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, cell = W / YEARS, H = cell * PER;
      cv.style.height = H + "px"; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < YEARS * PER; i++) {
        const x = ((i / PER) | 0) * cell + cell / 2, y = (i % PER) * cell + cell / 2;
        g.beginPath(); g.arc(x, y, cell * 0.36, 0, 7);
        g.fillStyle = i < lived ? "#EDEBE6" : i === lived ? "#FFB224" : "#24222D";
        g.fill();
        if (i === lived) { g.lineWidth = 1.5; g.strokeStyle = `rgba(255,178,36,${0.7 - (pulse % 1) * 0.7})`; g.beginPath(); g.arc(x, y, cell * (0.6 + (pulse % 1) * 2.6), 0, 7); g.stroke(); }
      }
    }
    function show(date) {
      const born = new Date(date); if (isNaN(born)) return;
      lived = Math.max(0, Math.floor((Date.now() - born) / (7 * 864e5)));
      const total = YEARS * PER, left = Math.max(0, total - lived), pct = Math.min(100, (lived / total) * 100).toFixed(1);
      text.innerHTML = `You've lived <b>${lived.toLocaleString()}</b> weeks. That's ${pct}% of a 90-year life. <b>${left.toLocaleString()}</b> to go.`;
      cancelAnimationFrame(raf);
      const tick = () => { pulse += 0.015; draw(); raf = requestAnimationFrame(tick); };
      reduce ? draw() : tick();
    }
    $("form", root).addEventListener("submit", (e) => { e.preventDefault(); store.set("mnv-birthday", input.value); show(input.value); });
    new IntersectionObserver(([e]) => { if (!e.isIntersecting) cancelAnimationFrame(raf); else if (lived >= 0) show(input.value); }).observe(cv);
    addEventListener("resize", draw);
    draw();
    if (saved) show(saved);
  })();





})();
