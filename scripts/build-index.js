#!/usr/bin/env node
/**
 * Rebuilds index.html from index.template.html + partials/*.html.
 *
 * index.html crossed the 400-line componentisation threshold from Sites
 * CLAUDE.md §4. There is no server-side templating on this static,
 * Cloudflare-deployed site, so the split happens at authoring time instead:
 * the template + partials are the source of truth, and this script writes
 * the flat index.html that Cloudflare Pages actually serves — with zero
 * runtime cost and zero build step in the deploy itself (same shape as
 * scripts/optimise-photos.sh already has for images: a manual step you run
 * before committing, not a pipeline).
 *
 * Edit partials/*.html or index.template.html, then:
 *   node scripts/build-index.js          # regenerates index.html
 *   node scripts/build-index.js --check  # exits 1 if index.html is stale
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'index.template.html');
const PARTIALS_DIR = path.join(ROOT, 'partials');
const OUT_PATH = path.join(ROOT, 'index.html');

const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

const output = template.replace(/<!-- include: ([\w.-]+\.html) -->\n/g, (_match, name) => {
  const partialPath = path.join(PARTIALS_DIR, name);
  if (!fs.existsSync(partialPath)) {
    throw new Error(`Missing partial referenced by template: ${name}`);
  }
  return fs.readFileSync(partialPath, 'utf8');
});

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
  if (current !== output) {
    console.error('index.html is out of date with index.template.html + partials/ — run: node scripts/build-index.js');
    process.exit(1);
  }
  console.log('ok    index.html matches index.template.html + partials/');
  process.exit(0);
}

fs.writeFileSync(OUT_PATH, output);
console.log(`Wrote index.html (${output.split('\n').length - 1} lines) from index.template.html + partials/`);
