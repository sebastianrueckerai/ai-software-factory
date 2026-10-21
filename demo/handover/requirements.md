# The requirements, in Sebastian's words

Collected from the session of 20 and 21 October 2026 that built the demo scene bank. Quoted or closely paraphrased, in order. The decisions he took are marked.

## The first ask (brainstorm)

"I need you to brainstorm on how to demo this factory. I want to use it as a portfolio project for my CV and try to pitch it to an accelerator. So I need a website showing it off. Problem: building anything I could not just build in local Claude Code takes a while and costs money. In particular: showing off what you built means I need to make sure built web apps have a way to release on the web, so the whole thing is hard to demo. Giving someone a link and a 5 EUR budget may not be the best idea.

I plan on making the repo public, so I could have a nice git main page, and maybe a few videos showing off the site. But there I would need to pick the right things to show. Also picking a few design decisions and showing them as mermaid charts and then animating them may be a good way to show some of the cool designs here.

Any other ideas? How do I send someone a link to this as a project (so not necessarily the running app), what should my landing page be and what do I show off? If someone asks me for a cool thing I built, how do I show this?"

## The second ask (what he liked)

"I like the video. I like your ideas. Also showing an issue become a fix automatically is nice. We can have a bunch of scenes that tell really short stories (like showing metrics, using a better prompt, improving metrics). And later cut. First make a bunch of material and then use the best parts.

I also like the sped-up recordings. You can generate them from the real instance. Maybe have a script for it so we can update these sections in case we change the UI, we can just regenerate.

We could use the real data but I think for a demo it would be nicer if you generated data for a fake project that you show to illustrate the process. This way the data is not as messy and we can show exactly the scenarios we need.

We can then pick a video model from FAL and have the stuff animated that we can't animate this way. What do you think?"

## The third ask (decisions and go)

- "Staged footage carries a caption" (my proposal): "Leave that out." **Decision: no caption marks footage as staged.**
- "I want a fixture mode that looks like the real factory but just replays fake data. Keep it as close to the real thing as possible. You can write realistic data from Postgres. Or if that is easier make a new project on the factory and seed the data there, may be better." **Decision left to me; I chose the console lab (the real console over in-memory fakes), see rulings.**
- "Go wide and brainstorm scenario ideas for what to record. Make the plan, start building, stop when you need me or a FAL code. Do anything you can before that." **Decision: build without further questions; no fal spend without his cap.**

## The fourth ask (after the first report)

- "Are these bugs needing to be fixed in the factory? If so, give me the prompt to tackle these." (The three defects found in the factory while building the scenes.)
- "What budget do you expect to need?"
- "You have not built any HTML site to show me your results. There is no report. I am not interested so much in how you did things. I want to see what you did! Which scenes did you choose, what can I already look at, are there already generated videos? What additional videos from what script are you planning to turn into videos? Show me!"
- "We can experiment with video APIs. But I just heard Claude models should be very good at building videos by writing them procedurally from code. No realistic film of course, but 2D animations, explainer videos. This may be good for our project as well. Let a subagent explore that: look at how others (and especially Claude in chat) do this and see if we can do it in parallel with model-generated video."
- "Instead of me just running /compact, write a long report to seed a follow-up session continuing work on this. Include my original requirements and such."

## Standing constraints from the repository

From `CLAUDE.md` of this repository and the global working agreement:

- Every generated image or clip gets a sidecar JSON with model, prompt, references, parameters and cost. An output that cannot be made again does not count.
- Stay inside a round's spending cap. Ask before a run that would pass it.
- Provider keys live in the gitignored `.env.tools`. Never print a key.
- Read `design/process.md` before any image generation or critique, `design/models.md` before calling a provider.
- Work in a git worktree, commit to the default branch, push, delete the worktree. "Done" means committed and pushed.
- No prompt rule where a tool or a deterministic step can carry it; fix by construction.
