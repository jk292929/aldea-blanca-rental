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

## Decisions that look like mistakes

Each of these was chosen on purpose and will look wrong to someone
arriving fresh. Read the reason before "fixing" one.

**"Heated pool", not "heatable".** The pool is only heated when a guest
asks and pays €50 a night, so "heatable" is the literally precise word —
and nobody writes it. The market and the search box both say "heated
pool". The page uses "heated" for findability and keeps the qualifier
next to it every time: the line under the headline says "heated on
request", the rates block gives the price, and the FAQ answers it
outright. The pool is never called heated without saying on whose
request. Keep both halves of that bargain.

**No FAQ structured data.** Google restricted FAQ rich results to
government and health sites in 2023. Adding the markup would earn nothing
and create a second copy of every answer to keep in sync with the visible
text.

**Prices appear more than once, deliberately.** Plain HTML has no
variables. Rather than invent an indirection, the count is kept to a
minimum and written down under "Things that live in more than one place".

**Rates sit low on the page, not under the hero.** Price second is what a
booking portal does. This page is meant to seduce first — photographs,
the area, the house — and cost later, when an interested reader actually
wants the number.

**No analytics events are consumed.** `click_to_justrent` fires into
`dataLayer` and nothing listens. That is the finished state, not an
unfinished one: it costs nothing, and the day a tag manager is added the
events are already wired. See "Measurement".

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

Everything in `images/` is built by one script, and that script is the
only place sizes, quality and colour are decided:

```bash
brew install imagemagick webp          # once
./scripts/optimise-photos.sh ~/originals
```

It rebuilds the whole set — every width, every `.webp` sibling, the
portrait hero crop and the share card — from a folder of full-size
originals. Those originals are the files on the JustRent Marbella
listing and are deliberately not committed; the script's header says so.
Re-run it whenever a photo changes so the set keeps one look rather than
drifting a shot at a time.

**The photographs are graded, and that is on purpose.** They came off the
camera flat — hard Andalusian sun washes the water out, and the pool read
grey-green rather than turquoise. The script puts back what the eye sees
standing there: saturation and a little contrast, with a nudge on blue
for the water. Outdoor and interior shots get different grades, because
pushing saturation in a room full of white surfaces tints the walls and
makes it look retouched. Saturation leaves neutrals alone, so the
whitewash stays white in both.

Keep `loading="lazy"` on anything below the hero, and match `width`/
`height` on the `<img>` to the *full* size to avoid layout shift. The
hero is the only image that loads eagerly (`fetchpriority="high"`, no
`loading="lazy"`).

**The hero ships a third file: a portrait crop.** A phone is around
0.48:1 and the landscape frame is 1.44:1, so `object-fit: cover` throws
away most of the width — and the pool, which is the entire reason anyone
is on this page, goes with it. `hero-pool-portrait.jpg/.webp` is a
700×900 crop that keeps the house and the water in shot, served by a
`<source media="(max-aspect-ratio: 3/4)">` ahead of the landscape ones.

Three things move together if you recrop it, and nothing enforces the
link: the crop's own dimensions, the `width`/`height` on both portrait
`<source>` elements, and the `3/4` threshold, which is set just under the
crop's 0.78 so the file is only served to screens narrower than itself.

```bash
sips -c 900 700 images/hero-pool-portrait.jpg     # centre crop, H then W
cwebp -q 74 images/hero-pool-portrait.jpg -o images/hero-pool-portrait.webp
```

The hero scrim is tuned against this photograph — it stays light over the
top of the frame so the house and water read, and only darkens where the
words are. Swap the hero for a differently-lit picture and the gradient
stops in `.hero__scrim` need looking at again, at a phone size.

**Pick the small width against device pixel ratio, not viewport width.**
A 390 px phone at DPR 2 asks for 780 px, so a 700 px variant is never
chosen — the browser skips it and takes the full desktop file instead.
That is why the tiers are 900 w (hero) and 800 w (story), and why the six
gallery photos ship one width only: at 700 w displayed small and below the
fold, a second tier would buy nothing. Verify a change rather than assume
it, with the preview open at a phone size:

```js
document.querySelector('.hero__photo').currentSrc   // which file won
```

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
