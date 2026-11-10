# Word List Format

Word lists use two source shapes:

- `simple/*.txt`: simple per-letter word lists for words that do not need
  disambiguation, including both selected-word `y/ý` rows and `i/í` controls.
- `disambiguation.tsv`: rich pair list for words where both spellings/forms
  exist and the child needs a sentence or picture to choose correctly.

For broad selected-word coverage, start with basic dictionary forms only.
Declined noun/adjective forms and conjugated verb forms should be added later
as a separate expansion pack, not mixed into the first full base-form list.

The current starter contrast pack is in `disambiguation.tsv`: 28 `ready` cards
across 14 pairs, balanced as 14 `i/í` answers and 14 `y/ý` answers. The
`by` / `bi` pair is also in `disambiguation.tsv` with `review` status.

The current ordinary simple-list data is split across the per-letter files in
`simple/`: 382 cards, with 179 `y/ý` selected-word rows and 203 `i/í` control
rows. They are available in the extended set alongside the 28 ready contrast cards. The
app has a hidden `?cards=ambiguous` review mode that loads only those 28 ready
contrast cards while picture and context work is revisited; `review` rows stay
excluded in both modes.

## Basic membership

`basic.json` selects existing cards by consonant, answer group, and exact
surface. It does not duplicate sentences or other card metadata. The app
loads these 172 cards by default, reusing their original IDs and context:
B 15+15, M 15+15, P 9+9, R 20+20, S 10+10, V 12+12, Z 5+5 (i+y).
The extended set retains all existing words. Both sets exclude review and
candidate contrast rows.

The sizes and y/ý choices were guided by the basic lists at
[Vieme po slovensky](https://www.viemeposlovensky.sk/book/cvicenia-vybrane-slova)
and the broader list at
[Pravopisne.sk](https://www.pravopisne.sk/vybrane-slova-b-l-m-p-r-s-v-z/).
This is a familiar school-practice subset, not a measured frequency ranking
or a claim to cover every school's full list. Prefer common, concrete i/í
controls. Keep uncommon words and additional derivatives in the extended set.

The validator rejects unknown or unready references, duplicates, missing
letters or answer groups, more than 20 cards per answer group per consonant,
and fewer i/í controls than y/ý cards. It also checks the shipped basic,
simple, and contrast data copies against their sources.

## Parent review and child suitability

The live word browser is `web/words.html`, linked near the top of the parent
overview. It reads the same basic membership and full word data as practice,
groups words by consonant and i/í or y/ý, shows their actual sentences, and
marks basic entries when browsing the extended set. Search ignores accents.
It includes only the enabled cards; the two review-only rows remain excluded.

On 2026-11-10, all 410 active surfaces, their available sentence clues, and
the 30 contrast rows' sentence and picture-prompt metadata were reviewed for
ages 7–10. No profanity, sexual content, or graphic depictions were found.
This is an editorial review, not an automatic safety certification.

The parent explicitly chose to retain all vocabulary after discussing the
strongest candidates for omission: `trýzniť` (torment), `brýzgať` (insult),
`bitka`, `bitkár`, `bitkárka` (fighting), `strieľať` (shoot), and `víno`,
`vínny` (wine). These are ordinary dictionary words rather than forbidden
words. Their inclusion does not license violent, shaming, or alcohol-promoting
sentences or pictures. The `biť` contrast already uses a beating heart, and
`dobiť` uses charging a battery. Some other extended entries are uncommon or
abstract; familiarity and spelling review remain separate from safety.

## `simple/*.txt`

Use these files for words that do not need sentence or picture
disambiguation. Use one file per selected-letter group:

- `simple/b.txt`
- `simple/m.txt`
- `simple/p.txt`
- `simple/r.txt`
- `simple/s.txt`
- `simple/v.txt`
- `simple/z.txt`

Inside each file, put words under `[i]` or `[y]` sections. Each word or short
phrase goes on its own line:

```text
[i]
bicykel
biely
robiť

[y]
aby
keby
býk
```

An explicitly needed clue for an otherwise unpaired word may follow a
` | ` delimiter, for example `ryť | Krtko ryje v zemi.`. This is the narrow
exception; use `disambiguation.tsv` when a word has a real spelling contrast
or needs any other per-row metadata.

Blank lines and lines starting with `#` are ignored by the validator. Except
for that narrow clue form, use the rich `disambiguation.tsv` format whenever a
word needs a sentence, picture, status, source, note, contrast pair, or other
per-row metadata.

## `disambiguation.tsv`

Use this file only for contrast pairs and ambiguous forms:

```tsv
id	pack	pair_id	selected_letter	surface	answer_group	contrast_surface	needs_disambiguation	disambiguation_mode	picture_role	sentence	image_prompt	source	status	notes
```

Columns:

- `id`: Unique stable ID across all word files.
- `pack`: Pack used for balance checks, such as `starter-picture` or
  `starter-context`.
- `pair_id`: Shared ID for contrast forms, such as `vyr-vir`.
- `selected_letter`: One of `b`, `m`, `p`, `r`, `s`, `v`, or `z`.
- `surface`: Exact word or form shown in the sentence.
- `answer_group`: `i` or `y`, matching the side pile.
- `contrast_surface`: The paired contrast form.
- `needs_disambiguation`: Always `true` in this file.
- `disambiguation_mode`: `picture`, `sentence`, or `both`.
- `picture_role`: `both_sides`, `this_side_only`, `contrast_side_only`, or
  `none`.
- `sentence`: Short Slovak sentence or fragment. Use `{target}` where the app
  should insert or highlight `surface`.
- `image_prompt`: Optional picture prompt. Required when
  `disambiguation_mode` is `picture` or `both`, or when `picture_role` is not
  `none`.
- `source`: Review source URL or note.
- `status`: `ready`, `review`, `candidate`, or `excluded`.
- `notes`: Short reviewer note.

Run the validator after changing these files:

```sh
node tools/validate_words.js
```

The validator checks required columns, allowed tag values, duplicate IDs,
broken pair references, ready-pack answer balance, `{target}` placement,
picture metadata, whether ready pairs include both answer groups, whether
simple-list words also appear in the disambiguation file, duplicate simple
surfaces, per-letter simple-list balance, and whether each simple row contains
the expected `i/í` or `y/ý` after its file letter. It expects the simple lists
to use sectioned word files under `simple/`, with at most an optional short
clue after ` | `. It also checks that
`web/data/disambiguation.tsv` matches `data/words/disambiguation.tsv`, because
the PWA ships from `web/`.
