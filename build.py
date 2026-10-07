#!/usr/bin/env python3
"""MNV Studio static site generator.

Edit SITE and APPS below, then run:  python3 build.py
It writes every HTML page into this folder. No dependencies.
"""
import re
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).parent

# ---------------------------------------------------------------------------
# Studio settings  (replace the bracketed placeholders)
# ---------------------------------------------------------------------------
SITE = {
    "name": "MNV Studio",
    "url": "https://mnvstudio.example",          # your live domain, no trailing slash
    "base": "/website",                          # path the site is served under ("" for a domain root)
    "tagline": "Crafting apps with culture and care",
    "founder": "Manav",
    "full_name": "Manav Sachdeva",
    "email": "hello@mnvstudio.example",          # studio email, also used in every privacy policy
    "location": "Punjab, India",
    "policy_effective": "7 October 2026",
    "socials": [
        ("Google Play", "https://play.google.com/store/apps/dev?id=REPLACE_ME", "Developer page"),
        ("Instagram", "https://instagram.com/REPLACE_ME", "@mnvstudio"),
        ("GitHub", "https://github.com/REPLACE_ME", "Open source"),
        ("LinkedIn", "https://linkedin.com/in/REPLACE_ME", "Manav"),
    ],
    "stats": [(2, "", "Apps published"), (100, "K+", "Downloads"), (24, "", "Tools built"), (3, "", "Languages served")],
    "news": [  # newest first: (date, app, note). Placeholders, replace with real release notes.
        ("Oct 2026", "Bloom", "Smarter predictions for irregular cycles. [edit]"),
        ("Sep 2026", "Qalamkaar", "40 new writer profiles and offline search. [edit]"),
        ("Aug 2026", "Toolbox", "New unit converter and a faster QR scanner. [edit]"),
    ],
    "stack": ["Kotlin", "Jetpack Compose", "Android SDK", "Material 3", "Firebase", "Room", "Coroutines", "Figma", "Play Billing", "Gradle", "VS Code", "Claude (iykyk)", "FL Studio", "Logic Pro", "Brain (the main thing)"],
}

# ---------------------------------------------------------------------------
# About me. Everything in [brackets] is a placeholder: replace it with your own words.
# ---------------------------------------------------------------------------
ME = {
    "photo": None,   # e.g. "/assets/img/manav.jpg" (square, at least 800×800). None shows a monogram card.
    "intro": "I'm an independent application developer and designer. I build apps and I design.",
    "facts": [
        ("Based in", "Punjab, India"),
        ("Role", "Independent app developer & designer"),
        ("Age", "17"),
        ("Languages", "Punjabi, Hindi, English"),
        ("Fuelled by", "Music"),
    ],
    "story": [
        "I'm 17, and I build apps on my own, from the first sketch to the Play Store.",
        "I don't split my work into building and designing. I do both, because an app only feels right when the same person cares about how it works and how it looks.",
        "When I'm not making apps, I'm producing and mixing music. Same thing really: layers, details, and knowing when it's done.",
    ],
    "offclock": ["Producing and mixing music", "Living life, and questioning all of it"],
    "stance": ("I don't believe. I know.",
               "I don't believe in anything. Believing isn't my approach. Knowing is, and knowing is a totally different dimension. And I know I don't know nothing."),
}

# ---------------------------------------------------------------------------
# Apps. For each one, fill in the icon, screenshots, Play link and privacy facts.
#   icon:        "/assets/img/apps/<slug>/icon.png"  (None shows a monogram)
#   screenshots: list of image paths (3–5). Empty slots show a placeholder frame.
#   privacy.collected: list of (data type, purpose, where stored). [] means "no data collected".
#   privacy.services:  third-party SDKs the app actually ships. Remove any you don't use.
# ---------------------------------------------------------------------------
APPS = [
    {
        "slug": "qalamkaar", "glyph": "Qk", "ink": "magenta", "name": "Qalamkaar", "native": "The Punjabi literature library",
        "category": "Literature · Reference",
        "short": "An encyclopedia of Punjabi writers and their works.",
        "description": "Qalamkaar gathers the poets, novelists and essayists of Punjabi literature into one beautifully typeset library: biographies, bibliographies and excerpts in Gurmukhi and English. [Expand description]",
        "features": [
            ("Writer profiles", "Lives, eras and literary movements of hundreds of Punjabi writers."),
            ("Works & excerpts", "Browse books, poems and essays with publication details."),
            ("Bilingual", "Gurmukhi and English side by side, with careful typography."),
            ("Offline reading", "Save favourite writers and read without a connection."),
        ],
        "colors": ("#3A2A12", "#C9A23A"), "icon": None, "screenshots": [None] * 4,
        "play": "https://play.google.com/store/apps/details?id=REPLACE_ME",
        "privacy": {
            "collected": [],
            "services": ["AdMob", "Firebase Analytics", "Firebase Crashlytics"],
            "storage": "Your favourites and reading preferences are stored only on your device.",
        },
    },
    {
        "slug": "bloom", "glyph": "Bl", "ink": "saffron", "name": "Bloom", "native": "PCOS / PCOD care",
        "category": "Health · Wellness",
        "short": "A gentle companion for living with PCOS and PCOD.",
        "description": "Bloom helps you track cycles, symptoms, moods and habits, and shows patterns over time, so conversations with your doctor start from real data. [Expand description]",
        "features": [
            ("Cycle tracking", "Log periods and see predictions that adapt to irregular cycles."),
            ("Symptom journal", "Record symptoms, mood, sleep and energy in seconds."),
            ("Insights", "Charts that surface patterns across weeks and months."),
            ("Private by design", "Your health data stays on your phone. Never sold, never shared."),
        ],
        "colors": ("#3B1430", "#E2A3B8"), "icon": None, "screenshots": [None] * 5,
        "play": "https://play.google.com/store/apps/details?id=REPLACE_ME",
        "health": True,
        "privacy": {
            "collected": [
                ("Health information you enter (cycle dates, symptoms, mood, weight, notes)", "To show your history, predictions and insights", "On your device only (encrypted app storage)"),
                ("App preferences and reminders", "To personalise the app and send reminders you set", "On your device only"),
                ("Crash diagnostics (no health data)", "To fix bugs", "Firebase Crashlytics"),
            ],
            "services": ["Firebase Crashlytics", "Google Play Billing"],
            "storage": "All health information is stored on your device in the app's private, encrypted storage. [If you add cloud backup, describe it here: provider, region, encryption, and that it is opt-in.]",
        },
    },


    {
        "slug": "toolbox", "soon": True, "glyph": "Tb", "ink": "red", "name": "[Toolbox App]", "native": "Everything, in one place",
        "category": "Tools · Productivity",
        "short": "An all-in-one Android toolbox.",
        "description": "A carefully designed set of everyday utilities in one lightweight app: converters, calculators, a QR scanner, a device info panel and more. [Expand description]",
        "features": [
            ("Many tools, one app", "Converters, calculators, QR, timers and more."),
            ("Lightweight", "Small download, fast launch, no clutter."),
            ("Works offline", "Every core tool works without a connection."),
            ("Thoughtful design", "Consistent and accessible, in light and dark."),
        ],
        "colors": ("#0F2A2A", "#D4AF37"), "icon": None, "screenshots": [None] * 4,
        "play": "https://play.google.com/store/apps/details?id=REPLACE_ME",
        "privacy": {
            "collected": [
                ("Camera access (QR scanner only)", "To scan codes. Frames are not saved or sent", "Not stored"),
            ],
            "services": ["AdMob", "Firebase Crashlytics"],
            "storage": "Tool history and settings are stored only on your device. [List any other permissions the app requests.]",
        },
    },
]

SERVICES = {
    "AdMob": ("Google AdMob", "Shows ads. May collect the device advertising ID, IP address and ad interaction data.", "https://policies.google.com/privacy"),
    "Firebase Analytics": ("Google Analytics for Firebase", "Anonymous usage statistics such as screens viewed and session length.", "https://firebase.google.com/support/privacy"),
    "Firebase Crashlytics": ("Firebase Crashlytics", "Crash reports: device model, OS version and stack traces.", "https://firebase.google.com/support/privacy"),
    "Google Play Billing": ("Google Play Billing", "Processes purchases. We never see your payment details.", "https://payments.google.com/payments/apis-secure/get_legal_document?ldo=0&ldt=privacynotice"),
}

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
e = escape

SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2.8v18.4c0 .6.7 1 1.2.7L21 12.7c.5-.3.5-1 0-1.3L5.2 2.1C4.7 1.8 4 2.2 4 2.8z"/></svg>'
APPLE = '<svg class="apple" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-3.9zM14 5.3c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>'
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def layout(path, title, desc, body, ld=None):
    url = SITE["url"] + path
    full_title = title if title == SITE["name"] else f"{title} — {SITE['name']}"
    nav = [("/", "Home"), ("/apps/", "Apps"), ("/about/", "About me"), ("/side-quests/", "Side quests"), ("/contact/", "Contact")]
    nav_html = "".join(
        f'<li><a href="{h}"{" aria-current=page" if (path == h or (h != "/" and path.startswith(h))) else ""}>{t}</a></li>'
        for h, t in nav
    )
    ld = ld or {"@context": "https://schema.org", "@type": "Organization", "name": SITE["name"], "url": SITE["url"],
                 "email": SITE["email"], "founder": {"@type": "Person", "name": SITE["founder"]},
                 "sameAs": [h for _, h, _ in SITE["socials"]]}
    ld_html = json.dumps(ld).replace("</", "<\\/")
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#3D3AE8">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{SITE['name']}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE['url']}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE['url']}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="icon" href="/assets/img/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=JetBrains+Mono:wght@400;600&family=Caveat:wght@600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="manifest" href="/manifest.webmanifest">
<script type="application/ld+json">{ld_html}</script>
<script>(function(d){{d.classList.add('js');try{{var t=localStorage.getItem('mnv-theme');if(t)d.dataset.theme=t}}catch(e){{}}}})(document.documentElement)</script>
</head>
<body>
<a class="sr-only" href="#main">Skip to content</a>
<header class="nav">
  <a class="nav__logo" href="/" aria-label="{SITE['name']} home"><span class="nav__mark" aria-hidden="true">M</span>MNV Studio</a>
  <nav aria-label="Primary"><ul class="nav__links">{nav_html}</ul></nav>
  <div class="nav__right">
    <button class="theme-toggle" aria-label="Switch to night print">{SUN}</button>
    <button class="menu-btn" aria-expanded="false">Menu</button>
  </div>
</header>
<main id="main">
{body}
</main>
{footer()}
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/board.js" defer></script>
</body>
</html>
'''


def footer():
    apps = "".join(f'<li><a href="/apps/{a["slug"]}/">{e(a["name"])}</a></li>' for a in APPS)
    privacy = "".join(f'<li><a href="/privacy/{a["slug"]}/">{e(a["name"])}</a></li>' for a in APPS)
    socials = "".join(f'<li><a href="{h}" target="_blank" rel="noopener">{t}</a></li>' for t, h, _ in SITE["socials"])
    return f'''<footer class="footer">
  <div class="footer__grid">
    <div><h4>MNV Studio</h4><p class="footer__about">{e(SITE["tagline"])}. An independent Android studio from {e(SITE["location"])}.</p>
      <p class="footer__mail"><a class="link-gold" href="mailto:{SITE["email"]}">{SITE["email"]}</a></p></div>
    <div><h4>Apps</h4><ul>{apps}</ul></div>
    <div><h4>Privacy</h4><ul>{privacy}</ul></div>
    <div><h4>Elsewhere</h4><ul>{socials}</ul></div>
  </div>
  <a class="footer__giant" href="/" aria-label="MNV Studio home"><span aria-hidden="true">MNV</span></a>
  <div class="footer__bottom"><span>© <span data-year>2026</span> MNV Studio. Made by {SITE["founder"]}.</span><span>Psst, type “mnv”.</span></div>
</footer>'''


def phone(app, inner=None, name=""):
    a, b = app["colors"]
    style = f"--a:{a};--b:{b}" + (f";view-transition-name:{name}" if name else "")
    if inner is None:
        icon = f'<img src="{app["icon"]}" alt="" loading="lazy">' if app["icon"] else e(app["name"].strip("[]")[0])
        inner = f'<div class="app-icon">{icon}</div><strong>{e(app["name"])}</strong><small class="{"gu" if app["slug"] == "qalamkaar" else ""}">{e(app["native"])}</small>'
    return f'<div class="phone" style="{style}"><div class="phone__screen"><div class="phone__notch"></div>{inner}</div><div class="phone__glare"></div></div>'


def app_card(app, i):
    tilt = [-2.2, 1.6, -1.1, 2.4, -1.8][(i - 1) % 5]
    return f'''<a class="app-card ink-{app["ink"]}" style="--tilt:{tilt}deg;--len:{max(len(app['glyph']), 2)}" href="/apps/{app["slug"]}/" data-vt data-fade>
  <div class="cover">
    <div class="cover__top"><span>No. {i:02d}</span><span>{e(app["category"])}</span></div>
    <span class="cover__glyph" aria-hidden="true">{e(app["glyph"])}</span>
    <h3 class="cover__name">{e(app["name"])}</h3>
    <span class="cover__stitch" aria-hidden="true"></span>
  </div>
  <p>{e(app["short"])}</p>
</a>'''


def lines(*ls):
    return "".join(f'<span class="reveal-line"><span>{l}</span></span>' for l in ls)


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
# The studio board: every app as a little story (idea -> sketch -> colours -> shipped).
IDEAS = {
    "qalamkaar": "Punjabi writers deserve a library as beautiful as their words.",
    "bloom": "Tracking PCOS shouldn't feel clinical. Or leak your data.",
    "toolbox": "Why install twelve apps for twelve tiny jobs?",
}
# Top-left of each cluster on the 3600×2400 board.
SPOTS = {"qalamkaar": (160, 190), "bloom": (1420, 150), "toolbox": (2700, 210)}


def wireframe(seed):
    # A hand-drawn phone sketch; seed nudges the doodles so each app's sketch differs.
    j = lambda n: (seed * 7 + n * 13) % 9 - 4
    rows = "".join(
        f'<path d="M30 {150 + k * 34} q 40 {j(k)} 80 0 t 40 {j(k + 1)}"/>' for k in range(3 + seed % 2)
    )
    return f'''<svg class="sketch" viewBox="0 0 180 320" aria-hidden="true">
  <path d="M14 18 Q12 8 24 8 L158 10 Q170 10 168 24 L166 300 Q166 312 154 312 L26 310 Q14 310 15 298 Z"/>
  <path d="M70 22 L110 22"/>
  <path d="M30 46 L150 44 L148 120 L32 122 Z"/><path d="M32 46 L148 120 M148 44 L32 122"/>
  {rows}
  <path d="M40 270 q 50 -6 100 0" class="sketch__accent"/>
  <circle cx="90" cy="292" r="8"/>
</svg>'''


def home():
    def icon(app):
        return f'<span class="ico ink-{app["ink"]}" aria-hidden="true">{e(app["glyph"])}</span>'

    clusters = ""
    for i, a in enumerate(APPS):
        x, y = SPOTS[a["slug"]]
        feats = "".join(f"<li>{e(t)}</li>" for t, _ in a["features"][:3])
        clusters += f'''<section class="cluster ink-{a["ink"]}" id="{a["slug"]}" data-cluster style="left:{x}px;top:{y}px" aria-label="{e(a["name"])}">
  <h2 class="cluster__label"><span>{i + 1:02d}</span> {e(a["name"].strip("[]"))}</h2>
  <p class="note" style="--r:-4deg"><small>first thought</small>“{e(IDEAS[a["slug"]])}”</p>
  {wireframe(i)}
  <div class="swatches" aria-hidden="true"><i class="sw1"></i><i class="sw2"></i><i class="sw3"></i><small>palette v3 (final)</small></div>
  <article class="shipped">
    <div class="shipped__head">{icon(a)}<div><h3>{e(a["name"])}</h3><small>{e(a["category"])}</small></div></div>
    <p>{e(a["short"])}</p>
    <ul>{feats}</ul>
    <div class="shipped__go"><a class="btn btn--solid" href="/apps/{a["slug"]}/">Open {ARROW}</a><span class="appstore-soon">{APPLE} App Store soon</span>{f'<span class="soon-pill">Coming soon</span>' if a.get("soon") else f'<a class="link-gold" href="{a["play"]}" target="_blank" rel="noopener">Google Play ↗</a>'}</div>
  </article>
  <span class="stamp{' stamp--soon' if a.get("soon") else ''}" aria-hidden="true">{"Coming soon" if a.get("soon") else "Shipped"}</span>
  <svg class="arrows" viewBox="0 0 900 620" aria-hidden="true">
    <path d="M232 150 C 270 150, 270 120, 300 118" marker-end="url(#head)"/>
    <path d="M468 190 C 520 200, 540 190, 575 205" marker-end="url(#head)"/>
    <path d="M150 268 C 160 330, 190 380, 225 392" marker-end="url(#head)"/>
  </svg>
</section>'''

    jump = "".join(f'<button data-fly="{a["slug"]}" title="{e(a["name"])}">{icon(a)}</button>' for a in APPS)
    body = f'''
<section class="board" aria-label="The studio board. Drag to explore, scroll to zoom.">
  <svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><marker id="head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></marker></defs></svg>
  <div class="world">
    <section class="intro" id="hello" data-cluster style="left:1430px;top:900px">
      <span class="eyebrow">The studio board · {e(SITE["location"])}</span>
      <h1>Hi, I'm {e(SITE["founder"])}. This is where my apps <span class="hl">come from.</span></h1>
      <p>Android apps, each one from a first scribbled thought to the Play Store, and one more on the way. Drag around, zoom in, or let me show you.</p>
      <div class="intro__go"><button class="btn btn--solid" data-tour>Take the tour ▶</button><a class="link-gold" href="/apps/">Just show me the apps</a></div>
      <p class="intro__hint" aria-hidden="true"><kbd>drag</kbd> to move · <kbd>scroll</kbd> to zoom · <kbd>1</kbd>–<kbd>5</kbd> jump</p>
    </section>

    {clusters}

    <section class="cluster cluster--me" id="me" data-cluster style="left:380px;top:1500px" aria-label="About me">
      <h2 class="cluster__label"><span>04</span> The person</h2>
      <figure class="polaroid" style="--r:-3deg">{f'<img src="{ME["photo"]}" alt="{e(SITE["founder"])}">' if ME["photo"] else '<span aria-hidden="true">M</span>'}<figcaption>me, probably debugging</figcaption></figure>
      <div class="paper paper--me"><p>{e(ME["intro"])}</p><a class="link-gold" href="/about/">More about me →</a></div>
      <div class="paper paper--rules"><p class="paper__title">{e(ME["stance"][0])}</p><p>{e(ME["stance"][1])}</p></div>
    </section>

    <section class="cluster cluster--note" id="say-hello" data-cluster style="left:2560px;top:1500px" aria-label="Leave a note">
      <h2 class="cluster__label"><span>05</span> Leave a note</h2>
      <form class="leave" data-compose="{SITE["email"]}">
        <label>Pin a note on the board, it lands in my inbox.<textarea name="msg" rows="5" required placeholder="Hey Manav, …"></textarea></label>
        <button class="btn btn--solid" type="submit">Pin it {ARROW}</button>
        <small>or email <a href="mailto:{SITE["email"]}">{SITE["email"]}</a></small>
      </form>
    </section>

    <div class="doodle doodle--ring" style="left:1180px;top:700px" aria-hidden="true"></div>
    <p class="doodle doodle--text" style="left:960px;top:1200px;--r:-8deg" aria-hidden="true">← every app starts as a sticky note</p>
    <p class="doodle doodle--text" style="left:2240px;top:1640px;--r:6deg" aria-hidden="true">say hi →</p>
    <p class="doodle doodle--text" style="left:1500px;top:1460px;--r:-5deg" aria-hidden="true">0 trackers were harmed ✓</p>
    <span class="doodle doodle--star" style="left:2450px;top:120px" aria-hidden="true">✶</span>
    <span class="doodle doodle--star" style="left:1700px;top:1900px" aria-hidden="true">✶</span>

    <div class="peer" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 2 L20 11 L12 13 L9 21 Z"/></svg><span>Manav</span><em></em></div>
  </div>

  <div class="tour-cap" hidden aria-live="polite"><i class="tour-cap__bar"></i><p></p><span class="tour-cap__nav"><button data-tour-prev aria-label="Previous">←</button><button data-tour-next aria-label="Next">→</button><button data-tour-stop>End tour</button></span></div>

  <div class="hud">
    <div class="hud__jump" aria-label="Jump to an app">{jump}<button data-fly="me" title="About me"><span class="ico ico--mnv" aria-hidden="true">M</span></button></div>
    <div class="hud__zoom"><button data-zoom="-1" aria-label="Zoom out">−</button><output>100%</output><button data-zoom="1" aria-label="Zoom in">+</button><button data-fit aria-label="See the whole board">Fit</button><button data-share aria-label="Copy a link to this view">Share</button><button data-search aria-label="Search (Ctrl+K)">⌕</button><button data-help aria-label="Keyboard shortcuts">?</button><button data-tour class="hud__tour">Tour ▶</button></div>
  </div>
  <div class="coach" aria-hidden="true"><span class="coach__hand">✋</span><p>Drag to explore · scroll or pinch to zoom</p></div>
  <div class="help" role="dialog" aria-label="Keyboard shortcuts" hidden>
    <h2>Getting around</h2>
    <ul>
      <li><kbd>drag</kbd><span>Move around</span></li>
      <li><kbd>scroll</kbd> <kbd>pinch</kbd><span>Zoom</span></li>
      <li><kbd>double-click</kbd><span>Zoom into an app or a spot</span></li>
      <li><kbd>1</kbd>–<kbd>5</kbd><span>Jump to an app, me, or the note</span></li>
      <li><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd><span>Pan (or step through the tour)</span></li>
      <li><kbd>+</kbd><kbd>−</kbd><kbd>0</kbd><span>Zoom in, out, whole board</span></li>
      <li><kbd>T</kbd><span>Start the tour</span></li>
      <li><kbd>⌘K</kbd><span>Search everything</span></li>
    </ul>
    <button class="btn" data-help-close>Got it</button>
  </div>
  <div class="toast" role="status" hidden></div>
  <svg class="minimap" viewBox="0 0 3600 2150" aria-hidden="true"><rect class="minimap__bg" width="3600" height="2150"/><g class="minimap__items"></g><rect class="minimap__view"/></svg>
</section>
<div class="palette" role="dialog" aria-modal="true" aria-label="Search" hidden>
  <div class="palette__box"><input class="palette__q" placeholder="Search apps, pages, actions…" aria-label="Search" autocomplete="off"><ul class="palette__list" role="listbox"></ul><p class="palette__foot"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> go <kbd>Esc</kbd> close</p></div>
</div>
<script id="mnv-apps" type="application/json">{json.dumps([{"slug": a["slug"], "name": a["name"].strip("[]"), "short": a["short"]} for a in APPS])}</script>'''
    return layout("/", SITE["name"], f"{SITE['name']}: {SITE['tagline']}. An independent Android app studio by {SITE['founder']}.", body)


def apps_index():
    cards = ""
    for i, a in enumerate(APPS):
        feats = "".join(f"<li>{e(t)}</li>" for t, _ in a["features"][:3])
        cards += f'''<article class="appcard ink-{a["ink"]}" data-fade style="--r:{[-1.5, 1.2, -0.8, 1.6, -1.2][i]}deg">
  <p class="note"><small>first thought</small>“{e(IDEAS[a["slug"]])}”</p>
  <div class="shipped">
    <div class="shipped__head"><span class="ico ink-{a["ink"]}" aria-hidden="true">{e(a["glyph"])}</span><div><h2>{e(a["name"])}</h2><small>{e(a["category"])}</small></div></div>
    <p>{e(a["short"])}</p>
    <ul>{feats}</ul>
    <div class="shipped__go"><a class="btn btn--solid" href="/apps/{a["slug"]}/">Open {ARROW}</a><a class="link-gold" href="/#{a["slug"]}">See its story</a><a class="link-gold" href="/privacy/{a["slug"]}/">Privacy</a></div>
    <p class="appstore-row">{"Google Play: coming soon" if a.get("soon") else "On Google Play"} · <span class="appstore-soon">{APPLE} App Store: coming soon</span></p>
  </div>
</article>'''
    body = f'''<section class="page-head"><span class="eyebrow">The collection</span>
<h1>{lines("Our <em>apps</em>")}</h1>
<p class="lead">Every app MNV Studio has published on Google Play, each with its own privacy policy. Want the story behind them? <a class="link-gold" href="/">Explore the board</a>.</p></section>
<div class="appgrid">{cards}</div>'''
    return layout("/apps/", "Apps", "Android apps by MNV Studio: Qalamkaar, Bloom, and Toolbox (coming soon).", body)


def app_page(app, i):
    nxt = APPS[(i + 1) % len(APPS)]
    feats = "".join(f'<div class="feature" data-fade><span>{k + 1:02d}</span><h3>{e(t)}</h3><p>{e(d)}</p></div>' for k, (t, d) in enumerate(app["features"]))
    shots = ""
    for k, s in enumerate(app["screenshots"]):
        inner = f'<img class="shot" src="{s}" alt="{e(app["name"])} screenshot {k + 1}" loading="lazy">' if s else f'<div class="shot-ph">Screenshot {k + 1}</div>'
        shots += phone(app, inner)
    native_cls = "gu" if app["slug"] == "qalamkaar" else ""
    body = f'''<section class="detail ink-{app["ink"]}">
  <span class="detail__glyph" aria-hidden="true">{e(app["glyph"])}</span>
  <div>
    <span class="eyebrow">{e(app["category"])}</span>
    <h1>{e(app["name"])}</h1>
    <div class="detail__native {native_cls}">{e(app["native"])}</div>
    <p class="lead">{e(app["description"])}</p>
    <div class="detail__actions">
      {'<span class="btn btn--solid btn--soon" aria-disabled="true">Coming soon to Google Play</span>' if app.get("soon") else f'<a class="btn btn--solid" href="{app["play"]}" target="_blank" rel="noopener">{PLAY} Get it on Google Play</a>'}
      <span class="btn btn--soon btn--apple" aria-disabled="true">{APPLE} Coming soon on the App Store</span>
      <a class="link-gold" href="/#{app["slug"]}">See its story on the board</a>
      <a class="link-gold" href="/privacy/{app["slug"]}/">Privacy policy</a>
    </div>
  </div>
  <div class="detail__phone" data-tilt>{phone(app, name="hero-phone")}</div>
</section>
<section class="section" style="padding-top:40px">
  <span class="eyebrow">Features</span>
  <h2 class="h2" style="margin-bottom:48px">{lines("Inside <em>" + e(app["name"]) + "</em>")}</h2>
  <div class="features">{feats}</div>
</section>
<section class="ink-{app["ink"]}" aria-label="Screenshots"><div style="padding:0 var(--gutter)"><span class="eyebrow">Screens</span></div><div class="shots">{shots}</div></section>
<a class="next-app ink-{nxt["ink"]}" href="/apps/{nxt["slug"]}/"><span>Next app</span><strong>{e(nxt["name"])}</strong><em aria-hidden="true">{e(nxt["glyph"])}</em></a>'''
    ld = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": app["name"], "operatingSystem": "Android",
          "applicationCategory": app["category"], "description": app["short"], **({} if app.get("soon") else {"downloadUrl": app["play"]}),
          "author": {"@type": "Organization", "name": SITE["name"], "url": SITE["url"]}, **({} if app.get("soon") else {"offers": {"@type": "Offer", "price": "0", "priceCurrency": "INR"}})}
    return layout(f"/apps/{app['slug']}/", app["name"], f"{app['name']} by MNV Studio: {app['short']} Download on Google Play.", body, ld)


def about():
    first = SITE["founder"]
    photo = (f'<img src="{ME["photo"]}" alt="Portrait of {e(first)}" width="800" height="800">'
             if ME["photo"] else f'<span class="me-card__mono" aria-hidden="true">{e(first[0])}</span>')
    facts = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in ME["facts"])
    story = "".join(f"<p data-fade>{e(t)}</p>" for t in ME["story"])
    built = "".join(
        f'<a class="me-app ink-{a["ink"]}" href="/apps/{a["slug"]}/"><span class="ico ink-{a["ink"]}" aria-hidden="true">{e(a["glyph"])}</span><b>{e(a["name"])}</b><small>{e(a["category"])}</small></a>'
        for a in APPS)
    stack = "".join(f"<li>{e(t)}</li>" for t in SITE["stack"])
    off = "".join(f"<li>{e(t)}</li>" for t in ME["offclock"])
    body = f'''<section class="me-hero">
  <div class="me-hero__text">
    <span class="eyebrow">About me</span>
    <h1>Hi, I'm {e(SITE["full_name"])}.</h1>
    <p class="lead">{e(ME["intro"])}</p>
    <div class="me-hero__actions"><a class="btn btn--solid" href="/contact/">Say hello {ARROW}</a><a class="link-gold" href="#story">Read my story ↓</a></div>
  </div>
  <figure class="me-card" data-fade>
    <header class="win__bar"><span class="win__btns"><i></i><i></i><i></i></span><span>{e(first.lower())}.profile</span></header>
    <div class="me-card__photo">{photo}</div>
    <dl class="me-card__facts">{facts}</dl>
  </figure>
</section>

<section class="section me-story" id="story">
  <div class="me-grid">
    <h2 class="h2">My <em>story</em></h2>
    <div class="prose">{story}</div>
  </div>
</section>

<section class="section me-built">
  <h2 class="h2">Things I've <em>built</em></h2>
  <div class="me-apps">{built}</div>
  <div class="me-split">
    <div><span class="eyebrow">My toolbox</span><ul class="chips">{stack}</ul></div>
    <div><span class="eyebrow">Off the clock</span><ul class="chips chips--soft">{off}</ul></div>
  </div>
</section>

<section class="section me-stance">
  <h2 class="h2" data-fade>{e(ME["stance"][0]).replace("know.", "<em>know.</em>")}</h2>
  <p class="me-stance__text" data-fade>{e(ME["stance"][1])}</p>
</section>

<section class="section cta">
  <h2 class="h2">Got an idea? <em>Let's talk.</em></h2>
  <a class="cta__mail" href="mailto:{SITE["email"]}">{SITE["email"]}</a>
  <p><a class="btn btn--solid" href="/contact/">Contact me {ARROW}</a></p>
</section>'''
    ld = {"@context": "https://schema.org", "@type": "ProfilePage",
          "mainEntity": {"@type": "Person", "name": SITE["full_name"], "jobTitle": "Independent app developer & designer",
                         "address": SITE["location"], "url": SITE["url"] + "/about/", "worksFor": {"@type": "Organization", "name": SITE["name"]},
                         "sameAs": [h for _, h, _ in SITE["socials"]]}}
    return layout("/about/", f"About {SITE['full_name']}", f"{SITE['full_name']}: independent app developer and designer from {SITE['location']}, and the person behind {SITE['name']}.", body, ld)


# Side quests: an experiments gallery. (id, title, description, tags, stage HTML)
UPLOAD = '<label class="xbtn xbtn--main">Upload a photo<input type="file" accept="image/*" hidden></label>'
EXPERIMENTS = [
    ("signal", "Signal", "Your camera, rebuilt as live text. Every frame is redrawn from characters, in real time, on your device.",
     ["Camera", "Real-time", "ASCII"],
     '''<div class="xstage" data-x="signal"><canvas class="xcanvas" width="1200" height="720" aria-label="Live ASCII camera"></canvas><div class="xbar"><button class="xbtn xbtn--main" data-act="go">Turn on camera</button><button class="xbtn" data-act="mode">Style: Mono</button><button class="xbtn" data-act="save">Save frame</button><span class="xnote">Nothing is recorded or sent anywhere.</span></div></div>'''),
    ("xray", "Track X-ray", "Drop in any song and see what's really inside it: tempo and beat grid, key with the DJ's Camelot code, loudness the way streaming services measure it, dynamics, stereo width, where the energy sits, and every frequency over time. Click the waveform to play from anywhere.",
     ['Music', 'Analysis'],
     '''<div class="xstage" data-x="xray"><div class="xbar xbar--top"><label class="xbtn xbtn--main">Load a track<input type="file" accept="audio/*" hidden data-act="file"></label><button class="xbtn" data-act="play">▶ Play</button><button class="xbtn" data-act="view">View: Spectrogram</button><span class="xnote" data-act="name">Analysing the built-in loop until you load something.</span></div><div class="xstats xstats--6"><div><span>Tempo</span><b data-act="bpm">—</b></div><div><span>Key</span><b data-act="key">—</b></div><div><span>Loudness</span><b data-act="lufs">—</b></div><div><span>True peak</span><b data-act="peak">—</b></div><div><span>Dynamics</span><b data-act="dr">—</b></div><div><span>Stereo</span><b data-act="width">—</b></div></div><canvas class="xcanvas xray__wave" width="1200" height="120" aria-label="Waveform. Click to play from a point."></canvas><canvas class="xcanvas" width="1200" height="320" aria-label="Spectrogram"></canvas><p class="xaxis"><span data-act="ax1">Low</span><span data-act="ax2">Spectrogram: time left to right, pitch bottom to top</span><span data-act="ax3">High</span></p><div class="xray__bands" data-act="bands"></div><p class="xnote" data-act="facts"></p></div>'''),
    ("waveform-poster", "Waveform poster", "Every song has a shape. Load a track and print it in fourteen styles, from rings and ridgelines to spirals and city skylines. Pick the format, colours and type, and mark your favourite moment.",
     ['Music', 'Design', 'Download'],
     '''<div class="xstage xstage--poster" data-x="wavepost"><canvas class="xcanvas xcanvas--poster" width="1080" height="1350" aria-label="Waveform poster"></canvas><div class="xside"><label class="xbtn xbtn--main">Load a track<input type="file" accept="audio/*" hidden data-act="file"></label><label class="xfield">Title<input maxlength="32" value="Untitled" data-act="title"></label><label class="xfield">Artist<input maxlength="32" value="Manav" data-act="artist"></label><label class="xfield">Line underneath<input maxlength="60" value="" placeholder="a lyric, a date, a feeling" data-act="line"></label><label class="xfield">Style<select data-act="style"></select></label><label class="xfield">Colours<select data-act="theme"></select></label><label class="xfield">Format<select data-act="format"><option value="1080x1350">Poster 4:5</option><option value="1080x1080">Square 1:1</option><option value="1080x1920">Story 9:16</option><option value="1240x1754">Print A-size</option></select></label><label class="xfield">Type<select data-act="font"><option value="display">Bold sans</option><option value="mono">Mono</option><option value="serif">Serif</option><option value="hand">Handwritten</option></select></label><label class="xrange">Detail <input type="range" min="60" max="600" value="260" data-act="detail"></label><label class="xrange">Favourite moment <input type="range" min="0" max="100" value="0" data-act="moment"></label><label class="xcheck"><input type="checkbox" checked data-act="details"> Show duration and date</label><button class="xbtn xbtn--main" data-act="save">Download (2× size)</button></div></div>'''),
    ("chop", "Chop shop", "Load any track. It finds the hits, chops it into 16 cue points and puts them on pads. Then see how the greats flipped their samples, played live.",
     ['Music', 'Sampling', 'Keyboard'],
     '''<div class="xstage chop" data-x="chop"><canvas class="xcanvas chop__wave" width="1200" height="220" aria-label="Waveform with cue points. Click to move the selected cue."></canvas><div class="chop__body"><div class="chop__pads" role="group" aria-label="Sample pads"></div><div class="chop__side"><label class="xbtn xbtn--main">Load a track<input type="file" accept="audio/*" hidden data-act="file"></label><button class="xbtn" data-act="auto">Auto-chop</button><button class="xbtn" data-act="even">Even chop</button><button class="xbtn" data-act="rev">Reverse: Off</button><label class="xrange">Pitch <input type="range" min="-12" max="12" value="0" step="1" data-act="pitch"><output>0</output></label><p class="xnote" data-act="info">Preparing the built-in loop… Keys: 1–4 · Q–R · A–F · Z–V</p></div></div><div class="flips"><h3>Famous flips</h3><p class="xnote">Hear the real sample, then the real song that flipped it. Got the sample on your device? Load it onto the pads and the producer\'s chop pattern is performed on it, live.</p><div class="flips__list" data-act="flips"></div></div></div>'''),
    ("depth-of-field", "Depth of field", "A real lens, simulated. Pick a camera sensor, a focal length, an aperture and how far away your subject is. See exactly what stays sharp, where the blur starts, and how creamy the background gets.",
     ['Photography', 'Optics'],
     '''<div class="xstage dof" data-x="dof"><canvas class="xcanvas" width="1280" height="640" aria-label="Simulated photo with depth of field"></canvas><canvas class="xcanvas dof__diagram" width="1280" height="200" aria-label="Side view: camera, subject and the zone of sharp focus"></canvas><div class="dof__controls"><label class="xfield">Sensor<select data-act="sensor"></select></label><label class="xfield">Scene<select data-act="scene"><option>Portrait</option><option>Street</option><option>Landscape</option><option>Product</option></select></label><label class="xrange xrange--wide">Focal length <input type="range" min="12" max="200" value="85" data-act="focal"><output>85 mm</output></label><label class="xrange xrange--wide">Aperture <input type="range" min="0" max="12" value="2" data-act="ap"><output>f/1.8</output></label><label class="xrange xrange--wide">Subject distance <input type="range" min="0" max="100" value="30" data-act="dist"><output>2.0 m</output></label><button class="xbtn" data-act="hyper">Focus at hyperfocal</button></div><div class="xstats xstats--dof"><div><span>Near focus</span><b data-act="near">—</b></div><div><span>Far focus</span><b data-act="far">—</b></div><div><span>Depth of field</span><b data-act="total">—</b></div><div><span>Hyperfocal</span><b data-act="hf">—</b></div><div><span>Field of view</span><b data-act="fov">—</b></div></div></div>'''),
    ("draw-in-the-air", "Draw in the air", "Point your index finger at the camera and draw. Pinch your thumb and finger to change colour. Show an open palm to wipe the sky clean.",
     ['Camera', 'Hand tracking'],
     '''<div class="xstage" data-x="air"><canvas class="xcanvas" width="1280" height="720" aria-label="Air drawing"></canvas><div class="xbar"><button class="xbtn xbtn--main" data-act="go">Turn on camera</button><span class="air__ink" data-act="ink"></span><button class="xbtn" data-act="clear">Clear</button><button class="xbtn" data-act="save">Save drawing</button><span class="xnote" data-act="note">Runs on your device with on-device AI. Nothing is recorded or sent.</span></div></div>'''),
    ("colour-grade-lab", "Colour grade lab", "Grade a photo the way a film colourist would. Thirty-one looks shown live on your own photo, from Portra and CineStill to neon noir and bleach bypass. Then go deeper: tone curves, an eight-colour mixer, colour wheels, halation, bloom and grain. Export the photo, or export the grade as a LUT and use it on your videos.",
     ['Photo', 'Colour', 'LUT'],
     '''<div class="xstage grade" data-x="grade"><div class="grade__view"><canvas class="xcanvas grade__gl" aria-label="Graded photo. Drag to compare with the original."></canvas><div class="grade__split" hidden aria-hidden="true"><span>ORIGINAL</span><span>GRADED</span></div><canvas class="grade__hist" width="256" height="90" aria-label="Histogram"></canvas></div><div class="xbar"><label class="xbtn xbtn--main">Upload a photo<input type="file" accept="image/*" hidden data-act="file"></label><button class="xbtn" data-act="compare">Hold for original</button><button class="xbtn" data-act="reset">Reset</button><button class="xbtn" data-act="save">Export JPG</button><button class="xbtn" data-act="lut">Export LUT (.cube)</button></div><div class="grade__panel"></div><p class="xnote" data-act="note">Using a sample photo until you upload one. Drag across the photo to compare. Everything stays on your device.</p></div>'''),
    ("poster", "Poster machine", "Type a line, pick from twenty-plus styles: Swiss, Bauhaus, brutalist, riso, neon, Y2K chrome, gig poster and more. Never the same twice. Sized for an Instagram post.",
     ["Type", "Generative", "4:5"],
     '''<div class="xstage xstage--poster" data-x="poster"><canvas class="xcanvas xcanvas--poster" width="1080" height="1350" aria-label="Generated poster"></canvas><div class="xside"><label class="xfield">Your line<input maxlength="48" value="Knowing is a different dimension" data-act="text"></label><label class="xfield">Small text (optional)<input maxlength="30" value="" placeholder="a name, a date, a place" data-act="sub"></label><label class="xfield">Style<select data-act="style"></select></label><button class="xbtn xbtn--main" data-act="gen">Generate</button><button class="xbtn" data-act="surprise">Surprise me</button><button class="xbtn" data-act="save">Download poster</button><p class="xnote">Every poster gets a serial number. No two are alike.</p></div></div>'''),
    ("visualizer", "Audio visualizer", "Turn a track into a video for Reels, Stories or YouTube. Twenty-one templates that move with the kick, the bass and the highs, your name and title on screen, recorded with the sound.",
     ['Music', '3D', 'Video'],
     '''<div class="xstage viz" data-x="viz"><div class="viz__view"><canvas class="xcanvas viz__gl" width="1080" height="1080" aria-label="Audio visualizer"></canvas></div><div class="xbar"><label class="xbtn xbtn--main">Load a track<input type="file" accept="audio/*" hidden data-act="file"></label><button class="xbtn" data-act="play">▶ Play</button><label class="xfield xfield--inline">Template <select data-act="scene"><option>Terrain</option><option>Orb</option><option>Tunnel</option><option>Galaxy</option><option>Halo</option><option>Bars</option><option>Oscilloscope</option><option>Ridgelines</option><option>City</option><option>Warp</option><option>Vinyl</option><option>Sphere</option><option>Helix</option><option>Cubes</option><option>Ribbons</option><option>Flower</option><option>Ocean</option><option>Burst</option><option>LED</option><option>Ripples</option><option>Cover</option></select></label><label class="xfield xfield--inline">Colours <select data-act="pal"></select></label><label class="xfield xfield--inline">Format <select data-act="fmt"><option value="1080x1080">Square 1:1</option><option value="1080x1920">Reel / Story 9:16</option><option value="1920x1080">YouTube 16:9</option></select></label></div><div class="xbar"><label class="xfield xfield--inline">Artist <input data-act="artist" value="Manav" maxlength="30"></label><label class="xfield xfield--inline">Title <input data-act="title" value="Late Night" maxlength="40"></label><label class="xfield xfield--inline">Title <select data-act="layout"><option>Bottom left</option><option>Centre</option><option>Top</option><option>Spotify card</option><option>None</option></select></label><label class="xbtn">Cover art<input type="file" accept="image/*" hidden data-act="cover"></label><label class="xrange">Reactivity <input type="range" min="20" max="200" value="100" data-act="react"></label><button class="xbtn" data-act="rec">● Record 15s with sound</button></div><p class="xnote" data-act="note">Press play for the built-in loop, or load your own track.</p></div>'''),
    ("cover-art-lab", "Cover art lab", "Artist name, title, done. Over twenty styles, from vinyl labels and cassettes to riso, chrome and brutalist, at 3000 × 3000, the size streaming services ask for.",
     ['Music', 'Design', '3000px'],
     '''<div class="xstage xstage--poster" data-x="cover"><canvas class="xcanvas xcanvas--square" width="1500" height="1500" aria-label="Generated cover art"></canvas><div class="xside"><label class="xfield">Artist<input maxlength="28" value="Manav" data-act="artist"></label><label class="xfield">Title<input maxlength="36" value="Knowing" data-act="title"></label><label class="xfield">Style<select data-act="style"></select></label><button class="xbtn" data-act="surprise">Surprise me</button><button class="xbtn xbtn--main" data-act="gen">Roll</button><button class="xbtn" data-act="save">Download 3000 × 3000</button></div></div>'''),
    ("zine-maker", "Zine maker", "Drop in your photos and a few words. It lays them out as magazine spreads: a cover with a masthead, full-bleed photos, grids, pull quotes. Ten design styles from Swiss to punk xerox to Bollywood, twelve layouts, up to six spreads. Shuffle until it clicks, then download a print-ready PDF.",
     ['Design', 'Editorial', 'Download'],
     '''<div class="xstage zine" data-x="zine"><div class="zine__view"><canvas class="xcanvas zine__cv" width="2000" height="1414" aria-label="Zine spread"></canvas></div><div class="zine__pages" data-act="pages"></div><div class="xbar"><label class="xbtn xbtn--main">Add photos<input type="file" accept="image/*" multiple hidden data-act="files"></label><label class="xfield xfield--inline">Style <select data-act="style"><option>Editorial</option><option>Swiss</option><option>Brutalist</option><option>Riso zine</option><option>Fashion</option><option>Punk xerox</option><option>Y2K</option><option>Newspaper</option><option>Japanese minimal</option><option>Bollywood</option></select></label><label class="xfield xfield--inline">Spreads <select data-act="spreads"><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option></select></label><label class="xfield xfield--inline zine__check"><input type="checkbox" data-act="decor" checked> Tape and stickers</label></div><div class="xbar"><button class="xbtn" data-act="shuffle">Shuffle everything</button><button class="xbtn" data-act="reroll">New layout for this page</button><button class="xbtn" data-act="save">Download this page</button><button class="xbtn xbtn--main" data-act="pdf">Download PDF</button></div><div class="zine__fields"><label class="xfield">Title<input data-act="title" value="Knowing" maxlength="22"></label><label class="xfield">Issue<input data-act="issue" value="Issue 01 · Autumn" maxlength="30"></label><label class="xfield">Pull quote<input data-act="quote" value="I don\'t believe. I know." maxlength="70"></label><label class="xfield zine__body">Body text<textarea data-act="body" rows="3">Notes from a year of making things nobody asked for. Late nights, loud speakers, and questions that never quite resolve. This issue collects the pictures in between.</textarea></label></div><p class="xnote" data-act="note">Using sample photos until you add your own (up to 12).</p></div>'''),
    ("palette-from-photo", "Palette from photo", "Upload any photo. Get the colours that actually make it up, as codes you can copy, with which ones are readable as text on which.",
     ['Design', 'Colour'],
     '''<div class="xstage" data-x="palette"><div class="xbar xbar--top"><label class="xbtn xbtn--main">Upload a photo<input type="file" accept="image/*" hidden data-act="file"></label><button class="xbtn" data-act="css">Copy as CSS</button><span class="xnote" data-act="note">Using a sample until you upload one.</span></div><div class="pal"><canvas class="xcanvas pal__img" aria-label="Your image"></canvas><div class="pal__chips" data-act="chips"></div></div><div class="pal__pairs" data-act="pairs"></div></div>'''),
    ("neon-skeleton", "Neon skeleton", "Full-body tracking turns you into a glowing figure in six looks, with light trails, sparks flying off your hands, and a 10-second video recorder. Step back so it can see all of you, then dance.",
     ['Camera', 'Body tracking'],
     '''<div class="xstage" data-x="neon"><canvas class="xcanvas" width="1280" height="720" aria-label="Neon body tracking"></canvas><div class="xbar"><button class="xbtn xbtn--main" data-act="go">Turn on camera</button><button class="xbtn" data-act="style">Look: Neon</button><label class="xrange">Trail <input type="range" min="0" max="95" value="80" data-act="trail"></label><label class="xrange">Glow <input type="range" min="0" max="60" value="30" data-act="glow"></label><button class="xbtn" data-act="sparks">Hand sparks: On</button><button class="xbtn" data-act="rec">● Record 10s</button><button class="xbtn" data-act="save">Save frame</button><span class="xnote" data-act="note">Runs on your device with on-device AI. Nothing is recorded or sent.</span></div></div>'''),
    ("flow-fields", "Flow fields", "Generative art from an invisible current. Thousands of lines follow a noise field and never cross the same way twice. Pick a style and palette, then download it as a phone wallpaper, a desktop wallpaper or a print.",
     ['Generative', 'Art', 'Wallpaper'],
     '''<div class="xstage xstage--poster flow" data-x="flow"><canvas class="xcanvas flow__cv" width="1080" height="1350" aria-label="Flow field artwork"></canvas><div class="xside"><label class="xfield">Style<select data-act="style"></select></label><label class="xfield">Palette<select data-act="pal"></select></label><label class="xfield">Format<select data-act="fmt"><option value="2400x3000">Print 4:5</option><option value="1290x2796">Phone wallpaper</option><option value="3840x2160">Desktop 4K</option><option value="2400x2400">Square</option></select></label><label class="xrange">Density <input type="range" min="1" max="100" value="55" data-act="density"></label><label class="xrange">Turbulence <input type="range" min="1" max="100" value="35" data-act="turb"></label><label class="xrange">Line weight <input type="range" min="1" max="100" value="40" data-act="weight"></label><button class="xbtn xbtn--main" data-act="gen">New seed</button><button class="xbtn" data-act="save">Download full size</button><p class="xnote" data-act="note"></p></div></div>'''),
    ("ambient-room", "Ambient room", "An endless soundscape that writes itself. Piano that never repeats, slow pads, rain on the window, vinyl crackle, wind, birds, waves, a crackling fire and a tanpura drone. Mix your own, or pick a room, set a timer and get to work.",
     ['Music', 'Generative', 'Focus'],
     '''<div class="xstage amb" data-x="amb"><div class="amb__view"><canvas class="xcanvas amb__cv" width="1280" height="640" aria-label="Ambient scene"></canvas><button class="amb__play" data-act="play" aria-pressed="false">▶</button></div><div class="amb__rooms" data-act="rooms"></div><div class="amb__mixer" data-act="mixer"></div><div class="xbar"><label class="xfield xfield--inline">Timer <select data-act="timer"><option value="0">Endless</option><option value="25">25 min focus</option><option value="50">50 min</option><option value="90">90 min</option></select></label><button class="xbtn" data-act="rec">● Record 1 min</button><span class="xnote" data-act="note">Nothing loops: every note is chosen live.</span></div></div>'''),
    ("weeks", "Your life in weeks", "Every dot is one week of a 90-year life. Put in your birthday. Then look at it for a while.",
     ["Perspective"],
     '''<div class="xstage" data-x="weeks"><form class="xbar xbar--top"><label class="xfield xfield--inline">Your birthday <input type="date" required data-act="date"></label><button class="xbtn xbtn--main">Show me</button></form><canvas class="xcanvas xcanvas--weeks" aria-label="Grid of weeks in a life"></canvas><p class="xaxis"><span>Born</span><span>Each column is a year</span><span>90</span></p><p class="xnote xnote--big" data-act="text">4,680 weeks. Fewer than you'd think.</p></div>'''),
]


def experiment(x, n):
    xid, title, desc, tags, stage = x
    tag_html = "".join(f"<li>{e(t)}</li>" for t in tags)
    return f'''<section class="exp" id="{xid}" aria-labelledby="{xid}-h">
  <header class="exp__head"><span class="exp__no">Exp. {n:02d}</span><h2 class="exp__title" id="{xid}-h">{e(title)}</h2><p class="exp__desc">{e(desc)}</p><ul class="exp__tags">{tag_html}</ul></header>
  {stage}
</section>'''


def side_quests():
    index = '<li><a href="#beat"><span>01</span>Make a beat with me</a></li>' + "".join(
        f'<li><a href="#{x[0]}"><span>{k + 2:02d}</span>{e(x[1])}</a></li>' for k, x in enumerate(EXPERIMENTS))
    body = f'''<div class="lab">
<section class="lab__head">
  <span class="exp__no">Side quests · {len(EXPERIMENTS) + 1} experiments</span>
  <h1>Things I make<br>when nobody <em>asked.</em></h1>
  <p>Music, cameras that see you, and type. Everything runs in your browser with on-device AI, and nothing you make ever leaves your device.</p>
  <ol class="lab__index">{index}</ol>
</section>

<section class="exp" id="beat" aria-labelledby="beat-h">
  <header class="exp__head"><span class="exp__no">Exp. 01</span><h2 class="exp__title" id="beat-h">Make a beat with me</h2><p class="exp__desc">Pick a genre and it\'s already playing. Real drum kits, an 808 that follows the chords, and keys underneath. Tap squares to change the groove, hold the pads to perform it live, then export a loop, a whole song or MIDI, or send me the link.</p><ul class="exp__tags"><li>Music</li><li>Shareable</li></ul></header>
  <div class="rack beat" data-beat>
    <div class="beat__top">
      <button class="beat__play" data-beat-play aria-pressed="false">▶ Play</button>
      <label class="rack__bpm">Tempo <input type="range" min="60" max="180" value="90" data-beat-bpm><output></output></label>
      <label class="rack__bpm">Swing <input type="range" min="0" max="60" value="0" data-beat-swing><output></output></label>
      <label class="rack__sel">Kit <select data-beat-kit></select></label>
    </div>
    <div class="orbit__genres" role="group" aria-label="Genre"></div>
    <div class="beat__halves" role="tablist"><button class="btn on" data-half="0">Steps 1–8</button><button class="btn" data-half="1">Steps 9–16</button></div><div class="beat__grid" role="group" aria-label="Steps" data-show="0"></div>
    <div class="beat__music"><label class="rack__sel">Key <select data-beat-key></select></label><label class="rack__sel">Chords <select data-beat-chords></select></label><span class="beat__tools"><button class="btn" data-beat-new>New groove</button><button class="btn" data-beat-undo>Undo</button><button class="btn" data-beat-clear>Clear</button></span></div>
    <p class="beat__label">Hold to perform</p>
    <div class="orbit__fx" role="group" aria-label="Performance pads. Hold to play.">
      <button class="orbit__pad" data-fx="stutter"><b>Stutter</b><kbd>1</kbd></button><button class="orbit__pad" data-fx="half"><b>Half-time</b><kbd>2</kbd></button><button class="orbit__pad" data-fx="drop"><b>Drop</b><kbd>3</kbd></button><button class="orbit__pad" data-fx="filter"><b>Filter</b><kbd>4</kbd></button><button class="orbit__pad" data-fx="power"><b>Power down</b><kbd>5</kbd></button><button class="orbit__pad" data-fx="fill"><b>Fill</b><kbd>6</kbd></button><button class="orbit__pad" data-fx="riser"><b>Riser</b><kbd>7</kbd></button>
    </div>
    <div class="rack__bar rack__bar--3"><span class="rack__tools"><button class="btn" data-beat-wav>Export loop (WAV)</button><button class="btn" data-beat-song>Export 16-bar song</button><button class="btn" data-beat-midi>Export MIDI</button><button class="btn" data-beat-share>Share link</button></span></div>
    <p class="rack__note" aria-live="polite">Loading drums…</p>
    <p class="beat__credit">Drum samples from the Chromium Web Audio drum machine demo, via Tone.js.</p>
  </div>
</section>

{"".join(experiment(x, k + 2) for k, x in enumerate(EXPERIMENTS))}
</div>
<script src="/assets/js/beat.js" defer></script>
<script src="/assets/js/quests.js" defer></script>
<script src="/assets/js/lab.js" defer></script>
<script src="/assets/js/tools.js" defer></script>
<script src="/assets/js/art.js" defer></script>
<script src="/assets/js/make.js" defer></script>
<script src="/assets/js/grade.js" defer></script>
<script src="/assets/js/studio.js" defer></script>
<script type="importmap">{{"imports": {{"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}}}</script>
<script type="module" src="/assets/js/ai.js"></script>
<script type="module" src="/assets/js/three-lab.js"></script>
'''
    return layout("/side-quests/", "Side quests", f"Experiments by {SITE['founder']}: a beat machine, a sample chopper with the real famous flips, a colour grader with LUT export, an audio visualizer, a lyric video maker, a chord writer, print effects and generative art.", body)


def contact():
    socials = "".join(f'<li><a href="{h}" target="_blank" rel="noopener">{t}<small>{e(s)} ↗</small></a></li>' for t, h, s in SITE["socials"])
    body = f'''<section class="page-head"><span class="eyebrow">Contact</span>
<h1>{lines("Let's <em>talk</em>.")}</h1>
<p class="lead">Collaborations, feedback, bug reports, or just a hello. Every email gets read.</p>
<div class="mailrow"><a class="cta__mail" href="mailto:{SITE["email"]}">{SITE["email"]}</a><button class="btn" data-copy="{SITE["email"]}">Copy email</button></div></section>
<section class="contact-grid">
  <form class="leave" data-compose="{SITE["email"]}">
    <label>What's it about?<select name="topic"><option>Just saying hello</option><option>Bug report</option><option>Feature idea</option><option>Collaboration or work</option>{"".join(f"<option>About {e(a['name'].strip('[]'))}</option>" for a in APPS)}</select></label>
    <label>Your note<textarea name="msg" rows="6" required placeholder="Hey Manav, …"></textarea></label>
    <button class="btn btn--solid" type="submit">Write the email {ARROW}</button>
    <small>Opens your email app with everything filled in. Nothing is stored on this site.</small>
  </form>
  <ul class="socials">{socials}</ul>
</section>'''
    return layout("/contact/", "Contact", f"Get in touch with {SITE['name']}: {SITE['email']}.", body)


def privacy(app):
    p = app["privacy"]
    name, mail = e(app["name"]), SITE["email"]
    health = app.get("health")
    sections = []

    def sec(title, html):
        sections.append((title, html))

    sec("Overview", f'''<p>This Privacy Policy explains how <strong>{SITE["name"]}</strong> ("we", "us") handles information in the Android app <strong>{name}</strong> (the "App"). By using the App, you agree to this policy.</p>''')

    if p["collected"]:
        rows = "".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td><td>{e(c)}</td></tr>" for a, b, c in p["collected"])
        collected = f'<p>We collect only what the App needs to work:</p><table><thead><tr><th>Data</th><th>Purpose</th><th>Where it lives</th></tr></thead><tbody>{rows}</tbody></table>'
    else:
        collected = "<p><strong>We do not collect any personal information.</strong> The App does not require an account, and we never ask for your name, email, location or contacts.</p>"
    sec("Information we collect", collected + "<p>Third-party services listed below may collect limited technical data, as described in their own policies.</p>")

    if health:
        sec("Your health information", f'''<div class="callout"><p><strong>Your health data is yours.</strong> {name} stores your cycle, symptom and wellbeing entries <strong>on your device only</strong>. We do not upload them to our servers, and we never sell, rent, or share your health information with advertisers, data brokers or anyone else.</p></div>
<ul><li>Health information is <strong>never sold</strong>, and never used for advertising or profiling.</li>
<li>It is not included in analytics or crash reports.</li>
<li>It is stored in the App's private storage, which other apps cannot access, and is encrypted at rest. [Confirm: e.g. SQLCipher / EncryptedSharedPreferences.]</li>
<li>{name} is a tracking and self-awareness tool, <strong>not a medical device</strong>, and does not provide diagnosis or treatment. Always consult a qualified professional.</li>
<li>[If you add optional cloud backup, describe it here: it is opt-in, which provider and region, encryption in transit and at rest, and how to turn it off.]</li></ul>''')

    sec("How we use information", f'''<ul><li>To provide and improve the App's features.</li><li>To diagnose crashes and fix bugs.</li>{"<li>To show advertising that keeps the App free.</li>" if "AdMob" in p["services"] else ""}{"<li>To process in-app purchases.</li>" if "Google Play Billing" in p["services"] else ""}</ul><p>We do not sell your personal information.</p>''')

    if p["services"]:
        rows = "".join(
            f'<tr><td>{SERVICES[s][0]}</td><td>{SERVICES[s][1]}</td><td><a href="{SERVICES[s][2]}" target="_blank" rel="noopener">Policy</a></td></tr>'
            for s in p["services"]
        )
        svc = f'<p>The App uses the following third-party services: <span class="placeholder">[remove any you do not use]</span></p><table><thead><tr><th>Service</th><th>What it does</th><th>Link</th></tr></thead><tbody>{rows}</tbody></table>'
        if "AdMob" in p["services"]:
            svc += '<p>You can reset or opt out of personalised ads in <em>Android Settings → Google → Ads</em>.</p>'
    else:
        svc = "<p>The App does not use third-party analytics or advertising services.</p>"
    sec("Third-party services", svc)

    sec("Storage and security", f'<p>{e(p["storage"])}</p><p>Data sent to third-party services is encrypted in transit (HTTPS). No method of storage or transmission is 100% secure, but we use reasonable safeguards to protect your information.</p>')
    sec("Children's privacy", f'<p>{name} is not directed at children under 13{" and is intended for users aged 13 and over" if health else ""}. We do not knowingly collect personal information from children. If you believe a child has provided us with information, contact us and we will delete it.</p>')
    delete = (
        f"<p>Because your health data lives on your device, <strong>you</strong> control it. You can:</p><ul><li>Delete individual entries inside the App.</li><li>Erase everything via <em>Settings → Delete all data</em> in the App. [Confirm the menu path.]</li><li>Uninstall the App, or clear its storage in <em>Android Settings → Apps → {name} → Storage → Clear data</em>. This permanently removes all data.</li></ul>"
        if health else
        f"<p>You can delete data stored by the App at any time by clearing its storage (<em>Android Settings → Apps → {name} → Storage → Clear data</em>) or by uninstalling it.</p>"
    )
    sec("Your rights and data deletion", delete + f'<p>Depending on where you live (for example under the GDPR or India\'s DPDP Act), you may have the right to access, correct or delete your data, or to withdraw consent. To make a request, email <a href="mailto:{mail}">{mail}</a>. We will respond within 30 days.</p>')
    sec("Changes to this policy", "<p>We may update this policy from time to time. Changes will be posted on this page with a new effective date. Significant changes will also be announced in the App.</p>")
    sec("Contact", f'<p>Questions about this policy? Contact {SITE["name"]} at <a href="mailto:{mail}">{mail}</a>.</p>')

    toc = "".join(f'<li><a href="#s{k + 1}">{t}</a></li>' for k, (t, _) in enumerate(sections))
    content = "".join(f'<h2 id="s{k + 1}"><span>{k + 1:02d}</span>{t}</h2>{h}' for k, (t, h) in enumerate(sections))
    body = f'''<article class="policy">
  <span class="eyebrow">Privacy policy</span>
  <h1>{name}</h1>
  <p class="policy__meta">Developer: {SITE["name"]} · Effective date: {SITE["policy_effective"]} · Contact: <a href="mailto:{mail}">{mail}</a></p>
  <nav class="policy__toc" aria-label="Contents"><ol>{toc}</ol></nav>
  {content}
  <p style="margin-top:56px"><a href="/apps/{app["slug"]}/">← Back to {name}</a></p>
</article>'''
    return layout(f"/privacy/{app['slug']}/", f"{app['name']} Privacy Policy", f"Privacy policy for {app['name']} by {SITE['name']}.", body)


def not_found():
    body = f'''<section class="panic">
  <p class="panic__face">:(</p>
  <h1>Lost a sticky note. Page not found.</h1>
  <p>This page fell off the board. It may have moved, or the link has a typo.</p>
  <pre>STOP CODE: 404_PAGE_NOT_FOUND
WHAT FAILED: your-link.html
TRACKERS HARMED: 0</pre>
  <p><a class="btn btn--solid" href="/">Back to the board {ARROW}</a> <a class="btn" href="/apps/">See all apps</a></p>
</section>'''
    return layout("/404", "Not found", "Page not found.", body)


# Offline support: cache-first for assets, network-first for pages.
SW = """const V = "mnv-v2", PAGES = __PAGES__;
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
"""


# ---------------------------------------------------------------------------
_LOCAL = re.compile(r"""([\"'(=])/(assets/|apps/|about/|contact/|privacy/|side-quests/|manifest\.webmanifest|sw\.js|404\.html|(?=[\"']))""")


def write(rel, html):
    if SITE["base"] and not rel.endswith((".xml", ".txt")):
        html = _LOCAL.sub(lambda m: m[1] + SITE["base"] + "/" + m[2], html)
    f = ROOT / rel
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html, encoding="utf-8")
    print("  ", rel)


if __name__ == "__main__":
    print("Building MNV Studio…")
    write("index.html", home())
    write("apps/index.html", apps_index())
    write("about/index.html", about())
    write("contact/index.html", contact())
    write("side-quests/index.html", side_quests())
    write("404.html", not_found())
    for i, a in enumerate(APPS):
        write(f"apps/{a['slug']}/index.html", app_page(a, i))
        write(f"privacy/{a['slug']}/index.html", privacy(a))
    urls = ["/", "/apps/", "/about/", "/side-quests/", "/contact/"] + [f"/apps/{a['slug']}/" for a in APPS] + [f"/privacy/{a['slug']}/" for a in APPS]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
          + "".join(f"<url><loc>{SITE['url']}{u}</loc></url>" for u in urls) + "</urlset>\n")
    write("manifest.webmanifest", json.dumps({
        "name": SITE["name"], "short_name": "MNV", "start_url": "/", "display": "standalone",
        "background_color": "#3D3AE8", "theme_color": "#3D3AE8", "description": SITE["tagline"],
        "icons": [{"src": "/assets/img/logo.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable"}],
    }, indent=2))
    write("sw.js", SW.replace("__PAGES__", json.dumps(urls)))
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {SITE['url']}/sitemap.xml\n")
    print("Done.")
