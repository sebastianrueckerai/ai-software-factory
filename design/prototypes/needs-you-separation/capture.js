// capture.js takes the board page of the console lab's busy scenario (the
// code repository's scripts/console-lab, run at 1d5d4163) and writes it as
// index.html beside it: the scripts and the CSRF values dropped, the chat's
// attachment inlined, the stylesheet pointed at the copy console.css, and the
// Needs-you column emptied for cases.js to fill. Run it against a running
// lab with BASE, CONSOLE_LAB_DIR and NODE_PATH as run.sh sets them.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = process.env.BASE || "http://127.0.0.1:8090";
const labDir = process.env.CONSOLE_LAB_DIR;
if (!labDir) throw new Error("set CONSOLE_LAB_DIR to the lab's directory, the one that holds cookie.txt");
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);

(async () => {
  const seed = await fetch(base + "/lab/scenario/busy");
  if (seed.status !== 204) throw new Error("seed: " + seed.status);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img[src^='/']")) {
      const blob = await (await fetch(img.src)).blob();
      img.src = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
    }
    document.querySelectorAll("script").forEach((s) => s.remove());
    document.querySelectorAll("input[name=csrf]").forEach((i) => i.remove());
    document.body.removeAttribute("hx-headers");
    document.querySelector("link[rel=stylesheet]").setAttribute("href", "console.css");
    const head = document.head;
    head.insertAdjacentHTML("beforeend", '\n<link rel="stylesheet" href="face.css">\n<script src="cases.js"></script>\n');
    document.querySelector("#needs-you .cards").innerHTML = "";
  });
  const html = "<!doctype html>\n" + (await page.evaluate(() => document.documentElement.outerHTML)) + "\n";
  fs.writeFileSync(path.join(__dirname, "index.html"), html);
  await browser.close();
  console.log("index.html", html.length);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
