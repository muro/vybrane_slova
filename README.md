# vybrane_slova
aplikacia na trenovanie vybranych slov

## Word lists

Reviewable word-card data lives in `data/words/`. Simple selected words are in
`selected.tsv`; words that need context or picture disambiguation are in
`disambiguation.tsv`. The current starter contrast pack has 20 ready cards
across 10 pairs, plus 2 review cards. Run the validator after editing:

```sh
node tools/validate_words.js
```
