const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch();
  const out = {};
  const url = f => "file://" + process.cwd() + "/design/rounds/11-compact-reorg/cand/" + f;

  // ---- try A ----
  let p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(url("try-a-bundle.html"));
  await p.waitForTimeout(800);
  out.a_init = await p.evaluate(() => ({
    drawerHidden: document.getElementById("drawer").hidden,
    notFull: !document.getElementById("screen").classList.contains("chat-only"),
    tipBtn: !!document.querySelector("#chat-full[data-tip]"),
    cards: document.querySelectorAll(".card").length
  }));
  await p.click("#chat-full");
  out.a_full = await p.evaluate(() => ({
    full: document.getElementById("screen").classList.contains("chat-only"),
    pressed: document.getElementById("chat-full").getAttribute("aria-pressed"),
    edgeVisible: getComputedStyle(document.querySelector(".edge-tab")).display !== "none",
    edgePos: getComputedStyle(document.querySelector(".edge-tab")).position,
    edgeX: Math.round(document.querySelector(".edge-tab").getBoundingClientRect().x),
    colGlyph: getComputedStyle(document.querySelector("#chat-full .col")).display !== "none"
  }));
  await p.keyboard.press("Escape");
  out.a_esc = await p.evaluate(() => !document.getElementById("screen").classList.contains("chat-only"));
  // drag the divider from x=396 to x=520
  await p.mouse.move(396, 500);
  await p.mouse.down();
  await p.mouse.move(520, 500, { steps: 8 });
  await p.mouse.up();
  out.a_drag = await p.evaluate(() => document.getElementById("screen").style.getPropertyValue("--chat-share"));
  out.a_dragRect = await p.evaluate(() => Math.round(document.getElementById("chat").getBoundingClientRect().width));
  // open a card drawer
  await p.click('[data-card="t613"]');
  out.a_drawer = await p.evaluate(() => ({
    shown: !document.getElementById("drawer").hidden,
    ref: document.querySelector("#drawer .dr-ref").textContent,
    title: document.querySelector("#drawer .dr-title h2").textContent,
    closeClear: (() => {
      const c = document.querySelector("#drawer-close").getBoundingClientRect();
      const h = document.querySelector("#drawer .dr-title h2").getBoundingClientRect();
      return !(c.x < h.right && h.x < c.right && c.y < h.bottom && h.y < c.bottom);
    })()
  }));
  await p.click('[data-tab="overview"]');
  out.a_tabOverview = await p.evaluate(() => ({
    sel: document.querySelector('[data-tab="overview"]').getAttribute("aria-selected"),
    overviewShown: !document.querySelector('[data-pane="overview"]').hidden,
    chatHidden: document.querySelector('[data-pane="chat"]').hidden
  }));
  await p.click('[data-tab="chat"]');
  // type and send in the drawer
  await p.fill("#drawer-input", "try the drawer chat");
  await p.click("#drawer form button[type=submit]");
  out.a_drawerSend = await p.evaluate(() => {
    const msgs = document.querySelectorAll("#drawer .chat-log .msg");
    return msgs[msgs.length - 1].textContent.includes("try the drawer chat");
  });
  await p.keyboard.press("Escape");
  out.a_drawerEsc = await p.evaluate(() => document.getElementById("drawer").hidden);
  // main composer send
  await p.fill("#chat-form textarea", "try the main chat");
  await p.click('#chat-form button[type="submit"], #chat-form button');
  await p.waitForTimeout(200);
  out.a_send = await p.evaluate(() => {
    const msgs = document.querySelectorAll("#chat-log .msg");
    return msgs[msgs.length - 1].textContent.includes("try the main chat");
  });
  // tooltip on hover
  await p.hover("#chat-full");
  out.a_tip = await p.evaluate(() => getComputedStyle(document.querySelector("#chat-full"), "::after").content !== "none");
  // the input sizer: drag, reset, keys, auto-grow
  out.a_growInit = await p.evaluate(() => {
    const form = document.querySelector("#chat-form");
    const bar = form.querySelector(".growbar");
    return {
      bar: !!bar,
      firstChild: form.firstElementChild === bar,
      atTop: Math.abs(bar.getBoundingClientRect().top + bar.getBoundingClientRect().height / 2 - form.getBoundingClientRect().top) <= 1,
      taH: Math.round(form.querySelector("textarea").getBoundingClientRect().height)
    };
  });
  const bar = await p.evaluate(() => {
    const r = document.querySelector("#chat-form .growbar").getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await p.mouse.move(bar.x, bar.y);
  await p.mouse.down();
  await p.mouse.move(bar.x, bar.y - 120, { steps: 6 });
  await p.mouse.up();
  out.a_growDrag = await p.evaluate(() => Math.round(document.querySelector("#chat-form textarea").getBoundingClientRect().height));
  await p.dblclick("#chat-form .growbar");
  out.a_growReset = await p.evaluate(() => Math.round(document.querySelector("#chat-form textarea").getBoundingClientRect().height));
  await p.focus("#chat-form .growbar");
  await p.keyboard.press("ArrowUp");
  out.a_growKeys = await p.evaluate(() => Math.round(document.querySelector("#chat-form textarea").getBoundingClientRect().height));
  await p.fill("#chat-form textarea", "x".repeat(600));
  out.a_growAuto = await p.evaluate(() => Math.round(document.querySelector("#chat-form textarea").getBoundingClientRect().height));
  out.a_errs = errs;
  await p.close();

  // ---- try B ----
  p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errsB = [];
  p.on("pageerror", e => errsB.push(e.message));
  await p.goto(url("try-b-tabs.html"));
  await p.waitForTimeout(800);
  out.b_init = await p.evaluate(() => ({
    switcherHidden: getComputedStyle(document.getElementById("switcher")).display === "none",
    ctabs: document.querySelectorAll(".ctab").length
  }));
  await p.click(".ctab:nth-child(2)");
  out.b_threads = await p.evaluate(() => ({
    view: document.getElementById("chat").classList.contains("threads-view"),
    switcherShown: getComputedStyle(document.getElementById("switcher")).display !== "none",
    chatMainHidden: getComputedStyle(document.querySelector(".chat-main")).display === "none"
  }));
  await p.click(".ctab:nth-child(1)");
  out.b_back = await p.evaluate(() => !document.getElementById("chat").classList.contains("threads-view"));
  await p.click("#chat-full");
  out.b_full = await p.evaluate(() => ({
    full: document.getElementById("screen").classList.contains("chat-only"),
    edgeVisible: getComputedStyle(document.querySelector(".edge-tab")).display !== "none"
  }));
  await p.keyboard.press("Escape");
  out.b_esc = await p.evaluate(() => !document.getElementById("screen").classList.contains("chat-only"));
  // B shares the input sizer
  const bBar = await p.evaluate(() => {
    const r = document.querySelector("form.composer .growbar").getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await p.mouse.move(bBar.x, bBar.y);
  await p.mouse.down();
  await p.mouse.move(bBar.x, bBar.y - 80, { steps: 6 });
  await p.mouse.up();
  out.b_grow = await p.evaluate(() => Math.round(document.querySelector("form.composer textarea").getBoundingClientRect().height));
  out.b_errs = errsB;
  await p.close();

  await b.close();
  console.log(JSON.stringify(out, null, 1));
})();
