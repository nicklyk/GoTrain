# GoTrain

A workout tracker that is one static `index.html`, with `sw.js` and
`manifest.json` beside it. No backend, no build step, no dependencies. It is
served by GitHub Pages at https://niclick.org/GoTrain and is meant to be
self-hostable by copying the files.

## Constraints that are the product, not preferences

- **No third-party requests, ever.** No CDN, no analytics, no hosted API, no
  remote fonts. The fonts are in `fonts/`. The README's headline claim is that
  training data never leaves the device; a single external request breaks it.
- **No build step.** The repo *is* the deployable artifact. Nothing that
  requires compiling, bundling or a package manager. That rules out
  TypeScript-as-source, frameworks and npm dependencies.
- **Free software only**, GPL-3.0-or-later. Anything vendored in must be
  GPLv3-compatible and carry its licence. LibreJS `@license` markers are kept
  intact.
- **Data lives in one `localStorage` key, `tp4_state`.** It is the user's only
  copy. Schema migrations run in place and are one-way, so they must be
  idempotent and must never lose a field.

## Before you finish any change

Run the suite. It must pass:

```bash
tests/run
```

Static checks need only python3; the behavioural ones use headless Chromium and
skip loudly if none is present. A skip is not a pass — say so if it happens.

## Shipping a change

Three markers move together, or the app lies about which build is running:

| | where |
|---|---|
| `APP_VERSION` | `index.html` |
| `APP_BUILD` | `index.html` — the date it actually ships, checked, not copied |
| `CACHE_NAME` | `sw.js` |

Without the `CACHE_NAME` bump the phone keeps serving the cached page and never
sees the other two. `tests/run` fails if version and cache disagree.

## Conventions

- Both `T.de` and `T.en` define exactly the same keys. No duplicates — a key
  written twice silently loses its first value. No orphans. `tests/run` checks
  all three.
- English is the default language and the fallback for a missing string.
- Commit subjects are prefixed `claude: ` so they are distinguishable from the
  owner's own commits.
- Comments explain *why*, especially where the reason is a platform quirk that
  will otherwise look like a mistake later. There are several: iOS freezing
  timers, `overscroll-behavior` being ignored on the document, `-webkit-overflow-
  scrolling` breaking sticky.

## Never

- Never push to `main`. Work on a branch and open a draft PR; merging is the
  owner's decision.
- Never add a runtime network call, of any kind, to any host.
- Never commit anything derived from the owner's real training data. Fixtures
  and screenshots use a neutral demo archive.
