# Documents in the Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A member drags a document onto the project chat, it rides as a named chip until the message is sent, then it belongs to the thread for the conversation's life; the agent reads it with tools (head, line ranges, search) and can hand it to a one-shot summariser, and the bytes never enter its context.

**Architecture:** The image attachment spine is roadmap 300's first slice, merged at `cb7f8888`: `chat_attachments` rows hold the meta, the timelines object store holds the bytes under `attachments/{conversation}/{id}`, the multipart `POST /projects/{name}/chat` carries file parts, and `GET /projects/{name}/chat/attachments/{id}` serves them back. Documents are that spine's second kind: sniffed text and PDF parts on the same endpoint, rows in the same table, bytes under the same prefix, no schema change. Reading rides `read_doc`'s engine, extracted from `autonomy.go` and shared. The subagent of the roadmap's shape is a one-shot model call beside `OperatorModel.Vision`, on the chat's own model and purpose, so the gateway changes not at all.

**Tech Stack:** Go (html/template + htmx console inside factoryd), PostgreSQL (CNPG), plain JS in `internal/console/static/chat.js`, S3 object store behind the existing `ObjectStore` port. No new dependencies, no migration.

**Spec:** `docs/roadmap.md` item 300 in this repository, plus this plan's Decisions. State found on 2026-10-19: the image slice (commits `cb94df23`, `2f80c724`, `cb7f8888`, migration `20261029000000_chat_attachments.sql` whose header names "roadmap 300's attachment spine, images first") is the only landed part of 300. No branch, no migration and no code for chat documents exists anywhere. Two in-flight branches share files with this work: `factory/intake-switch` (the composer's own bar in `chat.html`, the `turn` struct in `chat.go`, `toolInput` in `chat_tools.go`) and `waiting-cards` (`chat.js`, `ports.go`, `settleCounts` in `chat.go`). Rebase over both before pushing.

## Decisions

- **Bytes: same table, same prefix.** A document is a `chat_attachments` row with `name` `doc1`..`docN` and its bytes at `attachments/{conversation}/{id}`, exactly as images. Rows and bytes are never deleted: the conversation's life, by construction.
- **Bounds.** At most 4 documents ride one message, each at most 32 MiB (a log worth dragging). `chatPostRoom` grows from 40 MiB to 168 MiB to cover 4 images and 4 documents with slack. File names truncate at 200 runes as images do. The message still needs its words: an empty text with a document is refused as today.
- **Types, settled by sniffing.** The server sniffs with `http.DetectContentType`, never the client's header. `text/*` rides as a text document the tools read. `application/pdf` rides as a stored, served member of the thread whose words no tool reads. `image/*` keeps routing to the image path (a mixed drop sorts by kind). Everything else is refused at intake: `run.log.zip: a document is text or a PDF`.
- **Handles.** `doc1`..`docN` per message by arrival, the image pattern. Resolution scans the conversation's documents newest-first; a wrong name refuses naming what exists, as `analyze_image` does.
- **The tools.** `read_attachment(name, from, to, find, regex)`: `read_doc`'s parameters over thread bytes, with `read_doc`'s caps (first 20 KiB shown, 12 find lines) and refusal voice. The head: `doc1 (spec.md): 2405 bytes, 98 lines, base_sha256 <hex>.` A PDF refuses with the fitting action: `doc1 (report.pdf) is a PDF, not text: paste the words you need as text, or attach an image of the page.` `summarize_attachment(name, ask)`: one model call on the chat's own model, fed the document's first 48 KiB, returning `doc1 (spec.md, the first 48 KiB of 2.1 MiB): <answer>` when it cut the text, `doc1 (spec.md): <answer>` when it did not. The cut prefix is built by the tool, never by the model.
- **The subagent.** The roadmap's "hand a document to a subagent" is the one-shot summariser above. No session-spawn tool, no new session machinery.
- **The log.** A message's documents render as link chips (name and human size) to the serving endpoint, beside the image thumbs. The model's replay line mirrors images: `[attached documents: doc1 (spec.md, 1.2 MiB)]`.
- **The chip's look reuses the image chip's.** No design round: the shipped console look carries it, and a round for a text chip next to the image chip would decide nothing new.

## Non-goals

- No PDF text extraction. A PDF rides, is stored and is served, and the reading tools refuse it with the action above. Extraction is a later card if Sebastian misses it.
- No removal of a document after its message is sent. The × works only before send, the shape Sebastian drew.
- No file picker, no object-store lifecycle work. `ObjectStore` stays `Put`/`Get`.
- No gateway change. The summariser is a plain text call on the chat model and purpose, which the gateway already admits for this task.

## Global Constraints

- `go test -race ./...` green on all packages; `gofmt` empty, `go vet` clean, `gosec` 0.
- PG-backed tests run with `FACTORYD_TEST_DATABASE_URL` set (`scripts/pg-test.sh` or the docker Postgres, as earlier cards did).
- No new dependency. No migration; if one proves unavoidable, its timestamp sorts after `20261029010000_routine_needs_me`.
- `read_doc`'s tests stay green and unedited through the engine extraction: extraction changes no behaviour.
- Comments minimal, the codebase's plain lowercase voice. Every UI string through the template helpers and escapers `chat.js` uses today. British spelling.
- Tests hand-derived. Never adjust an expectation to force a pass.
- Main is push-protected: land through a PR or the whitelisted controller push, as recent console work did, rebased over `factory/intake-switch` and `waiting-cards` first.

## Review Focus

1. **A mixed drop, images and text files together:** the handler sorts each file by sniffed kind into its strip, one message carries both, and each count is checked per kind. Pinned in Task 1's intake test.
2. **Two messages each carrying a `doc1`:** resolution takes the newest and a wrong name lists the thread's documents. Pinned in Task 3's resolution test.
3. **A PDF end to end:** intake admits it, the chip and the serving endpoint work, and `read_attachment` refuses with the fitting action, not an error. Pinned in Tasks 1 and 3.
4. **An empty or single-line text document:** the head names 0 or 1 lines as it is, and a range refusal names the real bounds (`inside lines 1 to 1`). Pinned in Task 3's range test.
5. **A 33 MiB file at intake:** refused with `doc1 (name): a document is at most 32 MiB` before any row or byte is written. Pinned in Task 1's intake test.
6. **Summarising a document over 48 KiB:** the tool, not the model, names the cut, and the fed text is the first 48 KiB trimmed to valid UTF-8 at a line boundary. Pinned in Task 4's summarise test.

---

### Task 1: Document intake, storage and replay

**Files:**
- Modify: `internal/console/chat.go:34-41` (consts), `:471-545` (`chatPost` intake and storage), `:561-605` (`chatImages` and its `chatImage` struct), `:997-1042` (`replay`, `imageSize`)
- Test: `internal/console/chat_test.go`

**Interfaces:**
- Consumes: `AddChatAttachment`, `Timelines.Put` (unchanged), the multipart field name `documents`.
- Produces: `chatDocuments(r *http.Request) ([]chatDocument, string)` beside `chatImages`; `type chatDocument struct` mirroring `chatImage`; consts `chatDocMax = 4`, `chatDocBytes = 32 << 20`, `chatPostRoom = 168 << 20`. Rows: `name` `doc1`..`docN`, the sniffed `content_type`. Replay: the documents line. Later tasks read these rows through the existing `ChatAttachments`.

- [ ] **Step 1: Write the failing tests**

`TestChatPostDocuments`, in the style of the image intake tests: one multipart post with a `documents` part of `text/plain` bytes writes a `doc1` row (name, file name, content type, bytes) and PUTs the bytes under `attachments/{conversation}/{id}` in the fake store; an `application/pdf` part is admitted the same way; a sniffed zip is refused 400 with `run.log.zip: a document is text or a PDF`; a fifth document is refused with `at most 4 documents ride one message`; a 33 MiB part is refused with `doc5 (big.log): a document is at most 32 MiB`; empty text with a document is refused with `a message of up to 8 KiB is required`. `TestChatReplayNamesDocuments`: a turn's replay holds `[attached documents: doc1 (spec.md, 1.2 MiB)]` beside the images line, via `imageSize`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `go test ./internal/console/ -run 'TestChatPostDocuments|TestChatReplayNamesDocuments' -race`
Expected: FAIL, no `documents` field is read today.

- [ ] **Step 3: Implement the intake**

`chatDocuments` mirrors `chatImages` (chat.go:572-605) part for part: read the `documents` parts, refuse past `chatDocMax`, sniff each with `http.DetectContentType`, admit `text/*` and `application/pdf` only, truncate the file name at 200 runes. `chatPost` calls it beside `chatImages`, refuses on its message, and after the message row stores each document exactly as images (chat.go:534-545): `AddChatAttachment` with `name` `docN` by arrival, then `Timelines.Put` at `attachments/{conversation}/{id}`. Raise `chatPostRoom` to `168 << 20`. `replay` appends the documents line after the images line, same format with `doc` names.

- [ ] **Step 4: Run the package tests**

Run: `go test ./internal/console/ -run 'TestChatPost|TestChatReplay' -race`
Expected: PASS, and the image tests unedited and green.

- [ ] **Step 5: Commit**

```bash
git add internal/console/chat.go internal/console/chat_test.go
git commit -m "console: text and PDF documents ride the chat message beside images"
```

### Task 2: The chip at the input and the chip in the log

**Files:**
- Modify: `internal/console/static/chat.js:61-70` (`userHTML`), `:404-423` (queue), `:514-556` (`drawImages`, `addImages`, paste and drop), `:694-726` (`send`, `turn`)
- Modify: `internal/console/templates/chat.html:18` (the strip beside `chat-images`)
- Modify: `internal/console/static/console.css:806-812` (the chip rule beside the thumbs)

**Interfaces:**
- Consumes: Task 1's `documents` multipart field; the messages JSON's `attachments` rows, which already carry `id`, `name`, `file_name`, `content_type` and `bytes` (images ride them today).
- Produces: the member-visible shape: a chip per pending document with its file name and a small ×, nothing sent before the message, and a link chip per document on a sent message.

- [ ] **Step 1: Route the drop and the paste by kind**

The paste handler (chat.js:530-540) and the drop handler (:542-546) send each file to `addImages` when its type matches `image/*` and to the new `addDocuments` otherwise. `addDocuments` mirrors `addImages` (:522-528): cap 4 pending, dense `doc1`..`docN` names, no size check the server does not repeat.

- [ ] **Step 2: Draw the chips**

`drawDocuments` mirrors `drawImages` (:514-521) into a new `<ol id="chat-docs">` beside `chat-images` (chat.html:18): each chip shows `doc1 spec.md 1.2 MiB` and an × that removes it and renumbers, exactly the image chip's behaviour (:548-556). One CSS rule beside the thumbs: text chip, no thumbnail.

- [ ] **Step 3: Send and render**

`send` (:694-697) moves pending documents into the queue item and the queue line shows `· N documents` beside `· N images` (:423). `turn` (:706-726) appends one `documents` file part each beside the `images` parts (:723-725). `userHTML` (:61-70) renders a non-image attachment row as `<a class="chip" href="<base>/attachments/<id>">spec.md · 1.2 MiB</a>` beside the thumbs div, the row's `content_type` deciding thumb against chip.

- [ ] **Step 4: Check the syntax and the suite**

Run: `node --check internal/console/static/chat.js && go test ./internal/console/ -race`
Expected: both clean. The lab scenario that pins the browser flow lands in Task 5.

- [ ] **Step 5: Commit**

```bash
git add internal/console/static/chat.js internal/console/templates/chat.html internal/console/static/console.css
git commit -m "console: a dragged document rides as a named chip and stays a link in the log"
```

### Task 3: The reading tool, on read_doc's engine

**Files:**
- Modify: `internal/console/autonomy.go:430-504` (`readDoc`), extracting the shared engine
- Modify: `internal/console/chat.go:1044-1078` (the reader beside `lookImage`)
- Modify: `internal/console/chat_tools.go:1355-1365` (the definition beside `read_doc`), `:1574-1578` (`toolNotes`)
- Modify: `internal/policy/policy.go:128-131` (`ChatTools`), `internal/console/access.go:161` (the tool role)
- Test: `internal/console/autonomy_test.go`, `internal/console/chat_test.go`, `internal/policy/access_test.go`, the two offer goldens (controller, bob)

**Interfaces:**
- Consumes: `ChatAttachments(ctx, repository, login, conversation)` rows, `Timelines.Get`, `factoryd.ContentHash`, the caps `docShown` and `docFinds` in `autonomy.go`.
- Produces: `readTextDocument(label string, data []byte, from, to int, find string, regex bool) (string, error)` in `autonomy.go`, the shared head/range/find engine; `readDoc` calls it with its repository label, the attachment reader with the chip label. Tool `read_attachment`, a read tool (replay elides it as any read).

- [ ] **Step 1: Extract the engine with read_doc green**

Move the body of `readDoc`'s from/to/find/head logic (autonomy.go:444-502) into `readTextDocument(label, data, from, to, find, regex)`, `readDoc` composing its label `"%s on %s@master"` and calling it. Every string stays byte for byte. Run `go test ./internal/console/ -run TestReadDoc -race`: PASS with the `read_doc` tests unedited.

- [ ] **Step 2: Write the failing tool tests**

`TestReadAttachmentHeadRangesAndFind`, over a seeded row and the fake object store, mirroring `TestReadDocRangesAndPatterns`: the head is `doc1 (spec.md): <N> bytes, <M> lines, base_sha256 <hash>.` plus the same first-20-KiB hint sentence; a from/to slice reads `line %d: %s`; find and regex find their lines; a zero-match and a bad range refuse with the engine's exact strings. `TestReadAttachmentRefusalNamesState`: an unknown name refuses with `no document "doc9": the conversation's documents are doc1`; a PDF row refuses with `doc1 (report.pdf) is a PDF, not text: paste the words you need as text, or attach an image of the page.`; two `doc1` rows resolve newest-first.

- [ ] **Step 3: Run them to verify they fail**

Run: `go test ./internal/console/ -run 'TestReadAttachment' -race`
Expected: FAIL, no such tool.

- [ ] **Step 4: Implement the tool**

The definition beside `read_doc` (chat_tools.go:1355-1365): params `name` (required, `the document's name, doc1 as its row shows`), `find`, `from`, `to`, `regex`, the same phrases as `read_doc`'s. The reader beside `lookImage` (chat.go:1044-1078): scan `ChatAttachments` newest-first for the name among non-image rows, refuse naming what exists, fetch the bytes at `attachments/{conversation}/{id}`, refuse a PDF with the copy above, then head (`ContentHash`, line count, the engine's format with the `doc1 (file.name)` label) and the engine. Register in `ChatTools`, role `rMember`, one `toolNotes` line: it reads the thread's documents in chunks, never the whole file. Extend `access_test`'s tool count and both offer goldens.

- [ ] **Step 5: Run the tests and commit**

Run: `go test ./internal/console/ ./internal/policy/ -race`
Expected: PASS.

```bash
git add internal/console/autonomy.go internal/console/chat.go internal/console/chat_tools.go internal/policy/policy.go internal/console/access.go internal/console/autonomy_test.go internal/console/chat_test.go internal/policy/access_test.go
git commit -m "console: read_attachment gives the thread's documents read_doc's depth"
```

### Task 4: The one-shot summariser

**Files:**
- Modify: `internal/factoryd/operator.go:95-115` (`Summarize` beside `Vision`)
- Modify: `internal/console/chat.go` (the summariser beside the Task 3 reader)
- Modify: `internal/console/chat_tools.go` (the definition beside `read_attachment`), `internal/policy/policy.go:128-131`, `internal/console/access.go:161`
- Test: `internal/console/chat_test.go`, `internal/factoryd/operator_test.go`, `internal/policy/access_test.go`, the offer goldens

**Interfaces:**
- Consumes: Task 3's resolution and refusals; `OperatorModel.call` (operator.go:115+).
- Produces: `func (m *OperatorModel) Summarize(ctx context.Context, taskID int64, alias, thread, ask, text string) (string, error)`, one user message, purpose `policy.PurposeChat`, the chat task's account. Tool `summarize_attachment(name, ask)`, a read tool. Const `docSummarize = 48 << 10`.

- [ ] **Step 1: Write the failing tests**

`TestChatSummarizeAttachmentAnswersOverTheDocument`, in the shape of `TestChatAnalyzeImageLooksAtTheMembersImage`: the member sends a document, the model calls `summarize_attachment` with an ask, the stub gateway's chat arm sees the ask and the document's text on the chat task under the chat alias, and the tool's answer carries the prefix `doc1 (spec.md): `. `TestChatSummarizeNamesTheCut`: a 100 KiB document feeds the first 48 KiB trimmed to valid UTF-8 at a line boundary, and the answer's prefix reads `doc1 (big.log, the first 48 KiB of 100.0 KiB): `. `TestChatSummarizeRefusesPDF`: the PDF refusal copy, verbatim from Task 3. The tool count and goldens move again.

- [ ] **Step 2: Run them to verify they fail**

Run: `go test ./internal/console/ ./internal/factoryd/ -run 'TestChatSummarize|TestOperatorSummarize' -race`
Expected: FAIL, no such tool.

- [ ] **Step 3: Implement**

`Summarize` mirrors `Vision` (operator.go:95-104) without the image part: one user message of the ask and the text, `purpose: policy.PurposeChat`, the same hold and settle on the chat task. The tool resolves as `read_attachment` does, refuses a PDF with the same copy, cuts the bytes to `docSummarize` at a line boundary inside valid UTF-8, calls `Summarize` with `t.cfg.Model`, and returns the deterministic prefix plus the answer. `toolNotes` line: for a long document, summarise first and read ranges only where the answer points.

- [ ] **Step 4: Run the tests and commit**

Run: `go test ./internal/console/ ./internal/factoryd/ ./internal/policy/ -race`
Expected: PASS.

```bash
git add internal/factoryd/operator.go internal/console/chat.go internal/console/chat_tools.go internal/policy/policy.go internal/console/access.go internal/console/chat_test.go internal/factoryd/operator_test.go internal/policy/access_test.go
git commit -m "console: summarize_attachment hands a document to a one-shot model call"
```

### Task 5: The lab scenario and the folds

**Files:**
- Modify: `scripts/console-lab/check.js` (and `shoot.js` if the scenario wants a shot)
- Modify: `docs/roadmap.md` (item 300, Where it stands), this repository
- Modify: the ledger `.superpowers/sdd/2026-09-24-build-plan/progress.md`, this repository

**Interfaces:**
- Consumes: Tasks 1 to 4 live on the code repo's main.
- Produces: the browser flow pinned in the lab, and the roadmap and ledger telling the truth.

- [ ] **Step 1: Write the lab scenario**

In `check.js`, beside the image scenarios: drop a text file and the chip shows `doc1 spec.md` with a working ×; drop an image and a document together and each lands in its strip; send and the message's row links `spec.md` to `/attachments/<id>`; a PDF chip sends and serves. The lab worktree (`ai-software-factory-code-lab`) holds uncommitted `check.js` edits from the image work's lab round: read its state first and build on it, never around it.

- [ ] **Step 2: Run the lab**

Run the console-lab as earlier rounds did. Expected: every check ok.

- [ ] **Step 3: Fold the docs**

Read roadmap 300's current text first: the image session's design fold (C-entries, roadmap amendment) was still outstanding on 2026-10-19 and may have amended it. Then set its Where it stands to built with the commits, and write the ledger entry with the rulings this plan made (bounds, types, the summariser as the subagent). The chip reuses the image chip's look, so no design C-entry.

- [ ] **Step 4: Commit both repositories**

Code repo: the lab commit. Docs repo: the roadmap and ledger fold.

---

## Self-review notes

- Spec coverage: drag-in chip with name and × (Task 2), nothing sent before the message (Task 2, the queue), thread-life storage (Task 1, rows and bytes never deleted), head and shape (Task 3), line-range chunks (Task 3), word and pattern search (Task 3), subagent summarise or answer (Task 4, `ask` carries either), bytes home settled (Decisions, the timelines' store), size and count bounds settled (Decisions), text types and the rest settled (Decisions), the log shows the document (Tasks 1 and 2).
- The 8 KiB message bound stays: a document never widens it, it rides beside the words.
- Type consistency: `chatDocument` mirrors `chatImage`; `readTextDocument` is the one engine name; `docSummarize` names the cut everywhere it appears.
