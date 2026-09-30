# Scout brief

The instructions a scheduled agent follows on weeknights, an hour before the
nightly build. Its only output is a ranked list of ten candidate improvements
that the nightly agent (`NIGHTLY.md`) picks from. It builds nothing.

Both repositories are checked out: **GoTrain** (this one, a backend-less
workout PWA that is one static `index.html`) and **omarchy-gotrain** (an
Omarchy shell plugin: a QML widget and panel plus a Python CLI).

**Read `CLAUDE.md` in each repository first.** Anything that breaks a
constraint there — a network call, a build step, a dependency, a non-free
licence — is not a candidate, however useful it looks.

## Where the list lives

`BACKLOG.md` on the branch **`backlog`** of the GoTrain repo. It is a branch of
its own, with no history in common with `main`, so that nothing on it ever
ships.

```bash
git fetch origin backlog && git checkout backlog      # it exists
git checkout --orphan backlog && git rm -rfq .        # first run only
```

Commit to it with a `claude: ` subject and push it. Never force-push it, and
never touch `main`.

## Respect the owner's edits first

The owner edits this file by hand on GitHub. Before changing anything, read
`git log -p origin/backlog -- BACKLOG.md` for commits whose subject does
**not** start with `claude: `. Those are the owner's decisions:

- An item they deleted goes under **Not wanted**, and is never proposed again,
  in any wording.
- An item they moved keeps the rank they gave it.
- Anything they wrote under **Owner notes** is direction for your ranking.

## Refreshing the list

1. Read recent `git log` in both repos, and the open and recently closed pull
   requests in both.
2. Remove items that were built. An item was built when a pull request carries
   `Backlog: B-<n>` in its description and is **open or merged**, or when a
   commit on either repository's `main` carries that line (work the owner
   merged without a PR). Record merged ones under **Done**. If such a PR was **closed without merging**,
   move the item to **Not wanted**: the owner said no.
3. Re-rank what is left, and fill back up to ten with new candidates, found
   by actually reading the code: a rough edge, a missing affordance, a case
   handled badly, a bug you can demonstrate. A bug you have reproduced beats a
   feature you imagine.
4. Each item must be small enough for one night: one focused change to one
   repository.

Fewer than ten good items is fine. Pad the list and the nightly agent builds
the padding.

## Format

IDs are permanent. The next new item gets the highest ID ever used, plus one,
counting Done and Not wanted too. Never reuse or renumber an ID.

```markdown
# Backlog

Updated <date> by the scout. Edit freely: reorder lines, delete what you don't
want, add notes. The nightly build takes the highest item without an open PR.

## Top ten

1. **B-12 · omarchy-gotrain · Short title**
   Why: what it fixes or adds, and why the owner would want it.
   Verify: how a reviewer can tell it works.
   Size: small | medium

## Owner notes

## Done
- B-3 · Short title — PR link

## Not wanted
- B-7 · Short title
```

## Finish

Report, briefly: what you added, what you dropped, and anything the owner
changed that you had to honour.
