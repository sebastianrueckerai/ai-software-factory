// Studio Nord's two weeks: every card by issue, and the texts of the requests, asks, alerts, approvals and routine runs
// the scenes show. A scene reads a card's title and body from here, so a card reads the same in every scene.
const state = require("./state");

const budgets = { small: 2, medium: 5, large: 10 };
const MIN = 60;

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
    body: "Reported in #106: a booking whose card payment settles after the checkout page closed sends no confirmation mail. " +
      "Send it from the payment_intent.succeeded webhook, once per booking",
    acceptance: [
      "a booking whose payment settles after the checkout page closed gets its confirmation mail",
      "a webhook delivered twice sends one mail",
    ],
  },
  108: {
    title: "Security: express 4.20.0 for CVE-2024-45296 in path-to-regexp", size: "small", pr: 206,
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
    title: "Schedule: filter by teacher", size: "small", pr: 216, merge: "e41b7c9",
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
};

// alerts are the alert rows of the two weeks; a scene passes now and the ages to state.alert.
const alerts = {
  scheduleLatency: [
    { id: 11, kind: "alert", source: "GET /schedule p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd" },
    { id: 12, kind: "alert", source: "GET /schedule p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd" },
    { id: 13, kind: "alert", source: "GET /schedule p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd" },
  ],
  checkout: {
    id: 14, kind: "alert", source: "CheckoutErrors", task: 104, fingerprint: "b81e2f04a9c63d17",
    detail: { summary: "POST /checkout/confirm answers 500 on 41% of requests", error: cards[104].body.split("\n\n")[1] },
  },
  budget: { id: 15, kind: "escalation", source: "cap", task: 110 },
  badMerge: {
    id: 16, kind: "alert", source: "ScheduleErrors", task: 119, fingerprint: "e07c4a92d15b8f3e",
    detail: { summary: "GET /schedule answers 500 on 63% of requests since e41b7c9", error: cards[119].body.split("\n\n")[1] },
  },
};

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

// routines are the runs the four routines report, newest last.
const routines = {
  "dependency-bump": [{ week: 2, outcome: "filed", issue: 115, note: "12 packages behind the newest release of their line" }],
  "security-scan": [
    { week: 1, outcome: "filed", issue: 108, note: "1 high: path-to-regexp 0.1.7 through express 4.19.2, CVE-2024-45296" },
    { week: 2, outcome: "no change", note: "no finding" },
  ],
  "performance-read": [
    { week: 1, outcome: "no change", note: "GET /schedule p95 0.31 s, every page under 400 ms" },
    { week: 2, outcome: "filed", issue: 123, note: "GET /schedule p95 0.74 s, up from 0.31 s since #118" },
  ],
  "cost-review": [{ week: 2, outcome: "filed", issue: 124, note: "€41.20 of the €60 cap, €1.79 per card" }],
};

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
// spent, and pr, whether its pull request is open. admitted is when it took a slot, if not at its creation. steps are
// its timeline; each session started by then carries its words said by then.
function life(now, issue, age, { phases, admitted, steps = [] }) {
  const passed = phases.filter((p) => p.from <= age);
  const p = Object.assign({}, ...passed);
  const since = age - passed.findLast((q) => "status" in q || "gate" in q).from;
  const final = ["done", "failed", "closed"].includes(p.status);
  const task = boardCard(now, issue, {
    lane: "ready", age, status: p.status, model: p.model, spent: p.spent, pr: p.pr ? cards[issue].pr : undefined,
    gate: final ? undefined : p.gate, gateSince: final || !p.gate ? undefined : since, finished: final ? since : undefined,
    admitted: admitted === undefined || admitted > age ? undefined : age - admitted,
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

// board is the tasks and objects of cards, each a life.
function board(cards) {
  return { tasks: cards.map((c) => c.task), objects: Object.assign({}, ...cards.map((c) => c.objects)) };
}

// reviews are the review gate's verdicts on a card's pull request, round by round.
const reviews = {
  101: [{ verdict: "approve", summary: "A full class takes waitlist sign-ups in order, and a cancellation mails the first in line a seat held for 2 hours." }],
  102: [{ verdict: "approve", summary: "Caches the week's schedule for a minute; the load test measures GET /schedule at 0.31 s at the p95." }],
  103: [{ verdict: "approve", summary: "Adds the teacher and the room to the class query and names them under the title, with tests for the page." }],
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
};

// review is round n of the review of issue's pull request, from from to at, on the commit of session sid.
function review(issue, n, from, at, sid) {
  return state.modelReview(from, at, { pr: cards[issue].pr, commit: sessions[issue][sid].commit, round: n, ...reviews[issue][n - 1] });
}

// files are the changed files of a pull request, as Forgejo lists them.
const files = {
  203: [
    { filename: "src/classes/queries.ts", status: "modified", additions: 6, deletions: 2 },
    { filename: "src/classes/ClassPage.tsx", status: "modified", additions: 12, deletions: 1 },
    { filename: "src/classes/ClassPage.test.tsx", status: "modified", additions: 41, deletions: 0 },
  ],
};

// checksFailed are the findings of a card's failed checks, sent on to its next session.
const checksFailed = {
  107: "acceptance: a webhook delivered twice sends one mail: 2 mails sent, want 1",
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
  cards, description, body, card: boardCard, filing, requests, asks, replies, alerts, approvals, plans, planCards, routines,
  sessions, words, life, done, board, session, reviews, review, files, checksFailed, supervisor, steers,
};
