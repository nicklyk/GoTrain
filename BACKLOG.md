# Backlog

Updated 2026-09-29 by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-1 · GoTrain · Ask before an import replaces your history**
   Why: `applyImport` does `Object.assign(state, imported)` (index.html ~2632), so importing an older backup silently replaces `history`, `plans` and `progress`, wiping every workout since that backup. `tp4_state` is the only copy. Reproduced: 2 history entries, import of an export with `history: []` → 0 entries, no `confirm`. Fix: a confirm stating the counts ("replaces N workouts with M from the file"), in both languages. Merging by id is the bigger follow-up, not this item.
   Verify: browser test: `applyImport` of a file with fewer workouts calls `confirm` with both counts; declining leaves history untouched; accepting behaves as today.
   Size: small

2. **B-2 · omarchy-gotrain · An export with an empty plan library must not wipe the archived one**
   Why: `ingest()` runs `DELETE FROM plans` / `DELETE FROM exercises` on every full import (bin/gotrain ~469-477), even when the export has `plans: []` — exactly what the wrong iOS storage container or a fresh install produces. Afterwards `gotrain export` dies with "nothing to export -- no plan library imported yet", so the recovery path is gone. Breaks "imports merge, never replace". Reproduced: import `tests/fixtures/baseline.json`, then a schema-3 export with empty plans/history, then `gotrain export` → rc=1.
   Verify: new test in `tests/run`: after that sequence, `export` still returns 1 plan and 3 workouts.
   Size: small

3. **B-3 · GoTrain · Text containing `"` is truncated the next time it is edited**
   Why: user text goes into `value="${...}"` unescaped — phase-name input (index.html ~2139, saves on blur), plan-exercise name/note/reps/kg (~2489-2505), "adjust for today" (~1697). Opening the editor and saving cuts the text at the first quote. Reproduced: phase `Core "hard"` saved as `Core`; exercise `Bench "flat"` with note `Seat "3", pad low` stored as `Bench` / `Seat` after an unchanged save. Fix: one attribute-escape helper applied to those `value=` templates only.
   Verify: browser test: the same scenarios keep the full strings.
   Size: small

4. **B-4 · omarchy-gotrain · `sync --all` leaves the oldest export's plan library in place**
   Why: `find_exports` sorts newest-first (bin/gotrain ~852) and `cmd_sync` imports in that order; the library is last-writer-wins, so the oldest file wins, along with `activePlanId`, `progress` and `schema`. `gotrain export` then hands the phone an out-of-date library. Reproduced: two exports with plans "OLD" (older mtime) and "NEW"; `sync --all` then `export` → "OLD plan name". Fix: import oldest-first; optionally skip the library replace when an export is older than the archive's cursor.
   Verify: new test: same repro gives "NEW plan name".
   Size: small

5. **B-5 · GoTrain · Repair durations and muscles left stale by the old import bug**
   Why: anyone who imported a schemaless export before 7ea3f3f has `schema: 3` with `durationMin` and no `durationSecs`, plus German muscle labels. Both migrations skip at `schema>=3`, so timed exercises show the 5:00 default for good. PR #1 flagged this as needing the owner's decision. Reproduced: `schema:3`, `durationMin:"10"`, no `durationSecs` → timer shows 5:00. Fix: an idempotent, additive schema-4 step: fill `durationSecs` from `durationMin` only where missing, re-run `muscleKey` over every exercise (keys pass through). No field dropped. Also stop `saveGex`/`savePlanEx` (~2419, ~2525) storing the German literal `'Allgemein'` for "no muscle", so the repair has nothing new to fix.
   Verify: browser test: that state loads to schema 4 with a 10:00 timer; a second load changes nothing; an already-current state is byte-identical apart from `schema`. The plugin's `_premigration` check may need a matching line — check it.
   Size: medium

6. **B-6 · omarchy-gotrain · Bucket days and weeks in local time, not UTC**
   Why: the PWA writes `ts` via `toISOString()` (UTC "Z"); SQLite `date(ts)` buckets in UTC, and `weekCount` (~680), `load_series` (~555), the panel's 8-week window (~1030) and `stats` compare that against local dates. A Monday 00:30 Berlin workout counts toward last week. Reproduced (TZ=Europe/Berlin): `ts` "2026-09-27T22:30:00.000Z" → `status --json` `weekCount: 0` (should be 1), `progress` date 2026-09-27. Caveat: naive `date(ts,'localtime')` breaks the naive fixture timestamps; bucket in Python via `to_local`.
   Verify: new test with `TZ=Europe/Berlin` and that timestamp gives weekCount 1 and date 2026-09-28; existing fixture tests stay green.
   Size: medium

7. **B-7 · GoTrain · Deleting an exercise leaves its progress behind (ring shows 200%)**
   Why: `deletePlanEx` (index.html ~2337) removes the exercise but not its id from `doneExercises` / `completedSets`, so the ring overshoots and `saveHistory` records e.g. 2 of 1 exercises done. Reproduced: both exercises done, one deleted → 200%, both ids still present.
   Verify: browser test: after the delete the ring shows 100% and no stale ids remain.
   Size: small

8. **B-8 · omarchy-gotrain · "Exports waiting" banner never clears**
   Why: the panel's `pending` is `len(find_exports(cfg))` (bin/gotrain ~1070), counting files already imported, so Panel.qml's "press Enter to import" nag stays forever. Reproduced: watch folder with one export, `sync` twice ("already imported"), `panel` → `pending = 1`. Fix: count only files whose content hash is not already in `snapshots` (same decompress-then-hash as `ingest`). CLI-only change; no QML.
   Verify: new test: repro gives `pending = 0`; dropping a new file gives 1.
   Size: small

9. **B-9 · GoTrain · Escape user text before it goes into `innerHTML`**
   Why: plan, phase and exercise names, notes and history entries are interpolated raw (e.g. `renderPlansList` ~2093, `openHistoryDetail`, `exItemHTML`). Reproduced: plan `Push <Heavy> & Pull` renders as `Push  & Pull`. More serious: a crafted import file can run script in the page, which could make a network request and break the headline promise. Reuses the helper from B-3 if that lands first.
   Verify: browser test: that name renders literally in Settings, workout and history; an `<img src=x onerror=...>` name runs nothing.
   Size: medium

10. **B-10 · GoTrain · "Adjust for today" un-marks an exercise completed by hand**
    Why: `clampSets` calls `unsetDone` whenever completed sets < planned sets (index.html ~1751). Tap "Complete exercise" with no sets ticked, then change today's weight, and it is silently not done again. Reproduced: `markExDone()`, adjust kg to 50, save → `isDone` false. Fix: only un-mark when the adjustment raised the set count above what was completed.
    Verify: browser test: that scenario stays done; raising sets after finishing all of them still un-marks.
    Size: small

## Candidates that did not make the ten

Reproduced, but smaller: creating a plan mid-workout switches the active workout to it and the name field isn't cleared (GoTrain `createPlan` ~2568); a wrong-typed value in the plugin's config (`"staleDays":"3"`) makes `status --json` raise and blanks the bar; truncated gzip or non-scalar fields make `gotrain import` crash with a traceback and leave an orphan snapshot file; `progress "überkopfdrücken"` misses because SQLite `lower()` folds ASCII only. Read in code only: `BarWidget.qml:35` leaves percent-encoding in the CLI path (breaks under `/home/jürgen`); `newWorkout` never releases the wake lock; reset leaves `tp4_timers`; German confirms spelled `zuruecksetzen`/`loeschen`.

## Owner notes

## Done

## Not wanted
