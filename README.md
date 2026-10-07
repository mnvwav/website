# MNV Studio website

A static site: plain HTML, CSS and JS, with GSAP, ScrollTrigger and Lenis loaded from a CDN. There's no build tooling. All content lives in `build.py`.

```
mnv-studio/
├── build.py                 ← edit SITE + APPS here, then run it
├── assets/
│   ├── css/style.css
│   ├── js/main.js           ← loader, particles, cursor, magnetic, tilt, gallery, counters, confetti, theme
│   └── img/logo.svg         ← monogram + favicon
├── index.html  404.html  sitemap.xml  robots.txt     (generated)
├── apps/index.html  apps/<slug>/index.html           (generated)
├── about/  contact/                                  (generated)
└── privacy/<slug>/index.html                         (generated, one per app)
```

## Edit and run
1. Fill in the placeholders in `build.py`: domain, email, social links, Play links, descriptions, and the privacy facts for each app.
2. Add images under `assets/img/apps/<slug>/` and set `icon` and `screenshots` to their paths.
3. Add a 1200×630 `assets/img/og.png` for social previews.
4. Run `python3 build.py`, then `python3 -m http.server 4173` and open http://localhost:4173.

## Deploy (free)
- **Netlify:** drag the folder onto app.netlify.com/drop, or connect the repo with no build command and publish directory `.`
- **Vercel:** `npx vercel` in this folder, using the "Other" framework preset with no build command.
- **GitHub Pages:** push the folder and enable Pages from the root of `main`. Use a custom domain or a `<user>.github.io` repo, because pages use root-absolute paths like `/assets/...`.

Privacy policy URLs for the Play Console: `https://<your-domain>/privacy/<slug>/`
