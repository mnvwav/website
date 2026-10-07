const V = "mnv-v2", PAGES = ["/", "/apps/", "/about/", "/side-quests/", "/contact/", "/apps/qalamkaar/", "/apps/bloom/", "/apps/toolbox/", "/privacy/qalamkaar/", "/privacy/bloom/", "/privacy/toolbox/"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(["/assets/css/style.css", "/assets/js/main.js", "/assets/js/board.js", "/assets/js/beat.js", "/assets/js/quests.js", "/assets/js/lab.js", "/assets/js/tools.js", "/assets/js/art.js", "/assets/js/make.js", "/assets/js/grade.js", "/assets/js/studio.js", "/assets/js/ai.js", "/assets/js/three-lab.js", "/assets/img/logo.svg", "/404.html", ...PAGES])).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((ca) => ca.put(r, c)); return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match("/404.html"))));
  } else {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((ca) => ca.put(r, c)); return res; })));
  }
});
