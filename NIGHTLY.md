# Nightly brief

The instructions a scheduled agent follows on weeknights. It lives here rather
than inside the routine so it can be changed with a commit, and so the changes
are reviewable like anything else.

Both repositories are checked out: **GoTrain** (this one, a backend-less
workout PWA that is one static `index.html`) and **omarchy-gotrain** (an
Omarchy shell plugin: a QML widget and panel plus a Python CLI).

**Read `CLAUDE.md` in each repository first.** It states constraints that are
deliberate product decisions rather than preferences, and several of them look
like oversights if you do not know why they are there.

## The job

Pick **one** improvement, to **one** of the two projects, and implement it.

Choosing what:

- Take it from the backlog. An hour earlier the scout (`SCOUT.md`) refreshed
  a ranked list in `BACKLOG.md` on the `backlog` branch:

  ```bash
  git fetch origin backlog && git show origin/backlog:BACKLOG.md
  ```

  Build the **highest-ranked item under *Top ten*** that no open pull request
  already carries as `Backlog: B-<n>`. Read *Owner notes* too.
- If that item turns out, once you are in the code, to be wrong, already
  done, or too big for one night, skip to the next and say why in your
  report. Do not edit `BACKLOG.md`. The scout keeps it.
- If the branch is missing or the list is empty, fall back to choosing
  yourself: read recent `git log` in both repos, and prefer a rough edge, a
  missing affordance, or a bug you can actually demonstrate.
- One focused change. Not a refactor, not three things bundled together.
- **If nothing is worth building tonight, write that and stop.** Do not invent
  busywork. A night that produces no branch is a good outcome, and much better
  than a branch that costs the owner a morning to read and reject.

## Rules

- Branch from `main`, named `claude/<short-slug>`. Never commit to `main`,
  never push to `main`, never force-push anything.
- `tests/run` must pass before you push. If you cannot make it pass, push
  nothing and say why.
- If checks **skip** rather than pass -- no browser for the PWA's behavioural
  tests, no Omarchy tooling for the plugin's packaging checks -- name exactly
  which ones. A skip is not a pass, and saying so is not a failure.
- Add tests covering what you built, to the existing suite.
- Do **not** bump `APP_VERSION`, `APP_BUILD` or `CACHE_NAME`. Those move when
  the owner merges, so that parallel branches do not collide.
- Commit subjects are prefixed `claude: `.

## The pull request

Open it as a **draft** against `main`, and write the description for someone
reading it over coffee who has not seen the code:

- What you built, and why you thought it was worth building.
- What you verified, and what you could not.
- What you are unsure about, or would do differently with more context.
- A last line `Backlog: B-<n>` naming the item, so the scout can tell it was
  built. Leave it out if you chose without the backlog.

A reviewer (`REVIEW.md`) goes over it in the morning and may push small fixes
to your branch, so make the description checkable: say exactly how to
reproduce what you fixed.

Be honest about weaknesses. A pull request that oversells itself wastes the
owner's morning, and the point of the draft is that merging is their decision,
not yours.
