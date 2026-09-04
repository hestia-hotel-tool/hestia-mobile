#!/usr/bin/env node
/**
 * Normalise Figma-exported SVGs for the Icon registry.
 *
 *   node scripts/normalizeSvg.js <file|dir>... [--mono <color,color>] [--out <dir>]
 *
 * Figma exports carry attributes that fight a component-based icon system:
 *
 *   preserveAspectRatio="none"  distorts the glyph the moment the box is not
 *                               the exact export size
 *   width / height              pin an intrinsic size, so `size` props are ignored
 *   style="display: block"      an HTML style react-native-svg does not use
 *   id="Vector_2" / "Group 257" layer names, pure noise once exported
 *
 * `--mono` rewrites the listed colours to `currentColor` so `<Icon color=…>`
 * tints the glyph. Pass it only for single-colour icons — two-tone brand marks
 * (nav-home, nav-lost-found, the Hestia logo) must keep their fills, and
 * flattening them to one colour would destroy the mark.
 *
 * Deliberately not SVGO: this does the handful of transforms the registry needs
 * without adding a dependency. Path data is left untouched.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const inputs = [];
let mono = [];
let outDir = null;

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--mono') {
    mono = (args[i + 1] ?? '').split(',').map((c) => c.trim()).filter(Boolean);
    i += 1;
  } else if (args[i] === '--out') {
    outDir = args[i + 1];
    i += 1;
  } else {
    inputs.push(args[i]);
  }
}

if (inputs.length === 0) {
  console.error('usage: node scripts/normalizeSvg.js <file|dir>... [--mono c1,c2] [--out dir]');
  process.exit(1);
}

/** Expand directories to the .svg files inside them. */
function expand(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return [target];
  return fs
    .readdirSync(target)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => path.join(target, f));
}

const files = inputs.flatMap(expand);
const monoLower = mono.map((c) => c.toLowerCase());

function normalize(svg) {
  let out = svg;

  // Attributes that break sizing or are export noise.
  out = out.replace(/\s+preserveAspectRatio="[^"]*"/g, '');
  out = out.replace(/\s+overflow="[^"]*"/g, '');
  out = out.replace(/\s+style="[^"]*"/g, '');
  out = out.replace(/\s+id="[^"]*"/g, '');

  // Drop intrinsic size from the root only; keep viewBox so the glyph scales.
  out = out.replace(/<svg([^>]*)>/, (full, attrs) => {
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/g, '')
      .replace(/\s+height="[^"]*"/g, '');
    return `<svg${cleaned}>`;
  });

  // Tint-ability: only for icons the caller declared single-colour.
  for (const color of monoLower) {
    const re = new RegExp(`(fill|stroke)="${color}"`, 'gi');
    out = out.replace(re, '$1="currentColor"');
  }

  // Collapse the blank lines Figma leaves behind.
  out = out.replace(/\n{2,}/g, '\n').trim();

  return `${out}\n`;
}

let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = normalize(before);
  const dest = outDir ? path.join(outDir, path.basename(file)) : file;

  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(dest, after);

  const delta = before.length - after.length;
  console.log(
    `  ${path.basename(file).padEnd(24)} ${String(before.length).padStart(6)} -> ` +
      `${String(after.length).padStart(6)} bytes${delta > 0 ? ` (-${delta})` : ''}`
  );
  changed += 1;
}

console.log(`\nNormalised ${changed} file(s)${mono.length ? ` — mono: ${mono.join(', ')}` : ''}`);
