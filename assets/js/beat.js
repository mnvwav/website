/* Make a beat with me: a step sequencer with real drum samples, ten genres, an 808 that follows the chords,
   a chord layer and hold-to-play effects. The same engine plays live and renders the WAV offline. */
(() => {
  const rack = document.querySelector("[data-beat]");
  if (!rack) return;
  const $ = (s) => rack.querySelector(s), $$ = (s) => [...rack.querySelectorAll(s)];
  const grid = $(".beat__grid"), note = $(".rack__note"), playBtn = $("[data-beat-play]");
  const bpmIn = $("[data-beat-bpm]"), swingIn = $("[data-beat-swing]"), kitSel = $("[data-beat-kit]"), keySel = $("[data-beat-key]"), chordSel = $("[data-beat-chords]");
  const outOf = (input) => input.parentElement.querySelector("output");
  const STEPS = 16;

  const ROWS = [
    { name: "Kick", col: "#6E6BFF", midi: 36 }, { name: "Snare", col: "#F17FA6", midi: 38 }, { name: "Clap", col: "#FF6B5B", midi: 39 }, { name: "Hi-hat", col: "#FFB224", midi: 42 },
    { name: "Open hat", col: "#FFD580", midi: 46 }, { name: "Tom", col: "#2FBF9B", midi: 45 }, { name: "Rim", col: "#7FE3C8", midi: 37 }, { name: "808", col: "#B9B6FF", midi: 35 },
  ];
  // Real drum samples (from the Chromium Web Audio drum machine demo, hosted by Tone.js).
  const KITS = { "Boom bap": "breakbeat8", Acoustic: "acoustic-kit", "TR-77": "KPR77", LinnDrum: "LINN", "CR-78": "CR78", Techno: "Techno", Stark: "Stark", "Kit 8": "Kit8", "Kit 3": "Kit3", FM: "4OP-FM", Bongos: "Bongos" };
  const SAMPLE = (dir, f) => `https://tonejs.github.io/audio/drum-samples/${dir}/${f}.mp3`;
  const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const PROG = {
    dark: [[0, "m"], [8, "M"], [3, "M"], [10, "M"]], soul: [[0, "m7"], [5, "m7"], [10, "7"], [3, "M7"]], sad: [[0, "m"], [5, "m"], [8, "M"], [7, "m"]],
    bright: [[0, "M7"], [9, "m7"], [5, "M7"], [7, "7"]], drill: [[0, "m"], [1, "M"], [0, "m"], [7, "m"]], desi: [[0, "M"], [10, "M"], [8, "M"], [10, "M"]],
  };
  const QUAL = { m: [0, 3, 7, 12], M: [0, 4, 7, 12], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], 7: [0, 4, 7, 10] };
  // "x" hit, "X" accent, "r" roll (three quick hits), "." rest. Rows: kick, snare, clap, hat, open hat, tom, rim, 808.
  const GENRES = {
    "Boom bap": { bpm: 90, swing: 24, key: 9, prog: "soul", chords: "Keys", kit: "Boom bap", glide: 0, dec: 0.5,
      p: ["X.....x...x.....", "....X.......X...", "................", "x.x.x.x.x.x.x.x.", "...............x", "................", "..........x.....", "x.........x....."] },
    Trap: { bpm: 140, swing: 0, key: 1, prog: "dark", chords: "Pad", kit: "TR-77", glide: 0, dec: 1.4,
      p: ["X......x..x.....", "........X.......", "........x.......", "xxxxx.xxrx.xXxxr", "................", "................", "...........x....", "X......x..x....x"] },
    Drill: { bpm: 142, swing: 0, key: 6, prog: "drill", chords: "Pad", kit: "Kit 8", glide: 7, dec: 1.2,
      p: ["X.........x.....", "......X.......X.", "................", "x.xx.x.xr.xx.x.r", "...........x....", "...x............", "........x.......", "X.....x...x..x.."] },
    "Lo-fi": { bpm: 78, swing: 32, key: 2, prog: "soul", chords: "Keys", kit: "CR-78", glide: 0, dec: 0.6,
      p: ["X......x..X.....", "....X.......X..x", "................", "x.x.x.x.x.xxx.x.", "................", "..............x.", "..x.............", "x.....x...x....."] },
    House: { bpm: 124, swing: 8, key: 5, prog: "bright", chords: "Pluck", kit: "Techno", glide: 0, dec: 0.3,
      p: ["X...X...X...X...", "................", "....X.......X...", "..x...x...x...x.", "..x...x...x...x.", "...x.......x....", "......x.......x.", "..x..x..x...x..x"] },
    Afrobeats: { bpm: 104, swing: 14, key: 7, prog: "bright", chords: "Pluck", kit: "Kit 3", glide: 0, dec: 0.5,
      p: ["X.....x...X.....", "......X.......X.", "................", "x.xxx.xxx.xxx.xx", "................", "x.....x...x.x...", "...x..x....x..x.", "X.........x....."] },
    Amapiano: { bpm: 112, swing: 10, key: 10, prog: "soul", chords: "Keys", kit: "Stark", glide: 5, dec: 0.45,
      p: ["X...X...X...X...", "................", "......x.......x.", "x.xxx.xxx.xxx.xx", "................", "................", "..x..x..x..x.x..", "x..x..x...x.x..."] },
    Reggaeton: { bpm: 96, swing: 0, key: 0, prog: "sad", chords: "Pluck", kit: "TR-77", glide: 0, dec: 0.6,
      p: ["X...X...X...X...", "...x..x....x..x.", "................", "x.x.x.x.x.x.x.x.", "................", "................", "...x..x....x..x.", "X.......X......."] },
    Bhangra: { bpm: 100, swing: 18, key: 2, prog: "desi", chords: "Pluck", kit: "Bongos", glide: 0, dec: 0.4,
      p: ["X.....X...X.....", "....x.......x...", "....X.......X...", "x.x.x.x.x.x.x.x.", "................", "x.xX..x.x.xX..xx", "................", "x.........x....."] },
    "Jersey club": { bpm: 140, swing: 0, key: 4, prog: "dark", chords: "Pad", kit: "LinnDrum", glide: 0, dec: 0.3,
      p: ["X...X...X..xX.x.", "................", "....X.X....X.X..", "x.x.x.x.x.x.x.x.", "................", "................", "..x.......x.....", "x...x...x...x..."] },
  };
  const GN = Object.keys(GENRES), CHORDS = ["Off", "Keys", "Pad", "Pluck"], KN = Object.keys(KITS);
  KN.forEach((k) => kitSel.add(new Option(k, k)));
  KEYS.forEach((k, i) => keySel.add(new Option(k + " minor", i)));
  CHORDS.forEach((k) => chordSel.add(new Option(k, k)));

  let genre = "Boom bap", pat = [], muted = new Set(), playing = false;
  const fromStrings = (rows) => rows.map((r) => Array.from({ length: STEPS }, (_, i) => ({ ".": 0, x: 1, X: 2, r: 3 })[r[i]] || 0));
  const undo = [], snapshot = () => { undo.push(JSON.stringify(pat)); if (undo.length > 60) undo.shift(); };

  /* ---------- Samples ---------- */
  const decoder = new OfflineAudioContext(1, 1, 44100), kitBufs = {};
  function loadKit(name) {
    const dir = KITS[name];
    return (kitBufs[dir] ||= Promise.all(["kick", "snare", "hihat", "tom1", "tom2"].map((f) => fetch(SAMPLE(dir, f)).then((r) => r.arrayBuffer()).then((b) => decoder.decodeAudioData(b)).catch(() => null)))
      .then(([kick, snare, hihat, tom1, tom2]) => ({ kick, snare, hihat, tom: tom2 || tom1 })));
  }
  let kit = null;
  async function useKit(name) { kitSel.value = name; note.textContent = `Loading the ${name} kit…`; kit = await loadKit(name); note.textContent = "Tap a square to add or remove a hit. Hold a pad below while it plays."; }

  /* ---------- Grid ---------- */
  let cells = [];
  function buildGrid() {
    grid.innerHTML = "";
    cells = ROWS.map((row, r) => {
      const line = document.createElement("div"); line.className = "beat__row"; line.style.setProperty("--c", row.col);
      const name = document.createElement("button"); name.className = "beat__name"; name.innerHTML = `<i></i>${row.name}`; name.title = "Tap to hear it. Double-tap to mute.";
      name.addEventListener("click", () => { ensure(); voice(ctx, bus, r, ctx.currentTime, 2); });
      name.addEventListener("dblclick", () => { muted.has(r) ? muted.delete(r) : muted.add(r); line.classList.toggle("muted", muted.has(r)); });
      line.append(name);
      const btns = Array.from({ length: STEPS }, (_, s) => {
        const b = document.createElement("button"); b.className = "beat__cell"; b.setAttribute("aria-label", `${row.name}, step ${s + 1}`);
        b.addEventListener("click", () => { snapshot(); pat[r][s] = pat[r][s] ? 0 : 1; paint(); if (pat[r][s]) { ensure(); stepBass(0); voice(ctx, bus, r, ctx.currentTime, 1); } });
        line.append(b); return b;
      });
      grid.append(line); return btns;
    });
  }
  const paint = () => cells.forEach((row, r) => row.forEach((b, s) => { const v = pat[r][s]; b.classList.toggle("on", v > 0); b.classList.toggle("roll", v === 3); b.classList.toggle("accent", v === 2); }));

  /* ---------- Sound engine ---------- */
  let ctx, bus;
  const noiseCache = new WeakMap();
  const noise = (c) => { if (!noiseCache.has(c)) { const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseCache.set(c, b); } return noiseCache.get(c); };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Drums and music → performance filter → glue compressor → limiter, plus a small room reverb.
  function makeBus(c) {
    const inp = c.createGain(), lp = c.createBiquadFilter(), out = c.createGain(), glue = c.createDynamicsCompressor(), lim = c.createDynamicsCompressor(), conv = c.createConvolver(), wet = c.createGain();
    lp.type = "lowpass"; lp.frequency.value = 20000; inp.gain.value = 0.7; out.gain.value = 1; wet.gain.value = 0.12;
    glue.threshold.value = -18; glue.ratio.value = 2.5; glue.attack.value = 0.01; glue.release.value = 0.15;
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
    const ir = c.createBuffer(2, c.sampleRate * 1.2, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4); }
    conv.buffer = ir;
    inp.connect(lp).connect(out).connect(glue).connect(lim).connect(c.destination); lp.connect(conv).connect(wet).connect(glue);
    Object.assign(inp, { _lp: lp, _out: out });
    return inp;
  }
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== "running") ctx.resume();
    if (!bus) bus = makeBus(ctx);
  }
  rack.addEventListener("touchend", () => { ensure(); const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(); }, { once: true, passive: true });
  const envGain = (c, dest, t, v, d) => { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + d); g.connect(dest); return g; };
  const burst = (c, dest, t, type, f, v, d, q = 1) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = noise(c); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl).connect(envGain(c, dest, t, v, d)); s.start(t, Math.random() * 0.4); s.stop(t + d + 0.03); };
  const tone = (c, dest, t, f, v, d, type = "sine", f2 = 0, drop = 0.1) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + drop); o.connect(envGain(c, dest, t, v, d)); o.start(t); o.stop(t + d + 0.05); };
  // Play a sample; len cuts it short with a quick fade (closed hat), rate changes pitch.
  function sample(c, dest, buf, t, v, len = 0, rate = 1, hp = 0) {
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.setValueAtTime(v, t);
    if (len) { g.gain.setValueAtTime(v, t + len * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len); }
    let node = s; if (hp) { const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; s.connect(f); node = f; }
    node.connect(g).connect(dest); s.start(t); if (len) s.stop(t + len + 0.02);
  }
  let bassNote = 33;
  const chordAt = (bar) => PROG[GENRES[genre].prog][bar % 4];
  const stepBass = (bar) => (bassNote = 33 + ((+keySel.value + chordAt(bar)[0]) % 12));
  function voice(c, dest, r, t, accent) {
    const v = accent === 2 ? 1 : accent === 3 ? 0.55 : accent === 0.5 ? 0.45 : 0.75, K = kit || {}, G = GENRES[genre];
    if (r === 0) { if (K.kick) sample(c, dest, K.kick, t, v * 1.1); else tone(c, dest, t, 140, v, 0.4, "sine", 45, 0.1); tone(c, dest, t, 60, v * 0.35, 0.18, "sine", 42, 0.08); }
    else if (r === 1) { if (K.snare) sample(c, dest, K.snare, t, v * 0.9); else { burst(c, dest, t, "highpass", 1800, v * 0.55, 0.2); tone(c, dest, t, 190, v * 0.4, 0.1, "triangle"); } }
    else if (r === 2) [0, 0.011, 0.023].forEach((dt, i) => burst(c, dest, t + dt, "bandpass", 1500, v * (i === 2 ? 0.7 : 0.45), i === 2 ? 0.18 : 0.03, 1.4));
    else if (r === 3) { if (K.hihat) sample(c, dest, K.hihat, t, v * 0.55, 0.07, 1, 4000); else burst(c, dest, t, "highpass", 8000, v * 0.26, 0.045); }
    else if (r === 4) { if (K.hihat) sample(c, dest, K.hihat, t, v * 0.5, 0.42, 0.94, 3000); else burst(c, dest, t, "highpass", 6500, v * 0.2, 0.32); }
    else if (r === 5) { if (K.tom) sample(c, dest, K.tom, t, v * 0.8, 0.6, accent === 2 ? 1.2 : 1); else tone(c, dest, t, 220, v * 0.6, 0.35, "sine", 120, 0.25); }
    else if (r === 6) { const o = c.createOscillator(), f = c.createBiquadFilter(); o.type = "square"; o.frequency.value = 820; f.type = "bandpass"; f.frequency.value = 1600; o.connect(f).connect(envGain(c, dest, t, v * 0.18, 0.04)); o.start(t); o.stop(t + 0.06); burst(c, dest, t, "highpass", 4000, v * 0.12, 0.015); }
    else {
      // 808: a sine with soft saturation, gliding into the root of the current chord.
      const f = mtof(bassNote), o = c.createOscillator(), sh = c.createWaveShaper(), cv = new Float32Array(256);
      for (let i = 0; i < 256; i++) cv[i] = Math.tanh((i / 127.5 - 1) * 2);
      sh.curve = cv; o.frequency.setValueAtTime(f * Math.pow(2, G.glide / 12), t); o.frequency.exponentialRampToValueAtTime(f, t + (G.glide ? 0.14 : 0.01));
      o.connect(sh).connect(envGain(c, dest, t, v * 0.7, G.dec)); o.start(t); o.stop(t + G.dec + 0.05);
    }
  }
  function chord(c, dest, t, bar, dur) {
    const type = chordSel.value; if (type === "Off") return;
    const [root, q] = chordAt(bar), base = 57 + ((+keySel.value + root) % 12);
    QUAL[q].forEach((iv, n) => {
      const f = mtof(base + iv);
      if (type === "Keys") [[1, "sine", 0.06], [2, "sine", 0.015], [3.01, "triangle", 0.005]].forEach(([mul, w, vv]) => { const o = c.createOscillator(), g = c.createGain(); o.type = w; o.frequency.value = f * mul; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vv, t + 0.01); g.gain.exponentialRampToValueAtTime(vv * 0.3, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05); });
      else if (type === "Pad") [-7, 7].forEach((det) => { const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; fl.type = "lowpass"; fl.frequency.value = 1100; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur); o.connect(fl).connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05); });
      else [0, 0.75, 1.5, 2.5].forEach((b, i) => tone(c, dest, t + (b * dur) / 4 + n * 0.012, f * (i === 3 ? 2 : 1), 0.05, 0.28, "triangle"));
    });
  }
  // One step. Hats get a natural groove: strong on the beat, softer in between.
  function stepAt(c, dest, gs, t, sd, mask = {}) {
    const s = gs % STEPS, bar = Math.floor(gs / STEPS);
    if (s === 0) { stepBass(bar); chord(c, dest, t, bar, sd * STEPS); }
    (mask.pattern || pat).forEach((row, r) => {
      let v = row[s]; if (!v || muted.has(r) || mask.mute?.has(r)) return;
      if (v === 1 && r === 3 && s % 4 !== 0) v = s % 2 ? 0.5 : 1;
      if (v === 3) for (let k = 0; k < 3; k++) voice(c, dest, r, t + (k * sd) / 3, 3);
      else voice(c, dest, r, t + (v === 0.5 ? 0.004 : 0), v);
    });
  }

  /* ---------- Transport, with performance effects ---------- */
  const fx = { stutter: false, half: false, drop: false, fill: false };
  let gs = 0, nextT = 0, timer, held = false, queue = [], stutterAt = 0, lastShown = -1;
  const sd = () => 60 / +bpmIn.value / 4;
  const swingOf = (s) => (s % 2 ? (+swingIn.value / 100) * sd() * 0.66 : 0);
  const fillPattern = () => { const f = pat.map((r) => [...r]); for (let s = 12; s < 16; s++) { f[1][s] = s % 2 ? 1 : 3; f[5][s] = s % 2 ? 2 : 0; f[0][s] = 0; } return f; };
  function schedule() {
    while (nextT < ctx.currentTime + 0.12) {
      if (fx.half && held) { held = false; gs++; nextT += sd(); continue; }
      const step = fx.stutter ? stutterAt + ((gs - stutterAt) % 2) : gs;
      const s = step % STEPS, t = nextT + swingOf(s), mask = {};
      if (fx.drop) mask.mute = new Set([0, 1, 2, 7]);
      if (fx.fill && s >= 12) mask.pattern = fillPattern();
      stepAt(ctx, bus, step, t, sd(), mask);
      queue.push([t, s]);
      if (s === 15 && fx.fill) { fx.fill = false; $("[data-fx=fill]").classList.remove("on"); }
      if (fx.half) held = true; else gs++;
      nextT += sd();
    }
  }
  function frame() {
    if (!playing) return;
    while (queue.length > 1 && queue[1][0] <= ctx.currentTime) queue.shift();
    const s = queue[0] && ctx.currentTime >= queue[0][0] ? queue[0][1] : -1;
    if (s !== lastShown && s >= 0) { cells.forEach((row) => { row[lastShown]?.classList.remove("now"); row[s].classList.add("now"); }); lastShown = s; }
    requestAnimationFrame(frame);
  }
  function toggle() {
    ensure(); playing = !playing;
    playBtn.textContent = playing ? "■ Stop" : "▶ Play"; playBtn.setAttribute("aria-pressed", playing); rack.classList.toggle("is-playing", playing);
    if (playing) { gs = 0; queue = []; nextT = ctx.currentTime + 0.06; schedule(); timer = setInterval(schedule, 25); requestAnimationFrame(frame); }
    else { clearInterval(timer); cells.forEach((row) => row.forEach((b) => b.classList.remove("now"))); lastShown = -1; }
  }
  playBtn.addEventListener("click", toggle);

  function fxOn(name) {
    ensure(); const now = ctx.currentTime, lp = bus._lp.frequency, out = bus._out.gain;
    if (name === "stutter") { fx.stutter = true; stutterAt = gs - (gs % 2); }
    else if (name === "half") { fx.half = true; held = false; }
    else if (name === "drop") { fx.drop = true; lp.cancelScheduledValues(now); lp.setTargetAtTime(900, now, 0.05); }
    else if (name === "filter") { lp.cancelScheduledValues(now); lp.setValueAtTime(lp.value, now); lp.exponentialRampToValueAtTime(320, now + 0.8); bus._lp.Q.value = 6; }
    else if (name === "power") { out.cancelScheduledValues(now); out.setValueAtTime(out.value, now); out.linearRampToValueAtTime(0, now + 0.7); lp.cancelScheduledValues(now); lp.setValueAtTime(lp.value, now); lp.exponentialRampToValueAtTime(120, now + 0.7); }
    else if (name === "fill") fx.fill = true;
    else if (name === "riser") { const d = sd() * 16, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gg = ctx.createGain(); s.buffer = noise(ctx); s.loop = true; f.type = "bandpass"; f.Q.value = 3; f.frequency.setValueAtTime(300, now); f.frequency.exponentialRampToValueAtTime(9000, now + d); gg.gain.setValueAtTime(0.0001, now); gg.gain.exponentialRampToValueAtTime(0.35, now + d); gg.gain.linearRampToValueAtTime(0, now + d + 0.05); s.connect(f).connect(gg).connect(bus); s.start(now); s.stop(now + d + 0.1); }
  }
  function fxOff(name) {
    if (!ctx) return; const now = ctx.currentTime, lp = bus._lp.frequency, out = bus._out.gain;
    if (name === "stutter") fx.stutter = false;
    else if (name === "half") { fx.half = false; if (held) { held = false; gs++; } }
    else if (name === "drop") { fx.drop = false; lp.cancelScheduledValues(now); lp.setTargetAtTime(20000, now, 0.02); burst(ctx, bus, now + 0.01, "highpass", 5000, 0.35, 1.4); }
    else if (name === "filter") { lp.cancelScheduledValues(now); lp.setValueAtTime(lp.value, now); lp.exponentialRampToValueAtTime(20000, now + 0.25); bus._lp.Q.value = 0.7; }
    else if (name === "power") { out.cancelScheduledValues(now); out.setValueAtTime(1, now + 0.02); lp.cancelScheduledValues(now); lp.setValueAtTime(20000, now + 0.02); }
  }
  const TAP = new Set(["fill", "riser"]);
  $$("[data-fx]").forEach((b, i) => {
    const name = b.dataset.fx; b._key = String(i + 1);
    b._on = (e) => { e?.preventDefault(); b.classList.add("on"); fxOn(name); if (name === "riser") setTimeout(() => b.classList.remove("on"), 300); };
    b._off = () => { if (TAP.has(name)) return; b.classList.remove("on"); fxOff(name); };
    b.addEventListener("pointerdown", b._on);
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => b.classList.contains("on") && b._off()));
  });
  let onScreen = false;
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0.3 }).observe(rack);
  addEventListener("keydown", (e) => {
    if (!onScreen || e.target.closest?.("input, textarea, select") || e.metaKey || e.ctrlKey) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); return; }
    const b = $$("[data-fx]").find((x) => x._key === e.key); if (b && !e.repeat) b._on(e);
  });
  addEventListener("keyup", (e) => { const b = $$("[data-fx]").find((x) => x._key === e.key); if (b?.classList.contains("on")) b._off(); });

  /* ---------- Genres and buttons ---------- */
  const genreEl = $(".orbit__genres");
  GN.forEach((name) => { const b = document.createElement("button"); b.className = "btn"; b.textContent = name; b.dataset.genre = name; b.addEventListener("click", () => setGenre(name)); genreEl.append(b); });
  function setGenre(name, keep = false) {
    if (!keep) snapshot();
    genre = name; const G = GENRES[name];
    if (!keep) { pat = fromStrings(G.p); bpmIn.value = G.bpm; swingIn.value = G.swing; keySel.value = G.key; chordSel.value = G.chords; useKit(G.kit); }
    [bpmIn, swingIn].forEach((el) => el.dispatchEvent(new Event("input")));
    $$("[data-genre]").forEach((b) => b.classList.toggle("on", b.dataset.genre === name));
    paint();
  }
  [[bpmIn, (v) => v + " BPM"], [swingIn, (v) => v + "%"]].forEach(([el, fmt]) => el.addEventListener("input", () => (outOf(el).textContent = fmt(el.value))));
  kitSel.addEventListener("change", () => useKit(kitSel.value));
  $("[data-beat-new]").addEventListener("click", () => {
    snapshot();
    pat = fromStrings(GENRES[genre].p).map((row, r) => row.map((v, s) => { if ((r === 0 && s === 0) || r === 1 || r === 2) return v; const x = Math.random(); return x < 0.2 ? (v ? 0 : x < 0.04 ? 2 : 1) : v; }));
    paint(); note.textContent = `A fresh ${genre} groove. Press it again for another.`;
  });
  $("[data-beat-undo]").addEventListener("click", () => { const last = undo.pop(); if (last) { pat = JSON.parse(last); paint(); } });
  $("[data-beat-clear]").addEventListener("click", () => { snapshot(); pat = ROWS.map(() => Array(STEPS).fill(0)); paint(); });

  /* ---------- Export: WAV (loop or a whole song), MIDI, share link ---------- */
  function wav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); out.setUint32(4, 36 + n * ch * 2, true); str(8, "WAVEfmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, "data"); out.setUint32(40, n * ch * 2, true);
    const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
    let peak = 0; data.forEach((d) => { for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i])); });
    const k = peak > 0.98 ? 0.98 / peak : 1;
    for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, data[c][i] * k)) * 32767, true);
    return new Blob([out], { type: "audio/wav" });
  }
  const save = (blob, name) => { const a = document.createElement("a"); a.download = name; a.href = URL.createObjectURL(blob); a.click(); };
  const SONG = [...Array(4)].map(() => ({ mute: new Set([0, 1, 2, 7]) })).concat([...Array(8)].map((_, i) => (i % 4 === 3 ? { fill: true } : {})), [...Array(4)].map(() => ({ mute: new Set([0, 7]) })));
  async function render(bars, label) {
    if (!kit) kit = await loadKit(kitSel.value);
    const sr = 44100, dur = sd() * STEPS * bars.length + 2, oc = new OfflineAudioContext(2, Math.ceil(sr * dur), sr), b = makeBus(oc);
    bars.forEach((m, bar) => { for (let s = 0; s < STEPS; s++) stepAt(oc, b, bar * STEPS + s, (bar * STEPS + s) * sd() + swingOf(s), sd(), { mute: m.mute, pattern: m.fill && s >= 12 ? fillPattern() : null }); });
    const buf = await oc.startRendering(); save(wav(buf), `beat-${genre.toLowerCase().replace(/\W+/g, "-")}-${bpmIn.value}bpm-${label}.wav`);
    return buf;
  }
  rack._render = render;
  $("[data-beat-wav]").addEventListener("click", async (e) => { const t = e.target.textContent; e.target.textContent = "Rendering…"; await render([{}, {}, {}, {}], "loop"); e.target.textContent = t; note.textContent = `4-bar loop exported at ${bpmIn.value} BPM.`; });
  $("[data-beat-song]").addEventListener("click", async (e) => { const t = e.target.textContent; e.target.textContent = "Rendering…"; await render(SONG, "song"); e.target.textContent = t; note.textContent = "16-bar song exported: intro, verse with fills, outro."; });
  $("[data-beat-midi]").addEventListener("click", () => {
    const ppq = 96, tick = ppq / 4, tracks = [[], [], []];
    for (let bar = 0; bar < 4; bar++) {
      const [root, q] = chordAt(bar), key = +keySel.value, bassM = 33 + ((key + root) % 12), base = 57 + ((key + root) % 12), b0 = bar * STEPS * tick;
      if (chordSel.value !== "Off") QUAL[q].forEach((iv) => tracks[2].push([b0, 0x91, base + iv, 80], [b0 + STEPS * tick - 2, 0x81, base + iv, 0]));
      pat.forEach((row, r) => row.forEach((v, s) => {
        if (!v || muted.has(r)) return;
        const at = b0 + s * tick + Math.round((swingOf(s) / sd()) * tick), vel = v === 2 ? 120 : 90;
        if (r === 7) { tracks[1].push([at, 0x90, bassM, vel], [at + tick * 2, 0x80, bassM, 0]); return; }
        (v === 3 ? [0, 1, 2] : [0]).forEach((k) => { const t = at + Math.round((k * tick) / 3); tracks[0].push([t, 0x99, ROWS[r].midi, v === 3 ? 70 : vel], [t + 4, 0x89, ROWS[r].midi, 0]); });
      }));
    }
    const vlq = (n) => { const o = [n & 0x7f]; while ((n >>= 7)) o.unshift((n & 0x7f) | 0x80); return o; };
    const tempo = Math.round(60000000 / +bpmIn.value), names = ["Drums", "808", "Chords"];
    const chunk = (ev, i) => {
      ev.sort((a, b) => a[0] - b[0] || (a[1] & 0xf0) - (b[1] & 0xf0));
      const name = [...names[i]].map((c) => c.charCodeAt(0)), bytes = [0x00, 0xff, 0x03, name.length, ...name];
      if (i === 0) bytes.push(0x00, 0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255);
      let last = 0; ev.forEach(([t, st, n, v]) => { bytes.push(...vlq(t - last), st, n, v); last = t; });
      bytes.push(0x00, 0xff, 0x2f, 0x00);
      return [0x4d, 0x54, 0x72, 0x6b, (bytes.length >>> 24) & 255, (bytes.length >> 16) & 255, (bytes.length >> 8) & 255, bytes.length & 255, ...bytes];
    };
    const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 3, (ppq >> 8) & 255, ppq & 255];
    save(new Blob([new Uint8Array([...head, ...tracks.flatMap(chunk)])], { type: "audio/midi" }), `beat-${bpmIn.value}bpm.mid`);
    note.textContent = "MIDI saved with three tracks (drums, 808, chords). Drag it into FL Studio or Logic.";
  });
  const encode = () => ["v5", GN.indexOf(genre), KN.indexOf(kitSel.value), bpmIn.value, swingIn.value, keySel.value, CHORDS.indexOf(chordSel.value), pat.map((r) => r.join("")).join("-")].join(".");
  function decode(str) {
    const m = str.match(/^v5\.(\d+)\.(\d+)\.(\d{2,3})\.(\d{1,2})\.(\d{1,2})\.(\d)\.([0-3-]+)$/);
    if (!m || !GN[+m[1]]) return false;
    genre = GN[+m[1]]; kitSel.value = KN[+m[2]] || GENRES[genre].kit; bpmIn.value = m[3]; swingIn.value = m[4]; keySel.value = m[5]; chordSel.value = CHORDS[+m[6]] || "Keys";
    const rows = m[7].split("-"); pat = ROWS.map((_, r) => Array.from({ length: STEPS }, (_, i) => +((rows[r] || "")[i] || 0)));
    return true;
  }
  $("[data-beat-share]").addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#beat=${encode()}`;
    history.replaceState(null, "", url);
    try { await navigator.clipboard.writeText(url); note.textContent = "Link copied. Send it to me, I'll actually listen."; }
    catch { prompt("Copy your beat link:", url); }
  });

  // On phones the grid shows eight steps at a time.
  $$("[data-half]").forEach((b) => b.addEventListener("click", () => { grid.dataset.show = b.dataset.half; $$("[data-half]").forEach((x) => x.classList.toggle("on", x === b)); }));

  /* ---------- Start ---------- */
  buildGrid();
  const fromHash = location.hash.match(/^#beat=(.+)$/);
  if (fromHash && decode(fromHash[1])) { setGenre(genre, true); useKit(kitSel.value); note.textContent = "Someone sent you a beat. Press play."; setTimeout(() => rack.scrollIntoView({ block: "center" }), 300); }
  else { setGenre("Boom bap"); undo.length = 0; }
})();
