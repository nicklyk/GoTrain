# Backlog

Updated 2026-10-14 by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-22 · GoTrain · Creating a plan mid-workout hijacks the running workout**
   Why: `createPlan` (~2804) sets `state.activePlanId` to the new plan unconditionally, while `workoutMode` stays `'active'`. Reproduced in headless Chromium: `startWithPlan(p1)` → Plans → "+ new plan" → `activePlanId` is the new empty plan and the workout screen shows it as the running workout; finishing then writes a history entry for the empty plan, and p1's ticked sets sit in `state.progress` unseen. The modal also leaves `#newPlanName` filled for the next plan. Same family as B-19, but a separate code path.
   Verify: browser test: start p1, tick a set, create a plan → `activePlanId===p1`, p1's progress intact, `#newPlanName` empty; with no workout running, a new plan still becomes active as today.
   Size: small


2. **B-20 · GoTrain · Reset leaves the timers key, so a rest overlay appears over the fresh app**
   Why: "Delete all data" (`confirmResetAll` ~3128) removes `tp4_state` but not `tp4_timers`. Reproduced: with a rest running, reset → the empty, plan-less app comes back with the rest overlay counting. Same area: `newWorkout` (~3119) calls `clearAllTimers()` but not `onWorkoutEnded()`, so the wake lock is never released (reproduced: 1 request, 0 releases) — fold that one-liner in.
   Verify: browser test: reset with a rest running → no `tp4_timers` in localStorage, overlay inactive after reload; `newWorkout` releases the lock (stubbed).
   Size: small


3. **B-18 · omarchy-gotrain · `sync` and the panel's "N waiting" count still disagree**
   Why: B-8 made `pending` count only un-imported files, but `sync` without `--all` still imports only `found[:1]` (~1064), the newest file, even when it is already imported or unreadable. Reproduced: an older un-imported export plus a newer already-imported one → `sync` says "already imported, nothing to do", panel keeps `pending 1` forever. Add a newest `{"broken` file → `pending 2`, `sync` exits 1 "nothing could be imported". Invalid JSON is counted although the docstring says unreadable files aren't. Keep B-4's concern in mind (an older export must not restore an older library): the simplest fix is making `pending` report what `sync` would do.
   Verify: new test with that two-file scenario: after `sync`, `pending` is 0 or equals what `sync` would import next; a broken newest file is not counted and does not block a valid one.
   Size: small


4. **B-27 · GoTrain · A single history entry cannot be deleted**
    Why: there is no path that removes one entry from `state.history` (`renderHistory`/`openHistoryDetail` ~3169-3210 offer none; the only way out is "Delete all data"). A workout finished by mistake -- including the empty one `finishWorkout` writes when nothing was done -- stays in History for good and feeds "Last time" and New best. A delete button on the history detail screen, behind a `confirm`, removing that one entry by id. Caveat for the PR text: the desktop archive merges and never deletes, so a later restore from `gotrain export` brings the entry back; the PR should say so, not try to fix it.
    Verify: browser test: two entries, delete one from its detail screen → `state.history` holds only the other (persisted in `tp4_state`), the list re-renders, other entries untouched; cancelling the confirm changes nothing. New keys in both `T.de` and `T.en`.
    Size: small


5. **B-26 · GoTrain · Starting one timed exercise's countdown wipes another's paused countdown**
   Why: there is a single `timers.ex` slot (`etRecord`/`etToggle` ~2201), so starting any timed exercise overwrites the held countdown of the previous one. Reproduced in headless Chromium: start Row (8:00), let it reach 6:20, go back, start Plank, go back to Row → it shows 8:00 and the 100 s are lost. Natural in a circuit or when two timed exercises share a phase.
   Verify: browser test with those steps: Row reopens at 6:20 (±1 s) and Plank keeps its own state. Key the record by exercise id like `timers.sw`, and still read the old single-slot shape from an existing `tp4_timers` after the update.
   Size: small


6. **B-21 · omarchy-gotrain · `progress NAME` misses non-ASCII names and blames the archive**
   Why: the name match uses SQLite `lower()` (~756), which folds ASCII only, so `progress überkopfdrücken` misses "Überkopfdrücken" — the owner's German exercise names are exactly where this bites. Any miss, a plain typo included ("Bench Pres", reproduced), says "no load data yet -- import a workout that has one", which is wrong with a full archive.
   Verify: new test: `progress überkopfdrücken` finds "Überkopfdrücken" (match with Python `casefold()` instead of SQL `lower()`); a name with no match says no exercise by that name was found, and suggests the closest names (`difflib`, stdlib) rather than blaming the archive.
   Size: small


7. **B-23 · omarchy-gotrain · Piping `list`, `stats` or `export` into `head` ends in a traceback**
   Why: closing stdout early raises `BrokenPipeError` out of `main`, so `gotrain list | head` and `gotrain export | head -c 100` print a Python traceback (reproduced on a 3000-workout archive). Ordinary shell use, and the traceback reads like archive damage.
   Verify: new test pipes `list`, `stats` and `export` into a reader that closes after one line: exit status is not a traceback, stderr has no `Traceback`. Catch it in `main` and point stdout at `os.devnull`; no `SIG_DFL` around archive writes, so an interrupted import still rolls back.
   Size: small


8. **B-29 · GoTrain · The rest overlay forgets which set it is resting for**
    Why: `timers.rest` (`startPauseTimer` ~2158) stores only `{endAt,total}`; the "Set n/m" line is written once into `#tovNext` by `completeSet` (~2044) and never again. So when the rest is restored after a reload, or after iOS kills the PWA while you rest (the common case on the owner's phone), the overlay counts down with an empty line under it (reproduced by an earlier scout run; the code is unchanged in v37). The same one-shot write is why the overlay keeps saying "Set 3/3" after the set count is lowered while a rest runs (left open in PR #7's notes). Store `exId` and the next set number in `timers.rest` and render the line from it in `renderRestTimer`; an old `tp4_timers` without them shows no line, as today, rather than throwing.
    Verify: browser test: tick set 1 of 3, reload with the rest running → overlay reads "Set 2/3"; a stored `{endAt,total}` record from before the change still restores and counts with no line and no error.
    Size: small


9. **B-30 · GoTrain · The plan editor shows stale labels after a phase is changed or deleted**
   Why: `changeExPhase` (~2544) saves the new `phaseId` but never re-renders, so the exercise row's meta line keeps naming the old phase. Reproduced in headless Chromium (DEMO plus a second phase "Finisher"): pick Finisher in Bench's phase select → `state` holds `p2`, the row still reads "Chest · S · 8 reps · 3 Sets · 60 kg". Same screen: `deletePhase` (~2367) re-renders the phase list but not `pd-meta`, so the header keeps the old phase count, while adding a phase (~2365) does update it. Small, but it makes the editor look as if the change did not take.
   Verify: browser test: change Bench's phase via the select → its `.plan-ex-meta` names the new phase and the select keeps it; delete a phase → `pd-meta` shows one phase fewer. Re-rendering must not lose the scroll position of a long list more than other editor actions already do.
   Size: small


10. **B-31 · GoTrain · Switching language mid-workout puts the workout header on the Settings screen**
   Why: `changeLang` (~1317) calls `renderWorkout()` unconditionally, and with `workoutMode==='active'` that ends in `setWorkoutHeader`, even though the user is on Settings, where the language select lives. Reproduced in headless Chromium (DEMO, v37): start the plan → Settings (header correctly reads "GOTRAIN", empty sub-line) → switch to Deutsch → header reads "PLAN" / "🟢 TRAINING LÄUFT" while `screen-settings` is still the active screen. It stays until the user changes tab. Only re-render the workout when its screen is active, the way the two Settings tabs below it are already guarded.
   Verify: browser test: start a plan, `showScreen('settings')`, `changeLang('de')` → `#h-plan-name` is "GOTRAIN" and `#h-sub` empty; going back to the Workout tab shows the German running-workout header; switching language on the Workout tab still updates it in place.
   Size: small

## Candidates that did not make the ten

Reproduced, but smaller: `list -n 0` says "no workouts yet" and `-n -1` returns everything (`LIMIT -1`); the export filename uses the UTC date (`exportFilename` ~2878), so a 00:30 export is named for yesterday; finishing a workout with nothing done still writes a history entry (`finishWorkout` ~1645 lacks `newWorkout`'s `hasProgress` guard — owner's call); `stats` prints first/last dates in UTC; `export --csv -o` miscounts rows when a name contains a newline, and `durationSecs: true` exports as a number. Read in code only: `BarWidget.qml:36` may leave `%25`/`%23` in the CLI path, and `Panel.qml:248` quotes path and argument as one string; README lists `origin` as a config key but `load_config` always overwrites it; `doctor` shows the total pending count on every watch-folder row and assumes a /24; `import a b` stops at the first bad file after committing the earlier ones; German confirms spelled `zuruecksetzen`/`loeschen` (index.html ~854-855); a 0:00 duration becomes 5:00 through `||300`; the phone's `syncPayload` (index.html ~3015) still compares `ts>sinceTs` as text, now safe because B-24 always sends a `Z` cursor (parsing both with `Date.parse` would be belt and braces). From PR #7's notes: an "Adjust for today" override outranks a later plan edit of the set count; lowering the count to what is ticked marks the exercise done without the next-exercise banner; switching an exercise from reps to timed keeps its old `completedSets`. From PR #8's notes: progress an older build already left behind in a non-active plan through B-28's bug still opens ticked; only the paused plan is ended.

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
- B-14 · A broken config is wiped by `config set` and blanks the bar — https://github.com/nicklyk/omarchy-gotrain/pull/4 (1.4.2)
- B-15 · A new library exercise gets a 0-second rest, or the last-edited exercise's values — https://github.com/nicklyk/GoTrain/pull/5 (v37)
- B-17 · "Last time" shows a session where the exercise wasn't done — https://github.com/nicklyk/GoTrain/pull/6 (v37)
- B-24 · "Latest workout" and the sync cursor are picked by sorting timestamp text — https://github.com/nicklyk/omarchy-gotrain/pull/5 (1.4.2)
- B-25 · Changing an exercise's sets mid-workout leaves its progress wrong — https://github.com/nicklyk/GoTrain/pull/7 (v37)

## Not wanted
