/* Audio visualizer: five three.js scenes driven by the kick, bass, mids and highs of a track,
   composited with the artist and title, and recorded with the sound. three.js comes from a CDN via the page's import map. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

(() => {
  const root = document.querySelector('[data-x="viz"]'); if (!root) return;
  const act = (n) => root.querySelector(`[data-act="${n}"]`);
  const out = root.querySelector(".viz__gl"), og = out.getContext("2d"), note = act("note"), playBtn = act("play"), palSel = act("pal"), sceneSel = act("scene"), fmtSel = act("fmt");
  const PALS = {
    Sunset: ["#0B0614", "#FF4F8B", "#FFB224", "#6E3BFF"], Ice: ["#03070F", "#4FF0FF", "#B7F8FF", "#3D6BFF"], Acid: ["#050505", "#C6FF00", "#00E5FF", "#FF2E88"],
    Royal: ["#07051A", "#6E6BFF", "#F17FA6", "#FFD580"], Ember: ["#0C0503", "#FF5A1F", "#FFB224", "#FF2E2E"], Mono: ["#050505", "#FFFFFF", "#BBBBBB", "#777777"],
  };
  Object.keys(PALS).forEach((p) => palSel.add(new Option(p, p)));
  const pal = () => PALS[palSel.value].map((c) => new THREE.Color(c));
  const react = () => +act("react").value / 100;

  /* ---------- Audio ---------- */
  let ctx, analyser, dest, src, buffer = null, playing = false, startAt = 0, name = "";
  const freq = new Uint8Array(1024), wave = new Uint8Array(2048), bands = { bass: 0, mid: 0, high: 0, kick: 0 };
  let bassAvg = 0;
  function audio() {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.75; dest = ctx.createMediaStreamDestination(); analyser.connect(ctx.destination); analyser.connect(dest); }
    if (ctx.state !== "running") ctx.resume(); return ctx;
  }
  const builtIn = () => window.mnvLoop || new Promise((res) => { const t = setInterval(() => window.mnvLoop && (clearInterval(t), res(window.mnvLoop)), 200); });
  function start() {
    audio(); stop(); src = ctx.createBufferSource(); src.buffer = buffer; src.loop = !name; src.connect(analyser); src.start(); startAt = ctx.currentTime; playing = true; playBtn.textContent = "■ Stop";
    src.onended = () => { playing = false; playBtn.textContent = "▶ Play"; };
  }
  function stop() { if (src) { src.onended = null; try { src.stop(); } catch {} src = null; } playing = false; playBtn.textContent = "▶ Play"; }
  playBtn.addEventListener("click", async () => { if (playing) return stop(); audio(); if (!buffer) buffer = await builtIn(); start(); });
  act("file").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return; note.textContent = "Decoding…";
    try { buffer = await audio().decodeAudioData(await f.arrayBuffer()); name = f.name; if (act("title").value === "Late Night") act("title").value = f.name.replace(/\.[^.]+$/, "").slice(0, 40); start(); note.textContent = `${f.name} · ${Math.round(buffer.duration)}s. Pick a scene, then record.`; }
    catch { note.textContent = "Couldn't read that file. Try an MP3, WAV or M4A."; }
  });
  function readBands() {
    if (!playing) { for (const k in bands) bands[k] *= 0.9; freq.fill(0); wave.fill(128); return; }
    analyser.getByteFrequencyData(freq); analyser.getByteTimeDomainData(wave);
    const binHz = ctx.sampleRate / analyser.fftSize, avg = (a, b) => { let s = 0; const i0 = Math.floor(a / binHz), i1 = Math.ceil(b / binHz); for (let i = i0; i < i1; i++) s += freq[i]; return s / ((i1 - i0) * 255); };
    const bass = avg(30, 150), mid = avg(300, 2500), high = avg(5000, 14000);
    bassAvg += (bass - bassAvg) * 0.05;
    bands.kick = Math.max(bands.kick * 0.86, bass > bassAvg * 1.2 && bass > 0.3 ? 1 : 0);
    bands.bass = bass * react(); bands.mid = mid * react(); bands.high = high * react();
  }

  /* ---------- three.js ---------- */
  let renderer, composer, bloom, scene, camera, current, visible = false, raf = 0, recording = false;
  const W = () => +fmtSel.value.split("x")[0], H = () => +fmtSel.value.split("x")[1];
  const gl = document.createElement("canvas");
  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 1.1, 0.5, 0.3); composer.addPass(bloom); composer.addPass(new OutputPass());
    resize(); build(); loop();
  }
  function resize() {
    const w = W(), h = H(), k = Math.min(1, 1280 / Math.max(w, h));   // render a bit smaller, scale up on the 2D canvas
    out.width = w; out.height = h; out.style.aspectRatio = `${w} / ${h}`; root.classList.toggle("viz--tall", h > w);
    renderer.setSize(Math.round(w * k), Math.round(h * k), false); composer.setSize(Math.round(w * k), Math.round(h * k));
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const SCENES = {
    // Synthwave terrain: the spectrum scrolls towards you as a landscape.
    Terrain() {
      const [bg, a, b, c] = pal(), cols = 96, rows = 80, geo = new THREE.PlaneGeometry(120, 160, cols - 1, rows - 1); geo.rotateX(-Math.PI / 2);
      const hist = Array.from({ length: rows }, () => new Float32Array(cols)), mat = new THREE.MeshBasicMaterial({ color: a, wireframe: true, transparent: true, opacity: 0.55 });
      const mesh = new THREE.Mesh(geo, mat), sun = new THREE.Mesh(new THREE.CircleGeometry(26, 64), new THREE.MeshBasicMaterial({ color: b }));
      sun.position.set(0, 18, -150); const g = new THREE.Group(); g.add(mesh, sun); scene.fog = new THREE.Fog(bg, 40, 170); scene.background = bg;
      camera.position.set(0, 9, 62); camera.rotation.set(0, 0, 0); camera.lookAt(0, 6, -40);
      let acc = 0;
      return { g, update(dt) {
        acc += dt;
        if (acc > 1 / 30) { acc = 0; hist.pop(); const row = new Float32Array(cols); for (let i = 0; i < cols; i++) { const d = Math.abs(i - cols / 2) / (cols / 2), f = freq[Math.floor((1 - d) * 180) + 2] / 255; row[i] = f * 18 * (0.25 + d * d * 1.6) * react(); } hist.unshift(row); }
        const p = geo.attributes.position; for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) p.setY(r * cols + i, hist[rows - 1 - r][i] + Math.sin(i * 0.4) * 0.2); p.needsUpdate = true;
        sun.scale.setScalar(1 + bands.kick * 0.12); mat.color.copy(a).lerp(c, Math.min(1, bands.high)); bloom.strength = 0.45 + bands.bass * 0.5;
      } };
    },
    // A liquid orb: noise displacement in the vertex shader, pushed by bass and kicks.
    Orb() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.position.set(0, 0, 6); camera.rotation.set(0, 0, 0); camera.lookAt(0, 0, 0);
      const mat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, bass: { value: 0 }, high: { value: 0 }, ca: { value: a }, cb: { value: b }, cc: { value: c } },
        vertexShader: `uniform float t, bass, high; varying float vN; varying vec3 vNorm;
          vec3 h(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(vec3(p.x*p.y*p.z, p.x+p.y*p.z, p.x*p.y+p.z)); }
          float n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(mix(mix(h(i).x,h(i+vec3(1,0,0)).x,f.x),mix(h(i+vec3(0,1,0)).x,h(i+vec3(1,1,0)).x,f.x),f.y),mix(mix(h(i+vec3(0,0,1)).x,h(i+vec3(1,0,1)).x,f.x),mix(h(i+vec3(0,1,1)).x,h(i+vec3(1,1,1)).x,f.x),f.y),f.z); }
          void main(){ float d = n(normal * 2.2 + t * .4) * (.25 + bass * 1.2) + n(normal * 8. + t) * high * .25; vN = d; vNorm = normalMatrix * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * d, 1.); }`,
        fragmentShader: `uniform vec3 ca, cb, cc; varying float vN; varying vec3 vNorm; void main(){ float f = pow(1. - abs(normalize(vNorm).z), 2.); vec3 col = mix(ca, cb, smoothstep(.1, .7, vN)); col = mix(col, cc, f); gl_FragColor = vec4(col * (.35 + f * 1.2 + vN), 1.); }` });
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 64), mat), ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.015, 8, 200), new THREE.MeshBasicMaterial({ color: b }));
      const g = new THREE.Group(); g.add(orb, ring);
      return { g, update(dt, t) { mat.uniforms.t.value = t; mat.uniforms.bass.value += (bands.bass - mat.uniforms.bass.value) * 0.3; mat.uniforms.high.value = bands.high; orb.rotation.y += dt * 0.2; ring.rotation.x = 1.2 + Math.sin(t * 0.3) * 0.2; ring.scale.setScalar(1 + bands.kick * 0.15); bloom.strength = 0.8 + bands.kick * 0.8; } };
    },
    // Hexagonal rings rushing towards the camera, flashing on the kick.
    Tunnel() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = new THREE.Fog(bg, 10, 90); camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
      const g = new THREE.Group(), rings = [];
      for (let i = 0; i < 46; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(6, 0.06, 6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? a : b })); m.position.z = -i * 2; m.rotation.z = i * 0.12; rings.push(m); g.add(m); }
      return { g, update(dt, t) {
        const speed = 10 + bands.bass * 40;
        rings.forEach((m, i) => { m.position.z += dt * speed; if (m.position.z > 2) m.position.z -= 92; m.rotation.z += dt * (0.2 + bands.mid); m.scale.setScalar(1 + bands.kick * 0.25 * Math.max(0, 1 + m.position.z / 30)); m.material.color.copy(i % 2 ? a : b).lerp(c, bands.kick * 0.7); });
        camera.rotation.z = Math.sin(t * 0.3) * 0.3; bloom.strength = 1 + bands.kick;
      } };
    },
    // A spiral galaxy of 30,000 stars that breathes with the bass.
    Galaxy() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 7, 11); camera.lookAt(0, 0, 0);
      const N = 30000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), base = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const r = Math.pow(Math.random(), 1.6) * 7, arm = (i % 3) * ((Math.PI * 2) / 3), ang = arm + r * 0.9 + ((Math.random() - 0.5) * 0.6) / (0.3 + r * 0.2), y = (Math.random() - 0.5) * 0.5 * (1 - r / 8); base.set([Math.cos(ang) * r, y, Math.sin(ang) * r], i * 3); const cc = a.clone().lerp(b, r / 7).lerp(c, Math.random() * 0.3); col.set([cc.r, cc.g, cc.b], i * 3); }
      pos.set(base); const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), pts = new THREE.Points(geo, mat), g = new THREE.Group(); g.add(pts);
      return { g, update(dt, t) {
        pts.rotation.y += dt * (0.08 + bands.mid * 0.3); mat.size = 0.04 + bands.bass * 0.06;
        const p = geo.attributes.position.array, push = 1 + bands.kick * 0.12; for (let i = 0; i < N * 3; i += 3) { p[i] = base[i] * push; p[i + 1] = base[i + 1] * (1 + bands.high * 6); p[i + 2] = base[i + 2] * push; } geo.attributes.position.needsUpdate = true;
        camera.position.y = 7 + Math.sin(t * 0.2) * 2; camera.lookAt(0, 0, 0); bloom.strength = 1.2;
      } };
    },
    // A halo of spectrum bars around a glowing core.
    Halo() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 9); camera.lookAt(0, 0, 0);
      const N = 128, bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }), N), dummy = new THREE.Object3D(), g = new THREE.Group();
      for (let i = 0; i < N; i++) bars.setColorAt(i, a.clone().lerp(b, i / N));
      const core = new THREE.Mesh(new THREE.CircleGeometry(1.4, 96), new THREE.MeshBasicMaterial({ color: c })), rim = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.1, 128), new THREE.MeshBasicMaterial({ color: b }));
      g.add(bars, core, rim);
      return { g, update(dt, t) {
        for (let i = 0; i < N; i++) { const k = i < N / 2 ? i : N - 1 - i, f = Math.max(0.03, freq[Math.floor((k / (N / 2)) * 200) + 2] / 255), len = 0.1 + f * 3.2 * react(), ang = (i / N) * Math.PI * 2 + t * 0.05; dummy.position.set(Math.cos(ang) * (2.3 + len / 2), Math.sin(ang) * (2.3 + len / 2), 0); dummy.rotation.z = ang - Math.PI / 2; dummy.scale.set(1, len, 1); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix); }
        bars.instanceMatrix.needsUpdate = true; core.scale.setScalar(1 + bands.kick * 0.18 + bands.bass * 0.1); rim.rotation.z = t * 0.2; bloom.strength = 1 + bands.kick * 0.8;
      } };
    },
    // Classic spectrum: a row of bars with a mirror floor.
    Bars() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 2.2, 13); camera.lookAt(0, 1.5, 0);
      const N = 64, g = new THREE.Group(), bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 1, 0.13), new THREE.MeshBasicMaterial(), N * 2), d = new THREE.Object3D();
      for (let i = 0; i < N * 2; i++) bars.setColorAt(i, a.clone().lerp(b, (i % N) / N).multiplyScalar(i >= N ? 0.25 : 1));
      g.add(bars);
      return { g, update() { for (let i = 0; i < N; i++) { const h = 0.05 + (freq[Math.floor(Math.pow(i / N, 1.6) * 400) + 2] / 255) * 4 * react(); [1, -1].forEach((sg, k) => { d.position.set((i - N / 2 + 0.5) * 0.18, sg * h / 2, 0); d.scale.set(1, h, 1); d.updateMatrix(); bars.setMatrixAt(i + k * N, d.matrix); }); } bars.instanceMatrix.needsUpdate = true; bloom.strength = 0.6 + bands.kick * 0.6; } };
    },
    // Oscilloscope: the raw waveform as a glowing line.
    Oscilloscope() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
      const N = 512, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: a })), echo = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: b, transparent: true, opacity: 0.35 })); echo.position.z = -1; echo.scale.set(1.04, 1.3, 1);
      const g = new THREE.Group(); g.add(line, echo);
      return { g, update() { for (let i = 0; i < N; i++) { pos[i * 3] = (i / N - 0.5) * 16; pos[i * 3 + 1] = ((wave[i * 4] - 128) / 128) * 4 * react(); } geo.attributes.position.needsUpdate = true; bloom.strength = 1.4 + bands.kick; } };
    },
    // Unknown Pleasures: stacked ridgelines of the spectrum over time.
    Ridgelines() {
      const [bg, a] = pal(); scene.background = new THREE.Color("#000"); scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
      const L = 40, N = 120, g = new THREE.Group(), hist = Array.from({ length: L }, () => new Float32Array(N)), lines = [];
      for (let k = 0; k < L; k++) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3)); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: k === 0 ? a : 0xffffff, transparent: true, opacity: 1 - k / (L * 1.3) })); lines.push(l); g.add(l); }
      let acc = 0;
      return { g, update(dt) { acc += dt; if (acc > 0.07) { acc = 0; hist.pop(); const row = new Float32Array(N); for (let i = 0; i < N; i++) { const env = Math.exp(-Math.pow((i - N / 2) / (N / 5), 2)); row[i] = (freq[Math.floor(Math.abs(i - N / 2) * 3) + 3] / 255) * 2.2 * env * react() + Math.random() * 0.03; } hist.unshift(row); }
        lines.forEach((l, k) => { const p = l.geometry.attributes.position.array, y0 = 3.6 - k * 0.19; for (let i = 0; i < N; i++) { p[i * 3] = (i / (N - 1) - 0.5) * 9; p[i * 3 + 1] = y0 + hist[k][i]; } l.geometry.attributes.position.needsUpdate = true; }); bloom.strength = 0.3; } };
    },
    // A city skyline of bars on a grid, flown over slowly.
    City() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = new THREE.Fog(bg, 10, 45); camera.rotation.set(0, 0, 0);
      const S = 16, g = new THREE.Group(), m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 1, 0.8), new THREE.MeshBasicMaterial(), S * S), d = new THREE.Object3D();
      for (let i = 0; i < S * S; i++) m.setColorAt(i, a.clone().lerp(b, Math.random()));
      const floor = new THREE.GridHelper(40, 40, c, c); floor.material.opacity = 0.25; floor.material.transparent = true; g.add(m, floor);
      return { g, update(dt, t) { for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) { const i = x * S + z, dist = Math.hypot(x - S / 2, z - S / 2), h = 0.2 + (freq[Math.floor(dist * 14) + 2] / 255) * 7 * react(); d.position.set((x - S / 2) * 1.1, h / 2, (z - S / 2) * 1.1); d.scale.set(1, h, 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); } m.instanceMatrix.needsUpdate = true; camera.position.set(Math.cos(t * 0.1) * 18, 9, Math.sin(t * 0.1) * 18); camera.lookAt(0, 1, 0); bloom.strength = 0.25 + bands.kick * 0.25; } };
    },
    // Warp speed through stars; faster with the bass.
    Warp() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 0); camera.lookAt(0, 0, -1);
      const N = 3000, pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const st = Array.from({ length: N }, () => [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, -Math.random() * 100]);
      const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: a, transparent: true, opacity: 0.85 })), g = new THREE.Group(); g.add(lines);
      return { g, update(dt, t) { const sp = 20 + bands.bass * 160, len = 0.3 + bands.bass * 4; st.forEach((p, i) => { p[2] += dt * sp; if (p[2] > 0) p[2] -= 100; pos.set([p[0], p[1], p[2], p[0], p[1], p[2] - len], i * 6); }); geo.attributes.position.needsUpdate = true; lines.material.color.copy(a).lerp(b, bands.high); camera.rotation.z = t * 0.05; bloom.strength = 1 + bands.kick; } };
    },
    // A spinning record. Upload cover art and it becomes the label.
    Vinyl() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, -3.5, 7.5); camera.lookAt(0, 0, 0);
      const g = new THREE.Group(), disc = new THREE.Mesh(new THREE.CircleGeometry(3, 128), new THREE.MeshBasicMaterial({ color: "#0B0B0D" })); g.add(disc);
      for (let r = 1.3; r < 2.95; r += 0.05) { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.008, 128), new THREE.MeshBasicMaterial({ color: "#2A2A30" })); ring.position.z = 0.001; g.add(ring); }
      const label = new THREE.Mesh(new THREE.CircleGeometry(1.2, 96), new THREE.MeshBasicMaterial({ map: coverTex(), color: coverTex() ? 0xffffff : a })); label.position.z = 0.002; g.add(label);
      const shine = new THREE.Mesh(new THREE.RingGeometry(1.3, 2.95, 64, 1, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: b, transparent: true, opacity: 0.12 })); shine.position.z = 0.003;
      const holder = new THREE.Group(); holder.add(g, shine);
      return { g: holder, update(dt) { g.rotation.z -= dt * (playing ? 3.49 : 0.3); g.scale.setScalar(1 + bands.kick * 0.04); shine.material.opacity = 0.08 + bands.high * 0.4; bloom.strength = 0.35 + bands.kick * 0.5; } };
    },
    // Points on a sphere, pushed out by their own frequency.
    Sphere() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 7); camera.lookAt(0, 0, 0);
      const N = 4000, base = [], pos = new Float32Array(N * 3), col = new Float32Array(N * 3), idx = [];
      for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; base.push([Math.cos(th) * r, y, Math.sin(th) * r]); idx.push(Math.floor(Math.abs(y) * 300) + 2); const cc = a.clone().lerp(b, Math.abs(y)); col.set([cc.r, cc.g, cc.b], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })), g = new THREE.Group(); g.add(pts);
      return { g, update(dt) { for (let i = 0; i < N; i++) { const k = 2 + (freq[idx[i]] / 255) * 0.9 * react(); pos[i * 3] = base[i][0] * k; pos[i * 3 + 1] = base[i][1] * k; pos[i * 3 + 2] = base[i][2] * k; } geo.attributes.position.needsUpdate = true; pts.rotation.y += dt * 0.25; pts.rotation.x += dt * 0.05; bloom.strength = 1 + bands.kick * 0.6; } };
    },
    // A double helix, twisting with the mids.
    Helix() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
      const N = 60, g = new THREE.Group(), m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial(), N * 2), rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshBasicMaterial({ color: c }), N), d = new THREE.Object3D();
      for (let i = 0; i < N * 2; i++) m.setColorAt(i, i < N ? a : b);
      g.add(m, rungs); let ph = 0;
      return { g, update(dt) { ph += dt * (0.6 + bands.mid * 3); for (let i = 0; i < N; i++) { const y = (i - N / 2) * 0.22, ang = i * 0.3 + ph, r = 1.4 + (freq[i * 4 + 2] / 255) * 1.2 * react(); [0, Math.PI].forEach((o, k) => { d.position.set(Math.cos(ang + o) * r, y, Math.sin(ang + o) * r); d.scale.setScalar(1 + bands.kick * 0.5); d.rotation.set(0, 0, 0); d.updateMatrix(); m.setMatrixAt(i + k * N, d.matrix); }); d.position.set(0, y, 0); d.scale.set(1, r * 2, 1); d.rotation.set(0, -ang, Math.PI / 2); d.updateMatrix(); rungs.setMatrixAt(i, d.matrix); } m.instanceMatrix.needsUpdate = rungs.instanceMatrix.needsUpdate = true; g.rotation.z = 0.5; bloom.strength = 0.45 + bands.kick * 0.3; } };
    },
    // A 3D grid of cubes that light up from the centre outwards.
    Cubes() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0);
      const S = 7, N = S * S * S, m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial(), N), d = new THREE.Object3D(), g = new THREE.Group(), dist = [];
      for (let x = 0; x < S; x++) for (let y = 0; y < S; y++) for (let z = 0; z < S; z++) dist.push([x - 3, y - 3, z - 3, Math.hypot(x - 3, y - 3, z - 3)]);
      g.add(m);
      return { g, update(dt, t) { const col = new THREE.Color(); dist.forEach(([x, y, z, r], i) => { const f = freq[Math.floor(r * 40) + 2] / 255, s = 0.3 + f * 1.4 * react(); d.position.set(x, y, z); d.scale.setScalar(s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, col.copy(a).lerp(b, f).multiplyScalar(0.3 + f)); }); m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; camera.position.set(Math.cos(t * 0.2) * 13, 6, Math.sin(t * 0.2) * 13); camera.lookAt(0, 0, 0); bloom.strength = 1 + bands.kick * 0.4; } };
    },
    // Flowing ribbons of sine waves, one per band.
    Ribbons() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
      const K = 7, N = 200, g = new THREE.Group(), ls = [];
      for (let k = 0; k < K; k++) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3)); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: a.clone().lerp(k % 2 ? b : c, k / K) })); ls.push(l); g.add(l); }
      return { g, update(dt, t) { ls.forEach((l, k) => { const p = l.geometry.attributes.position.array, amp = 0.3 + (freq[k * 30 + 4] / 255) * 2.5 * react(); for (let i = 0; i < N; i++) { const x = (i / N - 0.5) * 18; p[i * 3] = x; p[i * 3 + 1] = Math.sin(x * (0.5 + k * 0.15) + t * (1 + k * 0.2)) * amp * Math.exp(-x * x / 40) + (k - K / 2) * 0.25; p[i * 3 + 2] = Math.cos(x * 0.3 + t + k) * 0.5; } l.geometry.attributes.position.needsUpdate = true; }); bloom.strength = 1.3 + bands.kick * 0.6; } };
    },
    // A polar flower: the spectrum drawn as petals, layered and rotating.
    Flower() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
      const K = 5, N = 256, g = new THREE.Group(), ls = [];
      for (let k = 0; k < K; k++) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3)); const l = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: [a, b, c][k % 3], transparent: true, opacity: 1 - k * 0.15 })); ls.push(l); g.add(l); }
      return { g, update(dt, t) { ls.forEach((l, k) => { const p = l.geometry.attributes.position.array; for (let i = 0; i < N; i++) { const th = (i / N) * Math.PI * 2, j = i < N / 2 ? i : N - i, r = 1.2 + k * 0.45 + (freq[j * 2 + 2] / 255) * (1.6 + k * 0.3) * react(); p[i * 3] = Math.cos(th) * r; p[i * 3 + 1] = Math.sin(th) * r; } l.geometry.attributes.position.needsUpdate = true; l.rotation.z = t * (0.1 + k * 0.05) * (k % 2 ? -1 : 1); }); bloom.strength = 1.2 + bands.kick * 0.5; } };
    },
    // A sea that swells with the bass.
    Ocean() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = new THREE.Fog(bg, 8, 40); camera.rotation.set(0, 0, 0); camera.position.set(0, 3, 12); camera.lookAt(0, 0, -5);
      const geo = new THREE.PlaneGeometry(60, 40, 120, 80); geo.rotateX(-Math.PI / 2); const base = geo.attributes.position.array.slice();
      const sea = new THREE.Points(geo, new THREE.PointsMaterial({ color: a, size: 0.06 })), moon = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), new THREE.MeshBasicMaterial({ color: b })); moon.position.set(0, 7, -30);
      const g = new THREE.Group(); g.add(sea, moon);
      return { g, update(dt, t) { const p = geo.attributes.position.array, amp = 0.3 + bands.bass * 2.2; for (let i = 0; i < p.length; i += 3) { const x = base[i], z = base[i + 2]; p[i + 1] = Math.sin(x * 0.3 + t) * Math.cos(z * 0.25 + t * 0.7) * amp + Math.sin(x * 1.1 + z + t * 2) * bands.high * 0.4; } geo.attributes.position.needsUpdate = true; moon.scale.setScalar(1 + bands.kick * 0.1); bloom.strength = 1 + bands.kick * 0.4; } };
    },
    // Particles that burst outwards on every kick.
    Burst() {
      const [bg, a, b, c] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
      const N = 6000, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
      for (let i = 0; i < N; i++) { const cc = [a, b, c][i % 3]; col.set([cc.r, cc.g, cc.b], i * 3); }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })), g = new THREE.Group(); g.add(pts);
      let next = 0, wasKick = false;
      return { g, update(dt, t) {
        const kick = bands.kick > 0.9 && !wasKick; wasKick = bands.kick > 0.9;
        if (kick || (!playing && t > next)) { next = t + 1.5; for (let n = 0; n < 900; n++) { const i = (Math.random() * N) | 0, th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), sp = 3 + Math.random() * 8; pos.set([0, 0, 0], i * 3); vel.set([Math.sin(ph) * Math.cos(th) * sp, Math.sin(ph) * Math.sin(th) * sp, Math.cos(ph) * sp], i * 3); } }
        for (let i = 0; i < N * 3; i++) { pos[i] += vel[i] * dt; vel[i] *= 0.97; } geo.attributes.position.needsUpdate = true; pts.rotation.z += dt * 0.1; bloom.strength = 1.2;
      } };
    },
    // LED equaliser: columns of blocks with peak holds.
    LED() {
      const [bg, a, b, c] = pal(); scene.background = new THREE.Color("#050505"); scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
      const C = 24, R = 18, m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.22), new THREE.MeshBasicMaterial(), C * R), d = new THREE.Object3D(), peaks = new Float32Array(C), col = new THREE.Color(), g = new THREE.Group();
      for (let x = 0; x < C; x++) for (let y = 0; y < R; y++) { d.position.set((x - C / 2) * 0.5 + 0.25, (y - R / 2) * 0.3, 0); d.updateMatrix(); m.setMatrixAt(x * R + y, d.matrix); }
      g.add(m);
      return { g, update(dt) { for (let x = 0; x < C; x++) { const f = freq[Math.floor(Math.pow(x / C, 1.5) * 300) + 2] / 255 * react(), lvl = Math.round(f * R); peaks[x] = Math.max(peaks[x] - dt * 8, lvl); for (let y = 0; y < R; y++) { const on = y < lvl || Math.round(peaks[x]) === y, k = y / R; col.copy(k < 0.6 ? a : k < 0.85 ? b : c).multiplyScalar(on ? 1 : 0.08); m.setColorAt(x * R + y, col); } } m.instanceColor.needsUpdate = true; bloom.strength = 0.9; } };
    },
    // Rings that ripple out from the centre on every kick.
    Ripples() {
      const [bg, a, b] = pal(); scene.background = bg; scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, -6, 7); camera.lookAt(0, 0, 0);
      const g = new THREE.Group(), rings = Array.from({ length: 24 }, (_, i) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 128), new THREE.MeshBasicMaterial({ color: i % 2 ? a : b, transparent: true, opacity: 0, side: THREE.DoubleSide })); r.userData.age = 99; g.add(r); return r; });
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), new THREE.MeshBasicMaterial({ color: b })); g.add(core);
      let wasKick = false, next = 0, k = 0;
      return { g, update(dt, t) { const kick = bands.kick > 0.9 && !wasKick; wasKick = bands.kick > 0.9; if (kick || t > next) { next = t + (playing ? 2 : 0.8); const r = rings[k++ % rings.length]; r.userData.age = 0; } rings.forEach((r) => { r.userData.age += dt; const s = 0.6 + r.userData.age * 3.2; r.scale.setScalar(s); r.material.opacity = Math.max(0, 1 - r.userData.age / 2.4); }); core.scale.setScalar(1 + bands.bass * 0.8); bloom.strength = 1.2; } };
    },
    // Your cover art, floating and pulsing over a blurred copy of itself.
    Cover() {
      const [bg, a] = pal(); scene.fog = null; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 8); camera.lookAt(0, 0, 0);
      const tex = coverTex(), g = new THREE.Group();
      const art = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : a }));
      const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: blurTex(), color: tex ? 0x777777 : bg })); back.position.z = -5;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(4.12, 4.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })); frame.position.z = -0.01;
      g.add(back, frame, art); scene.background = bg;
      return { g, update(dt, t) { const s = 1 + bands.kick * 0.05; art.scale.setScalar(s); frame.scale.setScalar(s * (1 + bands.bass * 0.03)); art.rotation.y = Math.sin(t * 0.4) * 0.15; art.rotation.x = Math.cos(t * 0.3) * 0.08; frame.rotation.copy(art.rotation); bloom.strength = 0.25 + bands.kick * 0.3; } };
    },
  };
  // Cover art: optional, used by the Vinyl and Cover templates.
  let coverImg = null, coverT = null, blurT = null;
  const coverTex = () => { if (!coverImg) return null; if (!coverT) { coverT = new THREE.Texture(coverImg); coverT.colorSpace = THREE.SRGBColorSpace; coverT.needsUpdate = true; } return coverT; };
  const blurTex = () => { if (!coverImg) return null; if (!blurT) { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.filter = "blur(18px) saturate(1.4)"; g.drawImage(coverImg, -20, -20, 296, 296); blurT = new THREE.CanvasTexture(c); blurT.colorSpace = THREE.SRGBColorSpace; } return blurT; };
  act("cover").addEventListener("change", (e) => { const f = e.target.files[0]; if (!f) return; const i = new Image(); i.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 1024; const k = Math.max(1024 / i.width, 1024 / i.height); c.getContext("2d").drawImage(i, (1024 - i.width * k) / 2, (1024 - i.height * k) / 2, i.width * k, i.height * k); coverImg = c; coverT = blurT = null; if (!["Vinyl", "Cover"].includes(sceneSel.value)) sceneSel.value = "Cover"; renderer && build(); }; i.src = URL.createObjectURL(f); });
  function build() {
    if (current) { scene.remove(current.g); current.g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
    current = SCENES[sceneSel.value](); scene.add(current.g);
  }
  function overlay() {
    const w = out.width, h = out.height, m = Math.min(w, h), pad = m * 0.07, layout = act("layout").value;
    og.drawImage(gl, 0, 0, w, h);
    const title = act("title").value.trim(), artist = act("artist").value.trim().toUpperCase();
    og.textBaseline = "alphabetic"; og.textAlign = "left";
    if (layout === "Bottom left") {
      og.fillStyle = "rgba(255,255,255,.95)"; og.font = `800 ${m * 0.075}px "Bricolage Grotesque", system-ui, sans-serif`; og.fillText(title, pad, h - pad - m * 0.045);
      og.font = `600 ${m * 0.03}px "JetBrains Mono", monospace`; og.fillStyle = "rgba(255,255,255,.7)"; og.fillText(artist, pad, h - pad);
    } else if (layout === "Centre") {
      og.textAlign = "center"; og.fillStyle = "rgba(255,255,255,.95)"; og.font = `900 ${m * 0.11 * (1 + bands.kick * 0.04)}px "Bricolage Grotesque", system-ui, sans-serif`; og.fillText(title, w / 2, h / 2 + m * 0.03);
      og.font = `600 ${m * 0.032}px "JetBrains Mono", monospace`; og.fillStyle = "rgba(255,255,255,.75)"; og.fillText(artist, w / 2, h / 2 + m * 0.1);
    } else if (layout === "Top") {
      og.fillStyle = "rgba(255,255,255,.75)"; og.font = `600 ${m * 0.03}px "JetBrains Mono", monospace`; og.fillText(artist, pad, pad + m * 0.03);
      og.fillStyle = "rgba(255,255,255,.95)"; og.font = `800 ${m * 0.07}px "Bricolage Grotesque", system-ui, sans-serif`; og.fillText(title, pad, pad + m * 0.11);
    } else if (layout === "Spotify card") {
      const cw = w - pad * 2, ch = m * 0.16, y = h - pad - ch; og.fillStyle = "rgba(0,0,0,.45)"; og.beginPath(); og.roundRect(pad, y, cw, ch, m * 0.02); og.fill();
      if (coverImg) og.drawImage(coverImg, pad + m * 0.02, y + m * 0.02, ch - m * 0.04, ch - m * 0.04);
      const tx = pad + (coverImg ? ch : m * 0.03); og.fillStyle = "#fff"; og.font = `700 ${m * 0.04}px "Bricolage Grotesque", system-ui, sans-serif`; og.fillText(title, tx, y + ch * 0.45);
      og.fillStyle = "rgba(255,255,255,.7)"; og.font = `500 ${m * 0.026}px "Bricolage Grotesque", system-ui, sans-serif`; og.fillText(act("artist").value.trim(), tx, y + ch * 0.72);
      const p = buffer && playing ? ((ctx.currentTime - startAt) % buffer.duration) / buffer.duration : 0; og.fillStyle = "rgba(255,255,255,.25)"; og.fillRect(tx, y + ch * 0.84, cw - (tx - pad) - m * 0.03, 3); og.fillStyle = "#fff"; og.fillRect(tx, y + ch * 0.84, (cw - (tx - pad) - m * 0.03) * p, 3);
      return;
    }
    if (layout !== "None" && buffer && playing && name) { const p = ((ctx.currentTime - startAt) % buffer.duration) / buffer.duration; og.fillStyle = "rgba(255,255,255,.18)"; og.fillRect(pad, h - pad * 0.55, w - pad * 2, 3); og.fillStyle = "#fff"; og.fillRect(pad, h - pad * 0.55, (w - pad * 2) * p, 3); }
  }
  let last = performance.now();
  function loop() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    readBands(); current.update(dt, now / 1000); composer.render(); overlay();
    raf = visible || recording ? requestAnimationFrame(loop) : 0;
  }
  sceneSel.addEventListener("change", () => renderer && build());
  palSel.addEventListener("change", () => renderer && build());
  fmtSel.addEventListener("change", () => { if (!renderer) return; resize(); build(); });
  act("rec").addEventListener("click", async (e) => {
    if (recording || !renderer) return;
    audio(); if (!buffer) buffer = await builtIn();
    if (!playing) start();
    const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!type) { note.textContent = "Video recording isn't supported in this browser."; return; }
    const stream = new MediaStream([...out.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]), chunks = [], rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10e6 });
    rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
    rec.onstop = () => { recording = false; e.target.textContent = "● Record 15s with sound"; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(chunks, { type })); a.download = `visualizer-${sceneSel.value.toLowerCase()}.${type.includes("mp4") ? "mp4" : "webm"}`; a.click(); note.textContent = "Video saved, with sound."; };
    recording = true; if (!raf) loop(); rec.start(); let left = 15; e.target.textContent = `Recording… ${left}s`;
    const t = setInterval(() => { left--; e.target.textContent = `Recording… ${left}s`; if (left <= 0) { clearInterval(t); rec.stop(); } }, 1000);
  });
  root._state = () => ({ bands: { ...bands }, playing, scene: sceneSel.value, w: out.width, h: out.height });
  let started = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !started) { started = true; init(); } else if (visible && !raf && renderer) loop(); }, { rootMargin: "200px" }).observe(root);
})();
