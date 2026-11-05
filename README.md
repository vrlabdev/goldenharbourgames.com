# goldenharbourgames.com

The studio site, served by GitHub Pages from `main` at https://goldenharbourgames.com (the `CNAME`
file is GitHub's; leave it alone). English at `/`, Russian at `/ru/`.

## Changing it

The pages are generated. Edit the sources, then rebuild:

    node tools/build.mjs                            # the pages, 404, sitemap, robots.txt
    powershell -File tools/render_images.ps1        # share images + phone icon (only if the title or the logo changed)

| Change | Edit |
|---|---|
| Any text on the page | `content/en.json`, `content/ru.json` |
| A new game | one entry in `content/games.json` (itch link, 630x500 cover in `img/`, platforms, languages, `embed` = its itch html5 upload number from `butler status goldenharbourgames/<game>`, `frame` = [width, height] it is drawn for) and its text under `games` in every language file |
| A new language | copy `content/en.json` to `content/<code>.json`, translate it, give it `"path": "<code>/"` |
| The two bridges in About | `content/skyline.svg` |
| The manifest, mission, letter, crew programme | `build`, `about`, `crew` blocks in `content/en.json` and `content/ru.json` |
| The harbour log (dated one-liners under the games) | `content/log.json`: date, optional game id, `en` + `ru` text; newest first on the page, six open, the rest behind a button |
| The videos in "From the channel" | `node tools/videos.mjs` rewrites `content/videos.json` from the channel (newest public uploads, via C:/GODOT/youtube/yt.mjs), then rebuild |
| The press kit page | `press` block in the language files; the files served from `press/kit/` (logos, brand kit zip) |
| The logo | `img/logo.svg` (full, with the bridges; 64px and up), `img/mark.svg` (small: favicon, header) |
| The look | `style.css` |

`index.html`, `ru/index.html`, `play/`, `ru/play/`, `404.html`, `sitemap.xml` and `robots.txt` are build output. Commit
them, since Pages serves what is in the repo, but do not edit them by hand.

A visitor whose browser language has a page of its own is offered it in a strip at the bottom of the
screen, never redirected. Choosing a language, or closing the strip, is remembered in that browser.

## DNS (Cloudflare)

Four `A` records on `@` to 185.199.108.153 / .109 / .110 / .111 and `www` as a `CNAME` to
`vrlabdev.github.io`, all DNS only (grey cloud) so GitHub can keep the HTTPS certificate. The MX
and TXT records are Cloudflare Email Routing for contact@goldenharbourgames.com.

## Games on the site

Each game has a page, `play/<id>/` (and `ru/play/<id>/`), that plays it in a frame from itch
(`https://itch.io/embed-upload/<embed>`). The frame always serves the newest build on that itch
upload, so `tools/publish_itch.sh` in a game repo updates the site too; nothing here changes. The
game loads only when Play is pressed (an itch embed downloads the whole game as soon as it is on a
page). On a phone Play opens the game over the whole screen with a close button.

## Widgets on the home page

The games ride a 3D ring (drag to spin, arrows, dots, auto-advance). "How we build" shows the crew manifest: one bar per
kind of work, people vs AI, from the `build.rows` block in the language files; the mission, vision, promises and the
"how it is going" letter live under `about`; the crew programme ("Take an oar") under `crew`, with `oars` pointing at
game ids. The games grid filters by platform. Trailer links open the film in a dialog (youtube-nocookie); the channel
videos play in place. Everything respects prefers-reduced-motion and works without scripting.
