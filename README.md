# vybrane_slova
aplikacia na trenovanie vybranych slov

## Word lists

Reviewable word-card data lives in `data/words/`, split by selected-letter
group. The files currently cover all 196 base selected-word entries as
reviewable candidates, plus the balanced starter contrast pack. Run the
validator after editing:

```sh
node tools/validate_words.js
```
