/* The Studio Board — pan, zoom, fly-to, tour, minimap and a wandering collaborator cursor */
(() => {
  const board = document.querySelector(".board");
  if (!board) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const world = $(".world", board);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clusters = $$("[data-cluster]", world);
  const zoomOut = $(".hud__zoom output");
  const MIN = 0.12, MAX = 2;
  const cam = { x: 0, y: 0, s: 1 };
  let anim = null;

  const W = () => board.clientWidth, H = () => board.clientHeight;
  const hudSpace = () => (innerWidth <= 760 ? 120 : 80);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function apply() {
    world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
    if (zoomOut) zoomOut.textContent = Math.round(cam.s * 100) + "%";
    // Semantic zoom: far out, titles grow so the overview stays readable.
    world.style.setProperty("--inv", (1 / cam.s).toFixed(3));
    board.classList.toggle("far", cam.s < 0.45);
    drawView();
  }

  /* ---------- Geometry ---------- */
  const rectOf = (el) => {
    const label = el.querySelector(".cluster__label") ? 80 : 0;
    return { x: el.offsetLeft, y: el.offsetTop - label, w: el.offsetWidth, h: el.offsetHeight + label };
  };
  const ALL = { x: 0, y: 0, w: 3600, h: 2150 };
  function camFor(r, pad = 40, maxS = 1.05) {
    const w = W() - pad * 2, h = H() - pad * 2 - hudSpace();
    const s = clamp(Math.min(w / r.w, h / r.h, maxS), MIN, MAX);
    return { s, x: W() / 2 - (r.x + r.w / 2) * s, y: (H() - hudSpace()) / 2 - (r.y + r.h / 2) * s };
  }

  /* ---------- Animated camera ---------- */
  function flyTo(target, dur = 950) {
    cancelAnimationFrame(anim);
    if (reduce || dur === 0) { Object.assign(cam, target); return apply(); }
    const from = { ...cam }, t0 = performance.now();
    // Zoom out a little mid-flight when travelling far: feels like a camera, not a slide.
    const dist = Math.hypot(target.x - from.x, target.y - from.y);
    const dip = Math.min(0.35, dist / 6000);
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = ease(k);
      const sDip = 1 - dip * Math.sin(Math.PI * k);
      const s = (from.s + (target.s - from.s) * e) * sDip;
      // Keep the interpolated world-centre stable while the scale dips.
      const cxFrom = (W() / 2 - from.x) / from.s, cyFrom = (H() / 2 - from.y) / from.s;
      const cxTo = (W() / 2 - target.x) / target.s, cyTo = (H() / 2 - target.y) / target.s;
      const cx = cxFrom + (cxTo - cxFrom) * e, cy = cyFrom + (cyTo - cyFrom) * e;
      cam.s = s; cam.x = W() / 2 - cx * s; cam.y = H() / 2 - cy * s;
      apply();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  const flyToEl = (el, opts) => {
    if (!el) return;
    // On phones a whole cluster is too small to read: land on the finished app card instead.
    const card = innerWidth <= 760 && el.querySelector(".shipped");
    const r = card ? { x: el.offsetLeft + card.offsetLeft - 20, y: el.offsetTop + card.offsetTop - 60, w: card.offsetWidth + 40, h: card.offsetHeight + 80 } : rectOf(el);
    flyTo(camFor(r, opts?.pad ?? (card ? 12 : 40), opts?.maxS ?? 1.05), opts?.dur);
  };
  function zoomAt(px, py, f) {
    cancelAnimationFrame(anim);
    const ns = clamp(cam.s * f, MIN, MAX);
    cam.x = px - (px - cam.x) * (ns / cam.s);
    cam.y = py - (py - cam.y) * (ns / cam.s);
    cam.s = ns; apply();
  }

  /* ---------- Pan, pinch, wheel ---------- */
  const pts = new Map();
  let moved = 0, pinch = null, suppress = false;
  const interactive = (t) => t.closest("a, button, textarea, input, select, label, .tour-cap, .hud, .minimap");
  board.addEventListener("pointerdown", (e) => {
    if (interactive(e.target) && e.pointerType === "mouse") return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (pts.size === 1) { board.setPointerCapture(e.pointerId); }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
  });
  board.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { coached(); board.classList.add("panning"); stopTour(); cancelAnimationFrame(anim); cam.x += dx; cam.y += dy; apply(); }
    } else if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()], b0 = board.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      moved = 99; stopTour();
      cam.x += mx - pinch.mx; cam.y += my - pinch.my;
      zoomAt(mx - b0.left, my - b0.top, d / pinch.d);
      pinch = { d, mx, my };
    }
  });
  const up = (e) => { if (pts.has(e.pointerId) && moved > 6) { suppress = true; setTimeout(() => (suppress = false), 0); } pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) board.classList.remove("panning"); };
  board.addEventListener("pointerup", up); board.addEventListener("pointercancel", up);
  // A drag that ends on a link shouldn't open it.
  board.addEventListener("click", (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } }, true);

  board.addEventListener("wheel", (e) => {
    if (e.target.closest("textarea")) return;
    e.preventDefault(); stopTour(); coached();
    const b = board.getBoundingClientRect();
    const mouseWheel = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && e.deltaX === 0 && !e.ctrlKey);
    if (e.ctrlKey || e.metaKey || mouseWheel) zoomAt(e.clientX - b.left, e.clientY - b.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)));
    else { cancelAnimationFrame(anim); cam.x -= e.deltaX; cam.y -= e.deltaY; apply(); }
  }, { passive: false });

  /* ---------- HUD ---------- */
  $$("[data-zoom]").forEach((b) => b.addEventListener("click", () => zoomAt(W() / 2, (H() - hudSpace()) / 2, b.dataset.zoom > 0 ? 1.3 : 1 / 1.3)));
  $$("[data-fit]").forEach((b) => b.addEventListener("click", () => { stopTour(); flyTo(camFor(ALL, 30)); }));
  const go = (id) => { const el = document.getElementById(id); if (!el) return; stopTour(); flyToEl(el); history.replaceState(null, "", "#" + id); };
  $$("[data-fly]").forEach((b) => b.addEventListener("click", () => go(b.dataset.fly)));

  /* ---------- Minimap ---------- */
  const mm = $(".minimap"), mmItems = $(".minimap__items"), mmView = $(".minimap__view");
  clusters.forEach((c) => {
    const r = rectOf(c), el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    Object.entries({ x: r.x, y: r.y, width: r.w, height: r.h }).forEach(([k, v]) => el.setAttribute(k, v));
    if (c.classList.contains("cluster") && !c.classList.contains("cluster--me") && !c.classList.contains("cluster--note")) el.classList.add("ink");
    mmItems?.append(el);
  });
  function drawView() {
    if (!mmView) return;
    mmView.setAttribute("x", -cam.x / cam.s); mmView.setAttribute("y", -cam.y / cam.s);
    mmView.setAttribute("width", W() / cam.s); mmView.setAttribute("height", H() / cam.s);
  }
  mm?.addEventListener("click", (e) => {
    const b = mm.getBoundingClientRect(), wx = ((e.clientX - b.left) / b.width) * 3600, wy = ((e.clientY - b.top) / b.height) * 2150;
    stopTour(); flyTo({ s: cam.s, x: W() / 2 - wx * cam.s, y: (H() - hudSpace()) / 2 - wy * cam.s }, 600);
  });

  /* ---------- Guided tour ---------- */
  const STEPS = [
    ["hello", "Welcome to the studio board. Every app here started as a sticky note. Let me walk you through them."],
    ["qalamkaar", "Qalamkaar: a library of Punjabi writers. The hardest part was making Gurmukhi and English typography sit together."],
    ["bloom", "Bloom: a gentle PCOS and PCOD companion. All the health data stays on your phone. Always."],
    ["toolbox", "Toolbox: converters, calculators, a QR scanner and more. Coming soon."],
    ["me", "And that's me. One person, building apps and designing them."],
    ["say-hello", "If you've got an idea, a bug or a hello, pin a note here. It goes straight to my inbox."],
  ];
  const cap = $(".tour-cap"), capText = $(".tour-cap p");
  let step = -1, timer = null;
  function show(i) {
    step = (i + STEPS.length) % STEPS.length;
    const [id, text] = STEPS[step], el = document.getElementById(id);
    clusters.forEach((c) => c.classList.toggle("focus", c === el));
    board.classList.add("touring"); cap.hidden = false; capText.textContent = `${step + 1}/${STEPS.length} · ${text}`;
    flyToEl(el, { dur: 1300 });
    arm();
  }
  const bar = $(".tour-cap__bar");
  function arm() {
    clearTimeout(timer);
    bar.style.animation = "none"; bar.offsetWidth;
    if (step < STEPS.length - 1) { bar.style.animation = ""; timer = setTimeout(() => show(step + 1), 6500); }
  }
  cap.addEventListener("mouseenter", () => { clearTimeout(timer); bar.style.animationPlayState = "paused"; });
  cap.addEventListener("mouseleave", () => { if (step >= 0) { bar.style.animationPlayState = ""; arm(); } });
  function stopTour() {
    if (step < 0) return;
    step = -1; clearTimeout(timer); cap.hidden = true; board.classList.remove("touring");
    clusters.forEach((c) => c.classList.remove("focus"));
  }
  $$("[data-tour]").forEach((b) => b.addEventListener("click", () => show(0)));
  $("[data-tour-next]")?.addEventListener("click", () => show(step + 1));
  $("[data-tour-prev]")?.addEventListener("click", () => show(step - 1));
  $("[data-tour-stop]")?.addEventListener("click", stopTour);

  /* ---------- Keyboard ---------- */
  const ORDER = ["qalamkaar", "bloom", "toolbox", "me", "say-hello"];
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("textarea, input") || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key, cx = W() / 2, cy = (H() - hudSpace()) / 2;
    if (k === "Escape") return stopTour();
    if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
      if (step >= 0 && (k === "ArrowLeft" || k === "ArrowRight")) return show(step + (k === "ArrowRight" ? 1 : -1));
      e.preventDefault(); cancelAnimationFrame(anim);
      cam.x += k === "ArrowLeft" ? 120 : k === "ArrowRight" ? -120 : 0;
      cam.y += k === "ArrowUp" ? 120 : k === "ArrowDown" ? -120 : 0;
      return apply();
    }
    if (k === "+" || k === "=") zoomAt(cx, cy, 1.25);
    else if (k === "-" || k === "_") zoomAt(cx, cy, 0.8);
    else if (k === "0") flyTo(camFor(ALL, 30));
    else if (k === "h") go("hello");
    else if (k === "t") show(0);
    else if (/^[1-5]$/.test(k)) go(ORDER[+k - 1]);
  });
  // Tabbing to something off-screen flies the camera to it.
  board.addEventListener("focusin", (e) => {
    const c = e.target.closest?.("[data-cluster]"); if (!c || !e.target.matches(":focus-visible")) return;
    const r = e.target.getBoundingClientRect(), b = board.getBoundingClientRect();
    if (r.left < b.left || r.right > b.right || r.top < b.top || r.bottom > b.bottom - hudSpace()) flyToEl(c, { dur: 600 });
  });

  /* ---------- A collaborator cursor wandering the board ---------- */
  const peer = $(".peer"), said = $(".peer em");
  const PATH = [
    [1480, 800, "hey 👋 welcome to my board"],
    [520, 300, "the typography here took weeks"],
    [1780, 260, "this one matters the most to me"],
    [3000, 300, "this one's coming soon 👀"],
    [2620, 1440, "leave me a note!"],
    [440, 1440, "that's me"],
    [2200, 620, "two out, one on the way"],
  ];
  if (peer && !reduce) {
    let i = 0;
    const walk = () => {
      const [x, y, msg] = PATH[i++ % PATH.length];
      peer.classList.remove("talk");
      peer.style.translate = `${x}px ${y}px`;
      setTimeout(() => { said.textContent = msg; peer.classList.add("talk"); }, 2700);
    };
    setTimeout(walk, 1200);
    let iv = setInterval(walk, 6500);
    document.addEventListener("visibilitychange", () => { clearInterval(iv); if (!document.hidden) iv = setInterval(walk, 6500); });
  }

  /* ---------- Toast ---------- */
  const toastEl = $(".toast", board);
  let toastT;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 2600); };

  /* ---------- Share this exact view ---------- */
  $("[data-share]")?.addEventListener("click", async () => {
    const cx = (W() / 2 - cam.x) / cam.s, cy = ((H() - hudSpace()) / 2 - cam.y) / cam.s;
    const url = `${location.origin}/#@${Math.round(cx)},${Math.round(cy)},${cam.s.toFixed(2)}`;
    history.replaceState(null, "", url);
    if (navigator.share && innerWidth <= 760) { try { await navigator.share({ title: "MNV Studio board", url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); toast("Link copied. It opens exactly this view."); }
    catch { prompt("Copy this link:", url); }
  });

  /* ---------- Double-click to zoom ---------- */
  board.addEventListener("dblclick", (e) => {
    if (e.target.closest("a, button, textarea, input, select, .hud, .minimap, .tour-cap")) return;
    stopTour(); coached();
    const c = e.target.closest("[data-cluster]");
    const zoomedIn = c && cam.s > 0.9;
    if (c && !zoomedIn) return flyToEl(c);
    const b = board.getBoundingClientRect(), wx = (e.clientX - b.left - cam.x) / cam.s, wy = (e.clientY - b.top - cam.y) / cam.s;
    const s = clamp(cam.s * 1.8, MIN, MAX);
    flyTo({ s, x: e.clientX - b.left - wx * s, y: e.clientY - b.top - wy * s }, 500);
  });

  /* ---------- First-visit coach mark ---------- */
  const coach = $(".coach");
  let isCoached = true;
  try { isCoached = !!localStorage.getItem("mnv-coached"); } catch {}
  if (!isCoached && !reduce) { coach.classList.add("show"); setTimeout(coached, 7000); }
  function coached() {
    if (!coach?.classList.contains("show")) return;
    coach.classList.remove("show");
    try { localStorage.setItem("mnv-coached", "1"); } catch {}
  }

  /* ---------- Shortcuts panel ---------- */
  const help = $(".help");
  const toggleHelp = (on = help.hidden) => { help.hidden = !on; if (on) $("[data-help-close]", help).focus(); };
  $("[data-help]")?.addEventListener("click", () => toggleHelp());
  $("[data-help-close]")?.addEventListener("click", () => toggleHelp(false));

  /* ---------- ⌘K search ---------- */
  const pal = $(".palette"), q = $(".palette__q"), list = $(".palette__list");
  const APPS = JSON.parse($("#mnv-apps")?.textContent || "[]");
  const nav = (url) => () => (location.href = url);
  const CMDS = [
    ...APPS.map((a) => ({ label: a.name, hint: a.short, kind: "On the board", run: () => go(a.slug) })),
    ...APPS.map((a) => ({ label: a.name + " app page", kind: "Page", run: nav(`/apps/${a.slug}/`) })),
    ...APPS.map((a) => ({ label: a.name + " privacy policy", kind: "Page", run: nav(`/privacy/${a.slug}/`) })),
    { label: "About me", kind: "On the board", run: () => go("me") },
    { label: "Leave a note", hint: "contact email", kind: "On the board", run: () => go("say-hello") },
    { label: "About me (full page)", kind: "Page", run: nav("/website/about/") },
    { label: "All apps", kind: "Page", run: nav("/website/apps/") },
    { label: "Contact", kind: "Page", run: nav("/website/contact/") },
    { label: "Side quests", hint: "make a beat drum machine music", kind: "Page", run: nav("/website/side-quests/") },
    { label: "Take the tour", kind: "Action", run: () => show(0) },
    { label: "See the whole board", kind: "Action", run: () => flyTo(camFor(ALL, 30)) },
    { label: "Share this view", kind: "Action", run: () => $("[data-share]").click() },
    { label: "Toggle dark mode", kind: "Action", run: () => $(".theme-toggle")?.click() },
    { label: "Keyboard shortcuts", kind: "Action", run: () => toggleHelp(true) },
  ];
  let sel = 0, shown = [];
  const score = (c, s) => {
    const t = (c.label + " " + (c.hint || "")).toLowerCase();
    if (!s) return 1;
    if (t.startsWith(s)) return 3;
    if (t.includes(s)) return 2;
    let i = 0; for (const ch of t) if (ch === s[i]) i++;
    return i === s.length ? 1 : 0;
  };
  function render() {
    const s = q.value.trim().toLowerCase();
    shown = CMDS.map((c) => [score(c, s), c]).filter(([n]) => n).sort((a, b) => b[0] - a[0]).map(([, c]) => c).slice(0, 8);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? "" : '<li class="palette__none">Nothing found. Try "bloom" or "privacy".</li>';
    shown.forEach((c, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option"); li.setAttribute("aria-selected", i === sel);
      li.innerHTML = "<span></span><small></small>";
      li.firstChild.textContent = c.label; li.lastChild.textContent = c.kind;
      li.addEventListener("click", () => run(i));
      li.addEventListener("pointermove", () => { if (sel !== i) { sel = i; render(); } });
      list.append(li);
    });
  }
  const openPal = () => { pal.hidden = false; q.value = ""; sel = 0; render(); q.focus(); };
  const closePal = () => { pal.hidden = true; };
  const run = (i) => { const c = shown[i]; closePal(); c?.run(); };
  q.addEventListener("input", () => { sel = 0; render(); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = (sel + 1) % shown.length; render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = (sel - 1 + shown.length) % shown.length; render(); e.preventDefault(); }
    else if (e.key === "Enter") run(sel);
    else if (e.key === "Escape") closePal();
  });
  pal.addEventListener("click", (e) => { if (e.target === pal) closePal(); });
  $("[data-search]")?.addEventListener("click", openPal);
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
    else if (e.key === "?" && !e.target.closest?.("textarea, input")) toggleHelp();
    else if (e.key === "Escape") { closePal(); toggleHelp(false); }
  });

  /* ---------- Start ---------- */
  const start = () => {
    board.scrollTop = board.scrollLeft = 0;
    const at = location.hash.match(/^#@(-?[\d.]+),(-?[\d.]+),([\d.]+)$/);
    if (at) { const s = clamp(+at[3], MIN, MAX); return flyTo({ s, x: W() / 2 - at[1] * s, y: (H() - hudSpace()) / 2 - at[2] * s }, 0); }
    const id = location.hash.slice(1), el = id && document.getElementById(id);
    if (el && el.matches("[data-cluster]")) return flyToEl(el, { dur: 0 });
    // First view: the intro, with neighbouring clusters peeking in at the edges.
    const r = rectOf($("#hello"));
    const wide = innerWidth > 760;
    flyTo(camFor(wide ? { x: r.x - 380, y: r.y - 260, w: r.w + 760, h: r.h + 520 } : r, wide ? 30 : 12, 1), 0);
  };
  start();
  addEventListener("hashchange", () => { const el = document.getElementById(location.hash.slice(1)); if (el?.matches("[data-cluster]")) flyToEl(el); });
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { const c = { x: (W() / 2 - cam.x) / cam.s, y: (H() / 2 - cam.y) / cam.s }; cam.x = W() / 2 - c.x * cam.s; cam.y = H() / 2 - c.y * cam.s; apply(); }, 150); });
  document.fonts?.ready.then(() => { $$(".minimap__items rect").forEach((el, k) => { const r = rectOf(clusters[k]); el.setAttribute("y", r.y); el.setAttribute("height", r.h); }); });
})();
