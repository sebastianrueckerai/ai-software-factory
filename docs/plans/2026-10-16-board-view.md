# Board view chat tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the project agent two chat tools, `board_view` and `board_view_reset`, that work the member's board view controls for them (roadmap 282): menus, find, routines, card drawer, panel fold, theme.

**Architecture:** The chat's POST already carries the page's state; it gains a `view` field holding `#board`'s `data-query`. The server merges the tool's words onto that filter and answers one new SSE event `view` whose payload is the canonical `query()` string plus the named screen parts (card, tab, panel, theme). The client applies the event through the same machinery a click uses: `pushState`, `dataset.query` + `swapBoard()`, the drawer's hash, `toggleStatus`, the theme button. Nothing is stored; the view holds for the page as a click does (Sebastian, 2026-10-16), and Back and Forward follow the URL.

**Tech Stack:** Go (console package), vanilla JS (chat.js, console.js), the node-vm driver in `events_test.go`, the Playwright console lab.

**Spec:** `docs/roadmap.md` item 282 and its decided line (2026-10-16: the view change holds for the page as a click does, nothing stored). The design rulings R1-R10 below carry the conversation's decisions.

## Rulings the plan argues from

- R1: One SSE event `view` on the chat's own POST stream, for the member's screen alone, never the project bus. Payload fields `query` always, `card`/`tab`/`panel`/`theme` only when set (`card: ""` on reset).
- R2: chat.js POSTs `view` = `#board`'s `dataset.query`. The server merges the tool's params onto the parsed filter and answers the canonical `query()` string. The client applies that string verbatim; no JS re-merges params.
- R3: The client applies through existing machinery: pushState keeping `doc=` and the hash, then `dataset.query` + `swapBoard()` (its guards apply); the card via the drawer's hash; the tab by clicking the drawer's own tab button after its swap lands (one-shot afterSwap listener); the panel via `toggleStatus(open|closed)`; the theme by clicking `button[data-theme-set]`.
- R4: `board_view_reset` clears the URL's controls to the default (project only) and closes the drawer. It leaves the panel fold and the theme, which are the member's own.
- R5: `filed` is not a parameter. It is an action's notice, not a control.
- R6: A wrong value is refused naming the accepted words, unlike `readCols`' silent normalisation. The accepted words come from the one source: `colMenus`, `periodUnits`, `drawerTabs`.
- R7: The stored tool result text is descriptive only ("The board now shows ..."). The view event exists only on the live stream; history holds no effect.
- R8: Both tools are reads: `write: false`, no entries in the confirm lists, access `rMember`, appended at the end of `policy.ChatTools` and of the `tools` slice.
- R9: One parameter per control: `view` (wide|none), `find` (any words; a call that names `find` with empty text clears it), `queued`/`progress`/`done` (orders, with `newest` naming the default), `queued_only`/`progress_only`/`done_only` (shows, with `all` naming the default; `queued_only` also takes `plan:n`), `routines` (all|within|none), `within` (1-999), `unit` (days|hours), `card` (task id or issue number), `tab` (overview|chat|activity|files, needs `card`), `panel` (open|closed), `theme` (dark|light).
- R10: The turn gains `pageQuery` (from the POST), `present` (the argument keys the call itself named) and a pending `viewEvent`; `runTool` sends the view event right after the tool's block.

## Global Constraints

- `go test -race ./...` green, `gofmt` clean, `gosec` clean (the repo's CI gates: test, vet-and-format, security).
- The console lab green: `bash scripts/console-lab/run.sh` from the code repo (Task 3 wires the new mechanic into `check.js`).
- Comments in the codebase's voice: prose comments that name what and why, citing the ruling refs (`(282)`, `C13`, `C16`) as neighbours do. No narration comments.
- User-visible sentences follow the rules `TestChatToolSentences` enforces: `about` one sentence ending `.` at most 100 chars; parameter phrases at most 60 chars with no `. ` inside. Refusals are `refuse(http.StatusBadRequest, "One sentence.")`, and name the state and the fitting action.
- No new dependencies. SSE event name `view`; the DOM CustomEvent is also named `view`.
- One way only: no shims, no second path. The enum words for menus come from `colMenus` itself, the tabs from `drawerTabs`.
- Commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Never print a provider key. Nothing here touches keys.

## Review Focus

The five input classes the spec implies but no plain task covers, each pinned to its owning task's tests:

1. Back and Forward across a pushed view change must follow the URL (the board re-reads the entry's query); today's popstate handler only syncs the find box. Test: node driver popstate cases in Task 2.
2. A view event arriving while a find is in flight or the board busy must not wipe the find or double-swap; it defers through the existing guards. Test: node driver case in Task 2.
3. `find` named with empty text clears the find; `find` not named keeps the page's. Both must hold, which is why the turn carries `present`. Test: `TestChatBoardView` clear and keep cases in Task 1.
4. A view event with no `#board` on the page (a doc view, a fragment) must not throw, and the card, panel and theme parts still apply. Test: node driver case in Task 2.
5. The drawer tab click must land after the drawer's own swap, not before it. Test: node driver case with the drawer's swap fired late in Task 2.

---

### Task 1: The server: turn fields, the two tools, policy and access

**Files:**
- Modify: `internal/console/chat.go` (the `turn` struct around line 78-99; the turn's construction in `chatPost` around line 238-297; `runTool` around line 455-484)
- Modify: `internal/console/chat_tools.go` (`toolInput` fields; helpers; the `tools` slice's end)
- Modify: `internal/policy/policy.go` (`ChatTools` list, lines around 119-127)
- Modify: `internal/console/access.go` (the reads line, around 144-148)
- Test: `internal/console/chat_test.go` (new `TestChatBoardView`; the offered lists of `TestChatOffersTheMembersTools`)

**Interfaces:**
- Consumes: `boardFilter`, `readCols`, `colMenus`, `periodUnits`, `query()`, `viewWide`, `columnTitles` from `internal/console/board.go`; `drawerTabs` from board.go (line ~2887); `t.c.cardIn`, `refuse`, `enum`, `str` from the chat package.
- Produces: SSE event `view` with payload `{"query": "?...", "card"?: "t-...", "tab"?: "chat", "panel"?: "open", "theme"?: "light"}` (JSON keys sorted by Go's map marshal; `card: ""` on reset). POST form field `view` (the page's board query). Tools `board_view` and `board_view_reset` in `policy.ChatTools` order. Task 2 consumes exactly these names.

- [ ] **Step 1: Write the failing tests**

In `chat_test.go`, after the existing tool tests (near `TestChatToolSentences` / the refusal tests), add:

```go
// TestChatBoardView: the view tools work the member's screen (282). The
// page's view and the call's words merge into one query the view event
// carries after the tool's block; a find the call names with empty text
// clears, one it leaves out keeps the page's; a word a menu does not
// carry is refused naming the menu's words; the tab needs its card;
// reset clears every control to the default and closes the drawer.
func TestChatBoardView(t *testing.T) {
	r, chat, g := newChatRig(t)
	ck, s := r.loggedIn(t)
	post := func(view, args string) []string {
		g.script = []string{call(0, "board_view", args), say("done")}
		_, ev, _ := chatPost(t, r, ck, s, chatPath, url.Values{"message": {"work the board"}, "conversation": {"2"}, "view": {view}})
		return ev
	}
	// the page's view and the call's words merge; the routines control's
	// period rides along, and the event follows the tool's block
	ev := post("?project=ai-software-factory-code&q=cache&progress=oldest", `{"routines":"within","within":2,"unit":"hours"}`)
	want := []string{
		`tool {"duration_ms":0,"name":"board_view"}`,
		`view {"query":"?progress=oldest&project=ai-software-factory-code&q=cache&routines=within&unit=hours&within=2"}`,
	}
	for i, w := range want {
		if !slices.Contains(ev, w) {
			t.Errorf("the turn holds no %s:\n%s", w, strings.Join(ev, "\n"))
		}
		_ = i
	}
	if ev[slices.Index(ev, want[0])+1] != want[1] {
		t.Errorf("the view event does not follow the tool's block:\n%s", strings.Join(ev, "\n"))
	}
	// the stored answer names what the board now shows
	if !slices.ContainsFunc(ev, func(e string) bool { return strings.HasPrefix(e, "tool ") && strings.Contains(e, "routines within 2 hours") }) {
		t.Errorf("the tool's result does not say what the board shows:\n%s", strings.Join(ev, "\n"))
	}
	// a find the call names with empty text clears; one it leaves out keeps
	ev = post("?project=ai-software-factory-code&q=cache", `{"find":""}`)
	if !slices.Contains(ev, `view {"query":"?project=ai-software-factory-code"}`) {
		t.Errorf("an emptied find does not clear the query:\n%s", strings.Join(ev, "\n"))
	}
	ev = post("?project=ai-software-factory-code&q=cache", `{"routines":"none"}`)
	if !slices.Contains(ev, `view {"query":"?project=ai-software-factory-code&q=cache&routines=none"}`) {
		t.Errorf("a call without find drops the page's:\n%s", strings.Join(ev, "\n"))
	}
	// newest and all name each menu's default
	ev = post("?project=ai-software-factory-code&queued=oldest&queued-only=blocked", `{"queued":"newest","queued_only":"all"}`)
	if !slices.Contains(ev, `view {"query":"?project=ai-software-factory-code"}`) {
		t.Errorf("newest and all do not name the default:\n%s", strings.Join(ev, "\n"))
	}
	// a plan's show rides as plan:n
	ev = post("?project=ai-software-factory-code", `{"queued_only":"plan:558"}`)
	if !slices.Contains(ev, `view {"query":"?project=ai-software-factory-code&queued-only=plan%3A558"}`) {
		t.Errorf("plan:n does not ride along:\n%s", strings.Join(ev, "\n"))
	}
	// the card opens the drawer, its tab with it; the panel and theme ride
	ev = post("?project=ai-software-factory-code", `{"card":"11","tab":"chat","panel":"closed","theme":"light"}`)
	if !slices.Contains(ev, `view {"card":"t-r","panel":"closed","query":"?project=ai-software-factory-code","tab":"chat","theme":"light"}`) {
		t.Errorf("the card, tab, panel and theme do not ride along:\n%s", strings.Join(ev, "\n"))
	}
	// reset clears every control and closes the drawer
	g.script = []string{call(0, "board_view_reset", `{}`), say("done")}
	_, ev, _ = chatPost(t, r, ck, s, chatPath, url.Values{"message": {"reset the view"}, "conversation": {"2"},
		"view": {"?project=ai-software-factory-code&q=cache&routines=none&queued=oldest"}})
	if !slices.Contains(ev, `view {"card":"","query":"?project=ai-software-factory-code"}`) {
		t.Errorf("reset does not clear the view:\n%s", strings.Join(ev, "\n"))
	}
	_ = chat
}
```

And the refusals, in the same file (mirroring how neighbouring refusal tests call the tools; reuse `refused(t, r, name)` from `chat_reads_test.go:95` if it fits the rig's shape, else post as above and read the `tool` event's result):

```go
// TestChatBoardViewRefusals: a word a control does not carry is refused
// naming the words it does, the tab needs its card, and the period's
// bounds hold.
func TestChatBoardViewRefusals(t *testing.T) {
	r, _, g := newChatRig(t)
	ck, s := r.loggedIn(t)
	refuse := func(args, want string) {
		t.Helper()
		g.script = []string{call(0, "board_view", args), say("done")}
		_, ev, _ := chatPost(t, r, ck, s, chatPath, url.Values{"message": {"work the board"}, "conversation": {"2"}, "view": {""}})
		for _, e := range ev {
			if strings.HasPrefix(e, "tool ") && !strings.Contains(e, "Refused: "+want) {
				t.Errorf("args %s refuse with %q, want %q", args, e, want)
			}
		}
	}
	refuse(`{"queued":"first"}`, "The queued order must be newest, oldest or next.")
	refuse(`{"progress_only":"both"}`, "The progress show must be all or exceptional.")
	refuse(`{"done":"latest"}`, "The done order must be newest or oldest.")
	refuse(`{"view":"narrow"}`, "The view must be wide or none.")
	refuse(`{"routines":"sometimes"}`, "The routines must be all, within or none.")
	refuse(`{"within":0}`, "The period must be 1 to 999.")
	refuse(`{"within":1000}`, "The period must be 1 to 999.")
	refuse(`{"routines":"all","within":2}`, "The within and unit words need routines within.")
	refuse(`{"unit":"weeks"}`, "The unit must be days or hours.")
	refuse(`{"tab":"chat"}`, "The tab needs the card it opens.")
	refuse(`{"tab":"history"}`, "The tab must be overview, chat, activity or files.")
	refuse(`{"panel":"half"}`, "The panel must be open or closed.")
	refuse(`{"theme":"blue"}`, "The theme must be dark or light.")
	refuse(`{"card":"t-nope"}`, "There is no card t-nope in this project.")
}
```

Adapt both tests to the rig's real helpers where they differ: `g.script` is the gateway's script field by whatever name `chatGateway` holds (read its neighbours), `call` and `say` are at chat_test.go:522-537, `chatPost` at :573. The exact JSON of the `view` event is Go's sorted-key map marshal of `map[string]any`; if a field's spelling differs when run, fix the test's expectation only after checking the code truly produces it.

Also extend `TestChatOffersTheMembersTools` (chat_test.go around 829): every role's `want` list gains `"board_view", "board_view_reset"` at its end, in that order, because both are `rMember` reads.

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/console/ -run 'TestChatBoardView|TestChatOffers' -v`
Expected: FAIL, no `board_view` tool and no `view` event.

- [ ] **Step 3: Implement the turn fields and the POST read**

In `chat.go`, add to the `turn` struct (after `conv`):

```go
	// pageQuery is the view the member's page stands on (282): the board's
	// data-query the chat's POST carries, whose controls the view tools
	// merge their words onto. present are the argument keys the call itself
	// named: a parameter the call leaves out keeps the page's choice, one
	// it names with empty text clears it. viewEvent, set by the view tools,
	// reaches the member's screen alone, after the tool's block.
	pageQuery string
	present   map[string]bool
	viewEvent map[string]any
```

Where `chatPost` builds the turn (it reads `r.PostFormValue("message")`), set `t.pageQuery = r.PostFormValue("view")`.

In `runTool`, where the call's arguments are unmarshalled into the `toolInput` (find the `json.Unmarshal` on the arguments), fill `present` from the same bytes:

```go
	var named map[string]json.RawMessage
	if json.Unmarshal([]byte(args), &named) == nil {
		t.present = make(map[string]bool, len(named))
		for k := range named {
			t.present[k] = true
		}
	}
```

(Adapt to the variable that holds the raw arguments string at that site.)

And right after `runTool` sends the tool's block (`t.block(...)`), send the pending view event:

```go
	if t.viewEvent != nil {
		t.send("view", t.viewEvent)
		t.viewEvent = nil
	}
```

- [ ] **Step 4: Implement the tools**

In `chat_tools.go`, extend `toolInput` (after the `SkipUndo` field, before the unexported `undo`):

```go
	// The view tools' arguments (282), one per control of the screen
	// board_view works; Find is the find's words, a call that names it
	// with empty text clearing them.
	View         string `json:"view,omitempty"`
	Queued       string `json:"queued,omitempty"`
	QueuedOnly   string `json:"queued_only,omitempty"`
	Progress     string `json:"progress,omitempty"`
	ProgressOnly string `json:"progress_only,omitempty"`
	Done         string `json:"done,omitempty"`
	DoneOnly     string `json:"done_only,omitempty"`
	Routines     string `json:"routines,omitempty"`
	Within       int    `json:"within,omitempty"`
	Unit         string `json:"unit,omitempty"`
	Card         string `json:"card,omitempty"`
	Tab          string `json:"tab,omitempty"`
	Panel        string `json:"panel,omitempty"`
	Theme        string `json:"theme,omitempty"`
```

(`Find` already exists on `toolInput`; the board view tool reuses it.)

Add the helpers, near the other tool helpers:

```go
// orWords joins words the way a sentence lists them: "a, b or c".
func orWords(ws ...string) string {
	if len(ws) < 2 {
		return strings.Join(ws, "")
	}
	return strings.Join(ws[:len(ws)-1], ", ") + " or " + ws[len(ws)-1]
}

// orderWords are a menu's order words for the view tool, newest naming
// the default, as its refusal and schema name them.
func orderWords(m menuSpec) []string {
	ws := []string{"newest"}
	for _, o := range m.Orders {
		if o.Value != "" {
			ws = append(ws, o.Value)
		}
	}
	return ws
}

// showWords are a menu's show words for the view tool, all naming the
// default; queued's also takes plan:n, as its menu offers per plan (C13).
func showWords(m menuSpec) []string {
	ws := []string{"all"}
	for _, o := range m.Onlys {
		if o.Value != "" {
			ws = append(ws, o.Value)
		}
	}
	if m.Name == "queued" {
		ws = append(ws, "plan:n")
	}
	return ws
}

// takeOrder reads the call's order word for one menu: "" leaves the
// page's choice, newest clears it, a word the menu does not carry is
// refused naming the words it does, for the tool works the menu and a
// word it does not offer names no control.
func takeOrder(m menuSpec, w string) (set bool, v string, err error) {
	if w == "" {
		return false, "", nil
	}
	if w == "newest" {
		return true, "", nil
	}
	for _, o := range m.Orders {
		if o.Value == w {
			return true, w, nil
		}
	}
	return false, "", refuse(http.StatusBadRequest, fmt.Sprintf("The %s order must be %s.", m.Name, orWords(orderWords(m)...)))
}

// takeShow reads the call's show word for one menu, all naming the
// default and queued's taking plan:n for the plan with that number.
func takeShow(m menuSpec, w string) (set bool, v string, err error) {
	if w == "" {
		return false, "", nil
	}
	if m.Name == "queued" && strings.HasPrefix(w, "plan:") {
		if _, e := strconv.ParseInt(strings.TrimPrefix(w, "plan:"), 10, 64); e == nil {
			return true, w, nil
		}
		return false, "", refuse(http.StatusBadRequest, fmt.Sprintf("The %s show must be %s.", m.Name, orWords(showWords(m)...)))
	}
	if w == "all" {
		return true, "", nil
	}
	for _, o := range m.Onlys {
		if o.Value == w {
			return true, w, nil
		}
	}
	return false, "", refuse(http.StatusBadRequest, fmt.Sprintf("The %s show must be %s.", m.Name, orWords(showWords(m)...)))
}

// pageFilter is the board's filter the member's page stands on (282):
// the view field the chat's POST carries, read as the URL's query is,
// under the chat's own project.
func (t *turn) pageFilter() boardFilter {
	v, _ := url.ParseQuery(strings.TrimPrefix(t.pageQuery, "?"))
	f := boardFilter{Project: t.p.Name, View: v.Get("view"), Q: strings.TrimSpace(v.Get("q"))}
	readCols(&f, v.Get)
	return f
}

// viewNote says what the board now shows, in the words of its controls,
// for the view tools' stored answer (282).
func (f boardFilter) viewNote() string {
	var parts []string
	if f.View == viewWide {
		parts = append(parts, "the wide view")
	}
	if f.Q != "" {
		parts = append(parts, fmt.Sprintf("find %q", f.Q))
	}
	for _, m := range colMenus {
		c := f.col(m.Name)
		var ws []string
		for _, o := range m.Orders {
			if o.Value != "" && o.Value == c.Order {
				ws = append(ws, o.Label)
			}
		}
		for _, o := range m.Onlys {
			if o.Value != "" && o.Value == c.Only {
				ws = append(ws, o.Label)
			}
		}
		if strings.HasPrefix(c.Only, "plan:") {
			ws = append(ws, "from "+c.Only)
		}
		if len(ws) > 0 {
			parts = append(parts, columnTitles[m.Col]+" "+strings.Join(ws, " and "))
		}
	}
	switch f.Routines {
	case "none":
		parts = append(parts, "no routines")
	case "within":
		parts = append(parts, "routines within "+f.Period())
	}
	if len(parts) == 0 {
		return "The board now shows every card, the default view."
	}
	return "The board now shows " + strings.Join(parts, ", ") + "."
}

// tabNames are the drawer's tabs by name, from drawerTabs itself.
var tabNames = func() (ns []string) {
	for _, d := range drawerTabs {
		ns = append(ns, d.Name)
	}
	return ns
}()

// setView is the board view and reset tools' run (282): the page's view
// and the call's words merge into one filter whose query the member's
// screen alone then holds, as a click holds it, nothing stored. Reset
// instead clears every control to the board's default and closes the
// drawer, leaving the member's panel fold and theme theirs.
func (t *turn) setView(in toolInput, reset bool) (string, *inverse, error) {
	var f boardFilter
	var e map[string]any
	if reset {
		f = boardFilter{Project: t.p.Name}
		e = map[string]any{"card": ""}
	} else {
		f = t.pageFilter()
		e = map[string]any{}
		for _, m := range colMenus {
			var order, only string
			switch m.Name {
			case "queued":
				order, only = in.Queued, in.QueuedOnly
			case "progress":
				order, only = in.Progress, in.ProgressOnly
			case "done":
				order, only = in.Done, in.DoneOnly
			}
			c := f.col(m.Name)
			if set, v, err := takeOrder(m, order); err != nil {
				return "", nil, err
			} else if set {
				c.Order = v
			}
			if set, v, err := takeShow(m, only); err != nil {
				return "", nil, err
			} else if set {
				c.Only = v
			}
			f.setCol(m.Name, c)
		}
		if t.present["find"] {
			f.Q = strings.TrimSpace(in.Find)
		}
		switch in.View {
		case "":
		case "wide":
			f.View = viewWide
		case "none":
			f.View = ""
		default:
			return "", nil, refuse(http.StatusBadRequest, "The view must be wide or none.")
		}
		switch in.Routines {
		case "":
		case "all":
			f.Routines = ""
		case "none", "within":
			f.Routines = in.Routines
		default:
			return "", nil, refuse(http.StatusBadRequest, "The routines must be all, within or none.")
		}
		if in.Within != 0 {
			if in.Within < 1 || in.Within > 999 {
				return "", nil, refuse(http.StatusBadRequest, "The period must be 1 to 999.")
			}
			if f.Routines != "within" {
				return "", nil, refuse(http.StatusBadRequest, "The within and unit words need routines within.")
			}
			f.Within = in.Within
		}
		if in.Unit != "" {
			if _, ok := periodUnits[in.Unit]; !ok {
				return "", nil, refuse(http.StatusBadRequest, "The unit must be days or hours.")
			}
			if f.Routines != "within" {
				return "", nil, refuse(http.StatusBadRequest, "The within and unit words need routines within.")
			}
			f.Unit = in.Unit
		}
		if in.Tab != "" {
			if !slices.Contains(tabNames, in.Tab) {
				return "", nil, refuse(http.StatusBadRequest, "The tab must be "+orWords(tabNames...)+".")
			}
			if in.Card == "" {
				return "", nil, refuse(http.StatusBadRequest, "The tab needs the card it opens.")
			}
			e["tab"] = in.Tab
		}
		if in.Card != "" {
			task, err := t.c.cardIn(t.r.Context(), t.a, in.Card)
			if err != nil {
				return "", nil, err
			}
			e["card"] = task.ID
		}
		switch in.Panel {
		case "":
		case "open", "closed":
			e["panel"] = in.Panel
		default:
			return "", nil, refuse(http.StatusBadRequest, "The panel must be open or closed.")
		}
		switch in.Theme {
		case "":
		case "dark", "light":
			e["theme"] = in.Theme
		default:
			return "", nil, refuse(http.StatusBadRequest, "The theme must be dark or light.")
		}
	}
	e["query"] = f.query()
	t.viewEvent = e
	if reset {
		return "The board is back to its default view and the drawer is closed.", nil, nil
	}
	note := f.viewNote()
	if card, ok := e["card"].(string); ok {
		note = strings.TrimSuffix(note, ".") + ", the card " + card + " open in the drawer."
	}
	if p, ok := e["panel"].(string); ok {
		note = strings.TrimSuffix(note, ".") + ", the panel " + p + "."
	}
	if th, ok := e["theme"].(string); ok {
		note = strings.TrimSuffix(note, ".") + ", the " + th + " theme."
	}
	return note, nil, nil
}

// boardViewParams are the board view tool's controls (282), one per
// control of the screen, the menus' words read from the menus themselves.
func boardViewParams() map[string]any {
	p := map[string]any{
		"view":     enum("the wide view: wide or none", "wide", "none"),
		"find":     str("the find's words, empty clears"),
		"routines": enum("the routines: all, within or none", "all", "within", "none"),
		"within":   map[string]any{"type": "integer", "description": "the period's length, 1 to 999", "minimum": 1, "maximum": 999},
		"unit":     enum("the period's unit: days or hours", "days", "hours"),
		"card":     str("the card to open in the drawer"),
		"tab":      enum("the card's tab: "+orWords(tabNames...), tabNames...),
		"panel":    enum("the status panel: open or closed", "open", "closed"),
		"theme":    enum("the theme: dark or light", "dark", "light"),
	}
	for _, m := range colMenus {
		title := strings.ToLower(columnTitles[m.Col][:1]) + columnTitles[m.Col][1:]
		p[m.Name] = enum(title+" order: "+orWords(orderWords(m)...), orderWords(m)...)
		p[m.Name+"-only"] = enum(title+" show: "+orWords(showWords(m)...), showWords(m)...)
	}
	return p
}
```

Note on `boardViewParams`: the enum's `values` for `tab` and the menus are `[]string` while `enum` takes `...string` — pass `names...` spreads. The phrase lengths must hold at most 60 chars: "In progress order: newest, oldest, stage or spend" is 50, "Needs you show: all, blocked or plan:n" is 37; verify each after wiring by running `TestChatToolSentences`, which checks them.

Then add the two tools at the END of the `tools` slice:

```go
	{
		name:   "board_view",
		title:  "Board view",
		about:  "Works the board's view controls as a click does: menus, find, routines, card, panel, theme.",
		params: boardViewParams(),
		run:    func(t *turn, in toolInput) (string, *inverse, error) { return t.setView(in, false) },
	},
	{
		name:  "board_view_reset",
		title: "Board view reset",
		about: "Clears the board's view controls to the default and closes the drawer.",
		run:   func(t *turn, in toolInput) (string, *inverse, error) { return t.setView(toolInput{}, true) },
	},
```

- [ ] **Step 5: Policy and access**

In `internal/policy/policy.go`, append to the `ChatTools` ordered list (after `"active_threads"`): `"board_view", "board_view_reset",`.

In `internal/console/access.go`, add both to the reads line: `"board_view": rMember, "board_view_reset": rMember,`.

- [ ] **Step 6: Run the tests**

Run: `go test ./internal/console/ ./internal/policy/ -run 'TestChatBoardView|TestChatOffers|TestChatToolSentences|TestAccessTable|TestChatTools' -v` (adapt the last names to what exists; `go test ./... -count=1` at the end).
Expected: PASS. If a golden's exact JSON differs, read the actual event and reconcile it against the code before changing the expectation.

- [ ] **Step 7: The whole suite**

Run: `go test -race ./...`
Expected: PASS, no data races.

- [ ] **Step 8: Commit**

```bash
git add internal/console/chat.go internal/console/chat_tools.go internal/console/chat_test.go internal/policy/policy.go internal/console/access.go
git commit -m "chat: the board view tools work the member's screen (282)

The chat's POST carries the page's board query; board_view merges its
words onto it and answers one view event for the member's screen alone,
which the client applies as a click does, nothing stored. Refusals name
the words each control takes, read from the menus themselves.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: The client: the POST's view field, the event's apply, Back and Forward

**Files:**
- Modify: `internal/console/static/chat.js` (the `event` dispatch chain around line 425-433; the POST body at the `run(` call around line 493)
- Modify: `internal/console/static/console.js` (the popstate handler at lines 161-166, replaced and moved; the stream IIFE around 245-261; the status fold IIFE around 375-409; the drawer block around 506-539; the theme IIFE around 169-189)
- Test: `internal/console/events_test.go` (`TestBoardFollowsTheStreamAlone`'s popstate tail and its long comment; a new `TestConsoleViewEvent`)

**Interfaces:**
- Consumes: the SSE `view` event and the POST `view` field from Task 1, payload keys `query`/`card`/`tab`/`panel`/`theme`.
- Produces: a document CustomEvent `view` whose detail is the SSE payload verbatim, and the page behaviour the lab's Task 3 mechanic checks.

- [ ] **Step 1: Write the failing driver test**

First extend the fake sandbox in `TestBoardFollowsTheStreamAlone` (events_test.go around 1106-1153): give `history` a `pushState` that records (`pushed.push(path)`), and give `document` a `removeEventListener` that filters the listener arrays, plus a `querySelector` that returns the theme button the test builds.

Then rework that test's popstate tail (the block after the `// Back to an entry whose q is not the box's...` comment, around 1366-1375): the handler no longer dispatches the find's input; it puts the entry's q in the box and reads the board only when its query differs. Cover both: a popstate whose search equals the board's `data-query` (no read, box synced, nothing typed) and one whose search differs (one board read under the entry's query). Update the long comment above the test (around 1062-1083) to say so.

Then add the new test, after `TestBoardFollowsTheStreamAlone`, with its own driver (copy the fake kit from it, trimmed as needed):

```go
// TestConsoleViewEvent: the agent's view change (282) holds for the page
// as a click does. The event's query pushes the URL beside the open
// doc= and the drawer's hash and reads the board under it; with no board
// on the page it touches nothing. The card opens the drawer as its link
// does and the tab is clicked once the drawer's swap is in, a swap that
// never comes leaving the listener armed for the next one. Card ""
// closes the drawer. The panel works the fold and the theme the theme's
// own button. Back reads the board under the entry's query and puts the
// entry's q in the box without running the find.
func TestConsoleViewEvent(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("no node")
	}
	// the driver: the full fake kit of TestBoardFollowsTheStreamAlone
	// (el, EventSource, sandbox with history.pushState, document with
	// querySelector and removeEventListener), then:
	//
	// listeners.DOMContentLoaded.forEach(function (fn) { fn(); });
	// with byID holding board (dataset.query "?project=code"), drawer
	// (hidden, querySelector returning the tab button for "tab=chat"),
	// the fold's element and the theme's buttons; location carrying
	// href "http://lab/?project=code&doc=docs/a.md", search, hash "";
	// then, in order, collecting into out:
	//
	// fire("view", {query: "?project=code&q=exp"}):
	//   pushed ["/?project=code&doc=docs%2Fa.md&q=exp"],
	//   dataset.query "?project=code&q=exp",
	//   one read "GET /board?project=code&q=exp"
	// fire("view", {query: "?project=code"}) while that read is in
	//   flight (locked): the read queues behind it and goes out after
	//   the first settles
	// fire("view", {card: "t-9", tab: "chat"}): hash "#card=t-9",
	//   then fire("hashchange", {}) opens the drawer (its read), then
	//   fire("htmx:afterSwap", {target: drawer}) clicks the tab button
	//   once; a second afterSwap on the drawer clicks nothing more
	// fire("view", {card: ""}): the drawer closes, the hash clears
	// fire("view", {panel: "closed"}): the fold's hidden flips true
	// fire("view", {theme: "light"}): the light theme button clicks
	// with the board gone from byID, fire("view", {query: "?project=code"}):
	//   no push, no read, no throw
	// a popstate onto search "?project=code": the board (back in byID,
	// dataset.query "?project=code&q=exp") reads under the entry's
	// query and #q holds "" without an input event
	//
	// console.log(JSON.stringify(out)); compare to the want golden.
	const driver = `...` // the full driver text, built as above
	cmd := exec.CommandContext(t.Context(), node, "-e", driver, "static/console.js")
	...
}
```

Write the driver out in full following the sketch: it is the neighbouring test's kit plus the sequence above. Run it once, read the printed `out`, check every field against the expectations named in the sketch (they are the assertions), and only then paste it as the `want` golden. If a field's value differs from the sketch, find out why in the code before accepting it.

- [ ] **Step 2: Run to verify it fails**

Run: `go test ./internal/console/ -run 'TestConsoleViewEvent|TestBoardFollowsTheStreamAlone' -v`
Expected: FAIL (no view listener, popstate still dispatches input).

- [ ] **Step 3: Implement chat.js**

In the `event` chain of `run` (after the `applied` line, before `error`):

```js
      else if (ev.event === "view") document.dispatchEvent(new CustomEvent("view", {detail: d}));
```

Near `turn`, the helper:

```js
  // pageQuery is the view the page stands on (282): the board's query the
  // chat's POST carries, so the agent's view tools work the page the
  // member looks at, not a page of their own
  function pageQuery() {
    var b = document.getElementById("board");
    return b && b.dataset.query ? b.dataset.query : "";
  }
```

And the POST body in `turn`:

```js
    run(n, base, new URLSearchParams({message: text, conversation: n, view: pageQuery()}).toString(), into).then(function () {
```

- [ ] **Step 4: Implement console.js**

Replace the popstate handler at lines 161-166. Move its registration into the scope that holds `board()` and `swapBoard()` (the stream IIFE; the old handler's scope loses it entirely):

```js
  // Back and Forward follow the URL's query: the find's box takes the
  // entry's q without a run of the find, and the board reads the entry's
  // query when it differs from the one it stands on (282)
  window.addEventListener("popstate", function () {
    var q = new URLSearchParams(location.search).get("q") || "", i = document.getElementById("q");
    if (i && i.value !== q) i.value = q;
    var b = board();
    if (b && b.dataset.query !== location.search) {
      b.dataset.query = location.search;
      swapBoard();
    }
  });
```

In the stream IIFE, after `swapBoard`:

```js
  // the agent's view change (282): the merged query holds for this page
  // as a click's does, nothing stored, so it pushes the URL beside the
  // open document's doc= and the drawer's hash, then reads the board
  // under it, the guards of a read holding as ever
  document.addEventListener("view", function (e) {
    var d = e.detail || {}, b = board();
    if (typeof d.query !== "string" || !b) return;
    var u = new URL(location.href);
    u.search = d.query;
    var doc = new URLSearchParams(location.search).get("doc");
    if (doc !== null) u.searchParams.set("doc", doc);
    history.pushState(history.state, "", u.pathname + u.search + location.hash);
    b.dataset.query = d.query;
    swapBoard();
  });
```

In the drawer block (the scope holding `showDrawer` and `closeDrawer`):

```js
// the agent's view change opens the drawer's card as its link does, the
// tab clicked once the drawer's own swap is in, and card "" closes it
// (282)
document.addEventListener("view", function (e) {
  var d = e.detail || {};
  if (d.card === "") return closeDrawer();
  if (typeof d.card !== "string") return;
  var want = "#card=" + encodeURIComponent(d.card);
  if (location.hash === want) showDrawer();
  else location.hash = want;
  if (!d.tab || d.tab === "overview") return;
  document.addEventListener("htmx:afterSwap", function tab(ev) {
    if (!ev.target || ev.target.id !== "drawer") return;
    document.removeEventListener("htmx:afterSwap", tab);
    var b = ev.target.querySelector('button[hx-get*="tab=' + d.tab + '"]');
    if (b) b.click();
  });
});
```

In the status fold IIFE (the scope holding `toggleStatus`):

```js
  // the agent's view change folds or unfolds the status panel (282)
  document.addEventListener("view", function (e) {
    var d = e.detail || {};
    if (d.panel === "open" || d.panel === "closed") toggleStatus(d.panel === "open");
  });
```

In the theme IIFE:

```js
  // the agent's view change sets the theme as its button does (282)
  document.addEventListener("view", function (e) {
    var d = e.detail || {};
    if (d.theme !== "dark" && d.theme !== "light") return;
    var b = document.querySelector('button[data-theme-set="' + d.theme + '"]');
    if (b) b.click();
  });
```

Place each listener in the IIFE whose functions it names, matching the file's registration style (`addEventListener` on `document`, as the neighbouring handlers do).

- [ ] **Step 5: Run the tests**

Run: `go test ./internal/console/ -run 'TestConsoleViewEvent|TestBoardFollowsTheStreamAlone|TestChatPanelScript' -v && go test -race ./...`
Expected: PASS everywhere, `TestChatPanelScript` untouched (its sandbox never runs `event`).

- [ ] **Step 6: Commit**

```bash
git add internal/console/static/chat.js internal/console/static/console.js internal/console/events_test.go
git commit -m "console: the view event holds for the page as a click does (282)

The chat's POST carries the board's query; the view event the answer
carries is applied through the machinery a click uses: a pushed URL, the
board read under it, the drawer's hash, the fold and the theme's button,
and Back and Forward follow the URL.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: The lab mechanic

**Files:**
- Modify: `scripts/console-lab/check.js` (a new `viewChange` mechanic, wired into `main` beside `findAsYouType`)
- Test: the lab itself, `bash scripts/console-lab/run.sh`

**Interfaces:**
- Consumes: the DOM `view` CustomEvent Task 2's console.js listens for, detail keys `query`/`card`/`tab`/`panel`/`theme`.
- Produces: the structural check that the apply works in a real browser (the SSE-to-DOM line in chat.js stays covered by review: the lab's gateway is 127.0.0.1:9, so the mechanic dispatches the DOM event directly, which is the client-side trigger the lab's scenes use).

- [ ] **Step 1: Write the mechanic**

In `check.js`, after `findAsYouType`:

```js
// viewChange: the agent's view change (282) holds for the page as a
// click does. The event's query pushes the URL beside the open doc=,
// reads the board under it and leaves one more history entry; Back
// reads the entry's board again; the card opens the drawer and the tab
// lands once the drawer is in; reset closes the drawer and clears the
// URL's controls; the panel and the theme work their own controls.
async function viewChange(p, query, fails) {
  const page = p.page, label = "view change", cards = "#board [data-card]";
  await page.goto(base + "/" + query, { waitUntil: "load" });
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => history.length);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("view",
    {detail: {query: "?project=ai-software-factory-code&q=login"}})));
  await page.waitForTimeout(900);
  const at = new URL(page.url()).searchParams;
  if (at.get("q") !== "login" || !at.get("project")) fails.push(label + ": the URL holds " + page.url());
  if ((await page.evaluate(() => history.length)) !== before + 1) fails.push(label + ": the change leaves no history entry");
  const shown = await page.locator(cards).allInnerTexts();
  if (!shown.length || shown.some((t) => !t.toLowerCase().includes("login"))) fails.push(label + ": the board shows " + shown.length + " cards that do not say login");
  await page.goBack({ waitUntil: "load" });
  await page.waitForTimeout(600);
  if (new URL(page.url()).searchParams.get("q")) fails.push(label + ": Back leaves q in the URL (" + page.url() + ")");
  if ((await page.locator(cards).count()) < shown.length + 1) fails.push(label + ": Back does not read the entry's board");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("view",
    {detail: {query: "?project=ai-software-factory-code", card: "t-1", tab: "chat", panel: "closed", theme: "light"}})));
  await page.waitForTimeout(900);
  const card = new URL(page.url()).hash;
  if (card.indexOf("#card=") !== 0) fails.push(label + ": the drawer's hash is " + card);
  if (!(await page.locator("#drawer").isVisible())) fails.push(label + ": the drawer does not show");
  if (!(await page.locator("#drawer .tabs button[aria-current=\"true\"], #drawer .tabs .on").first().isVisible())) fails.push(label + ": the tab does not land");
  if (await page.evaluate(() => document.documentElement.getAttribute("data-theme") || localStorage.getItem("theme")) !== "light") fails.push(label + ": the theme does not change");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("view", {detail: {query: "?project=ai-software-factory-code", card: ""}})));
  await page.waitForTimeout(600);
  if (await page.locator("#drawer").isVisible()) fails.push(label + ": reset does not close the drawer");
  if (new URL(page.url()).searchParams.toString() !== "project=ai-software-factory-code") fails.push(label + ": reset leaves " + new URL(page.url()).searchParams);
}
```

Adapt the selectors to what the pages really hold before running: the drawer's tab buttons' shape (`#drawer` visibility, the current tab's marking) and the theme's storage (`data-theme` attribute or the `theme` localStorage key, whichever the theme IIFE sets). The `card: "t-1"` id: use a card the busy scenario really holds (`labID` of one of its issues, as neighbouring scenes do).

Wire it into the lab's run where `findAsYouType` is called, on the busy scenario's board, with a query that holds a find and a menu choice so the merge is visible.

- [ ] **Step 2: Run the lab**

Run: `bash scripts/console-lab/run.sh`
Expected: exit 0, no failure lines, every shot and check green including the new mechanic.

- [ ] **Step 3: Commit**

```bash
git add scripts/console-lab/check.js
git commit -m "lab: the view change mechanic holds for the page as a click does (282)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### After the tasks: the controller's steps

The whole-branch review (most capable model), the ff-merge to `main`, the push to `origin` and `github`, and the docs (roadmap 282 marked built with the hashes, the ledger, the report) are the controller's, per the subagent-driven-development skill.
