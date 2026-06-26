#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORD_DIR = path.join(ROOT, 'data', 'words');
const DISAMBIGUATION_FILE = 'data/words/disambiguation.tsv';
const SELECTED_FILE = 'data/words/selected.tsv';
const LETTERS = new Set(['b', 'm', 'p', 'r', 's', 'v', 'z']);

const DISAMBIGUATION_HEADER = [
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

const SELECTED_HEADER = [
  'id',
  'selected_letter',
  'surface',
  'status',
  'source',
  'notes',
];

const ALLOWED = {
  answer_group: new Set(['i', 'y']),
  needs_disambiguation: new Set(['true']),
  disambiguation_mode: new Set(['picture', 'sentence', 'both']),
  picture_role: new Set(['both_sides', 'this_side_only', 'contrast_side_only', 'none']),
  status: new Set(['ready', 'review', 'candidate', 'excluded']),
};

const errors = [];
const ids = new Map();

function error(file, line, message) {
  errors.push(`${file}:${line}: ${message}`);
}

function parseTsv(file, header) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    errors.push(`${file}: missing file`);
    return [];
  }

  const text = fs.readFileSync(abs, 'utf8');
  if (!text.endsWith('\n')) {
    errors.push(`${file}: file must end with a newline`);
  }

  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) {
    errors.push(`${file}: empty file`);
    return [];
  }

  const actualHeader = lines[0].split('\t');
  if (actualHeader.join('\t') !== header.join('\t')) {
    errors.push(`${file}: header must be exactly: ${header.join('\\t')}`);
    return [];
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = lines[i].split('\t');
    const lineNo = i + 1;
    if (cells.length !== header.length) {
      error(file, lineNo, `expected ${header.length} columns, got ${cells.length}`);
      continue;
    }

    const row = Object.fromEntries(header.map((key, idx) => [key, cells[idx]]));
    row.__file = file;
    row.__line = lineNo;
    rows.push(row);
  }

  return rows;
}

function checkRequired(row, keys) {
  for (const key of keys) {
    if (!row[key]) error(row.__file, row.__line, `missing required ${key}`);
  }
}

function checkId(row) {
  if (!row.id) return;
  const previous = ids.get(row.id);
  if (previous) {
    error(row.__file, row.__line, `duplicate id ${row.id}; first seen at ${previous.__file}:${previous.__line}`);
  } else {
    ids.set(row.id, row);
  }
}

function checkStatus(row) {
  if (row.status && !ALLOWED.status.has(row.status)) {
    error(row.__file, row.__line, `unknown status: ${row.status}`);
  }
}

function checkLetter(row) {
  if (row.selected_letter && !LETTERS.has(row.selected_letter)) {
    error(row.__file, row.__line, `unknown selected_letter: ${row.selected_letter}`);
  }
}

function validateDisambiguation(rows) {
  for (const row of rows) {
    checkRequired(row, [
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
      'source',
      'status',
    ]);
    checkId(row);
    checkStatus(row);
    checkLetter(row);

    for (const [key, allowed] of Object.entries(ALLOWED)) {
      if (row[key] && !allowed.has(row[key])) {
        error(row.__file, row.__line, `unknown ${key}: ${row[key]}`);
      }
    }

    if (row.needs_disambiguation !== 'true') {
      error(row.__file, row.__line, 'disambiguation rows must use needs_disambiguation=true');
    }

    if (row.sentence && !row.sentence.includes('{target}')) {
      error(row.__file, row.__line, 'sentence must include {target}');
    }

    if ((row.disambiguation_mode === 'picture' || row.disambiguation_mode === 'both') && !row.image_prompt) {
      error(row.__file, row.__line, `${row.disambiguation_mode} row must have image_prompt`);
    }

    if (row.picture_role !== 'none' && !row.image_prompt) {
      error(row.__file, row.__line, `picture_role=${row.picture_role} must have image_prompt`);
    }
  }

  const byPair = new Map();
  for (const row of rows) {
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

    const readyRows = pairRows.filter(r => r.status === 'ready');
    if (readyRows.length > 0) {
      const readyGroups = new Set(readyRows.map(r => r.answer_group));
      if (!readyGroups.has('i') || !readyGroups.has('y')) {
        const firstReady = readyRows[0];
        error(firstReady.__file, firstReady.__line, `ready rows in pair ${pairId} must include both i and y rows`);
      }
    }
  }
}

function validateSelected(rows, disambiguationRows) {
  const disambiguationSurfaces = new Set(disambiguationRows.map(row => row.surface));

  for (const row of rows) {
    checkRequired(row, ['id', 'selected_letter', 'surface', 'status', 'source']);
    checkId(row);
    checkStatus(row);
    checkLetter(row);

    if (disambiguationSurfaces.has(row.surface)) {
      error(row.__file, row.__line, `surface ${row.surface} belongs in ${DISAMBIGUATION_FILE}`);
    }
  }
}

const disambiguationRows = parseTsv(DISAMBIGUATION_FILE, DISAMBIGUATION_HEADER);
const selectedRows = parseTsv(SELECTED_FILE, SELECTED_HEADER);

validateDisambiguation(disambiguationRows);
validateSelected(selectedRows, disambiguationRows);

const readyByPack = new Map();
for (const row of disambiguationRows.filter(r => r.status === 'ready')) {
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

function countByStatus(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
}

const disambiguationCounts = countByStatus(disambiguationRows);
const selectedCounts = countByStatus(selectedRows);
const readyAnswerCounts = disambiguationRows.filter(r => r.status === 'ready').reduce((acc, row) => {
  acc[row.answer_group] = (acc[row.answer_group] || 0) + 1;
  return acc;
}, {});

console.log(`Validated ${disambiguationRows.length} disambiguation row(s) and ${selectedRows.length} selected-word row(s).`);
console.log(`Disambiguation: ready=${disambiguationCounts.ready || 0}; review=${disambiguationCounts.review || 0}; candidate=${disambiguationCounts.candidate || 0}.`);
console.log(`Selected words: ready=${selectedCounts.ready || 0}; review=${selectedCounts.review || 0}; candidate=${selectedCounts.candidate || 0}.`);
console.log(`Ready disambiguation answer counts: i=${readyAnswerCounts.i || 0}, y=${readyAnswerCounts.y || 0}.`);
for (const [pack, counts] of [...readyByPack.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`Ready pack ${pack}: i=${counts.i || 0}, y=${counts.y || 0}.`);
}
