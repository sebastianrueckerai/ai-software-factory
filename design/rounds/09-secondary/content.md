# The content deck: the Resources page, busy moment

Every direction image shows this one page of the project
`ai-software-factory-code`, so the images differ in design only. The lab's
`busy` scenario serves the same page in the real console.

## The shell (the decided C23 top bar, with this round's destinations)

One 44 px bar, hairline rules top and bottom, quiet small-capitals words, no
box around the links: "Factory console" (home), the project select
"ai-software-factory-code ▾", then the one bordered action "New task", a wide
gap, the figures group "Costs · Resources", a wide gap, the running group
"Settings · Policy · Notifications", then the moon/sun theme toggle,
"sebastian", "Log out". The open page's word "Resources" carries the cyan and
a short underline. Nothing else is cyan in the bar.

## The page

Heading "Resources". One muted intro sentence: "Servers the agents
commissioned, open now or closed in the last 7 days. Promote makes a
commission standing; Release ends it."

Then one section per project, in this order, each with the project's name as
its label, its envelope as one line of figures, and its table:

**ai-software-factory-code** — envelope line: "task block €10.00 a month ·
this month €0.43, 1 open server · standing: none". Table, columns: Task ·
Resource · Type · IPv4 · Lease ends · EUR/h · Cost so far · State · Acts:

- `#606` · firewall 70 · — · — · in 2 h · — · — · live · Release
- `#606` · server 71, "acceptance run against a fresh Postgres" · cx23 ·
  203.0.113.24 · in 2 h · 0.0072 · 0.01 · live · Promote Release
- `#571` · server 58 · cx33 · — · released by sebastian · 0.0144 · 0.06 ·
  deleted · —

**infra** — a second table, the cluster's scheduled jobs, columns: Name ·
Kind · Namespace · Schedule · Last run · State:

- backup · CronJob · factory · nightly 02:00 · 7 h ago · ok
- forgejo-dump · CronJob · factory · daily 03:00 · 31 h ago · ok

**demo-app** — envelope line: "task block €30.00 a month · this month €0.00 ·
standing block €12.00 a month: 1 now, €5.99". One table row:

- — · server 64 · cx23 · — · standing, made standing by sebastian · — ·
  €5.99 a month · live · Release

**gone** — no table, one dim line: "no file in the configuration: nothing
acts on this project".

## The palette

Dark (the default): page #070b12, panel #0b111a, hairlines #1a2636, text
#dfe7f1, muted #93a1b5, faint #7c8ba0, cyan #4fcbe2 (the open word, links),
amber #f4b13e (a state that needs attention, used sparingly). 13 px sans for
words, a tabular monospace for every figure, ref, address and time.
