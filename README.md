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
images/og-image.png  social share image
robots.txt, sitemap.xml
```

## Replacing the placeholder photos

The gallery and story sections currently use generated colour-field tiles
(`.tile--1` … `.tile--6` in `css/style.css`) labelled by room, as stand-ins
for real photography. To swap one in:

1. Add the optimised photo to `images/`.
2. Replace the `<div class="tile ...">` with an `<img>` pointing at it
   (keep `loading="lazy"` on anything below the hero, and set `width`/
   `height` attributes matching the real image to avoid layout shift).

## Regenerating brand assets

`scripts/generate-brand-assets.js` draws the favicon set, `favicon.ico` and
the OG image from pure pixel math — no image libraries, no downloads. Edit
the palette constants at the top and re-run:

```bash
node scripts/generate-brand-assets.js
```

## Deployment

Hosted on Cloudflare Pages, deployed automatically on every push to `main`.
Domain: aldeablancarental.com.
