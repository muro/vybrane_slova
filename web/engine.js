(function initEngine(root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = engine;
  }
  root.VybraneSlovaEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
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

  const SIMPLE_ANSWER_GROUPS = new Set(['i', 'y']);

  const STORAGE_VERSION = 1;
  const STORAGE_KEYS = {
    progress: 'vybrane-slova.progress.v1',
    settings: 'vybrane-slova.settings.v1',
    lesson: 'vybrane-slova.lesson',
    profiles: 'vybrane-slova.profiles.v1',
  };

  const PROFILES_VERSION = 1;
  const PROFILE_NAME_MAX_LETTERS = 16;
  // Data that belongs to one child. Without profiles the base keys are used,
  // so practice from before profiles existed stays where it was.
  const PROFILE_DATA_KEYS = [STORAGE_KEYS.progress, STORAGE_KEYS.settings];

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
    if (index === -1) {
      return { maskedSurface: surface, missingLetter: '' };
    }
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
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);

    for (const rawLine of lines) {
      const entry = rawLine.trim();
      if (!entry || entry.startsWith('#')) continue;
      const section = entry.match(/^\[([iy])\]$/);
      if (section) {
        answerGroup = section[1];
        continue;
      }
      const [surface, sentence = ''] = entry.split(/\s+\|\s+/, 2);
      if (!answerGroup || !SIMPLE_ANSWER_GROUPS.has(answerGroup)) {
        throw new Error(`Simple word ${surface} is missing an [i] or [y] section`);
      }
      if (targetIndexForSelectedLetter(surface, selectedLetter, answerGroup) === -1) {
        throw new Error(`Simple word ${surface} has no ${answerGroup} after ${selectedLetter}`);
      }
      rows.push({
        id: `simple:${selectedLetter}:${answerGroup}:${surface}`,
        pack: 'simple',
        selected_letter: selectedLetter,
        surface,
        answer_group: answerGroup,
        needs_disambiguation: 'false',
        disambiguation_mode: 'none',
        picture_role: 'none',
        sentence,
        status: 'ready',
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
    return {
      version: STORAGE_VERSION,
      totalAnswered: 0,
      totalCorrect: 0,
      cards: {},
      updatedAt: null,
    };
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

  function profileStorageKey(baseKey, profileId = null) {
    return profileId ? `${baseKey}.${profileId}` : baseKey;
  }

  function loadProgress(storage, profileId = null) {
    const saved = readJson(storage, profileStorageKey(STORAGE_KEYS.progress, profileId));
    if (!saved || saved.version !== STORAGE_VERSION || typeof saved.cards !== 'object') {
      return defaultProgress();
    }
    return {
      ...defaultProgress(),
      ...saved,
      cards: saved.cards || {},
    };
  }

  function saveProgress(progress, storage, profileId = null) {
    if (!storage) return progress;
    try {
      storage.setItem(profileStorageKey(STORAGE_KEYS.progress, profileId), JSON.stringify(progress));
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

  // Mastery needs a few correct answers and a good hit rate, so one lucky drag
  // is not "known" and one early mistake does not block a word for good.
  const MASTERY_MAX_LEVEL = 4;
  const MASTERY_CORRECT_TARGET = 3;

  function masteryLevel(cardProgress) {
    if (!cardProgress || !cardProgress.seen) return 0;
    const accuracy = cardProgress.correct / cardProgress.seen;
    const practice = Math.min(cardProgress.correct, MASTERY_CORRECT_TARGET) / MASTERY_CORRECT_TARGET;
    return Math.round(accuracy * practice * MASTERY_MAX_LEVEL);
  }

  // Children type their own names, so tidy rather than reject: collapse
  // stray spaces, capitalize the first letter, and cap the length by letters
  // so Slovak diacritics count once.
  function normalizeProfileName(name) {
    const letters = Array.from(String(name ?? '').replace(/\s+/g, ' ').trim()).slice(0, PROFILE_NAME_MAX_LETTERS);
    if (letters.length) letters[0] = letters[0].toLocaleUpperCase('sk');
    return letters.join('').trim();
  }

  function defaultProfiles() {
    return { version: PROFILES_VERSION, activeId: null, profiles: [] };
  }

  function loadProfiles(storage, avatarKeys) {
    const saved = readJson(storage, STORAGE_KEYS.profiles);
    if (!saved || saved.version !== PROFILES_VERSION || !Array.isArray(saved.profiles)) return defaultProfiles();
    const knownAvatars = new Set(avatarKeys);
    const seenIds = new Set();
    const profiles = [];
    for (const profile of saved.profiles) {
      if (!profile || typeof profile.id !== 'string' || !profile.id || seenIds.has(profile.id)) continue;
      seenIds.add(profile.id);
      profiles.push({
        id: profile.id,
        name: normalizeProfileName(profile.name),
        avatar: knownAvatars.has(profile.avatar) ? profile.avatar : avatarKeys[0],
      });
    }
    const activeId = seenIds.has(saved.activeId) ? saved.activeId : (profiles[0]?.id ?? null);
    return { version: PROFILES_VERSION, activeId, profiles };
  }

  function saveProfiles(profiles, storage) {
    if (!storage) return profiles;
    try {
      storage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
    } catch (_error) {
      return profiles;
    }
    return profiles;
  }

  function activeProfile(profiles) {
    return profiles.profiles.find(profile => profile.id === profiles.activeId) || null;
  }

  function addProfile(profiles, { name, avatar }, now = Date.now()) {
    const base = `p${now.toString(36)}`;
    let id = base;
    for (let suffix = 2; profiles.profiles.some(profile => profile.id === id); suffix++) {
      id = `${base}${suffix}`;
    }
    return {
      ...profiles,
      activeId: id,
      profiles: [...profiles.profiles, { id, name: normalizeProfileName(name), avatar }],
    };
  }

  function updateProfile(profiles, id, { name, avatar }) {
    return {
      ...profiles,
      profiles: profiles.profiles.map(profile => (
        profile.id === id ? { ...profile, name: normalizeProfileName(name), avatar } : profile
      )),
    };
  }

  function selectProfile(profiles, id) {
    return profiles.profiles.some(profile => profile.id === id) ? { ...profiles, activeId: id } : profiles;
  }

  function removeProfile(profiles, id) {
    const remaining = profiles.profiles.filter(profile => profile.id !== id);
    const activeId = profiles.activeId === id ? (remaining[0]?.id ?? null) : profiles.activeId;
    return { ...profiles, activeId, profiles: remaining };
  }

  // The first profile inherits whatever was practiced before profiles existed.
  function adoptGuestData(storage, profileId) {
    if (!storage) return;
    try {
      for (const baseKey of PROFILE_DATA_KEYS) {
        const guestData = storage.getItem(baseKey);
        const profileKey = profileStorageKey(baseKey, profileId);
        if (guestData === null || storage.getItem(profileKey) !== null) continue;
        storage.setItem(profileKey, guestData);
        storage.removeItem(baseKey);
      }
    } catch (_error) {
      // A profile without its earlier practice is still usable.
    }
  }

  function removeProfileData(storage, profileId) {
    if (!storage || !profileId) return;
    try {
      PROFILE_DATA_KEYS.forEach(baseKey => storage.removeItem(profileStorageKey(baseKey, profileId)));
    } catch (_error) {
      // Leftover data for a removed profile is harmless.
    }
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
    MASTERY_MAX_LEVEL,
    masteryLevel,
    profileStorageKey,
    normalizeProfileName,
    loadProfiles,
    saveProfiles,
    activeProfile,
    addProfile,
    updateProfile,
    selectProfile,
    removeProfile,
    adoptGuestData,
    removeProfileData,
  };
});
