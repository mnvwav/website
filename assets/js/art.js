/* Side quests: the typographic style engine behind the poster machine and the cover art lab.
   Every style is a function (g, W, H, text, sub, r) that paints a full composition; r() is a seeded random. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const exp = (id) => document.querySelector(`[data-x="${id}"]`);
  const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  const D = '"Bricolage Grotesque", sans-serif', M = '"JetBrains Mono", monospace', HAND = 'Caveat, cursive', SERIF = 'Georgia, "Times New Roman", serif';
  const INK = "#16151A", PAPER = "#F1EDE4", CREAM = "#E9E4D8", INDIGO = "#3D3AE8", MARIGOLD = "#FFB224", ROSE = "#F17FA6", TEAL = "#2FBF9B", CORAL = "#F2735F", RED = "#D63B2F", NIGHT = "#0B0A10";
  const seeded = (seed) => { let t = (seed % 2147483646) + 1; return () => ((t = (t * 16807) % 2147483647) / 2147483647); };
  const pickR = (r, a) => a[(r() * a.length) | 0];
  const font = (g, w, px, f = D) => (g.font = `${w} ${px}px ${f}`);
  // Largest size (up to max) at which text fits maxW.
  const fit = (g, text, maxW, max, w = 800, f = D) => { let px = max; font(g, w, px, f); const m = g.measureText(text).width; if (m > maxW) px = Math.max(8, (px * maxW) / m); font(g, w, px, f); return px; };
  const words = (t) => t.toUpperCase().split(/\s+/).filter(Boolean);
  const grain = (g, W, H, a = 22) => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const cg = c.getContext("2d"), id = cg.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = a; }
    cg.putImageData(id, 0, 0); g.fillStyle = g.createPattern(c, "repeat"); g.fillRect(0, 0, W, H);
  };
  const meta = (g, W, H, u, col, left, right, bottomL, bottomR) => {
    g.fillStyle = col; font(g, 600, 22 * u, M); g.textAlign = "left"; g.textBaseline = "alphabetic";
    if (left) g.fillText(left, 60 * u, 70 * u);
    if (bottomL) g.fillText(bottomL, 60 * u, H - 50 * u);
    g.textAlign = "right"; if (right) g.fillText(right, W - 60 * u, 70 * u); if (bottomR) g.fillText(bottomR, W - 60 * u, H - 50 * u);
    g.textAlign = "left";
  };
  const date = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  // Join the non-empty parts with a dot: lets every style drop the optional small text cleanly.
  const join = (...parts) => parts.filter(Boolean).join(" · ");
  const stackWords = (g, ws, x, yBottom, maxW, maxPx, lh = 0.86, align = "left") => {
    g.textAlign = align; let y = yBottom;
    for (let i = ws.length - 1; i >= 0; i--) { const px = fit(g, ws[i], maxW, maxPx); g.fillText(ws[i], x, y); y -= px * lh; }
    g.textAlign = "left"; return y;
  };

  const STYLES = {
    "Swiss stack"(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[PAPER, INK, RED], [INK, PAPER, MARIGOLD], [INDIGO, PAPER, MARIGOLD], [MARIGOLD, INK, INDIGO]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = fg; g.globalAlpha = 0.12; for (let c = 1; c < 6; c++) { const x = 60 * u + ((W - 120 * u) / 6) * c; g.beginPath(); g.moveTo(x, 100 * u); g.lineTo(x, H - 80 * u); g.stroke(); } g.globalAlpha = 1;
      g.fillStyle = ac; const sh = (r() * 3) | 0, sx = r() * W * 0.5, sy = H * (0.15 + r() * 0.3);
      if (sh === 0) { g.beginPath(); g.arc(sx + W * 0.25, sy + W * 0.2, W * (0.15 + r() * 0.12), 0, 7); g.fill(); } else if (sh === 1) g.fillRect(0, sy, W, H * 0.1); else { g.beginPath(); g.moveTo(sx, sy + W * 0.4); g.lineTo(sx + W * 0.2, sy); g.lineTo(sx + W * 0.4, sy + W * 0.4); g.fill(); }
      g.fillStyle = fg; stackWords(g, words(t), 56 * u, H - 90 * u, W - 112 * u, 300 * u);
      meta(g, W, H, u, fg, s.toUpperCase(), "", "", date()); g.fillRect(60 * u, 88 * u, W - 120 * u, 3 * u);
    },
    "Swiss column"(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[CREAM, INK, RED], [NIGHT, PAPER, CORAL], [PAPER, INDIGO, MARIGOLD]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = ac; font(g, 800, H * 0.62, D); g.fillText(String(1 + ((r() * 9) | 0)), -W * 0.05, H * 0.62);
      g.fillStyle = fg; const ws = words(t), colX = W * 0.56;
      let y = H * 0.18; ws.forEach((w) => { const px = fit(g, w, W - colX - 60 * u, 90 * u); g.fillText(w, colX, y + px); y += px * 1.05; });
      font(g, 400, 22 * u, M); g.fillText(s.toUpperCase(), colX, H - 120 * u); g.fillText(date(), colX, H - 88 * u);
      g.fillRect(colX, H - 150 * u, W - colX - 60 * u, 3 * u);
    },
    Bauhaus(g, W, H, t, s, r, u) {
      g.fillStyle = "#EDE6D3"; g.fillRect(0, 0, W, H);
      const cols = ["#C8102E", "#F2B705", "#1F4E9C", INK];
      for (let i = 0; i < 7; i++) {
        g.fillStyle = cols[i % 4]; const x = r() * W, y = r() * H * 0.7, z = (0.12 + r() * 0.25) * W, k = (r() * 4) | 0;
        g.beginPath();
        if (k === 0) g.arc(x, y, z / 2, 0, 7); else if (k === 1) g.arc(x, y, z / 2, 0, Math.PI); else if (k === 2) { g.moveTo(x, y); g.lineTo(x + z, y); g.lineTo(x + z / 2, y - z * 0.86); } else g.rect(x - z / 2, y - z / 8, z, z / 4);
        g.fill();
      }
      g.fillStyle = INK; g.fillRect(0, H * 0.74, W, H * 0.26);
      g.fillStyle = "#EDE6D3"; const px = fit(g, t.toUpperCase(), W - 120 * u, 170 * u, 800); g.fillText(t.toUpperCase(), 60 * u, H * 0.74 + px + 40 * u);
      font(g, 600, 22 * u, M); g.fillText(join(s.toUpperCase(), date()), 60 * u, H - 50 * u);
    },
    Brutalist(g, W, H, t, s, r, u) {
      g.fillStyle = r() > 0.5 ? "#FFFFFF" : NIGHT; const dark = g.fillStyle !== "#ffffff"; g.fillRect(0, 0, W, H);
      g.fillStyle = dark ? "#FFFFFF" : "#000"; const ws = words(t);
      g.save(); g.translate(-W * 0.05, 0);
      ws.forEach((w, i) => { font(g, 800, H * 0.24, D); g.fillText(w, 0, H * 0.24 * (i + 1) * 0.88); });
      g.restore();
      g.fillStyle = RED; g.fillRect(W * 0.6, H * 0.08, W * 0.36, H * 0.07);
      g.fillStyle = "#fff"; font(g, 800, 30 * u, M); g.fillText(s.toUpperCase(), W * 0.62, H * 0.125);
      g.fillStyle = dark ? "#fff" : "#000"; font(g, 600, 20 * u, M); g.fillText("FIG. " + ((r() * 99) | 0) + " / " + date(), 40 * u, H - 40 * u);
    },
    Riso(g, W, H, t, s, r, u) {
      g.fillStyle = "#F4EFE4"; g.fillRect(0, 0, W, H);
      const [a, b] = pickR(r, [["#FF48B0", "#0078BF"], ["#FFB224", "#3D3AE8"], ["#00A95C", "#FF665E"], ["#FF48B0", "#FFE800"]]);
      g.globalCompositeOperation = "multiply";
      g.fillStyle = a; g.beginPath(); g.arc(W * (0.3 + r() * 0.4), H * 0.35, W * 0.32, 0, 7); g.fill();
      const ws = words(t);
      g.fillStyle = b; stackWords(g, ws, 56 * u, H - 120 * u, W - 112 * u, 260 * u);
      g.fillStyle = a; stackWords(g, ws, 56 * u + 9 * u, H - 120 * u + 6 * u, W - 112 * u, 260 * u);
      g.globalCompositeOperation = "source-over"; grain(g, W, H, 30);
      meta(g, W, H, u, b, s.toUpperCase(), "RISO PRINT", "", date());
    },
    Halftone(g, W, H, t, s, r, u) {
      const [bg, fg] = pickR(r, [[PAPER, INK], [MARIGOLD, INK], [INK, CORAL], [INDIGO, PAPER]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = fg; const cx = W * (0.3 + r() * 0.4), cy = H * 0.38, step = 24 * u;
      for (let y = 0; y < H * 0.72; y += step) for (let x = 0; x < W; x += step) { const d = Math.hypot(x - cx, y - cy) / (W * 0.6); const rr = Math.max(0, (1 - d)) * step * 0.55; if (rr > 0.5) { g.beginPath(); g.arc(x + (y / step % 2) * step / 2, y, rr, 0, 7); g.fill(); } }
      stackWords(g, words(t), 56 * u, H - 90 * u, W - 112 * u, 200 * u);
      meta(g, W, H, u, fg, s.toUpperCase());
    },
    "Gradient grain"(g, W, H, t, s, r, u) {
      g.fillStyle = pickR(r, [NIGHT, "#1B1A4A", "#2A0E1E"]); g.fillRect(0, 0, W, H);
      g.filter = `blur(${Math.round(W * 0.09)}px)`;
      [MARIGOLD, ROSE, INDIGO, CORAL, TEAL].sort(() => r() - 0.5).slice(0, 4).forEach((c) => { g.fillStyle = c; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(r() * W, r() * H, W * (0.25 + r() * 0.3), H * (0.15 + r() * 0.2), r() * 3, 0, 7); g.fill(); });
      g.filter = "none"; g.globalAlpha = 1; grain(g, W, H, 26);
      g.fillStyle = "#fff"; g.textAlign = "center"; fit(g, t, W * 0.8, 72 * u, 700); g.fillText(t, W / 2, H - 140 * u);
      font(g, 600, 20 * u, M); g.fillText(s.toUpperCase(), W / 2, H - 90 * u); g.textAlign = "left";
    },
    Neon(g, W, H, t, s, r, u) {
      g.fillStyle = "#07060C"; g.fillRect(0, 0, W, H);
      const col = pickR(r, ["#FF4FD8", "#4FF0FF", "#FFB224", "#9DFF4F"]);
      g.strokeStyle = col; g.lineWidth = 2 * u; g.globalAlpha = 0.3; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, H * 0.6 + i * i * 6 * u); g.lineTo(W, H * 0.6 + i * i * 6 * u); g.stroke(); } g.globalAlpha = 1;
      g.textAlign = "center"; g.lineWidth = 5 * u; g.strokeStyle = col; g.shadowColor = col;
      const ws = words(t); let y = H * 0.32;
      ws.forEach((w) => { const px = fit(g, w, W * 0.84, 170 * u); [40, 20, 0].forEach((b) => { g.shadowBlur = b * u; g.strokeText(w, W / 2, y); }); y += px * 1.05; });
      g.shadowBlur = 0; g.fillStyle = "#fff"; font(g, 600, 22 * u, M); g.fillText(s.toUpperCase(), W / 2, H - 70 * u); g.textAlign = "left";
    },
    Typewriter(g, W, H, t, s, r, u) {
      g.fillStyle = "#EFE8D8"; g.fillRect(0, 0, W, H); grain(g, W, H, 18);
      g.fillStyle = "#222"; font(g, 400, 26 * u, M);
      const lines = ["DATE: " + date(), s ? "FROM: " + s.toUpperCase() : "", "RE:   " + t.toUpperCase().slice(0, 30), "", "-".repeat(38)];
      lines.forEach((l, i) => g.fillText(l, 70 * u, 120 * u + i * 44 * u));
      g.fillStyle = INK; const px = fit(g, t, W - 140 * u, 110 * u, 400, M); g.fillText(t, 70 * u, H * 0.52);
      g.fillRect(70 * u, H * 0.52 + 20 * u, Math.min(W - 140 * u, g.measureText(t).width), 4 * u);
      g.save(); g.translate(W * 0.7, H * 0.8); g.rotate(-0.18); g.strokeStyle = RED; g.lineWidth = 6 * u; g.strokeRect(-150 * u, -50 * u, 300 * u, 100 * u);
      g.fillStyle = RED; font(g, 800, 46 * u, M); g.textAlign = "center"; g.fillText("APPROVED", 0, 16 * u); g.restore(); g.textAlign = "left"; void px;
    },
    "Letter grid"(g, W, H, t, s, r, u) {
      const letters = [...t.toUpperCase().replace(/\s+/g, "")].slice(0, 16), n = Math.ceil(Math.sqrt(letters.length || 1)), rows = Math.ceil(letters.length / n);
      const cw = W / n, ch = (H - 140 * u) / rows, pal = pickR(r, [[INK, PAPER, MARIGOLD, INDIGO], [PAPER, INK, CORAL, TEAL], [INDIGO, PAPER, MARIGOLD, ROSE]]);
      g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
      letters.forEach((L, i) => { const x = (i % n) * cw, y = ((i / n) | 0) * ch; g.fillStyle = pal[(i + ((i / n) | 0)) % 4]; g.fillRect(x, y, cw, ch); g.fillStyle = pal[(i + ((i / n) | 0) + 1) % 4]; g.textAlign = "center"; fit(g, L, cw * 0.8, ch * 0.9); g.fillText(L, x + cw / 2, y + ch * 0.8); });
      g.textAlign = "left"; meta(g, W, H, u, pal[1], "", "", s.toUpperCase(), date());
    },
    "Circle type"(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[NIGHT, PAPER, MARIGOLD], [PAPER, INK, RED], [MARIGOLD, INK, INDIGO]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H * 0.45, text = (t.toUpperCase() + " · ").repeat(3);
      [0.42, 0.3, 0.18].forEach((rad, k) => {
        const R = W * rad; font(g, 800, (60 - k * 14) * u, D); g.fillStyle = k === 1 ? ac : fg;
        const chars = [...text]; const step = (Math.PI * 2) / chars.length;
        chars.forEach((c, i) => { g.save(); g.translate(cx, cy); g.rotate(i * step + k); g.translate(0, -R); g.textAlign = "center"; g.fillText(c, 0, 0); g.restore(); });
      });
      g.fillStyle = ac; g.beginPath(); g.arc(cx, cy, W * 0.06, 0, 7); g.fill();
      g.textAlign = "center"; g.fillStyle = fg; font(g, 600, 22 * u, M); g.fillText(join(s.toUpperCase(), date()), W / 2, H - 60 * u); g.textAlign = "left";
    },
    Repeat(g, W, H, t, s, r, u) {
      const [bg, fg] = pickR(r, [[INK, MARIGOLD], [PAPER, INDIGO], [CORAL, INK], [NIGHT, "#4FF0FF"]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const w = words(t)[0] || "TYPE", px = fit(g, w, W * 0.95, 220 * u); let y = px * 0.85, i = 0;
      while (y < H + px) { g.fillStyle = fg; g.strokeStyle = fg; g.lineWidth = 2.5 * u; i % 3 === 1 ? g.fillText(w, W * 0.025, y) : g.strokeText(w, W * 0.025, y); y += px * 0.86; i++; }
      g.fillStyle = bg; g.fillRect(0, H - 90 * u, W, 90 * u); meta(g, W, H, u, fg, "", "", s.toUpperCase(), t.toUpperCase().slice(0, 24));
    },
    Vertical(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[PAPER, INK, CORAL], [INK, PAPER, MARIGOLD], [TEAL, INK, PAPER]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W * 0.62, H - 40 * u); g.rotate(-Math.PI / 2); g.fillStyle = fg; fit(g, t.toUpperCase(), H - 80 * u, W * 0.55); g.fillText(t.toUpperCase(), 0, 0); g.restore();
      g.fillStyle = ac; g.fillRect(W * 0.66, 60 * u, W * 0.3, W * 0.3);
      g.fillStyle = fg; font(g, 600, 22 * u, M); [s.toUpperCase(), date()].filter(Boolean).forEach((l, i) => g.fillText(l, W * 0.66, W * 0.3 + 120 * u + i * 34 * u));
    },
    Editorial(g, W, H, t, s, r, u) {
      g.fillStyle = "#F6F2EA"; g.fillRect(0, 0, W, H);
      g.fillStyle = INK; font(g, 400, 22 * u, M); g.fillText("ISSUE " + (1 + ((r() * 40) | 0)) + "   ·   " + date(), 60 * u, 80 * u);
      g.fillRect(60 * u, 100 * u, W - 120 * u, 2 * u); g.fillRect(60 * u, 108 * u, W - 120 * u, 1 * u);
      g.font = `italic 400 ${Math.round(150 * u)}px ${SERIF}`;
      let line = "", y = 300 * u; const maxW = W - 120 * u;
      for (const w of t.split(/\s+/)) { if (g.measureText(line + w).width > maxW && line) { g.fillText(line, 60 * u, y); y += 150 * u; line = ""; } line += w + " "; }
      g.fillText(line, 60 * u, y);
      g.fillStyle = RED; g.fillRect(60 * u, y + 50 * u, 80 * u, 6 * u);
      g.fillStyle = INK; g.font = `400 ${Math.round(24 * u)}px ${SERIF}`;
      const lorem = "An independent studio making things it would want to keep. Built slowly, with care, in Punjab.".split(" ");
      let l2 = "", y2 = y + 120 * u; for (const w of lorem) { if (g.measureText(l2 + w).width > W * 0.45) { g.fillText(l2, 60 * u, y2); y2 += 34 * u; l2 = ""; } l2 += w + " "; } g.fillText(l2, 60 * u, y2);
      font(g, 600, 20 * u, M); g.textAlign = "right"; if (s) g.fillText("WORDS BY " + s.toUpperCase(), W - 60 * u, H - 60 * u); g.textAlign = "left";
    },
    "Gig poster"(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[MARIGOLD, INK, RED], [INK, PAPER, ROSE], [TEAL, INK, PAPER], [ROSE, INK, INDIGO]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = fg; font(g, 600, 28 * u, M); g.textAlign = "center"; if (s) g.fillText(s.toUpperCase() + " PRESENTS", W / 2, 110 * u);
      let y = 170 * u; words(t).forEach((w) => { const px = fit(g, w, W - 100 * u, 200 * u); y += px * 0.9; g.fillText(w, W / 2, y); });
      g.fillStyle = ac; g.fillRect(60 * u, y + 40 * u, W - 120 * u, 8 * u);
      g.fillStyle = fg; font(g, 800, 46 * u); g.fillText("LIVE · ONE NIGHT ONLY", W / 2, y + 120 * u);
      font(g, 600, 30 * u, M); ["WITH SPECIAL GUESTS", "DOORS 8PM", date()].forEach((l, i) => g.fillText(l, W / 2, y + 190 * u + i * 48 * u));
      font(g, 600, 20 * u, M); g.fillText("NO PHONES · NO REGRETS", W / 2, H - 50 * u); g.textAlign = "left";
    },
    Kinetic(g, W, H, t, s, r, u) {
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      const w = (words(t)[0] || "MOVE"), n = 9;
      for (let i = 0; i < n; i++) {
        g.save(); g.translate(W / 2, (H / (n + 1)) * (i + 1)); g.rotate(-0.12); g.scale(1, 0.35 + Math.sin((i / (n - 1)) * Math.PI) * 1.1);
        g.fillStyle = i === (n / 2 | 0) ? MARIGOLD : `rgba(241,237,228,${0.25 + (i / n) * 0.6})`; g.textAlign = "center"; fit(g, w, W * 1.1, 200 * u); g.fillText(w, 0, 40 * u); g.restore();
      }
      meta(g, W, H, u, PAPER, s.toUpperCase(), "", "", date());
    },
    "Y2K chrome"(g, W, H, t, s, r, u) {
      const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#1A1A6E"); bg.addColorStop(0.5, "#B04BFF"); bg.addColorStop(1, "#4FF0FF");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, z = (8 + r() * 26) * u; g.fillStyle = "#fff"; g.beginPath(); g.moveTo(x, y - z); g.quadraticCurveTo(x, y, x + z, y); g.quadraticCurveTo(x, y, x, y + z); g.quadraticCurveTo(x, y, x - z, y); g.quadraticCurveTo(x, y, x, y - z); g.fill(); }
      g.textAlign = "center"; let y = H * 0.42;
      words(t).forEach((w) => {
        const px = fit(g, w, W * 0.86, 190 * u);
        const ch = g.createLinearGradient(0, y - px, 0, y); ["#FFFFFF", "#B8C4D6", "#5E6A80", "#E8EEF6", "#8A96AA"].forEach((c, i, a) => ch.addColorStop(i / (a.length - 1), c));
        g.lineWidth = 10 * u; g.strokeStyle = "#1A1A40"; g.strokeText(w, W / 2, y); g.fillStyle = ch; g.fillText(w, W / 2, y); y += px * 0.95;
      });
      g.fillStyle = "#fff"; font(g, 700, 26 * u); if (s) g.fillText("✦ " + s.toUpperCase() + " ✦", W / 2, H - 80 * u); g.textAlign = "left";
    },
    Minimal(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[PAPER, INK, RED], [INK, PAPER, MARIGOLD], [MARIGOLD, INK, INK], [INDIGO, PAPER, PAPER], [CREAM, INK, TEAL]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = fg; font(g, 700, 34 * u); g.fillText(s, 60 * u, 90 * u);
      g.textAlign = "right"; g.fillText(t, W - 60 * u, H - 60 * u); g.textAlign = "left";
      g.fillStyle = ac; g.beginPath(); g.arc(W / 2, H / 2, W * 0.035, 0, 7); g.fill();
    },
    "Tape label"(g, W, H, t, s, r, u) {
      g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); grain(g, W, H, 14);
      g.save(); g.translate(W / 2, H / 2); g.rotate((r() - 0.5) * 0.14);
      const tw = W * 0.82, th = H * 0.15; g.fillStyle = PAPER; g.fillRect(-tw / 2, -th / 2, tw, th);
      g.fillStyle = "rgba(0,0,0,.08)"; for (let i = 0; i < 12; i++) g.fillRect(-tw / 2 + r() * tw, -th / 2, 2, th);
      g.fillStyle = INK; g.textAlign = "center"; fit(g, t.toUpperCase(), tw * 0.86, th * 0.7, 800, HAND); g.fillText(t.toUpperCase(), 0, th * 0.2);
      g.restore(); g.textAlign = "left";
      meta(g, W, H, u, MARIGOLD, "", "", s.toUpperCase(), "SIDE A");
    },
    Blueprint(g, W, H, t, s, r, u) {
      g.fillStyle = "#1B3A8C"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 1; for (let x = 0; x < W; x += 30 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 30 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = "#fff"; g.lineWidth = 2 * u; const cx = W / 2, cy = H * 0.4, R = W * 0.26;
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx - R * 1.3, cy); g.lineTo(cx + R * 1.3, cy); g.moveTo(cx, cy - R * 1.3); g.lineTo(cx, cy + R * 1.3); g.stroke();
      g.setLineDash([10 * u, 8 * u]); g.strokeRect(cx - R * 0.7, cy - R * 0.7, R * 1.4, R * 1.4); g.setLineDash([]);
      g.fillStyle = "#fff"; font(g, 400, 18 * u, M); g.fillText("R = " + (R / u).toFixed(0) + " MM", cx + R + 10 * u, cy - 10 * u);
      g.textAlign = "center"; fit(g, t.toUpperCase(), W - 120 * u, 110 * u, 400, M); g.fillText(t.toUpperCase(), W / 2, H * 0.8);
      g.strokeRect(60 * u, H - 150 * u, W - 120 * u, 100 * u); font(g, 400, 20 * u, M); g.fillText(join(s && "DRAWN BY " + s.toUpperCase(), "SHEET 1 OF 1", date()), W / 2, H - 92 * u); g.textAlign = "left";
    },
    Stamp(g, W, H, t, s, r, u) {
      g.fillStyle = "#EFE8D8"; g.fillRect(0, 0, W, H); grain(g, W, H, 18);
      const col = pickR(r, [RED, INDIGO, "#1F6B3A"]);
      g.save(); g.translate(W / 2, H / 2); g.rotate((r() - 0.5) * 0.4); g.strokeStyle = col; g.fillStyle = col; g.globalAlpha = 0.88;
      g.lineWidth = 10 * u; g.beginPath(); g.arc(0, 0, W * 0.36, 0, 7); g.stroke(); g.lineWidth = 4 * u; g.beginPath(); g.arc(0, 0, W * 0.32, 0, 7); g.stroke();
      g.textAlign = "center"; fit(g, t.toUpperCase(), W * 0.5, 120 * u, 800); g.fillText(t.toUpperCase(), 0, 30 * u);
      font(g, 700, 26 * u, M); if (s) g.fillText("★ " + s.toUpperCase() + " ★", 0, -W * 0.18); g.fillText(date(), 0, W * 0.22);
      g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 260; i++) { g.beginPath(); g.arc((r() - 0.5) * W * 0.8, (r() - 0.5) * W * 0.8, r() * 4 * u, 0, 7); g.fill(); }
      g.restore(); g.textAlign = "left";
    },
    "Big number"(g, W, H, t, s, r, u) {
      const [bg, fg, ac] = pickR(r, [[INK, PAPER, MARIGOLD], [CORAL, INK, PAPER], [PAPER, INK, INDIGO]]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = ac; font(g, 800, H * 0.7); g.textAlign = "center"; g.fillText(String((r() * 99) | 0).padStart(2, "0"), W / 2, H * 0.68);
      g.fillStyle = fg; fit(g, t.toUpperCase(), W - 120 * u, 110 * u); g.fillText(t.toUpperCase(), W / 2, H - 140 * u);
      font(g, 600, 22 * u, M); g.fillText(join(s.toUpperCase(), date()), W / 2, H - 80 * u); g.textAlign = "left";
    },
  };
  // Cover-only formats: things a square record or tape actually looks like.
  const COVER_ONLY = {
    "Vinyl label"(g, W, H, t, s, r, u) {
      g.fillStyle = pickR(r, [INK, "#1B1A4A", "#2A0E1E"]); g.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = W * 0.46;
      g.fillStyle = "#0A0A0A"; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,.06)"; for (let k = R * 0.42; k < R; k += 5 * u) { g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, k, 0, 7); g.stroke(); }
      const sheen = g.createConicGradient(r() * 3, cx, cy); sheen.addColorStop(0, "rgba(255,255,255,0)"); sheen.addColorStop(0.1, "rgba(255,255,255,.12)"); sheen.addColorStop(0.2, "rgba(255,255,255,0)"); sheen.addColorStop(0.6, "rgba(255,255,255,0)"); sheen.addColorStop(0.7, "rgba(255,255,255,.1)"); sheen.addColorStop(0.8, "rgba(255,255,255,0)");
      g.fillStyle = sheen; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      const lab = pickR(r, [MARIGOLD, CORAL, ROSE, TEAL, PAPER]); g.fillStyle = lab; g.beginPath(); g.arc(cx, cy, R * 0.36, 0, 7); g.fill();
      g.fillStyle = INK; g.textAlign = "center"; fit(g, t.toUpperCase(), R * 0.56, 60 * u); g.fillText(t.toUpperCase(), cx, cy - R * 0.12);
      font(g, 600, 18 * u, M); g.fillText(s.toUpperCase(), cx, cy + R * 0.2); g.fillText("33⅓ RPM · SIDE A", cx, cy + R * 0.27);
      g.fillStyle = "#0A0A0A"; g.beginPath(); g.arc(cx, cy, 10 * u, 0, 7); g.fill(); g.textAlign = "left";
    },
    Cassette(g, W, H, t, s, r, u) {
      g.fillStyle = pickR(r, [CORAL, TEAL, INDIGO, MARIGOLD]); g.fillRect(0, 0, W, H);
      const x = W * 0.08, y = H * 0.24, w = W * 0.84, h = H * 0.52;
      g.fillStyle = "#1A1A1F"; g.beginPath(); g.roundRect(x, y, w, h, 30 * u); g.fill();
      g.fillStyle = PAPER; g.beginPath(); g.roundRect(x + 40 * u, y + 34 * u, w - 80 * u, h * 0.5, 12 * u); g.fill();
      g.fillStyle = pickR(r, [RED, INDIGO, ROSE]); g.fillRect(x + 40 * u, y + 34 * u + h * 0.5 - 40 * u, w - 80 * u, 40 * u);
      g.fillStyle = INK; fit(g, t, w - 140 * u, 60 * u, 700, HAND); g.fillText(t, x + 70 * u, y + 34 * u + h * 0.26);
      font(g, 600, 18 * u, M); g.fillText(join(s.toUpperCase(), "C90"), x + 70 * u, y + 34 * u + h * 0.38);
      g.fillStyle = "#2A2A32"; g.beginPath(); g.roundRect(x + w * 0.22, y + h * 0.62, w * 0.56, h * 0.26, 18 * u); g.fill();
      [0.36, 0.64].forEach((k) => { g.fillStyle = PAPER; g.beginPath(); g.arc(x + w * k, y + h * 0.75, 34 * u, 0, 7); g.fill(); g.fillStyle = "#1A1A1F"; for (let a = 0; a < 6; a++) { g.save(); g.translate(x + w * k, y + h * 0.75); g.rotate((a * Math.PI) / 3); g.fillRect(-4 * u, -30 * u, 8 * u, 14 * u); g.restore(); } });
    },
    Polaroid(g, W, H, t, s, r, u) {
      g.fillStyle = pickR(r, ["#D9D2C3", "#C9D6CF", "#E2CFC9"]); g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2); g.rotate((r() - 0.5) * 0.12);
      const pw = W * 0.72, ph = pw * 1.18; g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 40 * u; g.shadowOffsetY = 16 * u;
      g.fillStyle = "#FBFAF6"; g.fillRect(-pw / 2, -ph / 2, pw, ph); g.shadowColor = "transparent";
      const iw = pw * 0.88, ix = -iw / 2, iy = -ph / 2 + pw * 0.06;
      const sky = g.createLinearGradient(0, iy, 0, iy + iw); [["#1B1A4A", 0], ["#F2735F", 0.6], ["#FFB224", 1]].forEach(([c, k]) => sky.addColorStop(k, c));
      g.fillStyle = sky; g.fillRect(ix, iy, iw, iw);
      g.fillStyle = "rgba(255,240,200,.9)"; g.beginPath(); g.arc(ix + iw * (0.3 + r() * 0.4), iy + iw * 0.62, iw * 0.12, 0, 7); g.fill();
      g.fillStyle = "#1A1030"; g.fillRect(ix, iy + iw * 0.72, iw, iw * 0.28);
      g.fillStyle = INK; g.textAlign = "center"; fit(g, t, pw * 0.8, 64 * u, 600, HAND); g.fillText(t, 0, ph / 2 - pw * 0.08);
      g.restore(); g.textAlign = "left"; void s;
    },
  };

  function setupSelect(sel, names) { names.forEach((n) => sel.add(new Option(n, n))); }
  function wire({ id, getText, getSub, names, size, filename, exportSize }) {
    const root = exp(id); if (!root) return;
    const cv = $("canvas", root), g = cv.getContext("2d"), sel = act(root, "style");
    const all = { ...STYLES, ...COVER_ONLY };
    setupSelect(sel, names);
    let seed = (Math.random() * 1e9) | 0;
    const paint = (ctx, W, H) => { const r = seeded(seed), u = Math.min(W, H) / 1080; ctx.save(); ctx.textBaseline = "alphabetic"; ctx.filter = "none"; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; all[sel.value](ctx, W, H, getText(root) || "Untitled", getSub(root) || "", r, u); ctx.restore(); };
    const render = () => paint(g, cv.width, cv.height);
    act(root, "gen")?.addEventListener("click", () => { seed = (Math.random() * 1e9) | 0; render(); });
    act(root, "surprise")?.addEventListener("click", () => { sel.value = names[(Math.random() * names.length) | 0]; seed = (Math.random() * 1e9) | 0; render(); });
    sel.addEventListener("change", render);
    root.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", render));
    act(root, "save")?.addEventListener("click", () => {
      if (!exportSize) return download(cv, filename());
      const big = document.createElement("canvas"); big.width = exportSize[0]; big.height = exportSize[1]; paint(big.getContext("2d"), big.width, big.height); download(big, filename());
    });
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); document.fonts.ready.then(render); } }, { rootMargin: "300px" }).observe(cv);
    void size;
  }
  const posterNames = Object.keys(STYLES), coverNames = [...Object.keys(STYLES), ...Object.keys(COVER_ONLY)];
  wire({ id: "poster", getText: (r) => act(r, "text").value, getSub: (r) => act(r, "sub").value, names: posterNames, filename: () => "poster.png" });
  wire({ id: "cover", getText: (r) => act(r, "title").value, getSub: (r) => act(r, "artist").value, names: coverNames, filename: () => "cover-3000.png", exportSize: [3000, 3000] });
})();
