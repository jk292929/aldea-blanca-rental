#!/usr/bin/env node
/**
 * Quarterly health check for aldeablancarental.com.
 *
 * The site quotes prices that live on somebody else's page. When JustRent
 * Marbella changes them, nothing here breaks — the page simply starts lying,
 * silently, and would keep lying until someone happened to look. This is the
 * someone who happens to look.
 *
 * Reads the live site and the JustRent listing, compares the two, and sends
 * one notification either way. A quarterly all-clear is on purpose: a check
 * that only speaks when it fails is indistinguishable from a check that died.
 *
 * Run by com.joachim.aldeablanca-quarterly.plist. Safe to run by hand:
 *   node scripts/quarterly-check.js
 */
'use strict';

const { notify } = require('../../_shared/notify');

const SITE = 'https://aldeablancarental.com/';
const LISTING = 'https://www.justrentmarbella.com/rentals/terraced-house-nueva-andalucia-casa-blanca-mar-504092.html';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PREFIX = '[aldeablanca-check]';
const { runScript } = require('../../_shared/script-runtime');

async function fetchText(url) {
  // 30 s per hämtning. Utan signal finns i praktiken inget tak: mätt 2026-09-06 hängde
  // en fetch mot en server som skickar halva headers och sedan tystnar i ÖVER 60 s utan
  // att kasta (mätningen avbröts där, så det verkliga taket är okänt men längre än så).
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${url} svarade ${res.status}`);
  return res.text();
}

/**
 * The nightly rates from JustRent's seasonal price table.
 *
 * Scoped to the "Price lists" block on purpose. Scanning the whole page picks
 * up the cleaning fee, the heating supplement and figures belonging to other
 * properties, which is how the first draft of this check produced a range of
 * 214–5000 and would have cried wolf on its very first run.
 */
function nightlyRates(html) {
  const start = html.indexOf('Price lists');
  if (start === -1) return [];
  const table = html.slice(start, start + 4000).replace(/<[^>]+>/g, ' ');
  return [...table.matchAll(/€\s*([\d.,]+)/g)]
    .map((m) => Number(m[1].replace(/[.,]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** The range the site currently claims, read off the live page rather than the repo. */
function siteRange(html) {
  const m = html.match(/From\s*€(\d+)\s*to\s*€(\d+)/i);
  return m ? { low: Number(m[1]), high: Number(m[2]) } : null;
}

runScript({ name: 'aldeablanca-quarterly', timeoutMs: 10 * 60_000, run: async () => {
  let site, listing;
  try {
    [site, listing] = await Promise.all([fetchText(SITE), fetchText(LISTING)]);
  } catch (err) {
    console.error(`${PREFIX} kunde inte hämta sidorna:`, err);
    await notify({
      audience: 'joachim',
      level: 'hushall',
      title: 'Aldea Blanca: kollen nådde inte fram',
      body: 'Kvartalskollen kunde inte läsa sajten eller JustRents listning.\nKolla priserna för hand nästa gång du har en stund.',
      click: LISTING,
      project: 'AldeaBlancaRental',
    });
    process.exit(0);
  }

  const claimed = siteRange(site);
  const amounts = nightlyRates(listing);
  const actual = amounts.length
    ? { low: Math.min(...amounts), high: Math.max(...amounts) }
    : null;

  if (!claimed || !actual) {
    // Either page changed shape enough that the numbers cannot be found. That
    // is worth saying out loud — a check that cannot read is not a pass.
    console.error(`${PREFIX} hittade inte prisintervallet`, { claimed, actual });
    await notify({
      audience: 'joachim',
      level: 'hushall',
      title: 'Aldea Blanca: hittar inte priset',
      body: 'Kvartalskollen känner inte igen prisformatet längre, någon av sidorna har byggts om.\nJämför sajtens intervall med JustRents pristabell.',
      click: LISTING,
      project: 'AldeaBlancaRental',
    });
    process.exit(0);
  }

  const same = claimed.low === actual.low && claimed.high === actual.high;
  console.log(`${PREFIX} sajten: ${claimed.low}-${claimed.high}, JustRent: ${actual.low}-${actual.high}`);

  // Priserna stämmer = inget att göra → ingen push (docs/notiser.md: ljuder det
  // måste Joachim agera). Loggraden ovan bär kvittot; bara en avvikelse väcker.
  if (same) return;

  await notify({
    audience: 'joachim',
    level: 'beslut',
    title: 'Aldea Blanca: priset har ändrats',
    body: `Sajten säger ${claimed.low}-${claimed.high} euro, JustRent säger ${actual.low}-${actual.high}.\nBe Claude uppdatera prisblocket och pusha.`,
    click: LISTING,
    project: 'AldeaBlancaRental',
  });
} });
