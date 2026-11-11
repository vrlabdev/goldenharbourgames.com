// Writes the site from content/:  node tools/build.mjs
//   content/<lang>.json  every word on the page, one file per language
//   content/games.json   the games, in order: itch link, google_play (optional store page), app_store (optional App Store page), cover, platforms, languages, and the itch
//                        upload that plays on the site (embed) with the shape it is drawn for (frame); optional
//                        trailer (a video link) and shorts (a playlist, shown on the play page only); rustore (a RuStore page,
//                        shown only in languages whose JSON has a "rustore" label, i.e. Russian)
//   content/skyline.svg  the two bridges drawn in About, shared by every language
//   content/log.json     the harbour log: dated one-liners (en + ru) with an optional game id, newest first
//   content/videos.json  the newest public videos on the channel, written by tools/videos.mjs
//   content/experiments.json  the experiments (pictures, tags, status, the words in each language) and the forum
// Out: index.html (English), <lang>/index.html for the rest, a play page per game and language
// (play/<id>/, ru/play/<id>/), the studio page (studio/), the crew programme (crew/), the experiments
// (experiments/ and experiments/<id>/), the privacy policy (privacy/, ru/privacy/), the terms of service (terms/, ru/terms/),
// the press kit (press/, ru/press/; its files live in press/kit/), 404.html, sitemap.xml, robots.txt,
// and .cache/ pages that tools/render_images.ps1 turns into the share images and the touch icon.
// A new language is one more JSON file with a "path" of its own; nothing here changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://goldenharbourgames.com/';
const EMAIL = 'contact@goldenharbourgames.com';
const ITCH = 'https://goldenharbourgames.itch.io/';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), s);
  console.log('wrote', p);
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Pages ask for style.css?v=<hash of its contents>. GitHub lets browsers keep a file for ten minutes,
// and a new page on an old stylesheet looks wrecked; a new hash is a new address, so it cannot happen.
const CSS_V = createHash('sha1').update(read('style.css')).digest('hex').slice(0, 8);
// The same for the pictures a shared link shows. Chat apps (Telegram, WhatsApp, X, Discord) keep a
// link preview by the image address and never look again, so a changed picture needs a new address.
const imgV = (p) => createHash('sha1').update(fs.readFileSync(path.join(ROOT, p))).digest('hex').slice(0, 8);
const shareImage = (p) => `${SITE}${p}?v=${imgV(p)}`;
const games = JSON.parse(read('content/games.json'));
// The studio elsewhere: itch, X and the rest. Shown in the footer and given to search engines as sameAs.
const links = JSON.parse(read('content/links.json'));
const skyline = read('content/skyline.svg').trim();
// The harbour log, newest first, and the channel's newest videos (an empty list hides the section).
const log = JSON.parse(read('content/log.json')).sort((a, b) => b.date.localeCompare(a.date));
const videos = fs.existsSync(path.join(ROOT, 'content/videos.json')) ? JSON.parse(read('content/videos.json')).videos : [];
// A YouTube link's video id, so a trailer can open in the page instead of leaving it.
const ytId = (url) => (String(url || '').match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) || [])[1] || '';
// English first: it is the default page and the x-default for search engines.
const langs = fs.readdirSync(path.join(ROOT, 'content'))
  .filter((f) => /^[a-z]{2}\.json$/.test(f))
  .map((f) => JSON.parse(read('content/' + f)))
  .sort((a, b) => (a.lang === 'en' ? -1 : b.lang === 'en' ? 1 : a.lang.localeCompare(b.lang)));

// The experiments: things tried outside the shipped games (robots, VR, AR, looks, platforms). Each has
// a page of its own with a write-up, pictures and a thread on the forum. The words of one experiment
// sit beside its pictures, under a key per language; the labels around them are in content/<lang>.json.
const lab = JSON.parse(read('content/experiments.json'));
const labItems = lab.items.slice().sort((a, b) => b.date.localeCompare(a.date));
// The three shown on the home page: the ones named in "home", or else the newest.
const labHome = (lab.home || []).map((id) => lab.items.find((x) => x.id === id)).filter(Boolean);
while (labHome.length < 3 && labHome.length < labItems.length) labHome.push(labItems.find((x) => !labHome.includes(x)));

for (const t of langs) {
  for (const k of ['privacy', 'terms', 'press', 'ring', 'build', 'crew', 'filter', 'log', 'videos', 'share', 'trailer_dialog', 'creed', 'studio', 'experiments']) if (!t[k]) throw new Error(`content/${t.lang}.json has no "${k}" text`);
  for (const x of lab.items) {
    if (!x[t.lang]) throw new Error(`content/experiments.json: "${x.id}" has no "${t.lang}" text`);
    for (const s of x.shots || []) if (!s[t.lang]) throw new Error(`content/experiments.json: a picture of "${x.id}" has no "${t.lang}" caption`);
    for (const f of [x.cover, x.thumb, ...(x.shots || []).map((s) => s['src_' + t.lang] || s.src)]) if (!fs.existsSync(path.join(ROOT, f))) throw new Error(`content/experiments.json: "${x.id}" names ${f}, which is not there`);
  }
  for (const e of log) if (!e[t.lang]) throw new Error(`content/log.json: the entry of ${e.date} has no "${t.lang}" text`);
  for (const g of games) {
    if (!t.games[g.id]) throw new Error(`content/${t.lang}.json has no text for the game "${g.id}"`);
    if (!g.embed || !g.frame) throw new Error(`content/games.json: "${g.id}" needs "embed" (its itch html5 upload) and "frame" [w, h]`);
  }
}

// Where a game plays on this site, from the root of a language: "play/peregon/".
const playPath = (g) => `play/${g.id}/`;
// The privacy policy, from the root of a language.
const PRIVACY = 'privacy/';
// The terms of service, from the root of a language.
const TERMS = 'terms/';
// The press kit, from the root of a language. Its files are at /press/kit/ for every language.
const PRESS = 'press/';
// The studio page (two harbours, mission, the letter, how we build), the crew programme and the
// experiments, from the root of a language.
const STUDIO = 'studio/';
const CREW = 'internships/';
// Where the programme lived before it was called what people search for; that address now forwards.
const CREW_OLD = 'crew/';
const LAB = 'experiments/';
const labPath = (x) => `${LAB}${x.id}/`;
// An experiment's thread on the forum (GitHub Discussions), or the forum itself until it has one.
const threadUrl = (x) => (x.thread ? `${lab.forum.url}/${x.thread}` : lab.forum.url);
// itch's own page for one upload: the newest build pushed to that channel, made to sit in a frame.
const embedUrl = (g) => `https://itch.io/embed-upload/${g.embed}?color=0b1626`;

// Everything but the <main>: head, header, footer, the language offer. `sub` is the page's path
// below its language's root ("" for home, "play/peregon/" for a game), so the language switch and
// the offer lead to the same page in the other language.
function shell(t, sub, { title, description, ogTitle, ogDescription, ogImage, ogSize, jsonld, main, script = '' }) {
  const here = t.path + sub;
  const up = '../'.repeat(here.split('/').filter(Boolean).length);
  const home = up + (t.path || './');
  const url = SITE + here;
  const alternates = langs.map((l) => `  <link rel="alternate" hreflang="${l.lang}" href="${SITE}${l.path}${sub}">`).join('\n');
  const switcher = langs.map((l) => `<a href="${up}${l.path + sub || './'}" hreflang="${l.lang}" lang="${l.lang}"${l.lang === t.lang ? ' aria-current="true"' : ''} data-lang="${l.lang}">${l.label}</a>`).join('');
  // What the "this page is in your language" strip needs to know about the other languages.
  const others = langs.filter((l) => l.lang !== t.lang)
    .map((l) => ({ lang: l.lang, href: up + (l.path + sub || './'), text: l.hint.text, go: l.hint.go, close: l.hint.close }));
  const anchor = (id) => (sub === '' ? '#' : home + '#') + id;
  // The header's links: two places on the home page, three pages of their own. The one you are in is marked.
  const navLink = (p, label) => `<a href="${up}${t.path}${p}"${sub.startsWith(p) ? ' aria-current="page"' : ''}>${esc(label)}</a>`;

  return `<!doctype html>
<html lang="${t.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="${SITE}${sub}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Golden Harbour Games">
  <meta property="og:title" content="${esc(ogTitle || title)}">
  <meta property="og:description" content="${esc(ogDescription || description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="${ogSize[0]}">
  <meta property="og:image:height" content="${ogSize[1]}">
  <meta property="og:locale" content="${t.og_locale}">
${langs.filter((l) => l.lang !== t.lang).map((l) => `  <meta property="og:locale:alternate" content="${l.og_locale}">`).join('\n')}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#0b1626">
  <link rel="icon" href="${up}img/mark.svg" type="image/svg+xml">
  <link rel="icon" href="${up}favicon.ico" sizes="48x48">
  <link rel="icon" href="${up}img/icon-192.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="${up}img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Unbounded:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}style.css?v=${CSS_V}">
  <script>document.documentElement.className += ' js';</script>
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<!-- Generated by tools/build.mjs from content/. Edit those, not this. -->

<div class="hint" id="hint" hidden>
  <span id="hint-text"></span>
  <a id="hint-go" href="#"></a>
  <button type="button" id="hint-close" aria-label="">&times;</button>
</div>

<header class="top">
  <a class="brand" href="${home}">
    <img src="${up}img/mark.svg" alt="" width="36" height="36">
    <span class="wordmark"><b>Golden Harbour</b><small>Games</small></span>
  </a>
  <div class="top-right">
    <nav>
      <a href="${anchor('games')}">${esc(t.nav.games)}</a>
      ${navLink(LAB, t.nav.experiments)}
      ${navLink(STUDIO, t.nav.about)}
      ${navLink(CREW, t.nav.crew)}
      <a href="${anchor('contact')}">${esc(t.nav.contact)}</a>
    </nav>
    <div class="langs" role="group" aria-label="${esc(t.switch_label)}">${switcher}</div>
  </div>
</header>

${main(up, home)}

<footer>
  <p class="foot-brand"><img src="${up}img/mark.svg" alt="" width="28" height="28">&copy; 2026 Golden Harbour Games &middot; ${esc(t.footer)}</p>
  <p class="foot-links"><a href="mailto:${EMAIL}">${EMAIL}</a>${links.map((l) => ` &middot; <a href="${l.url}" rel="me">${esc(l.label)}</a>`).join('')} &middot; <a href="${up}${t.path}${PRESS}">${esc(t.press.link)}</a> &middot; <a href="${up}${t.path}${PRIVACY}">${esc(t.privacy.link)}</a> &middot; <a href="${up}${t.path}${TERMS}">${esc(t.terms.link)}</a></p>
  <p class="coords">43°06′N 131°53′E ⇄ 33°51′S 151°13′E</p>
</footer>

<dialog class="trailer" id="trailer" aria-label="${esc(t.trailer)}">
  <button type="button" class="trailer-close" aria-label="${esc(t.trailer_dialog.close)}">&times;</button>
  <div class="trailer-frame"></div>
</dialog>

<script>
// The page's small moving parts: the header darkens once the page scrolls under it; cards and
// sections fade up as they arrive (only when the visitor is fine with motion); a Trailer link
// opens the film in a dialog instead of leaving for YouTube (middle-click and no-JS still leave).
(function () {
  var top = document.querySelector('.top');
  function onScroll() { top.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if (!still && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  var dialog = document.getElementById('trailer');
  if (!dialog || !dialog.showModal) return;
  var frame = dialog.querySelector('.trailer-frame');
  function open(id) {
    dialog.classList.remove('is-image');
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    dialog.showModal();
  }
  // A picture in a gallery opens large in the same dialog; a press anywhere on it closes it.
  function zoom(a) {
    dialog.classList.add('is-image');
    frame.innerHTML = '';
    var img = document.createElement('img');
    img.src = a.getAttribute('href');
    img.alt = (a.querySelector('img') || {}).alt || '';
    frame.appendChild(img);
    dialog.showModal();
  }
  function close() { dialog.close(); }
  dialog.addEventListener('close', function () { frame.innerHTML = ''; });
  dialog.addEventListener('click', function (e) { if (e.target === dialog || e.target.tagName === 'IMG') close(); });
  dialog.querySelector('.trailer-close').addEventListener('click', close);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-video], a[data-zoom]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (a.hasAttribute('data-zoom')) zoom(a); else open(a.getAttribute('data-video'));
  });
})();
</script>

<script>
// Offer the page in the visitor's own language, once; never switch it for them. Picking a
// language by hand, or closing the strip, is remembered in this browser and the offer stops.
(function () {
  var here = ${JSON.stringify(t.lang)};
  var others = ${JSON.stringify(others)};
  function get() { try { return localStorage.getItem('ghg-lang'); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem('ghg-lang', v); } catch (e) {} }
  var links = document.querySelectorAll('.langs a');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function () { set(this.getAttribute('data-lang')); });
  }
  if (get()) return;
  var wanted = (navigator.languages || [navigator.language || '']).map(function (l) { return String(l).slice(0, 2).toLowerCase(); });
  if (wanted[0] === here) return;
  var match = null;
  for (var j = 0; j < wanted.length && !match; j++) {
    if (wanted[j] === here) return;
    for (var k = 0; k < others.length; k++) if (others[k].lang === wanted[j]) { match = others[k]; break; }
  }
  if (!match) return;
  var bar = document.getElementById('hint');
  document.getElementById('hint-text').textContent = match.text;
  var go = document.getElementById('hint-go');
  go.textContent = match.go; go.href = match.href; go.lang = match.lang;
  go.addEventListener('click', function () { set(match.lang); });
  var close = document.getElementById('hint-close');
  close.setAttribute('aria-label', match.close);
  close.addEventListener('click', function () { bar.hidden = true; set(here); });
  bar.lang = match.lang;
  bar.hidden = false;
})();
</script>
${script}
</body>
</html>
`;
}

// The blocks the studio and crew pages are made of. `kicker` is the small label over the heading,
// `h` the heading's tag (h1 when the block opens a page), `base` the way to the language's root.

// "How we build": the crew manifest, one bar per kind of work split between people and AI,
// the tools, the stance, the promise. The bars fill when they come into view.
function manifestBlock(t, kicker, h = 'h2') {
  const rows = t.build.rows.map((r) => `      <li class="man-row" style="--h: ${r.human}" tabindex="0">
        <span class="man-name">${esc(r.name)}</span>
        <span class="man-bar" aria-label="${esc(t.build.human)} ${r.human}%, ${esc(t.build.ai)} ${100 - r.human}%"><i class="man-human"></i><i class="man-ai"></i></span>
        <span class="man-pct"><b>${r.human}%</b><em>${100 - r.human}%</em></span>
        <span class="man-note">${esc(r.note)}</span>
      </li>`).join('\n');
  return `<section id="build" class="section build chart">
  <div class="section-head">
    <div>
      <p class="kicker">${esc(kicker)}</p>
      <${h}>${esc(t.build.title)}</${h}>
    </div>
    <p>${esc(t.build.lede)}</p>
  </div>
  <div class="build-grid">
    <div class="manifest reveal">
      <div class="man-head">
        <h3>${esc(t.build.manifest_title)}</h3>
        <p class="man-key"><span><i class="man-human"></i>${esc(t.build.human)}</span><span><i class="man-ai"></i>${esc(t.build.ai)}</span></p>
      </div>
      <ol class="man-list">
${rows}
      </ol>
      <p class="man-note-foot">${esc(t.build.manifest_note)}</p>
      <p class="man-tools"><span class="kicker">${esc(t.build.tools_title)}</span>${t.build.tools.map((x) => `<span class="tool">${esc(x)}</span>`).join('')}</p>
    </div>
    <div class="build-text reveal">
${t.build.paragraphs.map((p) => `      <p>${esc(p)}</p>`).join('\n')}
      <div class="promise">
        <p class="kicker">${esc(t.build.promise_title)}</p>
        <p>${esc(t.build.promise)}</p>
      </div>
    </div>
  </div>
</section>`;
}

// Two harbours: the name, the bridges, the mission, the promises and the dated letter, on paper.
function aboutBlock(t, kicker, h = 'h2') {
  return `<section id="about" class="section about">
    <div class="section-head">
      <div>
        <p class="kicker">${esc(kicker)}</p>
        <${h}>${esc(t.about.title)}</${h}>
      </div>
      <div class="about-text">
${t.about.paragraphs.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
      </div>
    </div>
    <figure class="bridges-figure">
      ${skyline.replace(/\n/g, '\n      ')}
      <figcaption>
        <span>${esc(t.about.north)} <em>43°06′N 131°53′E</em></span>
        <span>${esc(t.about.south)} <em>33°51′S 151°13′E</em></span>
      </figcaption>
    </figure>
    <div class="about-more">
      <div class="about-col">
        <h3>${esc(t.about.mission_title)}</h3>
        <p class="big">${esc(t.about.mission)}</p>
        <h3>${esc(t.about.vision_title)}</h3>
        <p>${esc(t.about.vision)}</p>
        <h3>${esc(t.about.promises_title)}</h3>
        <ul class="promises">
${t.about.promises.map((p) => `          <li>${esc(p)}</li>`).join('\n')}
        </ul>
      </div>
      <div class="about-col letter">
        <h3>${esc(t.about.letter_title)}</h3>
${t.about.letter.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
      </div>
    </div>
  </section>`;
}

// The internships: what you get, how it works, who can apply, the open projects, the questions.
function crewBlock(t, kicker, base, h = 'h2') {
  return `<section id="crew" class="section crew chart">
    <div class="section-head">
      <div>
        <p class="kicker">${esc(kicker)}</p>
        <${h}>${esc(t.crew.title)}</${h}>
      </div>
      <p>${esc(t.crew.lede)}</p>
    </div>
    <h2 class="crew-ways-title">${esc(t.crew.ways_title)}</h2>
    <div class="crew-ways">
${t.crew.ways.map(([h, p]) => `      <div class="creed-item reveal">
        <h3>${esc(h)}</h3>
        <p>${esc(p)}</p>
      </div>`).join('\n')}
    </div>
    <p class="crew-note">${esc(t.crew.status_note)}</p>
    <div class="crew-grid">
      <div class="crew-col reveal">
        <h3>${esc(t.crew.get_title)}</h3>
        <ul class="promises crew-get">
${t.crew.get.map((p) => `          <li>${esc(p)}</li>`).join('\n')}
        </ul>
        <h3>${esc(t.crew.how_title)}</h3>
        <ol class="crew-steps">
${t.crew.how.map((p) => `          <li>${esc(p)}</li>`).join('\n')}
        </ol>
        <h3>${esc(t.crew.who_title)}</h3>
        <p>${esc(t.crew.who)}</p>
      </div>
      <div class="crew-col reveal">
        <h3>${esc(t.crew.oars_title)}</h3>
        <ul class="oars">
${t.crew.oars.map((o) => { const g = o.game ? games.find((x) => x.id === o.game) : null; return `          <li>${g ? `<a class="oar-game" href="${base}${playPath(g)}">${esc(t.games[g.id].title)}</a>` : `<span class="oar-game">${esc(t.crew.any_game)}</span>`}<span>${esc(o.text)}</span></li>`; }).join('\n')}
        </ul>
        <p class="crew-cta"><a class="button" href="mailto:${EMAIL}?subject=${encodeURIComponent(t.crew.cta_subject)}">${esc(t.crew.cta)} <span aria-hidden="true">→</span></a></p>
        <p class="crew-closing">${esc(t.crew.closing)}</p>
      </div>
    </div>
    <div class="crew-faq">
      <h2>${esc(t.crew.faq_title)}</h2>
${t.crew.faq.map(([q, a]) => `      <details class="reveal">
        <summary>${esc(q)}</summary>
        <p>${esc(a)}</p>
      </details>`).join('\n')}
    </div>
  </section>`;
}

// One experiment as a card: its picture, what kind of thing it is, the name, a line about it, how far it got.
function labCard(t, x, up, base) {
  const c = x[t.lang];
  const L = t.experiments;
  return `      <a class="lab-card reveal" href="${base}${labPath(x)}">
        <img src="${up}${x.thumb}" alt="" width="800" height="500" loading="lazy" decoding="async">
        <span class="lab-kind">${x.tags.map((k) => esc(L.tags[k])).join(' · ')}</span>
        <span class="lab-title">${esc(c.title)}</span>
        <span class="lab-text">${esc(c.text)}</span>
        <span class="lab-status"><i class="dot ${x.status}"></i>${esc(L.status[x.status])}</span>
      </a>`;
}

// The same experiment small: a tile on the experiments page. A press opens its summary window;
// without scripting, or with a middle click, it is a plain link to the full page.
function labTile(t, x, up, base) {
  const c = x[t.lang];
  const L = t.experiments;
  return `      <a class="lab-tile reveal" href="${base}${labPath(x)}" data-peek="peek-${x.id}" data-tags="${x.tags.join(' ')}">
        <img src="${up}${x.thumb}" alt="" width="800" height="500" loading="lazy" decoding="async">
        <span class="lab-kind">${x.tags.map((k) => esc(L.tags[k])).join(' · ')}</span>
        <span class="lab-title">${esc(c.title)}</span>
        <span class="lab-status"><i class="dot ${x.status}"></i>${esc(L.status[x.status])}</span>
      </a>`;
}
function labPeek(t, x, up, base) {
  const c = x[t.lang];
  const L = t.experiments;
  return `    <dialog class="peek" id="peek-${x.id}" aria-label="${esc(c.title)}">
      <button type="button" class="trailer-close peek-close" aria-label="${esc(L.close)}">&times;</button>
      <img class="peek-cover" data-src="${up}${x.cover}" alt="${esc(c.cover_alt || c.title)}" width="1600" height="1000">
      <div class="peek-body">
        <p class="kind">${x.tags.map((k) => esc(L.tags[k])).join(' · ')} <span class="lab-status"><i class="dot ${x.status}"></i>${esc(L.status[x.status])}</span></p>
        <h2>${esc(c.title)}</h2>
        <p class="peek-text">${esc(c.text)}</p>
        <dl class="peek-facts">
${c.facts.slice(0, 4).map(([k, v]) => `          <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
        </dl>
        <p class="peek-actions">
          <a class="button" href="${base}${labPath(x)}">${esc(L.read_more)} <span aria-hidden="true">→</span></a>
          <a class="button ghost" href="${threadUrl(x)}">${esc(L.thread_open)} <span aria-hidden="true">↗</span></a>
        </p>
      </div>
    </dialog>`;
}
const peekScript = `<script>
// The tiles: a press opens the experiment's summary window (its picture loads then, not before);
// the chips keep only one kind of experiment on the page.
(function () {
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.lab-tile'));
  if (!tiles.length || !window.HTMLDialogElement) return;
  tiles.forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var d = document.getElementById(a.getAttribute('data-peek'));
      if (!d) return;
      e.preventDefault();
      var img = d.querySelector('.peek-cover');
      if (!img.getAttribute('src')) img.src = img.getAttribute('data-src');
      d.showModal();
    });
  });
  document.querySelectorAll('.peek').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.querySelector('.peek-close').addEventListener('click', function () { d.close(); });
  });
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-tag]'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = chip.getAttribute('data-tag');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      tiles.forEach(function (a) {
        a.hidden = !!want && (' ' + a.getAttribute('data-tags') + ' ').indexOf(' ' + want + ' ') < 0;
        a.classList.add('is-in');
      });
    });
  });
})();
</script>`;

function page(t) {
  const up = t.path ? '../'.repeat(t.path.split('/').filter(Boolean).length) : '';

  // The showcase: every game as a full card on a ring that turns. The front card is the readable
  // one (cover, what it is, the buttons); the others fan out behind it, tilted and dimmed. The
  // chips above choose which games are on the ring. Without scripting it is a row that scrolls.
  const ringCards = games.map((g, i) => {
    const c = t.games[g.id];
    const badge = g.new ? `<span class="badge">${esc(t.new)}</span>` : '';
    const plays = g.platforms.map((p) => t.platforms[p]).join(' · ');
    return `        <article class="ring-card" data-index="${i}" data-platforms="${g.platforms.join(' ')}">
          <a class="ring-cover" href="${playPath(g)}" tabindex="-1" draggable="false"><img src="${up}${g.cover}" alt="${esc(c.title)}" width="630" height="500" draggable="false"${i === 0 ? ' fetchpriority="high"' : ' decoding="async"'}>${g.clip ? `<video class="ring-clip" data-src="${up}${g.clip}" muted loop playsinline preload="none" aria-hidden="true" disablepictureinpicture></video>` : ''}</a>
          <div class="ring-body">
            <p class="kind">${badge}${c.tags.map(esc).join(' · ')}</p>
            <h3>${esc(c.title)}</h3>${c.aka ? `\n            <p class="aka">${esc(c.aka)}</p>` : ''}
            <p class="text">${esc(c.text)}</p>
            <dl class="facts">
              <div><dt>${esc(t.plays_label)}</dt><dd>${esc(plays)}</dd></div>
              <div><dt>${esc(t.languages_label)}</dt><dd>${g.languages.join(' · ')}</dd></div>
            </dl>
            <p class="card-actions">
              <a class="play button" href="${playPath(g)}">${esc(t.play_here)} <span aria-hidden="true">→</span></a>
              ${g.google_play ? `<a class="itch-link" href="${g.google_play}">${esc(t.google_play)} <span aria-hidden="true">↗</span></a>
              ` : ''}${g.app_store ? `<a class="itch-link" href="${g.app_store}">${esc(t.app_store)} <span aria-hidden="true">↗</span></a>
              ` : ''}${g.rustore && t.rustore ? `<a class="itch-link" href="${g.rustore}">${esc(t.rustore)} <span aria-hidden="true">↗</span></a>
              ` : ''}<a class="itch-link" href="${g.itch}">${esc(t.on_itch)} <span aria-hidden="true">↗</span></a>${g.trailer ? `
              <a class="itch-link" href="${g.trailer}" data-video="${ytId(g.trailer)}">${esc(t.trailer)} <span aria-hidden="true">▶</span></a>` : ''}
            </p>
          </div>
          <span class="ring-shade" aria-hidden="true"></span>
        </article>`;
  }).join('\n');
  const arrow = (dir, label, d) => `<button type="button" class="ring-arrow ${dir}" aria-label="${esc(label)}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  const showcase = () => `    <div class="chips" role="group" aria-label="${esc(t.filter.label)}">
      <span class="chips-label">${esc(t.filter.label)}</span>
      <button type="button" class="chip" aria-pressed="true" data-platform="">${esc(t.filter.all)} <small>${games.length}</small></button>
${chips}
    </div>
    <div class="ring-stage" aria-roledescription="carousel" aria-label="${esc(t.games_title)}">
      <div class="ring-scene">
${ringCards}
        ${arrow('prev', t.ring.prev, 'M15 5l-7 7 7 7')}
        ${arrow('next', t.ring.next, 'M9 5l7 7-7 7')}
      </div>
      <div class="ring-dots">
${games.map((g, i) => `        <button type="button" aria-label="${esc(t.games[g.id].title)}" aria-current="${i === 0}" data-index="${i}"></button>`).join('\n')}
      </div>
      <p class="ring-hint">${esc(t.ring.hint)}</p>
    </div>
    <p class="chips-none" hidden>${esc(t.filter.none)}</p>
`;

  // Section numbers in the kickers, in the order the sections are written.
  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  // One chip per platform any game plays on, with how many.
  const platformsInPort = Object.keys(t.platforms).filter((p) => games.some((g) => g.platforms.includes(p)));
  const chips = platformsInPort.map((p) => `      <button type="button" class="chip" aria-pressed="false" data-platform="${p}">${esc(t.platforms[p])} <small>${games.filter((g) => g.platforms.includes(p)).length}</small></button>`).join('\n');

  // The harbour log: the newest entries open, the rest behind a button.
  const LOG_SHOWN = 4;
  const dateFmt = new Intl.DateTimeFormat(t.lang === 'ru' ? 'ru-RU' : 'en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const logItems = log.map((e, i) => {
    const g = e.game ? games.find((x) => x.id === e.game) : null;
    const who = g ? `<a class="log-game" href="${playPath(g)}">${esc(t.games[g.id].title)}</a>` : `<span class="log-game">goldenharbourgames.com</span>`;
    return `      <li class="log-item reveal${i >= LOG_SHOWN ? ' log-hidden' : ''}"${i >= LOG_SHOWN ? ' hidden' : ''}>
        <time datetime="${e.date}">${esc(dateFmt.format(new Date(e.date + 'T00:00:00')))}</time>
        <div>${who}<p>${esc(e[t.lang])}</p></div>
      </li>`;
  }).join('\n');

  // The newest videos: a poster each, playing in place when pressed. Shorts posters are upright.
  const viewsFmt = new Intl.NumberFormat(t.lang === 'ru' ? 'ru-RU' : 'en-AU');
  const videoItems = videos.slice(0, 4).map((v) => `      <article class="video reveal${v.short ? ' short' : ''}" data-id="${v.id}">
        <button type="button" class="video-play" aria-label="${esc(t.videos.play)}: ${esc(v.title)}">
          <img src="${fs.existsSync(path.join(ROOT, 'img/v/' + v.id + '.jpg')) ? up + 'img/v/' + v.id + '.jpg' : 'https://i.ytimg.com/vi/' + v.id + '/' + (v.short ? 'oar2' : 'hqdefault') + '.jpg'}" alt="" width="${v.short ? 360 : 480}" height="${v.short ? 640 : 360}" loading="lazy" decoding="async">
          <span class="video-badge"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg></span>
        </button>
        <p class="video-title">${esc(v.title)}</p>
${v.views >= 100 ? `        <p class="video-views">${esc(t.videos.views.replace("{n}", viewsFmt.format(v.views)))}</p>` : ""}
      </article>`).join('\n');

  const homeScript = `<script>
// The ring. One number, pos, says which card is in front (2.5 = halfway from the third to the
// fourth). Every card sits at its offset from pos: in front, fanned out to the sides, tilted,
// dimmed and pushed back. A spring pulls pos to a whole number, so a step, a fling and a snap all
// settle the same way. Only transform and opacity change from frame to frame, the loop sleeps as
// soon as the ring is still, and it does not advance on its own while off screen or looked at.
(function () {
  var stage = document.querySelector('.ring-stage');
  if (!stage) return;
  var scene = stage.querySelector('.ring-scene');
  var all = Array.prototype.slice.call(scene.querySelectorAll('.ring-card'));
  var dots = Array.prototype.slice.call(stage.querySelectorAll('.ring-dots button'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-platform]'));
  var none = document.querySelector('.chips-none');
  var prev = stage.querySelector('.ring-arrow.prev'), next = stage.querySelector('.ring-arrow.next');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = all.slice();
  var pos = 0, target = 0, vel = 0, fling = 0, running = false;
  var pressed = false, dragging = false, moved = false, sx = 0, spos = 0, lx = 0, lt = 0;
  var w = 1, front = -1, seen = !('IntersectionObserver' in window), resting = false, timer = null;
  all.forEach(function (c) { c._shade = c.querySelector('.ring-shade'); });

  function wrap(d) { var m = cards.length; d = ((d % m) + m) % m; return d > m / 2 ? d - m : d; }
  function place(c, d) {
    var a = Math.abs(d), s = d < 0 ? -1 : 1;
    var x = a <= 1 ? d * w * 0.62 : s * (0.62 + (a - 1) * 0.3) * w;
    var op = a < 2.4 ? 1 : Math.max(0, 1 - (a - 2.4) / 0.7);
    c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,' + (-Math.min(a, 3) * w * 0.5).toFixed(1) + 'px) rotateY(' +
      (-s * Math.min(a, 1) * 34).toFixed(2) + 'deg) scale(' + (1 - Math.min(a, 3) * 0.06).toFixed(3) + ')';
    c.style.opacity = op.toFixed(3);
    c._shade.style.opacity = Math.min(a * 0.32, 0.72).toFixed(3);
    var z = 100 - Math.round(a * 10);
    if (c._z !== z) { c.style.zIndex = z; c._z = z; }
    var gone = op <= 0;
    if (c._gone !== gone) { c.style.visibility = gone ? 'hidden' : ''; c._gone = gone; }
  }
  function setFront(i) {
    front = i;
    cards.forEach(function (c, k) {
      var on = k === i;
      c.classList.toggle('is-front', on);
      c.setAttribute('aria-hidden', on ? 'false' : 'true');
      c.querySelectorAll('a, button').forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    });
    var id = cards[i] && cards[i].getAttribute('data-index');
    dots.forEach(function (d) { d.setAttribute('aria-current', String(d.getAttribute('data-index') === id)); });
    clips();
  }
  // The front card plays its gameplay loop over the cover; every other one pauses and shows its
  // cover again. Nothing loads until a card first comes to the front, and nothing plays off screen,
  // for those who asked for less motion, or with Data Saver on.
  var calm = still || !!(navigator.connection && navigator.connection.saveData);
  all.forEach(function (c) {
    var v = c.querySelector('.ring-clip');
    if (!v) return;
    c._clip = v;
    v.addEventListener('playing', function () { v.classList.add('is-on'); });
    v.addEventListener('pause', function () { v.classList.remove('is-on'); });
  });
  function clips() {
    all.forEach(function (c) {
      var v = c._clip;
      if (!v) return;
      var front = !calm && seen && !c.hidden && c.classList.contains('is-front');
      if (front && !running) {
        if (!v.getAttribute('src')) v.src = v.getAttribute('data-src');
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!front && !v.paused) v.pause();
    });
  }
  function render() {
    var m = cards.length;
    for (var k = 0; k < m; k++) place(cards[k], wrap(k - pos));
    var f = ((Math.round(pos) % m) + m) % m;
    if (f !== front) setFront(f);
  }
  function frame() {
    if (!dragging) {
      if (fling) {
        pos += fling; fling *= 0.9;
        if (Math.abs(fling) < 0.015) { fling = 0; target = Math.round(pos); }
      } else {
        var d = target - pos;
        vel = vel * 0.74 + d * 0.1;
        pos += vel;
        if (Math.abs(d) < 0.001 && Math.abs(vel) < 0.001) { pos = target; vel = 0; }
      }
    }
    render();
    if (dragging || fling || vel || pos !== target) requestAnimationFrame(frame); else { running = false; clips(); }
  }
  function kick() {
    if (still) { pos = target; fling = vel = 0; render(); clips(); return; }
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function go(step) { fling = 0; target = Math.round(target) + step; kick(); arm(); }
  function to(k) { fling = 0; target = Math.round(target) + wrap(k - Math.round(target)); kick(); arm(); }
  function arm() {
    clearTimeout(timer);
    if (still) return;
    timer = setTimeout(function () {
      if (seen && !resting && !pressed && !document.hidden && cards.length > 1) go(1);
      arm();
    }, 5200);
  }
  function measure() {
    w = all[0].offsetWidth || 1;
    var h = 0;
    cards.forEach(function (c) { h = Math.max(h, c.offsetHeight); });
    scene.style.height = (h + 24) + 'px';
    render();
  }

  // Dragging: nothing is captured until the pointer has moved, so a plain click on a link works.
  scene.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.target.closest('.ring-arrow')) return;
    pressed = true; moved = false; sx = lx = e.clientX; spos = pos; lt = e.timeStamp; fling = 0; vel = 0;
  });
  scene.addEventListener('pointermove', function (e) {
    if (!pressed) return;
    var dx = e.clientX - sx;
    if (!dragging && Math.abs(dx) > 6) {
      dragging = moved = true;
      try { scene.setPointerCapture(e.pointerId); } catch (err) {}
      stage.classList.add('is-dragging');
      kick();
    }
    if (!dragging) return;
    var span = w * 0.62;
    pos = spos - dx / span;
    fling = -(e.clientX - lx) / span / Math.max(1, e.timeStamp - lt) * 16;
    lx = e.clientX; lt = e.timeStamp;
  });
  function release() {
    pressed = false;
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    fling = Math.abs(fling) < 0.02 ? 0 : Math.max(-0.45, Math.min(0.45, fling));
    if (!fling) target = Math.round(pos);
    kick(); arm();
  }
  scene.addEventListener('pointerup', release);
  scene.addEventListener('pointercancel', release);
  // A click after a drag does nothing; a click on a card at the side turns it to the front.
  scene.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
    var c = e.target.closest('.ring-card');
    if (c && !c.classList.contains('is-front')) { e.preventDefault(); e.stopPropagation(); to(cards.indexOf(c)); }
  }, true);
  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var c = all[Number(d.getAttribute('data-index'))];
      if (cards.indexOf(c) >= 0) to(cards.indexOf(c));
    });
  });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
  });
  stage.addEventListener('pointerenter', function () { resting = true; });
  stage.addEventListener('pointerleave', function () { resting = false; });
  stage.addEventListener('focusin', function () { resting = true; });
  stage.addEventListener('focusout', function () { resting = false; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { seen = es[0].isIntersecting; clips(); }).observe(stage);
  }
  var queued = false;
  window.addEventListener('resize', function () {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; measure(); });
  });

  // The chips: only the games that play on one platform stay on the ring.
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = chip.getAttribute('data-platform');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      cards = all.filter(function (c) { return !want || (' ' + c.getAttribute('data-platforms') + ' ').indexOf(' ' + want + ' ') >= 0; });
      all.forEach(function (c) { c.hidden = cards.indexOf(c) < 0; c._z = c._gone = undefined; });
      dots.forEach(function (d) { d.hidden = cards.indexOf(all[Number(d.getAttribute('data-index'))]) < 0; });
      none.hidden = cards.length > 0;
      stage.hidden = !cards.length;
      prev.hidden = next.hidden = cards.length < 2;
      if (!cards.length) return;
      front = -1; vel = fling = 0; pos = still ? 0 : -1.2; target = 0;
      measure(); kick(); arm();
    });
  });

  stage.classList.add('is-live');
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (!still) { pos = -2.2; target = 0; }
  render();
  requestAnimationFrame(function () { stage.classList.add('is-in'); kick(); });
  arm();
})();

// Old links to parts of this page that now have pages of their own still arrive.
(function () {
  var moved = { '#about': '${STUDIO}', '#build': '${STUDIO}#build', '#crew': '${CREW}' };
  if (moved[location.hash]) location.replace(moved[location.hash]);
})();

// The older log entries, and the videos playing in place.
(function () {
  var more = document.querySelector('.log-more-btn');
  if (more) {
    var all = more.textContent, less = more.getAttribute('data-less');
    more.addEventListener('click', function () {
      var open = more.getAttribute('aria-expanded') !== 'true';
      more.setAttribute('aria-expanded', String(open));
      document.querySelectorAll('.log-hidden').forEach(function (li) { li.hidden = !open; li.classList.add('is-in'); });
      more.textContent = open ? less : all;
    });
  }
  document.querySelectorAll('.video').forEach(function (v) {
    v.querySelector('.video-play').addEventListener('click', function () {
      var id = v.getAttribute('data-id');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      f.title = v.querySelector('.video-title').textContent;
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.allowFullscreen = true;
      var play = v.querySelector('.video-play');
      play.replaceWith(f);
      v.classList.add('is-playing');
    });
  });
})();
</script>`;

  // "Games from two harbours" -> the last word in brass, with a full stop.
  const words = t.hero.title.split(' ');
  const last = words.pop();
  const heroTitle = `${esc(words.join(' '))} <span>${esc(last)}.</span>`;

  const allLangs = [...new Set(games.flatMap((g) => g.languages))];
  const strip = [...t.strip, allLangs.join(' · '), t.strip_games.replace('{n}', games.length)]
    .map((s) => `<span>${esc(s)}</span>`).join('<i aria-hidden="true">◆</i>');

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Golden Harbour Games',
    url: SITE,
    email: EMAIL,
    logo: SITE + 'img/apple-touch-icon.png',
    sameAs: links.map((l) => l.url),
    address: { '@type': 'PostalAddress', addressLocality: 'Sydney', addressCountry: 'AU' },
  };

  return shell(t, '', {
    title: t.seo_title || t.title,
    ogTitle: t.title,
    description: t.description,
    ogDescription: t.og_description,
    ogImage: shareImage(`img/og-${t.lang}.jpg`),
    ogSize: [1200, 630],
    jsonld: org,
    script: homeScript,
    main: () => `<section class="hero chart">
  <div class="hero-text">
    <p class="kicker">${esc(t.hero.eyebrow)} · ${esc(t.hero.route)}</p>
    <h1>${heroTitle}</h1>
    <p class="lede">${esc(t.hero.lede)}</p>
    <div class="actions">
      <a class="button" href="${playPath(games[0])}">${esc(t.hero.play)} <span aria-hidden="true">→</span></a>
      <a class="button ghost" href="#games">${esc(t.hero.button)}</a>
    </div>
  </div>
  <div class="hero-mark" aria-hidden="true">
    <svg class="rings" viewBox="0 0 520 520" fill="none"><circle cx="260" cy="260" r="250" stroke-dasharray="3 7"/><circle cx="260" cy="260" r="214"/><path d="M0 260H520M260 0V520" stroke-dasharray="2 6"/></svg>
    <img src="${up}img/logo.svg" alt="" width="380" height="380">
    <span class="coord north">43°06′N 131°53′E<br>ЗОЛОТОЙ РОГ</span>
    <span class="coord south">33°51′S 151°13′E<br>PORT JACKSON</span>
  </div>
</section>

<div class="strip">${strip}</div>

<main>
  <section id="games" class="section games">
    <div class="section-head">
      <div>
        <p class="kicker">${num()} / ${esc(t.nav.games)}</p>
        <h2>${esc(t.games_title)}</h2>
      </div>
      <p>${esc(t.games_lede)}</p>
    </div>

${showcase()}  </section>

  <section id="creed" class="section creed chart">
    <div class="section-head">
      <div>
        <p class="kicker">${num()} / ${esc(t.creed.nav)}</p>
        <h2>${esc(t.creed.title)}</h2>
      </div>
      <p>${esc(t.creed.lede)}</p>
    </div>
    <ol class="creed-grid">
${t.creed.items.map((i) => `      <li class="creed-item reveal">
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.text)}</p>
      </li>`).join('\n')}
    </ol>
    <p class="section-more"><a class="button ghost" href="${STUDIO}">${esc(t.creed.more)} <span aria-hidden="true">→</span></a></p>
  </section>

  <section id="experiments" class="section lab">
    <div class="section-head">
      <div>
        <p class="kicker">${num()} / ${esc(t.experiments.nav)}</p>
        <h2>${esc(t.experiments.home_title)}</h2>
      </div>
      <p>${esc(t.experiments.home_lede)}</p>
    </div>
    <div class="lab-grid">
${labHome.slice(0, 3).map((x) => labCard(t, x, up, '')).join('\n')}
    </div>
    <p class="section-more"><a class="button" href="${LAB}">${esc(t.experiments.all.replace('{n}', labItems.length))} <span aria-hidden="true">→</span></a> <a class="button ghost" href="${lab.forum.url}">${esc(t.experiments.forum_open)} <span aria-hidden="true">↗</span></a></p>
  </section>

  <section id="log" class="section log">
    <div class="section-head">
      <div>
        <p class="kicker">${num()} / ${esc(t.log.nav)}</p>
        <h2>${esc(t.log.title)}</h2>
      </div>
      <p>${esc(t.log.lede)}</p>
    </div>
    <ol class="log-list">
${logItems}
    </ol>${log.length > LOG_SHOWN ? `
    <p><button type="button" class="chip log-more-btn" aria-expanded="false" data-less="${esc(t.log.less)}">${esc(t.log.all)} <small>${log.length - LOG_SHOWN}</small></button></p>` : ''}
  </section>
${videos.length ? `
  <section id="channel" class="section channel">
    <div class="section-head">
      <div>
        <p class="kicker">${num()} / ${esc(t.videos.nav)}</p>
        <h2>${esc(t.videos.title)}</h2>
      </div>
      <p>${esc(t.videos.lede)}</p>
    </div>
    <div class="video-grid">
${videoItems}
    </div>
    <p class="channel-all"><a class="button ghost" href="${links.find((l) => /youtube/i.test(l.url))?.url || 'https://www.youtube.com/@goldenharbourgames'}">${esc(t.videos.channel)} <span aria-hidden="true">↗</span></a></p>
  </section>
` : ''}
  <section id="contact" class="section contact chart">
    <p class="kicker">${num()} / ${esc(t.nav.contact)}</p>
    <h2>${esc(t.contact.title)}</h2>
    <p class="contact-text">${esc(t.contact.text)}</p>
    <a class="email" href="mailto:${EMAIL}">${EMAIL}</a>
  </section>
</main>`,
  });
}

// A game's own page: the game in a frame at the top, what it is underneath, the others below that.
// The frame holds the cover and a Play button until it is pressed: itch's embed starts downloading
// the whole game (20-60 MB) the moment it is on a page, so nothing loads until someone asks.
function playPage(t, g) {
  const c = t.games[g.id];
  const p = t.playpage;
  const sub = playPath(g);
  const [fw, fh] = g.frame;
  const portrait = fh > fw;
  const plays = g.platforms.map((x) => t.platforms[x]).join(' · ');
  const badge = g.new ? `<span class="badge">${esc(t.new)}</span>` : '';
  const aka = c.aka ? `\n        <p class="aka">${esc(c.aka)}</p>` : '';
  const note = esc(p.note) + (g.platforms.includes('phone') ? '' : ' ' + esc(p.note_tablet));
  const others = games.filter((x) => x.id !== g.id);
  const game = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: c.title,
    description: c.text,
    url: SITE + t.path + sub,
    image: SITE + g.cover,
    genre: c.tags,
    inLanguage: g.languages.map((l) => l.toLowerCase()),
    gamePlatform: g.platforms.map((x) => ({ browser: 'Web browser', phone: 'Web browser', tablet: 'Web browser', android: 'Android', ios: 'iOS', windows: 'Windows' })[x]).filter((v, i, a) => a.indexOf(v) === i),
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE },
    sameAs: [g.itch, g.google_play, g.app_store].filter(Boolean),
  };

  return shell(t, sub, {
    title: c.seo_title || `${c.title} · Golden Harbour Games`,
    description: c.seo_description || c.text,
    ogDescription: c.text,
    ogTitle: c.title,
    ogImage: shareImage(g.cover),
    ogSize: [630, 500],
    jsonld: game,
    main: (up, home) => `<main>
  <section class="section game-page chart">
    <p class="crumbs"><a href="${home}#games"><span aria-hidden="true">←</span> ${esc(p.back)}</a></p>
    <div class="game-head">
      <p class="kind">${badge}${c.tags.map(esc).join(' · ')}</p>
      <h1>${esc(c.title)}</h1>${aka}
    </div>

    <div class="stage${portrait ? ' portrait' : ''}" style="--fw: ${fw}; --fh: ${fh}" data-embed="${embedUrl(g)}" data-title="${esc(p.frame_title.replace('{game}', c.title))}">
      <img class="stage-cover" src="${up}${g.cover}" alt="" width="630" height="500">${g.clip ? `
      <video class="stage-cover stage-clip" data-src="${up}${g.clip}" muted loop playsinline preload="none" aria-hidden="true" disablepictureinpicture></video>` : ''}
      <button type="button" class="stage-start">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>
        ${esc(p.start)}
      </button>
      <div class="stage-frame"></div>
      <button type="button" class="stage-close" aria-label="${esc(p.close)}" hidden>&times;</button>
    </div>

    <div class="stage-bar">
      <p class="stage-note">${note}</p>
      <p class="stage-links">
        <button type="button" class="stage-full" hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          ${esc(p.fullscreen)}
        </button>
        ${g.google_play ? `<a class="itch-link" href="${g.google_play}">${esc(p.google_play)} <span aria-hidden="true">↗</span></a>
        ` : ''}${g.app_store ? `<a class="itch-link" href="${g.app_store}">${esc(p.app_store)} <span aria-hidden="true">↗</span></a>
        ` : ''}${g.rustore && p.rustore ? `<a class="itch-link" href="${g.rustore}">${esc(p.rustore)} <span aria-hidden="true">↗</span></a>
        ` : ''}<a class="itch-link" href="${g.itch}">${esc(p.itch)} <span aria-hidden="true">↗</span></a>${g.trailer ? `
        <a class="itch-link" href="${g.trailer}" data-video="${ytId(g.trailer)}">${esc(t.trailer)} <span aria-hidden="true">▶</span></a>` : ''}${g.shorts ? `
        <a class="itch-link" href="${g.shorts}">${esc(t.shorts)} <span aria-hidden="true">↗</span></a>` : ''}
        <button type="button" class="share-btn" data-text="${esc(t.share.text.replace('{game}', c.title))}" data-copied="${esc(t.share.copied)}">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>${esc(t.share.button)}</span>
        </button>
      </p>
    </div>

    <div class="game-info">
      <p class="text">${esc(c.text)}</p>
${(c.intro || []).map((p) => `      <p class="text more">${esc(p)}</p>`).join('\n')}
      <dl class="facts">
        <div><dt>${esc(t.plays_label)}</dt><dd>${esc(plays)}</dd></div>
        <div><dt>${esc(t.languages_label)}</dt><dd>${g.languages.join(' · ')}</dd></div>
      </dl>
    </div>
${(c.sections || []).length ? `    <div class="game-story">
${c.sections.map((s) => `      <section>
        <h2>${esc(s.title)}</h2>
${s.list ? `        <ul>
${s.list.map((i) => `          <li>${esc(i)}</li>`).join('\n')}
        </ul>` : s.paragraphs.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
      </section>`).join('\n')}
    </div>
` : ''}  </section>

  <section class="section more-games">
    <p class="kicker">${esc(p.more)}</p>
    <div class="more-grid">
${others.map((o) => `      <a class="more-card" href="${up}${t.path}${playPath(o)}">
        <img src="${up}${o.cover}" alt="" width="630" height="500" loading="lazy">
        <span class="more-title">${esc(t.games[o.id].title)}</span>
        <span class="more-go">${esc(t.play_here)} <span aria-hidden="true">→</span></span>
      </a>`).join('\n')}
    </div>
  </section>
</main>`,
    script: `<script>
// Nothing loads until Play is pressed. On a phone the game takes the whole screen (a layer over the
// page, not the Fullscreen API, which iPhones do not give to anything but video) with a close
// button; on a computer it plays in place, and Fullscreen hands the frame the whole monitor.
(function () {
  var stage = document.querySelector('.stage');
  if (!stage) return;
  var start = stage.querySelector('.stage-start');
  var holder = stage.querySelector('.stage-frame');
  var close = stage.querySelector('.stage-close');
  var full = document.querySelector('.stage-full');
  var small = window.matchMedia('(max-width: 760px), (max-height: 520px)');
  var canFull = document.fullscreenEnabled || document.webkitFullscreenEnabled;

  function play() {
    var f = document.createElement('iframe');
    f.src = stage.getAttribute('data-embed');
    f.title = stage.getAttribute('data-title');
    f.allow = 'autoplay; fullscreen; gamepad; clipboard-write';
    f.allowFullscreen = true;
    // Keys go to the game, not the page - without the focus jumping the page about.
    f.addEventListener('load', function () { try { f.focus({ preventScroll: true }); } catch (e) {} });
    holder.appendChild(f);
    stage.classList.add('is-playing');
    if (small.matches) {
      stage.classList.add('is-layer');
      document.documentElement.classList.add('no-scroll');
      close.hidden = false;
    } else {
      stage.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (canFull) full.hidden = false;
    }
  }
  function stop() {
    holder.innerHTML = '';
    stage.classList.remove('is-playing', 'is-layer');
    if (clip && !calm) { var p1 = clip.play(); if (p1 && p1.catch) p1.catch(function () {}); }
    document.documentElement.classList.remove('no-scroll');
    close.hidden = true;
    full.hidden = true;
    start.focus();
  }
  var clip = stage.querySelector('.stage-clip');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator.connection && navigator.connection.saveData);
  if (clip && !calm) {
    clip.addEventListener('playing', function () { clip.classList.add('is-on'); stage.classList.add('has-clip'); });
    clip.src = clip.getAttribute('data-src');
    var p0 = clip.play(); if (p0 && p0.catch) p0.catch(function () {});
  }
  start.addEventListener('click', function () { if (clip) clip.pause(); });
  start.addEventListener('click', play);
  close.addEventListener('click', stop);
  full.addEventListener('click', function () {
    (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage);
  });

  // Share: the phone's own share sheet where there is one, otherwise the link goes to the clipboard.
  var share = document.querySelector('.share-btn');
  if (share) share.addEventListener('click', function () {
    var data = { title: document.title, text: share.getAttribute('data-text'), url: location.href };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    var label = share.querySelector('span'), was = label.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () {
      label.textContent = share.getAttribute('data-copied');
      setTimeout(function () { label.textContent = was; }, 1800);
    }, function () { window.prompt('', location.href); });
  });
})();
</script>`,
  });
}

const webPage = (t, sub, name, description) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name,
  description,
  url: SITE + t.path + sub,
  inLanguage: t.lang,
  isPartOf: { '@type': 'WebSite', name: 'Golden Harbour Games', url: SITE },
  publisher: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE, email: EMAIL },
});

// The studio page: who we are and how the games get made. The long read that used to be the
// second half of the home page.
function studioPage(t) {
  const s = t.studio;
  return shell(t, STUDIO, {
    title: s.seo_title,
    ogTitle: s.title,
    description: s.description,
    ogImage: shareImage(`img/og-${t.lang}.jpg`),
    ogSize: [1200, 630],
    jsonld: webPage(t, STUDIO, s.title, s.description),
    main: (up) => `<main>
  ${aboutBlock(t, t.nav.about, 'h1')}

${manifestBlock(t, t.build.nav)}

  <section class="section next-up">
    <p class="kicker">${esc(s.next)}</p>
    <p class="section-more"><a class="button" href="${up}${t.path}${LAB}">${esc(t.nav.experiments)} <span aria-hidden="true">→</span></a> <a class="button ghost" href="${up}${t.path}${CREW}">${esc(t.nav.crew)} <span aria-hidden="true">→</span></a> <a class="button ghost" href="${up}${t.path}${PRESS}">${esc(t.press.link)} <span aria-hidden="true">→</span></a></p>
  </section>
</main>`,
    script: `<script>
// The manifest: a tap on a line (phones have no hover) opens its note.
(function () {
  document.querySelectorAll('.man-row').forEach(function (r) {
    r.addEventListener('click', function () { r.classList.toggle('is-open'); });
  });
})();
</script>`,
  });
}

// The crew programme on a page of its own.
function crewPage(t) {
  return shell(t, CREW, {
    title: t.crew.seo_title,
    ogTitle: t.crew.title,
    description: t.crew.description,
    ogImage: shareImage(`img/og-${t.lang}.jpg`),
    ogSize: [1200, 630],
    // The questions and answers, in the shape search engines read.
    jsonld: { ...webPage(t, CREW, t.crew.title, t.crew.description), '@type': 'FAQPage', mainEntity: t.crew.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    main: (up) => `<main>
  ${crewBlock(t, t.nav.crew, up + t.path, 'h1')}
</main>`,
  });
}

// The talk under an experiment (or under the list of them): a link to its thread on the forum, and,
// once the forum's comment box is switched on (forum.embed in content/experiments.json), a button
// that loads the thread into the page. Nothing is fetched from anyone until that button is pressed.
function talkBlock(t, x) {
  const L = t.experiments;
  const f = lab.forum;
  const thread = x ? x.thread : f.general;
  const canEmbed = f.embed && f.repoId && thread;
  return `<section class="lab-talk" id="talk">
      <h2>${esc(x ? L.talk_title : L.forum_title)}</h2>
      <p>${esc(x ? L.talk_text : L.forum_text)}</p>
      <p class="lab-talk-actions">
        <a class="button" href="${x ? threadUrl(x) : f.url}">${esc(x ? L.thread_open : L.forum_open)} <span aria-hidden="true">↗</span></a>${canEmbed ? `
        <button type="button" class="button ghost talk-load" data-repo="${esc(f.repo)}" data-repo-id="${esc(f.repoId)}" data-thread="${thread}" data-lang="${t.lang}">${esc(L.thread_load)}</button>` : ''}
      </p>
      <p class="lab-talk-note">${esc(L.forum_note)}</p>
      <div class="talk-frame"></div>
    </section>`;
}
const talkScript = `<script>
// The thread loads into the page only when asked for: the comment box is giscus, over GitHub Discussions.
(function () {
  var b = document.querySelector('.talk-load');
  if (!b) return;
  b.addEventListener('click', function () {
    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true; s.crossOrigin = 'anonymous';
    var d = { repo: b.getAttribute('data-repo'), 'repo-id': b.getAttribute('data-repo-id'), mapping: 'number', term: b.getAttribute('data-thread'),
      'reactions-enabled': '1', 'emit-metadata': '0', 'input-position': 'top', theme: 'dark_dimmed', lang: b.getAttribute('data-lang') };
    for (var k in d) s.setAttribute('data-' + k, d[k]);
    document.querySelector('.talk-frame').appendChild(s);
    b.hidden = true;
  });
})();
</script>`;

// All the experiments, newest first, and the way into the forum.
function labIndex(t) {
  const L = t.experiments;
  return shell(t, LAB, {
    title: L.seo_title,
    ogTitle: L.title,
    description: L.description,
    ogImage: shareImage(labItems[0].cover),
    ogSize: [1600, 1000],
    jsonld: webPage(t, LAB, L.title, L.description),
    script: talkScript + peekScript,
    main: (up) => `<main>
  <section class="section lab lab-index chart">
    <div class="section-head">
      <div>
        <p class="kicker">${esc(L.nav)} · ${labItems.length}</p>
        <h1>${esc(L.title)}</h1>
      </div>
      <p>${esc(L.lede)}</p>
    </div>
    <div class="chips" role="group" aria-label="${esc(t.filter.label)}">
      <span class="chips-label">${esc(t.filter.label)}</span>
      <button type="button" class="chip" aria-pressed="true" data-tag="">${esc(t.filter.all)} <small>${labItems.length}</small></button>
${Object.keys(L.tags).filter((k) => labItems.some((x) => x.tags.includes(k))).map((k) => `      <button type="button" class="chip" aria-pressed="false" data-tag="${k}">${esc(L.tags[k])} <small>${labItems.filter((x) => x.tags.includes(k)).length}</small></button>`).join('\n')}
    </div>
    <div class="lab-tiles">
${labItems.map((x) => labTile(t, x, up, up + t.path)).join('\n')}
    </div>
${labItems.map((x) => labPeek(t, x, up, up + t.path)).join('\n')}
    ${talkBlock(t, null)}
  </section>
</main>`,
  });
}

// One experiment: what it is, the pictures, what we learned, and its thread.
function labPage(t, x) {
  const c = x[t.lang];
  const L = t.experiments;
  const sub = labPath(x);
  const dateFmt = new Intl.DateTimeFormat(t.lang === 'ru' ? 'ru-RU' : 'en-AU', { month: 'long', year: 'numeric' });
  const others = labItems.filter((o) => o.id !== x.id).slice(0, 3);
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: c.title,
    description: c.text,
    url: SITE + t.path + sub,
    image: SITE + x.cover,
    inLanguage: t.lang,
    datePublished: x.date,
    author: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE },
    publisher: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE },
    discussionUrl: threadUrl(x),
  };
  return shell(t, sub, {
    title: `${c.title} · ${L.nav} · Golden Harbour Games`,
    ogTitle: c.title,
    description: c.text,
    ogImage: shareImage(x.cover),
    ogSize: [1600, 1000],
    jsonld: article,
    script: talkScript,
    main: (up) => `<main>
  <section class="section game-page lab-page chart">
    <p class="crumbs"><a href="${up}${t.path}${LAB}"><span aria-hidden="true">←</span> ${esc(L.back)}</a></p>
    <div class="game-head">
      <p class="kind">${x.tags.map((k) => esc(L.tags[k])).join(' · ')} <span class="lab-status"><i class="dot ${x.status}"></i>${esc(L.status[x.status])}</span> <time datetime="${x.date}">${esc(dateFmt.format(new Date(x.date + 'T00:00:00')))}</time></p>
      <h1>${esc(c.title)}</h1>
    </div>
    <figure class="lab-hero"><a href="${up}${x.cover}" data-zoom><img src="${up}${x.cover}" alt="${esc(c.cover_alt || c.title)}" width="1600" height="1000" fetchpriority="high"></a></figure>

    <div class="lab-columns">
      <div class="lab-read">
        <div class="game-info">
          <p class="text">${esc(c.text)}</p>
${(c.intro || []).map((p) => `          <p class="text more">${esc(p)}</p>`).join('\n')}
        </div>
        <div class="game-story">
${c.sections.map((s) => `          <section>
            <h2>${esc(s.title)}</h2>
${s.list ? `            <ul>
${s.list.map((i) => `              <li>${esc(i)}</li>`).join('\n')}
            </ul>` : s.paragraphs.map((p) => `            <p>${esc(p)}</p>`).join('\n')}
          </section>`).join('\n')}
        </div>${(x.links || []).length ? `
        <p class="lab-links">${x.links.map((l) => `<a class="button ghost" href="${/^https?:/.test(l.url) ? l.url : up + (l.root ? '' : t.path) + l.url}">${esc(l[t.lang])} <span aria-hidden="true">${/^https?:/.test(l.url) ? '↗' : '→'}</span></a>`).join(' ')}</p>` : ''}
      </div>
      <aside class="lab-facts">
        <dl>
${c.facts.map(([k, v]) => `          <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
        </dl>
      </aside>
    </div>
${(x.shots || []).length ? `
    <h2 class="lab-h">${esc(L.gallery)}</h2>
    <div class="lab-gallery">
${x.shots.map((s) => `      <figure class="reveal">
        <a href="${up}${s['src_' + t.lang] || s.src}" data-zoom><img src="${up}${s['src_' + t.lang] || s.src}" alt="${esc(s[t.lang])}" width="1600" height="1000" loading="lazy" decoding="async"></a>
        <figcaption>${esc(s[t.lang])}</figcaption>
      </figure>`).join('\n')}
    </div>` : ''}

    ${talkBlock(t, x)}
  </section>

  <section class="section more-games">
    <p class="kicker">${esc(L.more)}</p>
    <div class="lab-grid">
${others.map((o) => labCard(t, o, up, up + t.path)).join('\n')}
    </div>
  </section>
</main>`,
  });
}

// The privacy policy and the terms of service: one page per language at privacy/ and terms/ below the
// language's root, in the same frame as a game page. The words live under "privacy" and "terms" in
// content/<lang>.json: an intro, then sections of paragraphs or a list, each with optional links
// underneath and the studio email.
function legalPage(t, key, sub) {
  const p = t[key];
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description: p.description,
    url: SITE + t.path + sub,
    inLanguage: t.lang,
    dateModified: p.date,
    isPartOf: { '@type': 'WebSite', name: 'Golden Harbour Games', url: SITE },
    publisher: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE, email: EMAIL },
  };
  const section = (s) => [
    `      <section>`,
    `        <h2>${esc(s.title)}</h2>`,
    ...(s.paragraphs || []).map((x) => `        <p>${esc(x)}</p>`),
    ...(s.list ? [`        <ul>`, ...s.list.map((i) => `          <li>${esc(i)}</li>`), `        </ul>`] : []),
    ...(s.links ? [`        <p>${s.links.map((l) => `<a href="${l.url}">${esc(l.label)}</a>`).join(' &middot; ')}</p>`] : []),
    ...(s.email ? [`        <p><a href="mailto:${EMAIL}">${EMAIL}</a></p>`] : []),
    `      </section>`,
  ].join('\n');

  return shell(t, sub, {
    title: p.seo_title,
    ogTitle: p.title,
    description: p.description,
    ogImage: shareImage(`img/og-${t.lang}.jpg`),
    ogSize: [1200, 630],
    jsonld: webpage,
    main: (up, home) => `<main>
  <section class="section game-page chart">
    <p class="crumbs"><a href="${home}"><span aria-hidden="true">←</span> ${esc(p.back)}</a></p>
    <div class="game-head">
      <p class="kicker"><time datetime="${p.date}">${esc(p.updated)}</time></p>
      <h1>${esc(p.title)}</h1>
    </div>
    <div class="game-info">
${p.intro.map((x) => `      <p class="text">${esc(x)}</p>`).join('\n')}
    </div>
    <div class="game-story">
${p.sections.map(section).join('\n')}
    </div>
  </section>
</main>`,
  });
}

// The press kit: facts, the studio in two paragraphs, logos, the game covers, the colours and the
// whole kit as one archive. The files sit at /press/kit/ once, for every language.
function pressPage(t) {
  const p = t.press;
  const sub = PRESS;
  const kit = (up) => `${up}press/kit/`;
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description: p.description,
    url: SITE + t.path + sub,
    inLanguage: t.lang,
    isPartOf: { '@type': 'WebSite', name: 'Golden Harbour Games', url: SITE },
    publisher: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE, email: EMAIL },
  };
  const logos = [
    ['ghg-horizontal-on-dark', 'ghg-horizontal-on-dark-1200w.png', 'dark'],
    ['ghg-horizontal-on-light', 'ghg-horizontal-on-light-1200w.png', 'light'],
    ['ghg-mark-on-dark', 'ghg-mark-on-dark-1024.png', 'dark'],
    ['ghg-mark-on-light', 'ghg-mark-on-light-1024.png', 'light'],
  ];
  return shell(t, sub, {
    title: p.seo_title,
    ogTitle: p.title,
    description: p.description,
    ogImage: shareImage(`img/og-${t.lang}.jpg`),
    ogSize: [1200, 630],
    jsonld: webpage,
    main: (up, home) => `<main>
  <section class="section game-page chart">
    <p class="crumbs"><a href="${home}"><span aria-hidden="true">←</span> ${esc(p.back)}</a></p>
    <div class="game-head">
      <h1>${esc(p.title)}</h1>
    </div>
    <div class="game-info">
${p.intro.map((x) => `      <p class="text">${esc(x)}</p>`).join('\n')}
      <p><a class="button" href="${kit(up)}golden-harbour-games-brand-kit.zip" download>${esc(p.download)} <span aria-hidden="true">↓</span></a></p>
    </div>

    <div class="press">
      <section class="press-block">
        <h2>${esc(p.facts_title)}</h2>
        <dl class="press-facts">
${p.facts.map(([k, v]) => `          <div><dt>${esc(k)}</dt><dd>${/@/.test(v) ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v)}</dd></div>`).join('\n')}
        </dl>
      </section>

      <section class="press-block">
        <h2>${esc(p.boilerplate_title)}</h2>
${p.boilerplate.map((x) => `        <p>${esc(x)}</p>`).join('\n')}
      </section>

      <section class="press-block">
        <h2>${esc(p.logos_title)}</h2>
        <p>${esc(p.logos_text)}</p>
        <div class="press-logos">
${logos.map(([base, png, bg]) => `          <figure class="press-logo ${bg}">
            <img src="${kit(up)}${png}" alt="${base}" loading="lazy" decoding="async">
            <figcaption><a href="${kit(up)}${base}.svg" download>SVG</a> · <a href="${kit(up)}${png}" download>PNG</a></figcaption>
          </figure>`).join('\n')}
        </div>
      </section>

      <section class="press-block">
        <h2>${esc(p.covers_title)}</h2>
        <p>${esc(p.covers_text)}</p>
        <div class="press-covers">
${games.map((g) => `          <figure class="press-cover">
            <img src="${up}${g.cover}" alt="${esc(t.games[g.id].title)}" width="630" height="500" loading="lazy" decoding="async">
            <figcaption><a href="${up}${t.path}${playPath(g)}">${esc(t.games[g.id].title)}</a> · <a href="${up}${g.cover}" download>JPG</a>${g.trailer ? ` · <a href="${g.trailer}" data-video="${ytId(g.trailer)}">${esc(t.trailer)}</a>` : ''}</figcaption>
          </figure>`).join('\n')}
        </div>
      </section>

      <section class="press-block">
        <h2>${esc(p.colours_title)}</h2>
        <div class="press-colours">
${p.colours.map(([name, hex]) => `          <div class="swatch" style="--c: ${hex}"><i></i><b>${esc(name)}</b><code>${hex}</code></div>`).join('\n')}
        </div>
      </section>

      <section class="press-block">
        <h2>${esc(p.kit_title)}</h2>
        <p>${esc(p.kit_text)}</p>
        <p><a class="button" href="${kit(up)}golden-harbour-games-brand-kit.zip" download>${esc(p.download)} <span aria-hidden="true">↓</span></a></p>
        <p><a href="mailto:${EMAIL}">${EMAIL}</a></p>
      </section>
    </div>
  </section>
</main>`,
  });
}

// Served by GitHub Pages for any address that does not exist, at that address - so every path in
// it is absolute. Both languages at once: there is no telling which one the visitor came from.
function notFound() {
  const blocks = langs.map((t) => `    <div lang="${t.lang}">
      <h1>${esc(t.not_found.title)}</h1>
      <p>${esc(t.not_found.text)}</p>
      <a class="button" href="/${t.path}">${esc(t.not_found.home)}</a>
    </div>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 · Golden Harbour Games</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/img/mark.svg" type="image/svg+xml">
  <link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Unbounded:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css?v=${CSS_V}">
</head>
<body class="lost">
<!-- Generated by tools/build.mjs. -->
<main class="lost-body">
  <a class="brand" href="/"><img src="/img/mark.svg" alt="" width="40" height="40"><span class="wordmark"><b>Golden Harbour</b><small>Games</small></span></a>
  <div class="lost-langs">
${blocks}
  </div>
</main>
</body>
</html>
`;
}

// The share image and the touch icon are pictures of these pages; see tools/render_images.ps1.
function shareCard(t) {
  const words = t.hero.title.split(' ');
  const last = words.pop();
  return `<!doctype html>
<html lang="${t.lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Unbounded:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css?v=${CSS_V}">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  .card-og { width: 1200px; height: 630px; box-sizing: border-box; padding: 72px; display: flex; align-items: center; gap: 56px; }
  .card-og .words { flex: 1; display: flex; flex-direction: column; gap: 28px; }
  .card-og .kicker { font-size: 18px; margin: 0; }
  .card-og h1 { font-size: 76px; margin: 0; text-wrap: balance; }
  .card-og .lede { font-size: 24px; margin: 0; color: var(--text-2); }
  .card-og img { width: 360px; height: 360px; }
</style></head>
<body><div class="card-og chart">
  <div class="words">
    <p class="kicker">goldenharbourgames.com</p>
    <h1>${esc(words.join(' '))} <span>${esc(last)}.</span></h1>
    <p class="lede">${esc(t.og_description.replace(t.hero.title + '. ', ''))}</p>
  </div>
  <img src="../img/logo.svg" alt="">
</div></body></html>
`;
}

const ICON = `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: 540px; height: 540px; background: #0b1626; }
img { display: block; width: 420px; height: 420px; margin: 50px 60px 70px; }
</style></head><body><img src="../img/logo.svg" alt=""></body></html>
`;

for (const t of langs) write(t.path + 'index.html', page(t));
for (const t of langs) for (const g of games) write(t.path + playPath(g) + 'index.html', playPage(t, g));
for (const t of langs) write(t.path + PRIVACY + 'index.html', legalPage(t, 'privacy', PRIVACY));
for (const t of langs) write(t.path + TERMS + 'index.html', legalPage(t, 'terms', TERMS));
for (const t of langs) write(t.path + PRESS + 'index.html', pressPage(t));
for (const t of langs) write(t.path + STUDIO + 'index.html', studioPage(t));
for (const t of langs) write(t.path + CREW + 'index.html', crewPage(t));
for (const t of langs) write(t.path + CREW_OLD + 'index.html', `<!doctype html>
<html lang="${t.lang}"><head><meta charset="utf-8"><title>${esc(t.crew.title)}</title>
<link rel="canonical" href="${SITE}${t.path}${CREW}"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${SITE}${t.path}${CREW}"></head>
<body><a href="${SITE}${t.path}${CREW}">${esc(t.crew.title)}</a></body></html>
`);
for (const t of langs) write(t.path + LAB + 'index.html', labIndex(t));
for (const t of langs) for (const x of lab.items) write(t.path + labPath(x) + 'index.html', labPage(t, x));
write('404.html', notFound());
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['', ...games.map(playPath), LAB, ...labItems.map(labPath), STUDIO, CREW, PRIVACY, TERMS, PRESS].flatMap((sub) => langs.map((t) => `  <url>
    <loc>${SITE}${t.path}${sub}</loc>
${langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.lang}" href="${SITE}${l.path}${sub}"/>`).join('\n')}
  </url>`)).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
for (const t of langs) write(`.cache/og-${t.lang}.html`, shareCard(t));
write('.cache/icon.html', ICON);
