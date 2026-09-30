# Backlog

Updated 2026-09-30 (evening) by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-12 · GoTrain · Escape the innerHTML sites B-9 missed — an imported handler still runs**
   Why: B-9 left several interpolations raw, and a crafted import file still runs script in a page that promises no network requests. Reproduced in headless Chromium: a phase name `<img src=x onerror=window.__q=1>` loaded via `applyImport` and rendered by `startWithPlan` sets `__q`. Raw sites in index.html: `${phase.name}` (~1609, phase card), `nextPhase.name` (~2060, next banner), `<option>${ph.name}` (~2432, ~2687), `${metaStr(ex)}` (~1681, ~2654 — kg/reps/seat; escaped at 2068/2437 but not here), `planVal` (~1782, adjust modal), `${entry.plan}` (~3093, history detail), history meta `ex.reps`/`ex.kg` (~3098), and `entryTime`/`entryDate` falling back to imported `e.time`/`e.date` (~3075, ~3092). The existing test uses `<b>` there and only counts `img`, so it missed them. Out of scope: ids inside `onclick="…('${id}')"` can also be broken out of — a separate night.
   Verify: extend `test_user_text_cannot_inject_markup` with `<img>` payloads in phase name, kg, reps, history plan name and time; walk workout, adjust, plan editor, customize and history; assert 0 `img` elements. Each assertion fails with its `escHtml` reverted.
   Size: medium

2. **B-13 · omarchy-gotrain · A malformed export crashes `import`/`sync` and leaves an orphan snapshot**
   Why: `read_state_bytes` (bin/gotrain ~580) catches `ValueError/JSONDecodeError/OSError` but not `EOFError`/`zlib.error`, so a truncated gzip (an interrupted LocalSend transfer) gives a traceback. A dict/list in `plan`, `date`, an exercise `name` etc. raises `sqlite3.ProgrammingError` *after* `snap_path.write_bytes(raw)` (~437), so the rolled-back import leaves a file in `snapshots/` no row points to — one more per retry — and aborts `sync --all`, which is meant to skip bad files (~981). Reproduced: `gzip -c tests/fixtures/baseline.json | head -c 200 > t.json; gotrain import t.json` → EOFError traceback; export with `history[0].plan={"x":1}` → ProgrammingError, 1 snapshot file, 0 `snapshots` rows.
   Verify: new test: both files give exit 1, a one-line `gotrain: …` error, no "Traceback", empty `snapshots/`; with one bad and one good file, `sync --all` still imports the good one.
   Size: small

3. **B-14 · omarchy-gotrain · A config file that doesn't parse, or isn't an object, is wiped or blanks the bar**
   Why: two failures in the same place. (a) `config set` (~1137) on a config.json with a syntax error writes back only the one key: reproduced with `{"staleDays":5,"port":9000,}` then `config set pairTimeout 600` → file is `{"pairTimeout": 600}`, hand-edited settings gone. The panel's Settings tab uses this path, so one click does it silently. (b) Valid JSON that isn't an object (`null`, `[1]`, `42`) makes `cfg.update(...)` (~214) raise `TypeError` in every command, `status --json` included, so the widget is blank — reproduced with `null`. B-11 covered wrong-type values, not a wrong-type file.
   Verify: new test: `null`/`[1]`/`"x"`/`42` give `status --json` rc 0 with defaults and one warning; `config set` over an unparseable file exits non-zero and leaves the file byte-identical (or keeps a `.bak` with the original bytes — pick one).
   Size: small

4. **B-15 · GoTrain · A new library exercise gets a 0-second rest, or the last-edited exercise's values**
   Why: `openAddGex` (index.html ~2595) clears fields with `.value=''`, but `gex-pause`/`gex-dur` are buttons, and `durFieldSet` is never called. On a fresh session `saveGex` stores `pauseSecs: NaN`; picking it into a plan, `durFieldSet('mce-pause', NaN)` treats NaN as set and saves `pauseSecs: 0` — no rest timer, for good. After editing an exercise with 3:00 rest / 1:30 duration, "+ new exercise" shows and silently saves 180/90. Reproduced in headless Chromium.
   Verify: browser test: `openEditGex` (pause 180) → `openAddGex` → save gives `pauseSecs===null`, `durationSecs===300`; fresh page → `openAddGex` → save → `pickGex` → `savePlanEx` gives a plan exercise with `pauseSecs===null`. Also make `durFieldValue` return null for NaN.
   Size: small

5. **B-16 · GoTrain · An import that passes validation can leave the app unable to start**
   Why: `applyImport` (~2836) checks only `Array.isArray(plans)` and the `activePlanId` key. Reproduced: `{"activePlanId":"a","plans":[{"id":"a","name":"X"}]}` is accepted and saved; after reload `#workout-content` is empty (`renderWorkoutHome` throws on `plan.exercises.length`) and Settings throws too. `history: null` is accepted and the History tab then throws. The only way out is "Delete all data", which destroys the history that survived. `tp4_state` is the only copy.
   Verify: browser test: `applyImport` of each malformed shape (plan without `phases`/`exercises` arrays, `history` not an array) throws `invalid` and leaves `state` and stored `tp4_state` byte-identical; a valid export still imports. Reject, don't repair.
   Size: small

6. **B-17 · GoTrain · "Last time" shows a session where the exercise wasn't done**
   Why: `lastSessionFor` (~1835) returns any history row, even `setsCompleted:0, done:false`, and `renderLastTime` (~1885) falls back via `row.setsCompleted||row.sets`, so zero sets reads as "3×8". `isPersonalBest` (~1855) counts those rows too, hiding a real new best. Reproduced: 20 Sep (80 kg, 0 sets, not done) and 10 Sep (57,5 kg, 3 sets, done); Bench at 60 kg shows "Last time 80 kg · 3×8 · 20 Sep" and no New best (expected 57,5 kg, 10 Sep, ★). Starting and immediately finishing a workout makes "Last time … today" appear with the plan's numbers.
   Verify: browser test with that two-entry fixture asserts date, kg and the ★; a row with 0 sets done is never shown.
   Size: small

7. **B-18 · omarchy-gotrain · `sync` and the panel's "N waiting" count still disagree**
   Why: B-8 made `pending` count only un-imported files, but `sync` without `--all` still imports only `found[:1]` (~974), the newest file, even when it is already imported or unreadable. Reproduced: an older un-imported export plus a newer already-imported one → `sync` says "already imported, nothing to do", panel keeps `pending 1` forever. Add a newest `{"broken` file → `pending 2`, `sync` exits 1 "nothing could be imported". Invalid JSON is counted although the docstring says unreadable files aren't. Keep B-4's concern in mind (an older export must not restore an older library): the simplest fix is making `pending` report what `sync` would do.
   Verify: new test with that two-file scenario: after `sync`, `pending` is 0 or equals what `sync` would import next; a broken newest file is not counted and does not block a valid one.
   Size: small

8. **B-19 · GoTrain · Deleting the active plan mid-workout leaves the workout running**
   Why: `deletePlanById`/`deletePlanModal` (~2811) don't end the workout. Reproduced: start p1, tick set 1, delete p1 → the rest overlay keeps counting for an exercise that no longer exists, `workoutMode` stays `'active'` so the other plan renders as the running workout, the wake lock is held, and `state.progress['p1']` stays in storage and every export.
   Verify: browser test: after that delete, overlay inactive, `workoutMode==='home'`, `'p1' in state.progress` false, wake lock released (stubbed); deleting a non-active plan leaves the running workout alone.
   Size: small

9. **B-20 · GoTrain · Reset leaves the timers key, so a rest overlay appears over the fresh app**
   Why: "Delete all data" (~3022) removes `tp4_state` but not `tp4_timers`. Reproduced: with a rest running, reset → the empty, plan-less app comes back with the rest overlay counting. Same area: `newWorkout` (~3013) calls `clearAllTimers()` but not `onWorkoutEnded()`, so the wake lock is never released (reproduced: 1 request, 0 releases) — fold that one-liner in.
   Verify: browser test: reset with a rest running → no `tp4_timers` in localStorage, overlay inactive after reload; `newWorkout` releases the lock (stubbed).
   Size: small

10. **B-21 · omarchy-gotrain · `progress NAME` misses non-ASCII names and blames the archive**
    Why: SQLite `lower()` (~666) folds ASCII only, so with "Überkopfdrücken" archived, `progress "überkopfdrücken"` and `"ÜBERKOPFDRÜCKEN"` miss, as does a trailing space; each miss says "no load data yet -- import a workout that has one", which is wrong with a full archive. German exercise names are the common case for this app. Reproduced.
    Verify: new test with an umlaut name: all case variants return the series; an unknown name says "no exercise named X" (optionally with `difflib` close matches).
    Size: small

## Candidates that did not make the ten

Reproduced, but smaller: `createPlan` (~2777) switches the active plan mid-workout and leaves `#newPlanName`/`#newPhaseName` filled; finishing a workout with nothing done still writes a history entry (`finishWorkout` ~1642 lacks `newWorkout`'s `hasProgress` guard — owner's call whether that's wanted); `stats` prints first/last dates in UTC (bin/gotrain ~1333, a B-6 leftover); `status` prints "None days ago" for undated workouts (~1045); `export --csv -o` miscounts rows when a name contains a newline, and `durationSecs: true` exports as a number (~1406, ~1385); piping `list`/`stats`/`export` to `head` prints a `BrokenPipeError` traceback; plan ids interpolated into `onclick="…('${id}')"` can be broken out of from an import (needs its own design). Read in code only: `BarWidget.qml:36` may leave `%25`/`%23` in the CLI path, and `Panel.qml:248` quotes path and argument as one string; README lists `origin` as a config key but `load_config` always overwrites it; `doctor` shows the total pending count on every watch-folder row and assumes a /24; `import a b` stops at the first bad file after committing the earlier ones; German confirms spelled `zuruecksetzen`/`loeschen` (index.html ~854-855).

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
