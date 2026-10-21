# Procedural video from code: how it is done and what fits us

Researched 2026-10-21. Web material is from 2026 unless noted. Nothing was installed or run.

## Answer first

Our diagram pages already are the procedural route: HTML, CSS and JS that a model writes and a browser films. What they lack is a timeline, easing, audio sync and frame-exact capture. The cheapest way to add those without a React build is HeyGen's HyperFrames (HTML plus GSAP, seekable, rendered frame by frame by headless Chrome and ffmpeg, Apache-2.0 per a skill directory; check the repo's LICENSE before use), which uses the same DOM and CSS tokens as the console frames. Remotion is the best-documented route for Claude, but it needs React, a toolchain we do not have, and a licence read; keep it as the fallback, not the first try.

## Comparison

| Tool | Model writes | Renders how | Cost | Fit with our look | Maturity |
|---|---|---|---|---|---|
| Remotion | React/TSX components, frame maths (`useCurrentFrame`, `interpolate`, `spring`) | Headless Chrome screenshots every frame, ffmpeg to mp4; local or Lambda | Source-available, not OSI open source. Free for individuals and companies of up to 3 staff; else $25 per seat per month or $0.01 per render (min $100 a month). Local render has no API spend | Good: CSS tokens and mono fonts work. Needs a React project; our diagram CSS can be imported | Most mature. v4.0.532 on 1 Oct 2026, about 61k stars. Official Claude Code skill (Jan 2026) |
| HyperFrames (HeyGen) | Plain HTML with `data-start`/`data-duration`, GSAP timeline on `window.__timelines`; no React | Seeks a paused timeline to each frame; Puppeteer, CDP `beginFrame` on Linux chrome-headless-shell, ffmpeg | Apache-2.0 (per skill list; not verified in repo text). Needs Node 22+ and ffmpeg, which we have. Local, no API spend | Best: our diagrams are already HTML/CSS. Reuse `diagram.css` as is | New (write-up 22 Jun 2026). About 68.8k stars, 21 skills for Claude Code incl. `/motion-graphics`, `/faceless-explainer`, `/hyperframes-audio`. Young, so expect API drift |
| Motion Canvas | TS generator functions drawing to canvas | Editor exports image sequence or ffmpeg mp4 | MIT. Local | Fair: canvas text, so tokens are re-declared in TS. Made for voice-over-synced vector explainers | Active (v3.17.x, about 19k stars). No official agent skill, no headless render API |
| Revideo | Same model as Motion Canvas, plus a render API | Server-side headless render | MIT. Local | Same as Motion Canvas | Maintained (0.11.0, Jul 2026) but roadmap now follows its commercial editor; about 4k stars |
| Manim (Community) | Python scenes | Cairo/OpenGL to mp4; LaTeX for maths | MIT. Local | Poor: built for maths, own look; theming is work | Mature; wrong domain |
| p5.js / plain Canvas / SVG / CSS | JS, CSS keyframes, WAAPI, GSAP | Playwright `recordVideo` (real time, webm, 25 fps) or stepped screenshots plus ffmpeg | Free. Local | Exact (this is what we do now) | Always works; the capture method decides quality |
| Lottie | JSON from After Effects or a generator; models write it badly by hand | Player in a page; render via page capture | Open formats | Poor for text-heavy dark UI | Mature runtime, weak for model authoring |
| Theatre.js | JS with a visual timeline editor | In-browser; no render path of its own | Apache-2.0 (core) | Fair | Needs a human at the editor; no gain for an agent. Not researched in depth |

## How Claude does this today

- Claude in chat (claude.ai) cannot produce video. It writes SVG, CSS, Canvas or React that runs live in an Artifact, so you see motion but not frames. To get an mp4 you need code execution on a machine: Claude Code. See [screenapp](https://screenapp.io/blog/can-claude-create-videos) and [Webflow on Claude and GSAP](https://webflow.com/blog/animating-with-claude-and-gsap): a headless browser steps the animation, ffmpeg stitches it. Webflow notes Claude often rolls its own engine unless told to use GSAP.
- Anthropic itself: I found no official Anthropic video or animation skill. The nearest primary evidence is that Claude's own mascot animations are SVG plus GSAP plus React with no video files ([Codrops, 5 May 2026](https://tympanus.net/codrops/2026/05/05/reverse-engineering-claude-ais-mascot-animations-with-svg-and-gsap/)). Not found does not mean it does not exist.
- Remotion publishes the agent route itself: [Building with Remotion and AI](https://www.remotion.dev/docs/ai), [Prompting videos with coding agents](https://www.remotion.dev/docs/ai/coding-agents), [Claude Code page](https://www.remotion.dev/docs/ai/claude-code). Setup: `npx create-video --yes --blank my-video`, `npx remotion skills add`, `npm run dev`, then run `claude`. Docs pages are fetchable as markdown by adding `.md`. The skills repo is `remotion-dev/skills`. Install commands differ between tutorials; check the page first.
- HyperFrames: [HeyGen write-up, 22 Jun 2026](https://www.heygen.com/research/html-to-video) and [repo](https://github.com/heygen-com/hyperframes) (Node 22+, ffmpeg; CLI `init lint preview render`; skills include `/hyperframes-audio` for voice-over ducking and `/media-use` for TTS).
- Skill lists: [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills), [Claude-Code-Video-Toolkit](https://github.com/wilwaldon/Claude-Code-Video-Toolkit).
- Field reports: [Rescroll, 3 Oct 2026](https://www.rescroll.ai/blog/claude-code-remotion-motion-graphics-2026) (a competing product, so read with care) and [Wireflow, 14 Oct 2026](https://www.wireflow.ai/blog/claude-motion-graphics): one prompt gave a 12 s 1080p clip in about 9 minutes for about $1.00 of model use at list price.
- Works well: counting numbers, diagram reveals, kinetic text, anything with exact numbers in code, easy re-runs after a change.
- Works badly: the default look is plain (fonts and colours must be set); pixel positions are hard-coded, so layout needs a look-and-fix loop; timing is in frames, so an fps mistake drifts every graphic; the first draft of timing is usually a beat off; a clip often takes an hour or more of iteration, not the ten seconds the demos show; `@remotion/*` versions must match exactly.
- Voice-over: generated narration comes from a third-party TTS. Remotion has no TTS package; HyperFrames has a skill that calls TTS models.
- Two rules from the sources: a deterministic render forbids `Date.now()`, unseeded `Math.random()` and network fetches; and the model must look at rendered stills and correct itself, which matches our design principle.

## What our recorder covers and what it lacks

Covers: 1600 by 900 pages, console tokens in `demo/diagrams/diagram.css`, `[data-step]` reveals driven by `ArrowRight`, scripted holds, mp4 cut to `durationMs`, sidecar JSON, failure on a page error. The look matches the console frames because it is the same CSS.

Lacks:
- Timeline: steps are key presses with `hold` times, not a clock. No overlap, stagger, or a wire drawing itself over 1.2 s.
- Easing: only what CSS transitions give; nothing tied to a master time.
- Determinism: `recordVideo` is real time, webm VP8, about 25 fps. A slow machine drops frames and a rerun differs.
- Audio: none. Voice-over and music would be joined with ffmpeg afterwards at hand-set offsets.
- Frame rate: 25 fps, so fast motion looks coarse.
- Scrubbing: no way to jump to second 7.3 and inspect a frame, so the model cannot check its own work cheaply.

## Does it justify a toolchain

Remotion buys a studio with a scrubber, a first-class audio timeline and the best agent docs. It costs a React/TS project, a version-aligned package set, a licence check (Sebastian as an individual is in the free tier; use inside a company or accelerator may not be), and a rebuild of our CSS as components. Not worth it for four to six explainer clips.

HyperFrames gives a seekable timeline, deterministic frames, 30 or 60 fps, audio tracks and a lint step, all in plain HTML we already write. It adds one npm dependency under `demo/`, no React. Its youth is the risk.

A do-it-ourselves version: expose `window.__seek(t)` on a page, drive animations with WAAPI or a paused GSAP timeline, step it with Playwright screenshots, encode with ffmpeg. About 80 lines, deterministic, no new tool except GSAP (or none with WAAPI). This is what HyperFrames does minus its audio mixer and skills. Use it if the HyperFrames trial disappoints.

## Proposal

Tool: HyperFrames, one trial clip; fall back to the seek-and-capture script if it fights us.

First clip: "The loop", 30 s, 1600 by 900, 30 fps. The five planes appear as panels taken from `loop.html`; cyan wires draw clockwise with easing; an amber card dot travels the ring; a mono counter ticks (signals in, merges out); a final beat closes the ring back to signals. It reuses `loop.html` and `diagram.css`, and it can replace clip 33 of `demo/generated/PLAN.md` (about $0.40 of fal spend) with a version whose words are exact. The fal clips can then stay for atmosphere only. A second clip, "a card's journey", can follow with the same parts.

Setup:
1. In `demo/video/` run `npx hyperframes init`; copy `diagram.css`; use local font files, no network.
2. `npx skills add heygen-com/hyperframes`; prompt Claude Code with the brief, the `loop.html` source and the tokens.
3. `hyperframes lint`, `preview`, then `render` to mp4. Claude checks stills at fixed times (`snapshot`) and corrects.
4. Voice-over later: record or TTS a track, place it with `data-start`, duck music with `/hyperframes-audio`. Skip audio in the first clip.
5. Render twice and hash the frames to prove determinism before it goes in the film.

Estimate: half a day to a first clip that looks right (setup 1 h, first draft 20 min, 3 to 5 look-and-fix rounds), then 1 to 2 h per further clip. Money: no API spend beyond the Claude subscription; rendering is local CPU, minutes for 30 s. If metered, expect about $1 of model use per 10 to 15 s clip (Wireflow figure).

## Caveats

- HyperFrames' licence came from a skill directory result, not the repo text I could read. Confirm the LICENSE file.
- Its fully deterministic mode needs Linux with chrome-headless-shell. We are on Linux. Other platforms fall back to heuristics.
- I ran nothing. Maturity claims come from star counts, release posts and blogs, some from vendors (HeyGen, Rescroll, Wireflow).
- Third-party Remotion pricing pages are often stale; `remotion.dev/docs/terms` and `remotion.pro/license` are authoritative. One comparison site (PkgPulse) shows a different licence model and looks wrong.
- Theatre.js, Lottie and Manim were covered from general knowledge and search snippets only.
- Procedural clips are 2D explainer material. They do not replace real-console recordings; they sit between them as the "how it works" beats.
