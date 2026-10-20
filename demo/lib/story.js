// Studio Nord's two weeks: every card by issue, and the texts of the requests, asks, alerts, approvals and routine runs
// the scenes show. A scene reads a card's title and body from here, so a card reads the same in every scene.
const state = require("./state");

const project = require("./project");

const budgets = { small: 2, medium: 5, large: 10 };
const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

// The two weeks' calendar in UTC: week 1's Monday is 21 September 2026. A scene's time on it stands for the recording's
// now: a card's age counts back from now, and a routine's runs fall on its cron times before now.
const WEEK1 = Date.UTC(2026, 8, 21);
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// date is weekday of week at hm ("02:00").
function date(week, weekday, hm) {
  const [h, m] = hm.split(":").map(Number);
  return new Date(WEEK1 + (((week - 1) * 7 + WEEKDAYS.indexOf(weekday)) * DAY + h * HOUR + m * MIN) * 1000);
}

// body is the prose the card is filed with; acceptance its Acceptance list; pr its pull request; plan and key mark a
// planned card (its plan's issue and its key there). #100 is the last card before the two weeks: finished before the
// board's seven days, it shows on no board, and the lab numbers the first filing on from it.
const cards = {
  100: {
    title: "Footer: the studio's address and opening hours", size: "small", pr: 200,
    body: "The footer names the studio's address, its opening hours and a link to the map",
    acceptance: ["every page's footer shows the address, the hours and the map link"],
  },
  101: {
    title: "Waitlist when a class is full", size: "medium", pr: 201,
    body: "A full class takes waitlist sign-ups in order. A cancelled booking offers the seat to the first in line by mail",
    acceptance: [
      "a full class shows Join the waitlist in place of Book",
      "a cancellation mails the first member in line a link that holds the seat for 2 hours",
      "a seat unclaimed after 2 hours passes to the next in line",
    ],
  },
  102: {
    title: "Schedule page: GET /schedule under 400 ms at the p95", size: "small", pr: 202,
    body: "The latency alert on GET /schedule fired three times this week: its p95 crossed 1 s, and nothing fixed it",
    acceptance: [
      "the p95 of GET /schedule stays under 400 ms over a day of production traffic",
      "the latency alert on GET /schedule stays quiet for a week",
    ],
  },
  103: {
    title: "Class page: show the teacher and the room", size: "small", pr: 203,
    body: "Members want to know who teaches and in which room before they book",
    acceptance: ["the class page names the teacher and the room under its title"],
  },
  104: {
    title: "Checkout: 500 after the Stripe webhook change", size: "small", pr: 204,
    body: "SigNoz alert CheckoutErrors: POST /checkout/confirm answers 500 on 41% of requests since the Stripe webhook endpoint " +
      "moved to API version 2022-11-15, whose PaymentIntent carries latest_charge in place of charges.\n\n" +
      "TypeError: Cannot read properties of undefined (reading 'data')\n" +
      "    at confirmBooking (src/payments/webhook.ts:57:38)\n" +
      "    at handleStripeEvent (src/payments/webhook.ts:23:12)",
    acceptance: [
      "POST /checkout/confirm answers 2xx for a card payment again",
      "a test replays a payment_intent.succeeded event of API version 2022-11-15",
    ],
  },
  105: {
    title: "Calendar: rewrite it as week and month views", size: "large",
    body: "The calendar is one hand-built table: it cannot show a week, move a class or repeat one. Rebuild it on one model",
    acceptance: [
      "the calendar shows a week and a month",
      "a teacher drags a class to another slot and its bookings move with it",
      "a weekly class is one series, not a copy per week",
    ],
  },
  106: {
    title: "No confirmation mail after booking", size: "small", reporter: "maria.k",
    body: "I booked Thursday evening's Vinyasa class and paid, but no confirmation mail came. " +
      "A friend booked the same class the same way and got hers. Is my booking real?",
  },
  107: {
    title: "Confirmation mail: send it once the payment settles", size: "small", pr: 205,
    body: "Reported in #106: a payment settling after checkout closed sends no confirmation. The webhook sends it, once per booking",
    acceptance: [
      "a booking whose payment settles after the checkout page closed gets its confirmation mail",
      "a webhook delivered twice sends one mail",
    ],
  },
  108: {
    title: "Security: express 4.20.0 for CVE-2024-45296 in path-to-regexp", size: "small", routine: "security-scan", pr: 206,
    body: "The nightly scan found path-to-regexp 0.1.7 through express 4.19.2: CVE-2024-45296, high. A route with two " +
      "parameters in one segment backtracks on a crafted path, a denial of service. express 4.20.0 pins path-to-regexp 0.1.10",
    acceptance: ["npm audit reports no high finding", "the route tests pass on express 4.20.0"],
  },
  109: {
    title: "Calendar: one events model for classes and their repeats", size: "medium", plan: 105, key: "events-model", pr: 207,
    body: "Card events-model of plan #105, accepted by sebastian. A class is an event with a series rule; a booking points at one occurrence",
    acceptance: ["a weekly class is one row with its rule", "every booking keeps its occurrence after the migration"],
  },
  110: {
    title: "Calendar: the week view", size: "medium", plan: 105, key: "week-view", pr: 208,
    body: "Card week-view of plan #105, accepted by sebastian. Seven columns of the studio's hours, each class a block with its free places",
    acceptance: ["the week view shows every class of the week with its free places", "a member books from a block"],
  },
  111: {
    title: "Calendar: the month view", size: "small", plan: 105, key: "month-view", pr: 209,
    body: "Card month-view of plan #105, accepted by sebastian. A month of days, each with its classes' names and a count of free places",
    acceptance: ["the month view lists each day's classes", "a click on a day opens its week"],
  },
  112: {
    title: "Calendar: drag a class to move it, its bookings follow", size: "medium", plan: 105, key: "drag-move", pr: 212,
    body: "Card drag-move of plan #105, accepted by sebastian. A teacher drags a block to another slot, and its bookings move with it",
    acceptance: ["a dragged class keeps all its bookings", "a slot another class holds refuses the drop"],
  },
  113: {
    title: "Calendar: the week grid and its navigation", size: "small", parent: 110, pr: 210,
    body: "Split from #110 after it reached its budget: the empty week grid of the studio's hours, with the previous and next week",
    acceptance: ["the grid shows the studio's hours for seven days", "previous and next move a week"],
  },
  114: {
    title: "Calendar: class blocks in the week grid", size: "small", parent: 110, pr: 211,
    body: "Split from #110 after it reached its budget: each class as a block in the grid of #113, with its free places and Book",
    acceptance: ["every class of the week is a block with its free places", "a member books from a block"],
  },
  115: {
    title: "Weekly dependency bump", size: "small", routine: "dependency-bump", pr: 213,
    body: "Every dependency to the newest release of its line in one pull request; a major release gets a card of its own",
    acceptance: ["the lockfile names the newest release of each line", "the test suite passes"],
  },
  116: {
    title: "Booking: cancel up to 12 hours before class", size: "medium", pr: 214,
    body: "A member cancels a booking up to 12 hours before the class starts; the seat goes to the waitlist of #101",
    acceptance: [
      "Cancel shows until 12 hours before the class and not after",
      "a cancelled seat goes to the first member on the waitlist",
      "a cancel and a waitlist claim at the same moment leave one booking for the seat",
    ],
  },
  117: {
    title: "Reminder mail: send it 24 hours before class", size: "small", pr: 215,
    body: "Every booked member gets one reminder mail 24 hours before the class, with the room and a cancel link",
    acceptance: ["a booking gets one reminder 24 hours before its class", "a booking made later than that gets none"],
  },
  118: {
    title: "Schedule: filter by teacher", size: "small", pr: 216,
    body: "Members follow a teacher. The schedule gets a teacher filter, kept in the URL so a link shares it",
    acceptance: ["the schedule shows only the chosen teacher's classes", "the filter survives a reload"],
  },
  119: {
    title: "Schedule: 500 when no teacher is chosen", size: "small", pr: 217,
    body: "SigNoz alert ScheduleErrors: GET /schedule answers 500 on 63% of requests since e41b7c9, the merge of #118. " +
      "A schedule link without ?teacher fails.\n\n" +
      "TypeError: Cannot read properties of undefined (reading 'split')\n" +
      "    at parseTeacherFilter (src/schedule/filter.ts:12:27)\n" +
      "    at getSchedule (src/schedule/routes.ts:31:19)",
    acceptance: ["GET /schedule without ?teacher answers the whole week", "a test covers the link without a filter"],
  },
  120: {
    title: "Class pass: 10 classes, valid 6 months", size: "medium", pr: 218,
    body: "A member buys a pass of 10 classes by card. Each booking takes one class off it; the pass ends after 6 months",
    acceptance: [
      "a member with a pass books without paying again",
      "the account page shows the classes left and the end date",
      "a pass past its 6 months books nothing",
    ],
  },
  121: {
    title: "Account page: a member's past bookings", size: "small", pr: 219,
    body: "The account page lists a member's bookings of the last 12 months, newest first, with each class's date and teacher",
    acceptance: ["the account page lists the last 12 months of bookings", "a member sees only their own"],
  },
  122: {
    title: "Payments: refund a class the studio cancels", size: "medium", pr: 220,
    body: "When the studio cancels a class, every member who paid for it by card gets a refund through Stripe, once",
    acceptance: [
      "a class the studio cancels refunds every paid booking to its card",
      "a cancel sent twice refunds once",
      "a failed refund shows on the class's page for the studio",
    ],
  },
  123: {
    title: "Schedule page: p95 up from 0.31 s to 0.74 s since #118", size: "small", routine: "performance-read", pr: 221,
    body: "The weekly performance read: GET /schedule answers in 0.74 s at the p95 this week, up from 0.31 s after #102. " +
      "It rose with the merge of #118, whose teacher filter joins the teachers table per class",
    acceptance: ["the p95 of GET /schedule is back under 400 ms over a day of production traffic"],
  },
  124: {
    title: "Cost review: the month's spend by card", size: "small", routine: "cost-review",
    body: "The monthly cost review: the month's spend by card and by kind against the project's cap. Read it, then close the card",
  },
};

function card(issue) {
  const c = cards[issue];
  if (!c) throw new Error(`no card #${issue} in the story`);
  return c;
}

// description is issue's text as a person writes it: the prose and the Acceptance list.
function description(issue) {
  const c = card(issue);
  return c.acceptance ? `${c.body}\n\nAcceptance:\n${c.acceptance.map((a) => "- " + a).join("\n")}` : c.body;
}

// body is issue's issue body as factoryd keeps it: the description and the size line the console appends.
function body(issue) {
  return `${description(issue)}\n\nSize: ${card(issue).size}`;
}

// boardCard is issue's card for the board: o sets its status, lane and age, and may override the rest.
function boardCard(now, issue, o) {
  const c = card(issue);
  return state.card(now, {
    issue, title: c.title, body: body(issue), size: c.size, budget: budgets[c.size], parent: c.parent ?? c.plan, planKey: c.key, ...o,
  });
}

// filing is the new_card call that files issue from the chat.
function filing(issue, lane) {
  const c = card(issue);
  return { title: c.title, body: c.body, lane, size: c.size, acceptance: c.acceptance };
}

// requests are what Sebastian types into the chat.
const requests = {
  waitlist: "Members ask for a waitlist when a class is full.",
  schedule: "The schedule page feels slow.",
  calendar: "Rewrite the calendar.",
  report: "File a fix card for maria.k's report #106.",
  checkout: "Is checkout still failing?",
  scheduleCheck: "Is the schedule all right since #118 went live?",
  schedule500: "Has the schedule alert settled?",
};

// asks are the questions the agent and the factory put to a person, by story.
const asks = {
  waitlist: {
    issue: 101,
    question: "A waitlist fits the booking flow: a full class takes sign-ups in order, and a cancellation offers the seat " +
      "to the first in line. How does that member hear the seat is free?",
    choices: ["By mail", "In the app"],
    answer: "By mail",
  },
  move: { issue: 105, question: "Does moving a class mail the members booked on it?", choices: ["Mail every booked member", "Only when the day changes"] },
  budget: {
    issue: 110,
    question: "The card has €0.40 of its €5.00 budget left, and a session on big needs €0.60. Fund one more session?",
    choices: ["Fund one more session", "End the card"],
    split: [113, 114],
  },
  library: {
    issue: 113,
    question: "Which calendar library does the week grid build on? FullCalendar is the most used, Schedule-X the smallest, " +
      "TOAST UI Calendar the one with drag built in.",
    choices: ["FullCalendar", "Schedule-X", "TOAST UI Calendar"],
  },
  morning: [
    { issue: 117, question: "Does the reminder carry the class as a calendar file for the member's own calendar?", choices: ["Attach it", "Leave it out"] },
    { issue: 120, question: "Does an unused class of an expired pass come back as credit?", choices: ["No refund", "Refund as credit"] },
    { issue: 121, question: "Do cancelled bookings show in the account page's list?", choices: ["Show them, struck through", "Hide them"] },
  ],
};

// replies are the agent's words in the intake chats, beside its tool calls.
const replies = {
  waitlist: "By mail it is: the booking mails already go out through the mailer, so the seat offer uses it too. The card:",
  scheduleRead: "I measure it first: the telemetry's alerts on the page.",
  schedule: "The alerts agree with you: the rule on GET /schedule's **p95 above 1 s** fired three times this week " +
    "and settled each time without a fix. The card sets the bar at 400 ms:",
  calendar: "That is several cards: the week, the month, moving a class and the model under them. " +
    "I file it in the plan lane, where the planner splits it into cards in their order, and the plan waits for your accept:",
  report: "maria.k paid, and her confirmation never came, while a friend's did: the mail goes out only when the payment " +
    "settles before the checkout page closes. The fix sends it from Stripe's webhook, once per booking:",
  alertsRead: "I read the alerts.",
  scheduleCheckRead: "I read the open alerts and #118.",
  // scheduleBroken is the answer with the times the tools gave, as "14:07"
  scheduleBroken: (live, raised) => `No. **ScheduleErrors** has been open since ${raised} UTC, two minutes after #118 went live at ${live}, ` +
    "and #118 merged at its head **e41b7c9**. The factory files the fix from the alert.",
  checkout: "No. **CheckoutErrors** settled when #104 went live, with the verdict real, and no alert is open.",
  schedule500: "It has. **ScheduleErrors** rose minutes after the merge of #118 and settled when #119 went live, with the verdict real; " +
    "no alert is open.",
};

// alerts are the alert rows of the two weeks; a scene passes now and the ages to state.alert. raised and resolved
// date the telemetry's alerts on the calendar: the latency alert settled itself three times the week before, and an
// alert that filed a card settles real when the card goes live.
const alerts = {
  scheduleLatency: [
    { id: 11, kind: "alert", source: "GET /schedule p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd",
      raised: date(0, "fri", "20:00"), resolved: date(0, "fri", "20:30") },
    { id: 12, kind: "alert", source: "GET /schedule p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd",
      raised: date(0, "sat", "20:00"), resolved: date(0, "sat", "21:00") },
    { id: 13, kind: "alert", source: "GET /schedule p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd",
      raised: date(0, "sun", "20:00"), resolved: date(0, "sun", "21:00") },
  ],
  checkout: {
    id: 14, kind: "alert", source: "CheckoutErrors", task: 104, fingerprint: "b81e2f04a9c63d17", verdict: "real", resolvedBy: "factoryd",
    raised: date(1, "tue", "12:59"), resolved: date(1, "tue", "14:00"),
    detail: { summary: "POST /checkout/confirm answers 500 on 41% of requests", error: cards[104].body.split("\n\n")[1] },
  },
  budget: { id: 15, kind: "escalation", source: "cap", task: 110 },
  badMerge: {
    id: 16, kind: "alert", source: "ScheduleErrors", task: 119, fingerprint: "e07c4a92d15b8f3e", verdict: "real", resolvedBy: "factoryd",
    raised: date(2, "thu", "17:19"), resolved: date(2, "thu", "17:54"),
    detail: { summary: "GET /schedule answers 500 on 63% of requests since e41b7c9", error: cards[119].body.split("\n\n")[1] },
  },
};

// alertsAt are the telemetry's alert rows raised by the story's time at, newest first, each naming its card once the
// card is filed and settled with its verdict once at passed its resolve.
function alertsAt(now, at) {
  const age = (d) => (at - d) / 1000;
  return [alerts.badMerge, alerts.checkout, ...alerts.scheduleLatency.slice().reverse()].filter((a) => a.raised <= at).map((a) => {
    const settled = a.resolved <= at;
    return state.alert(now, {
      ...a, task: filed[a.task] <= at ? a.task : undefined, age: age(a.raised), resolvedAge: settled ? age(a.resolved) : undefined,
      verdict: settled ? a.verdict : undefined, resolvedBy: settled ? a.resolvedBy : undefined,
    });
  });
}

// approvals are the plans and merges that wait on a person.
const approvals = {
  calendarPlan: {
    id: 21, kind: "plan", task: 105,
    brief: "The planner splits the calendar rewrite into four cards: the events model, the week and month views beside each other, then drag to move.",
    detail: "The events model comes first, because both views read it: a weekly class becomes one series with its rule, and every " +
      "booking keeps its occurrence. The week view and the month view then build side by side. Moving a class by drag comes " +
      "last, as it needs both views. One question is open: whether a moved class mails its booked members.",
  },
  refund: {
    id: 31, kind: "merge", task: 122, pr: cards[122].pr,
    reason: "risk class high: the change touches src/payments",
    brief: "Refunds a class the studio cancels to each paying member's card, once per booking.",
    detail: "Adds refundBooking in src/payments/refund.ts, called when the studio cancels a class. It creates one Stripe refund " +
      "per paid booking with an idempotency key, so a cancel sent twice refunds once. The charge.refunded webhook marks the " +
      "booking refunded; a failed refund shows on the class's page. Tests cover a double cancel and a declined refund.",
  },
};

// plans are the planner's plans: the calendar rewrite, its cards by key with the issues they become on accept.
const plans = {
  105: {
    summary: "Four cards: the events model first, then the week and the month views side by side, then moving a class by drag.",
    question: asks.move,
    cards: [
      { key: "events-model", role: "foundation", issue: 109, dependsOn: [] },
      { key: "week-view", role: "feature", issue: 110, dependsOn: ["events-model"] },
      { key: "month-view", role: "feature", issue: 111, dependsOn: ["events-model"] },
      { key: "drag-move", role: "integration", issue: 112, dependsOn: ["week-view", "month-view"] },
    ],
  },
};

// planCards is the plan of issue as the planner writes its cards.
function planCards(issue) {
  return plans[issue].cards.map((p) => {
    const c = card(p.issue);
    return {
      key: p.key, role: p.role, title: c.title, brief: c.body.replace(/^Card [^.]+\. /, ""), directories: ["src/calendar"],
      depends_on: p.dependsOn, acceptance: c.acceptance.map((text) => ({ text })), size: c.size,
    };
  });
}

// The merges more than one scene shows, seconds after each card's creation.
const merges = {
  101: { queued: 92 * MIN, at: 112 * MIN, live: 120 * MIN, run: 57 },
  107: { queued: 53 * MIN, at: 58 * MIN, live: 64 * MIN, run: 61 },
  108: { queued: 26 * MIN, at: 43 * MIN, live: 50 * MIN, run: 60 },
  115: { queued: 27 * MIN, at: 44 * MIN, live: 52 * MIN, run: 66 },
  123: { queued: 53 * MIN, at: 58 * MIN, live: 64 * MIN, run: 90 },
};

// nightly are the security scan's runs from week 1's Monday to week 2's Sunday, run 52 the first: no finding, but
// Thursday's of week 1, which filed #108.
const nightly = Array.from({ length: 14 }, (_, d) => ({
  run: 52 + d, due: new Date(date(1, "mon", "02:00").getTime() + d * DAY * 1000), took: 40, outcome: "no change", note: "no finding",
}));
nightly[3] = { ...nightly[3], outcome: "done", issue: 108, took: merges[108].live, cost: 0.29, note: "1 high: path-to-regexp 0.1.7 through express 4.19.2, CVE-2024-45296" };

// routines are the four routines' runs, oldest first: run, due on the calendar, outcome once the run's card ended,
// the card, how long the run took to its card's end, its cost and its note. A run that filed a card files it at its
// start and ends when the card goes live.
const routines = {
  "dependency-bump": [
    { run: 7, due: date(1, "mon", "06:00"), took: 50, outcome: "no change", note: "every dependency on the newest release of its line" },
    { run: 8, due: date(2, "mon", "06:00"), took: merges[115].live, outcome: "done", issue: 115, cost: 0.38, note: "12 packages behind the newest release of their line" },
  ],
  "security-scan": nightly,
  "performance-read": [
    { run: 6, due: date(1, "fri", "07:00"), took: 70, outcome: "no change", note: "GET /schedule p95 0.31 s, every page under 400 ms" },
    { run: 7, due: date(2, "fri", "07:00"), took: merges[123].live, outcome: "done", issue: 123, cost: 0.62, note: "GET /schedule p95 0.74 s, up from 0.31 s since #118" },
  ],
  "cost-review": [
    { run: 3, due: date(2, "thu", "08:00"), took: 11 * HOUR, outcome: "done", issue: 124, note: "€41.20 of the €60 cap, €1.79 per card" },
  ],
};

// cronOf is routine name's cron.
const cronOf = (name) => project.routines.find((r) => r.name === name).schedule[0].cron;

// runsAt are routine name's runs by the story's time at, newest first, as the routine's drawer reads them at now: the
// newest falls on the routine's last cron time before now, each older one on the cron time before that. A run is open
// until now passes its end, and its card reads filed meanwhile.
function runsAt(now, name, at) {
  let due = now;
  return routines[name].filter((r) => r.due <= at).reverse().map((r) => {
    due = state.prevCron(cronOf(name), due);
    const ended = new Date(due.getTime() + r.took * 1000);
    const open = ended > now;
    return state.routineRun(name, {
      ...r, due, outcome: open ? (r.issue && "filed") : r.outcome, ended: open ? undefined : ended, cost: open ? undefined : r.cost,
    });
  });
}

// filedAge is the age in seconds at now of issue's card, which a routine filed at its run's start: the run as the
// drawer dates it at the story's time at, or as the routine's newest run without at.
function filedAge(now, issue, at) {
  const name = card(issue).routine;
  const own = routines[name].find((r) => r.issue === issue);
  return (now - new Date(runsAt(now, name, at ?? own.due).find((r) => r.Run === own.run).Started)) / 1000;
}

// anchoredAt is the story's time now stands for in a scene about the run that filed issue: as long after that run's
// due as now is after the routine's last cron time, so the run, its card and the story's other cards read on one clock.
function anchoredAt(now, issue) {
  const name = card(issue).routine;
  const own = routines[name].find((r) => r.issue === issue);
  return new Date(own.due.getTime() + (now - state.prevCron(cronOf(name), now)));
}

// routineCard is the card a routine filed, in the phase its age from its run's start reached.
const routineCard = (now, issue, at) => life(now, issue, filedAge(now, issue, at), lives[issue]);

// routinesAt are the four routines on the board at the story's time at, which now stands for: their views, their
// runs and the routines' clock. o sets a routine's Skip once (skip) and its live toggle (needsMe); cards are the
// board's cards, of which a routine's open newest run names its open card. The lab's Skip once reads the next run back
// from its Next against the seed's own clock, a few milliseconds after now; the routines' clock a second past now
// keeps that read past the next run.
function routinesAt(now, at, o = {}) {
  const runs = Object.fromEntries(project.routines.map((r) => [r.name, runsAt(now, r.name, at)]));
  const open = ([last]) => {
    const t = last && !last.Ended && o.cards?.find((c) => c.ID === last.TaskID);
    return t ? { ID: t.ID, IssueNumber: t.IssueNumber, Status: t.Status } : undefined;
  };
  return {
    routines: project.routines.map((r) => state.routineView(now, r, {
      runs: runs[r.name], skip: o.skip === r.name, needsMe: o.needsMe === r.name ? true : undefined, open: open(runs[r.name]),
    })),
    runs,
    routinesAt: new Date(now.getTime() + 1000),
  };
}

// scanned is the security scan's poke in the inbox for its run that filed a card, its decider line the routine's
// schedule in words.
function scanned(now, { run, age, conversation }) {
  const r = routines["security-scan"].find((x) => x.run === run);
  return state.poke(now, {
    issue: r.issue, content: `Filed #${r.issue} ${JSON.stringify(cards[r.issue].title)}.`, age, conversation, birth: "routine_ran",
    decider: `routine security-scan · run ${run} · daily 02:00`,
  });
}

// sessions are the cards' agent sessions by issue and session: the commit a session pushed, and the agent's words,
// each at its seconds after the session's start.
const sessions = {
  101: { "s-1": { commit: "4be1c07", words: [] } },
  102: { "s-1": { commit: "5b0d3e7", words: [] }, "s-2": { commit: "c92a4f1", words: [] } },
  103: {
    "s-1": {
      commit: "8c1e5a2",
      words: [
        [30, "Reading the class page first: src/classes/ClassPage.tsx and its query in src/classes/queries.ts."],
        [4 * MIN, "The class query already joins the schedule. I add the teacher's name and the room to it, so the page needs no second request."],
        [9 * MIN, "The page names both under the title: \"with Lena · Room 2\". Next, the tests."],
        [17 * MIN, "npm test: the 3 new tests of the class page pass, 214 in all. Pushing the branch and opening the pull request."],
      ],
    },
  },
  104: {
    "s-1": {
      commit: "a71c3d0",
      words: [
        [30, "The alert's stack trace points at src/payments/webhook.ts:57: confirmBooking reads paymentIntent.charges.data[0]."],
        [3 * MIN, "API version 2022-11-15 sends no charges list on a PaymentIntent, only latest_charge, so charges is undefined and " +
          "every confirmation answers 500. confirmBooking now reads latest_charge."],
        [9 * MIN, "A test replays a payment_intent.succeeded event of API version 2022-11-15: the booking is confirmed, 2xx."],
        [14 * MIN, "npm test: 211 passing. Pushing and opening the pull request."],
      ],
    },
  },
  108: { "s-1": { commit: "6f2e8b1", words: [] } },
  115: { "s-1": { commit: "2c9d4a7", words: [] } },
  118: { "s-1": { commit: "e41b7c9", words: [] } },
  119: { "s-1": { commit: "0b8e4c6", words: [] } },
  107: {
    "s-1": {
      commit: "9d2b6c4",
      words: [
        [40, "Reading the Stripe webhook in src/payments/webhook.ts and the confirmation mail in src/mail/confirmation.ts."],
        [6 * MIN, "The confirmation now goes out from the payment_intent.succeeded handler, once the payment settles."],
        [15 * MIN, "npm test passes. Pushing and opening the pull request."],
      ],
    },
    "s-2": {
      commit: "3e7f915",
      words: [
        [30, "The acceptance job failed on \"a webhook delivered twice sends one mail\": Stripe sent the event again, and two mails went out."],
        [4 * MIN, "The handler mails before it records the mail. I record the confirmation keyed on the PaymentIntent's id, " +
          "in the transaction that marks the booking paid, and mail only when that insert took."],
        [12 * MIN, "npm test passes, and the acceptance test delivers the event twice: one mail. Pushing to the pull request."],
      ],
    },
  },
  116: {
    "s-1": {
      commit: "2d7f0b9",
      words: [
        [40, "Reading src/bookings/cancel.ts and offerSeat, the waitlist's hand-over from #101."],
        [5 * MIN, "Cancel shows until 12 hours before the class; the check reads the class's start in the studio's time zone."],
        [14 * MIN, "A cancel frees the seat, then offerSeat mails the first member in line. The tests of the window and the hand-over pass."],
        [26 * MIN, "npm test: 9 new tests pass. Pushing and opening the pull request."],
      ],
    },
    "s-2": {
      commit: "e5a3c18",
      words: [
        [30, "The review found a race in cancel.ts: the seat is freed and offered in two transactions, and a claim between them books it twice."],
        [4 * MIN, "cancelBooking now locks the class row with SELECT … FOR UPDATE, and frees and offers the seat in that one transaction."],
        [11 * MIN, "A new test runs a cancel and a waitlist claim at the same moment, 50 times: one booking for the seat every time."],
        [15 * MIN, "npm test: 10 new tests pass. Pushing to the pull request."],
      ],
    },
  },
  117: {
    "s-1": {
      words: [
        [30, "Reading src/mail/reminder.ts and the job that sends it, src/jobs/reminders.ts."],
        [3 * MIN, "The reminder goes out at the class's start minus 24 hours. Running npm test -- reminder."],
        [6 * MIN, "npm test -- reminder fails: the class on Sunday 25 October at 18:00 wants its reminder at 18:00 on Saturday, " +
          "and reminder.ts sends it at 19:00. I move the arithmetic from UTC to the studio's time zone."],
        [10 * MIN, "npm test -- reminder fails the same way: 19:00, not 18:00. Back to UTC in reminder.ts, with the time zone applied after."],
        [13 * MIN, "npm test -- reminder fails the same way again: 19:00, not 18:00."],
      ],
    },
    "s-2": {
      commit: "7a4c2e9",
      words: [
        [30, "Starting from the supervisor's note: both versions subtracted 24 hours, and the test's class falls on the night the clocks go back. " +
          "I subtract one calendar day in Europe/Berlin."],
        [5 * MIN, "npm test -- reminder: 6 passing. The class on 25 October gets its reminder at 18:00 on Saturday."],
        [8 * MIN, "npm test: 221 passing. Pushing and opening the pull request."],
      ],
    },
  },
  120: { "s-1": { commit: "b3e81f6", words: [] } },
  121: { "s-1": { commit: "f16d07a", words: [] } },
  123: { "s-1": { commit: "7a4f0e3", words: [] } },
  122: {
    "s-1": {
      words: [
        [40, "Reading the class cancel in src/classes/cancel.ts and the Stripe client in src/payments/stripe.ts."],
        [6 * MIN, "A studio cancel marks every booking of the class cancelled. I add refundBooking in src/payments/refund.ts for the paid ones."],
        [11 * MIN, "refundBooking creates one Stripe refund per paid booking. Next, the charge.refunded webhook."],
        // the answer to the steer of steers.refund, which reaches the session 13 minutes in
        [13.2 * MIN, "Taking your message: refundBooking passes the booking's id to Stripe as the idempotency key, " +
          "and a test sends the cancel twice and finds one refund."],
      ],
    },
  },
};

// words are the agent's words in issue's session sid, as transcript rows.
function words(issue, sid) {
  return sessions[issue][sid].words.map(([at, text]) => state.said(at, text));
}

// session is the steps of issue's session n from start to end, with the commit the story gives it when it pushed.
function session(issue, n, start, end, { model, outcome }) {
  return state.session(start, end, { n, model, outcome, commit: sessions[issue][`s-${n}`]?.commit });
}

// life is issue's card age seconds after its creation and the objects its drawer reads. phases are its states, each
// from its from (seconds after the creation) and keeping what it does not set of the one before: status, gate, model,
// spent, pr, whether its pull request is open, and chain, the verdict of the run that carries it once it merged.
// admitted is when it took a slot, if not at its creation. steps are its timeline; each session started by then
// carries its words said by then. card sets the rest of the card: who filed it and from where.
function life(now, issue, age, { phases, admitted, steps = [], card: o = {} }) {
  const passed = phases.filter((p) => p.from <= age);
  const p = Object.assign({}, ...passed);
  const since = age - passed.findLast((q) => "status" in q || "gate" in q).from;
  const final = ["done", "failed", "closed"].includes(p.status);
  const task = boardCard(now, issue, {
    lane: "ready", age, status: p.status, model: p.model, spent: p.spent, pr: p.pr ? cards[issue].pr : undefined, chain: p.chain,
    gate: final ? undefined : p.gate, gateSince: final || !p.gate ? undefined : since, finished: final ? since : undefined,
    admitted: admitted === undefined || admitted > age ? undefined : age - admitted, ...o,
  });
  const objects = { [`sessions/${task.ID}/timeline.jsonl`]: state.timeline(now, age, { steps }) };
  for (const s of steps) {
    if (s.step === "session_start" && s.at <= age && sessions[issue]?.[s.session]) {
      objects[`sessions/${task.ID}/${s.session}.jsonl`] = state.transcript(now, age - s.at, words(issue, s.session));
    }
  }
  return { task, objects };
}

// done is issue's card done after seconds of its age: built on small, its pull request merged, spent spent.
function done(now, issue, age, after, spent) {
  return life(now, issue, age, { phases: [{ from: after, status: "done", model: "small", spent, pr: true }] });
}

// filed are the cards' filings on the calendar, as the earlier scenes' ages place them, for the scenes that count a
// card's age from the story's time.
const filed = {
  101: date(1, "mon", "11:00"), 102: date(1, "mon", "11:36"), 103: date(1, "mon", "12:36"), 104: date(1, "tue", "13:00"),
  106: date(1, "wed", "15:30"), 107: date(1, "wed", "16:00"), 108: date(1, "thu", "02:00"),
  115: date(2, "mon", "06:00"), 116: date(2, "tue", "08:00"), 117: date(2, "wed", "02:15"), 118: date(2, "thu", "16:00"),
  119: new Date(date(2, "thu", "17:19").getTime() + 30 * 1000), 120: date(2, "wed", "02:08"), 121: date(2, "wed", "02:18"),
  123: date(2, "fri", "07:00"),
};

// ageAt is issue's card's age in seconds at the story's time at.
const ageAt = (issue, at) => (at - filed[issue]) / 1000;

// doneAt are cards done by the story's time at: each [issue, done after its filing in seconds, spend].
function doneAt(now, at, list) {
  return list.map(([issue, after, spent]) => done(now, issue, ageAt(issue, at), after, spent));
}

// board is the tasks and objects of cards, each a life.
function board(cards) {
  return { tasks: cards.map((c) => c.task), objects: Object.assign({}, ...cards.map((c) => c.objects)) };
}

// reviews are the review gate's verdicts on a card's pull request, round by round.
const reviews = {
  101: [{ verdict: "approve", summary: "A full class takes waitlist sign-ups in order, and a cancellation mails the first in line a seat held for 2 hours." }],
  102: [{ verdict: "approve", summary: "Caches the week's schedule for a minute; the load test measures GET /schedule at 0.31 s at the p95." }],
  103: [{ verdict: "approve", summary: "Adds the teacher and the room to the class query and names them under the title, with tests for the page." }],
  104: [{ verdict: "approve", summary: "confirmBooking reads latest_charge of API version 2022-11-15; a replayed event of that version confirms the booking." }],
  108: [{ verdict: "approve", summary: "express 4.20.0 pins path-to-regexp 0.1.10; npm audit reports no high finding, and the route tests pass." }],
  115: [{ verdict: "approve", summary: "12 packages move to the newest release of their line, none a major release; the test suite passes." }],
  118: [{ verdict: "approve", summary: "The schedule takes a teacher filter from the URL; the tests cover a chosen teacher and a reload." }],
  119: [{ verdict: "approve", summary: "parseTeacherFilter answers no filter when ?teacher is absent; a test covers the link without one." }],
  107: [{ verdict: "approve", summary: "Mails the confirmation once per booking from the webhook, keyed on the PaymentIntent; the tests deliver the event twice." }],
  116: [
    {
      verdict: "concerns",
      summary: "The cancel window and the hand-over to the waitlist work, but a cancel and a waitlist claim at the same moment can both take the seat.",
      findings: [
        "src/bookings/cancel.ts:48: cancelBooking frees the seat, and offerSeat reads the waitlist in a second transaction; a claim between " +
          "the two books the seat twice. Free and offer the seat in one transaction that locks the class row (SELECT … FOR UPDATE).",
      ],
    },
    { verdict: "approve", summary: "Frees and offers the seat in one transaction under a lock on the class row; the concurrency test finds one booking per seat." },
  ],
  120: [{ verdict: "approve", summary: "A pass of 10 classes bought by card; each booking takes one, and the account page shows what is left." }],
  121: [{ verdict: "approve", summary: "Lists a member's bookings of the last 12 months, newest first, scoped to the member." }],
  123: [{ verdict: "approve", summary: "The schedule loads a week's teachers in one query, not one per class; the load test measures GET /schedule at 0.29 s at the p95." }],
};

// review is round n of the review of issue's pull request, from from to at, on the commit of session sid.
function review(issue, n, from, at, sid) {
  return state.modelReview(from, at, { pr: cards[issue].pr, commit: sessions[issue][sid].commit, round: n, ...reviews[issue][n - 1] });
}

// checksFailed are the findings of a card's failed checks, sent on to its next session.
const checksFailed = {
  107: "acceptance: a webhook delivered twice sends one mail: 2 mails sent, want 1",
};

// merge is the steps of issue's merge, in seconds after its creation: its turn in the merge queue it entered at
// queued, a minute before factory-merge merges the head its last session pushed at at, and its end at live, when the
// green run run of its chain covers it.
function merge(issue, { queued, at, live, run }) {
  const pr = cards[issue].pr;
  const head = Object.values(sessions[issue]).findLast((s) => s.commit).commit;
  const reason = `live: covered by run ${run}`;
  return [
    state.queueTurn(queued, at - MIN),
    state.merged(at - MIN, at, { pr, commit: head }),
    state.recorded(at, "pull_request_merged", { pr, by: "factory-merge" }),
    state.final(at, "merged", "pull request merged"),
    state.final(live, "done", reason),
    state.recorded(live, "task_ended", { state: "done", reason }),
  ];
}

// merging is the phases of a merge at at and its end at live, after the phases before: merged while its chain runs,
// then done. A done card carries no chain verdict: the lab's board reads a done card after a card with one as not
// live yet, and leaves it out of Done.
const merging = ({ at, live }, spent) => [{ from: at, status: "merged", gate: undefined, chain: "pending" }, { from: live, status: "done", chain: undefined, spent }];

// mergeEvents are the events rows of issue's merge m by its age: the merge, then the end.
function mergeEvents(now, issue, age, m) {
  const pr = cards[issue].pr;
  return [
    [m.at, "pull_request_merged", { pr, by: "factory-merge" }],
    [m.live, "task_ended", { state: "done", reason: `live: covered by run ${m.run}` }],
  ].filter(([at]) => at <= age).map(([at, kind, detail]) => state.event(now, { issue, kind, age: age - at, detail }));
}

// lives are the cards whose life more than one scene shows, offsets in seconds after each card's creation.
const lives = {
  // the waitlist waits in the merge queue on Monday afternoon, merges, and is live two hours after its filing
  101: {
    phases: [{ from: 92 * MIN, status: "in-review", gate: "merge-queue", model: "small", spent: 0.71, pr: true }, ...merging(merges[101], 1.12)],
    steps: [
      state.intake(5 * MIN, 5.5 * MIN),
      ...session(101, 1, 6 * MIN, 24 * MIN, { model: "small" }),
      state.checks(24 * MIN + 10, 31 * MIN),
      review(101, 1, 31 * MIN, 89 * MIN, "s-1"),
      ...merge(101, merges[101]),
    ],
  },
  // the schedule builds a second time after a failed test
  102: {
    phases: [
      { from: 39 * MIN, status: "running", gate: "session", model: "small", spent: 0.22 },
      { from: 65 * MIN, status: "in-review", gate: "checks", spent: 0.3, pr: true },
      { from: 73 * MIN, status: "running", gate: "session", spent: 0.38 },
      { from: 90 * MIN, spent: 0.47 },
      { from: 107 * MIN, status: "in-review", gate: "checks", spent: 0.55 },
      { from: 114 * MIN, gate: "review", spent: 0.64 },
      { from: 121 * MIN, gate: "merge-queue" },
    ],
    steps: [
      state.intake(38 * MIN, 38 * MIN),
      ...session(102, 1, 39 * MIN, 65 * MIN, { model: "small" }),
      state.checks(65 * MIN + 10, 72 * MIN, "test"),
      ...session(102, 2, 73 * MIN, 107 * MIN, { model: "small" }),
      state.checks(107 * MIN + 10, 114 * MIN),
      review(102, 1, 114 * MIN, 120 * MIN, "s-2"),
    ],
  },
  // the class page, filed on the form
  103: {
    phases: [
      { from: 0, status: "queued" },
      { from: 3 * MIN, status: "running", gate: "session", model: "small", spent: 0.08 },
      { from: 22 * MIN, status: "in-review", gate: "checks", spent: 0.19, pr: true },
      { from: 30 * MIN, gate: "review" },
      { from: 45 * MIN, spent: 0.27 },
      { from: 46 * MIN, gate: "merge-queue" },
      { from: 84 * MIN, status: "done", spent: 0.31 },
    ],
    steps: [
      state.intake(0, 20),
      ...session(103, 1, 3 * MIN, 21.5 * MIN, { model: "small" }),
      state.checks(22 * MIN, 30 * MIN),
      review(103, 1, 30 * MIN, 45 * MIN, "s-1"),
    ],
  },
  // the confirmation mail: the first attempt on small fails the acceptance job, its finding goes to the stronger
  // class, the second attempt on big passes, and the card merges
  107: {
    phases: [
      { from: 0, status: "queued" },
      { from: 2 * MIN, status: "running", gate: "session", model: "small", spent: 0.05 },
      { from: 18.5 * MIN, status: "in-review", gate: "checks", spent: 0.31, pr: true },
      { from: 26 * MIN, status: "running", gate: "session", model: "big" },
      { from: 29 * MIN, spent: 0.52 },
      { from: 40.5 * MIN, status: "in-review", gate: "checks", spent: 1.06 },
      { from: 47 * MIN, gate: "review" },
      { from: 53 * MIN, gate: "merge-queue", spent: 1.18 },
      ...merging(merges[107], 1.18),
    ],
    steps: [
      state.intake(0, 20),
      ...session(107, 1, 2 * MIN, 18 * MIN, { model: "small" }),
      state.checks(18.5 * MIN, 25 * MIN, "acceptance"),
      state.findings(25 * MIN + 5, { stage: "checks", to: "stronger", attempt: 1, list: [checksFailed[107]] }),
      ...session(107, 2, 26 * MIN, 40 * MIN, { model: "big" }),
      state.checks(40.5 * MIN, 47 * MIN),
      review(107, 1, 47 * MIN, 52 * MIN, "s-2"),
      ...merge(107, merges[107]),
    ],
  },
  // the scan's bump: built on small, merged and live 50 minutes after the scan filed it
  108: {
    phases: [
      { from: 0, status: "queued" },
      { from: MIN, status: "running", gate: "session", model: "small", spent: 0.03 },
      { from: 13 * MIN, status: "in-review", gate: "checks", spent: 0.17, pr: true },
      { from: 20 * MIN, gate: "review" },
      { from: 26 * MIN, gate: "merge-queue", spent: 0.29 },
      ...merging(merges[108], 0.29),
    ],
    steps: [
      state.intake(0, 15),
      ...session(108, 1, MIN, 12.5 * MIN, { model: "small" }),
      state.checks(13 * MIN, 20 * MIN),
      review(108, 1, 20 * MIN, 25 * MIN, "s-1"),
      ...merge(108, merges[108]),
    ],
    card: { author: "factory-agent", source: "routine" },
  },
  // the weekly bump, the same way
  115: {
    phases: [
      { from: 0, status: "queued" },
      { from: MIN, status: "running", gate: "session", model: "small", spent: 0.04 },
      { from: 14 * MIN, status: "in-review", gate: "checks", spent: 0.22, pr: true },
      { from: 21 * MIN, gate: "review" },
      { from: 27 * MIN, gate: "merge-queue", spent: 0.38 },
      ...merging(merges[115], 0.38),
    ],
    steps: [
      state.intake(0, 15),
      ...session(115, 1, MIN, 13.5 * MIN, { model: "small" }),
      state.checks(14 * MIN, 21 * MIN),
      review(115, 1, 21 * MIN, 26 * MIN, "s-1"),
      ...merge(115, merges[115]),
    ],
    card: { author: "factory-agent", source: "routine" },
  },
  // the performance read's card waits 5 minutes for a slot, builds on small and is live an hour after the read
  123: {
    phases: [
      { from: 0, status: "queued" },
      { from: 5 * MIN, status: "running", gate: "session", model: "small", spent: 0.06 },
      { from: 25 * MIN, spent: 0.34 },
      { from: 40 * MIN, status: "in-review", gate: "checks", spent: 0.48, pr: true },
      { from: 47 * MIN, gate: "review" },
      { from: 53 * MIN, gate: "merge-queue", spent: 0.62 },
      ...merging(merges[123], 0.62),
    ],
    steps: [
      state.intake(0, 15),
      ...session(123, 1, 5 * MIN, 39.5 * MIN, { model: "small" }),
      state.checks(40 * MIN, 47 * MIN),
      review(123, 1, 47 * MIN, 52 * MIN, "s-1"),
      ...merge(123, merges[123]),
    ],
    card: { author: "factory-agent", source: "routine" },
  },
};

// files are the changed files of a pull request, as Forgejo lists them.
const files = {
  203: [
    { filename: "src/classes/queries.ts", status: "modified", additions: 6, deletions: 2 },
    { filename: "src/classes/ClassPage.tsx", status: "modified", additions: 12, deletions: 1 },
    { filename: "src/classes/ClassPage.test.tsx", status: "modified", additions: 41, deletions: 0 },
  ],
};

// supervisor is the supervisor's step in #117's first session: the flip-flop detector's trip, and the insight the
// next session starts from.
const supervisor = {
  issue: 117,
  detector: "flip_flop",
  trip: "after src/mail/reminder.ts returned to a content it had before, `npm test -- reminder` failed again, unchanged",
  decision: "redirect",
  reason: "Both versions of reminder.ts subtract 24 hours from the class's start, and the test's class is on 25 October, the night " +
    "the clocks go back: 24 hours before 18:00 is 19:00 on Saturday. Subtract one calendar day in Europe/Berlin instead.",
};

// steers are the messages Sebastian sends a running card from the chat: what he types, the agent's words with the
// proposal, and the text the session gets.
const steers = {
  refund: {
    issue: 122,
    request: "Tell #122 to use the booking's id as the Stripe idempotency key, so a cancel sent twice refunds once.",
    reply: "I pass it to the running session of #122; it reads it at its next step:",
    text: "Use the booking's id as the Stripe idempotency key, so a cancel sent twice refunds once.",
  },
};

module.exports = {
  date, cards, description, body, card: boardCard, filing, requests, asks, replies, alerts, alertsAt, approvals, plans, planCards, routines, runsAt,
  cronOf, filedAge, anchoredAt, routineCard, routinesAt, scanned, sessions, words, life, lives, merges, merge, merging, mergeEvents, done, filed, ageAt, doneAt, board, session, reviews, review, files,
  checksFailed, supervisor, steers,
};
