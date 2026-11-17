---
name: zoom-out
description: Show the whole system on one page, everything promised with where it actually stands laid over it.
disable-model-invocation: true
---

The **map** is `system-map/map.json` in the project's repo: the **promise** (every feature the project owes) with a **status** on each, plus the boxes and flows the page is drawn from. You keep the map true. A script draws the page from it, so the human reads a page whose every count, colour and status is computed from the map.

Field-by-field format: [`MAP-FORMAT.md`](MAP-FORMAT.md). A small complete map: [`example-map.json`](example-map.json).

## Pick the branch

- **No `system-map/map.json`** → follow [`FIRST-RUN.md`](FIRST-RUN.md), which ends by running a full Refresh.
- **The human pasted answers copied from the page** (they open with "Answers for /zoom-out") → Answers, then Refresh.
- **The human handed over other material with the command** (notes, a client message, a file) → Intake, then Refresh.
- **Otherwise** → Refresh.

## The promise

The promise changes only on the human's word.

- A feature you find in code, the tracker or a plan that is missing from the map goes to the human as a proposal. Confirmed, it joins `features`. Unanswered, it goes in `pending`, which the page shows as "waiting for your OK".
- A feature the human drops moves to `parked` with the reason.
- Every feature carries `source`: where it was promised, named so the human can find it (the plan ticket's title, "client meeting notes, 4 Nov").
- With no human present (a scheduled run), ask nothing: every proposal goes to `pending`.

## The ladder

Every feature sits on one step. Claim the highest step its **evidence** supports, and write that evidence on the feature as something the human could go and look at: a file path, a test name and run, a pull request, a ticket.

| `status` | Meaning | Evidence that earns it |
|---|---|---|
| `none` | Nothing exists | No code found |
| `progress` | Being built | An open branch, an open pull request, or a ticket in progress |
| `built` | Merged, nothing proves it works | The merged code |
| `tested` | Works on a dev machine or in tests | A passing test result that exercises this feature, or a recorded manual check |
| `live` | Seen working on the real site | A recorded check against the live build, or the human saying so |

- **Reading only.** Read code, git history, the tracker, and test results that already exist (CI runs, reports in the repo). Start nothing: the app, the test suite and the live site stay untouched.
- **Code alone earns `built` at most.** `live` is never inferred.
- **A status moves up only on new evidence, and moves down when its evidence is gone** (the test now fails, the code was removed).
- **Blocked is a flag beside the step.** A blocked feature keeps the step it reached and gains `blocked` with a `kind` (`decision`: waiting on someone to decide; `off`: built but switched off; `build`: waits on something not built yet) and a one-line `note`.
- `checked` is the date you last looked at that feature's evidence. A feature you did not recheck keeps its old date, and the page says so.

## Refresh

A refresh is cheap by design. Scripts do everything that can be computed, and you read and write only what changed. Leave `map.json` unopened: `map.mjs` reads and writes it for you. Run it as `node <this skill's folder>/map.mjs` from the repo root.

1. **Scan.** Run `map.mjs scan`. With no help from you it stamps today's date and fills from git `people` (each person's `trail` and `now`), `runBy` and `work.branch`. It then prints the **worklist**: the features whose files changed since the last map, the features with no `paths`, the plan documents that changed, and the changed files that belong to no feature. For a full refresh (the human typed `/zoom-out full`, or this follows a first run) use `map.mjs scan --all`, which puts every feature on the worklist.
2. **Check the promise where the worklist points.** Read each plan document it lists as changed, the decisions closed on the wayfinder map since the last map (the tracker issue labelled `wayfinder:map` and its child tickets), and each changed file that belongs to no feature: it is either new scope or a missing entry in a feature's `paths`. Put each proposal and each existing `pending` item to the human in one list, one line each, and apply their answers.
3. **Recheck the worklist against the ladder.** Read those features with `map.mjs show <id> <id> …`. A feature off the worklist keeps its status and its `checked` date, because nothing it rests on moved. What evidence cannot settle becomes an entry in `questions` for the human, and the feature keeps the status its evidence supports. The page must carry every open question between today and a finished system: each feature that needs something from a person before it can move up has that need written down, as a `decision` blocker or a `questions` entry, worded so a person can answer it in one line. Give each new blocker, question and pending item `since`, today's date. Give every worklist feature its `paths`, tests included, so the next scan can leave it alone. Done when every worklist feature has a status with evidence and `paths`, or is named in your closing summary with the reason.
4. **Ask the tracker once.** The repo's tracker is Linear or GitHub issues, whichever its agent docs name. Fetch the open assigned tickets in one query and match them to features. `work.who` is the ticket's assignee field, copied as the tracker shows it, with `ticket` and `url`. Git commit authors are never a source for `who`. Where a ticket links a branch or pull request, that is the feature's `work.branch`, as the bare name `git branch` prints; the scan has already filled the rest from open branches. Where the tracker cannot be reached, or the repo has none, set `tracker` to null, leave `who` off every feature, and say so in `sources` and in your closing summary. Done when every `who` matches the tracker today and every `progress` feature has a `branch` or is named in your closing summary as having none.
5. **Write what changed, as one patch.** Write a small JSON file holding only what you are changing, apply it with `map.mjs apply <file>`, and delete the file. Its shape is under "A patch" in `MAP-FORMAT.md`. Beside the features, it carries under `top`:
   - `recap`: one short paragraph on what happened since the last map and where that leaves the project: the work merged, the tickets closed, the decisions made, the features that moved. The scan's output and your recheck are the source. Write it the way `wait-what` asks: read `wait-what/SKILL.md` in the skills folder beside this skill's folder. Where that skill is missing, its recipe is a little context first, ASD-STE100 Simplified Technical English, and the terms from the repo's `GLOSSARY.md`.
   - `nextSteps`: three to five moves, the most valuable first, each with `step` (what to do, in plain words), `why` (what it moves on the map), `skill` when one of the human's skills is the way to do it, and `prompt`. Choose and order them the way `ask-matt` routes work: read `ask-matt/SKILL.md` beside this skill's folder, and read a skill's own `SKILL.md` before naming it. Look first at where a main flow stops, at `decision` blockers (a question for a person, so the move is to ask it), and at features that are built but unproven. Where `ask-matt` is missing, leave `skill` out. A `prompt` is what an agent starting cold in this repo would be handed to do the step. Beside the task it carries three labelled lines: `Evidence:` the file, test, ticket or pull request the step rests on; `Done when:` the result that ends the work, as something a person can check; `Needs the human's OK:` every action that changes shared state (a merge, a push, a deploy, a message to someone), or `nothing`.
   - `headline`, only when a main flow now stops somewhere else: one plain sentence saying how far a real user gets today and where they stop.
   - `sources`, only when what the scope or the statuses were read from has changed.
6. **Draw the page.** Run `node <this skill's folder>/build.mjs` from the repo root. It checks the map and refuses to draw a broken one: fix every problem it lists and rerun until it prints its summary.
7. **Publish**, when an Artifact tool is available. Publish `system-map/index.artifact.html`, passing the map's `artifact` link as `url` so the link the human already shared keeps working. On the first publish, save the returned link into `artifact`. Without an Artifact tool, skip this step.
8. **Commit the `system-map` folder by itself**, message `zoom-out: refresh <date>`. The next scan compares against this commit. Leave pushing to the human.
9. **Tell the human**, in a few plain lines: where the page is (the file path and the artifact link), what moved (from the build's summary), what is waiting for their OK, and how many features were left alone because nothing they rest on changed.

## Intake

Read the material for features it adds, changes or drops. Show the human the changes as one list, one line each, with the words from the material that led to each. Apply what they confirm, with the material as `source` (its name and date). Then run Refresh.

## Answers

The page puts an answer box beside every blocker, question, suggested next step and pending item, and a button that copies the filled ones as one text. Each pasted answer is the human's word on that item:

- **Pending item**: add it to `features` or drop it, as answered.
- **Blocker**: clear or rewrite the feature's `blocked` as answered. An answer that names someone to ask ("ask Dan on Thursday") keeps the feature blocked, with the note saying who is being asked and when.
- **Question**: apply the answer to the map and remove the question.
- **Next step** answered with a go: do it after the Refresh, in the order given, following the skill it names (read that skill's `SKILL.md`). Where only the human can start that skill, give them the command to type.

The human answers as many or as few as they like. An item with no answer rolls over: it stays in the map as it is, keeps its `since`, and returns on the next page.

Where an answer is too unclear to act on, ask the human about that one answer. Done when every pasted answer is applied, or named in your closing summary as not applied with the reason.

## Does the default page fit?

Ask this on the first run and whenever the map's shape changes. The default page bends through the map alone: any number of boxes and flows, bands named for this project, `lanes` on a flow that runs differently for different kinds of thing, and sections that vanish when their data is empty.

When this project needs something the map cannot express, tell the human in a line or two what does not fit and what you are adding, copy this skill's `template.html` to `system-map/template.html`, and change the copy. The build uses a project's own copy when one exists. On a custom page every count, colour and status still comes from the map data, and anything new the page shows is a new field in the map.

A project's copy falls behind when this skill's template gains sections, and the build says so with `TEMPLATE OUT OF DATE`. Bring the copy up to date in the same run: take a fresh copy of this skill's `template.html`, carry the project's own additions across onto it, and rebuild. Done when the build no longer prints that line and the project's additions still show.
