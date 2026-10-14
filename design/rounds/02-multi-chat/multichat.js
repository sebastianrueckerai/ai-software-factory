// The multi-chat round's data: the threads of the five moments, layered over the
// console round's scenarios (../../prototypes/scenarios.js). Every string is page
// copy. A thread: id, title, inbox (the factory's own thread), at (its last turn),
// unread, working (a turn in flight), archived, messages (who, at, text, tools,
// proposal, choices on a poke or an escalation, decider on an agent's own start).
window.MULTICHAT = {
  levels: ["manual", "assisted", "autonomous", "full auto"],
  levelWords: {
    manual: "every action of the agent confirms, as today",
    assisted: "the agent starts and files ready work by itself; direction, money and merges still ask",
    autonomous: "the chat's remaining confirms go off; merges follow the merge rule; direction and money still ask",
    "full auto": "autonomous with the merge rule on auto: nothing waits for a person but direction and money"
  },
  inboxName: "Inbox",
  // the base threads of the busy moment; a moment may replace any part
  base: function () {
    return [
      { id: "inbox", title: "Inbox", inbox: true, at: "14:19", unread: 2, messages: [
        { who: "agent", at: "13:46", poke: true, text: "#603 asks which store the session table should use. The plan named Postgres; the brief allows SQLite for a single replica.", choices: ["Postgres", "SQLite", "Ask the author"] },
        { who: "agent", at: "14:19", poke: true, text: "Merge PR #612 waits for you: high risk, one migration. The model review approves; the audit found a missing default on the new column.", choices: ["Approve", "Deny", "Open the card"] }
      ] },
      { id: "members", title: "Plan: the members page", at: "14:26", working: true, messages: [
        { who: "you", at: "14:24", text: "Plan the members page: who is on the project, their roles, invite by Forgejo login." },
        { who: "agent", at: "14:26", text: "Reading the roadmap's item 185 and the approver rules first.", tools: [{ name: "read doc roadmap.md", args: "{\"section\":\"185\"}", result: "185. Members page: the project's members with their roles…", duration: "0.6 s" }], streaming: true }
      ] },
      { id: "session-store", title: "Session store: Postgres", at: "14:21", messages: [
        { who: "you", at: "14:21", text: "Why is #603 waiting?" },
        { who: "agent", at: "14:21", text: "#603 asked which store the session table should use. The plan named Postgres; the brief allows SQLite for a single replica. I can answer Postgres for you.",
          tools: [{ name: "read card #603", args: "{\"id\":\"t-7c1e55a2d9f0\"}", result: "waiting on a human since 13:46: Which store should the session table use?", duration: "0.4 s" }],
          proposal: { title: "I will:", changes: ["answer #603 with Postgres"], detail: "the answer posts on issue #603 as sebastian" } }
      ] },
      { id: "costs", title: "Costs read: the date window", at: "yesterday", messages: [
        { who: "you", at: "16:40", text: "Give the costs page a from and a to date." },
        { who: "agent", at: "16:41", text: "Filed #620 \"Costs read: a from and a to date\" with the acceptance criteria from your words. It waits on #612 and #609, which touch the same ledger read." }
      ] },
      { id: "export", title: "Export in pull request mode", at: "2 days ago", archived: true, messages: [
        { who: "you", at: "11:02", text: "Export the project to GitHub in pull request mode." },
        { who: "agent", at: "11:03", text: "Filed #621 from plan #558. The export runs in pull request mode once the mirror is set." }
      ] }
    ];
  },
  moments: {
    // the console round's busy moment with the threads beside it
    busy: { level: "manual", open: "session-store" },
    // a second thread open while the first runs a turn: the switcher shows the open thread, a working mark and an unread mark
    threads: { level: "manual", open: "costs", patch: function (t) {
      t.costs.at = "14:28";
      t.costs.messages.push({ who: "you", at: "14:27", text: "And a preset for the last seven days." },
        { who: "agent", at: "14:28", text: "Added to #620's acceptance criteria: a \"last 7 days\" preset beside the two dates. The card is still queued; nothing started." });
      t["session-store"].working = true;
      t["session-store"].messages[1].streaming = true;
      delete t["session-store"].messages[1].proposal;
      t["session-store"].messages[1].text = "#603 asked which store the session table should use. The plan named";
      t.inbox.unread = 1;
      t.inbox.messages.pop();
    } },
    // a poke arriving while another thread is open: the badge appears on the row and in the tab title
    poke: { level: "manual", open: "session-store", patch: function (t) {
      t.inbox.unread = 1;
      t.inbox.messages = [t.inbox.messages[0], { who: "agent", at: "14:31", poke: true, fresh: true, text: "#616 is done: Chat form: center the Send button. Merged, 32 min in all, €0.01." }];
      t.inbox.at = "14:31";
      t.members.working = false;
      t.members.messages[1].streaming = false;
      t.members.messages[1].text = "Read the roadmap's item 185 and the approver rules. The plan is four cards; I will file them once you say so.";
    } },
    // the level is assisted: the inbox carries the agent's own start of a ready card, with its decider
    assisted: { level: "assisted", open: "inbox", patch: function (t) {
      t.inbox.unread = 0;
      t.inbox.messages = [
        { who: "agent", at: "09:12", poke: true, text: "Filed #624 \"Costs page: the date window form\" from the roadmap's item 206: acceptance criteria present, size small, priced at €1.60.", decider: "assisted level · filed by the agent" },
        { who: "agent", at: "09:12", poke: true, text: "Started #624. 2 of 5 slots in use, backlog 3 of 8.", decider: "assisted level · started by the agent" },
        { who: "agent", at: "09:40", poke: true, text: "#624 is done: Costs page: the date window form. Merged by the merge rule after the review's approve, 28 min in all, €0.22." }
      ];
      t.inbox.at = "09:40";
      t.members.working = false;
      t.members.messages[1].streaming = false;
      t.members.at = "yesterday";
    } },
    // the level is autonomous: the inbox carries a direction question with its choices beside the text box
    escalation: { level: "autonomous", open: "inbox", patch: function (t) {
      t.inbox.unread = 0;
      t.inbox.messages = [
        { who: "agent", at: "13:02", poke: true, text: "Started #631 \"Members: the approver list\" and #632 \"Members: invite by Forgejo login\". 4 of 5 slots in use.", decider: "autonomous level · started by the agent" },
        { who: "agent", at: "13:46", poke: true, escalation: true, text: "A direction question on #603, which I may not answer at any level: which store should the session table use? The plan named Postgres; the brief allows SQLite for a single replica. Postgres keeps one store for every replica; SQLite spares the Postgres dependency on a single one.", choices: ["Postgres", "SQLite", "Ask the author"], card: 603 }
      ];
      t.inbox.at = "13:46";
      t.members.working = true;
    } }
  },
  // threadsOf builds the moment's threads from the base and its patch
  threadsOf: function (name) {
    var m = this.moments[name] || this.moments.busy, list = this.base(), byId = {};
    list.forEach(function (t) { byId[t.id] = t; });
    if (m.patch) m.patch(byId);
    return { level: m.level, open: m.open, threads: list };
  }
};
