// The film's overlay effects on one paused GSAP timeline. Every effect works in the console frame's own pixels
// (1600 by 900), so a box from the recorder's sidecar places it. The stage is the element that holds the console
// video and the overlays drawn over it; camera moves transform the stage, captions stay outside it.
// Copied into each film composition, since a HyperFrames project reads files from its own directory only.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent, ns) => {
    const e = ns ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const pad = (b, p) => ({ x: b.x - p, y: b.y - p, width: b.width + 2 * p, height: b.height + 2 * p });

  // spotlight dims the frame except a rounded hole over box, inside the stage's own coordinates
  function spotlight(tl, stage, box, at, opts = {}) {
    let svg = stage.querySelector("svg.fx-spot");
    if (!svg) {
      svg = el("svg", { class: "fx-spot", viewBox: "0 0 1600 900", width: 1600, height: 900 }, stage, true);
      Object.assign(svg.style, { position: "absolute", left: 0, top: 0, pointerEvents: "none" });
      const mask = el("mask", { id: "fx-mask" }, el("defs", {}, svg, true), true);
      el("rect", { x: 0, y: 0, width: 1600, height: 900, fill: "white" }, mask, true);
      el("rect", { class: "fx-hole", x: 800, y: 450, width: 0, height: 0, rx: 10, fill: "black" }, mask, true);
      el("rect", { class: "fx-dim", x: 0, y: 0, width: 1600, height: 900, fill: "#03060b", mask: "url(#fx-mask)", opacity: 0 }, svg, true);
      el("rect", { class: "fx-edge", x: 800, y: 450, width: 0, height: 0, rx: 10, fill: "none", stroke: opts.color || "#4fcbe2", "stroke-width": 3, opacity: 0 }, svg, true);
    }
    const b = pad(box, opts.pad ?? 10), d = opts.dur ?? 0.6;
    const hole = svg.querySelector(".fx-hole"), edge = svg.querySelector(".fx-edge"), dim = svg.querySelector(".fx-dim");
    tl.to([hole, edge], { attr: { x: b.x, y: b.y, width: b.width, height: b.height }, duration: d, ease: "power2.inOut" }, at);
    tl.to(dim, { attr: { opacity: opts.dim ?? 0.74 }, duration: d }, at);
    tl.to(edge, { attr: { stroke: opts.color || "#4fcbe2" }, opacity: 1, duration: d }, at);
  }
  function unspot(tl, stage, at, dur = 0.5) {
    const svg = stage.querySelector("svg.fx-spot");
    if (!svg) return;
    tl.to(svg.querySelector(".fx-dim"), { attr: { opacity: 0 }, duration: dur }, at);
    tl.to(svg.querySelector(".fx-edge"), { opacity: 0, duration: dur }, at);
  }

  // ring draws a glowing frame around box for a moment: a button, a new card
  function ring(tl, stage, box, at, until, color = "#4fcbe2") {
    const b = pad(box, 6);
    const r = el("div", {}, stage);
    Object.assign(r.style, { position: "absolute", left: b.x + "px", top: b.y + "px", width: b.width + "px", height: b.height + "px",
      border: `3px solid ${color}`, borderRadius: "6px", boxShadow: `0 0 22px 4px ${color}66`, opacity: 0, pointerEvents: "none" });
    tl.to(r, { opacity: 1, duration: 0.25 }, at);
    tl.to(r, { opacity: 0, duration: 0.25 }, until);
    return r;
  }

  // camera moves the stage so box fills a share of the frame, centred on (cx, cy) of the 1600 by 900 output
  function camera(tl, stage, box, at, opts = {}) {
    const fill = opts.fill ?? 0.62, cx = opts.cx ?? 800, cy = opts.cy ?? 450;
    const s = opts.scale ?? Math.min(4, Math.min(1600 * fill / box.width, 900 * fill / box.height));
    const x = cx - (box.x + box.width / 2) * s, y = cy - (box.y + box.height / 2) * s;
    tl.to(stage, { scale: s, x, y, duration: opts.dur ?? 1.0, ease: opts.ease || "power2.inOut" }, at);
  }
  function home(tl, stage, at, dur = 0.9) {
    tl.to(stage, { scale: 1, x: 0, y: 0, duration: dur, ease: "power2.inOut" }, at);
  }

  // caption shows one line of text in the caption layer from at to until
  function caption(tl, layer, text, at, until, cls = "") {
    const s = el("span", { class: `fx-cap ${cls}` }, layer);
    s.textContent = text;
    gsap.set(s, { opacity: 0 });
    tl.to(s, { opacity: 1, duration: 0.3 }, at);
    tl.to(s, { opacity: 0, duration: 0.25 }, until - 0.25);
    return s;
  }

  // clock is the time-jump label: the old time slides away, the new one slides in
  function clock(tl, layer, from, to, at, dur = 1.6) {
    const box = el("div", { class: "fx-clock" }, layer);
    const a = el("span", {}, box), b = el("span", {}, box);
    a.textContent = from; b.textContent = to;
    gsap.set(box, { opacity: 0 }); gsap.set(b, { yPercent: 100, opacity: 0 });
    tl.to(box, { opacity: 1, duration: 0.25 }, at);
    tl.to(a, { yPercent: -100, opacity: 0, duration: 0.45, ease: "power2.in" }, at + 0.4);
    tl.to(b, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, at + 0.9);
    tl.to(box, { opacity: 0, duration: 0.3 }, at + dur);
    return box;
  }

  // bracket draws a callout in a band above the frame: a label, a sub line, a bracket over the box's span
  function bracket(tl, band, box, map, label, sub, at, until, color = "#4fcbe2") {
    const x0 = map.x + box.x * map.s, x1 = map.x + (box.x + box.width) * map.s;
    const g = el("div", { class: "fx-call" }, band);
    Object.assign(g.style, { position: "absolute", left: x0 + "px", top: "0px", width: Math.max(360, x1 - x0) + "px" });
    const h = el("div", { class: "fx-call-t" }, g); h.textContent = label;
    const p = el("div", { class: "fx-call-s" }, g); p.textContent = sub;
    const br = el("div", { class: "fx-br" }, band);
    Object.assign(br.style, { position: "absolute", left: x0 + "px", width: (x1 - x0) + "px", borderColor: color });
    gsap.set([g, br], { opacity: 0 }); gsap.set(br, { scaleX: 0, transformOrigin: "0 50%" });
    tl.to(g, { opacity: 1, duration: 0.35 }, at);
    tl.to(br, { opacity: 1, scaleX: 1, duration: 0.45, ease: "power2.out" }, at + 0.1);
    if (until !== undefined) tl.to([g, br], { opacity: 0.28, duration: 0.3 }, until);
    return { g, br };
  }

  window.fx = { spotlight, unspot, ring, camera, home, caption, clock, bracket };
})();
