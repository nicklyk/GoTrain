# Feature backlog

New capability, not repairs — those live in `BACKLOG.md` on the `backlog`
branch. Edit freely: reorder, delete, add notes. Each item names why it earns
its place and how to tell it works, because a feature that cannot be checked
is a guess.

Two standing constraints, from `CLAUDE.md` in each repo: nothing may make a
network request, and nothing may run on a timer or in the background. Several
otherwise-obvious features are ruled out by those, deliberately.

## Planned

Nothing waiting. Add ideas here.

## Considered and not taken

- **Reminders / notifications** — both repos promise nothing runs on a timer.
  The bar icon going urgent is the only nudge the plugin is allowed to make.
- **Charts in the app** — the plugin's Progress tab already does this on a
  screen with room for it, and the phone's job is the set in front of you.
- **Cloud backup, account sync, sharing** — a network call breaks the headline
  promise. Export plus LocalSend is the supported path and it works.
- **Plate calculator** — genuinely useful, but needs a bar weight and a plate
  inventory per user, which is a settings surface bigger than the feature.
  Worth revisiting if asked for.

## Done

- F-1, F-2 · Last time and new best, on the exercise screen — GoTrain v31
- F-3 · Adjust the rest timer while it runs — GoTrain v32
- F-4 · Filter the exercise library — GoTrain v34
- F-5 · `gotrain today` — omarchy-gotrain 1.3.0
- F-6 · `gotrain export --csv` — omarchy-gotrain 1.4.0
