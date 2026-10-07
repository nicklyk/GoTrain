# Backlog

Updated 2026-10-07 by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-15 · GoTrain · A new library exercise gets a 0-second rest, or the last-edited exercise's values**
   Why: `openAddGex` (index.html ~2595) clears fields with `.value=''`, but `gex-pause`/`gex-dur` are buttons, and `durFieldSet` is never called. On a fresh session `saveGex` stores `pauseSecs: NaN`; picking it into a plan, `durFieldSet('mce-pause', NaN)` treats NaN as set and saves `pauseSecs: 0` — no rest timer, for good. After editing an exercise with 3:00 rest / 1:30 duration, "+ new exercise" shows and silently saves 180/90. Reproduced in headless Chromium.
   Verify: browser test: `openEditGex` (pause 180) → `openAddGex` → save gives `pauseSecs===null`, `durationSecs===300`; fresh page → `openAddGex` → save → `pickGex` → `savePlanEx` gives a plan exercise with `pauseSecs===null`. Also make `durFieldValue` (~1466) return null for NaN.
   Size: small

2. **B-17 · GoTrain · "Last time" shows a session where the exercise wasn't done**
   Why: `lastSessionFor` (~1835) returns any history row, even `setsCompleted:0, done:false`, and `renderLastTime` (~1876) falls back via `row.setsCompleted||row.sets`, so zero sets reads as "3×8". `isPersonalBest` (~1850) counts those rows too, hiding a real new best. Reproduced: 20 Sep (80 kg, 0 sets, not done) and 10 Sep (57,5 kg, 3 sets, done); Bench at 60 kg shows "Last time 80 kg · 3×8 · 20 Sep" and no New best (expected 57,5 kg, 10 Sep, ★). Starting and immediately finishing a workout makes "Last time … today" appear with the plan's numbers.
   Verify: browser test with that two-entry fixture asserts date, kg and the ★; a row with 0 sets done is never shown.
   Size: small

3. **B-25 · GoTrain · Changing an exercise's sets in the plan editor mid-workout leaves its progress wrong**
   Why: `savePlanEx` (~2730) writes the new `sets` but never calls `clampSets`, unlike "Adjust for today". Reproduced in headless Chromium: tick 3/3 of Bench, edit the plan to 2 sets, finish → `getSets('x1')` stays 3 and the history row reads "3/2 sets". Related, same function family: `clampSets` (~1899) only ever withdraws done, so ticking 2 of 3 and then adjusting to 2 sets leaves both rows ticked but `isDone` false, the ring at 0% and Complete still enabled (reproduced).
   Verify: browser test: tick 3/3, edit the plan to 2 sets → `getSets==2` and the finished history row reads 2/2; tick 2/3, adjust to 2 → `isDone` true and the ring matches what `completeSet` gives for the last set. Keep B-10's rule: done set by hand is not withdrawn unless sets were added.
   Size: small

4. **B-18 · omarchy-gotrain · `sync` and the panel's "N waiting" count still disagree**
   Why: B-8 made `pending` count only un-imported files, but `sync` without `--all` still imports only `found[:1]` (~1010), the newest file, even when it is already imported or unreadable. Reproduced: an older un-imported export plus a newer already-imported one → `sync` says "already imported, nothing to do", panel keeps `pending 1` forever. Add a newest `{"broken` file → `pending 2`, `sync` exits 1 "nothing could be imported". Invalid JSON is counted although the docstring says unreadable files aren't. Keep B-4's concern in mind (an older export must not restore an older library): the simplest fix is making `pending` report what `sync` would do.
   Verify: new test with that two-file scenario: after `sync`, `pending` is 0 or equals what `sync` would import next; a broken newest file is not counted and does not block a valid one.
   Size: small

5. **B-19 · GoTrain · Deleting the active plan mid-workout leaves the workout running**
   Why: `deletePlanById`/`deletePlanModal` (~2812) don't end the workout. Reproduced: start p1, tick set 1, delete p1 → the rest overlay keeps counting for an exercise that no longer exists, `workoutMode` stays `'active'` so the other plan renders as the running workout, the wake lock is held, and `state.progress['p1']` stays in storage and every export.
   Verify: browser test: after that delete, overlay inactive, `workoutMode==='home'`, `'p1' in state.progress` false, wake lock released (stubbed); deleting a non-active plan leaves the running workout alone.
   Size: small

6. **B-20 · GoTrain · Reset leaves the timers key, so a rest overlay appears over the fresh app**
   Why: "Delete all data" (`confirmResetAll` ~3081) removes `tp4_state` but not `tp4_timers`. Reproduced: with a rest running, reset → the empty, plan-less app comes back with the rest overlay counting. Same area: `newWorkout` (~3072) calls `clearAllTimers()` but not `onWorkoutEnded()`, so the wake lock is never released (reproduced: 1 request, 0 releases) — fold that one-liner in.
   Verify: browser test: reset with a rest running → no `tp4_timers` in localStorage, overlay inactive after reload; `newWorkout` releases the lock (stubbed).
   Size: small

7. **B-22 · GoTrain · Creating a plan mid-workout hijacks the running workout**
   Why: `createPlan` (~2757) sets `state.activePlanId` to the new plan unconditionally, while `workoutMode` stays `'active'`. Reproduced in headless Chromium: `startWithPlan(p1)` → Plans → "+ new plan" → `activePlanId` is the new empty plan and the workout screen shows it as the running workout; finishing then writes a history entry for the empty plan, and p1's ticked sets sit in `state.progress` unseen. The modal also leaves `#newPlanName` filled for the next plan. Same family as B-19, but a separate code path.
   Verify: browser test: start p1, tick a set, create a plan → `activePlanId===p1`, p1's progress intact, `#newPlanName` empty; with no workout running, a new plan still becomes active as today.
   Size: small

8. **B-26 · GoTrain · Starting one timed exercise's countdown wipes another's paused countdown**
   Why: there is a single `timers.ex` slot (`etRecord`/`etToggle` ~2165), so starting any timed exercise overwrites the held countdown of the previous one. Reproduced in headless Chromium: start Row (8:00), let it reach 6:20, go back, start Plank, go back to Row → it shows 8:00 and the 100 s are lost. Natural in a circuit or when two timed exercises share a phase.
   Verify: browser test with those steps: Row reopens at 6:20 (±1 s) and Plank keeps its own state. Key the record by exercise id like `timers.sw`, and still read the old single-slot shape from an existing `tp4_timers` after the update.
   Size: small

9. **B-21 · omarchy-gotrain · `progress NAME` misses non-ASCII names and blames the archive**
   Why: the name match uses SQLite `lower()` (~702), which folds ASCII only, so `progress überkopfdrücken` misses "Überkopfdrücken" — the owner's German exercise names are exactly where this bites. Any miss, a plain typo included ("Bench Pres", reproduced), says "no load data yet -- import a workout that has one", which is wrong with a full archive.
   Verify: new test: `progress überkopfdrücken` finds "Überkopfdrücken" (match with Python `casefold()` instead of SQL `lower()`); a name with no match says no exercise by that name was found, and suggests the closest names (`difflib`, stdlib) rather than blaming the archive.
   Size: small

10. **B-23 · omarchy-gotrain · Piping `list`, `stats` or `export` into `head` ends in a traceback**
    Why: closing stdout early raises `BrokenPipeError` out of `main`, so `gotrain list | head` and `gotrain export | head -c 100` print a Python traceback (reproduced on a 3000-workout archive). Ordinary shell use, and the traceback reads like archive damage.
    Verify: new test pipes `list`, `stats` and `export` into a reader that closes after one line: exit status is not a traceback, stderr has no `Traceback`. Catch it in `main` and point stdout at `os.devnull`; no `SIG_DFL` around archive writes, so an interrupted import still rolls back.
    Size: small

## Candidates that did not make the ten

In progress, not in the ten while their PR is open: **B-14** · omarchy-gotrain · A broken config is wiped by `config set` and blanks the bar — https://github.com/nicklyk/omarchy-gotrain/pull/4 (draft); **B-24** · omarchy-gotrain · "Latest workout" and the sync cursor are picked by sorting timestamp text — https://github.com/nicklyk/omarchy-gotrain/pull/5.

Reproduced, but smaller: `list -n 0` says "no workouts yet" and `-n -1` returns everything (`LIMIT -1`); switching language mid-workout puts the workout header ("PLAN · TRAINING LÄUFT") on the Settings screen (`changeLang` ~1317); the export filename uses the UTC date (`exportFilename` ~2831), so a 00:30 export is named for yesterday; finishing a workout with nothing done still writes a history entry (`finishWorkout` ~1642 lacks `newWorkout`'s `hasProgress` guard — owner's call); `stats` prints first/last dates in UTC; `status` prints "None days ago" for undated workouts; `export --csv -o` miscounts rows when a name contains a newline, and `durationSecs: true` exports as a number. Read in code only: `BarWidget.qml:36` may leave `%25`/`%23` in the CLI path, and `Panel.qml:248` quotes path and argument as one string; README lists `origin` as a config key but `load_config` always overwrites it; `doctor` shows the total pending count on every watch-folder row and assumes a /24; `import a b` stops at the first bad file after committing the earlier ones; German confirms spelled `zuruecksetzen`/`loeschen` (index.html ~854-855); `deletePhase` doesn't refresh the phase count in `pd-meta`; a 0:00 duration becomes 5:00 through `||300`; a rest overlay restored after reload has an empty "next set" line; the phone's `syncPayload` (index.html ~2972) still compares `ts>sinceTs` as text, so it relies on the desktop sending a `Z` cursor (B-24 fixes the sender; parsing both with `Date.parse` would be belt and braces).

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
- B-9 · Escape user text before it goes into `innerHTML` — GoTrain a317d7d (v27); finished by B-12
- B-10 · "Adjust for today" un-marks an exercise completed by hand — GoTrain caf847e (v30)
- B-11 · A hand-edited config value of the wrong type blanks the bar — omarchy-gotrain 072d3db (1.2.6)
- B-12 · Escape the innerHTML sites B-9 missed — https://github.com/nicklyk/GoTrain/pull/3 (v36)
- B-13 · A malformed export crashes `import`/`sync` and leaves an orphan snapshot — https://github.com/nicklyk/omarchy-gotrain/pull/3 (1.4.1)
- B-16 · An import that passes validation can leave the app unable to start — https://github.com/nicklyk/GoTrain/pull/4 (v36, with the id check f25bf0a that closed the `onclick` id injection)

## Not wanted
