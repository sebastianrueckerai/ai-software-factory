// shoot.js puts each candidate of candidates.js into the console lab's
// real opened card and shoots it into shots/<slug>/: the scenes room-ahead
// (at 1, at 3 with the spend limit line, at 2 with the money left out),
// room-money and room-chat, in both themes at 1440 and 390, and the count
// alone at 1x and 3x. "before" is the control as the lab draws it today.
// Usage: start the lab from the code repository,
//   CONSOLE_LAB=1 CONSOLE_LAB_DIR=/tmp/claude-1000/lab-r21 CONSOLE_LAB_ADDR=127.0.0.1:8121 \
//   go test -count=1 -run '^TestLab$' -timeout 0 ./internal/console/
// then: node shoot.js [slug ...]       shoots "before" and the four, or the
//                                      slugs named, the finalists among them
//       node shoot.js check [slug ...] drives each candidate's own count
//                                      and tick against the live readout route
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { CSS, CANDIDATES, FINALISTS, PAGE } = require("./candidates.js");
const ALL = [...CANDIDATES, ...FINALISTS];

const base = process.env.BASE || "http://127.0.0.1:8121";
const labDir = process.env.CONSOLE_LAB_DIR || "/tmp/claude-1000/lab-r21";
const out = path.join(__dirname, "shots");
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
const desk = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

const SCENES = {
  "room-ahead": { at: ":more", form: 'form[data-answer="extend"]', pick: true },
  "room-money": { at: ":press=extend", form: 'form[data-answer="extend"]', pick: false },
  "room-chat": { at: ":overview", form: 'form[data-answer="choice:fund_chat"]', pick: true },
};
const JOBS = [
  { scene: "room-ahead", state: "n1", n: 1 },
  { scene: "room-ahead", state: "n3", n: 3 },
  { scene: "room-ahead", state: "n2-off", n: 2, off: true, only: "desk" },
  { scene: "room-money", state: "n1", n: 1 },
  { scene: "room-chat", state: "chat" },
];

async function open(browser, scene, theme, viewport, dpr) {
  const r = await fetch(base + "/lab/scenario/" + scene);
  if (r.status !== 204) throw new Error("seed " + scene + ": " + r.status);
  const id = r.headers.get("x-lab-drawer");
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, bypassCSP: true });
  await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await ctx.newPage();
  const inflight = new Set();
  const errors = [];
  page.on("request", (q) => { if (!q.url().includes("/events/stream")) inflight.add(q); });
  page.on("requestfinished", (q) => inflight.delete(q));
  page.on("requestfailed", (q) => { inflight.delete(q); if (!q.url().includes("/events/stream")) errors.push(q.url()); });
  page.on("pageerror", (e) => errors.push("script error: " + e.message));
  const idle = async () => {
    let quiet = Date.now();
    const start = Date.now();
    while (Date.now() - quiet < 400) {
      if (inflight.size) quiet = Date.now();
      if (Date.now() - start > 15000) throw new Error("never idle");
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(250);
  };
  await page.goto(base + "/#card=" + id + SCENES[scene].at, { waitUntil: "load" });
  await idle();
  await page.addStyleTag({ content: CSS });
  await page.addScriptTag({ content: "(" + PAGE.toString() + ")();" });
  const form = page.locator("#drawer " + SCENES[scene].form);
  if (SCENES[scene].pick) await form.locator("button.pick").click();
  await idle();
  return { ctx, page, idle, errors, form };
}

// set drives the control as the lab draws it to count n and the tick, so
// every candidate starts from the server's own readout
async function set(p, job) {
  if (job.n && job.n !== 1) {
    const count = p.form.locator('input[name="extend.sessions"]');
    await count.fill(String(job.n));
    await count.dispatchEvent("change");
    await p.idle();
  }
  if (job.off) {
    await p.form.locator('input[name="extend.money"]').uncheck();
    await p.idle();
  }
  // a typed field fires its own change once it loses focus: let it fire
  // now, while the form is whole, not when the candidate moves it
  await p.page.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.idle();
}

async function install(p, c) {
  if (!c) return;
  await p.page.evaluate((k) => window.r21.install(k), c.key);
  await p.page.waitForTimeout(150);
}

// region is the part of the drawer a shot shows: from the ask (or the
// fold that holds the control) to the answer after the control
async function region(p, scene, vp) {
  return p.form.evaluate((f, { scene, vp }) => {
    const top = scene === "room-ahead" ? f.closest("details").querySelector("summary") : document.querySelector("#drawer .o-ask");
    top.scrollIntoView({ block: "start" });
    const next = f.nextElementSibling && f.nextElementSibling.matches(".answer") ? f.nextElementSibling : f;
    const d = document.getElementById("drawer").getBoundingClientRect();
    const a = top.getBoundingClientRect(), b = next.getBoundingClientRect();
    const y = Math.max(0, a.top - 10);
    const h = Math.min(innerHeight, b.bottom + 12) - y;
    const x = vp.width < 600 ? 0 : d.left;
    return { x, y, width: (vp.width < 600 ? vp.width : d.right) - x, height: h, cut: b.bottom + 12 > innerHeight };
  }, { scene, vp });
}

async function countBox(p) {
  return p.form.evaluate((f) => {
    const fs = f.querySelector("fieldset.fields");
    fs.scrollIntoView({ block: "center" });
    // the extent of the count's own control, not of its full-width box or
    // the session's worth beside it
    const el = fs.querySelector(".r21-count, .say");
    const range = document.createRange();
    let r;
    if (el && el.matches(".say")) {
      range.selectNodeContents(el);
      r = range.getBoundingClientRect();
    } else if (el) {
      const rs = [...el.children].filter((c) => !c.matches(".each")).map((c) => {
        if (c.children.length) return c.getBoundingClientRect();
        const t = document.createRange();
        t.selectNodeContents(c);
        return t.getBoundingClientRect();
      });
      r = { left: Math.min(...rs.map((x) => x.left)), top: Math.min(...rs.map((x) => x.top)), right: Math.max(...rs.map((x) => x.right)), bottom: Math.max(...rs.map((x) => x.bottom)) };
    } else {
      const a = fs.querySelector("label.field").getBoundingClientRect(), b = fs.querySelector('input[name="extend.sessions"]').getBoundingClientRect();
      r = { left: a.left, top: a.top, right: Math.max(a.right, b.right), bottom: b.bottom };
    }
    return { x: r.left - 8, y: r.top - 8, width: Math.min(r.right - r.left, 600) + 16, height: r.bottom - r.top + 16 };
  });
}

async function shoot(browser, c) {
  const slug = c ? c.slug : "before";
  const dir = path.join(out, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const job of process.env.ONLY === "count" ? [] : JOBS) {
    for (const theme of ["dark", "light"]) {
      for (const [vp, w, dpr] of [[desk, "desk", 1], [phone, "phone", 2]]) {
        if (job.only && job.only !== w) continue;
        if (job.only && theme === "light") continue;
        const p = await open(browser, job.scene, theme, vp, dpr);
        try {
          await set(p, job);
          await install(p, c);
          const clip = await region(p, job.scene, vp);
          if (clip.cut) console.log("  cut at the viewport:", slug, job.scene, job.state, w, theme);
          delete clip.cut;
          await p.page.screenshot({ path: path.join(dir, `${job.scene}-${job.state}-${w}-${theme}.png`), clip });
          if (p.errors.length) throw new Error(p.errors.join("; "));
        } finally {
          await p.ctx.close();
        }
      }
    }
  }
  for (const theme of ["dark", "light"]) {
    for (const dpr of [1, 3]) {
      const p = await open(browser, "room-ahead", theme, desk, dpr);
      try {
        await set(p, { n: 3 });
        await install(p, c);
        await p.page.screenshot({ path: path.join(dir, `count-${theme}-${dpr}x.png`), clip: await countBox(p) });
      } finally {
        await p.ctx.close();
      }
    }
  }
  console.log("shot", slug);
}

// check drives each candidate's own count to 3 and its tick off and on
// again on the live lab: the readout the route answers, the guard the press
// would post, one extend.sessions value, a visible tick, and at 390 no
// sideways scroll and no target under 44 px
async function check(browser, c) {
  const fails = [];
  for (const [vp, w] of [[desk, "desk"], [phone, "phone"]]) {
    const p = await open(browser, "room-ahead", "dark", vp, 1);
    try {
      await install(p, c);
      const f = p.form;
      const kind = { a: "step", a2: "step", b: "seg", d2: "seg", c: "select", d: "num" }[c.key];
      if (kind === "step") { await f.locator("button.plus").click(); await p.idle(); await f.locator("button.plus").click(); }
      if (kind === "seg") await f.locator(".seg", { hasText: "3" }).click();
      if (kind === "select") await f.locator("select").selectOption("3");
      if (kind === "num") { const n = f.locator('input[name="extend.sessions"]'); await n.fill("3"); await n.dispatchEvent("change"); }
      await p.idle();
      const state = () => f.evaluate((form) => {
        const d = new FormData(form);
        return { sessions: d.getAll("extend.sessions"), money: d.getAll("extend.money"),
          guard: ["now", "starts", "agent_time_s", "eur", "limit"].map((k) => d.get("extend.shown_" + k)).join(" "),
          text: form.querySelector(".room").innerText.replace(/\s+/g, " "),
          tick: (() => { const t = form.querySelector('input[name="extend.money"]'); const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0; })() };
      });
      let s = await state();
      if (s.sessions.join() !== "3") fails.push(`${w}: at 3 the form posts extend.sessions ${JSON.stringify(s.sessions)}`);
      if (s.guard !== "1 3 2280 2.70 0.70") fails.push(`${w}: at 3 the guard is ${s.guard}, want 1 3 2280 2.70 0.70`);
      for (const want of ["8.70 EUR", "3 more sessions", "2.70 EUR", "38 min"]) if (!s.text.includes(want)) fails.push(`${w}: at 3 the readout lacks ${want}: ${s.text}`);
      if (!s.tick) fails.push(`${w}: the tick is not visible at 3`);
      await f.locator('input[name="extend.money"]').click();
      await p.idle();
      s = await state();
      if (s.money.length) fails.push(`${w}: the untick still posts money`);
      if (s.guard !== "1 3 2280 0.00 0.00") fails.push(`${w}: without money the guard is ${s.guard}`);
      if (!/no money|left out/.test(s.text)) fails.push(`${w}: without money the readout says ${s.text}`);
      if (!s.tick) fails.push(`${w}: the tick is not visible once unticked`);
      await f.locator('input[name="extend.money"]').click();
      await p.idle();
      s = await state();
      if (s.guard !== "1 3 2280 2.70 0.70" || s.money.join() !== "yes") fails.push(`${w}: ticked again, the guard is ${s.guard}, money ${s.money}`);
      if (w === "phone") {
        const bad = await p.page.evaluate(() => {
          const out = [];
          const sw = document.scrollingElement.scrollWidth;
          if (sw > innerWidth) out.push("the page scrolls sideways by " + (sw - innerWidth) + " px");
          for (const el of document.querySelectorAll("#drawer .r21 :is(button, select, input:not([type=hidden]), .seg, .tk)")) {
            if (el.matches(".seg input, .tk input")) continue;
            const r = el.getBoundingClientRect();
            if (r.width && r.height < 44) out.push((el.className || el.tagName) + " is " + Math.round(r.height) + " px high");
          }
          return out;
        });
        fails.push(...bad.map((b) => "phone: " + b));
      }
      if (p.errors.length) fails.push(`${w}: ${p.errors.join("; ")}`);
    } finally {
      await p.ctx.close();
    }
  }
  console.log(c.slug, fails.length ? "FAIL\n  " + fails.join("\n  ") : "ok");
  return fails.length;
}

(async () => {
  const browser = await chromium.launch();
  const args = process.argv.slice(2);
  let bad = 0;
  try {
    if (args[0] === "check") {
      for (const c of (args.length < 2 ? CANDIDATES : ALL).filter((c) => args.length < 2 || args.includes(c.slug))) bad += await check(browser, c);
    } else {
      for (const c of [null, ...(args.length ? ALL : CANDIDATES)].filter((c) => !args.length || args.includes(c ? c.slug : "before"))) await shoot(browser, c);
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
})();
