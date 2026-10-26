# Round 14: the landing page's hero, its line and its rhythm

Sebastian on 2026-10-26, after writing to a recruiter: the headline "The worst an agent can do is wreck its own sandbox." has a place, but tech people like it and a hiring manager or a CTO may not. Several aspects compete for the line (the chat and the board, the sandbox, self-hosting for regulated companies) and cramming them into one headline is no plan. The first screen is very full, people may miss that there is a film, and there is little negative space between sections. He asked for a few rounds on the problems and opportunities and for ways the page could improve against three goals, in order:

1. A hiring manager sees it and reads him as a Head of AI, a CTO or a Head of Engineering.
2. An incubator or accelerator finds it attractive. The business pitch stays separate; the public page does not talk up the money.
3. Someone who hires consultants for a project like this reads him as the person to hire. Close to goal 1.

The process is the condensed round of [process.md](../../process.md), at the size of one page section.

## What the round designs, and nothing else

1. The hero's line and the sentence under it.
2. The arrangement of the hero: what sits above the console frame, how the film is found, what the frame's callouts become, where the positioning band goes.
3. The rhythm of the page: the space between sections and how a section boundary reads.

## What is fixed

- The page's rules in [the handover](../../../launch/site/handover.md): never "open source" about the factory, no "compliant", "certified", "safe", "secure", no named regulation, no numbers from the demo, roadmap and never "roadmap YAML", links only to paths that exist.
- The tokens of `site.css`: the dark palette, the mono captions, the cyan accent and the amber for what waits on a human.
- The hero frame is `34-busy-board-3.png`, the film's poster, and the film plays in its place. No new frame is recorded in this round.
- The sections below the hero keep their content and order. The round touches their spacing and their boundary, not their words.
- Sebastian decides every change to the line. The round recommends; nothing ships from it.

## The questions the candidates answer

1. Which line makes a non-technical hiring reader see a product and a builder in five seconds, and still lets a CTO see the sandbox and the gates?
2. Where does the sandbox line go when it is not the headline?
3. How does a visitor find the film within the first screen at 1366x768, 1440x900 and 1920x1080?
4. How many elements may the first screen hold before the frame, and what do the three callouts become?
5. What spacing or boundary makes the sections read as stops instead of one block?
6. Does the page need a byline, and where?

## The candidates

- A. Twelve lines, the current one among them, rendered in the real hero at 1440 and at 390, on two contact sheets. The sentence under the line stays the current one, so the sheets differ in the line only.
- B. Five hero arrangements, built as copies of the real page with the hero rewritten, shot at 1440x900 and 1366x768 for the first screen, at 390 for the phone.
- C. Three rhythms, built as CSS changes on the real page, shot full height at 1440 and scaled.

## Why no image generation

The hero holds a real console frame and real copy. An image model would invent a console and misspell the copy. Every question here is answered better by the real page with the candidate in it. Images come in only if a layout question stays open after the built candidates, at most eight with `google/nano-banana-2.1`, at most $1.

## Limits of the run

Twelve lines, five arrangements, three rhythms. Two critics, Gemini 2.5 Pro and GLM 5V Turbo, at most two loops. A cap of $5 on critic calls, which the director reads off `tools/img.py cost`. The round stops when the round page carries the recommendation and its runner-up. Sebastian picks.
