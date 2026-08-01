# Aldea Blanca Rental

Landing page for a private-pool townhouse in Aldea Blanca, one of the most
sought-after urbanisations in Nueva Andalucía, Marbella. The rental
company's own name for the property doesn't mean anything to a searcher —
nobody looks for it — so the site leads with the place people actually
search for: Aldea Blanca. The site's only job is to get the visitor to the
real booking page.

Plain HTML/CSS/JS — no build step, no framework, no dependencies.

## Structure

```
index.html          the page
404.html             not-found page
css/style.css        all styles (design tokens at the top)
js/main.js           one small progressive enhancement (walk-time ruler fill)
icons/, favicon.*    brand mark (ripple rings) — see scripts/generate-brand-assets.js
images/og-image.jpg  social share image (real photo, not generated)
robots.txt, sitemap.xml
```

## Things that live in more than one place

Plain HTML has no shared constants, so these are duplicated on purpose —
grep before changing either one so all copies move together:

- **Booking link** (`https://www.justrentmarbella.com/...`) — 5 places in
  `index.html`. `grep -n justrentmarbella.com index.html` to find them, or
  `sed -i '' 's#OLD_URL#NEW_URL#g' index.html` to replace all at once.
- **Coordinates** (`36.4897, -4.96301`) — the JSON-LD `geo` block and the
  OpenStreetMap `iframe` `src` in the location section both encode the same
  point. `grep -n "36.4897\|4.96301" index.html`.

## Replacing a photo

`images/` holds the real photography (hero, three story shots, six gallery
shots, and the social-share `og-image.jpg`), optimised with `sips` — see
each file's dimensions before replacing so the new one matches (`sips -g
pixelWidth -g pixelHeight images/<file>.jpg`). Keep `loading="lazy"` on
anything below the hero, and match `width`/`height` attributes to the new
file to avoid layout shift. The hero image is the only one that loads
eagerly (`fetchpriority="high"`, no `loading="lazy"`).

## Regenerating the favicon set

`scripts/generate-brand-assets.js` draws `icons/*.png` and `favicon.ico`
from pure pixel math — no image libraries, no downloads. Edit the palette
constants at the top and re-run:

```bash
node scripts/generate-brand-assets.js
```

## Deployment

Hosted on Cloudflare Pages, deployed automatically on every push to `main`.
Domain: aldeablancarental.com.
