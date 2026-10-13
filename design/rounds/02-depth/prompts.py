"""Round 02 prompts: per carried direction the drawer open, the phone, the idle moment; plus hybrids.
Usage: python3 prompts.py 01-linear-calm 06-mission-control ... (writes <slug>-drawer.txt, -phone.txt, -idle.txt)."""
import sys, re
from pathlib import Path
R = Path(__file__).parent
R1 = R.parent / "01-directions"
src = (R1 / "prompts.py").read_text()
HEAD = re.search(r'HEAD = """(.*?)"""', src, re.S).group(1)
TAIL = re.search(r'TAIL = """(.*?)"""', src, re.S).group(1)
DIRS = {m[0]: (m[1], m[2]) for m in re.findall(r'\("(\d\d-[a-z-]+)", "([^"]+)", """(.*?)"""\)', src, re.S)}

DRAWER = """The same busy moment as before, but the card "#601 Console: the drawer's Overview top block" is open: its drawer docks at the right edge of the screen over the board, 46 percent wide, and the chat stays visible and free. The drawer shows: the header "#601 Console: the drawer's Overview top block" with the state "running · 23 min · 3/4 checks" and "€1.72 / €2.00 ⚠ near its budget"; tabs "Overview", "Chat", "Activity", "Files" with Chat selected; the line "Session 2 · coding-cheap · running"; messages: agent "The top block is in place as a definition list. Running the Overview test next.", sebastian "Keep the budget line muted under 80 percent.", agent "Done: the budget line takes the muted class until 80 percent, then the warning sign."; a message box "Message the running session; it reads it at its next step" with "Send". Under the drawer's edge the board's remaining columns are partly covered. The pulse and the status figures stay on top. The content of the board and the chat is the same as before (the Needs you items "Merge PR #612" and "#603 Which store for the session table?", the columns Queued 4, Working 3, Verifying 2, Done 8, the chat with the proposal "I will: answer #603 with Postgres, then move #620 to ready" and its buttons "Do it" and "Skip")."""

PHONE = """A phone screen, 9:16 portrait, 390 px wide, the whole image is the screen, no device frame. One column, no tabs: a compact top bar ("Factory console", the project "ai-software-factory-code", a menu); the pulse "⚠ Two cards need your decision; #612's merge carries a migration." with "more"; the status figures in one small row ("waiting on you · 3 working · 2 need you · €61.40 / €120.00"); then the chat as the main region with the last exchange (you: "Why is #603 waiting?"; agent: "#603 asked which store the session table should use. The plan named Postgres; the brief allows SQLite for a single replica. I can answer Postgres for you."; the proposal "I will: answer #603 with Postgres, then move #620 to ready" with full-width buttons "Do it" and "Skip") and its message box "Ask or tell the project…" with "Send"; then the board as stacked sections: "Needs you 2" in full (the merge approval "Merge PR #612", chips "high risk" "migration", the line "Recommendation: adds the column; merge it.", full-width buttons "Approve as you", "Deny"; the question "#603 Which store for the session table?" with full-width choice buttons "Postgres", "SQLite", "Ask the author"), then "Working 3" with its three cards ("#601 Console: the drawer's Overview top block · running · 23 min · €1.72 / €2.00 ⚠", "#598 GitHub sync pulls a card · running · 41 min", "#611 Acceptance: export as the human · running · 8 min"), then collapsed rows "Verifying 2", "Queued 4", "Done 8". Thumb-sized targets, nothing cut off."""

IDLE = """A quiet moment of the same screen instead of the busy one. Status figures: "idle", "0 working", "0 need you", "€144.16 / €120.00" (over the cap, marked). Pulse, subdued, not prominent: "Factory is idle with no active work; spend of €144.16 has exceeded the monthly budget of €120.00." Board: "Needs you 0" empty, "Queued 2" with "#455 Live check: close (Stage 16, 3.4)" chip "backlog" "53 h 1 min in all" and buttons "Plan", "Ready", "Close", and "#178 Console: show the configuration version" chip "backlog" "347 h 40 min in all" with the same buttons; "Working 0" empty; "Verifying 0" empty; "Done 139" with quiet one-line entries "#490 README.md: extend the intro" done, "#616 Chat form: center the Send button" done, "#610 Fresh-context and aged-read acceptance tests" done, "#607 Live check 3.11: split pre-check" failed, "#608 Console polish: clamp board chip objectives" done, "#604 Members page" done, "#603 Session store: Postgres" done, "#599 Alerts: verdict buttons" closed. Chat: "Chat", "project agent · ai-software-factory-code", "New conversation", the line "Ask or tell the project agent. It reads, explains, moves, answers, steers and approves as you, through the console's own actions; it runs no code.", the message box and "Send". The empty columns must still look designed, not broken: the screen is calm and complete."""

HYBRID_TAKE = {"06-mission-control+07-trading-floor": "row density and the event ticker", "01-linear-calm+10-command-palette": "command bar as the chat input", "09-inbox-first+16-messenger-dock": "chat dock across the bottom"}

def write(slug, name, body, kind, content, theme="dark"):
    t = "Dark theme." if theme == "dark" else "Light theme: a light background with dark text, the same design in the day mood."
    (R / f"{slug}-{kind}.txt").write_text(f"{HEAD}\n\n{content}\n\nDirection \"{name}\": {body} {t}\n\n{TAIL}\n")

for slug in sys.argv[1:]:
    if "+" in slug:  # a hybrid: "06-mission-control+07-trading-floor"
        a, b = slug.split("+")
        na, ba = DIRS[a]; nb, bb = DIRS[b]
        CONTENT = re.search(r'CONTENT = """(.*?)"""', src, re.S).group(1)
        body = f"{ba} Then take from the direction \"{nb}\" its {HYBRID_TAKE.get(slug, 'strongest trait')}: {bb}"
        (R / f"h-{a[:2]}-{b[:2]}-busy.txt").write_text(f"{HEAD}\n\n{CONTENT}\n\nDirection \"{na} with {nb}\": {body} Dark theme.\n\n{TAIL}\n")
        continue
    name, body = DIRS[slug]
    write(slug, name, body, "drawer", DRAWER)
    write(slug, name, body, "phone", PHONE)
    write(slug, name, body, "idle", IDLE)
print("written")
