const V = "mnv-v2", PAGES = ["/website/", "/website/apps/", "/website/about/", "/website/side-quests/", "/website/contact/", "/website/apps/qalamkaar/", "/website/apps/bloom/", "/website/apps/toolbox/", "/website/privacy/qalamkaar/", "/website/privacy/bloom/", "/website/privacy/toolbox/"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(["/website/assets/css/style.css", "/website/assets/js/main.js", "/website/assets/js/board.js", "/website/assets/js/beat.js", "/website/assets/js/quests.js", "/website/assets/js/lab.js", "/website/assets/js/tools.js", "/website/assets/js/art.js", "/website/assets/js/make.js", "/website/assets/js/grade.js", "/website/assets/js/studio.js", "/website/assets/js/ai.js", "/website/assets/js/three-lab.js", "/website/assets/img/logo.svg", "/website/404.html", ...PAGES])).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((ca) => ca.put(r, c)); return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match("/website/404.html"))));
  } else {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((ca) => ca.put(r, c)); return res; })));
  }
});
