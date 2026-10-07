/* Colour grade lab: a GPU colour grader. Light, colour, curves, an 8-colour mixer, three colour wheels, film effects,
   31 looks with live thumbnails, and export as a full-size JPG or as a .cube LUT for Premiere, Resolve or Final Cut. */
(() => {
  const root = document.querySelector('[data-x="grade"]'); if (!root) return;
  const $ = (s, c = root) => c.querySelector(s), $$ = (s, c = root) => [...c.querySelectorAll(s)];
  const cv = $(".grade__gl"), split = $(".grade__split"), panel = $(".grade__panel"), note = $("[data-act=note]");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const save = (url, name) => { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); };

  /* ---------- Parameters ---------- */
  const SLIDERS = {
    Light: [["exp", "Exposure"], ["con", "Contrast"], ["hi", "Highlights"], ["sh", "Shadows"], ["wh", "Whites"], ["bl", "Blacks"]],
    Colour: [["temp", "Temperature"], ["tint", "Tint"], ["vib", "Vibrance"], ["sat", "Saturation"]],
    Effects: [["clar", "Clarity"], ["fade", "Fade", 0], ["bloom", "Bloom", 0], ["hal", "Halation", 0], ["grain", "Grain", 0], ["gsize", "Grain size", 0], ["vig", "Vignette"]],
  };
  const BANDS = [["Red", 0], ["Orange", 30], ["Yellow", 58], ["Green", 120], ["Aqua", 180], ["Blue", 225], ["Purple", 275], ["Magenta", 320]];
  const neutral = () => ({
    exp: 0, con: 0, hi: 0, sh: 0, wh: 0, bl: 0, temp: 0, tint: 0, vib: 0, sat: 0, clar: 0, fade: 0, bloom: 0, hal: 0, grain: 0, gsize: 30, vig: 0,
    wheels: { s: [0, 0, 0], m: [0, 0, 0], h: [0, 0, 0] },   // [hue°, amount 0–100, luminance −100–100]
    mix: BANDS.map(() => [0, 0, 0]),                          // [hue shift, saturation, luminance] per band, −100–100
    curve: { m: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] },
  });
  // Looks. Curves are lists of [in, out] points; anything left out stays neutral.
  const fade = (lo, hi = 1) => [[0, lo], [0.25, 0.25 + lo * 0.4], [0.75, 0.75 - (1 - hi) * 0.4], [1, hi]];
  const S = (k) => [[0, 0], [0.25, 0.25 - k], [0.75, 0.75 + k], [1, 1]];
  const LOOKS = {
    Film: {
      "Portra 400": { exp: 6, con: -10, sh: 16, hi: -12, temp: 12, vib: -8, sat: -6, fade: 10, grain: 18, gsize: 35, wheels: { s: [190, 10, 0], m: [0, 0, 0], h: [38, 16, 0] }, mix: { Orange: [0, -6, 8], Green: [-18, -25, 0], Blue: [-6, -15, 0] }, curve: { m: fade(0.05, 0.97) } },
      "Portra 800": { exp: 4, con: -4, sh: 14, temp: 16, tint: 6, sat: 4, grain: 26, gsize: 45, wheels: { s: [200, 14, 0], h: [30, 18, 0] }, curve: { m: fade(0.04) } },
      "Ektar 100": { con: 22, vib: 30, sat: 12, temp: 4, wheels: { h: [25, 10, 0] }, mix: { Red: [0, 15, -6], Blue: [6, 20, -10] }, curve: { m: S(0.04) } },
      "Gold 200": { exp: 4, temp: 26, tint: 4, sat: 6, sh: 10, grain: 16, wheels: { h: [42, 26, 0], s: [30, 8, 0] }, mix: { Yellow: [-6, 15, 0], Green: [-20, -15, 0] }, curve: { m: fade(0.04), b: [[0, 0.02], [1, 0.9]] } },
      "Fuji 400H": { exp: 8, con: -16, temp: -6, tint: -8, sat: -10, fade: 16, grain: 14, wheels: { s: [165, 16, 0], h: [80, 8, 0] }, mix: { Green: [20, 5, 8], Aqua: [0, 10, 0], Orange: [0, -10, 6] }, curve: { m: fade(0.07, 0.96) } },
      "Superia 400": { con: 10, temp: -4, tint: -10, sat: 6, grain: 22, gsize: 40, wheels: { s: [150, 18, 0], h: [55, 10, 0] }, mix: { Green: [15, 10, 0] }, curve: { g: [[0, 0.02], [0.5, 0.52], [1, 1]] } },
      "Velvia 50": { con: 30, vib: 40, sat: 30, bl: -10, mix: { Blue: [0, 30, -15], Green: [0, 25, -8], Red: [0, 20, -5] }, curve: { m: S(0.06) } },
      "CineStill 800T": { temp: -26, tint: 6, con: 8, hal: 70, bloom: 20, grain: 24, gsize: 45, wheels: { s: [205, 25, 0], h: [20, 14, 0] }, mix: { Red: [0, 10, 0], Orange: [-10, 0, 0] }, curve: { m: fade(0.04) } },
      Kodachrome: { con: 24, sat: 24, temp: 8, hi: -12, bl: -6, wheels: { s: [220, 12, 0], h: [35, 10, 0] }, mix: { Red: [-4, 25, -8], Blue: [8, 15, -12], Yellow: [0, 10, 0] }, curve: { m: S(0.05) } },
      "Polaroid 600": { exp: 6, con: -18, sat: -18, temp: 10, fade: 30, vig: 30, grain: 12, wheels: { s: [180, 20, 0], h: [45, 20, 0] }, curve: { m: fade(0.1, 0.92), b: [[0, 0.08], [1, 0.95]] } },
      "Tri-X 400 (B&W)": { sat: -100, con: 30, grain: 34, gsize: 45, vig: 16, curve: { m: S(0.06) } },
      "HP5 Plus (B&W)": { sat: -100, con: 10, sh: 14, fade: 14, grain: 26, curve: { m: fade(0.05, 0.96) } },
    },
    Cinema: {
      "Teal & orange": { con: 16, sat: 10, wheels: { s: [190, 40, -4], h: [28, 34, 0] }, mix: { Orange: [-4, 15, 6], Blue: [-15, 10, -5], Aqua: [0, 15, 0] }, vig: 20 },
      "Neon noir": { exp: -10, con: 24, temp: -30, tint: 22, sat: 14, bloom: 30, wheels: { s: [245, 35, -6], h: [320, 18, 0] }, mix: { Red: [-15, 25, 0], Blue: [15, 25, 0] }, vig: 40 },
      "The Matrix": { con: 18, tint: -40, sat: -20, wheels: { s: [130, 30, 0], m: [110, 20, 0], h: [90, 12, 0] }, curve: { g: [[0, 0.03], [0.5, 0.56], [1, 1]] }, vig: 30 },
      "Pastel symmetry": { exp: 8, con: -20, sat: 4, vib: 10, fade: 18, temp: 6, wheels: { s: [330, 10, 6], h: [45, 14, 0] }, mix: { Red: [10, -10, 10], Yellow: [0, 10, 10], Aqua: [0, -10, 12] }, curve: { m: fade(0.08) } },
      "Desert epic": { temp: 34, con: 14, sat: -14, hi: -20, wheels: { s: [30, 20, 0], m: [35, 14, 0], h: [40, 12, 0] }, mix: { Blue: [-40, -50, 0], Aqua: [-30, -40, 0] }, curve: { m: fade(0.04, 0.95) } },
      "Sickly green": { tint: -18, temp: 6, sat: -24, con: 12, wheels: { s: [100, 20, 0], h: [70, 20, 0] }, fade: 10, vig: 25, grain: 12 },
      "Wasteland": { temp: 30, con: 30, sat: 20, clar: 30, wheels: { s: [200, 30, 0], h: [30, 30, 0] }, mix: { Blue: [-10, 30, -15] }, vig: 30 },
      "Moonlight": { temp: -14, tint: 12, con: 12, sat: 10, wheels: { s: [235, 30, 0], m: [280, 10, 0], h: [190, 14, 0] }, mix: { Orange: [0, 10, 6] } },
      "Bleach bypass": { con: 34, sat: -55, clar: 30, sh: -10, hi: -10, grain: 14, vig: 20 },
      "Day for night": { exp: -40, temp: -45, sat: -40, con: 12, wheels: { s: [225, 25, -10], h: [210, 20, 0] }, vig: 35 },
    },
    Mood: {
      "Golden hour": { exp: 8, temp: 38, sat: 12, sh: 10, bloom: 25, wheels: { h: [32, 30, 0] }, vig: 16 },
      "Moody forest": { exp: -8, con: 14, temp: -6, sat: -20, wheels: { s: [180, 18, -5] }, mix: { Green: [-20, -30, -20], Yellow: [-25, -20, -10] }, vig: 30, fade: 8 },
      "Vintage 70s": { temp: 26, tint: 8, sat: -10, fade: 26, grain: 22, wheels: { s: [30, 16, 0], h: [45, 26, 0] }, mix: { Green: [-25, -20, 0], Blue: [-10, -25, 0] }, curve: { m: fade(0.09, 0.93), b: [[0, 0.06], [1, 0.88]] }, vig: 26 },
      Cyberpunk: { con: 20, tint: 30, temp: -16, sat: 30, bloom: 30, wheels: { s: [260, 35, 0], h: [315, 30, 0] }, mix: { Yellow: [-30, 10, 0], Green: [60, 0, 0] }, vig: 30 },
      Arctic: { exp: 10, temp: -32, sat: -26, con: -6, wheels: { s: [205, 20, 0], h: [195, 12, 0] }, fade: 12 },
      Sepia: { sat: -100, wheels: { s: [30, 40, 0], m: [35, 30, 0], h: [45, 20, 0] }, fade: 14, grain: 16, vig: 26 },
      "Matte fade": { con: -14, fade: 40, sat: -8, curve: { m: fade(0.12, 0.93) } },
      "Infrared": { tint: 40, sat: 10, wheels: { s: [300, 10, 0], h: [330, 10, 0] }, mix: { Green: [-120, 40, 40], Yellow: [-80, 20, 30], Blue: [20, 0, -20] }, bloom: 30 },
      "Dreamy": { exp: 6, con: -16, bloom: 60, hal: 20, sat: -6, fade: 16, wheels: { h: [320, 10, 0] } },
    },
  };
  const ALL = Object.fromEntries(Object.values(LOOKS).flatMap((g) => Object.entries(g)));
  // Expand a look into full params, at a given strength (0–1).
  function lookParams(name, k = 1) {
    const p = neutral(); if (!name || !ALL[name]) return p; const L = ALL[name];
    Object.keys(p).forEach((key) => { if (typeof p[key] === "number" && L[key] != null) p[key] = key === "gsize" ? L[key] : L[key] * k; });
    if (L.wheels) Object.entries(L.wheels).forEach(([w, [h, a, l]]) => (p.wheels[w] = [h, a * k, l * k]));
    if (L.mix) Object.entries(L.mix).forEach(([band, v]) => { const i = BANDS.findIndex((b) => b[0] === band); p.mix[i] = v.map((x) => x * k); });
    if (L.curve) Object.entries(L.curve).forEach(([c, pts]) => (p.curve[c] = pts.map(([x, y]) => [x, x + (y - x) * k])));
    return p;
  }
  let P = neutral(), look = null, strength = 1;

  /* ---------- GPU ---------- */
  const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false });
  if (!gl) { note.textContent = "This needs WebGL, which isn't available in this browser."; return; }
  const VS = "attribute vec2 a; varying vec2 v; void main(){ v = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }";
  const FS = `precision highp float; varying vec2 v;
  uniform sampler2D uImg, uBlur, uCurve; uniform vec2 uRes; uniform float uSplit, uLut, uSeed;
  uniform float exp_, con, hi, sh, wh, bl, temp, tint, vib, sat, clar, fade, bloom, hal, grain, gsize, vig;
  uniform vec3 wS, wM, wH; uniform vec3 mixA[8]; uniform float bandC[8];
  vec3 hsl2rgb(vec3 c){ vec3 rgb = clamp(abs(mod(c.x*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); return c.z + c.y*(rgb-.5)*(1.-abs(2.*c.z-1.)); }
  vec3 rgb2hsl(vec3 c){ float mx = max(c.r,max(c.g,c.b)), mn = min(c.r,min(c.g,c.b)), l = (mx+mn)*.5, d = mx-mn; if (d < 1e-5) return vec3(0.,0.,l);
    float s = d / (1. - abs(2.*l - 1.)); float h = mx == c.r ? mod((c.g-c.b)/d, 6.) : mx == c.g ? (c.b-c.r)/d + 2. : (c.r-c.g)/d + 4.; return vec3(h/6., s, l); }
  float lum(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uSeed) * 43758.5453); }
  vec3 wheel(vec3 w){ return (hsl2rgb(vec3(w.x/360., 1., .5)) - .5) * w.y / 100.; }
  void main(){
    vec2 uv = vec2(v.x, 1. - v.y);
    vec3 src, c, blur;
    if (uLut > .5) { float x = floor(gl_FragCoord.x), y = floor(gl_FragCoord.y); src = vec3(mod(x, 33.), y, floor(x / 33.)) / 32.; blur = src; }
    else { src = texture2D(uImg, uv).rgb; blur = texture2D(uBlur, uv).rgb; }
    c = src;
    c *= vec3(1. + .22*temp, 1. + .02*temp - .16*tint, 1. - .22*temp) * vec3(1. + .08*tint, 1., 1. + .08*tint);
    c *= exp2(exp_ * 2.);
    if (uLut < .5) { float d = lum(src) - lum(blur); c += d * clar * 1.6 * (1. - abs(lum(c) * 2. - 1.)); }
    float L = lum(c);
    c *= 1. + hi * .55 * smoothstep(.45, 1., L);
    c += sh * .28 * (1. - smoothstep(0., .55, L)) * (sh > 0. ? (1. - c) : c);
    c *= 1. + wh * .25 * smoothstep(.65, 1., L);
    c = max(c + bl * .1 * (1. - smoothstep(0., .35, L)), 0.);
    c = clamp(c, 0., 1.);
    if (con > 0.) c = mix(c, c * c * (3. - 2. * c), con * 1.1); else c = .5 + (c - .5) * (1. + con * .7);
    L = lum(c); float s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    c = L + (c - L) * (1. + vib * (1. - s) * 1.3); c = L + (c - L) * (1. + sat);
    c = clamp(c, 0., 1.);
    vec3 h = rgb2hsl(c); float dh = 0., ds = 0., dl = 0.;
    for (int i = 0; i < 8; i++) { float d = abs(h.x * 360. - bandC[i]); d = min(d, 360. - d); float w = max(0., 1. - d / 40.) * smoothstep(0., .15, h.y); dh += w * mixA[i].x; ds += w * mixA[i].y; dl += w * mixA[i].z; }
    h.x = fract(h.x + dh * 30. / 360. + 1.); h.y = clamp(h.y * (1. + ds), 0., 1.); h.z = clamp(h.z + dl * .2 * h.y, 0., 1.);
    c = hsl2rgb(h);
    L = lum(c); float ws = pow(1. - L, 2.), wh2 = L * L, wm = clamp(1. - ws - wh2, 0., 1.);
    c += wheel(wS) * .45 * ws + wheel(wM) * .35 * wm + wheel(wH) * .4 * wh2;
    c += vec3(wS.z * .002 * ws + wM.z * .0025 * wm + wH.z * .002 * wh2);
    c = clamp(c, 0., 1.);
    c = vec3(texture2D(uCurve, vec2(c.r * 255./256. + .5/256., .5)).r, texture2D(uCurve, vec2(c.g * 255./256. + .5/256., .5)).g, texture2D(uCurve, vec2(c.b * 255./256. + .5/256., .5)).b);
    c = c * (1. - fade * .2) + fade * .08;
    if (uLut < .5) {
      float bL = lum(blur);
      c += max(blur - .55, 0.) * bloom * 1.4;
      c += vec3(1., .32, .12) * max(bL - .6, 0.) * hal * 2.6;
      vec2 q = (uv - .5) * vec2(uRes.x / uRes.y, 1.); c *= 1. - vig * smoothstep(.25, .95, length(q)) * .85;
      float gs = 1. + gsize * .04, n = hash(floor(gl_FragCoord.xy / gs)) - .5; c += n * grain * .2 * (.4 + .6 * (1. - abs(lum(c) * 2. - 1.)));
      if (v.x < uSplit) c = src;
    }
    gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
  }`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = new Proxy({}, { get: (o, k) => (o[k] ??= gl.getUniformLocation(prog, k)) });
  const tex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b)); return t; };
  const tImg = tex(0), tBlur = tex(1), tCurve = tex(2);
  gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uBlur, 1); gl.uniform1i(U.uCurve, 2);
  gl.uniform1fv(U.bandC, BANDS.map((b) => b[1]));
  const upload = (unit, t, src) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };

  // Monotone cubic spline through the curve points (no overshoot), sampled to 256 values.
  function spline(pts) {
    const p = [...pts].sort((a, b) => a[0] - b[0]), n = p.length, out = new Float32Array(256);
    const dx = [], m = [], d = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0] || 1e-6; d[i] = (p[i + 1][1] - p[i][1]) / dx[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / d[i - 1] + (dx[i] + 2 * dx[i - 1]) / d[i]);
    for (let k = 0; k < 256; k++) {
      const x = k / 255; let i = 0; while (i < n - 2 && x > p[i + 1][0]) i++;
      if (x <= p[0][0]) { out[k] = p[0][1]; continue; } if (x >= p[n - 1][0]) { out[k] = p[n - 1][1]; continue; }
      const h = dx[i], t = (x - p[i][0]) / h, t2 = t * t, t3 = t2 * t;
      out[k] = clamp((2 * t3 - 3 * t2 + 1) * p[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * p[i + 1][1] + (t3 - t2) * h * m[i + 1]);
    }
    return out;
  }
  function curveTexture() {
    const M = spline(P.curve.m), ch = ["r", "g", "b"].map((c) => spline(P.curve[c])), px = new Uint8Array(256 * 4);
    for (let k = 0; k < 256; k++) { for (let c = 0; c < 3; c++) px[k * 4 + c] = Math.round(ch[c][Math.round(M[k] * 255)] * 255); px[k * 4 + 3] = 255; }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tCurve); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  }
  let hasImg = false, sx = 0, seed = Math.random() * 100;
  function setUniforms(p, lut = false) {
    ["con", "hi", "sh", "wh", "bl", "temp", "tint", "vib", "sat", "clar", "fade", "bloom", "hal", "grain", "vig"].forEach((k) => gl.uniform1f(U[k], p[k] / 100));
    gl.uniform1f(U.exp_, p.exp / 100); gl.uniform1f(U.gsize, p.gsize);
    gl.uniform3fv(U.wS, p.wheels.s); gl.uniform3fv(U.wM, p.wheels.m); gl.uniform3fv(U.wH, p.wheels.h);
    gl.uniform3fv(U.mixA, p.mix.flatMap((v) => v.map((x) => x / 100)));
    gl.uniform1f(U.uLut, lut ? 1 : 0); gl.uniform1f(U.uSeed, seed);
  }
  function render(p = P, splitAt = sx) {
    if (!hasImg) return;
    const saved = P; P = p; curveTexture(); P = saved;
    gl.viewport(0, 0, cv.width, cv.height); setUniforms(p); gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uSplit, splitAt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { render(); split.style.left = sx * 100 + "%"; split.hidden = sx <= 0; histogram(); }); };

  /* ---------- Histogram ---------- */
  const hcv = $(".grade__hist"), hg = hcv.getContext("2d"), small = document.createElement("canvas"); small.width = 240; small.height = 160;
  const sg = small.getContext("2d", { willReadFrequently: true });
  let histT;
  function histogram() {
    clearTimeout(histT); histT = setTimeout(() => {
      sg.drawImage(cv, 0, 0, small.width, small.height); const d = sg.getImageData(0, 0, small.width, small.height).data, H = [0, 1, 2].map(() => new Float32Array(64));
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) H[c][d[i + c] >> 2]++;
      const max = Math.max(...H.flatMap((h) => [...h].slice(1, 63))) || 1, W = hcv.width, Ht = hcv.height;
      hg.clearRect(0, 0, W, Ht); hg.globalCompositeOperation = "lighter";
      ["#FF4D4D", "#3DDC84", "#4D8DFF"].forEach((col, c) => { hg.fillStyle = col; hg.globalAlpha = 0.55; hg.beginPath(); hg.moveTo(0, Ht); H[c].forEach((v, i) => hg.lineTo((i / 63) * W, Ht - Math.min(1, v / max) * Ht)); hg.lineTo(W, Ht); hg.fill(); });
      hg.globalAlpha = 1; hg.globalCompositeOperation = "source-over";
    }, 80);
  }

  /* ---------- Images ---------- */
  function scenePhoto(w, h) {
    // A sample photo: dusk sky, sun, hills, a lake, trees and a person, with a full range of tones and colours.
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, "#2E3E7A"); sky.addColorStop(0.5, "#C76B7E"); sky.addColorStop(1, "#FFB46B"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.66, h * 0.5, 0, w * 0.66, h * 0.5, h * 0.22); sun.addColorStop(0, "#FFF8E6"); sun.addColorStop(0.2, "rgba(255,214,140,.85)"); sun.addColorStop(1, "rgba(255,180,107,0)"); g.fillStyle = sun; g.fillRect(0, 0, w, h);
    [["#5B4A7A", 0.5, 0.17, 230], ["#3B4A55", 0.56, 0.12, 160], ["#25402E", 0.61, 0.08, 90]].forEach(([col, base, amp, f], k) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 6) g.lineTo(x, h * base - Math.abs(Math.sin(x / f + k * 2)) * h * amp - Math.sin(x / 41 + k) * h * 0.01); g.lineTo(w, h); g.fill(); });
    const wl = h * 0.66; g.save(); g.globalAlpha = 0.5; g.translate(0, wl * 2); g.scale(1, -1); g.drawImage(c, 0, 0, w, wl, 0, 0, w, wl); g.restore();
    g.fillStyle = "rgba(20,50,80,.3)"; g.fillRect(0, wl, w, h - wl);
    g.strokeStyle = "rgba(255,255,255,.14)"; for (let y = wl + 5; y < h; y += 6) { const x = (Math.sin(y * 13.1) * 0.5 + 0.5) * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + (y % 50), y); g.stroke(); }
    g.fillStyle = "#14261A"; for (let i = 0; i < 9; i++) { const x = ((i * 0.137 + 0.05) % 1) * w, s = h * (0.06 + (i % 3) * 0.03); g.beginPath(); g.moveTo(x, wl); g.lineTo(x - s * 0.35, wl); g.lineTo(x, wl - s * 1.6); g.lineTo(x + s * 0.35, wl); g.fill(); }
    // A person in a red jacket and blue jeans, so the colour mixer has skin, red and blue to work on.
    const px = w * 0.38, py = wl; g.fillStyle = "#2F4F8F"; g.fillRect(px - h * 0.012, py - h * 0.07, h * 0.024, h * 0.07); g.fillStyle = "#C8322B"; g.fillRect(px - h * 0.016, py - h * 0.12, h * 0.032, h * 0.055); g.fillStyle = "#E0A982"; g.beginPath(); g.arc(px, py - h * 0.135, h * 0.014, 0, 7); g.fill();
    g.fillStyle = "#F3D34A"; g.fillRect(w * 0.82, wl - h * 0.03, h * 0.05, h * 0.03); g.fillStyle = "#3BA55C"; g.fillRect(w * 0.12, h * 0.9, w * 0.2, h * 0.1);
    return c;
  }
  function use(img, name) {
    const max = Math.min(3000, gl.getParameter(gl.MAX_TEXTURE_SIZE)), k = Math.min(1, max / Math.max(img.width, img.height));
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    upload(0, tImg, c);
    // Pre-blurred copy for clarity, bloom and halation.
    const b = document.createElement("canvas"); b.width = Math.max(1, Math.round(c.width / 4)); b.height = Math.max(1, Math.round(c.height / 4));
    const bg = b.getContext("2d"); bg.filter = `blur(${Math.max(2, Math.round(b.width / 60))}px)`; bg.drawImage(c, 0, 0, b.width, b.height); upload(1, tBlur, b);
    hasImg = true; later(); thumbs();
    if (name) note.textContent = `${name} · ${c.width}×${c.height} · stays on your device.`;
  }

  /* ---------- Panel: tabs, looks, sliders, curves, mixer, wheels ---------- */
  const TABS = ["Looks", "Light", "Colour", "Curves", "Mixer", "Wheels", "Effects"];
  panel.innerHTML = `<div class="grade__tabs" role="tablist">${TABS.map((t, i) => `<button role="tab" class="grade__tab${i ? "" : " on"}" data-tab="${t}">${t}</button>`).join("")}</div>` +
    TABS.map((t, i) => `<div class="grade__pane" data-pane="${t}" ${i ? "hidden" : ""}></div>`).join("");
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => { $$("[data-tab]").forEach((x) => x.classList.toggle("on", x === b)); $$("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab)); if (b.dataset.tab === "Curves") drawCurve(); if (b.dataset.tab === "Wheels") drawWheels(); }));
  const pane = (t) => $(`[data-pane="${t}"]`);

  // Looks: a grid of live thumbnails.
  pane("Looks").innerHTML = `<label class="xrange xrange--wide grade__strength">Strength <input type="range" min="0" max="100" value="100" data-strength><output>100%</output></label>` +
    Object.entries(LOOKS).map(([grp, looks]) => `<h4 class="grade__group">${grp}</h4><div class="grade__looks">${Object.keys(looks).map((n) => `<button class="grade__look" data-look="${n}"><canvas width="120" height="80"></canvas><span>${n}</span></button>`).join("")}</div>`).join("");
  const strengthIn = $("[data-strength]");
  $$("[data-look]").forEach((b) => b.addEventListener("click", () => {
    look = look === b.dataset.look ? null : b.dataset.look;
    $$("[data-look]").forEach((x) => x.classList.toggle("on", x.dataset.look === look));
    P = lookParams(look, strength); syncControls(); later();
  }));
  strengthIn.addEventListener("input", () => { strength = strengthIn.value / 100; strengthIn.nextElementSibling.textContent = strengthIn.value + "%"; if (look) { P = lookParams(look, strength); syncControls(); later(); } });
  let thumbT;
  function thumbs() {
    clearTimeout(thumbT); thumbT = setTimeout(() => {
      $$("[data-look]").forEach((b) => { render(lookParams(b.dataset.look), 0); const t = $("canvas", b), g = t.getContext("2d"), k = Math.max(t.width / cv.width, t.height / cv.height); g.drawImage(cv, (t.width - cv.width * k) / 2, (t.height - cv.height * k) / 2, cv.width * k, cv.height * k); });
      render();
    }, 50);
  }

  // Sliders for Light, Colour, Effects.
  Object.entries(SLIDERS).forEach(([tab, list]) => {
    pane(tab).innerHTML = `<div class="grade__sliders">${list.map(([k, name, min = -100]) => `<label class="xrange xrange--wide">${name} <input type="range" min="${min}" max="100" value="0" data-p="${k}"><output></output></label>`).join("")}</div>`;
  });
  $$("[data-p]").forEach((el) => {
    el.addEventListener("input", () => { P[el.dataset.p] = +el.value; el.nextElementSibling.textContent = el.value; later(); });
    el.addEventListener("dblclick", () => { el.value = el.dataset.p === "gsize" ? 30 : 0; el.dispatchEvent(new Event("input")); });
  });
  pane("Light").insertAdjacentHTML("beforeend", `<p class="xnote">Double-click any slider to reset it.</p>`);

  // Colour mixer: hue, saturation and luminance for 8 colour bands.
  pane("Mixer").innerHTML = `<div class="grade__mixmode">${["Hue", "Saturation", "Luminance"].map((m, i) => `<button class="xbtn${i ? "" : " xbtn--main"}" data-mixmode="${i}">${m}</button>`).join("")}</div><div class="grade__sliders">${BANDS.map(([n, h], i) => `<label class="xrange xrange--wide"><i class="grade__chip" style="background:hsl(${h} 85% 55%)"></i>${n} <input type="range" min="-100" max="100" value="0" data-band="${i}"><output>0</output></label>`).join("")}</div>`;
  let mixMode = 0;
  $$("[data-mixmode]").forEach((b) => b.addEventListener("click", () => { mixMode = +b.dataset.mixmode; $$("[data-mixmode]").forEach((x) => x.classList.toggle("xbtn--main", x === b)); syncControls(); }));
  $$("[data-band]").forEach((el) => el.addEventListener("input", () => { P.mix[+el.dataset.band][mixMode] = +el.value; el.nextElementSibling.textContent = el.value; later(); }));

  // Curves: drag points, click to add, double-click to remove.
  pane("Curves").innerHTML = `<div class="grade__mixmode">${[["m", "RGB"], ["r", "Red"], ["g", "Green"], ["b", "Blue"]].map(([c, n], i) => `<button class="xbtn${i ? "" : " xbtn--main"}" data-curve="${c}">${n}</button>`).join("")}<button class="xbtn" data-curve-reset>Reset curve</button></div><canvas class="grade__curve" width="512" height="512" aria-label="Tone curve. Drag points, click to add, double-click to remove."></canvas><p class="xnote">Drag a point. Click the line to add one, double-click a point to remove it.</p>`;
  const ccv = $(".grade__curve"), cg = ccv.getContext("2d"); let chan = "m", dragI = -1;
  const CCOL = { m: "#F1EFEA", r: "#FF5A5A", g: "#3DDC84", b: "#5A9BFF" };
  function drawCurve() {
    const W = ccv.width; cg.fillStyle = "#0E0D13"; cg.fillRect(0, 0, W, W);
    cg.strokeStyle = "#26242F"; cg.lineWidth = 1; for (let i = 1; i < 4; i++) { cg.beginPath(); cg.moveTo((i * W) / 4, 0); cg.lineTo((i * W) / 4, W); cg.moveTo(0, (i * W) / 4); cg.lineTo(W, (i * W) / 4); cg.stroke(); }
    cg.strokeStyle = "#3A3846"; cg.beginPath(); cg.moveTo(0, W); cg.lineTo(W, 0); cg.stroke();
    Object.keys(CCOL).filter((c) => c !== chan).forEach((c) => { const s = spline(P.curve[c]); cg.strokeStyle = CCOL[c] + "44"; cg.beginPath(); s.forEach((y, k) => cg.lineTo((k / 255) * W, W - y * W)); cg.stroke(); });
    const s = spline(P.curve[chan]); cg.strokeStyle = CCOL[chan]; cg.lineWidth = 3; cg.beginPath(); s.forEach((y, k) => cg.lineTo((k / 255) * W, W - y * W)); cg.stroke();
    P.curve[chan].forEach(([x, y]) => { cg.fillStyle = "#0E0D13"; cg.strokeStyle = CCOL[chan]; cg.lineWidth = 3; cg.beginPath(); cg.arc(x * W, W - y * W, 9, 0, 7); cg.fill(); cg.stroke(); });
  }
  const cpos = (e) => { const r = ccv.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width), clamp(1 - (e.clientY - r.top) / r.height)]; };
  ccv.addEventListener("pointerdown", (e) => {
    const [x, y] = cpos(e), pts = P.curve[chan];
    dragI = pts.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.04);
    if (dragI < 0) { pts.push([x, y]); pts.sort((a, b) => a[0] - b[0]); dragI = pts.findIndex((p) => p[0] === x); }
    ccv.setPointerCapture(e.pointerId); drawCurve(); later();
  });
  ccv.addEventListener("pointermove", (e) => {
    if (dragI < 0) return; const [x, y] = cpos(e), pts = P.curve[chan], last = pts.length - 1;
    const lo = dragI === 0 ? 0 : pts[dragI - 1][0] + 0.01, hi = dragI === last ? 1 : pts[dragI + 1][0] - 0.01;
    pts[dragI] = [dragI === 0 ? Math.min(x, hi) : dragI === last ? Math.max(x, lo) : clamp(x, lo, hi), y]; drawCurve(); later();
  });
  ccv.addEventListener("pointerup", () => (dragI = -1));
  ccv.addEventListener("dblclick", (e) => { const [x, y] = cpos(e), pts = P.curve[chan], i = pts.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.04); if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); drawCurve(); later(); } });
  $$("[data-curve]").forEach((b) => b.addEventListener("click", () => { chan = b.dataset.curve; $$("[data-curve]").forEach((x) => x.classList.toggle("xbtn--main", x === b)); drawCurve(); }));
  $("[data-curve-reset]").addEventListener("click", () => { P.curve[chan] = [[0, 0], [1, 1]]; drawCurve(); later(); });

  // Colour wheels: drag the dot towards a colour to tint shadows, midtones or highlights.
  pane("Wheels").innerHTML = `<div class="grade__wheels">${[["s", "Shadows"], ["m", "Midtones"], ["h", "Highlights"]].map(([w, n]) => `<div class="grade__wheel"><canvas width="220" height="220" data-wheel="${w}" aria-label="${n} colour wheel"></canvas><b>${n}</b><label class="xrange">Level <input type="range" min="-100" max="100" value="0" data-wlum="${w}"></label></div>`).join("")}</div><p class="xnote">Drag a dot towards a colour. Double-click a wheel to reset it.</p>`;
  const wheelBase = (() => { const c = document.createElement("canvas"); c.width = c.height = 220; const g = c.getContext("2d"), id = g.createImageData(220, 220);
    for (let y = 0; y < 220; y++) for (let x = 0; x < 220; x++) { const dx = x - 110, dy = y - 110, r = Math.hypot(dx, dy) / 100, i = (y * 220 + x) * 4; if (r > 1) continue; const h = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360, [R, G, B] = hslRGB(h, r * 0.75, 0.5 + (1 - r) * 0.12); id.data.set([R, G, B, 255], i); }
    g.putImageData(id, 0, 0); return c; })();
  function hslRGB(h, s, l) { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255]; }
  function drawWheels() {
    $$("[data-wheel]").forEach((c) => {
      const g = c.getContext("2d"), [h, a] = P.wheels[c.dataset.wheel], r = (a / 100) * 100, ang = (h * Math.PI) / 180;
      g.clearRect(0, 0, 220, 220); g.drawImage(wheelBase, 0, 0); g.strokeStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.moveTo(110, 0); g.lineTo(110, 220); g.moveTo(0, 110); g.lineTo(220, 110); g.stroke();
      const x = 110 + Math.cos(ang) * r, y = 110 - Math.sin(ang) * r; g.lineWidth = 3; g.strokeStyle = "#fff"; g.fillStyle = "#16151A"; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.stroke();
    });
    $$("[data-wlum]").forEach((el) => (el.value = P.wheels[el.dataset.wlum][2]));
  }
  $$("[data-wheel]").forEach((c) => {
    const setW = (e) => { const r = c.getBoundingClientRect(), dx = ((e.clientX - r.left) / r.width) * 220 - 110, dy = ((e.clientY - r.top) / r.height) * 220 - 110; const w = P.wheels[c.dataset.wheel]; w[0] = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360; w[1] = Math.min(100, Math.hypot(dx, dy)); drawWheels(); later(); };
    let down = false;
    c.addEventListener("pointerdown", (e) => { down = true; c.setPointerCapture(e.pointerId); setW(e); });
    c.addEventListener("pointermove", (e) => down && setW(e)); c.addEventListener("pointerup", () => (down = false));
    c.addEventListener("dblclick", () => { P.wheels[c.dataset.wheel] = [0, 0, 0]; drawWheels(); later(); });
  });
  $$("[data-wlum]").forEach((el) => el.addEventListener("input", () => { P.wheels[el.dataset.wlum][2] = +el.value; later(); }));

  function syncControls() {
    $$("[data-p]").forEach((el) => { el.value = P[el.dataset.p]; el.nextElementSibling.textContent = Math.round(P[el.dataset.p]); });
    $$("[data-band]").forEach((el) => { const v = Math.round(P.mix[+el.dataset.band][mixMode]); el.value = v; el.nextElementSibling.textContent = v; });
    drawCurve(); drawWheels();
  }

  /* ---------- Compare, export ---------- */
  const setSplit = (e) => { const r = cv.getBoundingClientRect(); sx = clamp((e.clientX - r.left) / r.width); later(); };
  let dragging = false;
  cv.addEventListener("pointerdown", (e) => { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch {} setSplit(e); });
  cv.addEventListener("pointermove", (e) => dragging && setSplit(e));
  cv.addEventListener("pointerup", () => (dragging = false));
  const cmp = $("[data-act=compare]");
  cmp.addEventListener("pointerdown", () => { render(P, 1.01); }); ["pointerup", "pointerleave"].forEach((ev) => cmp.addEventListener(ev, () => later()));
  $("[data-act=reset]").addEventListener("click", () => { P = neutral(); look = null; sx = 0; $$("[data-look]").forEach((x) => x.classList.remove("on")); syncControls(); later(); });
  $("[data-act=file]").addEventListener("change", (e) => { const f = e.target.files[0]; if (!f) return; const i = new Image(); i.onload = () => use(i, f.name); i.src = URL.createObjectURL(f); });
  $("[data-act=save]").addEventListener("click", () => { render(P, 0); save(cv.toDataURL("image/jpeg", 0.95), `graded${look ? "-" + look.toLowerCase().replace(/\W+/g, "-") : ""}.jpg`); later(); });
  // .cube LUT: run the same colour pipeline over a 33×33×33 grid of colours (spatial effects like grain are left out).
  $("[data-act=lut]").addEventListener("click", () => {
    const N = 33, w = cv.width, h = cv.height; cv.width = N * N; cv.height = N;
    curveTexture(); gl.viewport(0, 0, N * N, N); setUniforms(P, true); gl.uniform2f(U.uRes, N * N, N); gl.uniform1f(U.uSplit, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const px = new Uint8Array(N * N * N * 4); gl.readPixels(0, 0, N * N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const lines = [`TITLE "${look || "MNV grade"}"`, `LUT_3D_SIZE ${N}`, "DOMAIN_MIN 0 0 0", "DOMAIN_MAX 1 1 1"];
    for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) { const i = (g * N * N + b * N + r) * 4; lines.push(`${(px[i] / 255).toFixed(6)} ${(px[i + 1] / 255).toFixed(6)} ${(px[i + 2] / 255).toFixed(6)}`); }
    save(URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" })), `${(look || "my-grade").toLowerCase().replace(/\W+/g, "-")}.cube`);
    cv.width = w; cv.height = h; later();
    note.textContent = "LUT saved. Load the .cube in Premiere (Lumetri), DaVinci Resolve, Final Cut or CapCut to grade video the same way.";
  });
  window.mnvSamplePhoto = scenePhoto;
  root._lutTest = () => $("[data-act=lut]").click();

  syncControls();
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); use(scenePhoto(1500, 1000)); } }, { rootMargin: "300px" }).observe(root);
})();
