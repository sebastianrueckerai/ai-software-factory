// live.js renders every candidate of candidates.js as a live top bar on the
// round page: a click switches that bar's theme and runs the candidate's
// motion. The bars carry the console's tokens, so a symbol looks as it
// does in the console. "Both themes" sets every bar at once.
(function () {
  const tokens = `
.bar { --bg: #070b12; --bg-hover: #15212f; --line: #1a2636; --line-strong: #263649; --btn-line: #4a5f7a; --text: #dfe7f1; --text-muted: #93a1b5; --text-faint: #7c8ba0; --focus: #7fdcff;
  display: flex; align-items: center; gap: 14px; height: 44px; padding: 0 14px; background: var(--bg); color: var(--text-muted); border: 1px solid var(--line); font: 13px/1.45 -apple-system, "Segoe UI", "Noto Sans", system-ui, sans-serif; }
.bar[data-theme=light] { --bg: #f1ece0; --bg-hover: #f1ebdd; --line: #ddd7c9; --line-strong: #aeb5c1; --btn-line: #858e9d; --text: #0f1d33; --text-muted: #46536a; --text-faint: #5b6678; --focus: #0a6a80; }
.bar .home { color: var(--text); font-weight: 600; font-size: 14px; }
.bar nav { flex: 1; display: flex; gap: 18px; }
.bar button { display: inline-flex; align-items: center; justify-content: center; margin: 0; border: 1px solid transparent; border-radius: 3px; background: transparent; color: var(--text-muted); cursor: pointer; font: inherit; transition: background-color .12s, border-color .12s, color .12s; }
.bar button:hover { background: var(--bg-hover); border-color: var(--btn-line); color: var(--text); }
.bar button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.bar .text { height: 24px; padding: 0 8px; }
.bars { display: grid; grid-template-columns: repeat(auto-fill, minmax(560px, 1fr)); gap: 10px 16px; }
.bars figure { margin: 0; width: auto; }
.bars figcaption { margin-top: 4px; }`;
  const style = document.createElement("style");
  style.textContent = tokens + COMMON + CANDIDATES.map((c) => c.css).join("\n");
  document.head.append(style);

  const box = document.getElementById("live");
  const rows = [{ slug: "before", name: "Before", idea: "The text as the console has it." }, ...CANDIDATES];
  box.innerHTML = rows.map((c, i) => {
    const btn = c.slug === "before"
      ? `<button type="button" class="text" data-text>Theme: dark</button>`
      : `<button type="button" class="tt tt-${c.slug}" aria-label="Switch to the light theme" title="Dark theme is the default; your choice is remembered">${c.svg.replaceAll("{id}", "tt-" + c.slug + "-" + i)}</button>`;
    return `<figure><div class="bar" data-theme="dark"><span class="home">Factory console</span><nav><span>Board</span><span>Costs</span><span>Policy</span><span>Alerts</span></nav>${btn}<span>sebastian</span><button type="button" class="text">Log out</button></div>
<figcaption><b>${String(i).padStart(2, "0")} ${c.name}</b> (${c.slug}). ${c.idea}</figcaption></figure>`;
  }).join("");

  function set(bar, theme) {
    bar.dataset.theme = theme;
    const b = bar.querySelector("[data-text]");
    if (b) b.textContent = "Theme: " + theme;
    const t = bar.querySelector(".tt");
    if (t) t.setAttribute("aria-label", "Switch to the " + (theme === "dark" ? "light" : "dark") + " theme");
  }
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".tt, [data-text]");
    if (!b) return;
    const bar = b.closest(".bar");
    set(bar, bar.dataset.theme === "dark" ? "light" : "dark");
  });
  document.getElementById("all").addEventListener("click", () => {
    const next = box.querySelector(".bar").dataset.theme === "dark" ? "light" : "dark";
    box.querySelectorAll(".bar").forEach((bar) => set(bar, next));
  });
})();
