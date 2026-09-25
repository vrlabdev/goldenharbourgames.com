// Writes the site from content/:  node tools/build.mjs
//   content/<lang>.json  every word on the page, one file per language
//   content/games.json   the games, in order: itch link, cover, platforms, languages, and the itch
//                        upload that plays on the site (embed) with the shape it is drawn for (frame)
//   content/skyline.svg  the two bridges drawn in About, shared by every language
// Out: index.html (English), <lang>/index.html for the rest, a play page per game and language
// (play/<id>/, ru/play/<id>/), 404.html, sitemap.xml, robots.txt,
// and .cache/ pages that tools/render_images.ps1 turns into the share images and the touch icon.
// A new language is one more JSON file with a "path" of its own; nothing here changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://goldenharbourgames.com/';
const EMAIL = 'contact@goldenharbourgames.com';
const ITCH = 'https://vvofort.itch.io/';

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
const skyline = read('content/skyline.svg').trim();
// English first: it is the default page and the x-default for search engines.
const langs = fs.readdirSync(path.join(ROOT, 'content'))
  .filter((f) => /^[a-z]{2}\.json$/.test(f))
  .map((f) => JSON.parse(read('content/' + f)))
  .sort((a, b) => (a.lang === 'en' ? -1 : b.lang === 'en' ? 1 : a.lang.localeCompare(b.lang)));

for (const t of langs) {
  for (const g of games) {
    if (!t.games[g.id]) throw new Error(`content/${t.lang}.json has no text for the game "${g.id}"`);
    if (!g.embed || !g.frame) throw new Error(`content/games.json: "${g.id}" needs "embed" (its itch html5 upload) and "frame" [w, h]`);
  }
}

// Where a game plays on this site, from the root of a language: "play/peregon/".
const playPath = (g) => `play/${g.id}/`;
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
      <a href="${anchor('about')}">${esc(t.nav.about)}</a>
      <a href="${anchor('contact')}">${esc(t.nav.contact)}</a>
    </nav>
    <div class="langs" role="group" aria-label="${esc(t.switch_label)}">${switcher}</div>
  </div>
</header>

${main(up, home)}

<footer>
  <p class="foot-brand"><img src="${up}img/mark.svg" alt="" width="28" height="28">&copy; 2026 Golden Harbour Games &middot; ${esc(t.footer)}</p>
  <p class="foot-links"><a href="mailto:${EMAIL}">${EMAIL}</a> &middot; <a href="${ITCH}">itch.io</a></p>
  <p class="coords">43°06′N 131°53′E ⇄ 33°51′S 151°13′E</p>
</footer>

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

function page(t) {
  const up = t.path ? '../'.repeat(t.path.split('/').filter(Boolean).length) : '';

  // The first game is the featured one: a wide card at the top of the list.
  const card = (g, featured) => {
    const c = t.games[g.id];
    const cover = up + g.cover;
    const aka = c.aka ? `\n          <p class="aka">${esc(c.aka)}</p>` : '';
    const badge = g.new ? `<span class="badge">${esc(t.new)}</span>` : '';
    const plays = g.platforms.map((p) => t.platforms[p]).join(' · ');
    return `      <article class="card${featured ? ' featured' : ''}">
        <a class="cover" href="${playPath(g)}" tabindex="-1"><img src="${cover}" alt="${esc(c.title)}" width="630" height="500"${featured ? '' : ' loading="lazy"'}></a>
        <div class="card-body">
          <p class="kind">${badge}${c.tags.map(esc).join(' · ')}</p>
          <h3>${esc(c.title)}</h3>${aka}
          <p class="text">${esc(c.text)}</p>
          <dl class="facts">
            <div><dt>${esc(t.plays_label)}</dt><dd>${esc(plays)}</dd></div>
            <div><dt>${esc(t.languages_label)}</dt><dd>${g.languages.join(' · ')}</dd></div>
          </dl>
          <p class="card-actions">
            <a class="play${featured ? ' button' : ''}" href="${playPath(g)}">${esc(t.play_here)} <span aria-hidden="true">→</span></a>
            <a class="itch-link" href="${g.itch}">${esc(t.on_itch)} <span aria-hidden="true">↗</span></a>
          </p>
        </div>
      </article>`;
  };
  const featured = card(games[0], true);
  const cards = games.slice(1).map((g) => card(g, false)).join('\n\n');

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
    sameAs: [ITCH],
    address: { '@type': 'PostalAddress', addressLocality: 'Sydney', addressCountry: 'AU' },
  };

  return shell(t, '', {
    title: t.title,
    description: t.description,
    ogDescription: t.og_description,
    ogImage: shareImage(`img/og-${t.lang}.jpg`),
    ogSize: [1200, 630],
    jsonld: org,
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
        <p class="kicker">01 / ${esc(t.nav.games)}</p>
        <h2>${esc(t.games_title)}</h2>
      </div>
      <p>${esc(t.games_lede)}</p>
    </div>

${featured}

    <div class="grid">

${cards}

    </div>
  </section>

  <section id="about" class="section about">
    <div class="section-head">
      <div>
        <p class="kicker">02 / ${esc(t.nav.about)}</p>
        <h2>${esc(t.about.title)}</h2>
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
  </section>

  <section id="contact" class="section contact chart">
    <p class="kicker">03 / ${esc(t.nav.contact)}</p>
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
    gamePlatform: 'Web browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Golden Harbour Games', url: SITE },
    sameAs: [g.itch],
  };

  return shell(t, sub, {
    title: `${c.title} · Golden Harbour Games`,
    description: c.text,
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
      <img class="stage-cover" src="${up}${g.cover}" alt="" width="630" height="500">
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
        <a class="itch-link" href="${g.itch}">${esc(p.itch)} <span aria-hidden="true">↗</span></a>
      </p>
    </div>

    <div class="game-info">
      <p class="text">${esc(c.text)}</p>
      <dl class="facts">
        <div><dt>${esc(t.plays_label)}</dt><dd>${esc(plays)}</dd></div>
        <div><dt>${esc(t.languages_label)}</dt><dd>${g.languages.join(' · ')}</dd></div>
      </dl>
    </div>
  </section>

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
    document.documentElement.classList.remove('no-scroll');
    close.hidden = true;
    full.hidden = true;
    start.focus();
  }
  start.addEventListener('click', play);
  close.addEventListener('click', stop);
  full.addEventListener('click', function () {
    (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage);
  });
})();
</script>`,
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
write('404.html', notFound());
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['', ...games.map(playPath)].flatMap((sub) => langs.map((t) => `  <url>
    <loc>${SITE}${t.path}${sub}</loc>
${langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.lang}" href="${SITE}${l.path}${sub}"/>`).join('\n')}
  </url>`)).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
for (const t of langs) write(`.cache/og-${t.lang}.html`, shareCard(t));
write('.cache/icon.html', ICON);
