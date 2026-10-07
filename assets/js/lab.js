/* Side quests: the chop shop (a Serato Sample-style chopper) and the cut-up machine. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const exp = (id) => document.querySelector(`[data-x="${id}"]`);
  const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  const BG = "#0B0A10";
  // Run frame() every animation frame, but only while el is on screen.
  function whileVisible(el, frame) {
    let raf, on = false;
    const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
    }).observe(el);
  }
  const posIn = (cv, e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height }; };
  /* ---------- Chop shop: a Serato Sample-style chopper ---------- */
  (() => {
    const root = exp("chop"); if (!root) return;
    const cv = $(".chop__wave", root), g = cv.getContext("2d"), padsEl = $(".chop__pads", root), info = act(root, "info");
    const pitchIn = act(root, "pitch"), pitchOut = $(".xrange output", root), revBtn = act(root, "rev");
    const KEYS = ["1", "2", "3", "4", "q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];
    const COLORS = ["#3D3AE8", "#FFB224", "#F17FA6", "#2FBF9B"];
    let ctx, buf, revBuf, cues = [], sel = 0, reverse = false, peaks = null, playing = [];
    const audio = () => { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state !== "running") ctx.resume(); return ctx; };
    // Phones only allow sound after a real tap (touchend/click), so unlock the audio there too.
    const unlock = () => { const a = audio(), s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(); };
    ["touchend", "click", "keydown"].forEach((ev) => root.addEventListener(ev, unlock, { passive: true }));

    // A built-in four-bar loop rendered offline: chords, a bassline and drums, so the pads work instantly.
    async function makeLoop() {
      const sr = 44100, bpm = 92, beat = 60 / bpm, len = beat * 16;
      const oc = new OfflineAudioContext(2, Math.ceil(sr * len), sr);
      const out = oc.createGain(); out.gain.value = 0.8; out.connect(oc.destination);
      const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const note = (m, t, d, type, v, cutoff = 2200) => {
        const o = oc.createOscillator(), gg = oc.createGain(), f = oc.createBiquadFilter();
        o.type = type; o.frequency.value = mtof(m); f.type = "lowpass"; f.frequency.value = cutoff;
        gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(v, t + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(f).connect(gg).connect(out); o.start(t); o.stop(t + d + 0.05);
      };
      const noise = oc.createBuffer(1, sr, sr), nd = noise.getChannelData(0); for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
      const hitNoise = (t, freq, v, d) => { const s = oc.createBufferSource(), f = oc.createBiquadFilter(), gg = oc.createGain(); s.buffer = noise; f.type = "highpass"; f.frequency.value = freq; gg.gain.setValueAtTime(v, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f).connect(gg).connect(out); s.start(t); s.stop(t + d); };
      const kick = (t) => { const o = oc.createOscillator(), gg = oc.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); gg.gain.setValueAtTime(0.75, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(gg).connect(out); o.start(t); o.stop(t + 0.45); };
      // Soul-style electric piano chords that sustain through every slice, so each pad has something musical on it.
      const ep = (m, t, d, v) => { [[1, "sine", v], [2, "sine", v * 0.25], [3.01, "triangle", v * 0.08]].forEach(([mul, type, vv]) => { const o = oc.createOscillator(), gg = oc.createGain(); o.type = type; o.frequency.value = mtof(m) * mul; gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(vv, t + 0.01); gg.gain.exponentialRampToValueAtTime(vv * 0.35, t + 0.4); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gg).connect(out); o.start(t); o.stop(t + d + 0.05); }); };
      const chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [55, 59, 62, 65, 69], [52, 55, 59, 62, 64]];
      const bass = [45, 41, 43, 40];
      const melody = [[76, 0, 1], [74, 1, 0.5], [72, 1.5, 1.5], [69, 3, 1], [72, 4, 0.5], [74, 4.5, 0.5], [76, 5, 2], [79, 7, 1], [77, 8, 1.5], [76, 9.5, 0.5], [74, 10, 2], [72, 12, 1], [71, 13, 1], [72, 14, 0.5], [74, 14.5, 1.5]];
      chords.forEach((ch, bar) => {
        const t0 = bar * beat * 4;
        ch.forEach((m) => { ep(m, t0, beat * 2.2, 0.07); ep(m, t0 + beat * 2.5, beat * 1.5, 0.05); });
        note(bass[bar], t0, beat * 1.6, "triangle", 0.45, 900); note(bass[bar], t0 + beat * 2.5, beat * 1.2, "triangle", 0.38, 900); note(bass[bar] + 12, t0 + beat * 3.5, beat * 0.45, "triangle", 0.25, 900);
        [0, 1.75, 2.5].forEach((b) => kick(t0 + b * beat));
        [1, 3].forEach((b) => hitNoise(t0 + b * beat, 1500, 0.45, 0.2));
        for (let h = 0; h < 8; h++) hitNoise(t0 + h * beat * 0.5, 8000, h % 2 ? 0.07 : 0.13, 0.05);
      });
      melody.forEach(([m, b, d]) => note(m, b * beat, d * beat * 0.95, "triangle", 0.16, 3500));
      return oc.startRendering();
    }
    function reverseCopy(b) {
      const r = audio().createBuffer(b.numberOfChannels, b.length, b.sampleRate);
      for (let c = 0; c < b.numberOfChannels; c++) r.getChannelData(c).set(Float32Array.from(b.getChannelData(c)).reverse());
      return r;
    }
    function computePeaks() {
      const d = buf.getChannelData(0), n = cv.width, step = Math.floor(d.length / n);
      peaks = new Float32Array(n);
      for (let i = 0; i < n; i++) { let m = 0; for (let j = 0; j < step; j++) m = Math.max(m, Math.abs(d[i * step + j] || 0)); peaks[i] = m; }
    }
    // Onset detection: frames whose energy jumps the most become cue points.
    function autoChop() {
      const d = buf.getChannelData(0), win = 1024, energies = [];
      for (let i = 0; i + win < d.length; i += win) { let e = 0; for (let j = 0; j < win; j++) e += d[i + j] * d[i + j]; energies.push(e); }
      const flux = energies.map((e, i) => ({ i, f: i ? Math.max(0, e - energies[i - 1]) : e }));
      const minGap = Math.floor(buf.sampleRate * 0.12 / win), chosen = [];
      for (const c of flux.sort((a, b) => b.f - a.f)) { if (chosen.every((x) => Math.abs(x - c.i) > minGap)) chosen.push(c.i); if (chosen.length === 16) break; }
      cues = chosen.sort((a, b) => a - b).map((i) => (i * win) / buf.sampleRate);
      while (cues.length < 16) cues.push((cues.length / 16) * buf.duration);
      draw();
    }
    const evenChop = () => { cues = Array.from({ length: 16 }, (_, i) => (i / 16) * buf.duration); draw(); };
    // The waveform is drawn once into a cached layer; each frame only paints that image plus the moving playheads.
    const wave = document.createElement("canvas"); wave.width = cv.width; wave.height = cv.height;
    function bake() {
      const wg = wave.getContext("2d"), W = wave.width, H = wave.height, mid = H / 2;
      wg.fillStyle = BG; wg.fillRect(0, 0, W, H);
      if (!peaks) return;
      for (let k = -1; k < cues.length; k++) {
        const x0 = k < 0 ? 0 : Math.floor((cues[k] / buf.duration) * W), x1 = Math.floor(((cues[k + 1] ?? buf.duration) / buf.duration) * W);
        wg.fillStyle = k >= 0 ? COLORS[k % 4] : "#3A3846"; wg.globalAlpha = k === sel ? 1 : 0.55; wg.beginPath();
        for (let x = x0; x < x1; x++) { const h = peaks[x] * mid * 0.95; wg.rect(x, mid - h, 1, h * 2); }
        wg.fill();
      }
      wg.globalAlpha = 1; wg.font = '600 13px "JetBrains Mono", monospace';
      cues.forEach((c, i) => { const x = (c / buf.duration) * W; wg.fillStyle = i === sel ? "#EDEBE6" : "rgba(237,235,230,.5)"; wg.fillRect(x, 0, i === sel ? 2 : 1, H); wg.fillText(KEYS[i].toUpperCase(), x + 4, 16); });
    }
    let baked = -2, animating = false;
    function draw() { bake(); baked = sel; paint(); }
    function paint() {
      if (baked !== sel) { bake(); baked = sel; }
      g.drawImage(wave, 0, 0);
      const now = ctx ? ctx.currentTime : 0; g.fillStyle = "#fff";
      playing = playing.filter((p) => now < p.until);
      playing.forEach((p) => { if (now < p.t0) return; const pos = p.reverse ? p.end - (now - p.t0) * p.rate : p.start + (now - p.t0) * p.rate; g.fillRect((pos / buf.duration) * cv.width, 0, 2, cv.height); });
    }
    // One animation loop for all playing slices, running only while something plays.
    function animate() { if (animating) return; animating = true; const step = () => { paint(); if (playing.length) requestAnimationFrame(step); else { animating = false; paint(); } }; requestAnimationFrame(step); }
    function play(i, when = 0) {
      if (!buf) return;
      const a = audio();
      if (a.state !== "running") { a.resume().then(() => play(i, when)); return; }
      const src = a.createBufferSource(), gg = a.createGain();
      const start = cues[i], end = cues[i + 1] ?? buf.duration, at = Math.max(a.currentTime, when);
      src.buffer = reverse ? revBuf : buf;
      const rate = Math.pow(2, +pitchIn.value / 12); src.playbackRate.value = rate;
      gg.gain.value = 0.9; src.connect(gg).connect(a.destination);
      src.start(at, reverse ? buf.duration - end : start, end - start);
      const flash = () => { sel = i; padsEl.children[i].classList.add("hit"); setTimeout(() => padsEl.children[i]?.classList.remove("hit"), 140); };
      if (at - a.currentTime > 0.02) setTimeout(flash, (at - a.currentTime) * 1000); else flash();
      playing.push({ src, t0: at, start, end, rate, reverse, until: at + (end - start) / rate });
      animate();
    }

    /* Famous flips: the real sample and the real song, side by side (official YouTube videos, embedded),
       plus the chop pattern, which you can perform on your own copy of the sample. */
    const FLIPS = [
      { title: "Kanye West · Through the Wire (2003)", sample: "Chaka Khan · Through the Fire (1984)", s: "TjWmw-8-OEk", f: "AE8y25CcE6s",
        how: "Chipmunk soul. Kanye sped up Chaka Khan's chorus so it rises in pitch, then looped it under the drums.", listen: "the \"through the fire\" line in the original, then the same words pitched up and squeaky in the flip.", pitch: 4, bpm: 84,
        pattern: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 0], [20, 1], [24, 4], [28, 5]] },
      { title: "Kanye West · Stronger (2007)", sample: "Daft Punk · Harder, Better, Faster, Stronger (2001)", s: "gAjR4_CbPpQ", f: "PsO6ZnUZI0g",
        how: "Stutter chops. Tiny slices of the robot vocal are retriggered back to back, so a word becomes a rhythm.", listen: "the vocoder phrase \"work it, make it, do it\" chopped and stuttered under Kanye's verse.", pitch: 0, bpm: 104,
        pattern: [[0, 0], [1, 0], [2, 0], [4, 1], [6, 1], [8, 2], [9, 2], [10, 2], [12, 3], [14, 3], [16, 0], [17, 0], [18, 0], [20, 1], [24, 6], [26, 6], [28, 7]] },
      { title: "Kanye West · Touch the Sky (2005), prod. Just Blaze", sample: "Curtis Mayfield · Move On Up (1971)", s: "A9RMr9KuVZo", f: "YkwQbuAGLj4",
        how: "Slowed down. Just Blaze played the horn intro slower, so it drops in pitch and feels heavier and more triumphant.", listen: "the opening horn fanfare. Same notes, lower and slower in the flip.", pitch: -3, bpm: 98,
        pattern: [[0, 0], [6, 1], [8, 2], [14, 3], [16, 0], [22, 1], [24, 8], [28, 9]] },
      { title: "J Dilla · Workinonit (2006)", sample: "10cc · I'm Not in Love (1975)", s: "STugQ0X1NoI", f: "ogwouE_Msd4",
        how: "Hand-played chops, no quantise. Dilla cut a soft-rock ballad into hard, late, uneven slices, the famous drunk swing.", listen: "the dreamy choir pads of 10cc turned into a stabbing, off-grid loop.", pitch: 0, bpm: 88, swing: 0.32,
        pattern: [[0, 0], [3, 2], [6, 1], [8, 4], [11, 3], [14, 5], [16, 0], [19, 2], [22, 7], [24, 4], [27, 6], [30, 5]] },
      { group: "Punjabi & desi flips", title: "Panjabi MC · Mundian To Bach Ke (1998)", sample: "Knight Rider theme (1982)", s: "5BsFnk83NMI", f: "x9WO2ieJMYk",
        how: "A TV theme's bassline under a dhol-driven bhangra track. Years later a remix with Jay-Z took it worldwide.", listen: "the pulsing Knight Rider bassline, now carrying tumbi and dhol.", pitch: 0, bpm: 98,
        pattern: [[0, 0], [2, 1], [3, 1], [4, 2], [6, 3], [8, 0], [10, 1], [11, 1], [12, 4], [14, 5], [16, 0], [18, 1], [20, 2], [22, 3], [24, 6], [26, 7], [28, 6], [30, 7]] },
      { title: "Badshah · Kala Chashma (2016)", sample: "Amar Arshi · Kala Chashma (1990)", s: "iPBiVJJCwIQ", f: "k4yXQkG2s1E",
        how: "Recreated, not lifted: a Punjabi hit from 1990 re-sung and rebuilt for a Bollywood dance floor.", listen: "the same hook melody, moved from a folk arrangement to an EDM-bhangra drop.", pitch: 2, bpm: 104,
        pattern: [[0, 0], [1, 0], [2, 2], [4, 1], [5, 1], [6, 3], [8, 4], [10, 5], [12, 0], [13, 0], [14, 0], [15, 0], [16, 6], [18, 2], [20, 7], [22, 3], [24, 0], [28, 8]] },
      { title: "Truth Hurts · Addictive (2002), prod. DJ Quik", sample: "Lata Mangeshkar · Thoda Resham Lagta Hai (1981)", s: "o2SoSHKKCPA", f: "Xcj9O-Cv48c",
        how: "A Bollywood vocal looped whole over a West Coast beat. The sample wasn't cleared, and it ended in a famous lawsuit.", listen: "Lata's vocal phrase, untouched, running under the whole song.", pitch: 0, bpm: 92,
        pattern: [[0, 0], [8, 1], [16, 2], [24, 3]] },
      { title: "Black Eyed Peas · Don't Phunk with My Heart (2005)", sample: "Asha Bhosle · Yeh Mera Dil (1978)", s: "71RdmjLZ5Nk", f: "P4Bda6_usuc",
        how: "Two 70s Bollywood songs stitched into one: Yeh Mera Dil carries the hook, another Bollywood track the groove.", listen: "Asha Bhosle's \"yeh mera dil\" melody becoming \"no no no no, don't phunk with my heart\".", pitch: 0, bpm: 106,
        pattern: [[0, 0], [3, 1], [6, 2], [8, 0], [11, 1], [14, 3], [16, 4], [19, 5], [22, 6], [24, 0], [27, 1], [30, 7]] },
    ];
    const flipsEl = root.querySelector('[data-act="flips"]');
    let flipTimers = [], activeFlip = null;
    function stopFlip() { flipTimers.forEach(clearTimeout); flipTimers = []; if (ctx) playing.forEach((p) => { if (p.t0 > ctx.currentTime) { try { p.src.stop(); } catch {} p.until = 0; } }); activeFlip?.classList.remove("on"); if (activeFlip) activeFlip.querySelector(".flip__chop").textContent = "▶ Perform the chops"; activeFlip = null; }
    function playFlip(f, card) {
      stopFlip(); if (!buf) return;
      activeFlip = card; card.classList.add("on"); card.querySelector(".flip__chop").textContent = "■ Stop";
      pitchIn.value = f.pitch; pitchIn.dispatchEvent(new Event("input"));
      // Scheduled on the audio clock, so the pattern stays tight even if the page is busy.
      const a = audio(), step = 60 / f.bpm / 4, bars = 4, len = 32, t0 = a.currentTime + 0.1;
      for (let rep = 0; rep < bars; rep++) f.pattern.forEach(([t, pad]) => {
        const late = f.swing ? (t % 2 ? f.swing * step : Math.random() * f.swing * step * 0.4) : 0;
        play(pad % 16, t0 + (rep * len + t) * step + late);
      });
      flipTimers.push(setTimeout(stopFlip, (bars * len * step + 0.5) * 1000));
    }
    // One player per card. Switching between the sample and the flip swaps the embedded video.
    function watch(card, id, which) {
      const box = card.querySelector(".flip__player");
      card.querySelectorAll(".flip__ab").forEach((b) => b.classList.toggle("xbtn--main", b.dataset.which === which));
      box.hidden = false;
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="${which === "s" ? "The sample" : "The flip"}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
      document.querySelectorAll(".flip__player").forEach((p) => { if (p !== box) { p.innerHTML = ""; p.hidden = true; p.closest(".flip").querySelectorAll(".flip__ab").forEach((b) => b.classList.remove("xbtn--main")); } });
    }
    FLIPS.forEach((f) => {
      const card = document.createElement("div");
      card.className = "flip";
      card.innerHTML = `<div><b></b><small></small><p class="flip__how"></p><p class="flip__listen"><span>Listen for</span> </p></div>
        <div class="flip__go"><button class="xbtn flip__ab" data-which="s">▶ The sample</button><button class="xbtn flip__ab" data-which="f">▶ The flip</button></div>
        <div class="flip__player" hidden></div>
        <div class="flip__go flip__go--chop"><label class="xbtn flip__load">Load the sample into the pads<input type="file" accept="audio/*" hidden></label><button class="xbtn flip__chop" hidden>▶ Perform the chops</button></div>
        <p class="flip__status"></p>`;
      card.querySelector("b").textContent = f.title;
      card.querySelector("small").textContent = "Sampled: " + f.sample;
      card.querySelector(".flip__how").textContent = f.how;
      card.querySelector(".flip__listen").append(f.listen);
      if (f.group) { const h = document.createElement("h4"); h.className = "flips__group"; h.textContent = f.group; flipsEl?.append(h); }
      card.querySelectorAll(".flip__ab").forEach((b) => b.addEventListener("click", () => watch(card, b.dataset.which === "s" ? f.s : f.f, b.dataset.which)));
      const chopBtn = card.querySelector(".flip__chop");
      chopBtn.addEventListener("click", () => (activeFlip === card ? stopFlip() : playFlip(f, card)));
      // Your own copy of the sampled record goes onto the pads, and the producer's chop pattern is played on it.
      card.querySelector(".flip__load input").addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const status = card.querySelector(".flip__status"); status.textContent = "Decoding your copy…";
        try {
          buf = await audio().decodeAudioData(await file.arrayBuffer()); revBuf = reverseCopy(buf); computePeaks(); autoChop();
          info.textContent = `${file.name.slice(0, 40)} · auto-chopped into 16`;
          status.textContent = `"${file.name.slice(0, 32)}" is on the pads. Play them yourself, or let the pattern perform it.`;
          chopBtn.hidden = false; playFlip(f, card);
        } catch { status.textContent = "Couldn't read that file. Try an MP3, WAV or M4A."; }
      });
      flipsEl?.append(card);
    });
    KEYS.forEach((k, i) => {
      const b = document.createElement("button");
      b.className = "chop__pad"; b.style.setProperty("--c", COLORS[i % 4]);
      b.innerHTML = `<span>${i + 1}</span><kbd>${k.toUpperCase()}</kbd>`;
      b.setAttribute("aria-label", `Pad ${i + 1}, key ${k.toUpperCase()}`);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); play(i); });
      b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(i); } });
      padsEl.append(b);
    });
    // Keyboard pads work while the chop shop is on screen and you're not typing.
    let visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 }).observe(root);
    addEventListener("keydown", (e) => {
      if (!visible || e.repeat || e.metaKey || e.ctrlKey || e.target.closest?.("input, textarea")) return;
      const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) { e.preventDefault(); play(i); }
    });
    cv.addEventListener("click", (e) => { if (!buf) return; cues[sel] = (posIn(cv, e).x / cv.width) * buf.duration; cues.sort((a, b) => a - b); draw(); });
    pitchIn.addEventListener("input", () => (pitchOut.textContent = (pitchIn.value > 0 ? "+" : "") + pitchIn.value));
    revBtn.addEventListener("click", () => { reverse = !reverse; revBtn.textContent = "Reverse: " + (reverse ? "On" : "Off"); });
    act(root, "auto").addEventListener("click", () => buf && autoChop());
    act(root, "even").addEventListener("click", () => buf && evenChop());
    act(root, "file").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      info.textContent = "Decoding…";
      try { buf = await audio().decodeAudioData(await f.arrayBuffer()); ownTrack = true; revBuf = reverseCopy(buf); computePeaks(); autoChop(); info.textContent = `${f.name.slice(0, 40)} · ${buf.duration.toFixed(1)}s · auto-chopped into 16`; }
      catch { info.textContent = "Couldn't read that file. Try an MP3, WAV or M4A."; }
    });
    // Render the built-in loop straight away (it takes a few milliseconds); Track X-ray and the waveform poster use it too.
    (async () => {
      draw(); g.fillStyle = "rgba(237,235,230,.5)"; g.font = '600 16px "JetBrains Mono", monospace'; g.fillText("Rendering the built-in loop…", 20, 30);
      try { buf = await makeLoop(); window.mnvLoop = buf; revBuf = reverseCopy(buf); computePeaks(); autoChop(); info.textContent = "Built-in loop ready, auto-chopped into 16. Keys: 1–4 · Q–R · A–F · Z–V"; } catch { info.textContent = "Load a track to start."; }
    })();
  })();




















})();
