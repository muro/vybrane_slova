(function initAvatars(root, factory) {
  const avatars = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = avatars;
  }
  root.VybraneSlovaAvatars = avatars;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAvatars() {
  // Each avatar is a 16x16 pixel head. In `rows`, '.' is transparent and every
  // other character names a colour from that avatar's palette. Keys are stored
  // in profiles, so renaming one requires a migration.
  const AVATARS = [
    {
      key: 'elephant',
      label: 'slon',
      background: '#dce5f0',
      palette: { o: '#3c4250', g: '#9aa6b8', d: '#7d889c', p: '#f0a8b6', w: '#fffaf0', k: '#1d1f26' },
      rows: [
        '................',
        '....oooooooo....',
        '.oooggggggggooo.',
        'oddpoggggggopddo',
        'odppoggggggoppdo',
        'odppogkggkgoppdo',
        'odppoggggggoppdo',
        'oddpoggggggopddo',
        '.oddoggggggoddo.',
        '..oooggggggooo..',
        '...owoggggowo...',
        '....woggggow....',
        '......oggo......',
        '......oggo......',
        '......oooo......',
        '................',
      ],
    },
    {
      key: 'gorilla',
      label: 'gorila',
      background: '#e6dccb',
      palette: { o: '#231f1f', f: '#4a4444', F: '#665d5c', c: '#8c7a6e', C: '#6b5a50', m: '#a8968a', k: '#151111' },
      rows: [
        '................',
        '.....oooooo.....',
        '...ooFFFFFFoo...',
        '..oFffffffffFo..',
        '.offffffffffffo.',
        '.offCCCCCCCCffo.',
        'offccckcckcccffo',
        'occfccccccccfcco',
        'occfmmmmmmmmfcco',
        'offmmmmmmmmmmffo',
        'offmmmkmmkmmmffo',
        'offmmmmmmmmmmffo',
        '.ofmmkkkkkkmmfo.',
        '.offmmmmmmmmffo.',
        '..ooffffffffoo..',
        '....oooooooo....',
      ],
    },
    {
      key: 'peacock',
      label: 'páv',
      background: '#d6eee4',
      palette: { G: '#1f6b48', g: '#36a26c', e: '#e9b949', E: '#2456a8', b: '#2f74d0', B: '#1d4b8f', w: '#ffffff', k: '#111827', y: '#d6b480', o: '#163a63' },
      rows: [
        '....GGGGGGGG....',
        '..GGgBgBBgBgGG..',
        '.GGeggkkkkggeGG.',
        'GgeEegbbbbgeEegG',
        'GggegbbbbbbgeggG',
        'GggggbwbbwbggggG',
        'GgeggbkbbkbggegG',
        'GeEegbwyywbgeEeG',
        '.GeggbbbbbbggeG.',
        '.GGgggbbbbgggGG.',
        '..GGggbbbbggGG..',
        '...GGgbbbbgGG...',
        '.....GbbbbG.....',
        '......bBBb......',
        '......bBBb......',
        '......bBBb......',
      ],
    },
    {
      key: 'flamingo',
      label: 'plameniak',
      background: '#fde0e6',
      palette: { o: '#7a2e45', p: '#f48fab', P: '#e06688', w: '#fff7f2', k: '#1f1418', y: '#f3e3cc' },
      rows: [
        '................',
        '.........oooo...',
        '........oppppo..',
        '.......oppppppo.',
        '.....oooppkpppo.',
        '...ooyyyyppppPo.',
        '..okkyyyyoopPo..',
        '.okkoooooppPo...',
        '.oko....oppPo...',
        '..o.....oppPo...',
        '.......oppPo....',
        '......oppPo.....',
        '......oppPo.....',
        '.......oppPo....',
        '........oppPo...',
        '........oppPo...',
      ],
    },
    {
      key: 'lion',
      label: 'lev',
      background: '#fbe6bf',
      palette: { M: '#8f4a1e', m: '#c2702e', y: '#ecb64e', w: '#fbe7c0', n: '#5c3022', k: '#2a1a12', o: '#6e3818' },
      rows: [
        '...MMMMMMMMMM...',
        '.MMmmmmmmmmmmMM.',
        '.MmmmymmmmymmmM.',
        'MmmmyyyyyyyymmmM',
        'MmmyyyyyyyyyymmM',
        'MmmyykyyyykyymmM',
        'MmmyyyyyyyyyymmM',
        'MmmyywwwwwwyymmM',
        'MmmyywnnnnwyymmM',
        'MmmyywwnnwwyymmM',
        '.MmmywwwwwwymmM.',
        '.MmmmyyyyyymmmM.',
        '..MmmmmmmmmmmM..',
        '...MMmmmmmmMM...',
        '.....MMMMMM.....',
        '................',
      ],
    },
    {
      key: 'panda',
      label: 'panda',
      background: '#dfeccf',
      palette: { o: '#3b3b3b', w: '#fbfaf6', s: '#e4e1d8', k: '#232323', e: '#ffffff' },
      rows: [
        '................',
        '.kkk........kkk.',
        'kkkkooooooookkkk',
        'kkowwwwwwwwwwokk',
        '.owwwwwwwwwwwwo.',
        'owwwwwwwwwwwwwwo',
        'owwwkkkwwkkkwwwo',
        'owwkkekwwkekkwwo',
        'owwkkkwwwwkkkwwo',
        'owwwwwkkkkwwwwwo',
        'owwwwwwkkwwwwwwo',
        'oswwwwwwwwwwwwso',
        '.oswwwwwwwwwwso.',
        '..ooswwwwwwsoo..',
        '....oooooooo....',
        '................',
      ],
    },
    {
      key: 'fox',
      label: 'líška',
      background: '#fde1cc',
      palette: { o: '#5a2a12', r: '#e8782c', R: '#c75f1c', w: '#fff6ea', k: '#21140e', d: '#7a3a18' },
      rows: [
        '................',
        '.o............o.',
        '.oo..........oo.',
        '.odo........odo.',
        '.oddo......oddo.',
        '.oRdroooooordRo.',
        'orrrrrrrrrrrrrro',
        'orrrrrrrrrrrrrro',
        'orrrrkrrrrkrrrro',
        'owrrrrrrrrrrrrwo',
        'owwwrrrrrrrrwwwo',
        '.owwwwrrrrwwwwo.',
        '..owwwwwwwwwwo..',
        '...owwwwwwwwo...',
        '....owwkkwwo....',
        '.....oooooo.....',
      ],
    },
    {
      key: 'owl',
      label: 'výr',
      background: '#efe2cf',
      palette: { o: '#3b2416', b: '#8a5a33', B: '#6b4224', l: '#d8aa72', O: '#f2a428', k: '#1a120c', y: '#5b5048' },
      rows: [
        '................',
        '.o............o.',
        '.bo..........ob.',
        '.bbo........obb.',
        '.bbboooooooobbb.',
        'obbbbbbbbbbbbbbo',
        'oblllllbblllllbo',
        'olOOOllllllOOOlo',
        'olOkOllllllOkOlo',
        'olOOOllyyllOOOlo',
        'oblllllyylllllbo',
        'obbbbbbbbbbbbbbo',
        'obBbbBbbbbBbbBbo',
        '.obbbbbbbbbbbbo.',
        '..oBbbBbbBbbBo..',
        '...oooooooooo...',
      ],
    },
    {
      key: 'frog',
      label: 'žaba',
      background: '#dcf1d2',
      palette: { o: '#24501f', g: '#5cb84a', G: '#3f9133', w: '#ffffff', k: '#111111', p: '#f4a3a3', m: '#1f3f1b' },
      rows: [
        '................',
        '................',
        '..oooo....oooo..',
        '.owwwwo..owwwwo.',
        '.owwkko..okkwwo.',
        '.owwkkooookkwwo.',
        '.ogwwggggggwwgo.',
        'oggggggggggggggo',
        'oggggggggggggggo',
        'ogpggggggggggpgo',
        'ogmggggggggggmgo',
        'ogGmmmmmmmmmmGgo',
        '.ogGggggggggGgo.',
        '..ooGGGGGGGGoo..',
        '....oooooooo....',
        '................',
      ],
    },
    {
      key: 'penguin',
      label: 'tučniak',
      background: '#d6e9f5',
      palette: { o: '#151a24', k: '#2d3446', w: '#ffffff', W: '#e3e9f2', y: '#f29b30', Y: '#d07a18', e: '#111111' },
      rows: [
        '................',
        '....oooooooo....',
        '..ookkkkkkkkoo..',
        '.okkkkkkkkkkkko.',
        '.okkkkkkkkkkkko.',
        'okkwwkkkkkkwwkko',
        'okwwwwkkkkwwwwko',
        'okwwewwkkwwewwko',
        'okwwwwwyywwwwwko',
        'okwwwwwyywwwwwko',
        'okWwwwwYYwwwwWko',
        '.okWwwwwwwwwWko.',
        '.okWwwwwwwwwWko.',
        '..okWWwwwwWWko..',
        '...ookkkkkkoo...',
        '.....oooooo.....',
      ],
    },
  ];

  // Shown in the top bar before anyone has made a profile. Not selectable.
  const GUEST = {
    key: 'guest',
    label: 'hosť',
    background: 'rgba(255, 253, 246, 0.6)',
    palette: { o: '#b3a894' },
    rows: [
      '................',
      '................',
      '......oooo......',
      '.....oooooo.....',
      '.....oooooo.....',
      '.....oooooo.....',
      '.....oooooo.....',
      '......oooo......',
      '................',
      '....oooooooo....',
      '...oooooooooo...',
      '...oooooooooo...',
      '...oooooooooo...',
      '...oooooooooo...',
      '................',
      '................',
    ],
  };

  function avatarByKey(key) {
    return AVATARS.find(avatar => avatar.key === key) || null;
  }

  // Horizontal runs of one colour become a single rect, keeping the markup small.
  function avatarSvg(avatar) {
    const rects = [];
    avatar.rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const char = row[x];
        const start = x;
        while (x < row.length && row[x] === char) x++;
        if (char !== '.') {
          rects.push(`<rect x="${start}" y="${y}" width="${x - start}" height="1" fill="${avatar.palette[char]}"/>`);
        }
      }
    });
    return `<svg class="pixel-avatar" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects.join('')}</svg>`;
  }

  return {
    AVATARS,
    AVATAR_KEYS: AVATARS.map(avatar => avatar.key),
    GUEST,
    avatarByKey,
    avatarSvg,
  };
});
