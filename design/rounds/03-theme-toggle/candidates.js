// The round's candidates for the top bar's theme toggle: each an inline
// SVG in currentColor and its CSS. The symbol shows the theme in force,
// as a switch shows its position; the button's label names the action.
// Every motion is a CSS transition keyed on [data-theme=light], so the
// same markup runs in the console (data-theme on <html>) and on the sheet
// page (data-theme on each strip). "{id}" in a symbol is replaced by a
// unique id per instance. shoot.js and index.html both load this file.
const COMMON = `
.tt { display: inline-grid; place-items: center; width: 30px; height: 24px; padding: 0; }
.tt svg { display: block; width: 18px; height: 18px; overflow: visible; }
:where(.tt svg [class]) { transform-box: view-box; transform-origin: 12px 12px; transition: transform .55s cubic-bezier(.4, 0, .2, 1), opacity .3s ease, fill .3s, stroke .3s, stroke-dasharray .45s ease; }
@media (max-width: 899px) { .tt { width: 44px; height: 44px; } }
@media (prefers-reduced-motion: reduce) { .tt svg [class] { transition: none; } }
`;

const RAYS8 = (r1, r2) => {
  let d = "";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, s = Math.sin(a), c = Math.cos(a);
    const f = (n) => +n.toFixed(2);
    d += `M${f(12 + r1 * s)} ${f(12 - r1 * c)}L${f(12 + r2 * s)} ${f(12 - r2 * c)}`;
  }
  return d;
};

const SVG = (body, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

const CANDIDATES = [
  {
    slug: "swap", name: "Sun and moon",
    idea: "The common pattern (GitHub docs, Tailwind, shadcn): a moon in the dark theme, a sun in the light one; the one turns away as the other turns in.",
    svg: SVG(`<g class="sun"><circle cx="12" cy="12" r="4"/><path d="${RAYS8(7, 9.5)}"/></g><path class="moon" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`),
    css: `
.tt-swap .sun { opacity: 0; transform: rotate(-90deg) scale(.4); }
[data-theme=light] .tt-swap .sun { opacity: 1; transform: none; }
[data-theme=light] .tt-swap .moon { opacity: 0; transform: rotate(90deg) scale(.4); }`,
  },
  {
    slug: "morph", name: "Morph",
    idea: "One filled body: a crescent at night; in daylight the shadow slides off, the body shrinks to a sun and its rays turn out (toggles.dev classic, Josh Comeau).",
    svg: SVG(`<mask id="{id}"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><circle class="cut" cx="17.5" cy="6.5" r="7" fill="#000"/></mask><circle class="body" cx="12" cy="12" r="8.5" fill="currentColor" stroke="none" mask="url(#{id})"/><path class="rays" d="${RAYS8(7.5, 9.75)}" stroke-width="1.75"/>`),
    css: `
.tt-morph .rays { opacity: 0; transform: rotate(-45deg) scale(.6); }
[data-theme=light] .tt-morph .cut { transform: translate(9px, -9px); }
[data-theme=light] .tt-morph .body { transform: scale(.56); }
[data-theme=light] .tt-morph .rays { opacity: 1; transform: none; }`,
  },
  {
    slug: "half", name: "Half disc",
    idea: "The contrast glyph ◐ (Material contrast, toggles.dev dark side): a ring half filled; the fill turns over to the other side.",
    svg: SVG(`<circle cx="12" cy="12" r="8.25"/><path class="half" d="M12 3.75a8.25 8.25 0 0 0 0 16.5Z" fill="currentColor" stroke="none"/>`),
    css: `
[data-theme=light] .tt-half .half { transform: rotate(180deg); }`,
  },
  {
    slug: "eclipse", name: "Eclipse",
    idea: "Night as the sun covered: a dark disc slides over the sun and leaves its rays as a corona; in daylight it slides off.",
    svg: SVG(`<clipPath id="{id}"><circle cx="12" cy="12" r="6.25"/></clipPath><circle cx="12" cy="12" r="4.75"/><path class="rays" d="${RAYS8(7.5, 9.75)}"/><g clip-path="url(#{id})"><circle class="disc" cx="12" cy="12" r="4.75" fill="var(--bg)"/></g>`),
    css: `
.tt-eclipse .disc { transform: translate(-1.5px, -1.5px); }
.tt-eclipse:hover .disc { fill: var(--bg-hover); }
[data-theme=light] .tt-eclipse .disc { transform: translate(-12px, -12px); }`,
  },
  {
    slug: "horizon", name: "Horizon",
    idea: "A line of horizon: at night the moon stands over it; on a switch the moon sinks and the sun rises (toggles.dev horizon).",
    svg: SVG(`<clipPath id="{id}"><rect x="-2" y="-6" width="28" height="22.6"/></clipPath><path d="M2.5 18.5h19"/><g clip-path="url(#{id})"><g class="sun"><circle cx="12" cy="11" r="3.75"/><path d="M12 3.6v1.6M6.2 6.6l1.1 1.1M17.8 6.6l-1.1 1.1M4.4 11.6h1.6M18 11.6h1.6"/></g><path class="moon" d="M12 4.5a3.7 3.7 0 0 0 5.5 5.5 5.5 5.5 0 1 1-5.5-5.5Z"/></g>`),
    css: `
.tt-horizon .sun { transform: translateY(14px); }
[data-theme=light] .tt-horizon .sun { transform: none; }
[data-theme=light] .tt-horizon .moon { transform: translateY(14px); }`,
  },
  {
    slug: "aperture", name: "Day and night disc",
    idea: "A watch's day and night indicator: a half-round window over a disc that carries the sun on one side and the moon on the other; the disc turns half a turn.",
    svg: SVG(`<clipPath id="{id}"><path d="M2 17a10 10 0 0 1 20 0Z"/></clipPath><g clip-path="url(#{id})"><g class="disc"><circle cx="12" cy="11.6" r="2.6" fill="currentColor" stroke="none"/><path d="M6.4 11.6h1.5M16.1 11.6h1.5M8 7.6l1 1M16 7.6l-1 1" stroke-width="1.2"/><path d="M11.5 18.4a2.6 2.6 0 0 0 3.9 3.9 3.9 3.9 0 1 1-3.9-3.9Z" fill="currentColor" stroke="none"/><circle cx="7.4" cy="20.4" r=".75" fill="currentColor" stroke="none"/></g></g><path d="M2 17a10 10 0 0 1 20 0Z" stroke-width="1.3"/>`),
    css: `
.tt-aperture svg { width: 28px; height: 28px; margin-top: -3px; }
.tt-aperture .disc { transform-origin: 12px 17px; transform: rotate(180deg); }
[data-theme=light] .tt-aperture .disc { transform: rotate(360deg); }`,
  },
  {
    slug: "knob", name: "Dimmer knob",
    idea: "A cockpit's panel-light dimmer: a knob on a scale; the pointer sits at the low end in the dark theme and turns through the top to the high end.",
    svg: SVG(`<circle cx="12" cy="12" r="5.75"/><path class="ptr" d="M12 12V8.25" stroke-width="1.75"/><path d="M4.64 16.25L3.34 17M4.64 7.75L3.34 7M12 3.5V2M19.36 7.75L20.66 7M19.36 16.25L20.66 17" stroke-width="1.4"/>`),
    css: `
.tt-knob .ptr { transform: rotate(-120deg); }
[data-theme=light] .tt-knob .ptr { transform: rotate(120deg); }`,
  },
  {
    slug: "dimmer", name: "Dimmed sun",
    idea: "Brightness rather than day and night (Lucide sun-dim): the dark theme is the sun dimmed, its rays shrunk to points; in the light theme the rays run out to full length.",
    svg: SVG(`<circle cx="12" cy="12" r="4"/>${Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4, s = Math.sin(a), c = Math.cos(a), f = (n) => +n.toFixed(2);
      return `<path class="ray" pathLength="1" d="M${f(12 + 7 * s)} ${f(12 - 7 * c)}L${f(12 + 9.75 * s)} ${f(12 - 9.75 * c)}"/>`;
    }).join("")}`),
    css: `
.tt-dimmer .ray { stroke-dasharray: 0 1; stroke-width: 1.9; }
[data-theme=light] .tt-dimmer .ray { stroke-dasharray: 1 1; stroke-width: 1.5; }`,
  },
  {
    slug: "panel", name: "Panel",
    idea: "The console's own mark: a square in the four corner marks every panel wears, half filled on the diagonal; the fill turns over.",
    svg: SVG(`<path d="M3 7.5V3h4.5M16.5 3H21v4.5M21 16.5V21h-4.5M7.5 21H3v-4.5" stroke-linecap="square" stroke-linejoin="miter"/><rect x="7" y="7" width="10" height="10"/><path class="tri" d="M7 7v10h10Z" fill="currentColor" stroke="none"/>`),
    css: `
[data-theme=light] .tt-panel .tri { transform: rotate(180deg); }`,
  },
  {
    slug: "selector", name: "Selector",
    idea: "A two-position selector like an instrument's mode switch (Vercel Geist, Nuxt UI, without system): the moon and the sun side by side, a pressed key under the one in force slides across.",
    w: 46,
    svg: `<svg viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x=".7" y=".7" width="38.6" height="18.6" rx="2"/><rect class="lit" x="2.75" y="2.75" width="16.5" height="14.5" rx="1" fill="var(--line-strong)" stroke="none"/><path class="g-moon" d="M10.5 5.25a3.17 3.17 0 0 0 4.75 4.75 4.75 4.75 0 1 1-4.75-4.75Z"/><g class="g-sun"><circle cx="29.75" cy="10" r="2.5"/><path d="M29.75 4.6v1.2M29.75 14.2v1.2M24.35 10h1.2M33.95 10h1.2M25.93 6.18l.85.85M32.72 12.97l.85.85M25.93 13.82l.85-.85M32.72 7.03l.85-.85"/></g></svg>`,
    css: `
.tt-selector { width: 46px; }
.tt-selector svg { width: 40px; height: 20px; }
.tt-selector .g-moon { stroke: var(--text); }
[data-theme=light] .tt-selector .lit { transform: translateX(19px); fill: var(--line); }
[data-theme=light] .tt-selector .g-moon { stroke: currentColor; }
[data-theme=light] .tt-selector .g-sun { stroke: var(--text); }`,
  },
  {
    slug: "iec", name: "IEC sun",
    idea: "The IEC 60417-5435 symbol for brightness and contrast, as on a monitor's own menu: a sun whose body is half filled; the fill turns over.",
    svg: SVG(`<circle cx="12" cy="12" r="4.5"/><path class="half" d="M12 7.5a4.5 4.5 0 0 0 0 9Z" fill="currentColor" stroke="none"/><path d="${RAYS8(7.25, 9.75)}"/>`),
    css: `
[data-theme=light] .tt-iec .half { transform: rotate(180deg); }`,
  },
  {
    slug: "hatch", name: "Hatched disc",
    idea: "The contrast disc as an engineering drawing (shadcn, Phosphor circle-half-tilt): one half hatched in thin lines, the hatch turns over.",
    svg: SVG(`<clipPath id="{id}"><path d="M12 3.75a8.25 8.25 0 0 0 0 16.5Z"/></clipPath><g class="half"><g clip-path="url(#{id})"><path d="${Array.from({ length: 9 }, (_, k) => { const c = 4 + 4.2 * k; return `M${(c - 24).toFixed(1)} 24L${c.toFixed(1)} 0`; }).join("")}" stroke-width="1.1"/></g><path d="M12 3.75v16.5"/></g><circle cx="12" cy="12" r="8.25"/>`),
    css: `
[data-theme=light] .tt-hatch .half { transform: rotate(180deg); }`,
  },
  {
    slug: "eclipse-2", name: "Eclipse, second",
    idea: "The fix loop's eclipse: a filled sun, the moon's shadow cut out of it, so the dark theme shows a crescent inside the corona (the reading of Material's brightness_4, long the dark-theme icon); in daylight the shadow slides off.",
    svg: SVG(`<mask id="{id}"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><circle class="shadow" cx="12" cy="12" r="5" fill="#000"/></mask><circle cx="12" cy="12" r="4.75" fill="currentColor" stroke="none" mask="url(#{id})"/><path class="rays" d="${RAYS8(7.5, 9.75)}"/>`),
    css: `
.tt-eclipse-2 .shadow { transform: translate(-2.5px, -2.5px); }
.tt-eclipse-2 .rays { transform: scale(.9); }
[data-theme=light] .tt-eclipse-2 .shadow { transform: translate(-11px, -11px); }
[data-theme=light] .tt-eclipse-2 .rays { transform: none; }`,
  },
  {
    slug: "selector-2", name: "Selector, second",
    idea: "The fix loop's selector: the frame and the pressed key in the panel border colour, the glyph in force in the text colour, the other muted; each half its own target.",
    w: 46,
    svg: `<svg viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect class="frame" x=".7" y=".7" width="38.6" height="18.6" rx="2"/><rect class="lit" x="2.75" y="2.75" width="16.5" height="14.5" rx="1" stroke="none"/><path class="g-moon" d="M10.5 5.25a3.17 3.17 0 0 0 4.75 4.75 4.75 4.75 0 1 1-4.75-4.75Z"/><g class="g-sun"><circle cx="29.75" cy="10" r="2.5"/><path d="M29.75 4.6v1.2M29.75 14.2v1.2M24.35 10h1.2M33.95 10h1.2M25.93 6.18l.85.85M32.72 12.97l.85.85M25.93 13.82l.85-.85M32.72 7.03l.85-.85"/></g></svg>`,
    css: `
.tt-selector-2 { width: 46px; }
.tt-selector-2 svg { width: 40px; height: 20px; }
.tt-selector-2 .frame { stroke: var(--line-strong); }
.tt-selector-2 .lit { fill: var(--line-strong); }
.tt-selector-2 .g-moon { stroke: var(--text); }
[data-theme=light] .tt-selector-2 .lit { transform: translateX(19px); }
[data-theme=light] .tt-selector-2 .g-moon { stroke: currentColor; }
[data-theme=light] .tt-selector-2 .g-sun { stroke: var(--text); }`,
  },
  {
    slug: "selector-3", name: "Selector, third",
    idea: "The pick of the compare loop with its key fixed: the pressed key of selector-2 measured 1.6:1 on the page, under the console's 3:1 for a fill that carries a state, so the key is a 1 px outline in the muted text colour (7.5:1 dark, 6.6:1 light); it slides in 280 ms.",
    w: 46,
    svg: `<svg viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect class="frame" x=".7" y=".7" width="38.6" height="18.6" rx="2"/><rect class="key" x="3" y="3" width="16" height="14" rx="1" stroke-width="1.1"/><path class="g-moon" d="M10.5 5.25a3.17 3.17 0 0 0 4.75 4.75 4.75 4.75 0 1 1-4.75-4.75Z"/><g class="g-sun"><circle cx="29.75" cy="10" r="2.5"/><path d="M29.75 4.6v1.2M29.75 14.2v1.2M24.35 10h1.2M33.95 10h1.2M25.93 6.18l.85.85M32.72 12.97l.85.85M25.93 13.82l.85-.85M32.72 7.03l.85-.85"/></g></svg>`,
    css: `
.tt-selector-3 { width: 46px; }
.tt-selector-3 svg { width: 40px; height: 20px; }
.tt-selector-3 .frame { stroke: var(--line-strong); }
.tt-selector-3 .key { transition-duration: .28s; transition-timing-function: cubic-bezier(.2, .8, .2, 1); }
.tt-selector-3 .g-moon { stroke: var(--text); }
[data-theme=light] .tt-selector-3 .key { transform: translateX(18px); }
[data-theme=light] .tt-selector-3 .g-moon { stroke: currentColor; }
[data-theme=light] .tt-selector-3 .g-sun { stroke: var(--text); }`,
  },
];

if (typeof module !== "undefined") module.exports = { COMMON, CANDIDATES };
