// Writes the site from content/:  node tools/build.mjs
//   content/<lang>.json  every word on the page, one file per language
//   content/games.json   the games, in order: itch link, cover, platforms, languages
//   content/skyline.svg  the two bridges drawn in About, shared by every language
// Out: index.html (English), <lang>/index.html for the rest, 404.html, sitemap.xml, robots.txt,
// and .cache/ pages that tools/render_images.ps1 turns into the share images and the touch icon.
// A new language is one more JSON file with a "path" of its own; nothing here changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  }
}

function page(t) {
  const up = t.path ? '../'.repeat(t.path.split('/').filter(Boolean).length) : '';
  const url = SITE + t.path;
  const alternates = langs.map((l) => `  <link rel="alternate" hreflang="${l.lang}" href="${SITE}${l.path}">`).join('\n');
  const switcher = langs.map((l) => l.lang === t.lang
    ? `<a href="${up}${l.path || './'}" hreflang="${l.lang}" lang="${l.lang}" aria-current="true" data-lang="${l.lang}">${l.label}</a>`
    : `<a href="${up}${l.path || './'}" hreflang="${l.lang}" lang="${l.lang}" data-lang="${l.lang}">${l.label}</a>`).join('');
  // What the "this page is in your language" strip needs to know about the other languages.
  const others = langs.filter((l) => l.lang !== t.lang)
    .map((l) => ({ lang: l.lang, href: up + (l.path || './'), text: l.hint.text, go: l.hint.go, close: l.hint.close }));

  // The first game is the featured one: a wide card at the top of the list.
  const card = (g, featured) => {
    const c = t.games[g.id];
    const cover = up + g.cover;
    const aka = c.aka ? `\n          <p class="aka">${esc(c.aka)}</p>` : '';
    const badge = g.new ? `<span class="badge">${esc(t.new)}</span>` : '';
    const plays = g.platforms.map((p) => t.platforms[p]).join(' · ');
    return `      <article class="card${featured ? ' featured' : ''}">
        <a class="cover" href="${g.itch}" tabindex="-1"><img src="${cover}" alt="${esc(c.title)}" width="630" height="500"${featured ? '' : ' loading="lazy"'}></a>
        <div class="card-body">
          <p class="kind">${badge}${c.tags.map(esc).join(' · ')}</p>
          <h3>${esc(c.title)}</h3>${aka}
          <p class="text">${esc(c.text)}</p>
          <dl class="facts">
            <div><dt>${esc(t.plays_label)}</dt><dd>${esc(plays)}</dd></div>
            <div><dt>${esc(t.languages_label)}</dt><dd>${g.languages.join(' · ')}</dd></div>
          </dl>
          <a class="play${featured ? ' button' : ''}" href="${g.itch}">${esc(t.play)} <span aria-hidden="true">↗</span></a>
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

  return `<!doctype html>
<html lang="${t.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t.title)}</title>
  <meta name="description" content="${esc(t.description)}">
  <link rel="canonical" href="${url}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="${SITE}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Golden Harbour Games">
  <meta property="og:title" content="${esc(t.title)}">
  <meta property="og:description" content="${esc(t.og_description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}img/og-${t.lang}.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${t.og_locale}">
${langs.filter((l) => l.lang !== t.lang).map((l) => `  <meta property="og:locale:alternate" content="${l.og_locale}">`).join('\n')}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0b1626">
  <link rel="icon" href="${up}img/mark.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${up}img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Unbounded:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}style.css">
  <script type="application/ld+json">${JSON.stringify(org)}</script>
</head>
<body>
<!-- Generated by tools/build.mjs from content/. Edit those, not this. -->

<div class="hint" id="hint" hidden>
  <span id="hint-text"></span>
  <a id="hint-go" href="#"></a>
  <button type="button" id="hint-close" aria-label="">&times;</button>
</div>

<header class="top">
  <a class="brand" href="${up}${t.path || './'}">
    <img src="${up}img/mark.svg" alt="" width="36" height="36">
    <span class="wordmark"><b>Golden Harbour</b><small>Games</small></span>
  </a>
  <div class="top-right">
    <nav>
      <a href="#games">${esc(t.nav.games)}</a>
      <a href="#about">${esc(t.nav.about)}</a>
      <a href="#contact">${esc(t.nav.contact)}</a>
    </nav>
    <div class="langs" role="group" aria-label="${esc(t.switch_label)}">${switcher}</div>
  </div>
</header>

<section class="hero chart">
  <div class="hero-text">
    <p class="kicker">${esc(t.hero.eyebrow)} · ${esc(t.hero.route)}</p>
    <h1>${heroTitle}</h1>
    <p class="lede">${esc(t.hero.lede)}</p>
    <div class="actions">
      <a class="button" href="${games[0].itch}">${esc(t.hero.play)} <span aria-hidden="true">→</span></a>
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
</main>

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

</body>
</html>
`;
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
  <link rel="stylesheet" href="/style.css">
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
<link rel="stylesheet" href="../style.css">
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
write('404.html', notFound());
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${langs.map((t) => `  <url>
    <loc>${SITE}${t.path}</loc>
${langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.lang}" href="${SITE}${l.path}"/>`).join('\n')}
  </url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
for (const t of langs) write(`.cache/og-${t.lang}.html`, shareCard(t));
write('.cache/icon.html', ICON);
