// Aldea Blanca — small progressive enhancements.
// Everything here is optional: with this file blocked or failing, the page
// still renders, reads and links out correctly.

/* ---------- Walk-distance ruler ----------
   The ruler is filled by default in CSS so it reads without JavaScript.
   Here we collapse it and let it grow back once it scrolls into view. */
const ruler = document.querySelector('[data-ruler-fill]');
if (ruler && 'IntersectionObserver' in window) {
  ruler.style.width = '0%';
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        ruler.style.width = '98%';
        observer.disconnect();
      }
    }
  }, { threshold: 0.5 });
  observer.observe(ruler);
}

/* ---------- Sticky booking bar (phones) ----------
   Stow the bar while the hero's own button is on screen, so a phone never
   shows the same call to action twice at once. */
const stickyBar = document.querySelector('.mobile-book');
const heroCta = document.querySelector('[data-justrent="hero"]');
if (stickyBar && heroCta && 'IntersectionObserver' in window) {
  const barObserver = new IntersectionObserver(([entry]) => {
    stickyBar.classList.toggle('is-stowed', entry.isIntersecting);
  }, { threshold: 0 });
  barObserver.observe(heroCta);
}

/* ---------- Outbound links to JustRent ----------
   Two jobs, both best-effort:

   1. Carry campaign parameters through. Someone arriving from an ad lands
      here with utm_* on the URL; without this the click into JustRent looks
      like direct traffic to them and the campaign loses its trail.
   2. Announce the click on window.dataLayer. Nothing consumes this today —
      the site sets no cookies and loads no tag manager. It is here so that
      adding GTM or GA4 later is a paste job, not a hunt through the markup.

   Campaign keys only. Never forward anything else from the query string:
   an unknown parameter could be personal, and it is not ours to pass on. */
const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

const incoming = new URLSearchParams(window.location.search);
const campaign = new URLSearchParams();
for (const key of CAMPAIGN_KEYS) {
  const value = incoming.get(key);
  if (value) campaign.set(key, value);
}

for (const link of document.querySelectorAll('[data-justrent]')) {
  // Append campaign params without disturbing the ones JustRent's URL already
  // carries — their listing URLs are query-driven, so clobbering is not safe.
  if ([...campaign].length) {
    try {
      const target = new URL(link.href);
      for (const [key, value] of campaign) {
        if (!target.searchParams.has(key)) target.searchParams.set(key, value);
      }
      link.href = target.toString();
    } catch (err) {
      // Leave the link exactly as authored rather than break the one thing
      // this page exists to do. Loud in the console, silent to the visitor.
      console.warn('[aldeablanca] could not attach campaign params to', link.href, err);
    }
  }

  link.addEventListener('click', () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'click_to_justrent',
      placement: link.dataset.justrent,      // hero | booking | header | mobile-bar | footer-cta | footer-link
      link_text: link.textContent.trim(),
      link_url: link.href,
      page_path: window.location.pathname,
    });
  });
}
