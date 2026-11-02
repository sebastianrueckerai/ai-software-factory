// long.js shoots the Tokens section after a token named with a long,
// hyphenated name is made, at 960 px and 390 px in both themes, into $OUT:
// the name cuts at the desk and wraps on the phone. Run it against a
// running lab, as shoot.js.
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const base = process.env.BASE, labDir = process.env.CONSOLE_LAB_DIR, out = process.env.OUT;
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
(async () => {
  const b = await chromium.launch();
  fs.mkdirSync(out, { recursive: true });
  for (const theme of ["dark", "light"]) {
    await fetch(base + "/lab/scenario/tokens");
    const ctx = await b.newContext({ viewport: { width: 960, height: 900 } });
    await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const p = await ctx.newPage();
    await p.goto(base + "/notifications", { waitUntil: "load" });
    await p.locator("details:has(#token-name) > summary").click();
    await p.locator("#token-name").fill("claude-on-the-build-box-in-the-basement-under-the-stairs-nightly");
    await p.locator("#token-forgejo").fill("lab");
    await Promise.all([p.waitForNavigation(), p.getByRole("button", { name: "Make chat token" }).click()]);
    await p.waitForTimeout(400);
    for (const w of [960, 390]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.waitForTimeout(300);
      await p.locator('section[aria-labelledby="tokens"]').screenshot({ path: path.join(out, theme + "-long-name-" + w + ".png") });
    }
    await ctx.close();
  }
  await b.close();
  console.log("long-name shots in " + out);
})().catch((e) => { console.error(e); process.exit(1); });
