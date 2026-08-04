#!/usr/bin/env node
/**
 * Weekly traffic report for aldeablancarental.com, Mondays at 18:30.
 *
 * Reads Cloudflare Web Analytics over the GraphQL API and sends one ntfy
 * message: visits for the past seven days, the change against the seven
 * before that, and where the traffic came from. Cookieless at the source —
 * this only reads what Cloudflare already collects at the edge.
 *
 * Needs CLOUDFLARE_ANALYTICS_TOKEN in the environment. launchd does not read
 * ~/.zshenv, so the plist runs this through zsh, which does.
 *
 * Run by com.joachim.aldeablanca-weekly.plist. Safe to run by hand:
 *   node scripts/weekly-stats.js
 */
'use strict';

const { notify } = require('../../_shared/notify');
const { fetchPageviews } = require('../../_shared/cloudflare-analytics');
const { ACCOUNT, SITE_TAG } = require('../../_shared/site-visits');

const SITE_URL = 'https://aldeablancarental.com/';
const PREFIX = '[aldeablanca-weekly]';

const isoDay = (daysAgo) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

/** Page loads in a window, plus the referrer breakdown for the same window. */
async function windowStats(fromDay, toDay) {
  return fetchPageviews({ account: ACCOUNT, siteTag: SITE_TAG, token: process.env.CLOUDFLARE_ANALYTICS_TOKEN, fromDay, toDay });
}

/** "12 (+5)" / "12 (-3)" / "12 (oforandrat)" — the trend is the point, not the number. */
function withTrend(now, before) {
  const diff = now - before;
  if (diff === 0) return `${now} (ofor'andrat)`.replace("'", '');
  return `${now} (${diff > 0 ? '+' : ''}${diff})`;
}

(async () => {
  if (!process.env.CLOUDFLARE_ANALYTICS_TOKEN) {
    console.error(`${PREFIX} CLOUDFLARE_ANALYTICS_TOKEN saknas i miljon`);
    await notify({
      audience: 'joachim',
      level: 'hushall',
      title: 'Aldea Blanca: saknar API-nyckel',
      body: 'Veckorapporten kom inte at Cloudflare, nyckeln saknas i miljon.\nKontrollera CLOUDFLARE_ANALYTICS_TOKEN i .zshenv.',
      project: 'AldeaBlancaRental',
    });
    process.exit(0);
  }

  let thisWeek, lastWeek;
  try {
    [thisWeek, lastWeek] = await Promise.all([
      windowStats(isoDay(7), isoDay(0)),
      windowStats(isoDay(14), isoDay(7)),
    ]);
  } catch (err) {
    console.error(`${PREFIX} kunde inte hamta statistik:`, err);
    await notify({
      audience: 'joachim',
      level: 'hushall',
      title: 'Aldea Blanca: statistiken uteblev',
      body: 'Veckorapporten kunde inte lasa Cloudflare den har gangen.\nSajten paverkas inte, kollen forsoker igen nasta mandag.',
      click: SITE_URL,
      project: 'AldeaBlancaRental',
    });
    process.exit(0);
  }

  // Referrers worth naming: skip the site's own domain, keep the top few.
  const sources = thisWeek.referers
    .filter((r) => !r.host.includes('aldeablancarental'))
    .slice(0, 3)
    .map((r) => `${r.host} ${r.count}`)
    .join(', ');

  console.log(`${PREFIX} ${thisWeek.count} besok (forra veckan ${lastWeek.count})`);

  await notify({
    audience: 'joachim',
    level: 'klart',
    title: 'Aldea Blanca: veckans trafik',
    body: `${withTrend(thisWeek.count, lastWeek.count)} sidvisningar senaste sju dagarna.\n${sources ? `Storsta kallor: ${sources}.` : 'Ingen hanvisande kalla den har veckan.'}`,
    click: SITE_URL,
    project: 'AldeaBlancaRental',
  });
})().catch((err) => {
  console.error(`${PREFIX} ovantat fel:`, err);
  process.exit(1);
});
