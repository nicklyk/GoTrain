# Feature backlog

New capability, not repairs — those live in `BACKLOG.md` on the `backlog`
branch. Edit freely: reorder, delete, add notes. Each item names why it earns
its place and how to tell it works, because a feature that cannot be checked
is a guess.

Two standing constraints, from `CLAUDE.md` in each repo: nothing may make a
network request, and nothing may run on a timer or in the background. Several
otherwise-obvious features are ruled out by those, deliberately.

## Planned

1. **F-1 · GoTrain · Show what you lifted last time, on the exercise screen**
   Why: the single thing a training log is for. Every session already records
   `kg`, `reps` and `setsCompleted` per exercise, so the data is sitting in
   `state.history` and nothing reads it back. Without it you have to leave the
   workout, open History, and find the last session that contained this
   exercise — mid-set, on a phone.
   Shape: a line above the set rows — `Last time · 60 kg · 3×8 · 12 Sep` —
   from the most recent finished session containing that exercise. Nothing
   when there is no previous session.
   Verify: browser test with two past sessions; the newer one's numbers show,
   a first-ever exercise shows nothing.
   Size: medium

2. **F-2 · GoTrain · Mark a personal best as it happens**
   Why: F-1 makes the comparison possible but leaves the reader to do it. The
   plugin already computes records for the desktop panel; the phone, which is
   where you actually are when it happens, says nothing.
   Shape: a small badge on the exercise detail when today's weight is above
   every previous session's for that exercise. Weight only — reps and time are
   not comparable across set counts.
   Verify: browser test: heavier than before shows it, equal does not, lighter
   does not, and a first-ever session does not.
   Size: small

3. **F-3 · GoTrain · Change the rest timer while it is running**
   Why: 75 seconds is right until the set that wasn't. The only options today
   are wait it out or skip it entirely and lose the count.
   Shape: −30s and +30s on the rest overlay. The timers are deadline-based
   since v19, so this is moving the deadline, and it stays correct across a
   locked screen.
   Verify: browser test with the clock stubbed: +30 and −30 move the remaining
   time, the floor is zero, and the result still survives a simulated lock.
   Size: small

4. **F-4 · GoTrain · Filter the exercise library**
   Why: the library is a flat list and grows without bound; finding one entry
   means scrolling past every other. Nothing else in the app has this problem.
   Shape: a filter box above the list, matching name and muscle, case- and
   accent-insensitively so `ruck` finds `Rücken`.
   Verify: browser test: typing narrows the list, an accentless query matches
   an accented name, clearing restores everything.
   Size: small

5. **F-5 · omarchy-gotrain · `gotrain today`**
   Why: `status` answers "when did I last train", which is the wrong question
   on a day you already have. The archive knows, and a one-line answer is what
   a shell prompt or a scratch script can use.
   Shape: one line — what was done today, or how long since the last session.
   `--json` for scripts, and exit 1 when nothing was done today so `&&` works.
   Verify: new tests: a session dated today, one dated yesterday, an empty
   archive, and the local-day boundary from B-6.
   Size: small

6. **F-6 · omarchy-gotrain · `gotrain export --csv`**
   Why: the archive is the only place the full dated series lives, and JSON is
   the wrong shape for the obvious next thing someone does with it — open it
   in a spreadsheet and draw a graph.
   Shape: one row per exercise per session: date, plan, exercise, muscle,
   type, sets, reps, kg, duration, done. Written to stdout or `-o`.
   Verify: new tests: the header, one row per exercise per session, quoting of
   a value containing a comma or a quote, and that it stays importable-adjacent
   by matching the JSON export's row count.
   Size: small

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
