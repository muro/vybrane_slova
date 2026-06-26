# Word List Format

Word lists are split by selected-letter group so they stay small and easy to
review:

- `b.tsv`
- `m.tsv`
- `p.tsv`
- `r.tsv`
- `s.tsv`
- `v.tsv`
- `z.tsv`

For broad selected-word coverage, start with basic dictionary forms only.
Declined noun/adjective forms and conjugated verb forms should be added later
as a separate expansion pack, not mixed into the first full base-form list.

The current files cover all 196 Slovak selected-word entries from the reference
list as basic forms. Rows in the `base-selected` pack are marked `candidate`
until they get age-appropriate sentences, controls, pictures where useful, and
review status.

Every file must use the same tab-separated header:

```tsv
id	pack	pair_id	selected_letter	surface	answer_group	contrast_surface	needs_disambiguation	disambiguation_mode	picture_role	sentence	image_prompt	source	status	notes
```

## Columns

- `id`: Unique card ID across all files.
- `pack`: Pack used for balance checks, such as `starter-picture` or
  `starter-context`.
- `pair_id`: Shared ID for contrast forms, such as `vyr-vir`.
- `selected_letter`: One of `b`, `m`, `p`, `r`, `s`, `v`, `z`; must match the
  filename.
- `surface`: Exact word or form shown in the sentence. For broad selected-word
  coverage this should be the basic dictionary form; starter contrast cards may
  use a specific surface form when the contrast itself depends on that form.
- `answer_group`: `i` or `y`, matching the side pile.
- `contrast_surface`: The paired contrast form.
- `needs_disambiguation`: `true` when both spellings/forms exist and context
  decides which one is correct.
- `disambiguation_mode`: `picture`, `sentence`, `both`, or `none`.
- `picture_role`: `both_sides`, `this_side_only`, `contrast_side_only`, or
  `none`.
- `sentence`: Short Slovak sentence or fragment. Use `{target}` where the app
  should insert or highlight `surface`.
- `image_prompt`: Optional picture prompt for picture-friendly rows.
- `source`: Review source URL or note.
- `status`: `ready`, `review`, `candidate`, or `excluded`.
- `notes`: Short reviewer note.

Run the validator after changing these files:

```sh
node tools/validate_words.js
```
