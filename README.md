# vybrane_slova
aplikacia na trenovanie vybranych slov

## Word lists

Reviewable word-card data lives in `data/words/`. Simple non-disambiguation
words are in plain per-letter word-list files under `simple/`; words that need context or
picture disambiguation are in `disambiguation.tsv`. The app defaults to a
172-card basic set, selected explicitly in `data/words/basic.json`. Each
letter has equal numbers of i/í and y/ý cards, with at most 20 of each.
The parent overview's **Výber slov** selector switches to the extended set
of 382 simple cards and 28 ready contrast cards. The hidden review URL
`?cards=ambiguous` limits the pool to the 28 ready contrast cards; the 2
review rows remain excluded. Run the validator after editing:

```sh
node tools/validate_words.js
```

## App preview

The static PWA lives in `web/` and can be served directly:

```sh
python3 -m http.server 8765 --directory web
```

- App: `http://localhost:8765/index.html`
- Tests: `http://localhost:8765/tests.html`
- Phone preview: `http://localhost:8765/preview.html`
- Word lists: `http://localhost:8765/words.html` (basic by default; choose
  **Rozšírené** for the complete list)

The chart icon beside the about button opens **Prehľad precvičovania**:
today and the previous seven days, results by letter, and words needing more
practice. Results and word-set choices stay in this browser on this device,
separately for each child profile.
Existing totals are preserved, but daily history starts with this version;
older totals cannot be reconstructed into individual days. Switching word
sets keeps progress and the selected letters.

The parent overview links to **Zoznam slov**, a separate page with both word
sets, letter and search filters, and the actual card sentences. Browsing
the lists does not change the practice settings or progress.

### Ambiguous-only review

Append `?cards=ambiguous` to the app URL to review only the ready
context-dependent cards. For example:

`http://localhost:8765/index.html?cards=ambiguous`

This is a hidden review mode: it omits the simple word lists and is not exposed
in the child-facing interface.

## Icons

Regenerate the committed PWA icons after changing the icon design:

```sh
python3 tools/build_icon.py
```

## Hosted preview

Build the deployable preview bundle when publishing with Sites:

```sh
python3 tools/build_preview_site.py
```

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
