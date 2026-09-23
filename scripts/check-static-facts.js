#!/usr/bin/env node
/**
 * Cross-checks the facts that are written down in more than one place in
 * this repo, purely by reading the files on disk — no network, no build step.
 *
 * Plain HTML has no shared constants (see README "Things that live in more
 * than one place"), so the FAQ answers, the price range and the core facts
 * (registration number, coordinates, room counts) each exist as more than
 * one copy: the visible page, the two JSON-LD blocks in <head>, and llms.txt.
 * Nothing in Cloudflare Pages' plain static deploy enforces that the copies
 * agree, so a page edit that updates one copy and forgets the other would
 * ship silently — search engines and AI crawlers would then read a page
 * that contradicts itself, or an llms.txt that has quietly gone stale.
 *
 * Run by hand before committing a change to the FAQ, the price range, the
 * identifier or the coordinates:
 *   node scripts/check-static-facts.js
 *
 * Not wired into a CI step on purpose — this site has none, and these
 * facts change on the order of once a season (see scripts/quarterly-check.js,
 * which already watches the price range against the live JustRent listing
 * on its own schedule; this script is the same idea for the copies that
 * live only inside this repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');

let checks = 0;
let failures = 0;

function check(label, ok, detail) {
  checks += 1;
  if (ok) {
    console.log(`ok    ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// --- 1. Both <script type="application/ld+json"> blocks parse ---
const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
});
check('exactly two JSON-LD blocks, both valid JSON', ldBlocks.length === 2 && ldBlocks.every(Boolean), `found ${ldBlocks.length} block(s), ${ldBlocks.filter(Boolean).length} parsed`);

const vacationRental = ldBlocks.find((b) => b && b['@type'] === 'VacationRental');
const faqPage = ldBlocks.find((b) => b && b['@type'] === 'FAQPage');
check('VacationRental JSON-LD block present', !!vacationRental);
check('FAQPage JSON-LD block present', !!faqPage);

// --- 2. FAQPage mainEntity text is byte-identical to the visible FAQ, in order ---
if (faqPage) {
  const faqSectionStart = html.indexOf('faq__grid');
  const visible = [...html.slice(faqSectionStart).matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/gs)].map((m) => ({
    q: m[1].replace(/&amp;/g, '&'),
    a: m[2].replace(/&amp;/g, '&'),
  }));
  check('FAQPage has the same number of questions as the visible FAQ', faqPage.mainEntity.length === visible.length, `JSON-LD has ${faqPage.mainEntity.length}, page has ${visible.length}`);
  faqPage.mainEntity.forEach((entry, i) => {
    const v = visible[i];
    if (!v) return; // count mismatch already reported above
    check(`FAQ #${i + 1} question text matches the visible page`, entry.name === v.q, `JSON-LD="${entry.name}" page="${v.q}"`);
    check(`FAQ #${i + 1} answer text matches the visible page`, entry.acceptedAnswer.text === v.a, `JSON-LD="${entry.acceptedAnswer.text}" page="${v.a}"`);
  });
}

// --- 3. The price range in JSON-LD matches the visible "From €X to €Y" heading ---
if (vacationRental) {
  const headingMatch = html.match(/From\s*€(\d+)\s*to\s*€(\d+)/i);
  const ldMatch = String(vacationRental.priceRange).match(/€(\d+)-€(\d+)/);
  check(
    'priceRange in JSON-LD matches the visible rates heading',
    !!headingMatch && !!ldMatch && headingMatch[1] === ldMatch[1] && headingMatch[2] === ldMatch[2],
    `heading=${headingMatch ? `${headingMatch[1]}-${headingMatch[2]}` : 'not found'}, JSON-LD priceRange="${vacationRental ? vacationRental.priceRange : ''}"`
  );
}

// --- 3b. The geo coordinates in JSON-LD match the OpenStreetMap iframe ---
if (vacationRental) {
  const { latitude, longitude } = vacationRental.geo;
  const iframeMatch = html.match(/openstreetmap\.org\/export\/embed\.html\?[^"]*/);
  check(
    'geo coordinates in JSON-LD match the OpenStreetMap iframe src',
    !!iframeMatch && iframeMatch[0].includes(String(latitude)) && iframeMatch[0].includes(String(longitude)),
    `JSON-LD geo=${latitude},${longitude}, iframe src="${iframeMatch ? iframeMatch[0] : 'not found'}"`
  );
}

// --- 4. The core facts restated in prose in llms.txt match the JSON-LD ---
//
// A bare `llms.includes(value)` on a short digit string is a vacuous check:
// the bedroom count "4" is also a substring of the longitude "-4.96301", so
// deleting "4 bedrooms" from llms.txt entirely still left the plain-number
// version of this check passing (mutation-tested 2026-09-23 — see README).
// Every short/collision-prone number below is anchored to the unit or word
// that makes it that specific fact, not just any occurrence of the digits.
if (vacationRental) {
  const facts = [
    ['registration number', vacationRental.identifier, vacationRental.identifier],
    ['latitude', String(vacationRental.geo.latitude), String(vacationRental.geo.latitude)],
    ['longitude', String(vacationRental.geo.longitude), String(vacationRental.geo.longitude)],
    ['bedroom count', vacationRental.containsPlace.numberOfBedrooms, `${vacationRental.containsPlace.numberOfBedrooms} bedroom`],
    ['bathroom count', vacationRental.containsPlace.numberOfBathroomsTotal, `${vacationRental.containsPlace.numberOfBathroomsTotal} shower bathroom`],
    ['occupancy', vacationRental.containsPlace.occupancy.value, `sleeps ${vacationRental.containsPlace.occupancy.value}`],
    ['interior floor size', vacationRental.containsPlace.floorSize.value, `${vacationRental.containsPlace.floorSize.value} m²`],
  ];
  facts.forEach(([label, value, anchoredNeedle]) => {
    check(`llms.txt mentions the same ${label} as the JSON-LD ("${value}")`, llms.includes(anchoredNeedle), `looked for "${anchoredNeedle}"`);
  });

  const priceMatch = String(vacationRental.priceRange).match(/€(\d+)-€(\d+)/);
  if (priceMatch) {
    check('llms.txt mentions the same low price as the JSON-LD', llms.includes(`€${priceMatch[1]}`));
    check('llms.txt mentions the same high price as the JSON-LD', llms.includes(`€${priceMatch[2]}`));
  }

  const bookingUrl = vacationRental.potentialAction && vacationRental.potentialAction.target && vacationRental.potentialAction.target.urlTemplate;
  if (bookingUrl) {
    check('llms.txt has the same booking URL as the JSON-LD', llms.includes(bookingUrl));
  }
}

console.log(`\n${checks} checks, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
