# Demo scenes

A bank of scripted recordings of the real console, served by the console lab over the data of a fake project (Studio Nord, `nord/booking`). Design: [the demo scenes design](../docs/superpowers/specs/2026-10-20-demo-scenes-design.md).

`demo/run.sh [scene...]` starts the lab from `$CODE_REPO` (default `~/repos/ai-software-factory-code`), records the named scenes or all of `demo/scenes/`, converts each to mp4 and stops the lab. The lab ends itself after 30 minutes. `CONSOLE_LAB_DIR` and `CONSOLE_LAB_ADDR` default to `/tmp/claude-1000/console-lab-demo` and `127.0.0.1:8147`.

Output, ignored by git: `demo/out/<scene>.webm`, `.mp4`, `.json` (the sidecar) and `<scene>-<step>.png`. A scene that fails (a rejected seed, a page error, a 4xx or 5xx from the console) leaves no output, is named on stderr, and makes the run exit 1.

A scene module. `state(now)` returns the lab's scene JSON, or null for no seed. An action has one key: `goto`, `click`, `type: [selector, text]`, `press`, `hover`, `wait`, `waitFor`, `scroll` (the element to the top of its scroll box), `seed` (a `state(now)` the lab takes in the middle of a step, after a real press).

    module.exports = {
      title: "Smoke", story: "One card runs, then is done.", group: "smoke", theme: "dark", viewport: "desk",
      steps: [{ state: (now) => state.scene(now, { tasks: [...] }), actions: [{ goto: "/" }], hold: 1500 }],
    };

A diagram scene sets `page: "diagrams/loop.html"`: the recorder opens that file under `demo/` instead of the lab, posts no state and draws no cursor, and each step's `{ press: "ArrowRight" }` reveals the page's next part (`ui.reveal(n)`). The four pages in `demo/diagrams/` share `diagram.css`, the console's dark tokens, and `diagram.js`, the reveal: a `[data-step]` part shows once the page's step reaches it and hides again from its `data-until`.

Sidecar clock: `atMs` and `durationMs` count from the creation of the recording context, which is the video's time zero (measured: the board is on screen within about half a second of it). `durationMs` is the script's span; The mp4 is cut to `durationMs`; the webm keeps its static tail (`context.close()` takes a variable time), and `videoMs` is its measured length.

Tests: `node --test demo/test/*.test.js`.
