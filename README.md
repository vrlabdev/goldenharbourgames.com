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
| A new game | one entry in `content/games.json` (itch link, 630x500 cover in `img/`, platforms, languages) and its text under `games` in every language file |
| A new language | copy `content/en.json` to `content/<code>.json`, translate it, give it `"path": "<code>/"` |
| The two bridges in About | `content/skyline.svg` |
| The logo | `img/logo.svg` (full, with the bridges; 64px and up), `img/mark.svg` (small: favicon, header) |
| The look | `style.css` |

`index.html`, `ru/index.html`, `404.html`, `sitemap.xml` and `robots.txt` are build output. Commit
them, since Pages serves what is in the repo, but do not edit them by hand.

A visitor whose browser language has a page of its own is offered it in a strip at the bottom of the
screen, never redirected. Choosing a language, or closing the strip, is remembered in that browser.

## DNS (Cloudflare)

Four `A` records on `@` to 185.199.108.153 / .109 / .110 / .111 and `www` as a `CNAME` to
`vrlabdev.github.io`, all DNS only (grey cloud) so GitHub can keep the HTTPS certificate. The MX
and TXT records are Cloudflare Email Routing for contact@goldenharbourgames.com.
