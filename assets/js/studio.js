/* Side quests: Flow fields, Zine maker, Ambient room.
   All run on the visitor's device; nothing is uploaded. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const exp = (id) => document.querySelector(`[data-x="${id}"]`);
  const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
  const saveURL = (url, name) => { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); };
  const onView = (el, fn) => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: "300px" }).observe(el);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const loadImg = (file) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = URL.createObjectURL(file); });
  const D = '"Bricolage Grotesque", system-ui, sans-serif', M = '"JetBrains Mono", ui-monospace, monospace', HAND = 'Caveat, "Segoe Print", cursive';
  const rng = (seed) => { let t = seed >>> 0 || 1; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const sample = (w, h) => (window.mnvSamplePhoto ? window.mnvSamplePhoto(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
  // Simple seeded 2D value-gradient noise (Perlin style).
  function noise2(seed) {
    const r = rng(seed), p = Array.from({ length: 256 }, (_, i) => i).sort(() => r() - 0.5), perm = [...p, ...p];
    const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
      const l1 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
      const l2 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
      return l1 + v * (l2 - l1);   // about −1 to 1
    };
  }

  /* ===================================================================================
     Flow fields: lines that follow a noise current
     =================================================================================== */
  (() => {
    const root = exp("flow"); if (!root) return;
    const cv = $(".flow__cv", root), styleSel = act(root, "style"), palSel = act(root, "pal"), fmtSel = act(root, "fmt"), note = act(root, "note");
    const PALS = {
      Desert: ["#F2E8D5", "#C8553D", "#F28F3B", "#588B8B", "#2D3047", "#FFD5C2"], Midnight: ["#0B0C1E", "#3D3AE8", "#6E6BFF", "#F17FA6", "#FFB224", "#E8E6F5"],
      Matisse: ["#F4EFE6", "#1F4E8C", "#E2533A", "#F2B33D", "#2E8B57", "#111111"], Ink: ["#F3F0E8", "#151515", "#151515", "#444444", "#8A8A8A", "#C23B22"],
      Ocean: ["#06283D", "#1363DF", "#47B5FF", "#DFF6FF", "#5DD39E", "#F7F7F2"], Bloom: ["#FFF4EC", "#FF7AA2", "#FFB4A2", "#B5838D", "#6D6875", "#E5989B"],
      Acid: ["#0D0D0D", "#C6FF00", "#00E5FF", "#FF2E88", "#FFFFFF", "#7C4DFF"], Forest: ["#E9E5D6", "#283618", "#606C38", "#DDA15E", "#BC6C25", "#FEFAE0"],
      Sunset: ["#2B1B3D", "#F2735F", "#FFC46B", "#B3446C", "#5C2A6E", "#FFE8D1"], Mono: ["#111111", "#FAFAFA", "#D0D0D0", "#9A9A9A", "#FAFAFA", "#FFFFFF"],
    };
    const STYLES = ["Ribbons", "Fine lines", "Dots", "Contours", "Bands"];
    STYLES.forEach((s) => styleSel.add(new Option(s, s))); Object.keys(PALS).forEach((p) => palSel.add(new Option(p, p)));
    let seed = (Math.random() * 1e6) | 0;
    const val = (k) => +act(root, k).value;
    function paint(c, scale) {
      const g = c.getContext("2d"), W = c.width, H = c.height, U = Math.min(W, H) / 1000, r = rng(seed), pal = PALS[palSel.value], ink = pal.slice(1);
      const n = noise2(seed), turb = 0.6 + (val("turb") / 100) * 3.2, freq = (0.0012 + (val("turb") / 100) * 0.003) / U, dens = val("density") / 100, weight = 0.3 + (val("weight") / 100) * 2.2;
      const ang = (x, y) => n(x * freq, y * freq) * Math.PI * turb + n(x * freq * 3 + 50, y * freq * 3) * 0.4;
      g.fillStyle = pal[0]; g.fillRect(0, 0, W, H); g.lineCap = "round"; g.lineJoin = "round";
      const style = styleSel.value;
      if (style === "Contours") {
        // Iso-lines of the noise field (marching squares).
        const step = 6 * U, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1, f = new Float32Array(cols * rows);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[j * cols + i] = n(i * step * freq * 0.7, j * step * freq * 0.7) + 0.4 * n(i * step * freq * 2.1 + 9, j * step * freq * 2.1);
        const levels = Math.round(10 + dens * 40);
        for (let L = 0; L < levels; L++) {
          const t = -0.9 + (1.8 * L) / levels; g.strokeStyle = ink[L % ink.length]; g.lineWidth = weight * U * (L % 5 === 0 ? 2.4 : 1); g.beginPath();
          for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
            const a = f[j * cols + i], b = f[j * cols + i + 1], c2 = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i], pts = [];
            const edge = (v1, v2, x1, y1, x2, y2) => { if ((v1 > t) !== (v2 > t)) { const k = (t - v1) / (v2 - v1); pts.push([(x1 + (x2 - x1) * k) * step, (y1 + (y2 - y1) * k) * step]); } };
            edge(a, b, i, j, i + 1, j); edge(b, c2, i + 1, j, i + 1, j + 1); edge(d, c2, i, j + 1, i + 1, j + 1); edge(a, d, i, j, i, j + 1);
            if (pts.length >= 2) { g.moveTo(...pts[0]); g.lineTo(...pts[1]); if (pts.length === 4) { g.moveTo(...pts[2]); g.lineTo(...pts[3]); } }
          }
          g.stroke();
        }
        return;
      }
      // Streamlines that keep a minimum distance from each other, so the field reads clearly.
      const sep = (style === "Fine lines" ? 3 : style === "Dots" ? 9 : 7) * U * (1.6 - dens), cell = sep, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell), grid = new Map();
      const key = (x, y) => ((y / cell) | 0) * gw + ((x / cell) | 0);
      const free = (x, y, id) => { const cx = (x / cell) | 0, cy = (y / cell) | 0; for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) { const pts = grid.get(j * gw + i); if (pts) for (const p of pts) if (p[2] !== id && (p[0] - x) ** 2 + (p[1] - y) ** 2 < sep * sep) return false; } return true; };
      const add = (x, y, id) => { const k = key(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push([x, y, id]); };
      const tries = Math.round((style === "Fine lines" ? 9000 : 4000) * (0.4 + dens)), stepLen = 2.5 * U, maxLen = (style === "Fine lines" ? 500 : 340) * (0.6 + r() * 0.8);
      for (let t = 0; t < tries; t++) {
        let x = r() * W, y = r() * H; if (!free(x, y, -1)) continue;
        const id = t, pts = [[x, y]];
        for (const dir of [1, -1]) {
          let px = x, py = y;
          for (let s = 0; s < maxLen / stepLen * U; s++) {
            const a = ang(px, py); px += Math.cos(a) * stepLen * dir; py += Math.sin(a) * stepLen * dir;
            if (px < 0 || py < 0 || px > W || py > H || !free(px, py, id)) break;
            dir > 0 ? pts.push([px, py]) : pts.unshift([px, py]);
          }
        }
        if (pts.length < 8) continue;
        pts.forEach(([px, py]) => add(px, py, id));
        const col = style === "Bands" ? ink[Math.floor((pts[0][1] / H) * ink.length * 1.5 + n(pts[0][0] * 0.002, 0) * 2 + ink.length) % ink.length] : ink[(r() * ink.length) | 0];
        g.strokeStyle = g.fillStyle = col;
        if (style === "Dots") { for (let i = 0; i < pts.length; i += 5) { g.beginPath(); g.arc(pts[i][0], pts[i][1], weight * U * 1.6 * (0.6 + 0.4 * Math.sin(i / pts.length * Math.PI)), 0, 7); g.fill(); } continue; }
        const wBase = (style === "Ribbons" ? sep * (0.35 + r() * 0.5) : weight * U * 0.8) * (style === "Ribbons" ? weight / 1.4 : 1);
        if (style === "Ribbons") {
          // Tapered ribbon: build an outline from the centreline, wider in the middle.
          const L = [], R = [];
          pts.forEach(([px, py], i) => { const a = ang(px, py) + Math.PI / 2, wv = wBase * Math.sin((i / (pts.length - 1)) * Math.PI) ** 0.6; L.push([px + Math.cos(a) * wv, py + Math.sin(a) * wv]); R.push([px - Math.cos(a) * wv, py - Math.sin(a) * wv]); });
          g.beginPath(); L.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); R.reverse().forEach((p) => g.lineTo(...p)); g.closePath(); g.fill();
        } else { g.lineWidth = wBase; g.globalAlpha = style === "Fine lines" ? 0.85 : 1; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); g.globalAlpha = 1; }
      }
    }
    function preview() {
      const [fw, fh] = fmtSel.value.split("x").map(Number), k = 1100 / Math.max(fw, fh);
      cv.width = Math.round(fw * k); cv.height = Math.round(fh * k); cv.style.aspectRatio = `${fw} / ${fh}`;
      paint(cv); note.textContent = `Seed ${seed}. Same seed and settings, same artwork.`;
    }
    let t; const later = () => { clearTimeout(t); t = setTimeout(preview, 150); };
    [styleSel, palSel, fmtSel].forEach((el) => el.addEventListener("change", preview));
    ["density", "turb", "weight"].forEach((k) => act(root, k).addEventListener("input", later));
    act(root, "gen").addEventListener("click", () => { seed = (Math.random() * 1e6) | 0; preview(); });
    act(root, "save").addEventListener("click", (e) => {
      e.target.textContent = "Rendering…";
      setTimeout(() => {
        const [fw, fh] = fmtSel.value.split("x").map(Number), c = Object.assign(document.createElement("canvas"), { width: fw, height: fh });
        paint(c); c.toBlob((b) => { saveURL(URL.createObjectURL(b), `flow-${seed}-${fw}x${fh}.png`); e.target.textContent = "Download full size"; }, "image/png");
      }, 30);
    });
    onView(root, preview);
  })();

  /* ===================================================================================
     Zine maker: photos and words laid out as magazine pages, exported as PNGs or a print-ready PDF
     =================================================================================== */
  (() => {
    const root = exp("zine"); if (!root) return;
    const cv = $(".zine__cv", root), pagesEl = act(root, "pages"), note = act(root, "note"), styleSel = act(root, "style");
    const PW = 1000, PH = 1414, m = 70;
    const serif = (w, s, it = "") => `${it} ${w} ${s}px Georgia, "Times New Roman", serif`;
    const STYLES = {
      Editorial: { bg: "#F4F0E8", ink: "#151515", accent: "#C23B22", head: (w, s) => serif(w, s, "italic"), body: (s) => serif(400, s) },
      Swiss: { bg: "#FFFFFF", ink: "#111111", accent: "#E3241B", head: (w, s) => `800 ${s}px ${D}`, body: (s) => `500 ${s}px ${D}`, grid: true },
      Brutalist: { bg: "#E4E4E4", ink: "#000000", accent: "#3D3AE8", head: (w, s) => `900 ${s}px ${D}`, body: (s) => `500 ${s}px ${M}`, fx: "grayscale(1) contrast(1.45)", upper: true },
      "Riso zine": { bg: "#F3EEE3", ink: "#0078BF", accent: "#FF48B0", head: (w, s) => `900 ${s}px ${D}`, body: (s) => `500 ${s}px ${D}`, fx: "duo", upper: true },
      Fashion: { bg: "#FAFAF7", ink: "#0A0A0A", accent: "#0A0A0A", head: (w, s) => serif(300, s), body: (s) => serif(400, s), fx: "contrast(1.1) saturate(.85)", upper: true, track: true },
      "Punk xerox": { bg: "#EDEDE6", ink: "#0A0A0A", accent: "#E8102E", head: (w, s) => `900 ${s}px ${M}`, body: (s) => `600 ${s}px ${M}`, fx: "grayscale(1) contrast(2.2) brightness(1.1)", upper: true, tape: true, ransom: true },
      Y2K: { bg: "#E9E4FF", ink: "#2B1B8F", accent: "#FF4FD8", head: (w, s) => `900 ${s}px ${D}`, body: (s) => `600 ${s}px ${D}`, fx: "saturate(1.4) hue-rotate(-10deg)", grad: ["#9BE7FF", "#FF9BEA"], stickers: true },
      Newspaper: { bg: "#F2EEE3", ink: "#1A1A1A", accent: "#1A1A1A", head: (w, s) => serif(800, s), body: (s) => serif(400, s), fx: "grayscale(1) contrast(1.15) sepia(.15)", rules: true },
      "Japanese minimal": { bg: "#FBFAF6", ink: "#1C1C1C", accent: "#D7261E", head: (w, s) => `300 ${s}px ${D}`, body: (s) => `400 ${s}px ${D}`, fx: "saturate(.8) brightness(1.05)", minimal: true },
      Bollywood: { bg: "#FFD23F", ink: "#7A0019", accent: "#E4002B", head: (w, s) => `900 ${s}px ${D}`, body: (s) => `700 ${s}px ${D}`, fx: "saturate(1.6) contrast(1.15)", upper: true, stickers: true },
    };
    let photos = [], seed = 1, page = 0, pageSeeds = {};
    const st = () => STYLES[styleSel.value], T = (k) => act(root, k).value.trim();
    const spreads = () => +act(root, "spreads").value;
    const decor = () => act(root, "decor").checked;
    function samples() {
      const base = sample(1500, 1000), fx = ["none", "hue-rotate(160deg) saturate(1.2)", "grayscale(1) contrast(1.2)", "hue-rotate(300deg)", "sepia(.6) saturate(1.4)", "hue-rotate(60deg) brightness(1.1)"], crops = [[0, 0, 1500, 1000], [300, 100, 700, 900], [700, 300, 700, 700], [0, 400, 900, 600], [900, 0, 600, 1000], [200, 500, 800, 500]];
      return fx.map((f, i) => { const c = document.createElement("canvas"), [x, y, w, h] = crops[i]; c.width = w; c.height = h; const g = c.getContext("2d"); g.filter = f; g.drawImage(base, x, y, w, h, 0, 0, w, h); return c; });
    }
    // A photo, cover-fitted into a box (or a circle), with the style's treatment.
    function photo(g, img, x, y, w, h, circle = false) {
      if (!img) return; const s = st(), k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
      g.save(); g.beginPath(); circle ? g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7) : g.rect(x, y, w, h); g.clip();
      if (s.fx === "duo") {
        const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); const cg = c.getContext("2d"); cg.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, c.width, c.height);
        const id = cg.getImageData(0, 0, c.width, c.height), d = id.data, a = hex(s.ink), b = hex(s.accent), p = hex(s.bg);
        for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255, ka = clamp(1 - l * 1.3), kb = clamp(1 - Math.abs(l - 0.45) * 2.2) * 0.7; for (let ch = 0; ch < 3; ch++) d[i + ch] = p[ch] * (1 - ka * (1 - a[ch] / 255)) * (1 - kb * (1 - b[ch] / 255)); }
        cg.putImageData(id, 0, 0); g.drawImage(c, x, y, w, h);
      } else { if (s.fx) g.filter = s.fx; g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h); g.filter = "none"; }
      g.restore();
      if (s.tape && decor()) tape(g, x + w * 0.1, y - 14, -0.08), tape(g, x + w * 0.75, y + h - 16, 0.06);
    }
    const tape = (g, x, y, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "rgba(240,232,200,.75)"; g.fillRect(0, 0, 150, 34); g.restore(); };
    const wrap = (g, text, x, y, maxW, lh, maxLines = 99) => { const words = text.split(/\s+/); let line = "", n = 0; for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines) return y; } else line = t; } if (line) { g.fillText(line, x, y); y += lh; } return y; };
    const fit = (g, text, font, maxW, maxS) => { g.font = font(100); return Math.min(maxS, (maxW / Math.max(1, g.measureText(text).width)) * 100); };
    const up = (x) => (st().upper ? x.toUpperCase() : x);
    // Headline: ransom-note letters for punk, letter-spaced for fashion, gradient for Y2K.
    function headline(g, text, x, y, maxW, maxS, w = 900) {
      const s = st(), tx = up(text);
      if (s.ransom) { let cx = x; const sz = Math.min(maxS, maxW / (tx.length * 0.72)); [...tx].forEach((ch, i) => { const r = rng(seed * 31 + i)(); g.save(); g.translate(cx, y); g.rotate((r - 0.5) * 0.18); g.font = [`900 ${sz}px ${D}`, serif(800, sz), `700 ${sz}px ${M}`][i % 3]; const cw = g.measureText(ch).width; if (ch !== " ") { g.fillStyle = i % 2 ? s.ink : "#fff"; g.fillRect(-4, -sz * 0.82, cw + 8, sz * 1.02); g.fillStyle = i % 2 ? "#fff" : i % 3 ? s.accent : s.ink; g.fillText(ch, 0, 0); } g.restore(); cx += cw + 10; }); return sz; }
      const size = fit(g, tx, (n) => s.head(w, n), maxW, maxS); g.font = s.head(w, size);
      if (s.track) { g.letterSpacing = `${size * 0.12}px`; const size2 = fit(g, tx, (n) => s.head(w, n), maxW * 0.85, maxS); g.font = s.head(w, size2); g.fillText(tx, x, y); g.letterSpacing = "0px"; return size2; }
      if (s.grad) { const gr = g.createLinearGradient(x, y - size, x + maxW, y); gr.addColorStop(0, s.grad[0]); gr.addColorStop(0.5, s.accent); gr.addColorStop(1, s.grad[1]); g.fillStyle = gr; g.strokeStyle = s.ink; g.lineWidth = 3; g.strokeText(tx, x, y); g.fillText(tx, x, y); return size; }
      g.fillText(tx, x, y); return size;
    }
    function sticker(g, x, y, r, text) { const s = st(); g.save(); g.translate(x, y); g.rotate(-0.2); g.fillStyle = s.accent; g.beginPath(); for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, rr = i % 2 ? r : r * 0.82; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill(); g.fillStyle = "#fff"; g.textAlign = "center"; g.font = `900 ${r * 0.32}px ${D}`; g.fillText(text, 0, r * 0.1); g.textAlign = "left"; g.restore(); }
    function chrome(g, W, num) {
      const s = st(); g.font = `600 15px ${M}`; g.fillStyle = s.ink; g.globalAlpha = 0.7;
      g.fillText(up(T("title")) + " — " + T("issue"), m, 42); g.fillText(String(num * 2).padStart(2, "0"), m, PH - 36); if (W > PW) g.fillText(String(num * 2 + 1).padStart(2, "0"), W - m - 20, PH - 36);
      g.globalAlpha = 1;
      if (s.grid) { g.strokeStyle = "rgba(0,0,0,.06)"; for (let x = m; x < W; x += (PW - m * 2) / 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, PH); g.stroke(); } }
      if (s.rules) { g.fillStyle = s.ink; g.fillRect(m, 56, W - m * 2, 3); g.fillRect(m, 62, W - m * 2, 1); }
      if (s.minimal) { g.fillStyle = s.accent; g.beginPath(); g.arc(W - m - 10, 40, 10, 0, 7); g.fill(); }
      if (s.stickers && decor()) sticker(g, W - 160, PH - 190, 80, ["NEW!", "WOW", "HOT", "LIVE"][num % 4]);
    }
    const sentences = () => T("body").split(/(?<=[.!?])\s+/).filter(Boolean);
    const P = (i) => photos[(i + seed) % photos.length];
    const LAYOUTS = {
      "Feature": (g) => { const s = st(); photo(g, P(0), 0, 0, PW, PH); const x = PW + m; g.fillStyle = s.accent; g.font = `700 16px ${M}`; g.fillText(up("Feature"), x, 150); g.fillStyle = s.ink; const fs = headline(g, T("title"), x, 160 + 150, PW - m * 2, 190); g.font = s.body(24); g.fillStyle = s.ink; let y = wrap(g, T("body"), x, 340 + fs * 0.4, (PW - m * 3) / 2, 36, 18); wrap(g, T("body"), x + (PW - m) / 2, 340 + fs * 0.4, (PW - m * 3) / 2, 36, 10); g.fillStyle = s.accent; g.font = s.head(700, 54); wrap(g, `“${T("quote")}”`, x, Math.max(y + 60, 1000), PW - m * 2, 64, 4); },
      "Grid": (g) => { const s = st(), gw = (PW - m * 2 - 20) / 2; [0, 1, 2, 3].forEach((i) => photo(g, P(i + 1), m + (i % 2) * (gw + 20), 120 + Math.floor(i / 2) * (gw * 1.3 + 20), gw, gw * 1.3)); photo(g, P(5), PW + m, 120, PW - m * 2, PH * 0.6); g.fillStyle = s.ink; headline(g, T("title"), PW + m, 120 + PH * 0.6 + 100, PW - m * 2, 80); g.fillStyle = s.ink; g.font = s.body(22); wrap(g, T("body"), PW + m, 120 + PH * 0.6 + 150, PW - m * 2, 34, 6); },
      "Across the gutter": (g) => { const s = st(); photo(g, P(2), 0, 0, PW * 2, PH * 0.66); g.fillStyle = s.ink; g.font = s.head(800, 92); wrap(g, `“${T("quote")}”`, m, PH * 0.66 + 140, PW * 1.3, 104, 3); g.font = s.body(22); wrap(g, T("body"), PW * 1.45, PH * 0.66 + 110, PW * 0.48, 34, 9); },
      "Quote page": (g) => { const s = st(); g.fillStyle = s.accent; g.fillRect(0, 0, PW, PH); g.fillStyle = s.bg; g.font = s.head(900, 400); g.fillText("“", m, 360); g.font = s.head(800, 96); wrap(g, up(T("quote")), m, 520, PW - m * 2, 108, 7); photo(g, P(3), PW + m * 1.5, m * 2.5, PW - m * 3, PH - m * 5); g.fillStyle = s.ink; g.font = `600 16px ${M}`; g.fillText("FIG. 0" + ((seed % 9) + 1) + " — " + T("issue").toUpperCase(), PW + m * 1.5, PH - m * 1.6); },
      "Contact strip": (g) => { const s = st(), n = 4, w = (PW * 2 - m * 2 - (n - 1) * 16) / n; g.fillStyle = s.ink; const fs = headline(g, T("title"), m, 110 + 260, PW * 2 - m * 2, 330); for (let i = 0; i < n; i++) { photo(g, P(i), m + i * (w + 16), 140 + fs, w, w * 1.25); g.fillStyle = s.ink; g.font = `600 16px ${M}`; g.fillText(String(i + 1).padStart(2, "0"), m + i * (w + 16), 170 + fs + w * 1.25); } g.font = s.body(24); wrap(g, T("body"), m, 240 + fs + w * 1.25, PW * 1.1, 36, 6); },
      "Overlay": (g) => { const s = st(); photo(g, P(4), m, m * 2, PW * 0.5, PW * 0.62); g.fillStyle = s.ink; g.font = s.body(26); wrap(g, T("body"), m, m * 2 + PW * 0.62 + 80, PW - m * 2, 40, 12); g.fillStyle = s.accent; g.font = s.head(700, 44); wrap(g, `“${T("quote")}”`, m, PH - 260, PW - m * 2, 54, 3); photo(g, P(1), PW, 0, PW, PH); const grd = g.createLinearGradient(0, PH * 0.55, 0, PH); grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(0,0,0,.65)"); g.fillStyle = grd; g.fillRect(PW, PH * 0.55, PW, PH * 0.45); g.fillStyle = "#fff"; headline(g, T("title"), PW + m, PH - m * 1.4, PW - m * 2, 220); },
      "Mosaic": (g) => { const s = st(), cols = 3, rows = 2, w = (PW * 2 - m * 2 - 16 * (cols - 1)) / cols, h = (PH - m * 3.2 - 16) / rows; for (let i = 0; i < 6; i++) photo(g, P(i), m + (i % cols) * (w + 16), m * 1.4 + Math.floor(i / cols) * (h + 16), w, h); g.fillStyle = s.bg; g.fillRect(PW - 240, PH / 2 - 70, 480, 140); g.fillStyle = s.ink; g.textAlign = "center"; g.font = s.head(900, 64); g.fillText(up(T("title")), PW, PH / 2 + 22); g.textAlign = "left"; },
      "Polaroids": (g) => { const s = st(), r = rng(seed * 7 + 3); for (let i = 0; i < 6; i++) { const w = 430, x = m + (i % 3) * 620 + r() * 60, y = 140 + Math.floor(i / 3) * 600 + r() * 60; g.save(); g.translate(x + w / 2, y + w * 0.6); g.rotate((r() - 0.5) * 0.3); g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 20; g.fillStyle = "#fff"; g.fillRect(-w / 2, -w * 0.6, w, w * 1.2); g.shadowBlur = 0; photo(g, P(i), -w / 2 + 24, -w * 0.6 + 24, w - 48, w - 48); g.fillStyle = "#333"; g.font = `28px ${HAND}`; g.fillText((sentences()[i % Math.max(1, sentences().length)] || "").slice(0, 28), -w / 2 + 30, w * 0.52); g.restore(); if (decor()) tape(g, x + w * 0.35, y - 6, (r() - 0.5) * 0.3); } },
      "Essay": (g) => { const s = st(); g.fillStyle = s.ink; headline(g, T("title"), m, 300, PW - m * 2, 220); g.font = `600 18px ${M}`; g.fillStyle = s.accent; g.fillText(up("An essay"), m, 120); const body = (T("body") + " ").repeat(4), cw = (PW * 2 - m * 4) / 3; g.fillStyle = s.ink; g.font = s.head(900, 150); g.fillText(body[0], m, 520); g.font = s.body(24); wrap(g, body.slice(1), m + 100, 420, cw - 100, 36, 3); wrap(g, body, m, 560, cw, 36, 22); wrap(g, body.slice(120), m * 2 + cw, 420, cw, 36, 26); wrap(g, body.slice(260), m * 3 + cw * 2, 420, cw, 36, 26); },
      "Circles": (g) => { const s = st(); photo(g, P(2), m, 220, PW - m * 2, PW - m * 2, true); g.fillStyle = s.ink; headline(g, T("title"), m, 180, PW - m * 2, 120); photo(g, P(3), PW + m, 160, 420, 420, true); photo(g, P(4), PW + 420, 520, 480, 480, true); g.fillStyle = s.ink; g.font = s.body(24); wrap(g, T("body"), PW + m, 1100, PW - m * 2, 36, 6); },
      "Two-up": (g) => { const s = st(), w = PW - m * 2, h = PH * 0.68; [0, 1].forEach((k) => { photo(g, P(k + 2), k * PW + m, m * 1.6, w, h); g.fillStyle = s.ink; g.font = `600 16px ${M}`; g.fillText(`0${k + 1} / ${up(T("title"))}`, k * PW + m, m * 1.6 + h + 40); g.font = s.body(24); wrap(g, sentences()[k] || T("quote"), k * PW + m, m * 1.6 + h + 90, w, 36, 4); }); },
      "Big number": (g) => { const s = st(); g.fillStyle = s.accent; g.font = s.head(900, 900); g.fillText(String(((seed % 9) + 1)).padStart(2, "0"), m - 30, PH - 200); g.fillStyle = s.ink; headline(g, T("title"), m, 200, PW - m * 2, 120); photo(g, P(5), PW + m, m * 2, PW - m * 2, PH - m * 4); },
    };
    const LN = Object.keys(LAYOUTS);
    function cover(g) {
      const s = st(); photo(g, P(0), 0, 0, PW, PH);
      g.fillStyle = s.fx === "duo" ? s.accent : s.minimal ? s.ink : "#FFFFFF"; if (s.fx === "duo") g.globalCompositeOperation = "multiply";
      const fs = headline(g, T("title"), m, m + 260, PW - m * 2, 330); g.globalCompositeOperation = "source-over";
      g.fillStyle = s.fx === "duo" ? s.ink : "#FFFFFF"; g.font = `700 20px ${M}`; g.fillText(T("issue").toUpperCase(), m, m + 300 + fs * 0.1);
      g.font = s.head(700, 34); sentences().slice(0, 3).forEach((l, i) => wrap(g, l.replace(/\.$/, ""), m, PH - 330 + i * 92, PW * 0.55, 40, 2));
      g.fillStyle = "#fff"; g.fillRect(PW - m - 150, PH - m - 80, 150, 80); g.fillStyle = "#000"; for (let i = 0; i < 46; i++) if ((i * 7 + seed) % 3) g.fillRect(PW - m - 140 + i * 3, PH - m - 70, (i % 4) + 1, 50); g.font = `600 11px ${M}`; g.fillText("MNV · " + (seed % 900 + 100), PW - m - 140, PH - m - 8);
      if (s.stickers && decor()) sticker(g, PW - 190, 520, 110, "No. " + ((seed % 9) + 1));
    }
    function contents(g) {
      const s = st(); g.fillStyle = s.ink; headline(g, "Contents", m, 220, PW - m * 2, 150);
      LN.slice(0, spreads()).forEach((_, i) => { const y = 380 + i * 150; g.fillStyle = s.accent; g.font = s.head(900, 80); g.fillText(String(i * 2 + 4).padStart(2, "0"), m, y + 60); g.fillStyle = s.ink; g.font = s.head(700, 34); g.fillText(sentences()[i % Math.max(1, sentences().length)]?.slice(0, 40) || T("title"), m + 160, y + 30); g.font = s.body(20); g.globalAlpha = 0.6; g.fillText(T("issue"), m + 160, y + 64); g.globalAlpha = 1; });
      photo(g, P(5), PW + m, m * 2, PW - m * 2, PH - m * 4);
    }
    function back(g) { const s = st(); g.fillStyle = s.accent; g.fillRect(0, 0, PW, PH); g.fillStyle = s.bg; g.font = s.head(800, 64); wrap(g, `“${T("quote")}”`, m, PH / 2 - 100, PW - m * 2, 76, 5); g.font = `600 18px ${M}`; g.fillText(up(T("title")) + " · " + T("issue"), m, PH - m); }
    const pageList = () => ["Cover", "Contents", ...Array.from({ length: spreads() }, (_, i) => `Spread ${i + 1}`), "Back"];
    function renderPage(c, i) {
      const list = pageList(), name = list[i], single = name === "Cover" || name === "Back", W = single ? PW : PW * 2; c.width = W; c.height = PH;
      const g = c.getContext("2d"), s = st(); g.fillStyle = s.bg; g.fillRect(0, 0, W, PH);
      if (s.grad) { const gr = g.createLinearGradient(0, 0, W, PH); gr.addColorStop(0, s.bg); gr.addColorStop(1, s.grad[0] + "55"); g.fillStyle = gr; g.fillRect(0, 0, W, PH); }
      if (name === "Cover") return cover(g);
      if (name === "Back") return back(g);
      if (name === "Contents") { contents(g); chrome(g, W, 1); return; }
      const k = i - 2, ls = pageSeeds[k] ?? (seed + k * 5), saved = seed; seed = ls; LAYOUTS[LN[ls % LN.length]](g); chrome(g, W, k + 2); seed = saved;
      g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(PW - 1, 0, 2, PH);
    }
    function draw() {
      const list = pageList(); page = Math.min(page, list.length - 1);
      renderPage(cv, page); cv.style.aspectRatio = `${cv.width} / ${cv.height}`; root.classList.toggle("zine--single", cv.width === PW);
      pagesEl.innerHTML = ""; list.forEach((name, i) => { const b = document.createElement("button"); b.className = "zine__page" + (i === page ? " on" : ""); const c = document.createElement("canvas"); renderPage(c, i); const t = document.createElement("canvas"); t.height = 141; t.width = c.width === PW ? 100 : 200; t.getContext("2d").drawImage(c, 0, 0, t.width, t.height); b.append(t, Object.assign(document.createElement("span"), { textContent: name })); b.addEventListener("click", () => { page = i; draw(); }); pagesEl.append(b); });
    }
    // Minimal PDF writer: one JPEG per page, each page sized to A4 (cover/back) or A3 landscape (spreads).
    async function pdf() {
      const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
      const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); len += b.length; };
      const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
      const list = pageList(), n = list.length; push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
      const kids = list.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
      obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>")); obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
      for (let i = 0; i < n; i++) {
        const c = document.createElement("canvas"); renderPage(c, i);
        const jpg = new Uint8Array(await (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9))).arrayBuffer());
        const w = c.width === PW ? 595.28 : 1190.55, h = 841.89, p = 3 + i * 3, content = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
        obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
        obj(p + 1, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
        obj(p + 2, () => { push(`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); push(jpg); push("\nendstream"); });
      }
      const xref = len, total = 3 + n * 3; push(`xref\n0 ${total}\n0000000000 65535 f \n`);
      for (let i = 1; i < total; i++) push(String(offs[i]).padStart(10, "0") + " 00000 n \n");
      push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
      return new Blob(chunks, { type: "application/pdf" });
    }
    let t; const later = () => { clearTimeout(t); t = setTimeout(draw, 250); };
    ["title", "issue", "quote", "body"].forEach((k) => act(root, k).addEventListener("input", later));
    [styleSel, act(root, "spreads"), act(root, "decor")].forEach((el) => el.addEventListener("change", draw));
    act(root, "shuffle").addEventListener("click", () => { seed = 1 + ((Math.random() * 999) | 0); pageSeeds = {}; draw(); });
    act(root, "reroll").addEventListener("click", () => { if (page >= 2 && page < pageList().length - 1) pageSeeds[page - 2] = (Math.random() * 999) | 0; else seed = 1 + ((Math.random() * 999) | 0); draw(); });
    act(root, "files").addEventListener("change", async (e) => { const fs = [...e.target.files].slice(0, 12); if (!fs.length) return; photos = await Promise.all(fs.map(loadImg)); note.textContent = `${photos.length} photo${photos.length > 1 ? "s" : ""} · laid out on your device.`; draw(); });
    act(root, "save").addEventListener("click", () => saveURL(cv.toDataURL("image/png"), `zine-${pageList()[page].toLowerCase().replace(" ", "-")}.png`));
    act(root, "pdf").addEventListener("click", async (e) => { e.target.textContent = "Making PDF…"; const b = await pdf(); saveURL(URL.createObjectURL(b), `${(T("title") || "zine").toLowerCase().replace(/\W+/g, "-")}.pdf`); e.target.textContent = "Download PDF"; note.textContent = `PDF saved: ${pageList().length} pages, cover and back at A4, spreads at A3. Print double-sided and fold.`; });
    root._pdf = pdf; root._pages = () => pageList().length;
    onView(root, () => { photos = samples(); draw(); });
  })();

  /* ===================================================================================
     Ambient room: a generative soundscape, mixed live
     =================================================================================== */
  (() => {
    const root = exp("amb"); if (!root) return;
    const cv = $(".amb__cv", root), g = cv.getContext("2d"), playBtn = act(root, "play"), note = act(root, "note"), roomsEl = act(root, "rooms"), mixEl = act(root, "mixer");
    const LAYERS = [["piano", "Piano"], ["pad", "Pads"], ["tanpura", "Tanpura"], ["rain", "Rain"], ["vinyl", "Vinyl"], ["wind", "Wind"], ["birds", "Birds"], ["waves", "Waves"], ["fire", "Fire"]];
    // Rooms: a mix, a key (MIDI root), a scale and the colours of the window.
    const ROOMS = {
      "Rainy café": { mix: { piano: 55, pad: 20, rain: 60, vinyl: 35 }, root: 57, scale: [0, 2, 3, 5, 7, 10], sky: ["#1B2235", "#3A3F5C"] },
      "Night drive": { mix: { pad: 60, piano: 30, rain: 20, wind: 15 }, root: 50, scale: [0, 3, 5, 7, 10], sky: ["#0A0820", "#3B1E54"] },
      "Forest morning": { mix: { birds: 60, wind: 25, piano: 30, pad: 15 }, root: 60, scale: [0, 2, 4, 7, 9], sky: ["#2E5A4C", "#E8D9A8"] },
      "Deep focus": { mix: { pad: 45, rain: 35, piano: 10 }, root: 52, scale: [0, 2, 4, 7, 9, 11], sky: ["#0F1626", "#1F2C47"] },
      "Beach dusk": { mix: { waves: 70, wind: 20, pad: 30, birds: 10 }, root: 55, scale: [0, 2, 4, 7, 9], sky: ["#2B1B5A", "#F2735F"] },
      "Cabin fire": { mix: { fire: 65, wind: 30, piano: 35, vinyl: 20 }, root: 53, scale: [0, 2, 3, 7, 8], sky: ["#140B08", "#4A2414"] },
      "Midnight raga": { mix: { tanpura: 70, pad: 15, piano: 25, rain: 10 }, root: 50, scale: [0, 2, 4, 6, 7, 9, 11], sky: ["#0B0A1C", "#2A1440"] },
    };
    let room = "Rainy café", vol = {}, ctx, master, verb, dest, nodes = {}, playing = false, timer, nextPiano = 0, nextBird = 0, nextTan = 0, tanStep = 0, padChord = 0, nextPad = 0, notes = [], endAt = 0;
    LAYERS.forEach(([k]) => (vol[k] = 0));
    roomsEl.innerHTML = Object.keys(ROOMS).map((r) => `<button class="xbtn" data-room="${r}">${r}</button>`).join("");
    mixEl.innerHTML = LAYERS.map(([k, n]) => `<label class="amb__ch"><span>${n}</span><input type="range" min="0" max="100" value="0" data-layer="${k}" orient="vertical" aria-label="${n} volume"></label>`).join("");
    const setGain = (k) => nodes[k] && nodes[k].gain.setTargetAtTime((vol[k] / 100) ** 1.6, ctx.currentTime, 0.4);
    function setRoom(name) {
      room = name; const R = ROOMS[name]; LAYERS.forEach(([k]) => { vol[k] = R.mix[k] || 0; $(`[data-layer="${k}"]`, root).value = vol[k]; setGain(k); });
      $$("[data-room]", root).forEach((b) => b.classList.toggle("xbtn--main", b.dataset.room === name));
    }
    $$("[data-room]", root).forEach((b) => b.addEventListener("click", () => setRoom(b.dataset.room)));
    $$("[data-layer]", root).forEach((el) => el.addEventListener("input", () => { vol[el.dataset.layer] = +el.value; setGain(el.dataset.layer); }));
    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp).connect(ctx.destination); dest = ctx.createMediaStreamDestination(); comp.connect(dest);
      verb = ctx.createConvolver(); const ir = ctx.createBuffer(2, ctx.sampleRate * 5, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5); } verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.5; verb.connect(vg).connect(master);
      LAYERS.forEach(([k]) => { nodes[k] = ctx.createGain(); nodes[k].gain.value = 0; nodes[k].connect(master); if (["piano", "pad", "tanpura", "birds"].includes(k)) nodes[k].connect(verb); });
      const sr = ctx.sampleRate, white = ctx.createBuffer(1, sr * 4, sr), wd = white.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
      const brown = ctx.createBuffer(1, sr * 4, sr), bd = brown.getChannelData(0); let last = 0; for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
      const gainOf = (v) => { const x = ctx.createGain(); x.gain.value = v; return x; };
      const loopSrc = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.start(0, Math.random() * 3); return s; };
      const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
      // Rain: a bed of filtered noise; droplets are added by the scheduler.
      loopSrc(white).connect(filt("highpass", 700)).connect(filt("lowpass", 7000)).connect(gainOf(0.25)).connect(nodes.rain);
      // Vinyl: sparse clicks and pops, plus a soft hiss.
      const crack = ctx.createBuffer(1, sr * 5, sr), cd = crack.getChannelData(0); for (let i = 0; i < cd.length; i++) cd[i] = Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 2 - 1) * 0.012; loopSrc(crack).connect(filt("bandpass", 2500, 0.5)).connect(nodes.vinyl);
      // Wind: noise through a bandpass that drifts.
      const wb = filt("bandpass", 500, 1.2); loopSrc(brown).connect(wb).connect(gainOf(1.6)).connect(nodes.wind); nodes.wind._f = wb;
      // Waves: low noise with a slow swell, scheduled in the loop.
      const wv = ctx.createGain(); wv.gain.value = 0.2; loopSrc(brown).connect(filt("lowpass", 900)).connect(wv).connect(nodes.waves); nodes.waves._g = wv;
      // Fire: deep rumble; crackles come from the scheduler.
      loopSrc(brown).connect(filt("lowpass", 300)).connect(nodes.fire);
      nodes._white = white;
    }
    const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
    function pluck(dest, n, t, v, dec, type = "sine", partials = [[1, 1], [2, 0.3], [3, 0.12], [4.2, 0.05]]) {
      const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(v, t + 0.008); env.gain.exponentialRampToValueAtTime(0.0001, t + dec); env.connect(dest);
      partials.forEach(([mul, a]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = mtof(n) * mul; og.gain.value = a; o.connect(og).connect(env); o.start(t); o.stop(t + dec + 0.05); });
    }
    function burst(dest, t, f, v, d, q = 1) { const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), e = ctx.createGain(); s.buffer = nodes._white; b.type = "bandpass"; b.frequency.value = f; b.Q.value = q; e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(b).connect(e).connect(dest); s.start(t, Math.random() * 3); s.stop(t + d + 0.02); }
    function schedule() {
      const now = ctx.currentTime, ahead = now + 0.4, R = ROOMS[room], scale = R.scale, pick = (lo, hi) => { const pool = []; for (let o = -24; o <= 24; o += 12) scale.forEach((s) => { const n = R.root + o + s; if (n >= lo && n <= hi) pool.push(n); }); return pool[(Math.random() * pool.length) | 0]; };
      if (vol.piano && nextPiano < ahead) { const t = Math.max(now, nextPiano), n = pick(60, 84); pluck(nodes.piano, n, t, 0.16 + Math.random() * 0.1, 3.5); if (Math.random() < 0.3) pluck(nodes.piano, pick(48, 64), t + 0.02, 0.1, 4); notes.push({ n, t, x: Math.random() }); nextPiano = t + [0.6, 0.9, 1.2, 1.8, 2.6][(Math.random() * 5) | 0]; }
      if (vol.pad && nextPad < ahead) {
        const t = Math.max(now, nextPad), deg = [0, 3, 4, 2][padChord++ % 4], base = R.root - 12 + scale[deg % scale.length];
        [0, 2, 4].map((k) => scale[(deg + k) % scale.length] + (deg + k >= scale.length ? 12 : 0)).forEach((iv) => [-8, 8].forEach((det) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), e = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = mtof(R.root - 12 + iv); o.detune.value = det; f.type = "lowpass"; f.frequency.value = 650; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.035, t + 4); e.gain.setValueAtTime(0.035, t + 10); e.gain.linearRampToValueAtTime(0, t + 14); o.connect(f).connect(e).connect(nodes.pad); o.start(t); o.stop(t + 14.1); }));
        void base; nextPad = t + 12;
      }
      if (vol.tanpura && nextTan < ahead) { const t = Math.max(now, nextTan), seq = [7 - 12, 0, 0, -12]; pluck(nodes.tanpura, R.root + seq[tanStep++ % 4], t, 0.12, 5, "sawtooth", [[1, 0.4], [2, 0.25], [3, 0.2], [5, 0.1], [7, 0.05]]); nextTan = t + 1.15; }
      if (vol.rain) for (let i = 0; i < 4; i++) if (Math.random() < 0.6) burst(nodes.rain, now + Math.random() * 0.4, 2500 + Math.random() * 4000, 0.15, 0.03, 6);
      if (vol.fire) for (let i = 0; i < 3; i++) if (Math.random() < 0.35) burst(nodes.fire, now + Math.random() * 0.4, 1200 + Math.random() * 3000, 0.4 * Math.random(), 0.015, 2);
      if (vol.birds && nextBird < ahead) { let t = Math.max(now, nextBird); const notesN = 2 + ((Math.random() * 5) | 0), f0 = 2200 + Math.random() * 2000; for (let i = 0; i < notesN; i++) { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.5), t + 0.06); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.12); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.06, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.13); o.connect(e).connect(nodes.birds); o.start(t); o.stop(t + 0.15); t += 0.14 + Math.random() * 0.08; } nextBird = t + 2 + Math.random() * 6; }
      nodes.wind._f.frequency.setTargetAtTime(300 + Math.random() * 900, now, 1.5);
      nodes.waves._g.gain.setTargetAtTime(0.15 + 0.85 * (0.5 + 0.5 * Math.sin(now * 0.75)), now, 0.6);
      if (endAt && now > endAt) { stop(); note.textContent = "Timer done. Nice work."; }
    }
    function start() {
      if (!ctx) build(); ctx.resume(); LAYERS.forEach(([k]) => setGain(k));
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
      nextPiano = nextPad = nextTan = nextBird = ctx.currentTime + 0.2; timer = setInterval(schedule, 200); playing = true; playBtn.textContent = "■"; playBtn.setAttribute("aria-pressed", true);
      const mins = +act(root, "timer").value; endAt = mins ? ctx.currentTime + mins * 60 : 0;
      if (mins) note.textContent = `Timer set: ${mins} minutes. It fades out at the end.`;
    }
    function stop() { clearInterval(timer); playing = false; master.gain.setTargetAtTime(0, ctx.currentTime, 0.6); playBtn.textContent = "▶"; playBtn.setAttribute("aria-pressed", false); endAt = 0; }
    playBtn.addEventListener("click", () => (playing ? stop() : start()));
    act(root, "timer").addEventListener("change", () => { if (playing) { const mins = +act(root, "timer").value; endAt = mins ? ctx.currentTime + mins * 60 : 0; } });
    act(root, "rec").addEventListener("click", (e) => {
      if (!playing) start();
      const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((x) => window.MediaRecorder && MediaRecorder.isTypeSupported(x)); if (!type) { note.textContent = "Recording isn't supported in this browser."; return; }
      const chunks = [], rec = new MediaRecorder(dest.stream, { mimeType: type }); rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = () => { saveURL(URL.createObjectURL(new Blob(chunks, { type })), `${room.toLowerCase().replace(/\W+/g, "-")}.${type.includes("mp4") ? "m4a" : "webm"}`); e.target.textContent = "● Record 1 min"; };
      rec.start(); let left = 60; const tm = setInterval(() => { left--; e.target.textContent = `Recording… ${left}s`; if (left <= 0) { clearInterval(tm); rec.stop(); } }, 1000);
    });
    // The window: sky in the room's colours, with rain, stars, waves, fire glow, birds and the piano notes as floating lights.
    const drops = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() })), stars = Array.from({ length: 140 }, () => [Math.random(), Math.random() * 0.7, Math.random()]);
    let visible = false; new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(root);
    function frame(ms) {
      const W = cv.width, H = cv.height, t = ms / 1000, R = ROOMS[room], lv = (k) => (playing ? vol[k] / 100 : vol[k] / 300);
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, R.sky[0]); sky.addColorStop(1, R.sky[1]); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      stars.forEach(([x, y, p]) => { g.fillStyle = `rgba(255,255,255,${(0.3 + 0.5 * Math.sin(t + p * 9)) * (1 - lv("rain")) * 0.8})`; g.fillRect(x * W, y * H, 2, 2); });
      if (lv("waves")) { for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(255,255,255,${0.08 + k * 0.03})`; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= W; x += 10) g.lineTo(x, H * (0.72 + k * 0.05) + Math.sin(x / 80 + t * (0.6 + k * 0.1) + k) * 8 * lv("waves")); g.stroke(); } }
      if (lv("fire")) { const fg = g.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.8); fg.addColorStop(0, `rgba(255,140,40,${0.5 * lv("fire") * (0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7))})`); fg.addColorStop(1, "rgba(255,80,20,0)"); g.fillStyle = fg; g.fillRect(0, 0, W, H); }
      if (lv("birds")) { g.strokeStyle = "rgba(20,20,30,.7)"; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const x = ((t * 30 + i * 300) % (W + 200)) - 100, y = H * 0.2 + i * 30 + Math.sin(t + i) * 10, f = Math.sin(t * 8 + i) * 6; g.beginPath(); g.moveTo(x - 10, y - f); g.lineTo(x, y); g.lineTo(x + 10, y - f); g.stroke(); } }
      notes = notes.filter((n) => ms / 1000 - n.born < 6 || !n.born); notes.forEach((n) => { if (!n.born) n.born = ms / 1000; const age = ms / 1000 - n.born, x = n.x * W, y = H * (1 - (n.n - 50) / 45) - age * 30, r = 4 + age * 2; g.fillStyle = `rgba(255,214,140,${Math.max(0, 0.9 - age / 6)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
      if (lv("rain")) { g.strokeStyle = "rgba(200,220,255,.35)"; g.lineWidth = 1.5; const n = Math.round(drops.length * lv("rain")); for (let i = 0; i < n; i++) { const d = drops[i]; d.y += 0.02 * d.s; if (d.y > 1) { d.y = 0; d.x = Math.random(); } g.beginPath(); g.moveTo(d.x * W, d.y * H); g.lineTo(d.x * W - 3, d.y * H + 18 * d.s); g.stroke(); } }
      g.fillStyle = "rgba(255,255,255,.75)"; g.font = `600 18px ${M}`; g.fillText(room.toUpperCase(), 28, H - 28);
      if (visible) requestAnimationFrame(frame);
    }
    root._state = () => ({ playing, room, t: ctx?.currentTime, layers: { ...vol } });
    setRoom("Rainy café");
  })();
})();
