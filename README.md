# goldenharbourgames.com

The studio site: one static page, no build step. `index.html`, `style.css`, and `img/` (the four
game covers at 630x500, the same art as the itch pages, plus `mark.svg`, the logo and favicon).

Open `index.html` in a browser to see it. To put it online with GitHub Pages: repo Settings -> Pages
-> Deploy from a branch -> `main`, folder `/ (root)`. It is then at
`https://vrlabdev.github.io/goldenharbourgames.com/`.

When the domain is bought: add a `CNAME` file containing `goldenharbourgames.com`, set the domain in
the same Pages screen, and point the DNS at GitHub (four A records for the apex, see GitHub's
"Managing a custom domain" page). Not before - with a CNAME and no domain, the site is unreachable.

A new game is one more `<article class="card">` in `index.html` and a 630x500 cover in `img/`.
