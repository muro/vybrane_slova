(function initEngine(root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = engine;
  }
  root.VybraneSlovaEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const DISAMBIGUATION_HEADER = [
    'id', 'pack', 'pair_id', 'selected_letter', 'surface', 'answer_group',
    'contrast_surface', 'needs_disambiguation', 'disambiguation_mode',
    'picture_role', 'sentence', 'image_prompt', 'source', 'status', 'notes',
  ];
  const SIMPLE_ANSWER_GROUPS = new Set(['i', 'y']);
  const STORAGE_VERSION = 1;
  const STORAGE_KEYS = {
    progress: 'vybrane-slova.progress.v1',
    settings: 'vybrane-slova.settings.v1',
    lesson: 'vybrane-slova.lesson',
  };

  function parseTsv(text) {
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter((line, index, all) => line || index < all.length - 1);
    if (lines.length === 0) return [];
    const header = lines[0].split('\t');
    if (header.join('\t') !== DISAMBIGUATION_HEADER.join('\t')) {
      throw new Error('Unexpected disambiguation TSV header');
    }
    return lines.slice(1).filter(Boolean).map((line, rowIndex) => {
      const cells = line.split('\t');
      if (cells.length !== header.length) {
        throw new Error(`Invalid TSV row ${rowIndex + 2}: expected ${header.length} cells, got ${cells.length}`);
      }
      return Object.fromEntries(header.map((key, index) => [key, cells[index]]));
    });
  }

  function normalizeAnswer(answer) {
    if (answer === 'i' || answer === 'í') return 'i';
    if (answer === 'y' || answer === 'ý') return 'y';
    return answer;
  }

  function targetIndexForSelectedLetter(surface, selectedLetter, answerGroup) {
    const chars = Array.from(surface);
    const lowered = chars.map(char => char.toLocaleLowerCase('sk'));
    const accepted = answerGroup === 'i' ? new Set(['i', 'í']) : new Set(['y', 'ý']);
    const selectedIndex = lowered.findIndex((char, index) => char === selectedLetter && accepted.has(lowered[index + 1]));
    return selectedIndex === -1 ? -1 : selectedIndex + 1;
  }

  function maskSurface(surface, selectedLetter = null, answerGroup = null) {
    const chars = Array.from(surface);
    const index = selectedLetter && answerGroup
      ? targetIndexForSelectedLetter(surface, selectedLetter, answerGroup)
      : chars.findIndex(char => ['i', 'í', 'y', 'ý'].includes(char.toLocaleLowerCase('sk')));
    if (index === -1) return { maskedSurface: surface, missingLetter: '' };
    const missingLetter = chars[index];
    chars[index] = '_';
    return { maskedSurface: chars.join(''), missingLetter };
  }

  function prepareCard(row) {
    const masked = maskSurface(row.surface, row.selected_letter, row.answer_group);
    const sentence = row.sentence || '';
    return {
      ...row,
      missing_letter: masked.missingLetter,
      masked_surface: masked.maskedSurface,
      prompt_sentence: sentence.replace('{target}', masked.maskedSurface),
      full_sentence: sentence.includes('{target}') ? sentence.replace('{target}', row.surface) : row.surface,
    };
  }

  function loadDisambiguationCards(text, options = {}) {
    const statuses = new Set(options.statuses || ['ready']);
    const packs = options.packs ? new Set(options.packs) : null;
    return parseTsv(text)
      .filter(row => statuses.has(row.status))
      .filter(row => !packs || packs.has(row.pack))
      .map(prepareCard);
  }

  function parseSimpleWordList(text, selectedLetter) {
    let answerGroup = null;
    const rows = [];
    for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const surface = rawLine.trim();
      if (!surface || surface.startsWith('#')) continue;
      const section = surface.match(/^\[([iy])\]$/);
      if (section) {
        answerGroup = section[1];
        continue;
      }
      if (!answerGroup || !SIMPLE_ANSWER_GROUPS.has(answerGroup)) {
        throw new Error(`Simple word ${surface} is missing an [i] or [y] section`);
      }
      if (targetIndexForSelectedLetter(surface, selectedLetter, answerGroup) === -1) {
        throw new Error(`Simple word ${surface} has no ${answerGroup} after ${selectedLetter}`);
      }
      rows.push({
        id: `simple:${selectedLetter}:${answerGroup}:${surface}`,
        pack: 'simple', selected_letter: selectedLetter, surface, answer_group: answerGroup,
        needs_disambiguation: 'false', disambiguation_mode: 'none', picture_role: 'none',
        sentence: '', status: 'ready',
      });
    }
    if (!rows.length) throw new Error(`Simple list for ${selectedLetter} is empty`);
    return rows;
  }

  function loadSimpleCards(simpleLists) {
    return Object.entries(simpleLists)
      .flatMap(([selectedLetter, text]) => parseSimpleWordList(text, selectedLetter))
      .map(prepareCard);
  }

  function answerCounts(cards) {
    return cards.reduce((counts, card) => {
      counts[card.answer_group] = (counts[card.answer_group] || 0) + 1;
      return counts;
    }, { i: 0, y: 0 });
  }

  function filterCardsByLetters(cards, letters) {
    const selected = new Set(letters);
    return cards.filter(card => selected.has(card.selected_letter));
  }

  function mulberry32(seed) {
    return function random() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(cards, seed) {
    const random = mulberry32(seed);
    const next = cards.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function createRound(cards, options = {}) {
    const size = Math.min(options.size || cards.length, cards.length);
    const seed = Number.isInteger(options.seed) ? options.seed : Date.now();
    return shuffle(cards, seed).slice(0, size);
  }

  function checkAnswer(card, answer) {
    return normalizeAnswer(answer) === card.answer_group;
  }

  function defaultProgress() {
    return { version: STORAGE_VERSION, totalAnswered: 0, totalCorrect: 0, cards: {}, updatedAt: null };
  }

  function readJson(storage, key) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function loadProgress(storage) {
    const saved = readJson(storage, STORAGE_KEYS.progress);
    if (!saved || saved.version !== STORAGE_VERSION || typeof saved.cards !== 'object') return defaultProgress();
    return { ...defaultProgress(), ...saved, cards: saved.cards || {} };
  }

  function saveProgress(progress, storage) {
    if (!storage) return progress;
    try {
      storage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
    } catch (_error) {
      return progress;
    }
    return progress;
  }

  function recordAnswer(progress, card, isCorrect, now = Date.now()) {
    const previous = progress.cards[card.id] || { seen: 0, correct: 0, lastAnsweredAt: null };
    return {
      ...progress,
      totalAnswered: progress.totalAnswered + 1,
      totalCorrect: progress.totalCorrect + (isCorrect ? 1 : 0),
      updatedAt: now,
      cards: {
        ...progress.cards,
        [card.id]: {
          seen: previous.seen + 1,
          correct: previous.correct + (isCorrect ? 1 : 0),
          lastAnsweredAt: now,
        },
      },
    };
  }

  return {
    STORAGE_KEYS,
    parseTsv,
    loadDisambiguationCards,
    parseSimpleWordList,
    loadSimpleCards,
    answerCounts,
    filterCardsByLetters,
    createRound,
    checkAnswer,
    maskSurface,
    defaultProgress,
    loadProgress,
    saveProgress,
    recordAnswer,
  };
});
