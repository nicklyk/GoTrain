# Backlog

Updated 2026-10-02 by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-16 · GoTrain · An import that passes validation can leave the app unable to start**
   Why: `applyImport` (~2836) checks only `Array.isArray(plans)` and the `activePlanId` key. Reproduced: `{"activePlanId":"a","plans":[{"id":"a","name":"X"}]}` is accepted and saved; after reload `#workout-content` is empty (`renderWorkoutHome` throws on `plan.exercises.length`) and Settings throws too. `history: null` is accepted and the History tab then throws. The only way out is "Delete all data", which destroys the history that survived. `tp4_state` is the only copy.
   Verify: browser test: `applyImport` of each malformed shape (plan without `phases`/`exercises` arrays, `history` not an array) throws `invalid` and leaves `state` and stored `tp4_state` byte-identical; a valid export still imports. Reject, don't repair.
   Size: small

2. **B-14 · omarchy-gotrain · A config file that doesn't parse, or isn't an object, is wiped or blanks the bar**
   Why: two failures in the same place. (a) `config set` (~1137) on a config.json with a syntax error writes back only the one key: reproduced with `{"staleDays":5,"port":9000,}` then `config set pairTimeout 600` → file is `{"pairTimeout": 600}`, hand-edited settings gone. The panel's Settings tab uses this path, so one click does it silently. (b) Valid JSON that isn't an object (`null`, `[1]`, `42`) makes `cfg.update(...)` (~214) raise `TypeError` in every command, `status --json` included, so the widget is blank — reproduced with `null`. B-11 covered wrong-type values, not a wrong-type file.
   Verify: new test: `null`/`[1]`/`"x"`/`42` give `status --json` rc 0 with defaults and one warning; `config set` over an unparseable file exits non-zero and leaves the file byte-identical (or keeps a `.bak` with the original bytes — pick one).
   Size: small

3. **B-15 · GoTrain · A new library exercise gets a 0-second rest, or the last-edited exercise's values**
   Why: `openAddGex` (index.html ~2595) clears fields with `.value=''`, but `gex-pause`/`gex-dur` are buttons, and `durFieldSet` is never called. On a fresh session `saveGex` stores `pauseSecs: NaN`; picking it into a plan, `durFieldSet('mce-pause', NaN)` treats NaN as set and saves `pauseSecs: 0` — no rest timer, for good. After editing an exercise with 3:00 rest / 1:30 duration, "+ new exercise" shows and silently saves 180/90. Reproduced in headless Chromium.
   Verify: browser test: `openEditGex` (pause 180) → `openAddGex` → save gives `pauseSecs===null`, `durationSecs===300`; fresh page → `openAddGex` → save → `pickGex` → `savePlanEx` gives a plan exercise with `pauseSecs===null`. Also make `durFieldValue` return null for NaN.
   Size: small

4. **B-17 · GoTrain · "Last time" shows a session where the exercise wasn't done**
   Why: `lastSessionFor` (~1835) returns any history row, even `setsCompleted:0, done:false`, and `renderLastTime` (~1885) falls back via `row.setsCompleted||row.sets`, so zero sets reads as "3×8". `isPersonalBest` (~1855) counts those rows too, hiding a real new best. Reproduced: 20 Sep (80 kg, 0 sets, not done) and 10 Sep (57,5 kg, 3 sets, done); Bench at 60 kg shows "Last time 80 kg · 3×8 · 20 Sep" and no New best (expected 57,5 kg, 10 Sep, ★). Starting and immediately finishing a workout makes "Last time … today" appear with the plan's numbers.
   Verify: browser test with that two-entry fixture asserts date, kg and the ★; a row with 0 sets done is never shown.
   Size: small

5. **B-18 · omarchy-gotrain · `sync` and the panel's "N waiting" count still disagree**
   Why: B-8 made `pending` count only un-imported files, but `sync` without `--all` still imports only `found[:1]` (~974), the newest file, even when it is already imported or unreadable. Reproduced: an older un-imported export plus a newer already-imported one → `sync` says "already imported, nothing to do", panel keeps `pending 1` forever. Add a newest `{"broken` file → `pending 2`, `sync` exits 1 "nothing could be imported". Invalid JSON is counted although the docstring says unreadable files aren't. Keep B-4's concern in mind (an older export must not restore an older library): the simplest fix is making `pending` report what `sync` would do.
   Verify: new test with that two-file scenario: after `sync`, `pending` is 0 or equals what `sync` would import next; a broken newest file is not counted and does not block a valid one.
   Size: small

6. **B-19 · GoTrain · Deleting the active plan mid-workout leaves the workout running**
   Why: `deletePlanById`/`deletePlanModal` (~2811) don't end the workout. Reproduced: start p1, tick set 1, delete p1 → the rest overlay keeps counting for an exercise that no longer exists, `workoutMode` stays `'active'` so the other plan renders as the running workout, the wake lock is held, and `state.progress['p1']` stays in storage and every export.
   Verify: browser test: after that delete, overlay inactive, `workoutMode==='home'`, `'p1' in state.progress` false, wake lock released (stubbed); deleting a non-active plan leaves the running workout alone.
   Size: small

7. **B-20 · GoTrain · Reset leaves the timers key, so a rest overlay appears over the fresh app**
   Why: "Delete all data" (~3022) removes `tp4_state` but not `tp4_timers`. Reproduced: with a rest running, reset → the empty, plan-less app comes back with the rest overlay counting. Same area: `newWorkout` (~3013) calls `clearAllTimers()` but not `onWorkoutEnded()`, so the wake lock is never released (reproduced: 1 request, 0 releases) — fold that one-liner in.
   Verify: browser test: reset with a rest running → no `tp4_timers` in localStorage, overlay inactive after reload; `newWorkout` releases the lock (stubbed).
   Size: small

8. **B-21 · omarchy-gotrain · `progress NAME` misses non-ASCII names and blames the archive**
   Why: SQLite `lower()` (~666) folds ASCII only, so with "Überkopfdrücken" archived, `progress "überkopfdrücken"` and `"ÜBERKOPFDRÜCKEN"` miss, as does a trailing space; each miss says "no load data yet -- import a workout that has one", which is wrong with a full archive. German exercise names are the common case for this app. Reproduced.
   Verify: new test with an umlaut name: all case variants return the series; an unknown name says "no exercise named X" (optionally with `difflib` close matches).
   Size: small

9. **B-22 · GoTrain · Creating a plan mid-workout hijacks the running workout**
   Why: `createPlan` (index.html ~2777) sets `state.activePlanId` to the new plan unconditionally, while `workoutMode` stays `'active'`. Reproduced in headless Chromium: `startWithPlan(p1)` → Plans → "+ new plan" → `activePlanId` is the new empty plan and the workout screen shows it as the running workout; finishing then writes a history entry for the empty plan, and p1's ticked sets sit in `state.progress` unseen. The modal also leaves `#newPlanName` filled for the next plan (reproduced: still "New"). Same family as B-19, but a separate code path.
   Verify: browser test: start p1, tick a set, create a plan → `activePlanId===p1`, p1's progress intact, `#newPlanName` empty; with no workout running, a new plan still becomes active as today.
   Size: small

10. **B-23 · omarchy-gotrain · Piping `list`, `stats` or `export` into `head` ends in a traceback**
    Why: nothing handles `BrokenPipeError`, so the ordinary `gotrain list | head` prints a Python traceback and exits 1. Reproduced with a 3000-workout demo archive: `list`, `export` and `stats` each end in `BrokenPipeError: [Errno 32] Broken pipe` with a traceback; `export --csv` happens to exit cleanly. On a small archive it is a race (`stats | head -3` hit it once on the 3-workout fixture, not the next time), so scripts see it as an occasional, confusing failure.
    Verify: new test runs each command against a large generated archive into a reader that closes after one line: no "Traceback" or "Exception ignored" on stderr. The usual fix catches `BrokenPipeError` in `main` and points stdout at `os.devnull` before exiting, so the interpreter's final flush doesn't raise again. Don't install `SIG_DFL` for SIGPIPE around anything that writes the archive.
    Size: small

## Candidates that did not make the ten

Reproduced, but smaller: finishing a workout with nothing done still writes a history entry (`finishWorkout` ~1642 lacks `newWorkout`'s `hasProgress` guard — owner's call whether that's wanted); `stats` prints first/last dates in UTC (bin/gotrain ~1333, a B-6 leftover); `status` prints "None days ago" for undated workouts (~1045); `export --csv -o` miscounts rows when a name contains a newline, and `durationSecs: true` exports as a number (~1406, ~1385); plan ids interpolated into `onclick="…('${id}')"` can be broken out of from an import (needs its own design). Read in code only: `BarWidget.qml:36` may leave `%25`/`%23` in the CLI path, and `Panel.qml:248` quotes path and argument as one string; README lists `origin` as a config key but `load_config` always overwrites it; `doctor` shows the total pending count on every watch-folder row and assumes a /24; `import a b` stops at the first bad file after committing the earlier ones; German confirms spelled `zuruecksetzen`/`loeschen` (index.html ~854-855).

## In progress
- B-12 · Escape the innerHTML sites B-9 missed — open PR https://github.com/nicklyk/GoTrain/pull/3
- B-13 · A malformed export crashes `import`/`sync` and leaves an orphan snapshot — open PR https://github.com/nicklyk/omarchy-gotrain/pull/3

## Owner notes

## Done
- B-1 · Ask before an import replaces your history — https://github.com/nicklyk/GoTrain/pull/2
- B-2 · An export with an empty plan library must not wipe the archived one — https://github.com/nicklyk/omarchy-gotrain/pull/2
- B-3 · Text containing `"` is truncated the next time it is edited — GoTrain cc7c55e (v26)
- B-4 · `sync --all` leaves the oldest export's plan library in place — omarchy-gotrain 7c8a2bd (1.2.3)
- B-5 · Repair durations and muscles left stale by the old import bug — GoTrain 5daf0e9 (v28)
- B-6 · Bucket days and weeks in local time, not UTC — omarchy-gotrain 3ac92b9 (1.2.4)
- B-7 · Deleting an exercise leaves its progress behind — GoTrain 60f7ea4 (v29)
- B-8 · "Exports waiting" banner never clears — omarchy-gotrain 8c26089 (1.2.5)
- B-9 · Escape user text before it goes into `innerHTML` — GoTrain a317d7d (v27); gaps remain, see B-12
- B-10 · "Adjust for today" un-marks an exercise completed by hand — GoTrain caf847e (v30)
- B-11 · A hand-edited config value of the wrong type blanks the bar — omarchy-gotrain 072d3db (1.2.6)

## Not wanted
