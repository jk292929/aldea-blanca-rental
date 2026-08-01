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
_headers             Cloudflare cache-control rules (images/css/js) — Workers
                     Static Assets default to max-age=0 otherwise
```

## Facts, and where they came from

Every number and claim on the page is either verifiable on JustRent
Marbella's public listing for this property or was confirmed directly by
the owner. Do not add a fact that is neither.

From the JustRent listing: rates €271–€714/night incl. VAT, pool heating
€50/night, final cleaning €360/booking, registration **VUT/MA/88632**,
4 bedrooms (3 double + 1 single), 3 shower bathrooms, sleeps 7, 180 m²
interior, 585 m² plot, sandy beach 1.8 km, Golf Valley 3.6 km, airport
63 km.

From the owner, where the listing was wrong or vague: **three** communal
pools in the urbanisation (one very large), SuperCor within an easy walk,
and parking that is **within the urbanisation, not private to the house**.

Deliberately absent: reviews, ratings, review/rating structured data, a
floor plan. The only reviews that exist are on Airbnb and republishing
them has not been cleared.

FAQ structured data is also deliberately absent: Google restricted FAQ
rich results to government and health sites in 2023, so it would earn
nothing while adding a second copy of every answer to keep in sync.

## Things that live in more than one place

Plain HTML has no shared constants, so these are duplicated on purpose —
grep before changing either one so all copies move together:

- **Booking link** (`https://www.justrentmarbella.com/...`) — several
  places in `index.html`. `grep -n justrentmarbella.com index.html`, or
  `sed -i '' 's#OLD_URL#NEW_URL#g' index.html` to replace all at once.
- **Coordinates** (`36.4897, -4.96301`) — the JSON-LD `geo` block and the
  OpenStreetMap `iframe` `src` both encode the same point.
  `grep -n "36.4897\|4.96301" index.html`.
- **The price range** (`€271`/`€714`) — once in the rates heading and once
  in the JSON-LD `priceRange`. The other two prices (`€50`, `€360`) appear
  exactly once each, in the rates list; the FAQ refers to them in words on
  purpose so there is nothing to keep in sync. `grep -n "€" index.html`.

## Measurement

No analytics, no cookies and no third-party scripts are loaded today, so
the site needs no consent banner. What is already wired:

- Every outbound link carries `data-justrent="<placement>"` and fires a
  `click_to_justrent` event on `window.dataLayer` with placement, link
  text, URL and path.
- Incoming `utm_*`, `gclid` and `fbclid` are forwarded to the JustRent
  link so a campaign keeps its trail. Only those keys — never the whole
  query string, which could carry something personal.

Nothing consumes `dataLayer` yet. Adding Google Tag Manager makes the
events live without touching the markup; that introduces cookies and the
consent obligations that come with them.

## Replacing a photo

`images/` holds the real photography (hero, three story shots, six gallery
shots, and the social-share `og-image.jpg`), optimised with `sips`. The
hero and the three story photos each ship two sizes — a full one and a
`-600`/`-700` mobile one — plus a `.webp` sibling of every JPEG, all
wired up via `<picture>`/`srcset` (see any of them in `index.html` as a
template). Regenerate a replacement the same way:

```bash
sips -Z 1000 -s format jpeg -s formatOptions 65 images/story-x.jpg   # full size
sips -Z 600  -s format jpeg -s formatOptions 65 images/story-x-600.jpg
cwebp -q 72 images/story-x.jpg -o images/story-x.webp
cwebp -q 72 images/story-x-600.jpg -o images/story-x-600.webp
```

`cwebp` comes from `brew install webp`. Keep `loading="lazy"` on anything
below the hero, and match `width`/`height` on the `<img>` to the *full*
size to avoid layout shift. The hero is the only image that loads eagerly
(`fetchpriority="high"`, no `loading="lazy"`). The six gallery photos are
single-size (700w) — small and below-the-fold enough that a mobile variant
isn't worth the added complexity.

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
