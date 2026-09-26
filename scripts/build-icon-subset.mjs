#!/usr/bin/env node
/**
 * Bundles only the Iconify icons the app references, so <Icon icon="mdi:…">
 * renders instantly without fetching from the Iconify API at runtime.
 *
 *   npm run icons   (also runs automatically before `npm run build`)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { getIcons } from '@iconify/utils';

const ROOT = process.cwd();
const SOURCES = ['walkquest/static/js'];
const OUT = join(ROOT, 'walkquest/static/js/icons/subset.json');
const PREFIXES = ['mdi', 'material-symbols', 'ph', 'icon-park-solid', 'heroicons'];
const pattern = new RegExp(`\\b(${PREFIXES.join('|')}):([a-z0-9]+(?:-[a-z0-9]+)*)`, 'g');

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (['.vue', '.js'].includes(extname(name)) && !path.endsWith('subset.json')) files.push(path);
  }
})(...SOURCES.map((s) => join(ROOT, s)));

const wanted = new Map(PREFIXES.map((p) => [p, new Set()]));
for (const file of files) {
  for (const [, prefix, name] of readFileSync(file, 'utf8').matchAll(pattern)) wanted.get(prefix).add(name);
}

const collections = [];
const missing = [];
for (const [prefix, names] of wanted) {
  if (!names.size) continue;
  const data = JSON.parse(readFileSync(join(ROOT, `node_modules/@iconify-json/${prefix}/icons.json`), 'utf8'));
  const subset = getIcons(data, [...names]);
  if (!subset) continue;
  for (const n of names) if (!subset.icons[n] && !subset.aliases?.[n]) missing.push(`${prefix}:${n}`);
  collections.push(subset);
}

writeFileSync(OUT, JSON.stringify(collections));
const total = collections.reduce((n, c) => n + Object.keys(c.icons).length + Object.keys(c.aliases || {}).length, 0);
console.log(`Wrote ${OUT}: ${total} icons from ${collections.length} sets`);
if (missing.length) console.warn(`Unknown icons (will fall back to the Iconify API): ${missing.join(', ')}`);
