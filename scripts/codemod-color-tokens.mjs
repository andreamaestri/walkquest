#!/usr/bin/env node
/**
 * One-off codemod (safe to re-run): M3 colour tokens moved from "R, G, B"
 * triplets to real colour values. Rewrites legacy usages:
 *   rgb(var(--md-sys-color-x))            → var(--md-sys-color-x)
 *   rgba(var(--md-sys-color-x), .12)      → color-mix(in srgb, var(--md-sys-color-x) 12%, transparent)
 *   rgb(var(--md-sys-color-x) / 0.48)     → color-mix(in srgb, var(--md-sys-color-x) 48%, transparent)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['walkquest/static/js', 'walkquest/static/css', 'walkquest/templates'];
const token = String.raw`var\(\s*(--md-sys-color-[a-z0-9-]+)\s*(?:,[^()]*(?:\([^()]*\))?[^()]*)?\)`;
const alpha = String.raw`([0-9.]+%?|var\([^()]*\)|calc\([^()]*\))`;
const rules = [
  [new RegExp(String.raw`rgba?\(\s*${token}\s*(?:,|\/)\s*${alpha}\s*\)`, 'g'), (_, name, a) => mix(name, a)],
  [new RegExp(String.raw`rgba?\(\s*${token}\s*\)`, 'g'), (_, name) => `var(${name})`],
];

function mix(name, a) {
  let pct;
  if (a.endsWith('%')) pct = a;
  else if (/^[0-9.]+$/.test(a)) pct = `${+(parseFloat(a) * 100).toFixed(2)}%`;
  else pct = `calc(${a} * 100%)`;
  return `color-mix(in srgb, var(${name}) ${pct}, transparent)`;
}

let changed = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (name !== 'dist') walk(path); continue; }
    if (!['.vue', '.css', '.js', '.html'].includes(extname(name))) continue;
    const src = readFileSync(path, 'utf8');
    let out = src;
    for (const [re, fn] of rules) out = out.replace(re, fn);
    if (out !== src) { writeFileSync(path, out); changed++; }
  }
}
roots.forEach(walk);
console.log(`Rewrote ${changed} files`);
