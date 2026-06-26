# AGENTS.md

This is the canonical guidance for coding agents working in this repository.
Tool-specific entrypoints such as `CLAUDE.md` and `GEMINI.md` should import
this file and add only tool-specific details.

## Project

`Vybrané slová` is planned as a kid-friendly, installable PWA for children
around ages 7-10 practicing Slovak selected words by choosing between `i/í`
and `y/ý`.

The current product and architecture plan is [plan.html](plan.html). Read it
before non-trivial work. The intended runtime shape is the same static PWA
model as `~/develop/clockwork`: app files under `web/`, deployable directly to
a website, installable, offline-capable, and with no build step unless the user
explicitly asks for one.

## Core UX rules

- The main interaction is a three-pile sorting game: full word-card pile in the
  middle, `i/í` answer pile on the left, and `y/ý` answer pile on the right.
- Cards move from the middle pile to one of the side piles.
- Tap is the primary input. Drag/flick gestures are allowed as a convenience,
  but the side piles must always be visible and tappable.
- Keep the language as sorting, moving, choosing, practicing, and answering.
  Do not use dating-app framing such as "swipe left", "swipe right", "like",
  "reject", "match", or "nope".
- Design for children ages 7-10 and nearby parents/teachers: clear
  affordances, readable Slovak text, large tap targets, gentle feedback, no
  hidden-only controls.
- Keep instructional text short and concrete. Prefer showing the task through
  layout, animation, and examples over long explanations.
- Feedback should be encouraging and corrective without shame, pressure, or
  streak-loss drama.

## Content rules

- Prefer contrast pairs where both spellings are real Slovak words or forms,
  such as `výr` / `vír`, `syr` / `síra`, `ryža` / `ríša`, `my` / `mi`, and
  `milý` / `mýli`.
- Skip unpaired selected words in the first version unless the user explicitly
  asks for memorization drills.
- Skip uncommon or fringe contrasts such as `pýtať sa` / `pita`; first-pack
  words should be familiar to children ages 7-10 or easy to explain with a
  simple sentence or picture.
- For broad selected-word coverage, start with basic dictionary forms only.
  Do not add generated declensions, cases, plural forms, or conjugated verb
  forms until the base list is reviewed and the app flow is working.
- Mark cards as `picture` or `context`. Picture cards should have a strong
  visual contrast; context cards rely mainly on the sentence.
- Treat `syr` / `síra` as picture-friendly: show `kus syra` for `syr`, and a
  match, yellow sulfur rock, or simple atom/molecule drawing for `síra`.
- Store ordinary selected words in `data/words/selected.tsv` with a compact
  simple-list format. Do not force non-disambiguation words to carry sentence,
  picture, pair, or answer metadata.
- Store words that need disambiguation because both spellings/forms exist in
  `data/words/disambiguation.tsv`, with one row per surface form and explicit
  `id`, `pack`, `pair_id`, `selected_letter`, `surface`, `answer_group`,
  `contrast_surface`, `needs_disambiguation`, `disambiguation_mode`,
  `picture_role`, `sentence`, `image_prompt`, `source`, `status`, and `notes`.
  Use `disambiguation_mode` values such as `picture`, `sentence`, or `both`.
- Use `picture_role` to show whether a picture works for `both_sides`,
  `this_side_only`, `contrast_side_only`, or `none`. It is OK when only one
  word from a pair has a good picture; the other side can rely on a sentence
  fragment.
- Track answer distribution per pack. Do not let packs become mostly
  selected-word `y/ý` drills; include at least as many `i/í` cards as `y/ý`
  cards, and prefer extra `i/í` controls when adding unpaired drill content.
- Add declined and conjugated forms later as a separate expansion pack with
  its own review pass and validator coverage.
- Keep word-list definition as its own task. It owns TSV rows, sources,
  review status, simple selected words, `i/í` controls, disambiguation tags,
  picture prompts, sentence fragments, and validator behavior.
- Keep app-building as a separate task. It owns the PWA shell, data loader,
  engine, three-pile UI, animation, scoring, persistence, tests, preview,
  manifest, service worker, and icons.
- Do not hide content decisions in app code. If a card needs a better sentence,
  picture, source, or review status, change the TSV data and validator.
- The app must ignore unreviewed `candidate` rows by default and consume only
  intentionally enabled packs/statuses.

## Working principles

- Think before acting. Read the surrounding files and `plan.html` before
  changing code.
- Prefer focused edits over rewriting whole files.
- Keep solutions simple and direct. Do not add infrastructure, dependencies,
  build tools, or frameworks without a clear need.
- If something is uncertain, say so rather than guessing.
- After editing, check whether the code is simpler or merely different. Remove
  dead branches, redundant state, and unnecessary special cases introduced by
  the change.
- User instructions override this file.

## Architecture to preserve

- **One folder to ship.** Put runtime app files in `web/` and keep that folder
  directly deployable to the website.
- **No build step by default.** Prefer plain static files. If React is used,
  follow Clockwork's local-vendor pattern rather than CDN runtime fetches.
- **Pure engine.** Put word data, answer checking, lesson generation, scoring,
  mastery, and localStorage helpers in `web/engine.js`. Keep UI and animation
  in `web/index.html`.
- **Lessons are data.** Model lessons with stable string keys. Stored progress
  should survive lesson reordering; renaming keys requires a migration.
- **Versioned storage.** Use namespaced keys such as
  `vybrane-slova.progress.v1`, `vybrane-slova.settings.v1`, and
  `vybrane-slova.lesson`.
- **Installable PWA shell.** Use relative manifest paths, committed icons, a
  small service worker that precaches the app shell, and a cache name that is
  bumped when cached assets change.
- **Dev-only preview.** A phone-frame `web/preview.html` is useful for visual
  checks, but it must not be part of the shipped app UI.

## Run / develop / test

Until `web/` exists, `plan.html` can be opened directly in a browser.

Once the PWA skeleton exists, use the Clockwork-style local server:

```sh
python3 -m http.server 8765 --directory web
```

Expected URLs:

- App: `http://localhost:8765/index.html`
- Tests: `http://localhost:8765/tests.html`
- Preview: `http://localhost:8765/preview.html`

Use in-browser tests in `web/tests.html` for engine behavior. Keep the test
page self-contained and easy to automate, with a visible summary in the DOM or
document title.

For UI changes, run the app in a browser and verify the actual interaction or
layout that changed, especially on a phone-sized viewport.

## Testing rules

- Use red-green-refactor for behavior changes when practical: add a failing
  `web/tests.html` assertion first, make it pass with the smallest change, then
  refactor.
- Engine changes should be covered by tests for word data, accepted answers,
  lesson selection, scoring thresholds, localStorage migration, and reset.
- UI animation changes should be manually verified in browser. Prefer adding
  a small deterministic test seam when behavior is important and testable
  without the DOM.

## Review stance

For reviews of local diffs, existing code, or PRs:

- Lead with findings. Prioritize bugs, behavior regressions, missing tests,
  confusing abstractions, and violations of the UX or PWA rules above.
- Cite specific files and lines.
- Do not request abstraction, deduplication, or cleanup unless it reduces real
  complexity or prevents a likely bug.
- If there are no findings, say so clearly and mention any remaining
  verification gaps.

## Documentation

- Keep [plan.html](plan.html) updated when product, UX, curriculum, PWA, or
  architecture decisions change.
- If a separate roadmap is added later, keep current work there and keep
  `plan.html` focused on durable product and architecture decisions.
- Document rejected UX directions when they are likely to come up again.

## Style

- Match the existing file style.
- Keep comments for intent, invariants, non-obvious tradeoffs, and abstraction
  boundaries, not line-by-line mechanics.
- Slovak UI/content should use proper diacritics. Code identifiers and storage
  keys should stay simple ASCII.
- Ensure source files end with a single newline.
