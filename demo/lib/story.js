// Nebula Run's two weeks: every card by issue, and the texts of the requests, asks, alerts, approvals and routine runs
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
    title: "Title screen: show the version and the server region", size: "small", pr: 200,
    body: "The title screen names the game's version and the region of the server a user connects to",
    acceptance: ["the title screen shows the version and the server region under the logo"],
  },
  101: {
    title: "Co-op: a full lobby queues users for the next free seat", size: "medium", pr: 201,
    body: "A full co-op lobby queues the users who try to join, in order. A user who leaves frees a seat for the first in line",
    acceptance: [
      "a full lobby shows Join the queue in place of Join",
      "a user leaving offers the seat to the first in line with a notice in the game that holds it for 30 seconds",
      "a seat unclaimed after 30 seconds passes to the next in line",
    ],
  },
  102: {
    title: "Matchmaking: GET /match under 400 ms at the p95", size: "small", pr: 202,
    body: "The latency alert on GET /match fired three times this week: its p95 crossed 1 s, and nothing fixed it",
    acceptance: [
      "the p95 of GET /match stays under 400 ms over a day of production traffic",
      "the latency alert on GET /match stays quiet for a week",
    ],
  },
  103: {
    title: "Ship select: show each ship's speed and shield", size: "small", pr: 203,
    body: "Users want to compare the ships before they launch a run",
    acceptance: ["the ship select screen shows each ship's speed and shield under its name"],
  },
  104: {
    title: "Store: 500 after the Stripe webhook change", size: "small", pr: 204,
    body: "SigNoz alert StoreErrors: POST /store/confirm answers 500 on 41% of requests since the Stripe webhook endpoint " +
      "moved to API version 2022-11-15, whose PaymentIntent carries latest_charge in place of charges.\n\n" +
      "TypeError: Cannot read properties of undefined (reading 'data')\n" +
      "    at confirmPurchase (src/payments/webhook.ts:57:38)\n" +
      "    at handleStripeEvent (src/payments/webhook.ts:23:12)",
    acceptance: [
      "POST /store/confirm answers 2xx for a card payment again",
      "a test replays a payment_intent.succeeded event of API version 2022-11-15",
    ],
  },
  105: {
    title: "Level 4: the asteroid belt", size: "large",
    body: "Level 4 takes the crew through an asteroid belt: rocks that break apart, mining drones in waves and a boss at the end. " +
      "The rocks, the drones and the boss move on one physics model",
    acceptance: [
      "the belt plays from the start gate to the boss",
      "the mining drones come in waves along the map",
      "the boss breaks into fragments that move like the rocks",
    ],
  },
  106: {
    title: "No receipt after buying a skin", size: "small", reporter: "maria.k",
    body: "I bought the Nova skin for my ship and paid, but no receipt came. " +
      "A friend bought the same skin the same way and got hers. Did my purchase go through?",
  },
  107: {
    title: "Store: send the receipt once the payment settles", size: "small", pr: 205,
    body: "Reported in #106: a payment settling after the store page closed sends no receipt. The webhook sends it, once per purchase",
    acceptance: [
      "a purchase whose payment settles after the store page closed gets its receipt",
      "a webhook delivered twice sends one receipt",
    ],
  },
  108: {
    title: "Security: express 4.20.0 for CVE-2024-45296 in path-to-regexp", size: "small", routine: "security-scan", pr: 206,
    body: "The nightly scan found path-to-regexp 0.1.7 through express 4.19.2: CVE-2024-45296, high. A route with two " +
      "parameters in one segment backtracks on a crafted path, a denial of service. express 4.20.0 pins path-to-regexp 0.1.10",
    acceptance: ["npm audit reports no high finding", "the route tests pass on express 4.20.0"],
  },
  109: {
    title: "Asteroid field: one physics model for rocks and their fragments", size: "medium", plan: 105, key: "rock-physics", pr: 207,
    body: "Card rock-physics of plan #105, accepted by sebastian. A rock is a body with mass and spin. A shot splits it into fragments that keep its momentum",
    acceptance: ["a shot rock splits into fragments that keep its momentum", "the rocks of levels 1 to 3 move as before on the new model"],
  },
  110: {
    title: "Level 4: the belt's map and its enemy waves", size: "medium", plan: 105, key: "belt-map", pr: 208,
    body: "Card belt-map of plan #105, accepted by sebastian. The map scrolls from the start gate to the boss's arena, and the enemy waves come in along it",
    acceptance: ["the map scrolls from the start gate to the boss's arena", "each enemy wave enters at its marker on the map"],
  },
  111: {
    title: "Level 4: the mining drone enemy", size: "small", plan: 105, key: "mining-drone", pr: 209,
    body: "Card mining-drone of plan #105, accepted by sebastian. A drone that steers between the rocks and rams the nearest ship",
    acceptance: ["the drone steers around the rocks to the nearest ship", "a ram costs the ship one shield point and destroys the drone"],
  },
  112: {
    title: "Level 4: the belt boss, its fragments follow the physics", size: "medium", plan: 105, key: "belt-boss", pr: 212,
    body: "Card belt-boss of plan #105, accepted by sebastian. A hollow asteroid with three phases. Each phase it loses breaks off fragments that fly on the physics model",
    acceptance: ["the boss's fragments fly like the rocks", "the boss enters only after the last wave"],
  },
  113: {
    title: "Level 4: the belt's map and its camera", size: "small", pr: 210,
    body: "Split from #110 after it reached its budget: the map from the start gate to the boss's arena, with a camera that follows the crew",
    acceptance: ["the map scrolls from the start gate to the boss's arena", "the camera keeps every ship of the crew in view"],
  },
  114: {
    title: "Level 4: the enemy waves on the map", size: "small", pr: 211,
    body: "Split from #110 after it reached its budget: each enemy wave enters at its marker on the map of #113, with its drones and its timing",
    acceptance: ["each enemy wave enters at its marker on the map", "the next wave waits until the crew clears the last"],
  },
  115: {
    title: "Weekly dependency bump", size: "small", routine: "dependency-bump", pr: 213,
    body: "Every dependency to the newest release of its line in one pull request; a major release gets a card of its own",
    acceptance: ["the lockfile names the newest release of each line", "the test suite passes"],
  },
  116: {
    title: "Lobby: leave a match without penalty in its first 60 seconds", size: "medium", pr: 214,
    body: "A user may leave a match in its first 60 seconds without the quit penalty. The seat goes to the queue of #101",
    acceptance: [
      "Leave without penalty shows for the first 60 seconds of a match and not after",
      "a seat left goes to the first user in the queue",
      "two users leaving at the same moment give their seats to two different users in the queue",
    ],
  },
  117: {
    title: "Daily challenge: notify users when a new one opens", size: "small", pr: 215,
    body: "Every user who opted in gets one notice when the day's challenge opens at 18:00 Berlin time",
    acceptance: ["a user who opted in gets one notice when each new challenge opens", "a user who opted out gets none"],
  },
  118: {
    title: "Leaderboard: filter by ship", size: "small", pr: 216,
    body: "Users compare runs on the same ship. The leaderboard gets a ship filter, kept in the URL so a link shares it",
    acceptance: ["the leaderboard shows only the runs on the chosen ship", "the filter survives a reload"],
  },
  119: {
    title: "Leaderboard: 500 when no ship is chosen", size: "small", pr: 217,
    body: "SigNoz alert LeaderboardErrors: GET /leaderboard answers 500 on 63% of requests since e41b7c9, the merge of #118. " +
      "A leaderboard link without ?ship fails.\n\n" +
      "TypeError: Cannot read properties of undefined (reading 'split')\n" +
      "    at parseShipFilter (src/leaderboard/filter.ts:12:27)\n" +
      "    at getLeaderboard (src/leaderboard/routes.ts:31:19)",
    acceptance: ["GET /leaderboard without ?ship answers the runs of every ship", "a test covers the link without a filter"],
  },
  120: {
    title: "Season pass: 10 tiers, valid for the season", size: "medium", pr: 218,
    body: "A user buys a season pass of 10 reward tiers by card. Each tier unlocks at its season points, and the pass ends with the season",
    acceptance: [
      "a user with the pass unlocks each tier at its season points",
      "the profile shows the tiers unlocked and the season's end date",
      "a pass past its season unlocks nothing",
    ],
  },
  121: {
    title: "Profile: a user's past runs", size: "small", pr: 219,
    body: "The profile lists a user's runs of the last 12 months, newest first, with each run's date, ship and score",
    acceptance: ["the profile lists the last 12 months of runs", "a user sees only their own"],
  },
  122: {
    title: "Store: refund a purchase the server rolls back", size: "medium", pr: 220,
    body: "When the game server rolls back a purchase it could not grant, the user who paid for it by card gets a refund through Stripe, once",
    acceptance: [
      "a purchase the server rolls back refunds the user's card",
      "a rollback sent twice refunds once",
      "a failed refund shows on the purchase's page for support",
    ],
  },
  123: {
    title: "Leaderboard: p95 up from 0.31 s to 0.74 s since #118", size: "small", routine: "performance-read", pr: 221,
    body: "The weekly performance read: GET /leaderboard answers in 0.74 s at the p95 this week, up from 0.31 s the week before. " +
      "It rose with the merge of #118, whose ship filter joins the ships table per run",
    acceptance: ["the p95 of GET /leaderboard is back under 400 ms over a day of production traffic"],
  },
  124: {
    title: "Cost review: the month's spend by card", size: "small", routine: "cost-review",
    body: "The monthly cost review: the month's spend by card and by kind against the project's cap. Read it, then close the card",
  },
  125: {
    title: "Replays: share a run as a link", size: "small", pr: 222,
    body: "The replay screen offers a link to the run, the same kind of game link the challenge notice of #117 carries",
    acceptance: ["Share on the replay screen copies a link to the run", "the link carries the run's seed"],
  },
  // a developer's issue with a repro block: the webhook files it, and the reproduction gate proves the fix
  126: {
    title: "Boss fight: pausing in phase two freezes the game", size: "small", reporter: "lena.h", pr: 223,
    body: "Pausing in phase two of the level 3 boss freezes the game: after Resume the boss never moves again and the arena stays shut. " +
      "Resume() in server/boss/phase.go restores the phase timer only when b.phase == 1. The headless sim exits 1 while the boss stays frozen.\n\n" +
      "```repro\ngo run ./server/cmd/sim -level 3 -pause-in-phase 2\n```",
    repro: "go run ./server/cmd/sim -level 3 -pause-in-phase 2",
    acceptance: ["a boss paused and resumed in phase two fights on", "a boss paused and resumed in phase one or three fights on as before"],
  },
  // the film's intake, Monday of week 3: a nightly scan, an alert and a user's issue file cards on their own, then a
  // sentence in the chat becomes the plan for level 5 and its four cards
  133: {
    title: "Boss fight: pausing in phase two freezes the game", size: "small", reporter: "lena.h",
    body: "Pausing in phase two of the level 3 boss freezes the game: after Resume the boss never moves again and the arena stays shut.",
    acceptance: ["after Resume in phase two the boss moves again and the arena opens when it falls"],
  },
  134: {
    title: "Leaderboard: 500 when no ship is chosen", size: "small",
    body: "SigNoz alert LeaderboardErrors: GET /leaderboard answers 500 when a link carries no ?ship.",
    acceptance: ["GET /leaderboard without ?ship answers 200 with every ship's rows"],
  },
  135: {
    title: "Security: ws 8.17.1 for CVE-2024-37890", size: "small",
    body: "The nightly scan found ws 8.16.0 in the client's dev server, open to CVE-2024-37890: a request with many headers crashes it. 8.17.1 fixes it.",
    acceptance: ["the client builds and its tests pass on ws 8.17.1"],
  },
  136: {
    title: "Level 5: the ice moon", size: "large",
    body: "Level 5 lands the crew on an ice moon: ships slide on the ice, snow crawlers hunt in the caves and an avalanche boss waits at the end. " +
      "The ice, the crawlers and the avalanche share one sliding model",
    acceptance: ["the moon plays from the landing to the boss", "ships slide on the ice with their momentum", "the avalanche boss can be beaten by every crew size"],
  },
  137: {
    title: "Ice moon: ships slide on the ice with their momentum", size: "medium", plan: 136, key: "ice-physics",
    body: "Card ice-physics of plan #136, accepted by sebastian. On ice a ship keeps its momentum and turns slowly",
    acceptance: ["a ship on ice keeps its momentum after the thrust stops", "levels 1 to 4 fly as before"],
  },
  138: {
    title: "Ice moon: the frozen caves map and its waves", size: "medium", plan: 136, key: "cave-map",
    body: "Card cave-map of plan #136, accepted by sebastian. The caves run from the landing site to the boss's glacier, the waves enter along them",
    acceptance: ["the map scrolls from the landing site to the glacier", "each wave enters at its marker in the caves"],
  },
  139: {
    title: "Ice moon: the snow crawler enemy", size: "small", plan: 136, key: "snow-crawler",
    body: "Card snow-crawler of plan #136, accepted by sebastian. A crawler that slides on the ice toward the nearest ship",
    acceptance: ["a crawler slides toward the nearest ship", "two shots destroy a crawler"],
  },
  140: {
    title: "Ice moon: the avalanche boss", size: "medium", plan: 136, key: "avalanche-boss",
    body: "Card avalanche-boss of plan #136, accepted by sebastian. A boss that sends down avalanches which slide on the ice model",
    acceptance: ["each avalanche slides on the ice model", "the boss falls after three hits on its core"],
  },
  // the first run of the image-bump routine Sebastian adds in scene 38
  141: {
    title: "Weekly image bump", size: "small", pr: 231,
    body: "Run the skill dependency-update.\n\nBump every pinned base image of the game server and the build to the newest release of its line, in one pull request.\n\nfiled by the factory · routine image-bump · run 1",
  },
};

function card(issue) {
  const c = cards[issue];
  if (!c) throw new Error(`no card #${issue} in the story`);
  return c;
}

// title is issue's card as factoryd's CardTitle names it: a planned card by its key, any other by its title.
const title = (issue) => card(issue).key ?? card(issue).title;

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
    issue, title: c.title, body: body(issue), size: c.size, budget: budgets[c.size], parent: c.plan, planKey: c.key,
    source: c.plan ? "plan" : undefined, repro: c.repro, ...o,
  });
}

// filing is the new_card call that files issue from the chat.
function filing(issue, lane) {
  const c = card(issue);
  return { title: c.title, body: c.body, lane, size: c.size, acceptance: c.acceptance };
}

// requests are what Sebastian types into the chat.
const requests = {
  queue: "Users ask for a queue when a co-op lobby is full.",
  matchmaking: "Matchmaking feels slow.",
  belt: "Build level 4, the asteroid belt.",
  report: "File a fix card for maria.k's report #106.",
  store: "Is the store still failing?",
  leaderboardCheck: "Is the leaderboard all right since #118 went live?",
  leaderboard500: "Has the leaderboard alert settled?",
  split: "Split #110 into smaller cards instead of raising its budget.",
  moon: "Build level 5, the ice moon.",
  repoint: "Let #112 wait on #114 instead of #110, then close #110.",
};

// asks are the questions the agent and the factory put to a person, by story.
const asks = {
  queue: {
    issue: 101,
    question: "A queue fits the lobby: a full lobby takes users in order, and a user leaving offers the seat " +
      "to the first in line. How does that user hear the seat is free?",
    choices: ["In the game", "By push notification"],
    answer: "In the game",
  },
  bossHealth: { issue: 105, question: "Does the boss's health grow with the size of the crew?", choices: ["Grow with the crew", "Same for every crew"] },
  // factoryd's own question at a budget stop, not the agent's; alert is each ask's escalation alert
  budget: {
    issue: 110, budget: true, alert: 15,
    question: "The card has €0.40 of its €5.00 budget left, and a session on big needs €0.60. Fund one more session?",
    choices: ["Fund one more session", "End the card"],
  },
  editor: {
    issue: 113, alert: 17,
    question: "Which map editor does the belt's map build on? Tiled is the most used, LDtk the newest, " +
      "Ogmo the smallest.",
    choices: ["Tiled", "LDtk", "Ogmo"],
    answer: "Tiled",
  },
  // the overnight asks, in the order the morning answers them: #120 and #121 at once, #117 two minutes later
  morning: [
    {
      issue: 120, alert: 18, question: "Does a tier not reached by the season's end come back as credit?", choices: ["No refund", "Refund as credit"],
      answer: "No refund",
    },
    {
      issue: 121, alert: 19, question: "Do abandoned runs show in the profile's list?", choices: ["Show them, greyed out", "Hide them"],
      answer: "Show them, greyed out",
    },
    {
      issue: 117, alert: 20, question: "Does the notice carry a link that opens the game at the new challenge?",
      choices: ["Link it", "Leave it out"], answer: "Link it",
    },
  ],
  // the share link's ask, which at full auto the agent settles in its wake turn from #117's merged file
  shareLink: {
    issue: 125, alert: 21,
    question: "Does the share link open the replay in the game, or on a web page with the run's score?",
    choices: ["In the game", "On a web page"],
    answer: "In the game",
  },
};

// escalation is a card's escalation text of ask: factoryd's own question at a budget stop, else the agent's.
const escalation = (ask) => (ask.budget ? ask.question : state.AGENT_ASKS + ask.question);

// asking is what ask, put age seconds ago, leaves beside its card: factoryd's question_asked row, the escalation alert
// and the inbox's row in conversation, whose answer row offers the choices.
function asking(now, ask, age, conversation) {
  const source = ask.budget ? "budget" : "agent";
  return {
    events: [state.event(now, { issue: ask.issue, kind: "question_asked", age, detail: { question: ask.question, choices: ask.choices, source } })],
    alerts: [state.alert(now, { id: ask.alert, kind: "escalation", source, task: ask.issue, age })],
    inbox: state.asked(now, { issue: ask.issue, question: ask.question, choices: ask.choices, age, budget: ask.budget, conversation }),
  };
}

// answered is sebastian's answer to ask age seconds ago, by via, "button" or "chat".
const answered = (now, ask, age, via) =>
  state.event(now, { issue: ask.issue, kind: "question_answered", actor: project.login, via, age, detail: { answer: ask.answer } });

// answerRows are the rows a press of ask's answer in the chat's answer row stores age seconds ago: the member's choice
// and the factory's word on it.
const answerRows = (now, ask, age, conversation) => [
  state.message(now, { role: "user", content: ask.answer, age, conversation }),
  state.poke(now, { issue: ask.issue, content: `Answered #${ask.issue} with “${ask.answer}”; the card goes on.`, age, conversation }),
];

// replies are the agent's words in the intake chats, beside its tool calls.
const replies = {
  queue: "In the game it is: the lobby already sends its state over the match socket, so the seat offer goes out on it too. The card:",
  matchmakingRead: "I measure it first: the telemetry's alerts on matchmaking.",
  matchmaking: "The alerts agree with you: the rule on GET /match's **p95 above 1 s** fired three times this week " +
    "and settled each time without a fix. The card sets the bar at 400 ms:",
  moon: "That is several cards: the ice, the caves, the crawlers and the boss. " +
    "I file it in the plan lane, where the planner splits it into cards in their order, and the plan waits for you to accept it:",
  belt: "That is several cards: the map, the drones, the boss and the physics under them. " +
    "I file it in the plan lane, where the planner splits it into cards in their order, and the plan waits for you to accept it:",
  report: "maria.k paid, and her receipt never came, while a friend's did: the receipt goes out only when the payment " +
    "settles before the store page closes. The fix sends it from Stripe's webhook, once per purchase:",
  alertsRead: "I read the alerts.",
  leaderboardCheckRead: "I read the open alerts and #118.",
  // leaderboardBroken is the answer with the times the tools gave, as "14:07"
  leaderboardBroken: (live, raised) => `No. **LeaderboardErrors** has been open since ${raised} UTC, two minutes after #118 went live at ${live}, ` +
    "and #118 merged at its head **e41b7c9**. The factory files the fix from the alert.",
  store: "No. **StoreErrors** settled when #104 went live, with the verdict real, and no alert is open.",
  leaderboard500: "It has. **LeaderboardErrors** rose minutes after the merge of #118 and settled when #119 went live, with the verdict real. " +
    "No alert is open.",
  split: "#110 has €0.40 of its €5.00 left and failed its acceptance twice on the enemy waves. Two small cards fit a budget each: " +
    "the map and its camera now, and the enemy waves on it, in the backlog until the map is in:",
  repoint: "The boss enters after the last wave, so #112 waits on #114 in #110's place. Then #110 closes with the split in its note:",
  // shareLink is the agent's settling of #125's ask in its wake turn
  shareLink: "#117's challenge link, merged and live, opens the game at its target through src/links/game.ts. " +
    "#125 builds the same kind of link, so I answered **In the game**. Nothing in it is direction or money.",
};

// wakeAsk is the waker's text of a wake on the asks of a batch, as factoryd's askText words it: each ask with its card,
// and the pool's line, since the woken member, Sebastian, is an approver.
function wakeAsk(list) {
  return (list.length === 1 ? "Wake: 1 ask waits for a human." : `Wake: ${list.length} asks wait for a human.`) + list.map((a) => `\n#${a.issue}: ${a.question}`).join("") +
    "\n\nRead each card. Settle what your permissions allow. A card waiting on its budget takes fund from your pool. " +
    "For what stays the human's, record what you found with attach_analysis. An ask already answered is done.";
}

// alerts are the alert rows of the two weeks; a scene passes now and the ages to state.alert. raised and resolved
// date the telemetry's alerts on the calendar: the latency alert settled itself three times the week before, and an
// alert that filed a card settles real when the card goes live.
const alerts = {
  matchLatency: [
    { id: 11, kind: "alert", source: "GET /match p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd",
      raised: date(0, "fri", "20:00"), resolved: date(0, "fri", "20:30") },
    { id: 12, kind: "alert", source: "GET /match p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd",
      raised: date(0, "sat", "20:00"), resolved: date(0, "sat", "21:00") },
    { id: 13, kind: "alert", source: "GET /match p95 above 1 s", fingerprint: "5d3a9c71e04b2f86", verdict: "noise", resolvedBy: "factoryd",
      raised: date(0, "sun", "20:00"), resolved: date(0, "sun", "21:00") },
  ],
  store: {
    id: 14, kind: "alert", source: "StoreErrors", task: 104, fingerprint: "b81e2f04a9c63d17", verdict: "real", resolvedBy: "factoryd",
    raised: date(1, "tue", "12:59"), resolved: date(1, "tue", "14:00"),
    detail: { summary: "POST /store/confirm answers 500 on 41% of requests", error: cards[104].body.split("\n\n")[1] },
  },
  badMerge: {
    id: 16, kind: "alert", source: "LeaderboardErrors", task: 119, fingerprint: "e07c4a92d15b8f3e", verdict: "real", resolvedBy: "factoryd",
    raised: date(2, "thu", "17:19"), resolved: date(2, "thu", "17:54"),
    detail: { summary: "GET /leaderboard answers 500 on 63% of requests since e41b7c9", error: cards[119].body.split("\n\n")[1] },
  },
};

// alertsAt are the telemetry's alert rows raised by the story's time at, newest first, each naming its card once the
// card is filed and settled with its verdict once at passed its resolve.
function alertsAt(now, at) {
  const age = (d) => (at - d) / 1000;
  return [alerts.badMerge, alerts.store, ...alerts.matchLatency.slice().reverse()].filter((a) => a.raised <= at).map((a) => {
    const settled = a.resolved <= at;
    return state.alert(now, {
      ...a, task: filed[a.task] <= at ? a.task : undefined, age: age(a.raised), resolvedAge: settled ? age(a.resolved) : undefined,
      verdict: settled ? a.verdict : undefined, resolvedBy: settled ? a.resolvedBy : undefined,
    });
  });
}

// approvals are the plans and merges that wait on a person.
const approvals = {
  moonPlan: {
    id: 41, kind: "plan", task: 136,
    brief: "The planner splits level 5 into four cards: the ice model, the caves and the snow crawler beside each other, then the avalanche boss.",
    detail: "The ice model comes first, because the ships, the crawlers and the avalanches all slide on it. The caves with their waves " +
      "and the snow crawler then build side by side. The avalanche boss comes last, as it needs both. One question is open: whether " +
      "the avalanche resets the crew's shields.",
  },
  beltPlan: {
    id: 21, kind: "plan", task: 105,
    brief: "The planner splits level 4 into four cards: the physics model, the map and the mining drone beside each other, then the boss.",
    detail: "The physics model comes first, because the map's rocks and the drone both move on it: a rock and its fragments are one " +
      "kind of body, and a shot splits a rock into fragments that keep its momentum. The map with its waves and the mining drone " +
      "then build side by side. The boss comes last, as it needs both. One question is open: whether the boss's health grows " +
      "with the size of the crew.",
  },
  refund: {
    id: 31, kind: "merge", task: 122, pr: cards[122].pr, risk: "high",
    reason: "risk class high: the change touches src/payments",
    brief: "Refunds a purchase the game server rolls back to the user's card, once per purchase.",
    detail: "Adds refundPurchase in src/payments/refund.ts, called when the game server rolls back a purchase. It creates one Stripe " +
      "refund per paid purchase with an idempotency key, so a rollback sent twice refunds once. The charge.refunded webhook marks " +
      "the purchase refunded, and a failed refund shows on the purchase's page for support. Tests cover a double rollback and a " +
      "declined refund.",
    recommendation: "Merge it: the refunds key on the purchase's id, and the tests send a rollback twice and find one refund.",
    whyHuman: ["the project's merge rule is human", "risk class high is requires_approval"],
  },
  // shareLink is #125's merge at manual: a change of normal risk still waits on the human merge rule
  shareLink: {
    id: 33, kind: "merge", task: 125, pr: cards[125].pr, risk: "normal",
    reason: "the project's merge rule is human",
    brief: "The replay screen offers the run as a link, built like the challenge notice's own.",
    detail: "Adds Share on the replay screen. It builds the link with gameLink from src/links/game.ts, which the challenge notice " +
      "of #117 uses, so the link opens the game at the replay with its seed. Tests build the link and read its path and seed.",
    recommendation: "Merge it: the screen reuses the notice's link builder, and the tests read the replay's path and seed from the link.",
    whyHuman: ["the project's merge rule is human"],
  },
};

// plans are the planner's plans: level 4, its cards by key with the issues they become on accept.
const plans = {
  105: {
    summary: "Four cards: the physics model first, then the map and the mining drone side by side, then the boss.",
    question: asks.bossHealth,
    cards: [
      { key: "rock-physics", role: "foundation", issue: 109, dependsOn: [] },
      { key: "belt-map", role: "feature", issue: 110, dependsOn: ["rock-physics"] },
      { key: "mining-drone", role: "feature", issue: 111, dependsOn: ["rock-physics"] },
      { key: "belt-boss", role: "integration", issue: 112, dependsOn: ["belt-map", "mining-drone"] },
    ],
  },
  136: {
    summary: "Four cards: the ice model first, then the caves and the snow crawler side by side, then the avalanche boss.",
    question: { issue: 136, question: "Does the avalanche reset the crew's shields?", choices: ["Keep the shields", "Reset the shields"] },
    dirs: ["src/levels/moon", "server/levels/moon"],
    cards: [
      { key: "ice-physics", role: "foundation", issue: 137, dependsOn: [] },
      { key: "cave-map", role: "feature", issue: 138, dependsOn: ["ice-physics"] },
      { key: "snow-crawler", role: "feature", issue: 139, dependsOn: ["ice-physics"] },
      { key: "avalanche-boss", role: "integration", issue: 140, dependsOn: ["cave-map", "snow-crawler"] },
    ],
  },
};

// planCards is the plan of issue as the planner writes its cards.
function planCards(issue) {
  return plans[issue].cards.map((p) => {
    const c = card(p.issue);
    return {
      key: p.key, role: p.role, title: c.title, brief: c.body.replace(/^Card [^.]+\. /, ""), directories: plans[issue].dirs ?? ["src/levels/belt", "server/levels/belt"],
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
  // the refund enters the merge queue on Sebastian's approval
  122: { queued: 64 * MIN, at: 66 * MIN, live: 72 * MIN, run: 86 },
  // the share link at full auto merges on the merge rule auto, the agent having settled its ask
  125: { queued: 32.5 * MIN, at: 34.5 * MIN, live: 40.5 * MIN, run: 91, approver: "merge rule auto" },
  126: { queued: 23 * MIN, at: 26 * MIN, live: 32 * MIN, run: 92 },
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
    { run: 6, due: date(1, "fri", "07:00"), took: 70, outcome: "no change", note: "GET /leaderboard p95 0.31 s, every endpoint under 400 ms" },
    { run: 7, due: date(2, "fri", "07:00"), took: merges[123].live, outcome: "done", issue: 123, cost: 0.62, note: "GET /leaderboard p95 0.74 s, up from 0.31 s since #118" },
  ],
  "cost-review": [
    { run: 3, due: date(2, "thu", "08:00"), took: 11 * HOUR, outcome: "done", issue: 124, note: "€24.42 of the €60 cap, €0.15 per card" },
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
        [30, "Reading the ship select first: src/ships/ShipSelect.tsx and its query in src/ships/queries.ts."],
        [4 * MIN, "The ships query already loads each ship's model. I add its speed and its shield to it, so the screen needs no second request."],
        [9 * MIN, "The screen shows both under each ship's name: \"Speed 7 · Shield 4\". Next, the tests."],
        [17 * MIN, "npm test: the 3 new tests of the ship select pass, 214 in all. Pushing the branch and opening the pull request."],
      ],
    },
  },
  104: {
    "s-1": {
      commit: "a71c3d0",
      words: [
        [30, "The alert's stack trace points at src/payments/webhook.ts:57: confirmPurchase reads paymentIntent.charges.data[0]."],
        [3 * MIN, "API version 2022-11-15 sends no charges list on a PaymentIntent, only latest_charge, so charges is undefined and " +
          "every confirmation answers 500. confirmPurchase now reads latest_charge."],
        [9 * MIN, "A test replays a payment_intent.succeeded event of API version 2022-11-15: the purchase is confirmed, 2xx."],
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
        [40, "Reading the Stripe webhook in src/payments/webhook.ts and the receipt in src/mail/receipt.ts."],
        [6 * MIN, "The receipt now goes out from the payment_intent.succeeded handler, once the payment settles."],
        [15 * MIN, "npm test passes. Pushing and opening the pull request."],
      ],
    },
    "s-2": {
      commit: "3e7f915",
      words: [
        [30, "The acceptance job failed on \"a webhook delivered twice sends one receipt\": Stripe sent the event again, and two receipts went out."],
        [4 * MIN, "The handler mails before it records the receipt. I record the receipt keyed on the PaymentIntent's id, " +
          "in the transaction that marks the purchase paid, and mail only when that insert took."],
        [12 * MIN, "npm test passes, and the acceptance test delivers the event twice: one receipt. Pushing to the pull request."],
      ],
    },
  },
  116: {
    "s-1": {
      commit: "2d7f0b9",
      words: [
        [40, "Reading server/lobby/leave.go and offerSeat, the queue's hand-over from #101."],
        [5 * MIN, "Leave without penalty shows for the first 60 seconds. The check reads the match's start from the server's clock, not the client's."],
        [14 * MIN, "A leave frees the seat, then offerSeat offers it to the first user in the queue. The tests of the window and the hand-over pass."],
        [26 * MIN, "go test ./server/lobby/...: 9 new tests pass. Pushing and opening the pull request."],
      ],
    },
    "s-2": {
      commit: "e5a3c18",
      words: [
        [30, "The review found a race in leave.go: the seat is freed and offered in two steps, and two leaves at once offer both seats to the same user."],
        [4 * MIN, "Leave now holds the lobby's lock while it frees the seat and offers it, so the two steps are one."],
        [11 * MIN, "A new test runs two leaves at the same moment, 50 times under -race: two different users get the two seats every time."],
        [15 * MIN, "go test -race ./server/lobby/...: 10 new tests pass. Pushing to the pull request."],
      ],
    },
  },
  117: {
    "s-1": {
      words: [
        [30, "Reading src/notify/challenge.ts and the job that sends it, src/jobs/challenges.ts."],
        [3 * MIN, "The job sends each notice 24 hours after the last opening. Running npm test -- challenge."],
        [6 * MIN, "npm test -- challenge fails: the challenge of Sunday 25 October opens at 18:00 and wants its notice then, " +
          "and challenge.ts sends it at 17:00. I move the arithmetic from UTC to Berlin time."],
        [10 * MIN, "npm test -- challenge fails the same way: 17:00, not 18:00. Back to UTC in challenge.ts, with the time zone applied after."],
        [13 * MIN, "npm test -- challenge fails the same way again: 17:00, not 18:00."],
      ],
    },
    "s-2": {
      commit: "7a4c2e9",
      words: [
        [30, "Starting from the supervisor's note: both versions added 24 hours, and the test's day falls on the night the clocks go back. " +
          "I add one calendar day in Europe/Berlin."],
        [5 * MIN, "npm test -- challenge: 6 passing. The challenge of 25 October gets its notice at 18:00 on Sunday."],
        [8 * MIN, "npm test: 221 passing, and the notice carries its link from gameLink in src/links/game.ts. Pushing and opening the pull request."],
      ],
    },
  },
  120: { "s-1": { commit: "b3e81f6", words: [] } },
  121: { "s-1": { commit: "f16d07a", words: [] } },
  123: { "s-1": { commit: "7a4f0e3", words: [] } },
  110: { "s-1": { commit: "8e2a5d1", words: [] }, "s-2": { commit: "c47b0f9", words: [] } },
  113: {
    "s-1": {
      words: [
        [40, "Reading src/levels/belt: the physics model of #109 and the mining drone of #111, which spawns from a hand-written list."],
        [100, "The belt's map needs a map editor or a hand-written layout. Every level 4 card after this one lives with that choice, so I ask."],
      ],
    },
    "s-2": {
      words: [
        [30, "The answer is Tiled: Phaser loads its maps as they are, and its object layers carry the wave markers #114 needs later. Adding the map to assets/maps."],
        [6 * MIN, "The map scrolls from the start gate to the arena, and the camera keeps the crew in view. Next, the tests."],
      ],
    },
  },
  125: { "s-1": { words: [] }, "s-2": { commit: "5e9c3b2", words: [] } },
  122: {
    "s-1": {
      commit: "d4c8a21",
      words: [
        [40, "Reading the rollback in src/store/rollback.ts and the Stripe client in src/payments/stripe.ts."],
        [6 * MIN, "A rollback marks the purchase reversed and takes the item back. I add refundPurchase in src/payments/refund.ts for the paid ones."],
        [11 * MIN, "refundPurchase creates one Stripe refund per paid purchase. Next, the charge.refunded webhook."],
        // the answer to the steer of steers.refund, which reaches the session 13 minutes in
        [13.2 * MIN, "Taking your message: refundPurchase passes the purchase's id to Stripe as the idempotency key, " +
          "and a test sends the rollback twice and finds one refund."],
        [21 * MIN, "npm test: 12 new tests pass, among them a rollback sent twice and a declined refund. Pushing and opening the pull request."],
      ],
    },
  },
  126: {
    "s-1": {
      commit: "4f8b2d3",
      words: [
        [30, "Reading the issue's repro and server/boss/phase.go: Resume restores the phase timer only when b.phase == 1."],
        [2 * MIN, "The repro at main exits 1: in phase two the timer stays stopped after Resume, so the boss never moves again. Every phase has a timer, so Resume restores it in each."],
        [5 * MIN, "A test pauses and resumes the boss in each of its three phases: it fights on in all three."],
        [8 * MIN, "go test ./...: 224 passing, and the issue's repro exits 0. Pushing and opening the pull request."],
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
// admitted is when it took a slot, if not at its creation. A waiting-human phase's ask is the question the card waits
// on since that phase, with its choices and its escalation alert. steps are its timeline; each session started by then
// carries its words said by then. card sets the rest of the card: who filed it and from where.
function life(now, issue, age, { phases, admitted, steps = [], card: o = {} }) {
  const passed = phases.filter((p) => p.from <= age);
  const p = Object.assign({}, ...passed);
  const since = age - passed.findLast((q) => "status" in q || "gate" in q).from;
  const final = ["done", "failed", "closed"].includes(p.status);
  const ask = p.status === "waiting-human" ? p.ask : undefined;
  const task = boardCard(now, issue, {
    lane: "ready", age, status: p.status, model: p.model, spent: p.spent, pr: p.pr ? cards[issue].pr : undefined, chain: p.chain,
    gate: final ? undefined : p.gate, gateSince: final || !p.gate ? undefined : since, finished: final ? since : undefined,
    admitted: admitted === undefined || admitted > age ? undefined : age - admitted,
    escalation: ask && escalation(ask), choices: ask?.choices, escalatedAt: ask && since, escalationAlert: ask?.alert, ...o,
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
  100: date(-1, "tue", "11:00"),
  101: date(1, "mon", "11:00"), 102: date(1, "mon", "11:36"), 103: date(1, "mon", "12:36"), 104: date(1, "tue", "13:00"),
  106: date(1, "wed", "15:30"), 107: date(1, "wed", "16:00"), 108: date(1, "thu", "02:00"),
  115: date(2, "mon", "06:00"), 116: date(2, "tue", "08:00"), 117: date(2, "wed", "02:15"), 118: date(2, "thu", "16:00"),
  119: new Date(date(2, "thu", "17:19").getTime() + 30 * 1000), 120: date(2, "wed", "02:08"), 121: date(2, "wed", "02:18"),
  123: date(2, "fri", "07:00"),
  // level 4: the plan #105 waits from Wednesday until Sebastian accepts it on Thursday evening, which files its four
  // cards; on Friday morning he splits #110, stopped by its budget overnight, from the chat
  105: date(1, "wed", "10:00"), 109: date(1, "thu", "20:00"), 110: date(1, "thu", "20:00"), 111: date(1, "thu", "20:00"),
  112: date(1, "thu", "20:00"), 113: date(1, "fri", "08:40"), 114: date(1, "fri", "08:40"),
  // the refund #122 is filed a quarter hour before scene 11's steer
  122: date(2, "thu", "08:46"),
  125: date(2, "fri", "10:00"),
  // lena.h's issue on Friday afternoon, its card filed by the webhook at the issue's time
  126: date(2, "fri", "14:20"),
};

// ageAt is issue's card's age in seconds at the story's time at, and at the story's time seconds after its filing.
const ageAt = (issue, at) => (at - filed[issue]) / 1000;
const at = (issue, seconds) => new Date(filed[issue].getTime() + seconds * 1000);

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
  101: [{ verdict: "approve", summary: "A full lobby queues users in order, and a user leaving offers the first in line a seat held for 30 seconds." }],
  102: [{ verdict: "approve", summary: "Keeps the open lobbies in memory, indexed by region. The load test measures GET /match at 0.31 s at the p95." }],
  103: [{ verdict: "approve", summary: "Adds the speed and the shield to the ships query and shows them under each ship, with tests for the screen." }],
  104: [{ verdict: "approve", summary: "confirmPurchase reads latest_charge of API version 2022-11-15, and a replayed event of that version confirms the purchase." }],
  108: [{ verdict: "approve", summary: "express 4.20.0 pins path-to-regexp 0.1.10; npm audit reports no high finding, and the route tests pass." }],
  115: [{ verdict: "approve", summary: "12 packages move to the newest release of their line, none a major release; the test suite passes." }],
  118: [{ verdict: "approve", summary: "The leaderboard takes a ship filter from the URL, and the tests cover a chosen ship and a reload." }],
  119: [{ verdict: "approve", summary: "parseShipFilter answers no filter when ?ship is absent, and a test covers the link without one." }],
  107: [{ verdict: "approve", summary: "Mails the receipt once per purchase from the webhook, keyed on the PaymentIntent. The tests deliver the event twice." }],
  116: [
    {
      verdict: "concerns",
      summary: "The leave window and the hand-over to the queue work, but two users leaving at the same moment can give both seats to the same user.",
      findings: [
        "server/lobby/leave.go:48: Leave frees the seat, then offerSeat reads the queue in a second step without the lobby's lock. Two leaves " +
          "at once read the same head of the queue and offer both seats to the first in line. Free the seat and offer it under one hold of the lobby's mutex.",
      ],
    },
    { verdict: "approve", summary: "Frees the seat and offers it under one hold of the lobby's lock. The race test finds two users for two seats every time." },
  ],
  120: [{ verdict: "approve", summary: "A season pass of 10 tiers bought by card. Each tier unlocks at its points, and the profile shows what is unlocked." }],
  121: [{ verdict: "approve", summary: "Lists a user's runs of the last 12 months, newest first, scoped to the user." }],
  123: [{ verdict: "approve", summary: "The leaderboard loads the runs' ships in one query, not one per run. The load test measures GET /leaderboard at 0.29 s at the p95." }],
  122: [{ verdict: "approve", summary: "Refunds each rolled-back purchase once, keyed on the purchase's id. The tests cover a rollback sent twice and a declined refund." }],
  125: [{ verdict: "approve", summary: "The replay screen builds its link with the challenge notice's gameLink, and the tests read the replay's path and seed from it." }],
  126: [{ verdict: "approve", summary: "Resume restores the phase timer in every phase. The tests pause the boss in each of its three phases, and the issue's repro passes at the head." }],
};

// mergeSpec is the spec of approval a's merge request as factoryd writes it: the risk class, the review's verdict, the
// head the merge takes, the agent's recommendation and why a human approves.
function mergeSpec(a) {
  const rv = reviews[a.task].at(-1);
  return {
    risk_class: a.risk, migration: false, verdict_summary: rv.summary, review: { verdict: rv.verdict, summary: rv.summary },
    head_sha: Object.values(sessions[a.task]).findLast((s) => s.commit).commit, recommendation: a.recommendation, why_human: a.whyHuman,
  };
}

// review is round n of the review of issue's pull request, from from to at, on the commit of session sid.
function review(issue, n, from, at, sid) {
  return state.modelReview(from, at, { pr: cards[issue].pr, commit: sessions[issue][sid].commit, round: n, ...reviews[issue][n - 1] });
}

// checksFailed are the findings of a card's failed checks, sent on to its next session.
const checksFailed = {
  107: "acceptance: a webhook delivered twice sends one receipt: 2 receipts sent, want 1",
  110: "acceptance: each enemy wave enters at its marker on the map: the waves after the third never spawn",
};

// merge is the steps of issue's merge, in seconds after its creation: its turn in the merge queue it entered at
// queued, a minute before factory-merge merges the head its last session pushed at at, and its end at live, when the
// green run run of its chain covers it.
function merge(issue, { queued, at, live, run, approver }) {
  const pr = cards[issue].pr;
  const head = Object.values(sessions[issue]).findLast((s) => s.commit).commit;
  const reason = `live: covered by run ${run}`;
  return [
    state.queueTurn(queued, at - MIN),
    state.merged(at - MIN, at, { pr, commit: head, approver }),
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

// sources are files of the repository at main, as the chat's file tool reads them.
const sources = {
  "src/links/game.ts": [
    "// A link that opens the game at its target: the challenge notice of #117 carries one.",
    "export function gameLink(t: LinkTarget): string {",
    "  const url = new URL(`/play/${t.kind}/${t.id}`, \"https://nebula-run.example\");",
    '  if (t.seed !== undefined) url.searchParams.set("seed", String(t.seed));',
    "  return url.toString();",
    "}",
    "",
  ].join("\n"),
};

// supervisor is the supervisor's step in #117's first session: the flip-flop detector's trip, and the insight the
// next session starts from.
const supervisor = {
  issue: 117,
  detector: "flip_flop",
  trip: "after src/notify/challenge.ts returned to a content it had before, `npm test -- challenge` failed again, unchanged",
  decision: "redirect",
  reason: "Both versions of challenge.ts add 24 hours to the last opening, and the test's day is 25 October, the night " +
    "the clocks go back: 24 hours after Saturday's 18:00 is 17:00 on Sunday. Add one calendar day in Europe/Berlin instead.",
};

// answeredAt are the morning's answers to the overnight asks on week 2's Wednesday: #120 and #121 at once, #117 two
// minutes later. Each card asked at its intake, a minute after its filing.
const answeredAt = { 120: date(2, "wed", "10:58"), 121: date(2, "wed", "10:58"), 117: date(2, "wed", "11:00") };
const ASKED = MIN;

// waited are the phases of issue's card from its filing until it takes its slot with the morning's answer.
function waited(issue) {
  return [
    { from: 0, status: "queued" },
    { from: ASKED, status: "waiting-human", ask: asks.morning.find((a) => a.issue === issue) },
    { from: (answeredAt[issue] - filed[issue]) / 1000, status: "queued" },
  ];
}

// built is issue's card that took its slot with the morning's answer, then built, pushed, passed its checks and
// review and merged; the offsets in minutes after the answer, spent at each of the four.
function built(issue, { start, push, reviewed, merged, spent }) {
  const M = (answeredAt[issue] - filed[issue]) / 1000;
  const at = (m) => M + m * MIN;
  return {
    admitted: M,
    phases: [
      ...waited(issue),
      { from: at(start), status: "running", gate: "session", model: "small", spent: spent[0] },
      { from: at(push + 0.5), status: "in-review", gate: "checks", spent: spent[1], pr: true },
      { from: at(push + 7), gate: "review" },
      { from: at(reviewed + 1), gate: "merge-queue", spent: spent[2] },
      { from: at(merged), status: "done", spent: spent[3] },
    ],
    steps: [
      state.intake(0, 20),
      ...session(issue, 1, at(start), at(push), { model: "small" }),
      state.checks(at(push + 0.5), at(push + 7)),
      review(issue, 1, at(push + 7), at(reviewed), "s-1"),
    ],
  };
}

// A is #117's answer, seconds after its filing.
const A = (answeredAt[117] - filed[117]) / 1000;

// lives are the cards whose life more than one scene shows, offsets in seconds after each card's creation.
const lives = {
  // the daily challenge takes its slot with the morning's answer: its first session circles on the same failing test, the
  // flip-flop detector trips, and the supervisor redirects it to a second session
  117: {
    admitted: A,
    phases: [
      ...waited(117),
      { from: A + MIN, status: "running", gate: "session", model: "small", spent: 0.04 },
      { from: A + 8 * MIN, spent: 0.13 },
      { from: A + 14 * MIN, spent: 0.22 },
      { from: A + 16 * MIN, gate: "session", spent: 0.26 },
      { from: A + 22 * MIN, spent: 0.33 },
      { from: A + 25.5 * MIN, status: "in-review", gate: "checks", spent: 0.38, pr: true },
    ],
    steps: [
      state.intake(0, 20),
      state.supervisor(A + 15 * MIN, supervisor),
      ...session(117, 1, A + MIN, A + 15 * MIN + 5, { model: "small", outcome: "redirect" }),
      ...session(117, 2, A + 16 * MIN, A + 25 * MIN, { model: "small" }),
      state.checks(A + 25.5 * MIN, A + 32 * MIN),
    ],
  },
  // the season pass and the profile build side by side from the morning's answer
  120: built(120, { start: 1.5, push: 33, reviewed: 47, merged: 58, spent: [0.05, 0.71, 0.83, 0.86] }),
  121: built(121, { start: 1, push: 19, reviewed: 31, merged: 40, spent: [0.04, 0.36, 0.44, 0.46] }),
  // the lobby queue waits in the merge queue on Monday afternoon, merges, and is live two hours after its filing
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
  // matchmaking builds a second time after a failed test
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
  // the ship select, filed on the form
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
  // the receipt: the first attempt on small fails the acceptance job, its finding goes to the stronger
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
  // the belt's map takes its slot when the physics model #109 is live; two sessions on big fail the acceptance on the
  // enemy waves, and the third session's start finds €0.40 of its €5.00 left: the budget stops it overnight. The split
  // closes it in the morning.
  110: {
    admitted: 160 * MIN,
    phases: [
      { from: 0, status: "queued" },
      { from: 161 * MIN, status: "running", gate: "session", model: "big", spent: 0.08 },
      { from: 236 * MIN, status: "in-review", gate: "checks", spent: 2.05, pr: true },
      { from: 243 * MIN, status: "running", gate: "session", spent: 2.2 },
      { from: 300 * MIN, spent: 3.5 },
      { from: 356 * MIN, status: "in-review", gate: "checks", spent: 4.6 },
      { from: 363 * MIN, status: "waiting-human", gate: undefined, ask: asks.budget },
      { from: (filed[113] - filed[110]) / 1000 + 15, status: "closed" },
    ],
    steps: [
      state.intake(0, 20),
      ...session(110, 1, 161 * MIN, 235 * MIN, { model: "big" }),
      state.checks(235.5 * MIN, 242 * MIN, "acceptance"),
      state.findings(242 * MIN + 5, { stage: "checks", to: "agent", attempt: 1, list: [checksFailed[110]] }),
      ...session(110, 2, 243 * MIN, 355 * MIN, { model: "big" }),
      state.checks(355.5 * MIN, 362 * MIN, "acceptance"),
    ],
    card: { attempts: 2 },
  },
  // the map and its camera, filed by the split: its first session asks which map editor, and the answer in the chat 25
  // minutes later starts its second
  113: {
    phases: [
      { from: 0, status: "queued" },
      { from: MIN, status: "running", gate: "session", model: "small", spent: 0.02 },
      { from: 2.75 * MIN, status: "waiting-human", gate: undefined, spent: 0.06, ask: asks.library },
      { from: 28.5 * MIN, status: "running", gate: "session" },
      { from: 33 * MIN, spent: 0.17 },
    ],
    steps: [
      state.intake(0, 20),
      ...session(113, 1, MIN, 2.75 * MIN, { model: "small", outcome: "needs_info" }),
      state.sessionStart(28.5 * MIN, { session: "s-2", model: "small", attempt: 2 }),
    ],
  },
  // the boss waits on the map and the drone: on #110 until the split points it at #114
  112: { phases: [{ from: 0, status: "waiting-deps" }] },
  // the enemy waves wait in the backlog until the map is in
  114: { phases: [{ from: 0, status: "backlog" }], card: { lane: "backlog" } },
  // the refund: its session takes scene 11's steer 13 minutes in; its high risk stops it at the merge gate until
  // Sebastian approves, 64 minutes after its filing
  122: {
    phases: [
      { from: 0, status: "queued" },
      { from: MIN, status: "running", gate: "session", model: "small", spent: 0.04 },
      { from: 8 * MIN, spent: 0.21 },
      { from: 16 * MIN, spent: 0.38 },
      { from: 24.5 * MIN, status: "in-review", gate: "checks", spent: 0.52, pr: true },
      { from: 31 * MIN, gate: "review" },
      { from: 38.5 * MIN, gate: "approval", spent: 0.61 },
      { from: merges[122].queued, gate: "merge-queue" },
      ...merging(merges[122], 0.61),
    ],
    steps: [
      state.intake(0, 20),
      ...session(122, 1, MIN, 24 * MIN, { model: "small" }),
      state.checks(24.5 * MIN, 31 * MIN),
      review(122, 1, 31 * MIN, 38 * MIN, "s-1"),
      state.policyGate(38 * MIN, 38.5 * MIN, { pr: cards[122].pr, risk: "high", outcome: "requires_approval", changed: 5, lines: 207 }),
      state.approvalRequested(38.5 * MIN, { approval: approvals.refund.id, pr: cards[122].pr, commit: sessions[122]["s-1"].commit, risk: "high" }),
      ...merge(122, merges[122]),
    ],
  },
};

// shareLink is #125's life at two autonomy levels. At manual its ask waits five minutes for Sebastian's answer and
// its pull request for his approval at the merge gate. At full auto the agent's wake turn answers the ask at once, and
// factory-merge merges on the merge rule auto, without an approval.
const shareLink = {
  manual: {
    phases: [
      { from: 0, status: "queued" },
      { from: MIN, status: "running", gate: "session", model: "small", spent: 0.03 },
      { from: 4 * MIN, status: "waiting-human", gate: undefined, spent: 0.07, ask: asks.shareLink },
      { from: 9.5 * MIN, status: "running", gate: "session" },
      { from: 25.5 * MIN, status: "in-review", gate: "checks", spent: 0.36, pr: true },
      { from: 32 * MIN, gate: "review" },
      { from: 37.5 * MIN, gate: "approval", spent: 0.41 },
    ],
    answered: 9 * MIN,
    steps: [
      state.intake(0, 20),
      ...session(125, 1, MIN, 4 * MIN, { model: "small", outcome: "needs_info" }),
      ...session(125, 2, 9.5 * MIN, 25 * MIN, { model: "small" }),
      state.checks(25.5 * MIN, 32 * MIN),
      review(125, 1, 32 * MIN, 37 * MIN, "s-2"),
      state.policyGate(37 * MIN, 37.5 * MIN, { pr: cards[125].pr, risk: "normal", outcome: "auto", changed: 3, lines: 86 }),
      state.approvalRequested(37.5 * MIN, { approval: approvals.shareLink.id, pr: cards[125].pr, commit: sessions[125]["s-2"].commit, risk: "normal" }),
    ],
  },
  auto: {
    phases: [
      { from: 0, status: "queued" },
      { from: MIN, status: "running", gate: "session", model: "small", spent: 0.03 },
      { from: 4 * MIN, status: "waiting-human", gate: undefined, spent: 0.07, ask: asks.shareLink },
      { from: 5 * MIN, status: "running", gate: "session", spent: 0.09 },
      { from: 20.5 * MIN, status: "in-review", gate: "checks", spent: 0.36, pr: true },
      { from: 27 * MIN, gate: "review" },
      { from: merges[125].queued, gate: "merge-queue", spent: 0.41 },
      ...merging(merges[125], 0.41),
    ],
    answered: 4.5 * MIN,
    steps: [
      state.intake(0, 20),
      ...session(125, 1, MIN, 4 * MIN, { model: "small", outcome: "needs_info" }),
      ...session(125, 2, 5 * MIN, 20 * MIN, { model: "small" }),
      state.checks(20.5 * MIN, 27 * MIN),
      review(125, 1, 27 * MIN, 32 * MIN, "s-2"),
      state.policyGate(32 * MIN, 32.5 * MIN, { pr: cards[125].pr, risk: "normal", outcome: "auto", mergeRule: "auto", changed: 3, lines: 86 }),
      state.autoMerge(32.5 * MIN, {
        pr: cards[125].pr, commit: sessions[125]["s-2"].commit, risk: "normal", reproduction: "npm test -- share-link", review: reviews[125][0].summary,
      }),
      ...merge(125, merges[125]),
    ],
  },
};

// files are the changed files of a pull request, as Forgejo lists them.
const files = {
  203: [
    { filename: "src/ships/queries.ts", status: "modified", additions: 6, deletions: 2 },
    { filename: "src/ships/ShipSelect.tsx", status: "modified", additions: 12, deletions: 1 },
    { filename: "src/ships/ShipSelect.test.tsx", status: "modified", additions: 41, deletions: 0 },
  ],
  220: [
    { filename: "src/payments/refund.ts", status: "added", additions: 64, deletions: 0 },
    { filename: "src/store/rollback.ts", status: "modified", additions: 9, deletions: 2 },
    { filename: "src/payments/webhook.ts", status: "modified", additions: 18, deletions: 1 },
    { filename: "src/store/PurchasePage.tsx", status: "modified", additions: 11, deletions: 0 },
    { filename: "src/payments/refund.test.ts", status: "added", additions: 92, deletions: 0 },
  ],
};

// steers are the messages Sebastian sends a running card from the chat: what he types, the agent's words with the
// proposal, the text the session gets, and when it gets it, in seconds after the card's creation.
const steers = {
  refund: {
    issue: 122, at: 14.25 * MIN - 5,
    request: "Tell #122 to use the purchase's id as the Stripe idempotency key, so a rollback sent twice refunds once.",
    reply: "I pass it to the running session of #122. It reads it at its next step:",
    text: "Use the purchase's id as the Stripe idempotency key, so a rollback sent twice refunds once.",
  },
  // the same steer asked without the card: the project agent reads the board to find who builds the refund
  find: {
    issue: 122,
    request: "Find out who is building the refund and tell them to use the purchase's id as the Stripe idempotency key, so a rollback sent twice refunds once.",
    reply: "#122, Store: refund a purchase the server rolls back, builds it and runs its session now. I pass your line to that session; it reads it at its next step:",
    text: "Use the purchase's id as the Stripe idempotency key, so a rollback sent twice refunds once.",
  },
};

// ledger is every card of the two weeks that spent, and #100 before them, as the factory's figures read it; offsets are
// seconds after the card's filing. A card spends spent on model from start (its filing, or the slot an answer gave it)
// to stop (its end) and ends at end, done unless closed; a done card with a lead went live at its end, lead after its
// merge. asks are its escalations, raised at at and judged at answered by human or ai, or by factoryd at the card's end
// when it closed unjudged; waits are its other spans waiting on a person. review false marks a first review that asked
// for changes, null a card no review read; diff is its pull request's files, insertions and deletions; acts are the
// human acts on it, booked at its end.
const morning = (issue) => ageAt(issue, answeredAt[issue]);
const live = (issue) => ({ end: merges[issue].live, lead: merges[issue].live - merges[issue].at });
const ledger = {
  100: { end: DAY, spent: 0.38, lead: 8 * MIN, diff: [2, 34, 6], acts: 2 },
  101: { ...live(101), spent: 1.12, diff: [6, 212, 14], acts: 2 },
  102: { end: 174 * MIN, spent: 0.64, lead: 9 * MIN, diff: [3, 88, 21], acts: 2 },
  103: { end: 84 * MIN, spent: 0.31, lead: 8 * MIN, diff: [3, 59, 3], acts: 2 },
  104: { end: HOUR, spent: 0.48, lead: 8 * MIN, diff: [2, 41, 4], acts: 1 },
  105: { end: ageAt(105, filed[110]), stop: 20 * MIN, spent: 0.46, model: "big", waits: [[20 * MIN, ageAt(105, filed[110])]], review: null, acts: 2 },
  107: { ...live(107), spent: 1.18, model: "big", diff: [3, 74, 12], acts: 2 },
  108: { ...live(108), spent: 0.29, diff: [2, 6, 6], acts: 1 },
  109: { end: 155 * MIN, spent: 1.84, lead: 6 * MIN, diff: [9, 318, 141], acts: 1 },
  // the split's presses, the filing of #114 and the two dependencies of #112 among them, book on #110's close
  110: {
    status: "closed", end: ageAt(110, filed[113]) + 15, start: 161 * MIN, stop: 356 * MIN, spent: 4.6, model: "big",
    asks: [{ at: 363 * MIN, by: "factoryd" }], review: null, acts: 4,
  },
  111: { end: 270 * MIN, start: 155 * MIN, spent: 0.92, lead: 6 * MIN, diff: [4, 131, 9], acts: 1 },
  113: { end: 125 * MIN, spent: 0.43, lead: 7 * MIN, asks: [{ at: 2.75 * MIN, answered: 28.5 * MIN, by: "human" }], diff: [5, 164, 22], acts: 3 },
  115: { ...live(115), spent: 0.38, diff: [2, 186, 171], acts: 1 },
  116: { end: 90 * MIN, spent: 1.04, lead: 6 * MIN, review: false, diff: [4, 118, 17], acts: 2 },
  117: { end: 570 * MIN, start: morning(117), spent: 0.45, lead: 6 * MIN, asks: [{ at: ASKED, answered: morning(117), by: "human" }], diff: [2, 47, 9], acts: 2 },
  118: { end: 77 * MIN, spent: 0.36, lead: 7 * MIN, diff: [3, 64, 11], acts: 2 },
  119: { end: 34 * MIN, spent: 0.29, lead: 6 * MIN, diff: [2, 19, 3], acts: 1 },
  120: { end: 588 * MIN, start: morning(120), spent: 0.86, lead: 6 * MIN, asks: [{ at: ASKED, answered: morning(120), by: "human" }], diff: [5, 176, 12], acts: 2 },
  121: { end: 560 * MIN, start: morning(121), spent: 0.46, lead: 6 * MIN, asks: [{ at: ASKED, answered: morning(121), by: "human" }], diff: [3, 82, 5], acts: 2 },
  122: { ...live(122), spent: 0.61, diff: [5, 194, 3], acts: 3 },
  123: { ...live(123), spent: 0.62, diff: [2, 38, 21], acts: 1 },
  // at full auto the agent's wake turn answers the ask
  125: { ...live(125), spent: 0.41, asks: [{ at: 4 * MIN, answered: shareLink.auto.answered, by: "ai" }], diff: [3, 79, 7], acts: 1 },
};

// quiet is the work no scene shows: every weekday of the two weeks the routines and the intake file small changes,
// one each half hour from 08:00, that run on the cheap model, pass review and go live after the one merge click manual
// asks for. The figures read them as factoryd reads every card, so the metrics see the factory's week, not only the
// cards the scenes need, of which many wait on a person by design.
const QUIET = [
  "Bump a pinned dependency to its newest patch", "Fix a flaky lobby test", "Update the German strings", "Compress the asteroid sprites",
  "Fix a lint warning in the store", "Tidy the matchmaking log lines", "Raise the replay test's timeout", "Pin the CI image's digest",
  "Fix a typo on the season pass page",
];
for (const w of [1, 2]) {
  for (let k = 0; k < 90; k++) {
    const issue = 1000 + (w - 1) * 90 + k;
    const title = QUIET[k % QUIET.length];
    cards[issue] = { title, size: "small", pr: 400 + issue - 1000, body: title, acceptance: ["the change's own test passes"] };
    filed[issue] = new Date(date(w, "mon", "08:00").getTime() + (Math.floor(k / 18) * DAY + (k % 18) * 30 * MIN) * 1000);
    ledger[issue] = {
      end: (18 + ((k * 7) % 20)) * MIN, spent: (3 + ((k * 13) % 6)) / 100, lead: (6 + (k % 3)) * MIN,
      diff: [1 + (k % 2), 4 + ((k * 11) % 30), (k * 5) % 7], acts: 1,
    };
  }
}

// chats are the project agent's spend in the chat, cumulative, at the times the scenes' chats reach it.
const chats = [
  [date(1, "mon", "11:30"), 0.13], [date(1, "mon", "12:30"), 0.18], [date(1, "tue", "12:55"), 0.21], [date(1, "wed", "09:50"), 0.31],
  [date(1, "wed", "15:50"), 0.38], [date(1, "thu", "06:00"), 0.4], [date(1, "fri", "08:30"), 0.52], [date(1, "fri", "09:00"), 0.55],
  [date(2, "tue", "07:30"), 0.61], [date(2, "wed", "11:00"), 0.66], [date(2, "thu", "08:40"), 0.84], [date(2, "thu", "09:20"), 0.86],
  [date(2, "thu", "17:00"), 0.92], [date(2, "fri", "10:00"), 1.02],
];
const chatAt = (at) => chats.findLast(([t]) => t <= at)?.[1] ?? 0;

// spentAt is what issue's card had spent by the story's time at.
function spentAt(issue, at) {
  const c = ledger[issue];
  const start = c.start ?? 0;
  return c.spent * Math.min(1, Math.max(0, ((at - filed[issue]) / 1000 - start) / ((c.stop ?? c.end) - start)));
}

const cents = (eur) => Math.round(eur * 100) / 100;
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// spending is the board's spend by the story's time at: what the two weeks' cards and the chat had spent.
function spending(at) {
  const chatSpend = chatAt(at);
  const cardsSpent = sum(Object.keys(ledger).filter((issue) => filed[issue] >= WEEK1).map((issue) => spentAt(issue, at)));
  return { spend: cents(cardsSpent + chatSpend), chatSpend };
}

// weekEnd is Sunday evening of week, when the metrics read the week whole.
const weekEnd = (week) => date(week, "sun", "20:00");

// The lab's costs page books 12 % of a card's spend on its review, which runs on big, and the rest on the card's
// class; the chat runs on big. Of every day it books 2 % on tools.
const REVIEW = 0.12;
const TOOLS = 0.02;
const SERVED = { big: "zai/glm-5.3", small: "zai/glm-5.3-flash" };
const TOOL_MIX = [{ alias: "web_search", share: 64 }, { alias: "web_scrape", share: 36 }];
// TOKENS are the tokens a euro of the cards' calls moves, blended over the classes; the chat makes CALLS tool calls
// and spends MINUTES minutes on them a euro of its spend.
const TOKENS = 120000;
const CALLS = 50;
const MINUTES = 7;
// SELF are the factory's own deploys a week, by the story's week: 0 is the week before week 1.
const SELF = { [-6]: 2, [-5]: 1, [-4]: 3, [-3]: 2, [-2]: 2, [-1]: 3, 0: 1, 1: 3, 2: 2 };
const CI = 400000;

const median = (xs) => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const ratio = (n, d) => (d ? n / d : undefined);
const rounded = (round) => (v) => (v === undefined ? undefined : round(v));
const minutes = rounded((ms) => Math.round(ms / 60000) * 60000);
const tenths = rounded((v) => Math.round(v * 10) / 10);

// report is the metrics page's report of the days that end with the story's time at, read from the ledger as factoryd
// reads its figures: the window, the window before it, and seven weekly sparks that end with the window. Only what
// happened by at counts.
function report(now, at, days) {
  const DAY_MS = DAY * 1000;
  const end = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) + DAY_MS;
  const win = [end - days * DAY_MS, end];
  const prev = [end - 2 * days * DAY_MS, end - days * DAY_MS];
  const weeks = Array.from({ length: 7 }, (_, b) => [end - (7 - b) * 7 * DAY_MS, end - (6 - b) * 7 * DAY_MS]);
  const within = (t, [lo, hi]) => t >= lo && t < hi && t <= at;
  const cards = Object.entries(ledger).map(([issue, c]) => {
    const f = filed[issue].getTime();
    return { ...c, issue, model: c.model ?? "small", review: c.review === undefined ? true : c.review, endAt: f + c.end * 1000, f };
  });
  const asks = cards.flatMap((c) => (c.asks ?? []).map((a) => ({ ...a, raised: c.f + a.at * 1000, judged: c.f + (a.answered ?? c.end) * 1000 })));
  const done = (span) => cards.filter((c) => c.status !== "closed" && within(c.endAt, span));
  const deployed = (span) => done(span).filter((c) => c.lead !== undefined);
  const spent = (c, [lo, hi]) => Math.max(0, spentAt(c.issue, new Date(Math.min(hi, at))) - spentAt(c.issue, new Date(lo)));
  const chat = ([lo, hi]) => Math.max(0, chatAt(new Date(Math.min(hi, at))) - chatAt(new Date(lo)));
  const spend = (span) => sum(cards.map((c) => spent(c, span))) + chat(span);
  const read = (fn, round = (v) => v) => state.figure(round(fn(win)), round(fn(prev)), weeks.map((w) => round(fn(w)) ?? 0));
  const weekly = (fn) => {
    const ws = weeks.map(fn);
    return state.figure(ws[6], ws[5], ws);
  };
  const mix = (span) => {
    const by = { big: chat(span), small: 0 };
    for (const c of cards) {
      const s = spent(c, span);
      const review = s && (s * cents(c.spent * REVIEW)) / c.spent;
      by.big += review;
      by[c.model] += s - review;
    }
    const total = by.big + by.small;
    if (!total) return [];
    return Object.entries(by).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).map(([alias, v]) => ({ alias, share: (100 * v) / total }));
  };
  const blocked = (c) => sum([...(c.asks ?? []).map((a) => [a.at, a.answered ?? c.end]), ...(c.waits ?? [])].map(([a, b]) => b - a));
  const judged = (span, by) => asks.filter((a) => within(a.raised, span) && a.judged <= at && a.by === by).length;
  const restored = (span) => median(Object.values(alerts).filter((a) => a.task && within(a.raised.getTime(), span)).flatMap((a) => {
    const fix = cards.find((c) => Number(c.issue) === a.task);
    return fix && fix.endAt <= at ? [fix.endAt - a.raised.getTime()] : [];
  }));
  const diffs = (span, k) => median(done(span).filter((c) => c.diff).map((c) => c.diff[k]));
  const calls = (span) => Math.round(chat(span) * CALLS);
  const week = (w) => Math.floor((w[0] - WEEK1) / (7 * DAY_MS)) + 1;
  const mixed = mix(win);
  return state.metrics(now, days, {
    deploys: weekly((w) => deployed(w).length),
    lead_time: read((span) => median(deployed(span).map((c) => c.lead * 1000)), minutes),
    card_cycle: read((span) => median(done(span).map((c) => c.end * 1000)), minutes),
    throughput: read((span) => done(span).length),
    change_failure: read((span) => ratio(0, done(span).length)),
    reverted_refiled: { reverted: 0, refiled: 0, prev: [0, 0], has: false, weeks: Array(7).fill(0) },
    time_to_restore: read(restored, minutes),
    spend: weekly((w) => cents(spend(w))),
    per_card: read((span) => median(done(span).map((c) => c.spent)), rounded(cents)),
    tokens_per_card: read((span) => {
      const n = done(span).length;
      return n ? Math.round((sum(cards.map((c) => spent(c, span))) * TOKENS) / n / 1000) * 1000 : undefined;
    }),
    model_spend: mixed,
    served_by: mixed.map((m) => ({ ...m, alias: SERVED[m.alias] })),
    tool_spend: weekly((w) => cents(spend(w) * TOOLS)),
    tool_mix: mixed.length ? TOOL_MIX : [],
    interventions: read((span) => ratio(sum(cards.filter((c) => within(c.endAt, span)).map((c) => c.acts)), done(span).length), tenths),
    escalations: read((span) => asks.filter((a) => within(a.raised, span)).length),
    escalated_share: read((span) => ratio(done(span).filter((c) => c.asks).length, done(span).length)),
    escalations_handled: {
      human: judged(win, "human"), ai: judged(win, "ai"), unjudged: judged(win, "factoryd"),
      prev: [judged(prev, "human"), judged(prev, "ai"), judged(prev, "factoryd")], weeks: weeks.map((w) => judged(w, "human")),
    },
    human_blocked: read((span) => ratio(sum(done(span).map(blocked)), sum(done(span).map((c) => c.end)))),
    review_acceptance: read((span) => {
      const reviewed = done(span).filter((c) => c.review !== null);
      return ratio(reviewed.filter((c) => c.review).length, reviewed.length);
    }),
    self_deploys: weekly((w) => SELF[week(w)] ?? 2),
    diff_size: {
      files: diffs(win, 0) ?? 0, insertions: diffs(win, 1) ?? 0, deletions: diffs(win, 2) ?? 0,
      prev: [0, 1, 2].map((k) => diffs(prev, k) ?? 0), has: diffs(win, 0) !== undefined, prev_has: diffs(prev, 0) !== undefined,
      weeks: weeks.map((w) => diffs(w, 0) ?? 0),
    },
    chat_tool_work: { calls: calls(win), minutes: chat(win) * MINUTES, prev_calls: calls(prev), prev_minutes: chat(prev) * MINUTES, weeks: weeks.map(calls) },
    ci_duration: read((span) => (done(span).length ? CI : undefined)),
  });
}

// metricsWeek is the metrics page's 7 days on Sunday evening of week, and the board's spend then.
const metricsWeek = (now, week) => ({ metrics: report(now, weekEnd(week), 7), ...spending(weekEnd(week)) });

// costs is the costs page's ledger of the days to the story's time at, each story day dated on the recording's day as
// far back from now. A day holds what the cards and the chat spent in it, 2 % of it on tools and the rest on models; a
// day without spend has no row, as factoryd's ledger keeps none. Each card that spent in the days lists its spend on
// its class and on its review, the costliest card first.
function costs(now, at, days = 14) {
  const DAY_MS = DAY * 1000;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const from = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) - (days - 1) * DAY_MS;
  const spentBy = (ms) => {
    const t = new Date(Math.min(ms, at));
    return sum(Object.keys(ledger).map((issue) => spentAt(issue, t))) + chatAt(t);
  };
  const base = spentBy(from);
  const spend = (ms) => cents(spentBy(ms) - base);
  const tools = (ms) => cents(spend(ms) * TOOLS);
  const rows = [];
  for (let i = 0; i < days; i++) {
    const [lo, hi] = [from + i * DAY_MS, from + (i + 1) * DAY_MS];
    const total = cents(spend(hi) - spend(lo));
    const tool = cents(tools(hi) - tools(lo));
    if (total) rows.push({ day: iso(today - (days - 1 - i) * DAY_MS), by_kind: tool ? { model: cents(total - tool), tool } : { model: total }, total });
  }
  const tasks = Object.entries(ledger).map(([issue, c]) => {
    const eur = cents(spentAt(issue, at) - spentAt(issue, new Date(from)));
    const review = cents(eur * REVIEW);
    const lines = [{ kind: "model", ref: c.model ?? "small", eur: cents(eur - review) }, { kind: "model", ref: "review/big", eur: review }];
    return { task_id: state.id(Number(issue)), eur, lines: lines.sort((x, y) => (x.ref < y.ref ? -1 : 1)) };
  });
  return {
    from: iso(today - (days - 1) * DAY_MS), to: iso(today), days: rows,
    tasks: tasks.filter((t) => t.eur > 0).sort((x, y) => y.eur - x.eur || (x.task_id < y.task_id ? -1 : 1)),
  };
}

module.exports = {
  date, cards, title, description, body, card: boardCard, filing, requests, asks, escalation, asking, answered, answerRows, replies, wakeAsk, alerts, alertsAt, approvals,
  mergeSpec, plans, planCards, routines, runsAt, cronOf, filedAge, anchoredAt, routineCard, routinesAt, scanned, sessions, words, life, lives, shareLink,
  merges, merge, merging, mergeEvents, done, filed, answeredAt, ageAt, doneAt, board, session, reviews, review, files, sources, checksFailed, supervisor,
  steers, at, ledger, spentAt, spending, weekEnd, report, metricsWeek, costs,
};
