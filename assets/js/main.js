/* MNV Studio — interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  /* ---------- Theme ---------- */
  $$(".theme-toggle").forEach((b) => b.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("mnv-theme", next); } catch {}
  }));

  /* ---------- Mobile menu ---------- */
  const menuBtn = $(".menu-btn"), links = $(".nav__links");
  menuBtn?.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menuBtn.textContent = open ? "Close" : "Menu";
    menuBtn.setAttribute("aria-expanded", open);
  });

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  $$("[data-fade]").forEach((el) => io.observe(el));

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
    if (reduce) return;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1600);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4))) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.4 });
  $$("[data-count]").forEach((c) => cio.observe(c));

  /* ---------- Copy email, compose a note ---------- */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = t), 1800); }
    catch { prompt("Copy this:", b.dataset.copy); }
  }));
  $$("[data-compose]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(f), subject = d.get("topic") || "A note from your studio board";
    location.href = `mailto:${f.dataset.compose}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(d.get("msg"))}`;
    f.querySelector("button[type=submit]").textContent = "Opening your email app…";
  }));

  /* ---------- Offline support ---------- */
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});

  /* ---------- Easter egg: type "mnv" ---------- */
  window.mnvConfetti = () => confetti();
  let buf = "";
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, [contenteditable]")) return;
    buf = (buf + (e.key || "").toLowerCase()).slice(-3);
    if (buf === "mnv") { buf = ""; confetti(); }
  });
  function confetti() {
    let cv = $("#confetti");
    if (!cv) { cv = Object.assign(document.createElement("canvas"), { id: "confetti" }); document.body.append(cv); }
    const ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#3B3BFF", "#D4FF3A", "#FF4FA0", "#00B37A", "#FF5A36"];
    const ps = Array.from({ length: reduce ? 60 : 200 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.6, vx: (Math.random() - 0.5) * 22, vy: -Math.random() * 22 - 6,
      s: Math.random() * 7 + 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0],
    }));
    let frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => {
        p.vy += 0.45; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (++frames < 200) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
