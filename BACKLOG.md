# Backlog

Updated 2026-10-27 by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-38 · omarchy-gotrain · A workout finished with nothing done silences the bar's "time to train" nudge**
   Why: `compute_status` (~867) takes the newest workout as the last session whatever it holds, so an entry with 0 exercises and 0 sets done (what the phone's Finish writes when tapped by mistake, or on an empty start) resets `daysSince` to 0 and clears `stale`. The urgent bar icon is the only nudge the plugin is allowed to make, and one stray tap switches it off for `staleDays`. Reproduced tonight (TZ=Europe/Berlin, `staleDays` 3): last real workout 9 days ago plus an empty one now → `status --json` says `daysSince: 0, stale: false, weekCount: 1`, and `today` prints "Test Plan at 01:10 (0/3 exercises, 0 sets)" and exits 0, so `gotrain today && ...` reads as trained. Count a workout as a session only when it has a done exercise or a ticked set (`done_exercises > 0 OR total_sets > 0`) in `compute_status` (last, `daysSince`, `weekCount`) and `cmd_today`; `list`/`show` still show the entry. Read time only, nothing in the archive changes. Whether the phone should write such an entry at all stays the owner's call (see the candidates below).
   Verify: new test with that fixture: `status --json` reports the 9-day-old workout as `lastTs`, `daysSince` 9 and `stale: true`, `weekCount` 0; `today` exits 1 and says "not yet today"; a session with 1 set ticked still counts; an archive holding only empty sessions behaves like one with none for staleness and doesn't crash.
   Size: small


2. **B-37 · GoTrain · Finishing the last exercise in the list never points back at one you skipped**
   Why: `findNextExercise` (~2243) only searches *after* the current exercise in display order (`ordered.slice(currentIdx+1)`), so once you finish the last-listed exercise there is no "Next exercise" banner even when an earlier one is still open. Reproduced tonight in headless Chromium (DEMO, v38): skip Bench, complete Row (the last exercise) → `isDone` is false for Bench, true for Row, and `#next-ex-slot` is empty; the control (finish Bench → banner names Row) works. Going out of order is ordinary in a gym when a machine is taken, and that is exactly when the reminder is missing. Wrap around: search after the current exercise first, then from the start of the list; still return `null` when everything is done.
   Verify: browser test with those steps: completing Row shows a banner naming Bench, and tapping it opens Bench; finishing Bench first still points at Row; with every exercise done no banner appears. Applies to all three callers (`completeSet`, `completeTimeEx`, `markExDone`) through the one function.
   Size: small


3. **B-39 · omarchy-gotrain · `stats` and the panel's muscle sets drop every set of an exercise that wasn't finished**
   Why: both sum `sets_completed` only `WHERE done = 1` (`cmd_panel` ~1408, `cmd_stats` ~1542, and "most frequent exercises" ~1552), so the 2 sets you ticked on a 3-set exercise you then cut short count as zero. Reproduced tonight (1.4.4, `TZ=Europe/Berlin`): one workout with Bench 2/3 sets ticked (`done: false`) and Row 3/3 → `stats` "by muscle group" lists only Back 3, `panel --json` `muscles` is `[{Back, 3}]`, while `progress Bench` counts the same row as a session at 60 kg (B-32's `row_was_done`). The commands now disagree about the same workout, and the panel's 8-week muscle balance under-reports exactly the sessions that ran short. Sum `sets_completed` over every row (a skipped row holds 0 anyway) and count "most frequent" through `row_was_done`, as `progress`/`records` already do, which also brings in the legacy rows B-32's notes said were left out there. Read time only, nothing in the archive changes.
   Verify: new test with that fixture: `stats` shows Chest 2 and Back 3, `panel --json` `muscles` holds both, "most frequent" lists Bench; a fully skipped row (`setsCompleted: 0, done: false`) still adds nothing and isn't counted as frequent.
   Size: small


4. **B-21 · omarchy-gotrain · `progress NAME` misses non-ASCII names and blames the archive**
   Why: the name match uses SQLite `lower()` (~784), which folds ASCII only, so `progress überkopfdrücken` misses "Überkopfdrücken" — the owner's German exercise names are exactly where this bites. Any miss, a plain typo included ("Bench Pres", reproduced), says "no load data yet -- import a workout that has one", which is wrong with a full archive.
   Verify: new test: `progress überkopfdrücken` finds "Überkopfdrücken" (match with Python `casefold()` instead of SQL `lower()`); a name with no match says no exercise by that name was found, and suggests the closest names (`difflib`, stdlib) rather than blaming the archive. B-32 (merged in 1.4.3) now filters `load_series` through `row_was_done`; keep that.
   Size: small


5. **B-23 · omarchy-gotrain · Piping `list`, `stats` or `export` into `head` ends in a traceback**
   Why: closing stdout early raises `BrokenPipeError` out of `main`, so `gotrain list | head` and `gotrain export | head -c 100` print a Python traceback (reproduced on a 3000-workout archive). Ordinary shell use, and the traceback reads like archive damage.
   Verify: new test pipes `list`, `stats` and `export` into a reader that closes after one line: exit status is not a traceback, stderr has no `Traceback`. Catch it in `main` and point stdout at `os.devnull`; no `SIG_DFL` around archive writes, so an interrupted import still rolls back.
   Size: small


6. **B-30 · GoTrain · Deleting a phase leaves the plan editor's phase count stale**
   Why: `deletePhase` (~2585) re-renders the phase list but not `pd-meta`, so the editor's header keeps the old phase count ("3 Phases · 7 Exercises" after deleting one), while adding a phase does update it. Small, but it makes the editor look as if the delete did not take. The item's other half, an exercise row naming its old phase after `changeExPhase`, went away in v42 (PR #17): the row's phase dropdown and `changeExPhase` were removed, and a phase is now changed in the exercise editor, whose save (`savePlanEx` ~2993) re-renders the rows and `pd-meta`.
   Verify: browser test: DEMO plus a second phase, delete one → `pd-meta` shows one phase fewer, the phase list and the exercise rows agree, and an exercise that was in the deleted phase now reads as having no phase.
   Size: small

7. **B-33 · GoTrain · An export made after midnight is named for the day before**
   Why: `exportFilename` (~3132) takes the date from `toISOString()`, which is UTC. In Germany that is every export between 00:00 and 01:00 (winter) or 02:00 (summer): reproduced with `TZ=Europe/Berlin` at 00:30 CEST on 16 Oct → `gotrain-2026-10-15.json`. The file then looks like yesterday's backup next to the real one. The history entry's own `date` is already local (`saveHistory` ~3396); only the filename disagrees. Build the date from `getFullYear/getMonth/getDate`.
   Verify: browser test with Chromium started under `TZ=Europe/Berlin` (or with `Date` stubbed to 2026-10-16T00:30+02:00): the name is `gotrain-2026-10-16.json`; a midday export is unchanged.
   Size: small


8. **B-34 · omarchy-gotrain · `stats` prints its first/last dates in UTC, so it disagrees with `list`**
   Why: `cmd_stats` (~1526) prints `span['a'][:10]`, the first ten characters of the stored text, which for app workouts is the UTC date. B-6 moved every other day to local time, so the commands now contradict each other. Reproduced tonight with `TZ=Europe/Berlin` and two workouts at 00:30 and 00:40 local (`ts` 22:30Z/22:40Z the day before): `list` shows 2026-10-02 and 2026-10-16, `stats` says "first / last : 2026-10-01 .. 2026-10-15". Every late-evening-into-midnight session is off by one. Use `local_date()` as `today` and `list` already do; a row whose `ts` cannot be parsed keeps today's fallback.
   Verify: new test with that fixture under `TZ=Europe/Berlin`: `stats` prints `2026-10-02 .. 2026-10-16`, matching `list`; a midday workout's date is unchanged; a legacy `+02:00` timestamp gives its own local date.
   Size: small

9. **B-40 · omarchy-gotrain · `list -n 0` says "no workouts yet" and `list -n -1` lists everything**
   Why: `cmd_list` (~1432) and `cmd_panel` (~1397) pass `-n` straight into SQLite's `LIMIT ?`, where 0 means no rows and a negative number means no limit. Reproduced tonight (1.4.4, archive with 4 workouts): `list -n 0` prints "no workouts yet" and exits 0, which reads as an empty archive; `list -n -1` prints all 4; `panel -n -1` returns all 4 as `recent`. Harmless with a small archive, but "no workouts yet" over a full one is exactly the false alarm about the user's only copy that the archive rules care about, and on a 3000-workout archive `-n -1` dumps everything into the panel's JSON. Reject `-n` below 1 at argument parsing (an argparse `type` that requires a positive int, shared by `list` and `panel`) so the error names the option and exits 2, the way argparse already does for `-n abc`.
   Verify: new test: `list -n 0` and `list -n -1` exit non-zero with a message naming `-n` and print no workout lines; `panel -n 0` likewise; `list -n 1` prints one line and the default still prints up to 15; an empty archive still says "no workouts yet".
   Size: small

10. **B-41 · GoTrain · Set counts already out of range stay broken, and an import can still bring new ones**
   Why: follow-up from PR #16 (B-36, v41). `parseSetCount` (~2884) now keeps a *typed* count in 1..20, but a plan or library exercise that already holds `sets: -2` keeps it until someone happens to edit and save it again: the exercise still opens with no set rows to tick. The reviewer confirmed this in the real app. An import is the other way in: `importLooksSound` (~3168) does not look at `sets`, so a backup made before v41, or a hand-edited file, brings a negative or oversized count straight back. One normalisation fixes both. Clamp `sets` on `plans[].exercises` and `globalExercises` using `parseSetCount`'s rules (1..20, missing/0/non-numbers → 3). For a `sets` in a progress override, follow `saveAdjust` instead: below 1 means no override, so drop it and let the plan's count apply, and cap it at 20. Run it with the other migrations at load (~1293) and in `applyImport` after `migrateStale` (~3212), and save when it changed anything. Leave `history` alone: it is the record of what was done, and changing it is the owner's call.
   Verify: browser test. A stored state with a plan exercise at -2 and a library exercise at 25 loads as 1 and 20; an override of 0 is dropped and one of 30 becomes 20; all of it is saved that way, and the exercise opens with one set row. Importing a file with the same values gives the same result. A History entry with `sets: -2` is unchanged. A state that is already in range is not re-saved.
   Size: small

11. **B-42 · GoTrain · "Adjust for today" accepts any set count above 20**
   Why: follow-up from PR #16 (B-36, v41). `saveAdjust` (~1922) refuses a count below 1 but has no upper limit, so 25, or 500, is saved for today and renders that many set rows. Both editors now stop at 20 (`parseSetCount`), and their fields say `max="20"`, so the three places that take a set count disagree. Cap the adjust path at 20 too, and keep its existing "below 1 is ignored" behaviour. It differs from the editors on purpose: an empty adjust field means "no change", not 3.
   Verify: browser test. With a workout running, adjust Bench to 25 → the override holds 20 and the exercise shows 20 rows; 4 still saves as 4; 0 and empty still leave the plan's count; ticked sets above the new count are clamped as B-25 already does.
   Size: small

12. **B-43 · omarchy-gotrain · Show how long each workout took, now that the phone records it**
   Why: since GoTrain v42 (PR #17) every finished workout carries `startTs`, when its first set was ticked, beside `ts` (Finish), and the app's History shows the span. The archive already keeps it, since `ingest` stores each workout's full JSON in `workouts.json`, but nothing reads it: `list`, `show`, the panel's recent list and `export --csv` show no duration. Read it at query time from `json`, so there is no schema migration: minutes from `startTs` to `ts`, only when both parse and the span is positive and under 24 hours, the same rule as the app's `entryMinutes`. Older workouts have no `startTs` and show nothing, not 0.
   Verify: new test: a workout with `startTs` 50 minutes before `ts` shows "50 min" in `list` and `show`, the panel JSON carries a duration of 50 for it, and the CSV has a new last column with 50 (existing columns keep their order, so a sheet built on the old CSV still lines up). One without `startTs`, or with a span over a day, shows no duration and an empty CSV cell.
   Size: small

## Candidates that did not make the ten

Reproduced, but smaller: finishing a workout with nothing done still writes a history entry (`finishWorkout` ~1665 lacks `newWorkout`'s `hasProgress` guard — owner's call); `export --csv -o` miscounts rows when a name contains a newline, and `durationSecs: true` exports as a number. Read in code only: `BarWidget.qml:36` may leave `%25`/`%23` in the CLI path, and `Panel.qml:248` quotes path and argument as one string; README lists `origin` as a config key but `load_config` always overwrites it; `doctor` shows the total pending count on every watch-folder row and assumes a /24; `import a b` stops at the first bad file after committing the earlier ones; a 0:00 duration becomes 5:00 through `||300`; the phone's `syncPayload` (index.html ~3065) still compares `ts>sinceTs` as text, now safe because B-24 always sends a `Z` cursor (parsing both with `Date.parse` would be belt and braces). From PR #7's notes: an "Adjust for today" override outranks a later plan edit of the set count; lowering the count to what is ticked marks the exercise done without the next-exercise banner; switching an exercise from reps to timed keeps its old `completedSets`. From PR #8's notes: progress an older build already left behind in a non-active plan through B-28's bug still opens ticked; only the paused plan is ended. From PR #9's notes: deleting the running plan discards its session rather than saving it to History, and the delete confirm doesn't mention a running workout. From PR #10's notes: a plan created mid-workout gives no sign that it did not become active. Read in code only: `switchPlan` (index.html ~1542) has no caller left and could go; From omarchy PR #6's notes (B-32): `stats` and the panel's muscle sets still filter `done = 1`, so they drop the legacy rows that `records`/`progress` now count. Reproduced tonight: `stats | head` still ends in a traceback (B-23). From omarchy PR #7's notes (B-18): an export that passes the shape check but fails inside the merge (an object in a text field) still counts as pending, and `sync` exits 1 on it instead of falling back to an older file; once #7 lands, an older un-imported export behind a newer imported one gets no nag at all (only `sync --all` reaches it, which B-35 / omarchy PR #8 now handles). From PR #12's notes (B-27): the delete confirm doesn't say that a restore from `gotrain export` brings the entry back. From omarchy PR #8's notes (B-35): if the newer, imported export is deleted from the folder, `sync --all` still lets the older one write its library (fixing it needs the export time stored per snapshot). From PR #13's notes (B-26): a finished countdown now stays FINISHED for that exercise until the workout ends or ↺; deleting an exercise mid-workout leaves its countdown record in `tp4_timers` until then (harmless). Read in code only: two German confirms are still spelled `zuruecksetzen`/`loeschen`. From PR #14's notes (B-29): when the set count drops below the set a rest leads to, the line is hidden but the rest keeps running. Reproduced tonight: a partly done exercise's sets are left out of `stats`/panel muscles (now B-39). From PR #15's notes (B-31): tapping the Workout nav tab mid-workout lands on the home screen with its resume banner rather than the running workout; the capture handler (~1514) does this on purpose ("always goes to home"), so it stays the owner's call. Reproduced tonight: `list -n 0` / `-n -1` (now B-40). From PR #17 (v42): the weight stepper's step is a fixed 2.5 kg, coarse for dumbbells and fine for some machines; a per-exercise step needs a field in both editors (owner's call). A workout resumed the next day starts more than 24 hours before Finish, so History shows no duration for it rather than a wrong one. The two German confirms spelled `zuruecksetzen`/`loeschen` are now at index.html ~890-891.

## Owner notes

- 2026-10-28: B-41 and B-42 are the follow-ups from PR #16 (B-36), added at the owner's request. Keep them on the list.
- 2026-10-28: v42 (PR #17) redesigned the home, exercise, rest, History and Settings screens. Line references were refreshed against v42 at the owner's request; B-30 was narrowed to what is left of it, and B-43 added because the phone now records each workout's start.

## Done
- B-1 · Ask before an import replaces your history — https://github.com/nicklyk/GoTrain/pull/2
- B-2 · An export with an empty plan library must not wipe the archived one — https://github.com/nicklyk/omarchy-gotrain/pull/2
- B-3 · Text containing `"` is truncated the next time it is edited — GoTrain cc7c55e (v26)
- B-4 · `sync --all` leaves the oldest export's plan library in place — omarchy-gotrain 7c8a2bd (1.2.3)
- B-5 · Repair durations and muscles left stale by the old import bug — GoTrain 5daf0e9 (v28)
- B-6 · Bucket days and weeks in local time, not UTC — omarchy-gotrain 3ac92b9 (1.2.4)
- B-7 · Deleting an exercise leaves its progress behind — GoTrain 60f7ea4 (v29)
- B-8 · "Exports waiting" banner never clears — omarchy-gotrain 8c26089 (1.2.5)
- B-9 · Escape user text before it goes into `innerHTML` — GoTrain a317d7d (v27); finished by B-12
- B-10 · "Adjust for today" un-marks an exercise completed by hand — GoTrain caf847e (v30)
- B-11 · A hand-edited config value of the wrong type blanks the bar — omarchy-gotrain 072d3db (1.2.6)
- B-12 · Escape the innerHTML sites B-9 missed — https://github.com/nicklyk/GoTrain/pull/3 (v36)
- B-13 · A malformed export crashes `import`/`sync` and leaves an orphan snapshot — https://github.com/nicklyk/omarchy-gotrain/pull/3 (1.4.1)
- B-16 · An import that passes validation can leave the app unable to start — https://github.com/nicklyk/GoTrain/pull/4 (v36, with the id check f25bf0a that closed the `onclick` id injection)
- B-14 · A broken config is wiped by `config set` and blanks the bar — https://github.com/nicklyk/omarchy-gotrain/pull/4 (1.4.2)
- B-15 · A new library exercise gets a 0-second rest, or the last-edited exercise's values — https://github.com/nicklyk/GoTrain/pull/5 (v37)
- B-17 · "Last time" shows a session where the exercise wasn't done — https://github.com/nicklyk/GoTrain/pull/6 (v37)
- B-24 · "Latest workout" and the sync cursor are picked by sorting timestamp text — https://github.com/nicklyk/omarchy-gotrain/pull/5 (1.4.2)
- B-25 · Changing an exercise's sets mid-workout leaves its progress wrong — https://github.com/nicklyk/GoTrain/pull/7 (v37)
- B-28 · "Start new workout" hides a paused workout instead of ending it — https://github.com/nicklyk/GoTrain/pull/8 (v38)
- B-19 · Deleting the running plan leaves the workout running — https://github.com/nicklyk/GoTrain/pull/9 (v38)
- B-22 · Creating a plan mid-workout takes over the workout — https://github.com/nicklyk/GoTrain/pull/10 (v38)
- B-20 · Reset leaves the timers key, so a rest overlay appears over the fresh app — https://github.com/nicklyk/GoTrain/pull/11 (v38)
- B-29 · The rest overlay forgets which set it is resting for — https://github.com/nicklyk/GoTrain/pull/14 (v39)
- B-26 · Each timed exercise keeps its own countdown — https://github.com/nicklyk/GoTrain/pull/13 (v40)
- B-27 · Delete a single history entry — https://github.com/nicklyk/GoTrain/pull/12 (v40)
- B-32 · Skipped exercises are not sessions in progress/records/PRs — https://github.com/nicklyk/omarchy-gotrain/pull/6 (1.4.3)
- B-18 · `pending` reports what a plain sync would import — https://github.com/nicklyk/omarchy-gotrain/pull/7 (1.4.4)
- B-35 · `sync --all` keeps the newest export's plan library — https://github.com/nicklyk/omarchy-gotrain/pull/8 (1.4.4)
- B-31 · Switching language on Settings writes the workout header there — https://github.com/nicklyk/GoTrain/pull/15 (v41)
- B-36 · A typed negative set count is saved — https://github.com/nicklyk/GoTrain/pull/16 (v41)

## Not wanted
