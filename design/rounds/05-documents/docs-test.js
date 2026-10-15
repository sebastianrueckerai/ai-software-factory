// node design/rounds/05-documents/docs-test.js
var path = require("path");
global.window = {};
require(path.join(__dirname, "docs.js"));
var D = window.DOCS;
var fails = [];
function check(cond, msg) { if (!cond) fails.push(msg); }
function eq(a, b, msg) { check(a === b, msg + ": got " + JSON.stringify(a) + ", want " + JSON.stringify(b)); }
function has(h, s, msg) { check(h.indexOf(s) >= 0, msg + ": missing " + s); }

var paths = Object.keys(D.files);
eq(paths.length, 9, "file count");
paths.forEach(function (p) {
  check(D.files[p].title, p + " has a title");
  check(D.files[p].md && D.files[p].md.length > 0, p + " has md");
  check(/^[0-9a-f]{7}$/.test(D.files[p].sha), p + " sha is 7 hex");
});
eq(D.files["docs/roadmap.md"].sha, "603d2e6", "roadmap sha");

var missing = 0;
var html = {};
paths.forEach(function (p) {
  html[p] = D.render(D.files[p].md, p);
  var re = /data-doc="([^"]+)"/g, m;
  while ((m = re.exec(html[p]))) check(D.files[m[1]], p + " links to unknown " + m[1]);
  missing += (html[p].match(/doc-missing/g) || []).length;
});
has(html["docs/roadmap.md"], 'data-doc="docs/plans/2026-10-15-backlog-pull-and-close-out.md"', "roadmap render");
has(html["docs/roadmap.md"], 'data-doc="docs/layers.md"', "roadmap render");
has(html["docs/plans/2026-10-15-backlog-pull-and-close-out.md"], 'data-doc="docs/layers.md"', "backlog render");
has(html["docs/plans/2026-10-15-backlog-pull-and-close-out.md"], 'data-doc="docs/architecture.md"', "backlog render");
has(html["docs/board/roadmap.md"], 'data-doc="docs/roadmap.md"', "board roadmap render");
check(missing >= 2, "doc-missing links: " + missing);
has(html["docs/roadmap.md"], 'class="doc-link doc-missing" title="not in this prototype" href="#"', "missing link shape");

has(D.render("**a <b> c**", "docs/x.md"), "&lt;b&gt;", "escape");
has(D.render("```\ncode <x>\n```", "docs/x.md"), "<pre><code>code &lt;x&gt;</code></pre>", "fence");
has(D.render("1. one\n2. two", "docs/x.md"), "<ol><li>one</li><li>two</li></ol>", "ordered list");
has(D.render("- a\n- b", "docs/x.md"), "<ul><li>a</li><li>b</li></ul>", "unordered list");
has(D.render("> quoted", "docs/x.md"), "<blockquote>", "blockquote");
has(D.render("## Hello World", "docs/x.md"), '<h2 id="hello-world">', "heading id");
has(D.render("[a](plans/2026-10-13-main-chat-docs.md#top)", "docs/roadmap.md"),
  'data-doc="docs/plans/2026-10-13-main-chat-docs.md" href="#doc=docs/plans/2026-10-13-main-chat-docs.md#top"', "fragment link");
has(D.render("[a](../layers.md)", "docs/plans/x.md"), 'data-doc="docs/layers.md"', "parent link");
has(D.render("[a](https://e.com/x)", "docs/x.md"), 'class="doc-link doc-ext" href="https://e.com/x" target="_blank" rel="noopener"', "external link");

var fp = D.firstParagraph("docs/roadmap.md");
check(fp.indexOf("This file is the factory's memory") === 0, "firstParagraph start");
check(!/[\[*]/.test(fp), "firstParagraph has no marks");
check(fp.length <= 280, "firstParagraph length");

var t = D.tree();
eq(t.length, 1, "tree roots");
eq(t[0].name, "docs", "tree root name");
check(t[0].files.length > 0, "docs has files");
var plans = t[0].dirs.filter(function (d) { return d.name === "plans"; })[0];
var board = t[0].dirs.filter(function (d) { return d.name === "board"; })[0];
check(plans && plans.files.length === 4, "plans has four files");
check(board && board.files.length === 1, "board has one file");

var n = D.nav;
var a = "docs/a.md", b = "docs/b.md", c = "docs/c.md";
eq(n.current(), null, "nav empty");
check(!n.canBack() && !n.canForward(), "nav empty cannot move");
n.open(a); n.open(b);
eq(n.current(), b, "after open b");
check(n.canBack() && !n.canForward(), "can back only");
eq(n.back(), a, "back");
check(!n.canBack() && n.canForward(), "can forward only");
eq(n.forward(), b, "forward");
n.back();
n.open(c);
eq(n.forward(), null, "forward dropped");
eq(n.stack.join(), [a, c].join(), "stack after fork");
eq(n.index, 1, "index");
eq(n.recent().join(), [c, b, a].join(), "recent");
eq(n.fromHash(n.hash(a)), a, "hash round trip");
eq(n.fromHash("#nothing"), null, "fromHash miss");

var p = "docs/roadmap.md", old = D.files[p].sha;
var r = D.save(p, "# Roadmap\n\nchanged");
check(r.ok && r.sha !== old && /^[0-9a-f]{7}$/.test(r.sha) && r.at === "14:12", "save ok");
eq(D.files[p].md, "# Roadmap\n\nchanged", "save stores md");
D.conflictNext(p);
r = D.save(p, "mine");
check(!r.ok && r.by === "Sebastian" && r.at === "14:08" && r.current === "# Roadmap\n\nchanged", "conflict refuses");
eq(D.files[p].md, "# Roadmap\n\nchanged", "refusal keeps md");
check(D.save(p, "mine").ok, "second save succeeds");
var np = D.newPath("My New Doc");
eq(np, "docs/my-new-doc.md", "newPath");
D.save(np, "# Fresh start\n\ntext");
eq(D.files[np].title, "Fresh start", "new file title");
eq(D.files[np].changed, null, "new file unchanged");

var labels = {
  "docs/roadmap.md": "roadmap", "docs/plans/2026-09-24-build-plan.md": "build plan",
  "docs/plans/2026-10-15-backlog-pull-and-close-out.md": "backlog plan", "docs/layers.md": "layers",
  "docs/architecture.md": "architecture", "docs/board/roadmap.md": "board roadmap"
};
Object.keys(labels).forEach(function (k) { eq(D.label(k), labels[k], "label " + k); });
eq(D.label("docs/target-architecture.md"), "target-architecture", "label default");
eq(D.pins.length, 3, "pins");

if (fails.length) { fails.forEach(function (f) { console.log("FAIL " + f); }); process.exit(1); }
console.log("ok docs.js");
