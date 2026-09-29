# Review brief

The instructions a scheduled agent follows on weekday mornings, after the
nightly build. It reviews the draft pull requests the nightly agent opened, so
that by the time the owner looks, the only decision left is whether to merge.

Both repositories are checked out: **GoTrain** (this one, a backend-less
workout PWA that is one static `index.html`) and **omarchy-gotrain** (an
Omarchy shell plugin: a QML widget and panel plus a Python CLI).

**Read `CLAUDE.md` in each repository first.** The review checks the pull
request against it, and several of its constraints look like oversights if you
do not know why they are there.

You did not write these changes, so do not trust them. A PR description says
what the author believes. Your job is to find out whether that is true.

## Which pull requests

Every **open** pull request in either repository whose head branch starts with
`claude/`. Skip one if your own review comment already names its current head
commit (`Reviewed at <sha>`). Nothing has changed since you looked, so there
is nothing to do. Review it again if new commits arrived.

## Reviewing one

1. Check out the branch. Read the whole diff and the description.
2. Check it against the rules:
   - One focused change, not several bundled together.
   - Nothing from `CLAUDE.md`'s *Never* section and constraints.
   - `APP_VERSION`, `APP_BUILD` and `CACHE_NAME` are **not** bumped. They move
     when the owner merges.
   - It merges cleanly into the current `origin/main`.
   - Commit subjects start with `claude: `.
3. Run `tests/run` in the repository it changes. For GoTrain, put a browser on
   `PATH` first so the behavioural checks run rather than skip:

   ```bash
   mkdir -p /tmp/bin && ln -sf /opt/pw-browsers/chromium /tmp/bin/chromium
   PATH=/tmp/bin:$PATH tests/run
   ```

   Anything that still skips (`qmllint` and `omarchy-plugin-validate` are not
   installed here), name it. A skip is not a pass. A PR that changes QML
   cannot have its QML checked here, so say so in the verdict.
4. Check the claim itself, not just the suite. Do what the description says it
   fixes and confirm it is fixed. Confirm the new tests fail without the
   change. Try the cases the author did not: empty data, old schemas, the
   other language, the edge of a range.

## What you may change

You may push commits to the PR's branch for **small, clear** problems: a
missing or weak test, a skipped check you can make run, a comment that is
wrong, a string missing from `T.de` or `T.en`, a merge from `main` that
resolves without judgement. Subject prefixed `claude: `. Run the suite again
afterwards.

Anything bigger — a wrong approach, a design question, behaviour the owner
might not want — you report. Do not rewrite the author's work.

Never merge. Never push to `main`. Never force-push. Never close a pull
request.

## The verdict

Leave one comment on the pull request, written for someone reading it over
coffee:

```markdown
## Review: ready to merge   (or: needs work)

Reviewed at <head sha>.

- **What I checked:** the suite (counts, and every skip by name), the claim,
  the edge cases I tried.
- **What I changed:** the commits I pushed, and why. Or "nothing".
- **Before merging:** anything the owner should know or decide. Or "nothing".
```

**Ready to merge** means you would merge it yourself: the suite passes with the
browser checks running, the claim holds, and you have nothing left to raise.
Mark the pull request ready for review (take it out of draft).

**Needs work** means anything else. Leave it as a draft, and say exactly what
is wrong and what would fix it.

If the GitHub tools refuse an action (comment, ready-for-review), put the
verdict in your final report instead, and say which action failed.

## Finish

Send one short notification listing each pull request and its verdict. If
there were no pull requests to review, say so in one line.
