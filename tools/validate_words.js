#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORD_DIR = path.join(ROOT, 'data', 'words');
const LETTERS = ['b', 'm', 'p', 'r', 's', 'v', 'z'];
const HEADER = [
  'id',
  'pack',
  'pair_id',
  'selected_letter',
  'surface',
  'answer_group',
  'contrast_surface',
  'needs_disambiguation',
  'disambiguation_mode',
  'picture_role',
  'sentence',
  'image_prompt',
  'source',
  'status',
  'notes',
];

const ALLOWED = {
  answer_group: new Set(['i', 'y']),
  needs_disambiguation: new Set(['true', 'false']),
  disambiguation_mode: new Set(['picture', 'sentence', 'both', 'none']),
  picture_role: new Set(['both_sides', 'this_side_only', 'contrast_side_only', 'none']),
  status: new Set(['ready', 'review', 'candidate', 'excluded']),
};

const errors = [];
const rows = [];
const ids = new Map();

function error(file, line, message) {
  errors.push(`${file}:${line}: ${message}`);
}

function parseFile(letter) {
  const file = `data/words/${letter}.tsv`;
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    errors.push(`${file}: missing file`);
    return;
  }

  const text = fs.readFileSync(abs, 'utf8');
  if (!text.endsWith('\n')) {
    errors.push(`${file}: file must end with a newline`);
  }

  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) {
    errors.push(`${file}: empty file`);
    return;
  }

  const header = lines[0].split('\t');
  if (header.join('\t') !== HEADER.join('\t')) {
    errors.push(`${file}: header must be exactly: ${HEADER.join('\\t')}`);
    return;
  }

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = lines[i].split('\t');
    const lineNo = i + 1;
    if (cells.length !== HEADER.length) {
      error(file, lineNo, `expected ${HEADER.length} columns, got ${cells.length}`);
      continue;
    }

    const row = Object.fromEntries(HEADER.map((key, idx) => [key, cells[idx]]));
    row.__file = file;
    row.__line = lineNo;
    rows.push(row);

    for (const key of ['id', 'pack', 'selected_letter', 'surface', 'answer_group', 'needs_disambiguation', 'disambiguation_mode', 'picture_role', 'source', 'status']) {
      if (!row[key]) error(file, lineNo, `missing required ${key}`);
    }

    if (row.selected_letter !== letter) {
      error(file, lineNo, `selected_letter must match file letter "${letter}"`);
    }

    for (const [key, allowed] of Object.entries(ALLOWED)) {
      if (row[key] && !allowed.has(row[key])) {
        error(file, lineNo, `unknown ${key}: ${row[key]}`);
      }
    }

    if (row.id) {
      const previous = ids.get(row.id);
      if (previous) {
        error(file, lineNo, `duplicate id ${row.id}; first seen at ${previous.__file}:${previous.__line}`);
      } else {
        ids.set(row.id, row);
      }
    }

    if (row.status === 'ready' || row.status === 'review') {
      if (!row.sentence) error(file, lineNo, 'ready/review row must have sentence');
      if (row.sentence && !row.sentence.includes('{target}')) {
        error(file, lineNo, 'sentence must include {target}');
      }
    }

    if (row.needs_disambiguation === 'true') {
      if (!row.pair_id) error(file, lineNo, 'disambiguation row must have pair_id');
      if (!row.contrast_surface) error(file, lineNo, 'disambiguation row must have contrast_surface');
      if (row.disambiguation_mode === 'none') {
        error(file, lineNo, 'disambiguation row cannot use disambiguation_mode=none');
      }
    }
  }
}

for (const letter of LETTERS) parseFile(letter);

const byPair = new Map();
for (const row of rows.filter(r => r.pair_id)) {
  const pairRows = byPair.get(row.pair_id) || [];
  pairRows.push(row);
  byPair.set(row.pair_id, pairRows);
}

for (const [pairId, pairRows] of byPair.entries()) {
  const surfaces = new Set(pairRows.map(r => r.surface));
  const groups = new Set(pairRows.map(r => r.answer_group));
  if (!groups.has('i') || !groups.has('y')) {
    const first = pairRows[0];
    error(first.__file, first.__line, `pair ${pairId} must include both i and y rows`);
  }
  for (const row of pairRows) {
    if (row.contrast_surface && !surfaces.has(row.contrast_surface)) {
      error(row.__file, row.__line, `contrast_surface ${row.contrast_surface} not found in pair ${pairId}`);
    }
  }
}

const readyByPack = new Map();
for (const row of rows.filter(r => r.status === 'ready')) {
  const counts = readyByPack.get(row.pack) || { i: 0, y: 0 };
  counts[row.answer_group]++;
  readyByPack.set(row.pack, counts);
}

for (const [pack, counts] of readyByPack.entries()) {
  if (counts.i < counts.y) {
    errors.push(`pack ${pack}: needs at least as many i cards as y cards; got i=${counts.i}, y=${counts.y}`);
  }
}

if (errors.length) {
  console.error(`Word list validation failed with ${errors.length} error(s):`);
  for (const msg of errors) console.error(`- ${msg}`);
  process.exit(1);
}

const ready = rows.filter(r => r.status === 'ready');
const review = rows.filter(r => r.status === 'review');
const candidate = rows.filter(r => r.status === 'candidate');
const counts = rows.reduce((acc, r) => {
  acc[r.answer_group] = (acc[r.answer_group] || 0) + 1;
  return acc;
}, {});
const readyCounts = ready.reduce((acc, r) => {
  acc[r.answer_group] = (acc[r.answer_group] || 0) + 1;
  return acc;
}, {});

console.log(`Validated ${rows.length} row(s) across ${LETTERS.length} file(s).`);
console.log(`Ready: ${ready.length}; review: ${review.length}; candidate: ${candidate.length}.`);
console.log(`Ready answer counts: i=${readyCounts.i || 0}, y=${readyCounts.y || 0}.`);
console.log(`All-row answer counts: i=${counts.i || 0}, y=${counts.y || 0}.`);
