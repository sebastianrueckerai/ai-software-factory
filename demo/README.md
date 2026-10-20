# Demo scenes

A bank of scripted recordings of the real console, served by the console lab over the data of a fake project (Studio Nord, `nord/booking`). Design: [the demo scenes design](../docs/superpowers/specs/2026-10-20-demo-scenes-design.md).

`demo/run.sh [scene...]` starts the lab from `$CODE_REPO` (default `~/repos/ai-software-factory-code`), records the named scenes or all of `demo/scenes/`, converts each to mp4 and stops the lab. The lab ends itself after 30 minutes. `CONSOLE_LAB_DIR` and `CONSOLE_LAB_ADDR` default to `/tmp/claude-1000/console-lab-demo` and `127.0.0.1:8147`.

Output, ignored by git: `demo/out/<scene>.webm`, `.mp4`, `.json` (the sidecar) and `<scene>-<step>.png`. A scene that fails (a rejected seed, a page error, a 4xx or 5xx from the console) leaves no output, is named on stderr, and makes the run exit 1.

A scene module. `state(now)` returns the lab's scene JSON, or null for no seed. An action has one key: `goto`, `click`, `type: [selector, text]`, `press`, `hover`, `wait`, `waitFor`.

    module.exports = {
      title: "Smoke", story: "One card runs, then is done.", group: "smoke", theme: "dark", viewport: "desk",
      steps: [{ state: (now) => state.scene(now, { tasks: [...] }), actions: [{ goto: "/" }], hold: 1500 }],
    };

Sidecar clock: `atMs` and `durationMs` count from the creation of the recording context, which is the video's time zero (measured: the board is on screen within about half a second of it). `durationMs` is the script's span; `videoMs` is the webm's measured length. The file's end is not tied to the script's: measured `videoMs` ran from 0.1 s shorter to 1.8 s longer than `durationMs` (a static tail), so cut by `atMs` and `durationMs` and read `videoMs` before trusting the end.

Tests: `node --test demo/test/*.test.js`.
