# Map format

`system-map/map.json`, one JSON object. [`example-map.json`](example-map.json) is a complete small map. `build.mjs` checks every rule marked **checked** and names what is wrong.

## Top level

| Field | What it holds |
|---|---|
| `project` | The project's name as the client knows it. **Checked.** |
| `about` | One or two plain sentences under the project's name: what this system is and who uses it. Written on the first run and changed only when the project itself changes. **Checked:** required. |
| `updated` | Date of this run, `YYYY-MM-DD`. **Checked.** |
| `headline` | One plain sentence: how far a real user gets today and where they stop. |
| `recap` | One short paragraph: what happened since the last run and where that leaves the project. Shown as "Where we are". **Checked:** required. |
| `nextSteps` | One to five suggested moves, most valuable first. Each has `step`, `why`, optional `skill` (a slash command such as `/to-questionnaire`) and optional `prompt`: text an agent starting cold in this repo could be handed to do the step. **Checked:** a `prompt` carries three labelled lines, `Evidence:`, `Done when:` and `Needs the human's OK:`. |
| `people` | Everyone who has worked in the repo, each with `name`, `emails` (to merge one person's git identities), `now` (ids of the features they are on right now) and `trail` (their work history: entries of `date`, `summary`, `features`). `map.mjs scan` fills all of it from git. The page's picker switches between them. **Checked:** names are unique and every id exists. |
| `runBy` | The `name` of the person who ran this map. The picker starts on them. **Checked:** is one of `people`. |
| `planPaths` | The plan documents the promise was read from, as paths or globs in the repo. A refresh re-reads one only when it changed. |
| `facts` | Optional short chips under the counts, for conditions that colour everything else: the live build, "Email off". |
| `hasLive` | `false` when the project has no live site. The ladder then tops out at `tested`. |
| `tracker` | `"linear"`, `"github"` or `null`. |
| `artifact` | The published page's link, saved after the first publish. |
| `sources` | `scope`: what the promise was read from. `status`: what the statuses were read from and what was not rechecked. Plain sentences, shown at the foot of the page. |
| `bands` | Names of the diagram's rows, top to bottom, by who uses the boxes in them. |
| `parts` | The boxes. |
| `links` | Arrows, each `["from part id", "to part id"]`. **Checked:** both ends exist. |
| `features` | The promise. |
| `flows` | The main journeys. |
| `questions` | What you could not settle from evidence and need the human to answer: `question`, `why`, `since`. Each gets an answer box on the page. |
| `since` | On a question, a pending item and a feature's `blocked`: the date it was first raised. It stays the same while the item rolls over from run to run, and the page shows "open since" for anything older than this run. **Checked:** a date when present. |
| `pending` | Proposals waiting for the human's OK: `title`, `note`, `source`. |
| `parked` | Features not in this release: `title`, `note`. |
| `matrices` | Optional access tables, such as which account type can do what. See "A matrix" below. The page gets an **Access** view only when this list has at least one matrix. **Checked.** |

## A part (box)

`id`, `title` (20 characters or fewer; longer ones are cut off in the diagram), `band` (index into `bands`), `col` (column, from 0), optional `external: true` for an outside service, optional `note`.

**Checked:** ids are unique; no two parts share a band and column; every part has at least one feature unless it is external.

## A feature

| Field | What it holds |
|---|---|
| `id` | Short and stable. It never changes once set, because runs are compared by id. |
| `title` | Plain words, as the human would say it to a client. |
| `part` | The id of its box. **Checked.** |
| `paths` | The files this feature lives in: folders, files, or globs with `*` and `**`, from the repo root. Tests that exercise it belong here too. A refresh rechecks a feature only when one of these changed, so a feature with no `paths` is rechecked every time. |
| `status` | `none`, `progress`, `built`, `tested` or `live`. **Checked.** |
| `evidence` | What earned the status, as something the human could go and look at. **Checked:** required above `none`. |
| `next` | Optional. The one thing that would move it up a step. |
| `blocked` | Optional. `kind` (`decision`, `off`, `build`) and `note`. **Checked.** |
| `work` | The feature's open ticket and branch: `who` (the ticket's assignee, as the tracker shows it), `ticket`, `url`, `branch`. `branch` is the bare name as `git branch` prints it, and may stand without the other three. Readers outside this skill use it to match live work to a feature. **Checked:** `who` is allowed only when `tracker` is `linear` or `github`, and needs `ticket` and `url`; `branch` has no spaces and no `origin/` or `refs/` prefix. |
| `checked` | Date its evidence was last looked at. **Checked.** |
| `source` | Where it was promised. **Checked:** required. |

## A flow

`title`, optional `lanes` (a list of names), and `steps`. Each step has a `title` and `features`:

- a list of feature ids, when the step is the same in every lane;
- or an object of lane name to feature ids, when lanes differ. A lane left out of the object skips that step.

The page colours a step by its least-proven feature and marks where each lane stops: the first step below `tested`, or blocked.

**Checked:** every feature id exists; every lane named in a step is in `lanes`.

## A matrix

A table of columns against rows, with a tick where a column has a row: account types against what each can do, plans against what each includes. Each matrix is one section of the Access view.

| Field | What it holds |
|---|---|
| `title` | The section heading. **Checked:** required, unique, and not a heading the page already uses ("Board", "Questions for you"). |
| `note` | Optional. One or two sentences under the title: where the table comes from, what it leaves out. |
| `columns` | `key`, `label`, optional `sub` (a short second line, such as a version). **Checked:** at least one; keys unique. |
| `groups` | Row groups, each with `label` and `rows`. A row has `key`, `label`, optional `explanation` (one line, shown on hover and when the row is tapped) and optional `tag` (a short marker beside the label, such as "assigned only"). **Checked:** at least one group; each group has rows; row keys unique across the matrix. |
| `cells` | The ticks, as `[column key, row key]` pairs. **Checked:** both keys exist; no pair twice. |
| `questions` | Optional. Open questions about the table, as plain text, listed under it. |

Counts (ticks per column, per row) are worked out by the page from `cells`. Never write a count into the map. Write the matrix from a source the human can check (a command's output, the role definitions in the code), not by hand, and say which in `note`.

```json
"matrices": [
  {
    "title": "What each staff role can do",
    "note": "Read from src/staff/roles.ts.",
    "columns": [ { "key": "ramp", "label": "Ramp crew" }, { "key": "manager", "label": "Sailing manager", "sub": "version 2" } ],
    "groups": [
      { "label": "Boarding", "rows": [
        { "key": "scan", "label": "Scan tickets", "explanation": "Check a ticket at the ramp.", "tag": "own sailing only" },
        { "key": "delay", "label": "Mark a sailing late", "explanation": "Set a new departure time." }
      ] }
    ],
    "cells": [ ["ramp", "scan"], ["manager", "scan"], ["manager", "delay"] ],
    "questions": ["Should ramp crew also mark a sailing late?"]
  }
]
```

The page draws each matrix as a real table with column and row headers; each tick is announced as "column: row". Tapping a column header shows only the rows it ticks; tapping a row shows which columns tick it; tapping again clears. On a phone the table scrolls sideways inside its own box, with the row labels held in place.

A map without `matrices` gets exactly the page it had before access tables existed: the build leaves the template's access-table code out. That code sits in `template.html` between lines reading `/*<matrices>*/` and `/*</matrices>*/`; keep those lines when changing a project's copy. A project's copy without them shows no access table, and the build says `TEMPLATE OUT OF DATE`.

## A patch

What `map.mjs apply <file>` takes: a JSON object holding only what changes. Every key is optional.

```json
{
  "features": { "refunds": { "status": "tested", "evidence": "tests/payments/refund.test.ts passes in CI run 840.", "blocked": null } },
  "rechecked": ["card-payment"],
  "add": [ { "id": "gift-cards", "title": "Gift cards", "part": "checkout", "source": "Client message, 14 Nov", "paths": ["src/payments/giftcard.ts"] } ],
  "remove": ["loyalty-points"],
  "top": { "recap": "…", "nextSteps": [], "questions": [] }
}
```

- `features`: fields to set on a feature, by id. `null` removes a field. Setting `status` or `evidence` stamps `checked` with today.
- `rechecked`: features you looked at and left unchanged. Their `checked` is stamped.
- `add`: new features. `status` defaults to `none`.
- `remove`: feature ids to drop. They are also taken out of flows and work trails.
- `top`: top-level fields to replace whole, such as `recap`, `headline`, `nextSteps`, `questions`, `pending`, `parked`, `sources`.

## history.json

The build writes `system-map/history.json` beside the map on every run, for readers outside this skill. Leave it to the build: it is rewritten whole each time.

```json
{
  "project": "Tidewater Ferries booking",
  "updated": "2026-11-12",
  "hasLive": true,
  "points": [
    { "date": "2026-11-04", "total": 11, "blocked": 4, "counts": { "none": 4, "progress": 3, "built": 3, "tested": 1, "live": 0 } },
    { "date": "2026-11-12", "total": 12, "blocked": 4, "counts": { "none": 2, "progress": 2, "built": 3, "tested": 3, "live": 2 } }
  ]
}
```

`points` holds one entry per refresh date, oldest first, read from the last 60 committed versions of `map.json` plus the map being built. The page's "Progress over time" is drawn from the same series. The map's age, the per-area percentages and the board are computed from the map's own fields.
