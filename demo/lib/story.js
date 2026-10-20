// Studio Nord's two weeks: every card by issue, and the texts of the requests, asks, alerts, approvals and routine runs
// the scenes show. A scene reads a card's title and body from here, so a card reads the same in every scene.
const state = require("./state");

const budgets = { small: 2, medium: 5, large: 10 };

// body is the prose the card is filed with; acceptance its Acceptance list; pr its pull request; plan and key mark a
// planned card (its plan's issue and its key there).
const cards = {
  101: {
    title: "Waitlist when a class is full", size: "medium", pr: 201,
    body: "A full class takes waitlist sign-ups in order. A cancelled booking offers the seat to the first in line by mail.",
    acceptance: [
      "a full class shows Join the waitlist in place of Book",
      "a cancellation mails the first member in line a link that holds the seat for 2 hours",
      "a seat unclaimed after 2 hours passes to the next in line",
    ],
  },
  102: {
    title: "Schedule page: GET /schedule under 400 ms at the p95", size: "small", pr: 202,
    body: "GET /schedule answers in 1.42 s at the p95 over the last 7 days, five times the other pages. Members feel it.",
    acceptance: [
      "the p95 of GET /schedule stays under 400 ms over a day of production traffic",
      "the schedule reads the booking counts of a week's classes in one query",
    ],
  },
  103: {
    title: "Class page: show the teacher and the room", size: "small", pr: 203,
    body: "Members want to know who teaches and in which room before they book.",
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
    body: "The calendar is one hand-built table: it cannot show a week, move a class or repeat one. Rebuild it on one model.",
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
      "Send it from the payment_intent.succeeded webhook, once per booking.",
    acceptance: [
      "a booking whose payment settles after the checkout page closed gets its confirmation mail",
      "a webhook delivered twice sends one mail",
    ],
  },
  108: {
    title: "Security: express 4.20.0 for CVE-2024-45296 in path-to-regexp", size: "small", pr: 206,
    body: "The nightly scan found path-to-regexp 0.1.7 through express 4.19.2: CVE-2024-45296, high. A route with two " +
      "parameters in one segment backtracks on a crafted path, a denial of service. express 4.20.0 pins path-to-regexp 0.1.10.",
    acceptance: ["npm audit reports no high finding", "the route tests pass on express 4.20.0"],
  },
  109: {
    title: "Calendar: one events model for classes and their repeats", size: "medium", plan: 105, key: "events-model", pr: 207,
    body: "Card events-model of plan #105, accepted by sebastian. A class is an event with a series rule; a booking points at one occurrence.",
    acceptance: ["a weekly class is one row with its rule", "every booking keeps its occurrence after the migration"],
  },
  110: {
    title: "Calendar: the week view", size: "medium", plan: 105, key: "week-view", pr: 208,
    body: "Card week-view of plan #105, accepted by sebastian. Seven columns of the studio's hours, each class a block with its free places.",
    acceptance: ["the week view shows every class of the week with its free places", "a member books from a block"],
  },
  111: {
    title: "Calendar: the month view", size: "small", plan: 105, key: "month-view", pr: 209,
    body: "Card month-view of plan #105, accepted by sebastian. A month of days, each with its classes' names and a count of free places.",
    acceptance: ["the month view lists each day's classes", "a click on a day opens its week"],
  },
  112: {
    title: "Calendar: drag a class to move it, its bookings follow", size: "medium", plan: 105, key: "drag-move", pr: 212,
    body: "Card drag-move of plan #105, accepted by sebastian. A teacher drags a block to another slot, and its bookings move with it.",
    acceptance: ["a dragged class keeps all its bookings", "a slot another class holds refuses the drop"],
  },
  113: {
    title: "Calendar: the week grid and its navigation", size: "small", parent: 110, pr: 210,
    body: "Split from #110 after it reached its budget: the empty week grid of the studio's hours, with the previous and next week.",
    acceptance: ["the grid shows the studio's hours for seven days", "previous and next move a week"],
  },
  114: {
    title: "Calendar: class blocks in the week grid", size: "small", parent: 110, pr: 211,
    body: "Split from #110 after it reached its budget: each class as a block in the grid of #113, with its free places and Book.",
    acceptance: ["every class of the week is a block with its free places", "a member books from a block"],
  },
  115: {
    title: "Weekly dependency bump", size: "small", routine: "dependency-bump", pr: 213,
    body: "Every dependency to the newest release of its line in one pull request; a major release gets a card of its own.",
    acceptance: ["the lockfile names the newest release of each line", "the test suite passes"],
  },
  116: {
    title: "Booking: cancel up to 12 hours before class", size: "medium", pr: 214,
    body: "A member cancels a booking up to 12 hours before the class starts; the seat goes to the waitlist of #101.",
    acceptance: [
      "Cancel shows until 12 hours before the class and not after",
      "a cancelled seat goes to the first member on the waitlist",
      "a cancel and a waitlist claim at the same moment leave one booking for the seat",
    ],
  },
  117: {
    title: "Reminder mail: send it 24 hours before class", size: "small", pr: 215,
    body: "Every booked member gets one reminder mail 24 hours before the class, with the room and a cancel link.",
    acceptance: ["a booking gets one reminder 24 hours before its class", "a booking made later than that gets none"],
  },
  118: {
    title: "Schedule: filter by teacher", size: "small", pr: 216, merge: "e41b7c9",
    body: "Members follow a teacher. The schedule gets a teacher filter, kept in the URL so a link shares it.",
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
    body: "A member buys a pass of 10 classes by card. Each booking takes one class off it; the pass ends after 6 months.",
    acceptance: [
      "a member with a pass books without paying again",
      "the account page shows the classes left and the end date",
      "a pass past its 6 months books nothing",
    ],
  },
  121: {
    title: "Account page: a member's past bookings", size: "small", pr: 219,
    body: "The account page lists a member's bookings of the last 12 months, newest first, with each class's date and teacher.",
    acceptance: ["the account page lists the last 12 months of bookings", "a member sees only their own"],
  },
  122: {
    title: "Payments: refund a class the studio cancels", size: "medium", pr: 220,
    body: "When the studio cancels a class, every member who paid for it by card gets a refund through Stripe, once.",
    acceptance: [
      "a class the studio cancels refunds every paid booking to its card",
      "a cancel sent twice refunds once",
      "a failed refund shows on the class's page for the studio",
    ],
  },
  123: {
    title: "Schedule page: p95 up from 0.31 s to 0.74 s since #118", size: "small", routine: "performance-read", pr: 221,
    body: "The weekly performance read: GET /schedule answers in 0.74 s at the p95 this week, up from 0.31 s after #102. " +
      "It rose with the merge of #118, whose teacher filter joins the teachers table per class.",
    acceptance: ["the p95 of GET /schedule is back under 400 ms over a day of production traffic"],
  },
  124: {
    title: "Cost review: the month's spend by card", size: "small", routine: "cost-review",
    body: "The monthly cost review: the month's spend by card and by kind against the project's cap. Read it, then close the card.",
  },
};

function card(issue) {
  const c = cards[issue];
  if (!c) throw new Error(`no card #${issue} in the story`);
  return c;
}

// body is issue's issue body as factoryd keeps it: the prose, the Acceptance list, the size line.
function body(issue) {
  const c = card(issue);
  const list = c.acceptance ? "\n\nAcceptance:\n" + c.acceptance.map((a) => "- " + a).join("\n") : "";
  return `${c.body}${list}\n\nSize: ${c.size}`;
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
  schedule: "It is the slowest page by far: GET /schedule answers in **1.42 s** at the p95 over the last 7 days, " +
    "five times the other pages, and its latency alert fired three times this week. The card carries the figure as its bar:",
  calendar: "That is several cards: the week, the month, moving a class and the model under them. " +
    "I file it in the plan lane, where the planner splits it into cards in their order, and the plan waits for your accept:",
};

// alerts are the alert rows of the two weeks; a scene passes now and the ages to state.alert.
const alerts = {
  scheduleLatency: [
    { id: 11, kind: "alert", source: "SchedulePageLatency", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd" },
    { id: 12, kind: "alert", source: "SchedulePageLatency", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd" },
    { id: 13, kind: "alert", source: "SchedulePageLatency", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd" },
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

module.exports = { cards, body, card: boardCard, filing, requests, asks, replies, alerts, approvals, plans, planCards, routines };
