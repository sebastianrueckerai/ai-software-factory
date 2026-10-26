# Round 14, the landing page's hero: notes

The run of [the brief](brief.md). Two critics judged the live page, then twelve lines, five arrangements and three rhythms, then three finalists. The director built the recommendation from the parts that won. Scripts: [build.py](build.py) (the candidates, the shots, the probe and the sheets), [phone.js](phone.js) (phone shots through Playwright). The candidates are real copies of the page and open in a browser: [candidates/](candidates/).

## The recommendation

**R1**, [candidates/R1.html](candidates/R1.html), [first screen at 1440x900](shots/R1-fold-1440x900.png), [at 1366x768](shots/R1-fold-1366x768.png), [on the phone](shots/R1-390.png), [the whole page beside the live one](shots/sheet-R-full.png). It was built after the two loops from the parts that won and the critics did not judge it as a whole.

The hero, from top to bottom:

1. The eyebrow stays: "AI software factory · Self-hosted · Source available".
2. The line: **"Write the roadmap. Agents build it on your servers."** (A01).
3. The sentence under it: **"The worst an agent can do is wreck its own sandbox. Nothing merges until the checks pass. You run it all from one chat and one board."** The sandbox line stays in the hero as the first proof under the promise.
4. The buttons: a filled cyan **"▶ Watch the film · 3 min"** first, then "How it works" and "Source and setup" as they are. The line "Use hosted models or your own" goes. Its fact moves to the third point.
5. A byline in the caption style under the buttons: "Designed and built by Sebastian Rücker · Portfolio · GitHub". The footer carries it again, with "alone, in 2026".
6. The console frame as the film's poster with a 96 px play ring a little above its centre. The three bracketed callouts above the frame go, and so does the caption "Recorded on the real console".
7. Three points under the frame, each a square mark, a bold lead and one line: "One chat, one board", "Each card in its own sandbox", "On your servers. Hosted models or your own. The source is published."
8. The band "Built for teams that cannot sign off a hosted coding agent" stays.

Below the hero: section padding 96 px above and 72 px below instead of 64 and 8, and every second section on the panel colour across the full width (C3). The sandbox section keeps its title "What the agent can reach", because the line now sits in the hero.

What the numbers say about R1 against the live page, both at 1440 wide:

| Measure | Live page | R1 |
|---|---|---|
| Hero height, px | 1260 | 1302 |
| Elements above the frame | 7 (eyebrow, line, lede, models line, two buttons, three callouts) | 6 (eyebrow, line, lede, three buttons, byline) |
| Film control in the first screen at 1366x768 | none (button at y 1086) | the filled button at y 364 |
| Film control in the first screen at 1440x900 | none | the button and the play ring (top at 659) |
| Page height, px | 7577 | 8421 |
| Hero words visible | 132 | 141 |
| Line on the phone, lines | 3 | 3 |

The play ring's top sits at 659 px at 1440x900, inside a first screen of 813 px. At a 1366x768 laptop it falls under the fold and the filled button is the film control there. No arrangement with a line above the frame keeps the ring inside 681 px.

## The runner-up

For the line: **A07, "Coding agents for teams whose code must stay in house."** Gemini scored it 5/5/4 in the second loop and GLM 4/4/4 in both. It sells the reader the band already names and says nothing about the roadmap or the chat. A short form of A11, "A software factory you run yourself.", scores highest with both critics for the hiring reader but the eyebrow already says self-hosted and the full A11 wraps to four lines on the phone.

For the arrangement: **B4**, the three points above the frame. Gemini ranked it first in the second loop and both critics called its three points the clearest statement of the product. It loses because the points push the play ring to 765 px, under the fold at 1440x900 and 1366x768. R1 keeps its points and moves them under the frame.

## The baseline: what the critics said about the live page

Both critics agreed with Sebastian's three complaints and added a fourth. [The prompt](critique/baseline/prompt.md), [Gemini](critique/baseline/baseline-gemini.json), [GLM](critique/baseline/baseline-glm.json).

| Question | Gemini | GLM |
|---|---|---|
| The line, for the hiring reader (1 to 5) | 2 | 2 |
| The line, for the incubator reader | 3 | 3 |
| The line, for the CTO | 5 | 4 |
| Elements competing in the first screen | 9 | 11 |
| Whitespace between sections (1 to 5) | 2 | 3 |
| The film control found (1 to 5) | 1 | 2 |
| Author named anywhere | no | no |

Both named the same biggest problem: the page presents a product and no person. A hiring manager has nothing to attribute the work to. The second: the film is the best explainer and sits under the fold. The third: the line names a feature, not the product.

## The line, round A

Twelve lines in the real hero, [sheet 1](shots/sheet-A-1440-1.png), [sheet 2](shots/sheet-A-1440-2.png), [the phone](shots/sheet-A-390.png). The sentence under the line stayed the live one on purpose, so the critics also graded the pair. Scores are hiring reader / incubator / CTO. Loop 1 saw phone crops from a 500 px layout (see "What went wrong"), loop 2 saw true 390 px crops. Only the phone input changed, and the scores still moved.

| Line | Gemini loop 1 | Gemini loop 2 | GLM loop 1 | GLM loop 2 | Phone lines |
|---|---|---|---|---|---|
| A00 The worst an agent can do is wreck its own sandbox. | 2/2/5 | 2/2/5 | 4/4/4 | 4/4/5 | 3 |
| A01 Write the roadmap. Agents build it on your servers. | 5/5/5 | 5/5/4 | 4/5/3 | 2/2/3 | 3 |
| A02 Autonomous software development on servers you control. | 4/4/4 | 4/4/3 | 3/4/3 | 4/4/3 | 3 |
| A03 A team of coding agents, each walled into its own sandbox. | 4/4/5 | 3/3/4 | 4/4/4 | 3/4/4 | 3 |
| A04 Run a team of coding agents from one chat. | 3/3/3 | 2/2/3 | 3/3/2 | 4/3/2 | 2 |
| A05 Agents build your roadmap. The gates decide what merges. | 3/3/4 | 3/3/4 | 4/4/4 | 3/3/4 | 3 |
| A06 AI writes the code. Your servers run it. Checks decide what merges. | 3/4/4 | 2/2/2 | 5/5/5 | 5/5/4 | 3 |
| A07 Coding agents for teams whose code must stay in house. | 4/4/4 | 5/5/4 | 3/4/3 | 4/4/4 | 3 |
| A08 One board, one chat, and agents that build what is on it. | 3/3/3 | 2/2/3 | 4/4/3 | 3/3/2 | 3 |
| A09 Software built by agents, each in its own sandbox, nothing merged unchecked. | 2/3/4 | 2/3/3 | 4/4/5 | 3/3/4 | 4 |
| A10 Your roadmap in. Checked code out. Everything between on your servers. | 4/4/5 | 1/1/2 | 4/4/4 | 4/4/4 | 4 |
| A11 A software factory you run yourself: agents build, gates decide, you steer. | 2/2/3 | 5/5/5 | 5/5/4 | 5/4/4 | 4 |

What holds across all four readings: A00 is the best line for the CTO and the worst for the hiring reader in Gemini's view, and GLM rates it a 4 for everyone. A01 scores 5 for the hiring reader with Gemini twice and loses with GLM in loop 2 only because it repeats the live sentence under it. A06 and A10 swing from top to bottom between loops with the same critic. A11 scores highest for the hiring reader over all four readings and wraps to four lines on the phone. Both critics, asked where the sandbox line goes if it is not the headline, said the title of the sandbox section. Both then said in the final loop that the hero loses the CTO's trust signal without it. The recommendation keeps it in the hero, under the new line.

## The arrangement, round B

Five arrangements, [B1](shots/B1-fold-1440x900.png), [B2](shots/B2-fold-1440x900.png), [B3](shots/B3-fold-1440x900.png), [B4](shots/B4-fold-1440x900.png), [B5](shots/B5-fold-1440x900.png), [the laptop sheet](shots/sheet-B-1366.png), [the phone sheet](shots/sheet-B-390.png). All five carry the live line and sentence.

| Candidate | What it is | Gemini loop 1 | Gemini loop 2 | GLM loop 2 | Play ring top, px |
|---|---|---|---|---|---|
| B1 | film button first, play ring on the frame, callouts under it | 1st | 3rd | 1st | 658 |
| B2 | copy left, frame right | 5th | 5th | 3rd | 286 |
| B3 | the live callouts kept, film button and ring added | 4th | 4th | 5th | 701 |
| B4 | three product points above the frame, band dropped | 2nd | 1st | 4th | 765 |
| B5 | B1 plus a byline under the buttons | 3rd | 2nd | 2nd | 677 |

GLM's loop 1 answer was cut at its token limit and only its table survived, with B4 first on product clarity and B1 on the film control. B3, the smallest change to the live page, lost with both critics in every loop: the callouts above the frame keep the first screen full. B2 fits every control into every first screen and reads as a template to both critics on the desk. The byline: Gemini called it needy in loop 1 and a net positive in loop 2, GLM a net positive that costs vertical space. R1 puts it on the caption line that the models line vacated.

## The rhythm, round C

[The sheet](shots/sheet-C-full.png): the live page (C0), more space (C1), space and a hairline (C2), space and alternating panels (C3).

| Candidate | Boundaries legible, Gemini / GLM | Reads as stops, Gemini / GLM | Page height, px |
|---|---|---|---|
| C0 | 1 / 1 | 1 / 1 | 7577 |
| C1 | 4 / 3 | 4 / 3 | 8401 |
| C2 | 4 / 4 | 4 / 4 | 8305 |
| C3 | 5 / 5 | 5 / 5 | 8441 |

Both put C3 first and both warned that eight bands can get monotonous. Gemini still loses the boundary between "How it compares" and "Proof and limits", GLM between "What you get" and "What the agent can reach". Both asked for one thing none of the four does: space that varies with the section, more after a diagram than after a short text.

## The finalists, loop 2

Three pages on B1 and C3 with the sandbox line as the sandbox section's title and a byline in the footer, [F1](shots/F1-fold-1440x900.png), [F2](shots/F2-fold-1440x900.png), [F3](shots/F3-fold-1440x900.png), [the laptop](shots/sheet-F-1366.png), [the phone](shots/sheet-F-390.png), [the whole page](shots/sheet-F-full.png).

| Finalist | Line | Gemini | GLM |
|---|---|---|---|
| F1 | A01, with a new sentence: "Each card is built in its own sandbox. Nothing merges until the checks pass. You run it all from one chat and one board." | 2nd, 5/5/4 | 1st, 4/4/4 |
| F2 | A10 with the live sentence trimmed | 3rd, 3/3/4 | 3rd, 3/3/3 |
| F3 | A06 with the live sentence trimmed | 1st, 5/5/5 | 2nd, 3/3/4 |

F1 is the only finalist in both critics' top two. F2 lost with both: "clever over clear", and "Checked code out" reads as ambiguous. Both critics said the hero loses something a CTO looks for once the sandbox line titles a lower section. Gemini's one change was to fold the line into the sentence under the headline, GLM's to add a strapline under the buttons. R1 does the first.

## What the director overruled

- Gemini, round B loop 2: "all five candidates show the play control at 1366x768". Measured: the first screen is 681 px tall there and the ring's top sits at 658 (B1, B5), 701 (B3) and 765 (B4). Only B2's ring, at 286, is inside. The filled button in the row is inside for all five.
- Gemini, round F: F1's line and sentence "say one thing twice". The F1 sentence names the sandbox, the checks, the chat and the board. The line names the roadmap and the servers.
- GLM, round F: F2's "Checked code out" breaks inside a word on the phone. The page sets no hyphenation. The four-line wrap stands.
- GLM, round B: B4's top rules "mislead as tabs". R1 uses the page's square mark instead of the rule.
- Both critics' loop 1 phone findings, and the baseline's phone findings. See below.

## What went wrong

Headless Chrome floors its window at 500 px wide in both the new and the old mode. Every "390 px" shot of loop 1 was a 500 px layout cut to 390 px, so the h1 wrapped to fewer lines than it does on a phone. The probe caught it: `innerWidth` read 500. [phone.js](phone.js) now shoots the phone through Playwright at a true 390 px viewport, and loop 1 ran again on the corrected sheets. The first answers sit in `critique/A/loop1-500px-phone/` and `critique/B/loop1-500px-phone/`. The baseline critique's phone answers rest on the same flaw and were not run again: its two phone findings (the console frame unreadable, the line long) hold at 390 px as well.

GLM returned HTTP 429 when six calls ran at once. Its round B and round F calls ran again one after the other.

## Cost and time

Fourteen critic calls answered and two came back with a rate limit, no image generation. `tools/img.py` estimates $0.03 a call: $0.42 for the fourteen. The fal and Z.ai dashboards hold the real figure. The round took about two hours of wall clock on 26 October 2026.

## Open, for Sebastian

1. The line: A01, or the runner-up A07, or a line of his own.
2. The byline: the wording, and the portfolio link. `sebastianruecker.com` is a guess from his e-mail domain and is unverified.
3. The three points under the frame. "Say what you want" is new copy. The rest is lifted from the page.
4. The rhythm: C3 as judged, or C3 with space that varies with the section as both critics asked.
5. Whether the hero's three bracketed callouts may go. The hero frame's sidecar boxes then have no reader on the page.
