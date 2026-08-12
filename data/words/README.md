# Word List Format

Word lists use two source shapes:

- `simple/*.txt`: simple per-letter word lists for words that do not need
  disambiguation, including both selected-word `y/ý` rows and `i/í` controls.
- `disambiguation.tsv`: rich pair list for words where both spellings/forms
  exist and the child needs a sentence or picture to choose correctly.

For broad selected-word coverage, start with basic dictionary forms only.
Declined noun/adjective forms and conjugated verb forms should be added later
as a separate expansion pack, not mixed into the first full base-form list.

The current starter contrast pack is in `disambiguation.tsv`: 20 `ready` cards
across 10 pairs, balanced as 10 `i/í` answers and 10 `y/ý` answers. The
`by` / `bi` pair is also in `disambiguation.tsv` with `review` status.

The current ordinary simple-list data is split across the per-letter files in
`simple/`: 388 cards, with 188 `y/ý` selected-word rows and 200 `i/í` control
rows. They are loaded by default alongside the 20 ready contrast cards. The
app has a hidden `?cards=ambiguous` review mode that loads only those 20 ready
contrast cards while picture and context work is revisited; `review` rows stay
excluded in both modes.

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

Blank lines and lines starting with `#` are ignored by the validator. Use the
rich `disambiguation.tsv` format instead of these plain lists whenever a word
needs a sentence, picture, status, source, note, contrast pair, or other
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
to use sectioned word-only files under `simple/`. It also checks that
`web/data/disambiguation.tsv` matches `data/words/disambiguation.tsv`, because
the PWA ships from `web/`.
