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

  // camera moves the stage so box fills a share of the frame, centred on (cx, cy) of the 1600 by 900 output
  function camera(tl, stage, box, at, opts = {}) {
    const fill = opts.fill ?? 0.62, cx = opts.cx ?? 800, cy = opts.cy ?? 450;
    // never below 1: a zoom out would show the black past the console
    const s = opts.scale ?? Math.max(1, Math.min(4, 1600 * fill / box.width, 900 * fill / box.height));
    // the stage always covers the frame: the move stops at the console's edges rather than showing past them
    const x = Math.min(0, Math.max(1600 - 1600 * s, cx - (box.x + box.width / 2) * s));
    const y = Math.min(0, Math.max(900 - 900 * s, cy - (box.y + box.height / 2) * s));
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

  window.fx = { spotlight, unspot, camera, home, caption };
})();
