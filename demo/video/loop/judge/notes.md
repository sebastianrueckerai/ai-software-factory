# The procedural loop against filmed scene 29

21 October 2026. The trial of the procedural route from [the research](../../../handover/research-procedural-video.md): HyperFrames 0.8.183 (Apache-2.0) on [loop.html](../../../diagrams/loop.html)'s panels and wires, one paused GSAP 3.14.2 timeline, 30 seconds at 1600 by 900 and 30 fps, rendered locally by [render.js](../../render.js). Both the sidecar and the page rebuild from one command: `node demo/video/render.js loop`.

## What the trial showed

- The toolchain holds: a 30-second clip renders in about 45 seconds, and two renders are identical frame for frame (the sidecar's `deterministic`). No API spend.
- The composition reuses `diagram.css` through a link, so the clip and the console frames share the tokens. The CSS transition and the breathing animation of the diagram page are switched off in the composition; everything moves on the timeline.
- Lint: no errors. Four warnings, all about Studio's editing model or a tween boundary where two values agree.

## The critic

Gemini 2.5 Pro over [the contact sheet](contact-sheet.jpg), four frames of each version ([the answer](critique-gemini.json), $0.03):

1. The procedural version reads as a closed loop faster: the return wire drawing itself makes the loop explicit, where the filmed version reveals the closing line abruptly in its last step. Neither closes the loop inside four seconds.
2. The amber dot will be the one thing the eye follows, and the lit panel reads as "the card is here". The critic said it was inferring the motion.
3. Legibility at 1600 by 900 is good; the counter is subtle and fits the look. The one weakness: the telemetry label was too thin and low-contrast.
4. The procedural version should open the film. One change: more contrast on the telemetry label, and have it appear as the wire completes.

## The director's view and the decision

The critic is right on both counts I could check in the pixels: the filmed version's six steps show no motion, and the telemetry label sat in the muted colour on the dark field. Applied: the label now takes the text colour with the word "telemetry" in cyan, and it fades in at 9.6 seconds, when the return wire's tip lands. Re-rendered, still deterministic.

The procedural route wins for diagrams. The three layers diagram follows as the second composition under `demo/video/layers/`. The filmed diagram scenes 29 to 32 stay in the bank as the fallback.

Open: the film's opening beat is four seconds, and the loop takes ten to close. The cut either starts at second 6 with the panels already up, or the opening beat takes the last four seconds, the ring lit and the counter at two laps. Sebastian's call at the cut.

Cost: $0.03.
