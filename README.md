# vybrane_slova
aplikacia na trenovanie vybranych slov

## Word lists

Reviewable word-card data lives in `data/words/`. Simple non-disambiguation
words are in plain per-letter word-list files under `simple/`; words that need context or
picture disambiguation are in `disambiguation.tsv`. The app loads 388 simple
cards and 20 ready contrast cards by default. The hidden review URL
`?cards=ambiguous` limits the pool to the 20 ready contrast cards; the 2
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

## Hosted preview

Build the deployable preview bundle when publishing with Sites:

```sh
python3 tools/build_preview_site.py
```

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
