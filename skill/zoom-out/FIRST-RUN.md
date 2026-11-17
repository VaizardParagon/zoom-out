# First run

There is no map yet. Build the promise from the plan, get the human's confirmation, then join Refresh.

The plan is the source of the promise. Code is only a cross-check: a feature nobody has started exists only in the plan, and those are the ones the human most needs to see.

1. **Gather every source of the promise.**
   - The wayfinder map: the tracker issue labelled `wayfinder:map`, its Destination, its closed child tickets and its Out of scope list.
   - Specs, PRDs, proposals and plan documents in the repo.
   - Tracker epics, projects and milestones.
   - Whatever the human handed over with the command.

   Then ask the human once: "Is there anything else that says what was promised, such as interview notes, meeting notes or client messages?" Done when every source found has been read in full and the human has answered.

2. **Draft the features.** A feature is one thing a person can do with the system, or one thing the system must do, small enough to have a single status. Title each in the human's plain words, the way they would say it to a client. Give each a `source`, and `paths`: the files it lives in and the tests that exercise it, which is what lets later refreshes skip it when nothing there changed. Record the plan documents you read in `planPaths`. Things the plan rules out go to `parked`. Then scan the code for anything built that the draft lacks, and hold those as proposals for step 5.

3. **Draft the boxes.** A box (`parts`) is a screen someone uses or a part working in the background. Aim for 10 to 25, with titles of 20 characters or fewer, and put every feature in exactly one box. Group boxes into `bands` by who uses them (for example applicants, staff, background). Add `links` for how a person or the data moves from one box to the next, and choose each box's `col` so linked boxes sit side by side or directly above and below each other. An outside service the system depends on is a box marked `external`.

4. **Draft the flows.** A flow is a main journey through the system from start to finish, usually one to three per project. Each step lists the features that must work for that step to work. When the same journey runs differently for different kinds of thing (company, B2B licence, B2C licence), give the flow `lanes`.

5. **Confirm with the human.** Show, compactly: `about`, your one or two plain sentences on what this system is and who uses it, which head the page; the feature count; each box with its feature titles; the flows with their steps; the parked list; the proposals found in code. Ask what is missing, wrong or should go. Apply their answers. Done when the human has said the list is the promise. With no human present, stop here and say the map needs their confirmation.

6. **Check the page fits** (see "Does the default page fit?" in `SKILL.md`). Set `hasLive` to false when the project has no live site.

7. **Write the map and run a full Refresh.** Write `system-map/map.json` with every feature at `none`, then follow Refresh in `SKILL.md` using `map.mjs scan --all`, so every feature is rechecked once. `MAP-FORMAT.md` has the format.
