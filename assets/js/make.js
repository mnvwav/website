/* Side quests: Depth of field, simulated with real lens maths. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const exp = (id) => document.querySelector(`[data-x="${id}"]`);
  const act = (root, name) => root.querySelector(`[data-act="${name}"]`);
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  const D = '"Bricolage Grotesque", sans-serif', M = '"JetBrains Mono", monospace', SERIF = 'Georgia, "Times New Roman", serif';

  /* ===================================================================================
     Depth of field
     =================================================================================== */
  (() => {
    const root = exp("dof"); if (!root) return;
    const [cv, dia] = root.querySelectorAll("canvas"), g = cv.getContext("2d"), dg = dia.getContext("2d"), W = cv.width, H = cv.height;
    const SENSORS = { "Full frame (36 × 24)": [36, 24], "APS-C (23.5 × 15.6)": [23.5, 15.6], "Micro Four Thirds (17.3 × 13)": [17.3, 13], "1-inch (13.2 × 8.8)": [13.2, 8.8], "Phone main camera (9.8 × 7.4)": [9.8, 7.4], "Medium format (44 × 33)": [44, 33], "6 × 7 film (70 × 56)": [70, 56] };
    const STOPS = [1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
    const PRESETS = { Portrait: [85, 1.8, 2.2], Street: [28, 8, 4], Landscape: [24, 8, 9], Product: [100, 4, 0.6] };   // [focal mm, f-number, metres]
    const sensorSel = act(root, "sensor"), sceneSel = act(root, "scene"), focal = act(root, "focal"), ap = act(root, "ap"), dist = act(root, "dist");
    Object.keys(SENSORS).forEach((k) => sensorSel.add(new Option(k, k)));
    ap.max = STOPS.length - 1;
    const out = (el) => el.parentElement.querySelector("output");
    const toM = (v) => 0.3 * Math.pow(100 / 0.3, v / 100), fromM = (m) => (Math.log(m / 0.3) / Math.log(100 / 0.3)) * 100;
    const fmtM = (m) => (m === Infinity ? "∞" : m < 1 ? Math.round(m * 100) + " cm" : m < 10 ? m.toFixed(2) + " m" : m.toFixed(1) + " m");

    function optics() {
      const [sw, sh] = SENSORS[sensorSel.value], f = +focal.value, N = STOPS[+ap.value], s = toM(+dist.value) * 1000;
      const c = Math.hypot(sw, sh) / 1500;                       // circle of confusion (mm), the usual d/1500 rule
      const Hf = (f * f) / (N * c) + f;                           // hyperfocal distance (mm)
      const near = (s * (Hf - f)) / (Hf + s - 2 * f), far = s < Hf ? (s * (Hf - f)) / (Hf - s) : Infinity;
      const fov = (2 * Math.atan(sw / (2 * f)) * 180) / Math.PI;
      // Blur-circle diameter on the sensor for an object at distance d (mm), converted to pixels on our image.
      const blurPx = (dmm) => Math.min(60, ((f * f) / (N * (s - f))) * (Math.abs(dmm - s) / dmm) / sw * W);
      return { sw, f, N, s, c, Hf, near, far, fov, blurPx };
    }

    // ---- Scene: objects at real distances, drawn far to near, each blurred by its own blur circle ----
    const SCENES = {
      Portrait: { sky: ["#F6D9B8", "#E8A87C"], ground: "#6B8F5A", items: [["tree", 7, -2.2], ["tree", 14, 3], ["tree", 25, -6], ["building", 45, 8], ["lights", 30, 0], ["person", "s", 0.08], ["flower", 0.9, -0.35], ["flower", 1.1, 0.42]] },
      Street: { sky: ["#1B1A4A", "#4A3B7A"], ground: "#2A2733", night: true, items: [["building", 60, -9], ["building", 40, 7], ["lights", 25, 0], ["lamp", 18, -3], ["lamp", 9, 2.6], ["person", "s", 0], ["lamp", 2.2, -1.1]] },
      Landscape: { sky: ["#9CC9F0", "#E7F1F8"], ground: "#7A9A62", items: [["mountain", 95, -15], ["mountain", 80, 12], ["tree", 35, -9], ["tree", 22, 6], ["person", "s", -0.6], ["rock", 2.2, 0.9], ["flower", 1.2, -0.5]] },
      Product: { sky: ["#EDE6D8", "#D9CFBD"], ground: "#B9A88D", items: [["shelf", 3, 0], ["lights", 2.5, 0], ["bottle", "s", 0], ["cup", 0.35, -0.12]] },
    };
    function drawItem(c, kind, x, y, k, night) {
      // k = pixels per metre at this distance. x,y = ground point.
      c.save(); c.translate(x, y);
      if (kind === "person") { c.fillStyle = "#16151A"; c.beginPath(); c.roundRect(-0.25 * k, -1.45 * k, 0.5 * k, 1.45 * k, 0.12 * k); c.fill(); c.fillStyle = "#C98E6A"; c.beginPath(); c.arc(0, -1.62 * k, 0.13 * k, 0, 7); c.fill(); c.fillStyle = "#2C29C4"; c.beginPath(); c.roundRect(-0.27 * k, -1.42 * k, 0.54 * k, 0.65 * k, 0.1 * k); c.fill(); c.fillStyle = "#1B1A1F"; c.beginPath(); c.arc(0, -1.7 * k, 0.12 * k, Math.PI, 0); c.fill(); }
      else if (kind === "tree") { c.fillStyle = "#4A3426"; c.fillRect(-0.15 * k, -3 * k, 0.3 * k, 3 * k); c.fillStyle = "#3E6B3A"; c.beginPath(); c.arc(0, -3.6 * k, 1.6 * k, 0, 7); c.fill(); c.fillStyle = "#4F8048"; c.beginPath(); c.arc(-0.5 * k, -4 * k, 1 * k, 0, 7); c.fill(); }
      else if (kind === "building") { c.fillStyle = night ? "#2A2440" : "#B6A6A0"; c.fillRect(-4 * k, -18 * k, 8 * k, 18 * k); c.fillStyle = night ? "#FFD27A" : "#8A7C78"; for (let yy = 2; yy < 17; yy += 2) for (let xx = -3.2; xx < 3.5; xx += 1.6) if (!night || ((xx * 7 + yy * 3) | 0) % 3) c.fillRect(xx * k, -yy * k, 0.7 * k, 1 * k); }
      else if (kind === "lamp") { c.fillStyle = "#1E1C26"; c.fillRect(-0.06 * k, -4 * k, 0.12 * k, 4 * k); c.fillStyle = "#FFE3A0"; c.beginPath(); c.arc(0, -4.1 * k, 0.22 * k, 0, 7); c.fill(); }
      else if (kind === "mountain") { c.fillStyle = "#6F7FA0"; c.beginPath(); c.moveTo(-40 * k, 0); c.lineTo(0, -22 * k); c.lineTo(40 * k, 0); c.fill(); c.fillStyle = "#F4F6FA"; c.beginPath(); c.moveTo(-7 * k, -18 * k); c.lineTo(0, -22 * k); c.lineTo(7 * k, -18 * k); c.fill(); }
      else if (kind === "rock") { c.fillStyle = "#6A6460"; c.beginPath(); c.ellipse(0, -0.25 * k, 0.6 * k, 0.32 * k, 0, 0, 7); c.fill(); }
      else if (kind === "flower") { c.fillStyle = "#3E6B3A"; c.fillRect(-0.01 * k, -0.35 * k, 0.02 * k, 0.35 * k); c.fillStyle = "#F17FA6"; for (let a = 0; a < 6; a++) { c.beginPath(); c.arc(Math.cos(a) * 0.05 * k, -0.38 * k + Math.sin(a) * 0.05 * k, 0.04 * k, 0, 7); c.fill(); } c.fillStyle = "#FFB224"; c.beginPath(); c.arc(0, -0.38 * k, 0.03 * k, 0, 7); c.fill(); }
      else if (kind === "bottle") { c.fillStyle = "#2FBF9B"; c.beginPath(); c.roundRect(-0.04 * k, -0.24 * k, 0.08 * k, 0.24 * k, 0.015 * k); c.fill(); c.fillRect(-0.015 * k, -0.31 * k, 0.03 * k, 0.08 * k); c.fillStyle = "#F1EDE4"; c.fillRect(-0.04 * k, -0.16 * k, 0.08 * k, 0.06 * k); }
      else if (kind === "cup") { c.fillStyle = "#F2735F"; c.beginPath(); c.roundRect(-0.04 * k, -0.09 * k, 0.08 * k, 0.09 * k, 0.01 * k); c.fill(); }
      else if (kind === "shelf") { c.fillStyle = "#8C7A62"; for (let yy = 0.4; yy < 2.4; yy += 0.6) c.fillRect(-3 * k, -yy * k, 6 * k, 0.05 * k); ["#3D3AE8", "#FFB224", "#F17FA6", "#16151A"].forEach((col, i) => { c.fillStyle = col; for (let j = 0; j < 6; j++) c.fillRect((-2.6 + j * 0.9) * k, (-0.4 - (i % 3) * 0.6 - 0.32) * k, 0.25 * k, 0.32 * k); }); }
      c.restore();
    }
    function render() {
      const o = optics(), sc = SCENES[sceneSel.value], hor = H * 0.58;
      const sky = g.createLinearGradient(0, 0, 0, hor); sky.addColorStop(0, sc.sky[0]); sky.addColorStop(1, sc.sky[1]);
      g.filter = "none"; g.fillStyle = sky; g.fillRect(0, 0, W, hor); g.fillStyle = sc.ground; g.fillRect(0, hor, W, H - hor);
      const pxPerM = (dm) => ((o.f / dm) / o.sw) * W;                       // metres → pixels at distance dm (metres)
      const groundY = (dm) => hor + 1.5 * pxPerM(dm);                       // camera at eye level, 1.5 m above the ground
      const items = sc.items.map(([kind, d, xm]) => ({ kind, d: d === "s" ? o.s / 1000 : d, xm })).filter((it) => it.d > o.f / 1000 * 1.2).sort((a, b) => b.d - a.d);
      const layer = document.createElement("canvas"); layer.width = W; layer.height = H; const lg = layer.getContext("2d");
      for (const it of items) {
        const blur = o.blurPx(it.d * 1000), k = pxPerM(it.d), x = W / 2 + it.xm * k, y = groundY(it.d);   // the ground can sit far below the frame for close subjects
        if (it.kind === "lights") {   // out-of-focus point lights become bokeh discs the size of the blur circle
          const r = Math.max(2, blur / 2);
          for (let i = 0; i < 26; i++) { const lx = ((i * 197) % W), ly = hor * (0.25 + ((i * 53) % 60) / 100); g.fillStyle = `hsla(${[38, 330, 200, 45][i % 4]} 95% 70% / ${blur > 4 ? 0.35 : 0.9})`; g.beginPath(); g.arc(lx, ly, r, 0, 7); g.fill(); if (blur > 4) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.stroke(); } }
          continue;
        }
        lg.clearRect(0, 0, W, H); drawItem(lg, it.kind, x, y, k, sc.night);
        g.filter = blur > 0.6 ? `blur(${(blur / 2.4).toFixed(1)}px)` : "none"; g.drawImage(layer, 0, 0); g.filter = "none";
      }
      // Readouts
      out(focal).textContent = o.f + " mm"; out(ap).textContent = "f/" + o.N; out(dist).textContent = fmtM(o.s / 1000);
      act(root, "near").textContent = fmtM(o.near / 1000); act(root, "far").textContent = fmtM(o.far / 1000);
      act(root, "total").textContent = o.far === Infinity ? "∞" : fmtM((o.far - o.near) / 1000);
      act(root, "hf").textContent = fmtM(o.Hf / 1000); act(root, "fov").textContent = o.fov.toFixed(0) + "° wide";
      // Side-view diagram on a log scale from 0.3 m to 100 m
      const DW = dia.width, DH = dia.height, X = (m) => 90 + (Math.log(Math.min(100, Math.max(0.3, m)) / 0.3) / Math.log(100 / 0.3)) * (DW - 140);
      dg.fillStyle = "#0B0A10"; dg.fillRect(0, 0, DW, DH);
      dg.fillStyle = "rgba(255,178,36,.18)"; const x0 = X(o.near / 1000), x1 = o.far === Infinity ? DW - 50 : X(o.far / 1000); dg.fillRect(x0, 30, x1 - x0, DH - 70);
      dg.strokeStyle = "#FFB224"; dg.lineWidth = 2; dg.strokeRect(x0, 30, x1 - x0, DH - 70);
      dg.fillStyle = "#EDEBE6"; dg.beginPath(); dg.roundRect(20, DH / 2 - 22, 46, 34, 6); dg.fill(); dg.fillRect(66, DH / 2 - 12, 14, 14);
      [0.3, 0.5, 1, 2, 5, 10, 20, 50, 100].forEach((m) => { dg.fillStyle = "rgba(237,235,230,.4)"; dg.fillRect(X(m), DH - 40, 1, 8); dg.font = `600 12px ${M}`; dg.textAlign = "center"; dg.fillText(m < 1 ? m * 100 + "cm" : m + "m", X(m), DH - 16); });
      dg.fillStyle = "#6E6BFF"; dg.fillRect(X(o.s / 1000) - 1.5, 22, 3, DH - 54); dg.font = `700 13px ${M}`; dg.fillText("subject", X(o.s / 1000), 18);
      if (o.Hf / 1000 <= 100) { dg.fillStyle = "#F17FA6"; dg.fillRect(X(o.Hf / 1000), 30, 1, DH - 70); dg.fillText("hyperfocal", X(o.Hf / 1000), DH - 46); }
      dg.textAlign = "left";
    }
    const setPreset = ([f, n, d]) => { focal.value = f; ap.value = STOPS.indexOf(n); dist.value = fromM(d); };
    sceneSel.addEventListener("change", () => { setPreset(PRESETS[sceneSel.value]); render(); });
    [sensorSel, focal, ap, dist].forEach((el) => el.addEventListener("input", render));
    act(root, "hyper").addEventListener("click", () => { const o = optics(); dist.value = Math.min(100, fromM(o.Hf / 1000)); render(); });
    setPreset(PRESETS.Portrait);
    new IntersectionObserver(([e], ob) => { if (e.isIntersecting) { ob.disconnect(); render(); } }, { rootMargin: "300px" }).observe(cv);
  })();

})();
