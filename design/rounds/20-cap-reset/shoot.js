// shoot.js puts each candidate of candidates.js into the console lab's fire
// scenario and shoots its three states into shots/<slug>/: the status
// region at 1440 in both themes, and at 390 (dark) for rest and confirm.
// "before" is the fire board as code main draws it, panel open.
// Usage: start the lab in the code repository,
//   CONSOLE_LAB=1 CONSOLE_LAB_DIR=/tmp/claude-1000/lab-r20 CONSOLE_LAB_ADDR=127.0.0.1:8092 \
//   CONSOLE_LAB_SCENARIO=fire go test -run '^TestLab$' -timeout 0 ./internal/console/
// then: node shoot.js [slug ...]
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { COMMON, CANDIDATES, dayCell } = require("./candidates.js");

const base = process.env.BASE || "http://127.0.0.1:8092";
const labDir = process.env.CONSOLE_LAB_DIR || "/tmp/claude-1000/lab-r20";
const out = path.join(__dirname, "shots");
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
const only = process.argv.slice(2);

async function open(browser, theme, viewport, dpr) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, bypassCSP: true });
  await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "networkidle" });
  await p.addStyleTag({ content: COMMON });
  return p;
}

async function install(p, c, state) {
  const s = c ? c.states[state] : null;
  await p.evaluate(({ strip, s, dayCell, c }) => {
    const sum = document.querySelector("summary.strip");
    const monthCell = sum.querySelector(".cell.spend");
    const cells = s && s.cells !== undefined ? s.cells : dayCell;
    if (cells) monthCell.insertAdjacentHTML("beforebegin", cells);
    if (!strip) {
      document.getElementById("status-line").open = true;
      if (s) {
        const sec = [...document.querySelectorAll("#status-panel section")].find((x) => x.querySelector("h3")?.textContent === "Spend");
        sec.innerHTML = s.spend;
      }
    }
    if (strip && s.pop) {
      const b = sum.querySelector(".rst-cell").getBoundingClientRect();
      // a closed details hides all but its summary: the box rides the body
      document.body.insertAdjacentHTML("beforeend", s.pop);
      const pop = document.body.lastElementChild;
      pop.style.left = Math.max(12, Math.min(b.left, innerWidth - 432)) + scrollX + "px";
      // below: the box opens under the whole strip, so it hides none of its cells
      pop.style.top = (c.below ? document.getElementById("status-line").getBoundingClientRect().bottom : b.bottom) + 6 + scrollY + "px";
    }
  }, { strip: !!(c && c.strip), s, dayCell, c: { below: !!(c && c.below) } });
  await p.waitForTimeout(300);
}

async function region(p, extra) {
  const b = await p.locator("#status-line").boundingBox();
  const vw = p.viewportSize().width;
  return { x: 0, y: Math.max(0, b.y - 6), width: vw, height: Math.min(b.height + 12 + extra, 900) };
}

(async () => {
  const browser = await chromium.launch();
  const list = [null, ...CANDIDATES].filter((c) => !only.length || only.includes(c ? c.slug : "before"));
  for (const c of list) {
    const slug = c ? c.slug : "before";
    const dir = path.join(out, slug);
    fs.mkdirSync(dir, { recursive: true });
    const states = c ? Object.keys(c.states) : ["rest"];
    for (const state of states) {
      const extra = c && c.strip && state === "confirm" ? 150 : 0;
      for (const theme of ["dark", "light"]) {
        const p = await open(browser, theme, { width: 1440, height: 900 }, 1);
        await install(p, c, state);
        await p.screenshot({ path: path.join(dir, `${state}-desk-${theme}.png`), clip: await region(p, extra) });
        await p.context().close();
      }
      if (state !== "after") {
        const p = await open(browser, "dark", { width: 390, height: 844 }, 2);
        await install(p, c, state);
        await p.screenshot({ path: path.join(dir, `${state}-phone-dark.png`), clip: await region(p, extra + (c && c.strip ? 60 : 0)) });
        await p.context().close();
      }
    }
    console.log("shot", slug);
  }
  await browser.close();
})();
