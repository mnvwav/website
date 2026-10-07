/* Side quests: creative tools for music, design and apps. Everything runs on the visitor's device. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const exp = (id) => document.querySelector(`[data-x="${id}"]`);
  const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  const onView = (el, fn) => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: "300px" }).observe(el);
  const copy = async (text, btn, label) => { try { await navigator.clipboard.writeText(text); if (btn) { const t = label || btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = t), 1200); } } catch { prompt("Copy this:", text); } };
  const DISPLAY = '"Bricolage Grotesque", sans-serif', MONO = '"JetBrains Mono", monospace';
  const INK = "#16151A", PAPER = "#F1EDE4", INDIGO = "#3D3AE8", MARIGOLD = "#FFB224", ROSE = "#F17FA6", TEAL = "#2FBF9B", CORAL = "#F2735F";
  let actx;
  const audio = () => { actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); return actx; };
  const decode = async (file) => audio().decodeAudioData(await file.arrayBuffer());
  // The chop shop renders a built-in loop; the audio tools reuse it until someone loads a track.
  const builtInLoop = () => new Promise((res) => { const t = setInterval(() => { if (window.mnvLoop) { clearInterval(t); res(window.mnvLoop); } }, 200); });
  const loadImage = (src) => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = typeof src === "string" ? src : URL.createObjectURL(src); });
  const fitText = (g, text, maxW, size, weight = 800, font = DISPLAY) => { let fs = size; g.font = `${weight} ${fs}px ${font}`; while (g.measureText(text).width > maxW && fs > 10) { fs -= 2; g.font = `${weight} ${fs}px ${font}`; } return fs; };
  const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const mono = (buf) => { const a = buf.getChannelData(0); if (buf.numberOfChannels < 2) return a; const b = buf.getChannelData(1), m = new Float32Array(a.length); for (let i = 0; i < a.length; i++) m[i] = (a[i] + b[i]) / 2; return m; };
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // In-place radix-2 FFT. re/im are Float32Arrays of the same power-of-two length.
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  function spectrum(data, start, N, win) {
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 0; i < N; i++) re[i] = (data[start + i] || 0) * win[i];
    fft(re, im);
    const mag = new Float32Array(N / 2); for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
    return mag;
  }
  const hann = (N) => Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));

  /* ---------- Track X-ray: tempo + beat grid, key + Camelot, LUFS, true peak, dynamics, stereo, bands ---------- */
  (() => {
    const root = exp("xray"); if (!root) return;
    const [waveCv, cv] = root.querySelectorAll("canvas"), g = cv.getContext("2d"), wg = waveCv.getContext("2d"), W = cv.width, H = cv.height;
    const NOTES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
    const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];   // Krumhansl–Kessler key profiles
    const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1], CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
    const BANDS = [["Sub", 20, 60], ["Bass", 60, 250], ["Low mids", 250, 500], ["Mids", 500, 2000], ["Presence", 2000, 6000], ["Air", 6000, 20000]];
    const VIEWS = ["Spectrogram", "Notes over time", "Loudness over time"];
    const corr = (a, b) => { const ma = a.reduce((x, y) => x + y) / 12, mb = b.reduce((x, y) => x + y) / 12; let n = 0, da = 0, db = 0; for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db); };
    const db = (x) => 20 * Math.log10(x || 1e-9);
    let buf = null, peaks = null, bpm = 0, phase = 0, view = 0, views = [], src = null, startedAt = 0, offset = 0, raf;

    // Onset strength: how much louder each 512-sample slice is than the one before.
    function onsets(d, sr) {
      const hop = 512, env = []; let prev = 0;
      for (let i = 0; i + hop < d.length && env.length < 8000; i += hop) {
        let e = 0; for (let j = 0; j < hop; j++) e += d[i + j] * d[i + j];
        e = Math.sqrt(e); env.push(Math.max(0, e - prev)); prev = e;
      }
      return [env, sr / hop];
    }
    // For each candidate tempo, lay a beat grid over the onsets at its best offset and take two scores:
    //   contrast: hits on the beat minus half the hits between beats (stops 70 beating 140)
    //   grid:     hits on beats and half-beats together (stops dotted "fake" tempos like 123 for 92)
    // Normalised and added, with a gentle preference for common tempos. Tuned on house, hip-hop and
    // half-time test patterns at 75–140 BPM, where it scored 10 out of 10.
    function tempo(d, sr) {
      const [env, fps] = onsets(d, sr);
      const at = (x) => { const i = Math.floor(x), f = x - i; return (env[i] || 0) * (1 - f) + (env[i + 1] || 0) * f; };
      const rows = [];
      for (let bpm = 60; bpm <= 180; bpm++) {
        const P = (60 / bpm) * fps; let c = -Infinity, gr = 0;
        for (let ph = 0; ph < P; ph++) {
          let on = 0, off = 0, n = 0;
          for (let x = ph; x + P / 2 < env.length - 1; x += P) { on += at(x); off += at(x + P / 2); n++; }
          c = Math.max(c, (on - 0.5 * off) / n); gr = Math.max(gr, (on + off) / n);
        }
        rows.push([bpm, c, gr]);
      }
      const mc = Math.max(...rows.map((r) => r[1])) || 1, mg = Math.max(...rows.map((r) => r[2])) || 1;
      let best = -Infinity, bpmBest = 0;
      for (const [bpm, c, gr] of rows) {
        const s = (c / mc + gr / mg) * (1 + 0.25 * Math.exp(-((bpm - 115) ** 2) / 3000));
        if (s > best) { best = s; bpmBest = bpm; }
      }
      return bpmBest;
    }
    // Where the first beat lands, so the grid lines up with the music.
    function beatPhase(d, sr, bpm) {
      const [env, fps] = onsets(d, sr), P = (60 / bpm) * fps; let best = 0, at = 0;
      for (let ph = 0; ph < P; ph++) { let s = 0; for (let x = ph; x < env.length; x += P) s += env[Math.round(x)] || 0; if (s > best) { best = s; at = ph; } }
      return at / fps;
    }
    // Key from an averaged chromagram, plus a per-slice chromagram for the "Notes over time" view.
    function keyAndChroma(d, sr) {
      const N = 8192, win = hann(N), total = new Array(12).fill(0), step = Math.max(Math.floor(sr * 0.25), Math.floor((d.length - N) / 300)), cols = [];
      for (let s = 0; s + N < d.length; s += step) {
        const mag = spectrum(d, s, N, win), c = new Array(12).fill(0);
        for (let k = 1; k < N / 2; k++) { const f = (k * sr) / N; if (f < 60 || f > 2000) continue; const pc = ((Math.round(12 * Math.log2(f / 440)) % 12) + 12 + 9) % 12; c[pc] += mag[k]; }
        c.forEach((v, i) => (total[i] += v)); cols.push(c);
      }
      const scores = [];
      for (let t = 0; t < 12; t++) for (const [prof, minor] of [[MAJOR, false], [MINOR, true]]) scores.push({ t, minor, r: corr(total.map((_, i) => total[(i + t) % 12]), prof) });
      scores.sort((a, b) => b.r - a.r);
      const k = scores[0], gap = k.r - scores[1].r;
      return { name: `${NOTES[k.t]} ${k.minor ? "minor" : "major"}`, camelot: k.minor ? CAMELOT_MINOR[k.t] + "A" : CAMELOT_MAJOR[k.t] + "B", conf: gap > 0.08 ? "high" : gap > 0.03 ? "medium" : "low", cols };
    }
    // Integrated loudness (ITU-R BS.1770): K-weighting filters, 400 ms blocks, absolute and relative gates.
    async function lufs(b) {
      const oc = new OfflineAudioContext(b.numberOfChannels, b.length, b.sampleRate), s = oc.createBufferSource();
      const shelf = oc.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 1681; shelf.gain.value = 4;
      const hp = oc.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
      s.buffer = b; s.connect(shelf).connect(hp).connect(oc.destination); s.start();
      const k = await oc.startRendering(), sr = k.sampleRate, block = Math.floor(sr * 0.4), hop = Math.floor(block / 4), chans = [...Array(k.numberOfChannels)].map((_, c) => k.getChannelData(c)), z = [];
      for (let i = 0; i + block <= k.length; i += hop) { let sum = 0; for (const ch of chans) { let e = 0; for (let j = i; j < i + block; j++) e += ch[j] * ch[j]; sum += e / block; } z.push(sum); }
      const L = (x) => -0.691 + 10 * Math.log10(x || 1e-12);
      const abs = z.filter((x) => L(x) > -70); if (!abs.length) return -70;
      const rel = L(abs.reduce((a, b) => a + b) / abs.length) - 10, gated = abs.filter((x) => L(x) > rel);
      return L(gated.reduce((a, b) => a + b) / gated.length);
    }
    // True peak: check between samples too (4× oversampling with cubic interpolation) near the loud parts.
    function truePeak(b) {
      let tp = 0;
      for (let c = 0; c < b.numberOfChannels; c++) {
        const d = b.getChannelData(c); let sp = 0; for (let i = 0; i < d.length; i++) sp = Math.max(sp, Math.abs(d[i]));
        for (let i = 1; i < d.length - 2; i++) {
          if (Math.abs(d[i]) < sp * 0.7) continue;
          const y0 = d[i - 1], y1 = d[i], y2 = d[i + 1], y3 = d[i + 2];
          for (const t of [0, 0.25, 0.5, 0.75]) { const v = y1 + 0.5 * t * (y2 - y0 + t * (2 * y0 - 5 * y1 + 4 * y2 - y3 + t * (3 * (y1 - y2) + y3 - y0))); tp = Math.max(tp, Math.abs(v)); }
        }
      }
      return tp;
    }
    function stereo(b) {
      if (b.numberOfChannels < 2) return { label: "Mono", corr: 1 };
      const L = b.getChannelData(0), R = b.getChannelData(1); let lr = 0, ll = 0, rr = 0, mid = 0, side = 0;
      for (let i = 0; i < L.length; i += 4) { lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i]; const m = (L[i] + R[i]) / 2, s2 = (L[i] - R[i]) / 2; mid += m * m; side += s2 * s2; }
      const c = lr / Math.sqrt(ll * rr || 1), width = Math.sqrt(side / (mid || 1));
      return { corr: c, label: c > 0.97 ? "Near mono" : width < 0.25 ? "Narrow" : width < 0.5 ? "Balanced" : "Wide", width };
    }
    function spectralViews(d, sr) {
      const N = 1024, win = hann(N), cols = W, hop = Math.max(1, Math.floor((d.length - N) / cols));
      const spec = g.createImageData(W, H), bands = BANDS.map(() => 0), loud = [];
      const stops = [[11, 10, 16], [44, 41, 196], [110, 107, 255], [255, 178, 36], [255, 244, 214]];
      const color = (v) => { v = Math.min(0.999, Math.max(0, v)) * (stops.length - 1); const i = v | 0, k = v - i, a = stops[i], c = stops[i + 1]; return [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k, a[2] + (c[2] - a[2]) * k]; };
      const fmin = 30, fmax = Math.min(16000, sr / 2);
      for (let x = 0; x < cols; x++) {
        const mag = spectrum(d, x * hop, N, win); let e = 0;
        for (let k = 1; k < N / 2; k++) { const f = (k * sr) / N, p = mag[k] * mag[k]; e += p; BANDS.forEach(([, lo, hi], i) => { if (f >= lo && f < hi) bands[i] += p; }); }
        loud.push(e);
        for (let y = 0; y < H; y++) {
          const f = fmin * Math.pow(fmax / fmin, 1 - y / H), k = Math.min(N / 2 - 1, Math.round((f * N) / sr));
          const [r, gg, bl] = color((db(mag[k]) + 20) / 70), o = (y * W + x) * 4;
          spec.data[o] = r; spec.data[o + 1] = gg; spec.data[o + 2] = bl; spec.data[o + 3] = 255;
        }
      }
      return { spec, bands, loud };
    }
    function drawView() {
      const v = views[view]; if (!v) return;
      const [a1, a2, a3] = [["Low", "Spectrogram: time left to right, pitch bottom to top", "High"], ["Notes", "Which notes are sounding, over time", "C → B"], ["Quiet", "Loudness over time", "Loud"]][view];
      act(root, "ax1").textContent = a1; act(root, "ax2").textContent = a2; act(root, "ax3").textContent = a3;
      if (view === 0) return g.putImageData(v, 0, 0);
      g.fillStyle = "#0B0A10"; g.fillRect(0, 0, W, H);
      if (view === 1) {
        const cols = v, cw = W / cols.length, rh = H / 12;
        cols.forEach((c, x) => { const mx = Math.max(...c) || 1; c.forEach((val, pc) => { const k = val / mx; g.fillStyle = `rgba(255,178,36,${k * k})`; g.fillRect(x * cw, H - (pc + 1) * rh, cw + 0.5, rh - 1); }); });
        g.fillStyle = "rgba(237,235,230,.5)"; g.font = '600 11px "JetBrains Mono", monospace'; NOTES.forEach((n, pc) => g.fillText(n, 6, H - pc * rh - rh / 2 + 4));
      } else {
        const mx = Math.max(...v) || 1; g.beginPath(); g.moveTo(0, H);
        v.forEach((e, x) => g.lineTo(x, H - (Math.max(0, db(Math.sqrt(e / mx)) + 40) / 40) * H * 0.92));
        g.lineTo(W, H); g.closePath(); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#FFB224"); gr.addColorStop(1, "#2C29C4"); g.fillStyle = gr; g.fill();
      }
    }
    function drawWave(pos = null) {
      const Wv = waveCv.width, Hv = waveCv.height; wg.fillStyle = "#0B0A10"; wg.fillRect(0, 0, Wv, Hv);
      if (!peaks) return;
      if (bpm) { wg.fillStyle = "rgba(237,235,230,.12)"; for (let t = phase, n = 0; t < buf.duration; t += 60 / bpm, n++) { const x = (t / buf.duration) * Wv; wg.fillRect(x, 0, n % 4 ? 1 : 2, n % 4 ? Hv * 0.2 : Hv); } }
      peaks.forEach((v, x) => { const played = pos != null && x / Wv < pos / buf.duration; wg.fillStyle = played ? "#FFB224" : "#6E6BFF"; const h = v * Hv * 0.45; wg.fillRect(x, Hv / 2 - h, 1, h * 2); });
      if (pos != null) { wg.fillStyle = "#fff"; wg.fillRect((pos / buf.duration) * Wv, 0, 2, Hv); }
    }
    const now = () => (src ? offset + (audio().currentTime - startedAt) : offset);
    function stop() { if (src) { offset = now(); src.onended = null; src.stop(); src = null; } cancelAnimationFrame(raf); act(root, "play").textContent = "▶ Play"; }
    function play(from = offset) {
      stop(); const a = audio(); src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination);
      offset = Math.max(0, Math.min(from, buf.duration - 0.05)); startedAt = a.currentTime; src.start(0, offset);
      src.onended = () => { src = null; offset = 0; act(root, "play").textContent = "▶ Play"; drawWave(); };
      act(root, "play").textContent = "❚❚ Pause";
      const tick = () => { if (!src) return; drawWave(now()); raf = requestAnimationFrame(tick); }; tick();
    }
    act(root, "play").addEventListener("click", () => buf && (src ? stop() : play()));
    waveCv.addEventListener("click", (e) => { if (!buf) return; const r = waveCv.getBoundingClientRect(); offset = ((e.clientX - r.left) / r.width) * buf.duration; play(offset); });
    act(root, "view").addEventListener("click", () => { view = (view + 1) % VIEWS.length; act(root, "view").textContent = "View: " + VIEWS[view]; drawView(); });

    async function analyse(b, name) {
      stop(); buf = b; offset = 0;
      act(root, "name").textContent = `Analysing ${name}…`;
      await new Promise((r) => setTimeout(r, 30));
      const d = mono(b), sr = b.sampleRate;
      peaks = (() => { const n = waveCv.width, step = Math.floor(d.length / n), out = []; for (let i = 0; i < n; i++) { let m = 0; for (let j = 0; j < step; j += 2) m = Math.max(m, Math.abs(d[i * step + j] || 0)); out.push(m); } const mx = Math.max(...out) || 1; return out.map((v) => v / mx); })();
      bpm = tempo(d, sr); phase = beatPhase(d, sr, bpm);
      act(root, "bpm").innerHTML = `${bpm} BPM${bpm <= 95 ? `<small>or ${bpm * 2}</small>` : bpm >= 150 ? `<small>or ${Math.round(bpm / 2)}</small>` : ""}`;
      const k = keyAndChroma(d, sr);
      act(root, "key").innerHTML = `${k.name}<small>Camelot ${k.camelot} · ${k.conf} confidence</small>`;
      const tp = truePeak(b), L = await lufs(b), st = stereo(b);
      act(root, "lufs").innerHTML = `${L.toFixed(1)} LUFS<small>${L > -9 ? "very loud, club master" : L > -12 ? "loud, typical modern master" : L > -16 ? "streaming level (around −14)" : "quiet, lots of headroom"}</small>`;
      act(root, "peak").innerHTML = `${db(tp).toFixed(1)} dBTP<small>${db(tp) > -0.1 ? "clipping risk" : db(tp) > -1 ? "hot, under −1 is safer" : "safe for streaming"}</small>`;
      const plr = db(tp) - L;
      act(root, "dr").innerHTML = `${plr.toFixed(1)} dB PLR<small>${plr < 8 ? "squashed" : plr < 12 ? "punchy" : "very dynamic"}</small>`;
      act(root, "width").innerHTML = `${st.label}<small>correlation ${st.corr.toFixed(2)}${st.corr < 0 ? " · phase issues!" : ""}</small>`;
      const sv = spectralViews(d, sr);
      views = [sv.spec, k.cols, sv.loud]; drawView(); drawWave();
      const tot = sv.bands.reduce((a, c) => a + c, 0) || 1;
      act(root, "bands").innerHTML = BANDS.map(([n, lo, hi], i) => { const pct = (sv.bands[i] / tot) * 100; return `<div><span>${n}<small>${lo}–${hi >= 1000 ? hi / 1000 + "k" : hi} Hz</small></span><i style="--w:${Math.max(1, pct).toFixed(1)}%"></i><b>${pct.toFixed(0)}%</b></div>`; }).join("");
      let clips = 0, lead = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) >= 0.999) clips++;
      while (lead < d.length && Math.abs(d[lead]) < 0.001) lead++;
      const [env] = onsets(d, sr), mean = env.reduce((a, c) => a + c, 0) / env.length, hits = env.filter((e, i) => e > mean * 3 && e >= (env[i - 1] || 0) && e >= (env[i + 1] || 0)).length;
      act(root, "facts").textContent = `${fmtTime(b.duration)} · ${(sr / 1000).toFixed(1)} kHz · ${b.numberOfChannels === 1 ? "mono" : "stereo"} · ${clips} clipped samples · ${Math.round((lead / sr) * 1000)} ms of silence at the start · ${(hits / b.duration).toFixed(1)} hits per second`;
      act(root, "name").textContent = name;
    }
    g.fillStyle = "#0B0A10"; g.fillRect(0, 0, W, H); drawWave();
    act(root, "file").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { await analyse(await decode(f), f.name); } catch { act(root, "name").textContent = "Couldn't read that file. Try an MP3, WAV or M4A."; }
    });
    onView(root, () => builtInLoop().then((b) => analyse(b, "Built-in loop (made at 92 BPM in A minor)")));
  })();

  /* ---------- Waveform poster: 14 styles, themes, formats, type, favourite moment ---------- */
  (() => {
    const root = exp("wavepost"); if (!root) return;
    const cv = $("canvas", root), g = cv.getContext("2d");
    const THEMES = {
      Midnight: ["#0B0A10", "#EDEBE6", "#FFB224"], Paper: ["#F1EDE4", "#16151A", "#3D3AE8"], Marigold: ["#FFB224", "#16151A", "#3D3AE8"],
      Indigo: ["#2C29C4", "#F1EDE4", "#FFB224"], Rose: ["#F17FA6", "#16151A", "#FFFFFF"], Forest: ["#0F2A1C", "#E9F7F1", "#2FBF9B"],
      Coral: ["#F2735F", "#16151A", "#F1EDE4"], Mono: ["#FFFFFF", "#000000", "#000000"],
    };
    const FONTS = { display: '"Bricolage Grotesque", sans-serif', mono: '"JetBrains Mono", monospace', serif: 'Georgia, "Times New Roman", serif', hand: "Caveat, cursive" };
    let data = null, dur = 0, current = null;
    // Downsample a track into n loudness values between 0 and 1.
    const sampleTrack = (b, n) => { const d = mono(b), step = Math.max(1, Math.floor(d.length / n)), out = []; for (let i = 0; i < n; i++) { let m = 0; for (let j = 0; j < step; j += 3) m = Math.max(m, Math.abs(d[i * step + j] || 0)); out.push(m); } const mx = Math.max(...out) || 1; return out.map((v) => v / mx); };
    const smooth = (a, k = 2) => a.map((_, i) => { let s2 = 0, n = 0; for (let j = -k; j <= k; j++) if (a[i + j] != null) { s2 += a[i + j]; n++; } return s2 / n; });
    const STYLES = {
      Ring(c, v, box, col, hl) { const cx = box.x + box.w / 2, cy = box.y + box.h / 2, r0 = Math.min(box.w, box.h) * 0.22, rr = Math.min(box.w, box.h) * 0.26; v.forEach((a, i) => { const t = (i / v.length) * Math.PI * 2 - Math.PI / 2; c.strokeStyle = hl(i) ? col.ac : col.fg; c.lineWidth = Math.max(1.5, (Math.PI * 2 * r0) / v.length * 0.6); c.beginPath(); c.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0); c.lineTo(cx + Math.cos(t) * (r0 + a * rr), cy + Math.sin(t) * (r0 + a * rr)); c.stroke(); }); },
      Line(c, v, box, col, hl) { const bw = box.w / v.length, mid = box.y + box.h / 2; v.forEach((a, i) => { c.fillStyle = hl(i) ? col.ac : col.fg; const h = Math.max(1, a * box.h * 0.45); c.fillRect(box.x + i * bw, mid - h, Math.max(1, bw * 0.7), h * 2); }); },
      Bars(c, v, box, col, hl) { const bw = box.w / v.length; v.forEach((a, i) => { c.fillStyle = hl(i) ? col.ac : col.fg; const h = Math.max(2, a * box.h); c.fillRect(box.x + i * bw, box.y + box.h - h, Math.max(1, bw * 0.6), h); }); },
      Mountain(c, v, box, col) { const sv = smooth(v, 3); c.beginPath(); c.moveTo(box.x, box.y + box.h); sv.forEach((a, i) => c.lineTo(box.x + (i / (sv.length - 1)) * box.w, box.y + box.h - a * box.h)); c.lineTo(box.x + box.w, box.y + box.h); c.closePath(); const gr = c.createLinearGradient(0, box.y, 0, box.y + box.h); gr.addColorStop(0, col.ac); gr.addColorStop(1, col.fg); c.fillStyle = gr; c.fill(); },
      Ridgeline(c, v, box, col) {   // stacked lines, the famous "pulsar" record-sleeve look
        const rows = 40, per = Math.floor(v.length / rows), rh = box.h / (rows + 4);
        for (let r = 0; r < rows; r++) { const seg = smooth(v.slice(r * per, (r + 1) * per), 1), y0 = box.y + (r + 4) * rh; c.beginPath(); c.moveTo(box.x, y0); seg.forEach((a, i) => { const x = box.x + (i / (seg.length - 1)) * box.w, bump = Math.sin((i / (seg.length - 1)) * Math.PI); c.lineTo(x, y0 - a * rh * 4 * bump); }); c.lineTo(box.x + box.w, y0); c.fillStyle = col.bg; c.fill(); c.strokeStyle = col.fg; c.lineWidth = 2; c.stroke(); }
      },
      Spiral(c, v, box, col, hl) { const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h) * 0.46; v.forEach((a, i) => { const t = i / v.length, ang = t * Math.PI * 2 * 5, r = R * (0.12 + t * 0.85); c.fillStyle = hl(i) ? col.ac : col.fg; c.beginPath(); c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1 + a * 9, 0, 7); c.fill(); }); },
      Burst(c, v, box, col, hl) { const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h) * 0.5; v.forEach((a, i) => { const t = (i / v.length) * Math.PI * 2; c.strokeStyle = hl(i) ? col.ac : col.fg; c.globalAlpha = 0.35 + a * 0.65; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t) * R * (0.2 + a * 0.8), cy + Math.sin(t) * R * (0.2 + a * 0.8)); c.stroke(); }); c.globalAlpha = 1; },
      Dots(c, v, box, col, hl) { const n = v.length, cols = Math.ceil(Math.sqrt(n * (box.w / box.h))), rows = Math.ceil(n / cols), cw = box.w / cols, ch = box.h / rows; v.forEach((a, i) => { c.fillStyle = hl(i) ? col.ac : col.fg; c.beginPath(); c.arc(box.x + (i % cols + 0.5) * cw, box.y + (((i / cols) | 0) + 0.5) * ch, Math.max(0.8, a * Math.min(cw, ch) * 0.48), 0, 7); c.fill(); }); },
      Skyline(c, v, box, col, hl) { const n = Math.min(v.length, 70), bw = box.w / n, sv = v.filter((_, i) => i % Math.ceil(v.length / n) === 0); sv.forEach((a, i) => { const h = 20 + a * box.h * 0.9, x = box.x + i * bw; c.fillStyle = hl(i * Math.ceil(v.length / n)) ? col.ac : col.fg; c.fillRect(x, box.y + box.h - h, bw - 3, h); c.fillStyle = col.bg; for (let y = box.y + box.h - h + 8; y < box.y + box.h - 10; y += 14) for (let wx = x + 4; wx < x + bw - 8; wx += 8) if (((wx * 31 + y * 7) | 0) % 3) c.fillRect(wx, y, 3, 5); }); },
      Equalizer(c, v, box, col, hl) { const n = 48, bw = box.w / n, seg = 18, sh = box.h / seg; for (let i = 0; i < n; i++) { const a = v[Math.floor((i / n) * v.length)], lit = Math.round(a * seg); for (let k = 0; k < seg; k++) { c.fillStyle = k < lit ? (k > seg * 0.8 ? col.ac : col.fg) : "rgba(128,128,128,.12)"; if (hl(Math.floor((i / n) * v.length)) && k < lit) c.fillStyle = col.ac; c.fillRect(box.x + i * bw + 1, box.y + box.h - (k + 1) * sh + 2, bw - 3, sh - 3); } } },
      Circle(c, v, box, col) { const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h) * 0.32, sv = smooth(v, 2); c.beginPath(); sv.forEach((a, i) => { const t = (i / sv.length) * Math.PI * 2, r = R + (a - 0.5) * R * 0.6; i ? c.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r) : c.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }); c.closePath(); c.fillStyle = col.ac; c.fill(); c.strokeStyle = col.fg; c.lineWidth = 3; c.stroke(); },
      Barcode(c, v, box, col, hl) { let x = box.x; v.forEach((a, i) => { const w = 1 + a * 6; if (x + w > box.x + box.w) return; c.fillStyle = hl(i) ? col.ac : col.fg; c.fillRect(x, box.y, w, box.h * 0.85); x += w + 1.5; }); },
      Thread(c, v, box, col) { const sv = smooth(v, 2), mid = box.y + box.h / 2; for (let k = 0; k < 12; k++) { c.beginPath(); sv.forEach((a, i) => { const x = box.x + (i / (sv.length - 1)) * box.w, y = mid + Math.sin(i * 0.05 + k * 0.5) * a * box.h * 0.45; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = k % 3 ? col.fg : col.ac; c.globalAlpha = 0.3 + (k / 12) * 0.6; c.lineWidth = 1.5; c.stroke(); } c.globalAlpha = 1; },
      Vinyl(c, v, box, col, hl) { const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h) * 0.48; c.fillStyle = "#0A0A0A"; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); const rings = 30, per = Math.floor(v.length / rings); for (let r = 0; r < rings; r++) { const rad = R * (0.38 + (r / rings) * 0.6); for (let i = 0; i < per; i++) { const a = v[r * per + i], t = (i / per) * Math.PI * 2; c.fillStyle = hl(r * per + i) ? col.ac : `rgba(255,255,255,${0.08 + a * 0.6})`; c.fillRect(cx + Math.cos(t) * rad, cy + Math.sin(t) * rad, 2, 2); } } c.fillStyle = col.ac; c.beginPath(); c.arc(cx, cy, R * 0.3, 0, 7); c.fill(); c.fillStyle = "#0A0A0A"; c.beginPath(); c.arc(cx, cy, 6, 0, 7); c.fill(); },
    };
    Object.keys(STYLES).forEach((n) => act(root, "style").add(new Option(n, n)));
    Object.keys(THEMES).forEach((n) => act(root, "theme").add(new Option(n, n)));
    function paint(c, W, H) {
      const [bg, fg, ac] = THEMES[act(root, "theme").value], col = { bg, fg, ac }, u = Math.min(W, H) / 1080, F = FONTS[act(root, "font").value];
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      const story = H / W > 1.6, box = { x: 80 * u, y: (story ? 220 : 110) * u, w: W - 160 * u, h: H * (story ? 0.5 : 0.56) };
      const m = +act(root, "moment").value / 100, hl = m ? (i) => Math.abs(i / (data?.length || 1) - m) < 0.035 : () => false;
      if (data) STYLES[act(root, "style").value](c, data, box, col, hl);
      else { c.fillStyle = fg; c.globalAlpha = 0.4; c.font = `600 ${28 * u}px "JetBrains Mono", monospace`; c.textAlign = "center"; c.fillText("Load a track to print its shape", W / 2, box.y + box.h / 2); c.textAlign = "left"; c.globalAlpha = 1; }
      const title = act(root, "title").value || "Untitled", artist = act(root, "artist").value, line = act(root, "line").value;
      const baseY = H - (story ? 380 : 230) * u;
      c.fillStyle = fg; c.textAlign = "left";
      const isHand = F.includes("Caveat"), t = isHand ? title : title.toUpperCase();
      fitText(c, t, W - 160 * u, (isHand ? 150 : 110) * u, isHand ? 600 : 800, F); c.fillText(t, 80 * u, baseY);
      c.font = `600 ${30 * u}px ${F.includes("Caveat") ? F : '"JetBrains Mono", monospace'}`; if (artist) c.fillText(isHand ? artist : artist.toUpperCase(), 80 * u, baseY + 56 * u);
      if (line) { c.globalAlpha = 0.75; c.font = `italic 400 ${28 * u}px ${F.includes("Georgia") ? F : 'Georgia, serif'}`; c.fillText(line, 80 * u, baseY + 108 * u); c.globalAlpha = 1; }
      if (act(root, "details").checked) {
        c.globalAlpha = 0.6; c.font = `600 ${20 * u}px "JetBrains Mono", monospace`;
        const when = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
        c.fillText(data ? fmtTime(dur) : "", 80 * u, H - 70 * u); c.textAlign = "right"; c.fillText(when, W - 80 * u, H - 70 * u); c.textAlign = "left"; c.globalAlpha = 1;
      }
      if (m && data) { c.fillStyle = ac; c.font = `700 ${20 * u}px "JetBrains Mono", monospace`; c.textAlign = "right"; c.fillText("♥ " + fmtTime(m * dur), W - 80 * u, box.y - 20 * u); c.textAlign = "left"; }
    }
    function render() {
      const [w, h] = act(root, "format").value.split("x").map(Number);
      cv.width = w; cv.height = h; cv.style.aspectRatio = `${w} / ${h}`;
      if (current) { data = sampleTrack(current, +act(root, "detail").value); dur = current.duration; }
      paint(g, w, h);
    }
    act(root, "file").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; try { current = await decode(f); act(root, "title").value = f.name.replace(/\.[^.]+$/, "").slice(0, 32); render(); } catch {} });
    root.querySelectorAll("select, input:not([type=file])").forEach((el) => el.addEventListener("input", render));
    act(root, "save").addEventListener("click", () => { const [w, h] = act(root, "format").value.split("x").map(Number), big = document.createElement("canvas"); big.width = w * 2; big.height = h * 2; paint(big.getContext("2d"), w * 2, h * 2); download(big, "waveform-poster.png"); });
    act(root, "theme").value = "Midnight";
    document.fonts.ready.then(render);
    onView(root, () => builtInLoop().then((b) => { if (!current) { current = b; act(root, "title").value = "Built-in loop"; render(); } }));
  })();

  /* ---------- Palette from photo (k-means) ---------- */
  (() => {
    const root = exp("palette"); if (!root) return;
    const cv = $("canvas", root), g = cv.getContext("2d", { willReadFrequently: true }), chips = act(root, "chips"), pairs = act(root, "pairs");
    let colors = [];
    const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
    const L = (c) => { const [r, gg, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * gg + 0.0722 * b; };
    const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    function extract(img) {
      const k = Math.min(1, 640 / img.width); cv.width = img.width * k; cv.height = img.height * k; g.drawImage(img, 0, 0, cv.width, cv.height);
      const s = document.createElement("canvas"); s.width = s.height = 90; const sg = s.getContext("2d"); sg.drawImage(img, 0, 0, 90, 90);
      const d = sg.getImageData(0, 0, 90, 90).data, px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      // Farthest-point seeding: each new starting colour is the pixel least like the ones already chosen,
      // so the six results are genuinely different instead of five shades of the background.
      const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      let cent = [px[(px.length / 2) | 0].slice()];
      while (cent.length < 6) { let far = px[0], fd = -1; for (const p of px) { const d = Math.min(...cent.map((c) => dist(p, c))); if (d > fd) { fd = d; far = p; } } cent.push(far.slice()); }
      for (let it = 0; it < 12; it++) {
        const sums = cent.map(() => [0, 0, 0, 0]);
        for (const p of px) { let bi = 0, bd = 1e9; cent.forEach((c, i) => { const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); const sm = sums[bi]; sm[0] += p[0]; sm[1] += p[1]; sm[2] += p[2]; sm[3]++; }
        cent = sums.map((sm, i) => (sm[3] ? [sm[0] / sm[3], sm[1] / sm[3], sm[2] / sm[3], sm[3]] : cent[i]));
      }
      colors = cent.sort((a, b) => (b[3] || 0) - (a[3] || 0)).map((c) => c.slice(0, 3));
      chips.innerHTML = "";
      colors.forEach((c) => { const b = document.createElement("button"); b.className = "pal__chip"; b.style.background = hex(c); b.style.color = L(c) > 0.35 ? INK : "#fff"; b.textContent = hex(c); b.addEventListener("click", () => copy(hex(c), b, hex(c))); chips.append(b); });
      pairs.innerHTML = "<h3>Readable pairs</h3>";
      const good = [];
      colors.forEach((a, i) => colors.forEach((b, j) => { if (i < j) { const r = ratio(a, b); if (r >= 4.5) good.push([a, b, r]); } }));
      if (!good.length) pairs.innerHTML += "<p class='xnote'>No pair here is readable as body text. Use these for shapes, not words.</p>";
      good.sort((x, y) => y[2] - x[2]).slice(0, 6).forEach(([a, b, r]) => { const el = document.createElement("div"); el.className = "pal__pair"; el.style.background = hex(a); el.style.color = hex(b); el.innerHTML = `<b>Aa</b><span>${r.toFixed(1)}:1</span>`; pairs.append(el); });
    }
    act(root, "file").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; act(root, "note").textContent = f.name; extract(await loadImage(f)); });
    act(root, "css").addEventListener("click", (e) => copy(":root {\n" + colors.map((c, i) => `  --color-${i + 1}: ${hex(c)};`).join("\n") + "\n}", e.target));
    onView(root, () => loadImage("/website/assets/img/og.png").then(extract).catch(() => {}));
  })();






})();
