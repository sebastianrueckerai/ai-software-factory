# AI Software Factory UX Conversation

## User

I am making my own ai software facotory. 
I have the part that is orchestrating sandboxed ai containers that work together to develop projects. I have a kanban board showing project progess per tasks. Human tasks go as cards into a human input lane.

The idea is to give people access to a project, not the ability to create and manage projexts.

I am trying to think how to make the best user journey for this from a ux perspective. How can iake this easy to use while being clean and clear but still have all the tools?

My idea is: have the kanban as main tool with more info per task when clicking a card. Each card can have the posaibility of a chat with the model servicing this card. Also a global chat would be good wirh a model knowing the state of the board in case that is too much for me. I could the let if move cards for me so i only ever havr to use chat. 
The cards have a lot of stuff in them: type of task, euro spemd vs max spend, type of agent model, task for card, chat history if i want to go there... So info hierarchy here will be important. I may add project stats somewhere like total spand, kanbam stats, etx... But it also want to keep things clean.

I think ill allow to import a repo from vithub in case somekne wants to not start from scratch. Exporting can then be to github.

What are your thougbts?

---

## Assistant

I think your core idea is strong. I would treat the **project as the product**, the **Kanban as the source of truth**, and **chat as the fastest control surface over it**.

The main UX risk is not lack of functionality. It is exposing too much of the machinery of your AI factory to someone who mostly wants to know:

> What is happening? Do you need anything from me? Are we on track?

I would design around that.

### The main project screen

I would make one project screen look roughly like this:

```text
┌───────────────────────────────────────────────────────────────┐
│ Project X                 €38 / €100     12/18 done    GitHub │
│ Building authentication   ● Working      2 need you           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  NEEDS YOU      IN PROGRESS      REVIEW        DONE           │
│  ┌─────────┐    ┌─────────┐      ┌─────────┐   ┌─────────┐    │
│  │ Decide  │    │ Backend │      │ Login   │   │ Schema  │    │
│  │ auth    │    │ API     │      │ tests   │   │         │    │
│  └─────────┘    └─────────┘      └─────────┘   └─────────┘    │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Ask anything about this project...                      [↑]   │
└───────────────────────────────────────────────────────────────┘
```

The global chat box being permanently available is important. I wouldn't make users navigate to a separate "AI assistant" section.

They should be able to type:

> Why is authentication blocked?

> How much have we spent on frontend work?

> Move the login page back to implementation and tell the agent to use OAuth instead.

> What do you need from me?

> Give me a summary of what happened since yesterday.

That makes the board both **inspectable manually** and **operable conversationally**.

### Don't put all the information on the cards

Your underlying task object can be extremely rich. The visual card should not be.

I would probably show only something like:

```text
┌─────────────────────────────┐
│ Backend authentication      │
│ Implement OAuth flow        │
│                             │
│ ● Working                   │
│ Claude Sonnet      €1.82    │
│                    42% budget
└─────────────────────────────┘
```

And even that may be slightly too much.

The hierarchy I'd use is:

**Always visible:** task name, short description/state, exceptional condition.

**Visible when useful:** agent/model, spend/budget.

**Inside card details:** full prompt/task specification, logs, files changed, dependencies, model configuration, exact token/cost details, task history, chat, execution traces, retries, sandbox metadata, etc.

This is classic progressive disclosure. Your infrastructure might have 40 properties per task without forcing the human to process 40 properties.

Also, **don't visually emphasize model names unless model choice matters to the user**. "Claude / GPT / etc." is important to you as the factory builder. It may be implementation detail to the user.

The same applies to exact spend. If everything is fine:

> €1.82 / €10

doesn't need much visual weight.

If something is approaching its limit:

> ⚠ €8.70 / €10

then it becomes important.

### Clicking a card should open a side panel

I would avoid navigating away from the board.

Something like:

```text
                        ┌──────────────────────────────┐
                        │ Backend authentication      │
                        │ ● Working                   │
                        │                              │
                        │ TASK                        │
                        │ Implement OAuth...          │
                        │                              │
                        │ ACTIVITY                     │
                        │ ✓ Modified auth.ts           │
                        │ ✓ Added tests                │
                        │ → Running integration tests │
                        │                              │
                        │ COST                         │
                        │ €1.82 of €10                 │
                        │                              │
                        │ FILES / OUTPUT               │
                        │ auth.ts                      │
                        │ auth.test.ts                 │
                        │                              │
                        │ CHAT                         │
                        │ Ask this agent...            │
                        └──────────────────────────────┘
```

I'd consider tabs inside the drawer:

**Overview · Activity · Files · Chat**

But keep **Overview** genuinely simple.

This lets technical users drill down without turning the normal experience into an agent-debugging console.

### Your "Human input" lane is more important than it seems

I'd actually make this one of the central UX concepts.

Instead of thinking of it merely as another Kanban state, think of it as the project's **inbox for the human**.

Cards should explain exactly what they need:

> **Choose authentication provider**

> The backend can continue after you choose one.

> [Auth0] [Supabase] [Custom]

rather than:

> Task #147 blocked  
> requires_user_input=true

Some human tasks might not even require opening the card.

You could have inline interactions:

```text
NEEDS YOU

┌──────────────────────────────┐
│ Choose deployment region     │
│                              │
│ ○ Europe                     │
│ ○ US East                    │
│ ○ Asia                       │
│                              │
│ [Submit]                     │
└──────────────────────────────┘
```

That would make the factory feel remarkably easy to operate.

### Consider separating "status" from "who has the ball"

One issue with Kanban lanes is that AI projects don't map perfectly onto conventional Jira-style workflows.

You have two dimensions:

**Execution state**

> queued → working → checking → done

and

**Responsibility**

> AI → human → blocked/external

Trying to encode both entirely in columns can get messy.

One possible board structure is:

```text
NEEDS YOU | WORKING | VERIFYING | DONE
```

And then use small states inside cards for:

> waiting, blocked, retrying, paused

That is probably simpler than having 8–10 columns.

### Global chat should be powerful, but not magical

I strongly like your board-aware global agent.

Conceptually:

> **The board is the state. Chat is an interface to state.**

The model should have access to cards, history, costs, outputs and dependencies.

But when chat changes something meaningful, I would make the action visible:

```text
I'll:
• Move "OAuth integration" back to In Progress
• Add your OAuth requirement to its instructions
• Restart the task

[Do it]
```

Then:

```text
✓ 3 changes applied                       Undo
```

You get the convenience of natural language without making the UI feel unpredictable.

An **activity/event history** underneath everything becomes very useful:

```text
13:41 Agent completed database schema
13:43 Test agent found 2 failures
13:44 Backend task reopened automatically
13:50 You approved Auth0
13:51 Backend agent resumed
```

This creates trust.

### I wouldn't make project stats a big dashboard

At least initially.

Put the four things people care about in the project header:

```text
● Working     14 / 22 tasks     €38 / €100     2 need you
```

Clicking any one can reveal deeper analytics.

Eventually you might have a project analytics screen with things such as:

- spend over time
- cost by agent/model/task type
- autonomous vs human-blocked time
- task success/retry rate
- throughput
- estimated remaining work

But that is secondary to shipping the project.

### GitHub fits very naturally

I'd treat GitHub as a project capability, not a major piece of the navigation.

At the start:

```text
Project source

○ Start from scratch
○ Connect existing GitHub repository
```

During the project:

```text
Repository: acme/widget
Branch: factory/project-123
Last sync: 2 min ago
```

And then actions like:

> View changes  
> Open PR  
> Push to branch  
> Sync latest

I would strongly prefer **PR/branch workflows over a generic "Export to GitHub"** once the system matures. Developers already understand that mental model.

### One feature I think would be especially valuable

Have an AI-generated **project pulse** at the top:

```text
PROJECT PULSE

Authentication is being implemented.
2 agents are currently working.
The frontend is waiting for the auth API.
You need to choose a login provider.
€38 of the €100 budget has been used.

[Resolve required input]
```

It turns potentially complicated distributed-agent activity into a five-second comprehension task.

And it could continuously regenerate from your actual project state rather than being another thing you maintain.

### I would design for three levels of user

Not separate products—just progressive depth.

**Level 1 — "Just build it."**  
They mostly use global chat and answer requests in **Needs You**.

**Level 2 — "Show me what's happening."**  
They inspect the Kanban, cards, diffs and costs.

**Level 3 — "I want control."**  
They interact with individual task agents, change instructions, inspect traces, retry tasks, change models, adjust budgets, etc.

The mistake would be making Level 3 the default interface simply because your system is technically sophisticated.

The UI should feel simple even though the thing underneath it is insane.

One architectural UX principle I'd keep in mind throughout:

> **Anything the user can do manually in the interface should also be expressible through the global project chat. But the underlying objects should remain visible and manipulable without chat.**

That prevents you from becoming either an overly complicated project-management application **or** an opaque "type something into a chatbot and hope" product.

Your Kanban + contextual task drawer + human-input inbox + global project agent is, in my view, the right foundation.

---

## User

So the main chat loop probably should get user actions as inputs like "user moved card x, uder made new card"? Or just the state of the board? We could give the main chat just a snapshot of the board with ever user i put or even make " view board" a tool call but then it does not have board history or user action history. Not sure if any of that is needed.

For the cards: its is easy to design minimal cards and come up with a giant full view... Not sure about in between. Should an exploded card become a tab thats half a screen and acollable to have everything (some section's collapsed) or should there be an im between view with some info? Might be nice but also means one mor click for full if needed. I guess your idea with 
Overview · Activity · Files · Chat answers that witj a nice pattern.

 I like your point about things like spent: maybe i always have 1.4/EUR (55%) but have it small and fant grey until it becomes i.portant then ill make it yellow?

Also i love your project pulse idea. Amd i like the setup of a thin status line on top of the project, with the rest of the window being split between global.chat and kanban. But were does the pulse fit in now, if status is just one line?

---

## Assistant

Yes — I’d give the global chat **both state and events**, but not by stuffing everything into its context.

The clean architecture is:

> **Board state = truth. Event log = history. Chat = interpreter/operator over both.**

For example, user/system actions generate structured events like:

```text
card.moved
  card: AUTH-12
  from: In Progress
  to: Needs You
  actor: user

card.created
card.edited
human_input.submitted
agent.started
agent.completed
budget.changed
github.synced
```

The global agent does **not** need every event in every prompt. I’d give it:

1. A compact current project snapshot.
2. The most recent meaningful events, perhaps last 10–30.
3. Tools like `get_board()`, `get_card(id)`, `get_project_history()`, `get_card_history(id)`.

That gives you something much better than either extreme.

If you only provide current board state, the model can answer:

> "What is happening?"

but struggles with:

> "Why did this move back to In Progress?"

If you only provide events, it has to reconstruct state unnecessarily.

So a typical global-chat context might contain:

```text
PROJECT
Status: Working
Spend: €38 / €100
Needs human: 2
Working: 4
Review: 1
Done: 17

RECENT ACTIVITY
13:42 AUTH-12 moved Review → In Progress
13:42 Tests failed for AUTH-12
13:47 User approved Stripe API choice
13:48 PAY-4 resumed

TOOLS
view_board()
view_card(id)
view_history(...)
...
```

And let it fetch details when necessary.

I would also record **chat-driven mutations as the same events**. Whether the user drags a card or says "move AUTH-12 back to working," your underlying system should produce the same `card.moved` event. That gives you an extremely clean architecture and audit trail.

---

On the card UX, I think you've effectively found the right answer already: **don't make three levels unless you discover a real need for three levels.**

I'd do:

**Card → side drawer → specialized full-screen view only where appropriate.**

The side drawer *is* the intermediate/full card view.

Something like 40–50% screen width:

```text
KANBAN                     TASK DRAWER
                          ┌────────────────────┐
                          │ Authentication     │
                          │ ● Working          │
                          │                    │
                          │ Overview Activity  │
                          │ Files    Chat      │
                          │────────────────────│
                          │                    │
                          │ scrollable content │
                          │                    │
                          │                    │
                          └────────────────────┘
```

Keep the Kanban visible behind/beside it. That's important because users retain spatial context: *this thing I'm examining belongs here in the workflow.*

Within **Overview**, collapsed sections solve the information-density problem:

```text
TASK
Implement authentication...

STATUS
Working · 12m

BUDGET
€1.40 / €2.50 · 56%

AGENT
Sonnet 4.5

▸ Dependencies
▸ Instructions
▸ Execution details
▸ Advanced
```

Then **Activity** is chronological, **Files** shows artifacts/diffs, and **Chat** is the conversation scoped specifically to that task.

I'd avoid a separate "medium card" modal. One click should get you somewhere genuinely useful.

---

And yes, exactly on spend.

Normal:

`€1.40 / €2.50 · 56%`

Small, low contrast.

Approaching limit:

`⚠ €2.15 / €2.50 · 86%`

More prominent.

Exceeded/stopped:

`⚠ Budget limit reached · €2.50`

High prominence.

I'd avoid color as the *only* signal, though. Use prominence + icon/text as well. Otherwise you're encoding an operationally important state only in yellow/red.

You can apply this principle everywhere:

> **Normal states whisper. Exceptional states speak.**

Agent running normally? Tiny indicator.

Agent retrying for the fifth time? Prominent.

No human input needed? Nothing.

Human blocking three dependent tasks? Prominent.

This will make the UI feel much cleaner without actually hiding capability.

---

For the **Project Pulse**, I wouldn't put it *inside* your permanent status line.

I'd make the hierarchy:

```text
┌──────────────────────────────────────────────────────────┐
│ ● Working   4 active   2 need you   €38/€100   GitHub ✓ │ ← status
├──────────────────────────────────────────────────────────┤
│ ✦ Authentication is blocked waiting for your decision.  │ ← pulse
│   Frontend continues independently.             [More]   │
├───────────────────────────┬──────────────────────────────┤
│                           │                              │
│         KANBAN            │         GLOBAL CHAT          │
│                           │                              │
```

The **status line is quantitative and persistent**.

The **pulse is narrative and contextual**.

And crucially, I wouldn't require the Pulse to always occupy much space. Most of the time it's one sentence. Clicking it can expand:

```text
PROJECT PULSE

Authentication needs your OAuth provider choice.
Frontend work is continuing independently.
3 tasks completed since your last visit.
Current spend is within budget.

[Resolve authentication]   [View activity]
```

You could even make it disappear/minimize after the user has read it until something material changes.

That distinction is useful:

**Status bar:** "What is the state?"

**Pulse:** "What should I understand about the state?"

**Kanban:** "What work exists and where is it?"

**Global chat:** "Let me ask or change anything."

**Task drawer:** "Tell me everything about this particular piece of work."

Those five things give each part of the interface a very clear job. I think that's probably the information architecture I'd build the first version around.

---

## User

Nice. And pulse can update every 10 seconds or upon user action (so it never lags behind users doing smth).

The one thing i am unsure about is the pulse position. I like project status as one line abive the project because it can easily be shown in a line of indicatora. The pulse would be nice as maybe 4 short bullet points. Those seem more natural in a small narrow box. So havimg them in a second narrow line feels less ideal. I could maybe only show.the first point and expand on click. WDYT?

---

## Assistant

Yes. I think “one-line pulse, expandable” is probably the cleanest solution.

The permanent top area can stay very compact:

```text
● Working   4 active   2 need you   €38/€100   GitHub ✓
```

Then directly under it, one narrative line:

```text
✦ Authentication needs your input; 3 other tasks are progressing normally.   [Expand]
```

On expansion, show the 3–4 concise bullets you actually want:

```text
✦ Project Pulse

• Authentication is waiting for your OAuth choice.
• Frontend and database work are progressing normally.
• 3 tasks completed since your last visit.
• Spend is on track at €38 / €100.

[Collapse]
```

I prefer this over always showing four bullets because the pulse then behaves like a **summary of exceptions and movement**, not another permanent dashboard.

A useful rule would be: the collapsed line should contain the **single most important thing the user should know right now**. Not necessarily the first bullet chronologically.

For example:

```text
✦ 2 tasks need your input and are blocking 4 downstream tasks.
```

is much more valuable than:

```text
✦ 5 tasks active, 17 complete, €38 spent...
```

because the status bar already tells them the latter.

I’d also make the pulse intelligently vary its visual weight. If everything is fine:

```text
✦ Everything is progressing normally. 3 tasks completed recently.
```

Very subdued.

If action is needed:

```text
⚠ Authentication needs your decision and is blocking deployment.   [Resolve]
```

More prominent.

So you effectively get three information layers at the top:

```text
STATUS
● Working   4 active   2 need you   €38/€100

PULSE
✦ Authentication is waiting for your input.   [Expand]

──────────────────────────────────────────────
KANBAN                         GLOBAL CHAT
```

That feels quite strong to me.

And yes, I'd update the pulse immediately after user actions. I wouldn't actually think of it primarily as “every 10 seconds,” though. I'd make it **event-driven first**, with periodic refresh as a fallback.

So:

`card moved → pulse refresh`
`human input submitted → pulse refresh`
`agent finishes → pulse refresh`
`agent fails → pulse refresh`
`budget threshold crossed → pulse refresh`

plus perhaps a periodic refresh in case something external changed.

That also avoids the slightly odd experience where a user moves a card and then watches the AI summary contradict them for seven seconds.

One additional UX detail: when the pulse changes because of something the user just did, I wouldn't animate it aggressively. A subtle text transition is enough. You want it to feel like a **live project briefing**, not a notification feed.

---

## User

Maybe just a typing indicator on pulse change.

I am thinking of how to do the.mobile version. The beauty of the whole things is that i could easily manage from mobile browser
But how do i do push notifications? A full react native app would be a pain. Maybe just signal / telegram / whattsapp integration for regulär or one off notifications ? 
How diffcult would it be to do these, can i easily test them, do i need a phone number for the sending of these?

---

## Assistant

A typing indicator on pulse refresh sounds right: it communicates “this summary is recomputing” without turning it into a notification surface.

For mobile, I’d strongly consider **PWA/web push first**, then Telegram/WhatsApp as optional notification channels.

Yes — and I think this actually makes the mobile story much easier than it first appears.

I would **not build React Native initially**. Make the mobile browser experience excellent, make it installable as a PWA, and treat notifications as a separate delivery system.

### There are really four options

| Channel | Setup difficulty | Need sender phone number? | Good for your use case? |
|---|---:|---|---|
| **Web Push / PWA** | Low–medium | No | **Yes — primary** |
| **Telegram bot** | Very low | **No for the bot** | **Yes — excellent MVP** |
| **WhatsApp Cloud API** | Medium | Test: no; production: yes | Yes, later |
| **Signal** | Medium/high | Yes | Probably not |

The interesting one is **PWA push**. You don't need an App Store app at all. On iOS 16.4+, Home Screen web apps can receive standard Web Push notifications; Apple explicitly says you don't need to join the Apple Developer Program for web push. You use a service worker + Push API + VAPID keys on your backend.

So your user journey could simply be:

```text
Open factory.example.com on phone
        ↓
Add to Home Screen
        ↓
"Enable project notifications?"
        ↓
Done
```

Then your backend can push:

```text
⚠ Project Apollo needs you

Authentication agent needs a decision:
Use OAuth or password authentication?

[Open task]
```

Tapping can deep-link directly into the card.

That gets surprisingly close to a native app experience with **one codebase**.

One iOS caveat: notification permission for the Home Screen web app has to be requested following an explicit user action; you shouldn't just pop the permission dialog immediately.

---

### Telegram is ridiculously attractive for your MVP

This may actually be the first external channel I'd implement.

Telegram bots **do not need their own phone number**. Telegram explicitly supports this. You create the bot through BotFather, get a token, and then your backend communicates with the Bot API over HTTPS.

The user needs to initiate the relationship once because Telegram bots aren't allowed to start conversations with arbitrary users.

You can make that onboarding almost invisible:

```text
Notifications

[🔔 Browser push     ✓]

Connect another channel:

[ Telegram ]
```

Tap Telegram → open:

```text
t.me/MyFactoryBot?start=<connection-token>
```

The user presses **Start**.

Your bot receives something essentially equivalent to:

```text
user/chat id: 1234567
start_parameter: abc123
```

You associate that Telegram chat ID with the factory user.

Done.

Now your notification service just does conceptually:

```text
notify(user, {
    type: "human_input_required",
    project: projectId,
    task: taskId
})
```

and your delivery layer decides:

```text
WebPush → send
Telegram → send
Email → maybe
WhatsApp → maybe
```

Telegram also supports buttons, so something like this becomes possible:

```text
⚠ Authentication needs you

The agent needs an OAuth provider.

[Open task]  [View project]
```

Potentially later even:

```text
[Auth0] [Supabase] [Custom]
```

with the choice going directly back into your project event stream. Telegram explicitly supports inline keyboards/buttons for this kind of action.

Testing is extremely easy. Telegram provides its normal Bot API plus a separate test environment if you actually need one, although for your own development I'd probably just make a private bot and message yourself.

---

### WhatsApp is doable, but noticeably more bureaucratic

Meta's official route is the **WhatsApp Cloud API**.

Conveniently, development is easier than production: Meta's onboarding gives you a **test phone number**, and that test number can send messages to up to five selected recipients without you registering a real sending number.

So you can absolutely experiment with it without buying a SIM just to see whether the experience works.

Production is more involved. You need a Meta business setup, WhatsApp Business Account and business phone number.

There is also an important UX/API difference from Telegram: WhatsApp regulates business-initiated messaging. Outside the 24-hour customer-service window after a user contacts you, business-initiated messages generally need approved message templates.

For you that isn't necessarily terrible. Your templates would be things like:

```text
Project {{1}} requires your input.

{{2}}

Open project:
{{3}}
```

But it adds administration that Telegram/Web Push don't have.

So I'd view WhatsApp as:

**very worthwhile once users ask for it, but not the first notification integration I'd build.**

---

### Signal is the odd one out

Signal doesn't have an equivalent official public bot platform designed for this use case.

The common automation route is `signal-cli`, which explicitly describes itself as **unofficial**. It can send/receive messages and expose JSON-RPC, but registration requires a phone number capable of receiving SMS or calls, and the project warns that it needs to stay current with Signal server changes.

That's fine for:

> "I want my personal factory to ping my Signal."

I would be much less enthusiastic about making it a core feature you promise customers.

---

## I think your architecture becomes pleasantly simple

Don't make "Telegram notifications", "WhatsApp notifications", etc. part of your project logic.

Your factory emits events:

```text
human_input.required
task.failed
task.completed
budget.warning
project.completed
project.paused
```

Then a notification service determines:

```text
event
  ↓
should this notify?
  ↓
user preferences
  ↓
┌─────────────┬────────────┬──────────┐
│ Web Push    │ Telegram   │ WhatsApp │
└─────────────┴────────────┴──────────┘
```

And I would **not notify for normal agent activity**.

A user probably doesn't want:

```text
Agent started
Agent finished
Agent started
Tests running
Task moved
Agent started
```

Your Pulse handles that.

Notifications should mainly be:

```text
🟡 You are needed
🔴 Something important failed
💰 Budget needs attention
✅ Project/milestone completed
```

That distinction is important.

**Pulse = awareness while I'm inside the factory.**

**Push = something worth pulling me back into the factory.**

And this is where your product could feel unusually good on mobile: get a Telegram/Web Push notification → tap it → mobile browser opens directly onto the relevant task → answer the agent → close phone.

You wouldn't really need a "mobile app." The factory itself is still the app.

For an MVP, I'd build **responsive web + PWA + Web Push**, then add **Telegram**. That gives you native-ish notifications plus an extremely reliable external notification channel with relatively little extra infrastructure.

---

## User

So for whattsapp  and discord, do I need the sim only to bind the account to or do i somehow have to pay for sms or data via the sim? Otherwise the sim alone is cheap. Also do telegram amd whattsapp charge for their services? Free tier? Is pwa push possible for android?

---

## Assistant

Exactly: for **WhatsApp Cloud API**, the SIM/phone number is primarily an **identity/verification mechanism**, not the transport for messages.

- **WhatsApp:** for production you verify ownership of the sending number by receiving an SMS or voice call. After that, messages travel `your server → Meta Cloud API → WhatsApp user`. Your SIM does **not** send SMS or consume mobile data for notifications.
- So a cheap prepaid SIM can work. The important thing is keeping the number active and under your control in case you need to verify/recover it later. Whether receiving the initial verification SMS costs anything depends on the mobile operator, but normally that's negligible.
- During development Meta can provide a **test number**, so you don't even need the SIM initially.

**Discord is even simpler:** a Discord bot is its own bot account authenticated by a token. It doesn't have a SIM or phone number. Your developer/user account may occasionally be asked for phone verification by Discord's anti-abuse systems, but that's unrelated to message delivery.

For costs, the rough situation is:

| Channel | Platform messaging cost |
|---|---|
| **Telegram Bot API** | **Free** |
| **Discord bot API** | **Free** |
| **Web/PWA Push** | Generally free; your server/hosting costs remain |
| **WhatsApp Cloud API** | **Paid for many business-initiated messages** |

Telegram explicitly says its APIs are free and bot accounts require no additional phone number.

WhatsApp is the exception. Since July 1, 2025, Meta uses **per-template-message pricing**, varying by message category and recipient country. Utility messages and free-form replies within the 24-hour customer-service window can have no Meta messaging fee, but a notification your factory initiates after that window generally needs an approved template and can incur a fee.

For your use case, something like:

> **Project Apollo needs your input**  
> Authentication is waiting for an OAuth provider choice.

would likely be a utility-style business notification, but Meta controls template classification.

And **yes, PWA push works very well on Android**. Chrome and Firefox support Web Push; a service worker can receive the push and display the notification even when your web app isn't currently on screen. Android also has particularly good PWA installation support: Chrome can install it as a WebAPK so it behaves quite similarly to a normal installed app.

So I'd probably implement your channels in this order:

**1. PWA/Web Push** — native-feeling, Android + iOS, no third party account needed.  
**2. Telegram** — almost absurdly easy and free.  
**3. Discord** — similarly inexpensive, particularly attractive for developer users.  
**4. WhatsApp** — huge reach, but templates, Meta onboarding and per-message costs make it more annoying.

For your own factory, **PWA + Telegram alone would already give you a very good mobile experience without writing one line of React Native.**

---

## User

Give me this conversation as one big md file I can download
