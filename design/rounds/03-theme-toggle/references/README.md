# Theme toggle references

Checked live on 2026-10-14 and 2026-10-15 with Playwright (Chromium, 1440 px wide). The contact sheet is [sheet.png](sheet.png). Each crop is 3x. A crop with two or three panels shows the states from left to right, in the order given in the "states" column. Motion notes for toggles.dev come from the published CSS (default duration 400 ms). Motion notes for the other sites come from frame captures taken every 40 ms. Where no frame showed a change, the table says so.

## References with a toggle

| reference | URL | symbol (per state) | states | motion | shot |
|---|---|---|---|---|---|
| toggles.dev classic | https://toggles.dev/toggles/classic | Sun with eight rays, then a crescent | 2, no system | Rays shrink to nothing. A masking disc slides over the sun and cuts a crescent. | toggles-dev-classic.png |
| toggles.dev around | https://toggles.dev/toggles/around | Sun with six dots around it, then a crescent | 2, no system | The six dots shrink one after another (staggered from 25 % to 73 % of the duration). The disc morphs to a crescent. | toggles-dev-around.png |
| toggles.dev dark-inner | https://toggles.dev/toggles/dark-inner | Ring with a half-filled disc inside, then the same with the halves swapped | 2, no system | The whole icon turns 180 degrees. The inner disc turns the other way. | toggles-dev-dark-inner.png |
| toggles.dev dark-side | https://toggles.dev/toggles/dark-side | Ring with the right half filled, then the left half filled | 2, no system | The icon turns 180 degrees. | toggles-dev-dark-side.png |
| toggles.dev eclipse | https://toggles.dev/toggles/eclipse | Solid disc, then a ring | 2, no system | A hole opens in the disc after a 20 % delay, with a small overshoot. | toggles-dev-eclipse.png |
| toggles.dev expand | https://toggles.dev/toggles/expand | Sun with eight dots, then a large crescent | 2, no system | Dots scale down to 0.75. The disc scales to 1.6 and morphs to a crescent with an overshoot. | toggles-dev-expand.png |
| toggles.dev half-sun | https://toggles.dev/toggles/half-sun | Eight-point star with the right half of the disc filled, then the left half | 2, no system | The icon turns 180 degrees. | toggles-dev-half-sun.png |
| toggles.dev horizon | https://toggles.dev/toggles/horizon | Sun with a ring above a bar, then the same sun half sunk behind the bar | 2, no system | The sun moves down 50 % behind a ground line. | toggles-dev-horizon.png |
| toggles.dev inner-moon | https://toggles.dev/toggles/inner-moon | Sun with a ring, then the same star with a crescent inside the ring | 2, no system | The inner disc turns 180 degrees and shifts 15 % sideways. It becomes a crescent with an overshoot. | toggles-dev-inner-moon.png |
| toggles.dev lightbulb | https://toggles.dev/toggles/lightbulb | Bulb with filament and rays, then a plain bulb outline | 2, no system | The filament line retracts (dash offset) and the rays fade. | toggles-dev-lightbulb.png |
| toggles.dev light-switch | https://toggles.dev/toggles/light-switch | Wall rocker with the dark pad at the top, then at the bottom | 2, no system | The pad slides from top to bottom with an overshoot. | toggles-dev-light-switch.png |
| toggles.dev simple | https://toggles.dev/toggles/simple | Solid disc, then a crescent | 2, no system | The disc morphs to a crescent with an overshoot. | toggles-dev-simple.png |
| toggles.dev spin | https://toggles.dev/toggles/spin | Sun with eight rays, then a crescent | 2, no system | Rays scale to 0. The disc turns 45 degrees and morphs to a crescent. | toggles-dev-spin.png |
| toggles.dev within | https://toggles.dev/toggles/within | Eight-point sun with a ring, then a ring with a crescent inside | 2, no system | Shapes scale (0.65, 1.5). The crescent moves in from the top right with an overshoot. | toggles-dev-within.png |
| Josh W. Comeau | https://www.joshwcomeau.com/ | Sun with a ring and eight dots (light), then a crescent outline (dark). Icon shows the current state. | 2, no system | The rays pull in, the ring shrinks, and a crescent grows in about 300 ms. The page colour fades at the same time. | comeau.png |
| Svelte docs | https://svelte.dev/docs | Crescent in light mode, filled sun with rays in dark mode. Icon shows the target state. Button has a raised frame. | 2, no system | Frames at 40 ms showed no in-between state, so it is a swap. | svelte.png |
| Radix Themes docs | https://www.radix-ui.com/themes/docs/overview/getting-started | Thin sun (light), crescent with three stars (dark). Icon shows the current state. | 2, no system | Frames at 40 ms showed no in-between state, so it is a swap. | radix.png |
| shadcn/ui docs | https://ui.shadcn.com/docs | Circle with a hatched right half, the same icon in both states | 2, no system | The icon does not change. Only the page does. | shadcn.png |
| Vercel Geist | https://vercel.com/geist/introduction (also the footer of https://vercel.com/) | Pill with three icons: old compact monitor, sun, crescent with a plus. A round highlight marks the active one. | 3, with system | Not captured. The highlight moves between the icons. | geist.png |
| Astro docs | https://docs.astro.build/en/getting-started/ | Native select with icon and word: laptop "Auto", sun "Light", crescent "Dark", then a chevron | 3, with system | None. The browser shows the list. | astro.png |
| Nuxt UI docs | https://ui.nuxt.com/docs/getting-started (palette button, then the menu row) | Row in a menu: label, then a three-cell segmented control: sun, crescent, monitor. The label shows the choice. | 3, with system | Not captured. The highlight moves between cells. | nuxt-ui.png |
| Lucide | https://lucide.dev/icons/ (sun, moon, sun-moon, eclipse, contrast, sun-dim, moon-star, sun-medium) | Stroke icons: sun, crescent, sun and crescent combined, disc with a bite, ring with a left half filled, dim sun with dotted rays, crescent with a plus | icon set | None. | lucide.png |
| Phosphor | https://phosphoricons.com/ (sun, moon, sun-dim, circle-half, circle-half-tilt, moon-stars) | Stroke icons: sun, crescent, dim sun, ring with vertical bars on one half, ring with a hatched half, crescent with stars | icon set | None. | phosphor.png |
| Tabler | https://tabler.io/icons (sun, moon, sun-moon, contrast, brightness, brightness-half, moon-stars) | Stroke icons: sun, crescent, struck-through sun and crescent, ring with a filled half, ring with a hatched half, eight-point star with half fill, crescent with stars | icon set | None. | tabler.png |
| Material Symbols | https://fonts.google.com/icons (contrast, dark_mode, light_mode, brightness_medium, brightness_4, brightness_auto, routine) | Filled half disc, crescent, sun, eight-point star with a half fill, the same with a crescent, the same with an "A", struck sun | icon set | None. | material-symbols.png |
| IEC 60417-5056, 5057, 5435 | https://commons.wikimedia.org/wiki/Category:IEC_60417_symbols (files Ref-No 5056, 5057, 5435) | 5056 brightness: ring with eight short rays. 5057 contrast: disc with the right half filled. 5435: both combined. | symbols, not a toggle | None. Rendered here from the Commons SVG. | iec-60417.png |

## Checked and found without a toggle

| reference | URL | what was found |
|---|---|---|
| Tailwind CSS docs | https://tailwindcss.com/docs/installation | Header has search, links and GitHub. No theme control. |
| GitHub Docs | https://docs.github.com/en | No theme control in the header or footer. |
| MDN | https://developer.mozilla.org/en-US/docs/Web | No theme control found in the header or the page text. |
| Stripe docs | https://docs.stripe.com/ | No theme control. |
| Raycast site | https://www.raycast.com/ | Dark only. No control. |
| Linear site | https://linear.app/ | Dark only. No control. |
| Grafana | https://grafana.com/docs/grafana/latest/administration/user-management/user-preferences/ | The docs describe a theme select under Profile, then Preferences, with a Save button. It needs a signed-in account, so it is not shown. Grafana has no top bar toggle. |

## Non-web references

No shot for these. They are physical or printed, and the pictures are not free to copy.

| reference | URL | symbol (what is drawn or shown) | states | motion | shot |
|---|---|---|---|---|---|
| ISO 2575:2021, entry A.15 "Instrument panel illumination" | https://standards.iteh.ai/catalog/standards/iso/9703c4a8-79ba-4606-8bbc-f94f76b4994a/iso-2575-2021 | Car symbol for the instrument light dimmer. In the 2004 edition it has no ISO 7000 number. | dimmer, continuous | A knob or slider. | none |
| A. Lange & Söhne Lange 1 Moon Phase (day/night, L121.3, 2017) | https://www.ablogtowatch.com/updated-lange-sohne-lange-1-moon-phase-watch-daynight-indicator/ | A gold moon sits over a disc that is a plain sky by day and a starry sky by night, inside the small seconds subdial. | day or night, from the time | The disc makes one turn in 24 hours. | none |
| Jaeger-LeCoultre Master Control Geographic (Q4128420) | https://www.timeandwatches.com/2020/05/jaeger-lecoultre-geographic-master.html | A small 24-hour day/night indicator beside the second time zone subdial | day or night, from the time | A hand on a 24-hour scale (older models used a two-tone disc in a window). | none |
| Boeing 737 Master Lights Test and Dim switch | https://www.aviationhunt.com/b737-master-lights-test-and-dim-switch/ | Three-position toggle labelled TEST, BRT, DIM. It sets the brightness of all annunciators. | 3 positions | Physical toggle with a click. | none |
| Apollo command module INTEGRAL and FLOOD rheostats, guarded toggles | https://safepic.com/Apollo11ManualWeb/CommunicationControlDisplay.html | Rotary controls for panel and floodlight brightness. Critical toggles sit under guards and some have locks. | continuous, plus on and off | Rotation, or a lift-and-throw. | none |
| Tektronix 465 oscilloscope INTENSITY and SCALE ILLUM knobs | https://w140.com/tekwiki/images/3/32/070-1330-00_465Service.pdf | Two labelled knobs. INTENSITY sets trace brightness and SCALE ILLUM sets graticule brightness. A BEAM FIND button shows an off-screen trace. | continuous | Rotation. | none |

## Patterns

Ten symbol ideas appear. "Fit" means a 16 px glyph in a 24 px tall button, in the near-black blue theme and in the light theme.

1. **Sun and moon swap** (Comeau, Svelte, Radix, toggles classic, around, expand, simple, spin, the four icon sets). The best known symbol. At 16 px the rays turn to mush at 1 px stroke, and the pair says "consumer app", not "instrument". Use only as a fallback.
2. **Moon inside the sun** (toggles within, inner-moon, Material brightness_4). One shape holds both states, so the button does not change size. It is detailed. At 16 px the crescent inside the ring is about 5 px wide and blurs.
3. **Half-filled circle** (shadcn, toggles dark-side, dark-inner, half-sun, IEC 60417-5057, Lucide and Tabler contrast, Phosphor circle-half). Reads as a gauge or a lamp lens. It is one ring and one half, so it stays sharp at 16 px with a 1.25 px stroke. Fill one half in cyan on the dark theme and in the ink colour on the light theme. A 180 degree turn between states costs one line of CSS.
4. **Eclipse** (toggles eclipse, Lucide eclipse). A disc with a bite, or a disc that gains a hole. It is calm and sharp at 16 px. The two states are hard to tell apart without the motion, so it needs a label next to it.
5. **Horizon** (toggles horizon). A sun sinking behind a ground line. It is clear but needs a wide box and carries a landscape feel. Weak fit at 16 px.
6. **Lightbulb** (toggles lightbulb). The idea is "lights on or off", not "theme". Wrong signal in an operations console, where light means status. Skip.
7. **Physical switch** (toggles light-switch, Boeing 737 TEST/BRT/DIM, Apollo guarded toggles). A rocker or a lever with a lit pad. Strong character. At 16 px a 6 by 10 px rocker with a cyan pad works as a small status key. It needs a "DAY" and "NIGHT" word beside it to carry the meaning.
8. **Segmented control** (Geist, Nuxt UI, Astro select). Three cells: system, light, dark. The only pattern that shows the system choice. At 24 px tall each cell is about 20 px wide, so the strip is 60 px. A thin border and a cyan outline on the active cell match the panel style.
9. **Day and night disc** (Lange 1 Moon Phase, JLC Master Control Geographic). A disc behind a round aperture that shows a plain half by day and a starred half by night. It has a watchmaker feel. At 16 px keep it to a half disc and two or three star dots, with a hairline aperture ring.
10. **Brightness dial** (IEC 60417-5056, ISO 2575 A.15, Tektronix INTENSITY, Apollo rheostats). A ring with ticks, read as a level, not a mode. It fits the console well. It suggests a continuous scale, so a two-state switch would need a pointer that jumps between two marks.

## Best fits for the mission-control console

1. **Half-filled circle** (pattern 3). It is an instrument lens, it is IEC-standard, and it is the only pattern that is crisp at 16 px in both themes. It needs a word such as "DARK" or "LIGHT" in monospace beside it to say what the next click does.
2. **Segmented control** (pattern 8). It matches thin-bordered panels, shows system, light and dark at once, and is as honest as a panel selector switch. It is wider, so it takes 60 px of the top bar.
3. **Day and night disc** (pattern 9). The most distinctive option and it suits a watchmaker tone. It is the riskiest at 16 px, so it needs a test render before it is chosen.

## Not verified

- Motion of Geist, Nuxt UI and the Svelte, Radix and shadcn swaps is not confirmed. Frames at 40 ms did not catch a transition, or the highlight slide was not captured.
- The Grafana theme select needs a login. Only the docs were read.
- The MDN, GitHub Docs, Tailwind, Stripe, Raycast and Linear findings come from header and page-text checks. A theme control hidden in a menu that needs a login would not show.
- The Lange and JLC pages are reviews, not the makers' own pages. Neither source shows a sun and moon aperture.
- The Boeing, Apollo and Tektronix sources describe the controls in text. No photo was checked for the exact label art.
- ISO 2575 A.15 is named in a search summary of the 2004 edition. The standard text itself is behind a paywall.
- Icon-set crops are rendered by me from the CDN SVGs and the Google font at 24 px. They are not screenshots of the vendor sites.
