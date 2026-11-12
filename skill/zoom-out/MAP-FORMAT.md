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
| `nextSteps` | One to five suggested moves, most valuable first. Each has `step`, `why`, and optional `skill` (a slash command such as `/to-questionnaire`). **Checked.** |
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

## A part (box)

`id`, `title` (20 characters or fewer; longer ones are cut off in the diagram), `band` (index into `bands`), `col` (column, from 0), optional `external: true` for an outside service, optional `note`.

**Checked:** ids are unique; no two parts share a band and column; every part has at least one feature unless it is external.

## A feature

| Field | What it holds |
|---|---|
| `id` | Short and stable. It never changes once set, because runs are compared by id. |
| `title` | Plain words, as the human would say it to a client. |
| `part` | The id of its box. **Checked.** |
| `status` | `none`, `progress`, `built`, `tested` or `live`. **Checked.** |
| `evidence` | What earned the status, as something the human could go and look at. **Checked:** required above `none`. |
| `next` | Optional. The one thing that would move it up a step. |
| `blocked` | Optional. `kind` (`decision`, `off`, `build`) and `note`. **Checked.** |
| `work` | The feature's open ticket in the tracker: `who` (the ticket's assignee, as the tracker shows it), `ticket`, `url`, `branch`. **Checked:** `who` is allowed only when `tracker` is `linear` or `github`, and needs `ticket` and `url`. |
| `checked` | Date its evidence was last looked at. **Checked.** |
| `source` | Where it was promised. **Checked:** required. |

## A flow

`title`, optional `lanes` (a list of names), and `steps`. Each step has a `title` and `features`:

- a list of feature ids, when the step is the same in every lane;
- or an object of lane name to feature ids, when lanes differ. A lane left out of the object skips that step.

The page colours a step by its least-proven feature and marks where each lane stops: the first step below `tested`, or blocked.

**Checked:** every feature id exists; every lane named in a step is in `lanes`.
