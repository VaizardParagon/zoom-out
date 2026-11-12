# Handoff: grill and build a "system map" skill

Written 12 Nov 2026 from a session that built a one-off progress page for a client project. The user liked what that page accomplished and wants it turned into a reusable skill. This session is to grill the idea until the design is settled, then write the skill.

## The problem the user described

Working with coding agents is "zoomed in": one feature, or one part of a feature, at a time. Over a build the user loses the whole picture:

- how big the system is and how many features it has
- how much is done and how much is not
- parts of the system they forgot exist
- an answer when a client asks "how far along are you?"
- confidence that an inventory, once taken, is complete

Their planning flow (`/wayfinder`, then grilling sessions) establishes what to build, but nothing afterwards zooms back out and shows it. Context drops during development, for the human as much as the agent.

## What the user wants

A skill that follows on from the wayfinder map and produces a **system map**: what was promised (goal, plan, full feature inventory) with current progress laid over it. In their words, "zooming out very far and looking at the project from a bird's-eye view".

Stated wishes, roughly in the order they gave them:

1. Invoke it mid-project with a slash command. It reads the code, updates where things stand since last time, and refreshes the visual.
2. A canvas-style system map, more in-depth than the worked example below. They named React Flow as the library they imagine.
3. Each part shows done, in progress or not started, with the latest update on it.
4. Selecting an in-progress part shows what exactly is in progress and who is assigned, from the issue tracker in use (Linear or GitHub issues).
5. Tied to git: which parts people are working on, what is running on which branch.
6. If possible, running agents on each part and how much longer they have. They accept "what is running" if time remaining is impossible.
7. A second view like the worked example: a stepper per flow showing what has been tested and what has not.
8. Wish-list: self-updating. They assume it probably needs its own session to run.

Undecided by the user: artifact or hosted page. Skill name is not chosen.

## The worked example

- Published page: https://claude.ai/artifact/LPoefEc2KCWKBpsCsQLDEk (shared by link). Read it with the Artifact tool, not a web fetch.
- Page source: `reference/worked-example/portal-pipeline-status.html`
- Generator that filled the feature grid from data: `reference/worked-example/fill_scope.py`
- The data it read: `reference/worked-example/scope-data.js` (line 4 holds a JSON blob of 24 feature groups, 127 features, each with status, evidence and next step). Readable outline: `reference/worked-example/scope-data-outline.txt`

These files are real data from a client project. Use them as a reference for shape and presentation. Do not ship them inside the skill or push them to a public repository.

What the user said they liked about it:

- The stepper: a visual track of the main flow showing which steps are proven and where it breaks.
- It told them something at a glance. They contrasted it with a competing page built from the same data, which they called "text overload" that "doesn't really tell me anything". That page used collapsible tables of feature, evidence and next step for every item, expanded by default in places.

What made the example work, as observed while building it (my reading, not the user's words):

- Lanes per application type across the same steps showed that progress differs by type.
- Status had levels of proof, not just done or not done: proven on the live site, works on a dev machine only, partly built, blocked, not built.
- Blockers were sorted by kind: waiting on a client decision, switched off in the live environment, still to build. Only one kind is coding.
- One square per feature gave the size of the whole system on one screen, with detail behind a click.
- The grid was generated from a data file, so counts were computed and a refresh was cheap.
- The page stated where its facts came from and what had not been rechecked.

## Advice already given to the user

They asked how to make this a skill (via `/ask-matt`). The recommendation was to treat it as two builds:

1. **A small skill first**: inventory, status file, refreshed page. Single-session to write. User-invoked (`disable-model-invocation: true`).
2. **The canvas app later**: React Flow, live git and tracker data. Multi-session, so `/to-spec`, `/to-tickets`, `/implement`.

Not `/wayfinder` for this: version one is small enough to hold in one session.

The user has not confirmed or rejected that split. Check it in the grilling.

## Open decisions for the grilling

- **Where the map lives.** Suggested: a data file in each repo (every feature, its flow, status, evidence for that status, tracker link), which the skill updates and the page is drawn from. Without it each run re-inventories from scratch and answers differently.
- **What defines "promised".** Suggested: the wayfinder map and spec are the source of scope, and the skill compares promise against code, tests and tracker. Guessing scope from code misses unbuilt features, which is the exact failure the user wants to avoid.
- **Status levels and what counts as evidence for each.** The example's five levels are one option. They came from that project and may not generalise.
- **How the skill learns status.** Reading code, test results, tracker state, commit history, or asking the user. How much it may claim without running anything.
- **Snapshot or live.** An artifact is a snapshot refreshed on each run. Live assignees and branch activity most likely need a hosted page or a scheduled run. Unverified: whether an artifact can read Linear or GitHub directly. Check the `artifact-capabilities` skill before deciding.
- **Running agents.** The user runs agents in herdr terminals. `hc ls` returns each live terminal's agent, folder and working or idle status, so "what is running where" is feasible. It does not report time remaining.
- **Self-updating.** `/schedule` or `/loop` could rerun the skill. Not explored.
- **Views.** At least two were asked for: the system map canvas and the tested-or-not stepper. Whether both belong in version one.
- **How it connects to wayfinder.** Wayfinder maps are issues labelled `wayfinder:map` on the repo's tracker with decisions as child issues (see `C:\Users\harve\.claude\skills\wayfinder\SKILL.md`). The system map would need to read from that, or from the spec `/to-spec` produces from it.
- **Where the skill is developed.** Its own directory, not the client project's worktree. The user's skills live in `C:\Users\harve\.claude\skills\`.

## User preferences seen this session

- Plain, visual, low-text output. They reacted strongly against dense tables and jargon.
- They work across Claude Code and Codex and across several projects at once, in herdr split panes.
- They dictate requirements by voice, so expect loose phrasing and restate it back before building on it.

## Suggested skills

- `grill-with-docs` first, if the new session is in a directory for the skill. Otherwise `grill-me`.
- `prototype` (UI branch) when the question becomes what the canvas should look like.
- `writing-for-agents`, including its `SKILL-MECHANICS.md`, when writing the skill itself.
- `artifact-capabilities` and `artifact-design` if the output is an artifact.
- `dataviz` for the status colours and the feature grid.
- `hc` if the map is to show running agents.
- `to-spec`, then `to-tickets`, only for the canvas app.
