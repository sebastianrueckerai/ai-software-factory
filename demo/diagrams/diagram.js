// ArrowRight shows the next step's parts, ArrowLeft goes back; the step in force stands on <html data-at>.
const parts = [...document.querySelectorAll("[data-step]")];
const last = Math.max(0, ...parts.map((el) => Number(el.dataset.step)));

function show(at) {
  document.documentElement.dataset.at = at;
  for (const el of parts) el.classList.toggle("on", at >= Number(el.dataset.step) && at < Number(el.dataset.until ?? Infinity));
}

addEventListener("keydown", (e) => {
  const at = Number(document.documentElement.dataset.at);
  if (e.key === "ArrowRight") show(Math.min(at + 1, last));
  else if (e.key === "ArrowLeft") show(Math.max(at - 1, 0));
});
show(0);
