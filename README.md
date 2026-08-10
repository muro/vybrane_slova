# vybrane_slova
aplikacia na trenovanie vybranych slov

## Word lists

Reviewable word-card data lives in `data/words/`. Simple non-disambiguation
words are in plain per-letter word-list files under `simple/`; words that need context or
picture disambiguation are in `disambiguation.tsv`. The current starter
contrast pack has 20 ready cards across 10 pairs, plus 2 review cards. Run the
validator after editing:

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
