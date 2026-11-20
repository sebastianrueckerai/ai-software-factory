// candidates.js: the round's four candidates as markup the shoot puts into
// the console lab's fire scenario. The day cap of 20.00 EUR is hit at 19.62
// EUR (the gateway refused a call: spend stops below the cap), the month
// stands at 97.30 of 120.00 EUR. 14:02 UTC, 9 h 58 min before the day turns.
// Each candidate draws three states: rest (the cap hit), confirm (after the
// first press) and after (the press took effect).

const month = `<div class="sp-g warn"><span class="lbl">this month</span><span class="fig">97.30 of 120.00 EUR</span><span class="gauge"><meter min="0" max="100" value="81">81 percent</meter></span></div>`;
const dayHit = `<div class="sp-g over"><span class="lbl">today</span><span class="fig">19.62 of 20.00 EUR day cap</span><span class="gauge"><meter min="0" max="100" value="98">98 percent</meter></span></div>`;
const hitNote = `<p class="sp-note">the day cap is hit: sessions wait until 00:00 UTC</p>`;
const dayCell = `<span class="cell spend over" title="spend this UTC day against the day cap (budget.day_eur); it refuses calls until 00:00 UTC"><span><span class="of">today</span> <b class="n">19.62 EUR</b> <span class="of">/ 20.00 EUR</span></span><span class="gauge"><meter min="0" max="100" value="98">98 percent</meter></span><span class="pct">98%</span></span>`;
const spend = (body) => `<h3>Spend</h3>${body}`;

const COMMON = `
.rst { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin: -2px 0 10px; }
.rst p { flex-basis: 100%; margin: 0; color: var(--text); font-size: 12.5px; line-height: 1.5; }
.rst p b { font-weight: 600; }
.rst .q { color: var(--text-faint); font: 11.5px var(--font-mono); }
.rst button.go { color: var(--st-failed); border-color: color-mix(in srgb, var(--st-failed) 70%, transparent); }
.rst.confirm { padding: 10px 12px; border: 1px solid var(--line-strong); background: var(--bg-raised); }
.rst.confirm button.yes { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.trace { margin: -4px 0 10px; color: var(--text-faint); font: 11.5px/1.5 var(--font-mono); }
.trace a, .trace button { font: inherit; }
.trace.strong { color: var(--text-muted); }
.rst button.soft { color: var(--need-text); border-color: color-mix(in srgb, var(--need) 70%, transparent); height: 24px; font-size: 12px; }
.sp-g.lifted .gauge { --fill: var(--text-faint); }
.sp-g.lifted .gauge meter { opacity: .55; }
.amt { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; flex-basis: 100%; }
.amt input { width: 7rem; height: 28px; padding: 0 8px; border: 1px solid var(--btn-line); border-radius: 3px; background: transparent; font: 13px var(--font-mono); }
.amt .chip { height: 24px; cursor: pointer; }
.amt .chip.on { border-color: var(--accent); color: var(--text); }
.cell.rst-cell { padding: 0 10px; display: inline-flex; align-items: center; }
.cell.rst-cell button { height: 24px; padding: 0 10px; color: var(--st-failed); border-color: color-mix(in srgb, var(--st-failed) 70%, transparent); font-size: 12px; }
.cell.rst-done { color: var(--text-faint); font: 12px var(--font-mono); }
.pop { position: absolute; z-index: 30; width: 420px; padding: 12px 14px; border: 1px solid var(--line-strong); background: var(--bg-raised); box-shadow: 0 12px 32px rgba(0,0,0,.35); }
.pop p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.5; }
.pop .acts { display: flex; gap: 8px; }
.pop button.yes { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
@media (max-width: 600px) {
  .rst button, .pop button, .amt .chip, .amt input, .cell.rst-cell button { min-height: 44px; }
  .pop { width: calc(100vw - 24px); left: 12px !important; }
}
`;

const CANDIDATES = [
  {
    slug: "a-start-over",
    name: "A. Start today over (the count restarts, in the panel)",
    states: {
      rest: { spend: spend(dayHit + `<div class="rst"><button type="button" class="go">Start today over</button><span class="q">the day cap stays 20.00 EUR</span></div>` + month + hitNote) },
      confirm: { spend: spend(dayHit + `<div class="rst confirm" role="group" aria-label="Start today over"><p>Today's count starts again from <b>0.00 EUR</b>. Up to <b>20.00 EUR</b> more may be spent before 00:00 UTC, in 9 h 58 min. The day cap stays 20.00 EUR; the month cap still holds.</p><button type="button" class="yes">Start over</button><button type="button">Cancel</button></div>` + month + hitNote) },
      after: { cells: `<span class="cell rst-done" title="sebastian started today over at 14:02 UTC; 19.62 EUR before">↺ today from 14:02</span>`, spend: spend(`<div class="sp-g"><span class="lbl">today</span><span class="fig">0.00 of 20.00 EUR day cap</span><span class="gauge"><meter min="0" max="100" value="0">0 percent</meter></span></div><p class="trace">counted from 14:02 UTC: sebastian started today over · 19.62 EUR before · 19.62 EUR today in all</p>` + month) },
    },
  },
  {
    slug: "b-lift",
    name: "B. Lift the day cap until 00:00 UTC (in the panel)",
    states: {
      rest: { spend: spend(dayHit + `<div class="rst"><button type="button" class="go">Lift until 00:00 UTC</button><span class="q">the month cap still holds</span></div>` + month + hitNote) },
      confirm: { spend: spend(dayHit + `<div class="rst confirm" role="group" aria-label="Lift the day cap until 00:00 UTC"><p>The day cap stops no session until 00:00 UTC, in 9 h 58 min. The month cap still holds: <b>22.70 EUR</b> are left this month. The day cap of 20.00 EUR returns at 00:00 UTC.</p><button type="button" class="yes">Lift until 00:00 UTC</button><button type="button">Cancel</button></div>` + month + hitNote) },
      after: { cells: `<span class="cell rst-done" title="sebastian lifted the day cap at 14:02 UTC until 00:00 UTC">day cap lifted until 00:00</span>`, spend: spend(`<div class="sp-g lifted"><span class="lbl">today</span><span class="fig">19.62 EUR · day cap lifted</span><span class="gauge"><meter min="0" max="100" value="98">98 percent</meter></span></div><p class="trace">lifted at 14:02 UTC by sebastian until 00:00 UTC · <button type="button">Restore the day cap</button></p>` + month) },
    },
  },
  {
    slug: "c-allow-more",
    name: "C. Allow an amount more today (in the panel)",
    states: {
      rest: { spend: spend(dayHit + `<div class="rst"><button type="button" class="go">Allow more today</button><span class="q">the day cap stays 20.00 EUR</span></div>` + month + hitNote) },
      confirm: { spend: spend(dayHit + `<div class="rst confirm" role="group" aria-label="Allow more today"><div class="amt"><label for="amt">EUR more today</label><input id="amt" type="number" step="0.01" value="20.00"><button type="button" class="chip">5</button><button type="button" class="chip">10</button><button type="button" class="chip on">20 · one day cap</button></div><p>Up to <b>20.00 EUR</b> more may be spent before 00:00 UTC, in 9 h 58 min. The day cap stays 20.00 EUR; the month cap still holds.</p><button type="button" class="yes">Allow 20.00 EUR</button><button type="button">Cancel</button></div>` + month + hitNote) },
      after: { cells: `<span class="cell rst-done" title="sebastian allowed 20.00 EUR more at 14:02 UTC until 00:00 UTC">+20.00 EUR today</span>`, spend: spend(`<div class="sp-g"><span class="lbl">today</span><span class="fig">19.62 of 40.00 EUR · 20.00 cap + 20.00 allowed</span><span class="gauge"><meter min="0" max="100" value="49">49 percent</meter></span></div><p class="trace">20.00 EUR allowed at 14:02 UTC by sebastian, until 00:00 UTC</p>` + month) },
    },
  },
  {
    slug: "d-at-the-strip",
    name: "D. Start today over, pressed on the strip's red cell",
    strip: true,
    states: {
      rest: { cells: dayCell + `<span class="cell rst-cell"><button type="button">Start today over</button></span>` },
      confirm: {
        cells: dayCell + `<span class="cell rst-cell"><button type="button" aria-expanded="true">Start today over</button></span>`,
        pop: `<div class="pop" role="dialog" aria-label="Start today over"><p>Today's count starts again from <b>0.00 EUR</b>. Up to <b>20.00 EUR</b> more may be spent before 00:00 UTC, in 9 h 58 min. The day cap stays 20.00 EUR; the month cap still holds.</p><div class="acts"><button type="button" class="yes">Start over</button><button type="button">Cancel</button></div></div>`,
      },
      after: { cells: `<span class="cell rst-done" title="sebastian started today over at 14:02 UTC; 19.62 EUR before">↺ today from 14:02</span>` },
    },
  },
];


// the fix loop: A and D carried forward
const monthAmber = `<div class="sp-g warn"><span class="lbl">this month</span><span class="fig">97.30 of 120.00 EUR</span><span class="gauge"><meter min="0" max="100" value="81">81 percent</meter></span></div><div class="rst"><button type="button" class="soft">Start the month over</button></div>`;
const confirmA = `<div class="rst confirm" role="group" aria-label="Start today over"><p>Today's count starts again from <b>0.00 EUR</b>. Up to <b>20.00 EUR</b> more may be spent before 00:00 UTC, in 9 h 58 min. The day cap stays 20.00 EUR; the month cap still holds.</p><button type="button" class="yes">Start over: up to 20.00 EUR more</button><button type="button">Cancel</button></div>`;
const traceA = `<p class="trace strong">counted since 14:02 UTC, when sebastian started today over · 19.62 EUR before · 19.62 EUR in all today</p>`;
const traceCell = `<span class="cell rst-done" title="sebastian started today over at 14:02 UTC; 19.62 EUR before">↺ today from 14:02</span>`;
CANDIDATES.push(
  {
    slug: "a2-start-over",
    name: "A2. Start today over, fixed: the confirm names the money, the month row offers its own",
    states: {
      rest: { spend: spend(dayHit + `<div class="rst"><button type="button" class="go">Start today over</button><span class="q">the day cap stays 20.00 EUR</span></div>` + monthAmber + hitNote) },
      confirm: { spend: spend(dayHit + confirmA + monthAmber + hitNote) },
      after: { cells: traceCell, spend: spend(`<div class="sp-g"><span class="lbl">today</span><span class="fig">0.00 of 20.00 EUR day cap</span><span class="gauge"><meter min="0" max="100" value="0">0 percent</meter></span></div>` + traceA + monthAmber) },
    },
  },
  {
    slug: "d2-at-the-strip",
    name: "D2. Start today over on the strip, fixed: the box opens below the strip",
    strip: true,
    below: true,
    states: {
      rest: { cells: dayCell + `<span class="cell rst-cell"><button type="button">Start today over</button></span>` },
      confirm: {
        cells: dayCell + `<span class="cell rst-cell"><button type="button" aria-expanded="true">Start today over</button></span>`,
        pop: `<div class="pop" role="dialog" aria-label="Start today over"><p>Today's count starts again from <b>0.00 EUR</b>. Up to <b>20.00 EUR</b> more may be spent before 00:00 UTC, in 9 h 58 min. The day cap stays 20.00 EUR; the month cap still holds.</p><div class="acts"><button type="button" class="yes">Start over: up to 20.00 EUR more</button><button type="button">Cancel</button></div></div>`,
      },
      after: { cells: traceCell },
    },
  },
);

// the reference of the recommendation: A2, with a press only on a hit row
CANDIDATES.push({
  slug: "a3-reference",
  name: "A3. The recommendation: A2, the press only on a hit row",
  states: {
    rest: { spend: spend(dayHit + `<div class="rst"><button type="button" class="go">Start today over</button><span class="q">the day cap stays 20.00 EUR</span></div>` + month + hitNote) },
    confirm: { spend: spend(dayHit + confirmA + month + hitNote) },
    after: { cells: traceCell, spend: spend(`<div class="sp-g"><span class="lbl">today</span><span class="fig">0.00 of 20.00 EUR day cap</span><span class="gauge"><meter min="0" max="100" value="0">0 percent</meter></span></div>` + traceA + month) },
  },
});

module.exports = { COMMON, CANDIDATES, dayCell };
