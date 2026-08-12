#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DISAMBIGUATION_FILE = 'data/words/disambiguation.tsv';
const RUNTIME_DISAMBIGUATION_FILE = 'web/data/disambiguation.tsv';
const LEGACY_SELECTED_FILE = 'data/words/selected.tsv';
const LEGACY_SELECTED_DIR = 'data/words/selected';
const SIMPLE_DIR = 'data/words/simple';
const LETTERS = ['b', 'm', 'p', 'r', 's', 'v', 'z'];
const LETTER_SET = new Set(LETTERS);
const SIMPLE_FILES = LETTERS.map(letter => ({
  letter,
  file: `${SIMPLE_DIR}/${letter}.txt`,
}));

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

function parseWordList(file, defaults) {
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

  const rows = [];
  const seenSections = new Set();
  let answerGroup = null;
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const entry = lines[i].trim();
    if (!entry || entry.startsWith('#')) continue;
    const section = entry.match(/^\[(.+)\]$/);
    if (section) {
      answerGroup = section[1];
      if (!ALLOWED.answer_group.has(answerGroup)) {
        error(file, lineNo, `unknown simple-list section: ${entry}`);
        answerGroup = null;
      } else {
        seenSections.add(answerGroup);
      }
      continue;
    }
    if (entry.includes('\t')) {
      error(file, lineNo, 'simple word lists must contain one word or phrase per line, not TSV cells');
      continue;
    }
    if (!answerGroup) {
      error(file, lineNo, 'word must appear under an [i] or [y] section');
      continue;
    }
    const [surface, sentence = ''] = entry.split(/\s+\|\s+/, 2);
    if (!surface) {
      error(file, lineNo, 'simple word must appear before an optional clue');
      continue;
    }
    rows.push({
      ...defaults,
      answer_group: answerGroup,
      surface,
      sentence,
      __file: file,
      __line: lineNo,
    });
  }

  if (rows.length === 0) {
    errors.push(`${file}: empty word list`);
  }

  for (const group of ['i', 'y']) {
    if (!seenSections.has(group)) {
      errors.push(`${file}: missing [${group}] section`);
    }
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
  if (row.selected_letter && !LETTER_SET.has(row.selected_letter)) {
    error(row.__file, row.__line, `unknown selected_letter: ${row.selected_letter}`);
  }
}

function parseSimpleFiles() {
  const legacyPath = path.join(ROOT, LEGACY_SELECTED_FILE);
  if (fs.existsSync(legacyPath)) {
    errors.push(`${LEGACY_SELECTED_FILE}: use per-letter files in ${SIMPLE_DIR}/`);
  }

  const legacyDirPath = path.join(ROOT, LEGACY_SELECTED_DIR);
  if (fs.existsSync(legacyDirPath)) {
    const legacyFiles = fs.readdirSync(legacyDirPath).filter(name => !name.startsWith('.'));
    if (legacyFiles.length) {
      errors.push(`${LEGACY_SELECTED_DIR}: use ${SIMPLE_DIR}/ for simple i/y lists`);
    }
  }

  const simpleDirPath = path.join(ROOT, SIMPLE_DIR);
  if (fs.existsSync(simpleDirPath)) {
    const expectedNames = new Set(SIMPLE_FILES.map(({ file }) => path.basename(file)));
    for (const name of fs.readdirSync(simpleDirPath).filter(name => !name.startsWith('.'))) {
      if (!expectedNames.has(name)) {
        errors.push(`${SIMPLE_DIR}/${name}: unexpected simple-list file`);
      }
    }
  }

  const rows = [];
  for (const { letter, file } of SIMPLE_FILES) {
    rows.push(...parseWordList(file, { selected_letter: letter }));
  }
  return rows;
}

function hasAnswerAfterSelectedLetter(row) {
  const chars = Array.from(row.surface.toLocaleLowerCase('sk'));
  const accepted = row.answer_group === 'i' ? new Set(['i', 'í']) : new Set(['y', 'ý']);
  return chars.some((char, index) => char === row.selected_letter && accepted.has(chars[index + 1]));
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

function validateSimple(rows, disambiguationRows) {
  const disambiguationSurfaces = new Set(disambiguationRows.map(row => row.surface));
  const simpleSurfaces = new Map();
  const answerCountsByLetter = new Map();

  for (const row of rows) {
    checkRequired(row, ['answer_group', 'surface']);
    checkLetter(row);

    if (row.answer_group && !ALLOWED.answer_group.has(row.answer_group)) {
      error(row.__file, row.__line, `unknown answer_group: ${row.answer_group}`);
    }

    if (row.surface && row.answer_group && !hasAnswerAfterSelectedLetter(row)) {
      const expected = row.answer_group === 'i' ? 'i/í' : 'y/ý';
      error(row.__file, row.__line, `surface must contain ${row.selected_letter} + ${expected}`);
    }

    if (row.surface) {
      const normalizedSurface = row.surface.toLocaleLowerCase('sk');
      const previous = simpleSurfaces.get(normalizedSurface);
      if (previous) {
        error(row.__file, row.__line, `duplicate surface ${row.surface}; first seen at ${previous.__file}:${previous.__line}`);
      } else {
        simpleSurfaces.set(normalizedSurface, row);
      }
    }

    if (ALLOWED.answer_group.has(row.answer_group)) {
      const counts = answerCountsByLetter.get(row.selected_letter) || { i: 0, y: 0 };
      counts[row.answer_group]++;
      answerCountsByLetter.set(row.selected_letter, counts);
    }

    if (disambiguationSurfaces.has(row.surface)) {
      error(row.__file, row.__line, `surface ${row.surface} belongs in ${DISAMBIGUATION_FILE}`);
    }
  }

  for (const [letter, counts] of answerCountsByLetter.entries()) {
    if (counts.i < counts.y) {
      errors.push(`${SIMPLE_DIR}/${letter}.txt: needs at least as many i controls as y rows; got i=${counts.i}, y=${counts.y}`);
    }
  }
}

function validateRuntimeCopy() {
  const source = path.join(ROOT, DISAMBIGUATION_FILE);
  const runtime = path.join(ROOT, RUNTIME_DISAMBIGUATION_FILE);
  if (!fs.existsSync(runtime)) {
    errors.push(`${RUNTIME_DISAMBIGUATION_FILE}: missing runtime data copy`);
    return;
  }
  if (fs.readFileSync(source, 'utf8') !== fs.readFileSync(runtime, 'utf8')) {
    errors.push(`${RUNTIME_DISAMBIGUATION_FILE}: must match ${DISAMBIGUATION_FILE}`);
  }
}

const disambiguationRows = parseTsv(DISAMBIGUATION_FILE, DISAMBIGUATION_HEADER);
const simpleRows = parseSimpleFiles();

validateDisambiguation(disambiguationRows);
validateSimple(simpleRows, disambiguationRows);
validateRuntimeCopy();

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
const simpleByAnswer = simpleRows.reduce((acc, row) => {
  acc[row.answer_group] = (acc[row.answer_group] || 0) + 1;
  return acc;
}, { i: 0, y: 0 });
const simpleByLetter = simpleRows.reduce((acc, row) => {
  const counts = acc[row.selected_letter] || { i: 0, y: 0 };
  counts[row.answer_group]++;
  acc[row.selected_letter] = counts;
  return acc;
}, {});
const readyAnswerCounts = disambiguationRows.filter(r => r.status === 'ready').reduce((acc, row) => {
  acc[row.answer_group] = (acc[row.answer_group] || 0) + 1;
  return acc;
}, {});

console.log(`Validated ${disambiguationRows.length} disambiguation row(s) and ${simpleRows.length} simple-list row(s) across ${SIMPLE_FILES.length} simple file(s).`);
console.log(`Disambiguation: ready=${disambiguationCounts.ready || 0}; review=${disambiguationCounts.review || 0}; candidate=${disambiguationCounts.candidate || 0}.`);
console.log(`Simple lists: candidate=${simpleRows.length} by convention.`);
console.log(`Simple answer counts: i=${simpleByAnswer.i || 0}, y=${simpleByAnswer.y || 0}.`);
console.log(`Simple by letter: ${LETTERS.map(letter => {
  const counts = simpleByLetter[letter] || { i: 0, y: 0 };
  return `${letter}=i${counts.i || 0}/y${counts.y || 0}`;
}).join(', ')}.`);
console.log(`Ready disambiguation answer counts: i=${readyAnswerCounts.i || 0}, y=${readyAnswerCounts.y || 0}.`);
for (const [pack, counts] of [...readyByPack.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`Ready pack ${pack}: i=${counts.i || 0}, y=${counts.y || 0}.`);
}
