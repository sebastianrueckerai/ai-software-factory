# Concept: how an agent reports a blocker

Written 2026-10-31, from the escalation at the end of card #1345's revision loop (see the revision-loop concept). Status: concept, waiting for Sebastian's go.

## What gh is, and why it is not the answer

gh is GitHub's command-line client: it talks to GitHub's API with a stored login. The factory's forge is Forgejo, a different API; gh cannot speak to it. The card session tried gh because its instruction said "report the refusal on the issue" and gh was the only issue-shaped command it knew.

Adding gh to the sandbox image would build the wrong thing twice over:

1. It speaks to the wrong service. Even installed, it reaches no Forgejo.
2. It breaks the credential rule. An agent session holds no write credential by design: the read token lives in the clone container, and the write token is minted after the agent process is dead, used once, revoked. A gh login in the sandbox would hand the agent exactly the standing credential the architecture refuses to give it.

So the tool card the project agent proposed (gh in the project image) is refused, and no image change is needed.

## How a blocker reaches you today

A session that cannot go on stops and asks. The ask lands on the card, the card waits for a human, the ask shows in Needs you and the board, and the answer can come through the main chat ("answer card 1345: go on") or the card page. That is the escalation path, and it worked: the planner stopped rather than thrash, and the ask reached Sebastian at 01:41 with the session's reason for stopping.

What the ask did not carry was the blocker itself. The session's stop note said "I was told to report the exact refusal and cannot"; the exact refusal sat one query away in the session's findings, and only the controller's database read surfaced it. That gap is the real defect.

## The fix by construction

1. **The ask quotes the refusal.** When a session stops right after a tool refusal, the ask's info block carries the refusal verbatim from the session's findings. The human then sees "the plan was refused: criterion v11 replaces v10, an id the previous revision does not hold" on the card, not only "this card stopped and needs your decision". No new credential, no new channel; factoryd composes the ask and already holds the findings.
2. **Plan cards get plan wording.** A plan card's stop ask says what its choices do: go on starts another planner session, leave it waiting holds the plan, end the card closes the plan and its cards with it. The current text talks about pull requests and re-verification, which fits no plan card.

## The report tool, named and declined for now

A factory-served tool (the session calls `report(text)`, factoryd posts the comment on the issue as the member, rate-limited to one per stop) would give the issue a durable record without any credential reaching the agent. It is declined for now: with the refusal quoted in the ask, it duplicates a channel, and no case has appeared where a record must reach the issue and no human ask is involved. Revisit when one does.

## What the chat can already write

The project agent needs no new tool to create concept files like this one. `write_doc` commits a new file with `content` to any path under `docs/` of the project's document repository, straight to master, and edits a single passage of an existing file with `old` and `new`. It refuses empty documents, documents over the size cap, deletions, and roadmap edits that break that file's structure. A card session inside its sandbox has no document access at all, by design: its output is a pull request. Concept files, incident records and designs are the chat's to write, in one file per subject, which is the shape Sebastian asked for.
