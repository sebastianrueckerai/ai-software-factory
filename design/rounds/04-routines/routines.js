// The routines round's data: the four routines and the two jobs of the project
// in four moments, layered over the console round's scenarios
// (../../prototypes/scenarios.js) and the multi-chat round's threads
// (../02-multi-chat/multichat.js). Every string is page copy. Every variant
// draws from this file, so the variants differ in design only.
window.ROUTINES = {
  word: "routine",
  moments: ["due", "filed", "held", "audit"],
  momentWords: {
    due: "Monday 05:40: the weekly bump files in 20 minutes, everything on time",
    filed: "Monday 06:00: the weekly bump card #790 just landed in Needs you",
    held: "Monday 06:00: last week's #781 is still open, so this week's run is held",
    audit: "Monday 11:12: the audit reached 20 merges and runs as #792"
  },
  now: { due: "Mon 13 Oct 05:40", filed: "Mon 13 Oct 06:00", held: "Mon 13 Oct 06:00", audit: "Mon 13 Oct 11:12" },
  acts: { skip: "Skip once", run: "Run now" },
  actWords: {
    skip: "skips the next run and says so in the routine's runs; the rhythm stays",
    run: "files the card now; the next run keeps its time",
    change: "a change of rhythm is a configuration change: ask the project agent, it proposes the commit"
  },
  jobs: [
    { name: "Backup", schedule: "daily 02:00", last: "02:00 ok", kind: "job" },
    { name: "Forgejo dump", schedule: "daily 02:30", last: "02:30 ok", kind: "job" }
  ],
  config: 'routines:\n  - name: weekly-bump\n    title: Weekly bump of the pinned outside inputs\n    every: week\n    at: "Mon 06:00"\n    files: human\n    repository: ai-software-factory-code\n    brief: routines/weekly-bump.md\n    while_open: hold\n    tell: inbox',
  brief: "The factory pins every outside input of its builds and its cluster: nothing moves until this card moves it. Bump each to the newest release of its line in one pull request: the outside images and charts in upstream-images.txt, the Debian snapshot, the PostgreSQL versions, the Go toolchain, the downloaded tools.",
  // the runs of the weekly bump, newest first
  runs: [
    { n: 14, when: "Mon 6 Oct 06:00", card: "#781", outcome: "merged", duration: "2 d 3 h", cost: "€0.00", note: "bumped 11 of 38 lines; PostgreSQL 17.6, Go 1.25.3" },
    { n: 13, when: "Mon 29 Sep 06:00", card: "#742", outcome: "merged", duration: "1 d 9 h", cost: "€0.00", note: "bumped 4 of 38 lines" },
    { n: 12, when: "Mon 22 Sep 06:00", card: "#701", outcome: "closed", duration: "6 d 2 h", cost: "€0.00", note: "closed without a merge: Talos 1.12 waits for the node upgrade" },
    { n: 11, when: "Mon 15 Sep 06:00", card: "", outcome: "skipped", duration: "", cost: "", note: "skipped once by sebastian" },
    { n: 10, when: "Mon 8 Sep 06:00", card: "#655", outcome: "merged", duration: "4 h", cost: "€0.00", note: "bumped 2 of 36 lines" },
    { n: 9, when: "Mon 1 Sep 06:00", card: "#630", outcome: "merged", duration: "1 d 1 h", cost: "€0.00", note: "bumped 7 of 36 lines" }
  ],
  // the routines of a moment; state is "on time", "due", "open", "held" or "running"
  routines: function (moment) {
    var bump = { id: "weekly-bump", name: "Weekly bump", title: "Weekly bump of the pinned outside inputs", every: "every Monday 06:00", kind: "human card",
      whileOpen: "hold", tell: "inbox", next: "Mon 06:00", nextIn: "in 20 min", state: "due",
      last: { when: "Mon 6 Oct", card: "#781", outcome: "merged", detail: "merged in 2 days" }, runs: 14 };
    var template = { id: "template-pass", name: "Template pass", title: "Template update", every: "hourly and on a configuration version", kind: "pull request",
      whileOpen: "fold", tell: "quiet", next: "06:03", nextIn: "in 23 min", state: "on time",
      last: { when: "05:03", card: "", outcome: "no change", detail: "no change" }, runs: 1312 };
    var deps = { id: "dependency-update", name: "Dependency update", title: "Dependency update: go.mod and package.json, patch and minor", every: "every Thursday 06:00", kind: "agent card",
      whileOpen: "hold", tell: "quiet", next: "Thu 06:00", nextIn: "in 3 d", state: "on time",
      last: { when: "Thu 9 Oct", card: "#779", outcome: "merged", detail: "merged, 6 modules" }, runs: 9 };
    var audit = { id: "audit", name: "Audit", title: "Audit: bug hunt and architecture review", every: "after 20 merges", kind: "agent card",
      whileOpen: "hold", tell: "inbox", next: "after 6 more merges", nextIn: "14 of 20", state: "on time",
      last: { when: "Thu 2 Oct", card: "#702", outcome: "3 findings", detail: "3 findings filed as cards" }, runs: 4 };
    if (moment === "filed") {
      bump.state = "open"; bump.open = "#790"; bump.next = "Mon 20 Oct 06:00"; bump.nextIn = "in 7 d";
      bump.last = { when: "today 06:00", card: "#790", outcome: "open", detail: "filed, waits for you" }; bump.runs = 15;
      template.next = "06:03"; template.nextIn = "in 3 min";
    }
    if (moment === "held") {
      bump.state = "held"; bump.open = "#781"; bump.next = "Mon 20 Oct 06:00"; bump.nextIn = "in 7 d";
      bump.last = { when: "Mon 6 Oct", card: "#781", outcome: "open", detail: "open since Mon 6 Oct, 7 d" };
      bump.held = "held: #781 is still open";
      template.next = "06:03"; template.nextIn = "in 3 min";
    }
    if (moment === "audit") {
      bump.state = "open"; bump.open = "#790"; bump.next = "Mon 20 Oct 06:00"; bump.nextIn = "in 7 d";
      bump.last = { when: "today 06:00", card: "#790", outcome: "open", detail: "filed, waits for you" }; bump.runs = 15;
      audit.state = "running"; audit.open = "#792"; audit.next = "after 20 more merges"; audit.nextIn = "0 of 20";
      audit.last = { when: "today 11:04", card: "#792", outcome: "running", detail: "building, 8 min" }; audit.runs = 5;
      template.next = "12:03"; template.nextIn = "in 51 min"; template.last = { when: "11:03", card: "", outcome: "no change", detail: "no change" };
    }
    return [bump, template, deps, audit];
  },
  // cards a moment adds to the board; column is needs-you, queued, in-progress or done
  cards: function (moment) {
    var done = [
      { ref: "#781", title: "Weekly bump of the pinned outside inputs", column: "done", status: "done", routine: "weekly-bump", run: 14, age: "6 d" },
      { ref: "#779", title: "Dependency update: go.mod and package.json, patch and minor", column: "done", status: "done", routine: "dependency-update", run: 9, age: "3 d" }
    ];
    if (moment === "filed") return [
      { ref: "#790", title: "Weekly bump of the pinned outside inputs", column: "needs-you", status: "waiting on you", routine: "weekly-bump", run: 15, age: "under a minute",
        need: "a human card: bump the pinned inputs to the newest release of each line", actions: ["Open", "Close"] }
    ].concat(done);
    if (moment === "held") return [
      { ref: "#781", title: "Weekly bump of the pinned outside inputs", column: "needs-you", status: "waiting on you", routine: "weekly-bump", run: 14, age: "7 d",
        need: "a human card: bump the pinned inputs to the newest release of each line", actions: ["Open", "Close"] },
      done[1]
    ];
    if (moment === "audit") return [
      { ref: "#790", title: "Weekly bump of the pinned outside inputs", column: "needs-you", status: "waiting on you", routine: "weekly-bump", run: 15, age: "5 h",
        need: "a human card: bump the pinned inputs to the newest release of each line", actions: ["Open", "Close"] },
      { ref: "#792", title: "Audit: bug hunt and architecture review", column: "in-progress", status: "building", routine: "audit", run: 5, age: "8 min",
        activity: "reading internal/factoryd/gates.go · coding-cheap · €0.31" }
    ].concat(done);
    return done;
  },
  // the inbox turns a moment adds, newest last; decider is the faint line under a poke
  pokes: function (moment) {
    if (moment === "due") return [
      { who: "the factory", at: "05:40", poke: true, text: "In 20 minutes I file the weekly bump card. Last week's #781 merged in 2 days.",
        decider: "routine weekly-bump · every Monday 06:00", choices: ["Skip this week", "Run now", "Fine"] }
    ];
    if (moment === "filed") return [
      { who: "the factory", at: "06:00", poke: true, text: "Filed #790, the weekly bump of the pinned outside inputs. It waits for you: an agent's sandbox reaches no registry. Last week's #781 bumped 11 lines.",
        decider: "routine weekly-bump · run 15 · every Monday 06:00", choices: ["Open #790", "Close it"] }
    ];
    if (moment === "held") return [
      { who: "the factory", at: "06:00", poke: true, text: "The weekly bump is held: #781 from last Monday is still open. The next run is Monday 20 October, unless #781 closes first.",
        decider: "routine weekly-bump · while open: hold", choices: ["Open #781", "Run now anyway"] }
    ];
    if (moment === "audit") return [
      { who: "the factory", at: "06:00", poke: true, text: "Filed #790, the weekly bump of the pinned outside inputs. It waits for you.",
        decider: "routine weekly-bump · run 15 · every Monday 06:00", choices: ["Open #790", "Close it"] },
      { who: "the factory", at: "11:04", poke: true, text: "The 20th merge since the last audit landed with #788. Started #792, the audit: a bug hunt and an architecture review over the whole repository.",
        decider: "routine audit · run 5 · after 20 merges · assisted level · started by the factory", choices: ["Open #792"] }
    ];
    return [];
  },
  // the drawer's Routine section on a routine's card, and the provenance line
  provenance: function (card) {
    var r = { "weekly-bump": "Weekly bump", "dependency-update": "Dependency update", "audit": "Audit" }[card.routine];
    return "filed by the factory · routine " + r + " · run " + card.run;
  }
};
