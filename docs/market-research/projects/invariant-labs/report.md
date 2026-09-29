---
name: Invariant (Guardrails, Explorer, Gateway)
slug: invariant-labs
url: https://invariantlabs.ai
repo: https://github.com/invariantlabs-ai/invariant
category: policy-identity
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, via Docker or Docker Compose; the free hosted Explorer and gateway cloud service was shut down in January 2026
company: Invariant Labs AG, Zurich; ETH Zurich spin-off founded 2024 by Martin Vechev and Florian Tramer, no disclosed funding, about 10 staff; acquired by Snyk in June 2025
maturity: 465/82/63 GitHub stars across invariant, invariant-gateway, explorer; 3 listed contributors on the core repo; created 2024-05-08; last push 2026-01-12 (core, explorer), 2025-11-06 (gateway); hosted product discontinued January 2026
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 0
  ux: 2
  reseedable_selfhost: 2
steal:
  - The flow-matching DSL operators -> (eventually) and ~> (immediately next) over a trace of Message/ToolCall/ToolOutput events, for rules like "no send_email after get_inbox" (invariant/analyzer/language).
  - The ready-made detector catalogue as a checklist for our own untrusted-input handling: PII via Presidio, secrets, a prompt-injection classifier, a semgrep-based code check, moderation (invariant/analyzer/stdlib/invariant/detectors/).
  - Monitor's de-duplicating incremental check: an error fires once per trace location even if the condition persists (invariant/analyzer/monitor.py), a pattern worth copying into our supervisor's cheap detectors.
  - Enforcing behavioural policy at the LLM/MCP proxy choke point, blocking before a call reaches the provider or before a tool result reaches the agent, as a hook alongside factory-gateway's existing pricing and authorization checks.
  - Proof that a minimal, Python-like external policy DSL is enough; it does not need to be a general-purpose language, just pattern matching over a typed event trace.
differs:
  - Invariant has no task, identity, sandbox or budget concept. It covers only the content and behaviour slice of "policy outside the model," so at most it is a library called from inside factory-gateway, never a stand-in for our control or worker plane.
  - Its enforcement key is a second static API key alongside the real provider key, not a short-lived per-task credential. Copying its gateway model as-is would reintroduce the long-lived-secret problem our projected ServiceAccount tokens specifically avoid.
  - The company folded into Snyk about a year after founding and killed its only hosted product eight months later. Treat this project as reference material to learn a DSL shape from, not as a dependency to run.
ux_verdict: A code-first rule DSL and a trace viewer for developers, no task or approval concept, so nothing here for a non-technical reviewer to click through.
slop_verdict: Real, used code across three repos, including an ACM/IEEE citation, but effectively frozen. The parent folded it into a paid product and shut down the only hosted instance in January 2026.
---

# Invariant (Guardrails, Explorer, Gateway)

## 1. What it is
Invariant Labs built three linked open source pieces: invariant (branded Guardrails, a rule-based DSL and analyzer engine, PyPI package invariant-ai), explorer (a web app to browse and debug agent traces), and invariant-gateway (a reverse proxy in front of OpenAI, Anthropic and Gemini plus MCP servers that captures traces and applies Guardrails rules inline). The pitch is a "contextual security layer" that sits between an agent and its model or tools without code changes to the agent itself, catching prompt injection, PII leaks, secrets, and behaviours the makers named themselves, such as "tool poisoning" and "MCP rug pulls."

The company is a 2024 ETH Zurich spin-off (professors Martin Vechev and Florian Tramer plus three graduates), no disclosed outside funding, about 10 staff. Snyk acquired it in June 2025 to feed its AI Trust Platform. The claim on the current invariantlabs.ai homepage is still "Making AI agents work." What the repositories actually show: a genuinely usable small policy engine, a companion web UI whose hosted instance is gone, and a proxy repo with unfixed copy-paste errors in its own README examples.

## 2. Mapping to our five planes
| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. No issue, alert or webhook intake of any kind. | Forgejo webhooks, SigNoz alerts, factoryd intake API. | not comparable |
| Control plane | None. No task registry, scheduler or approval state. | factoryd with a Temporal workflow per task. | not comparable |
| Worker plane / sandbox | None. It never executes agent code, only inspects and can block traffic through a proxy. | gVisor pod per task, default-deny egress. | not comparable |
| Verification | A Monitor can block or flag an LLM or MCP call before or after it completes, based on trace rules (monitor.py). Inline and immediate, but not a test suite or deterministic reproduction gate. | Forgejo Actions, policy gates, stronger-model review. | not comparable, different kind of check |
| Merge and deploy | None. | Bot merge after approval, Flux deploy. | not comparable |
| Policy outside the model | Their core strength: rules in a .iv DSL, stored outside the prompt, evaluated against the raw trace by the analyzer, enforced at the gateway boundary. A prompt injection inside a tool result cannot disable the rule that catches it. | Capability rules as YAML in Git, enforced in gateway code and network policy. | equal in principle, different scope: theirs is content and call-order, ours is capability grant and egress |
| Identity per task | A second static "Invariant" API key alongside the real provider key, for logging and guardrail lookups. Not short-lived, not scoped to a task. | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task. | we lead |
| Artifacts not chat | Not applicable. The product's whole subject is a chat and tool-call trace, which is the opposite pattern. | Git branch, PR, TaskBrief. | not comparable |

## 3. Architecture and stack
Core repo invariant (cloned to ~/repos/market-research-clones/invariant-labs, 14 MB, Python, Apache-2.0): invariant/analyzer/language holds a Lark-based grammar (lark>=1.1.9 in pyproject.toml) for the .iv policy DSL, parsed in language/parser.py to an AST in language/ast.py. invariant/analyzer/runtime has the interpreter (evaluation.py), rule matching (rule.py, RuleSet/Input) and a function_cache.py. policy.py exposes LocalPolicy (fully local analyze()/a_analyze()) and, via remote_policy.py, RemotePolicy, which by default POSTs to https://explorer.invariantlabs.ai/api/v1/policy/check (overridable with INVARIANT_API_ENDPOINT). monitor.py wraps a policy for incremental use inside a running agent: Monitor.check() accumulates errors so a persisting violation is only reported once, and ValidatedOperation gives pre/run/post hooks around a tool call.

Detectors live in invariant/analyzer/stdlib/invariant/detectors/: prompt_injection.py (a PromptInjectionAnalyzer, model-based, openai/gpt-4o by default per the docs), pii.py (wraps Microsoft Presidio, an optional extra), secrets.py, moderation.py, code.py (semgrep-based), copyright.py, fuzzy_matching.py, sentence_similarity.py. access_control.py is a single bare function, should_allow_rbac, a role-to-grant lookup, not a real access control system. Packaging is a hatch build publishing invariant-ai to PyPI, with a CLI entry point invariant = invariant.__main__:main. CI (.github/workflows/guardrails_ci.yml) runs pytest with --cov-fail-under=60 and needs a live OPENAI_API_KEY secret, so it is not a hermetic test suite.

invariant-gateway and explorer are separate repositories; given the tier 2 time budget these were read via their raw GitHub READMEs (WebFetch), not cloned. Gateway is a reverse proxy in front of OpenAI Chat Completions, Anthropic Messages and Gemini generateContent, plus MCP over stdio, SSE and Streamable HTTP. Route shape is /api/v1/gateway/{dataset}/{provider}, auto-creating a dataset on first use, forwarding the real provider key straight through and a separate Invariant-Authorization key for logging and guardrail checks. It ships as ghcr.io/invariantlabs-ai/invariant-gateway/gateway or via bash run.sh build && up. Explorer is a Python backend (app-api, pip requirements.in) plus a tester component, deployed with Docker Compose, storing trace data under a local ./data folder with no described schema.

## 4. UX
Two disconnected workflows. Programmatic: pip install invariant-ai, write a .iv file or a Python string, call LocalPolicy.from_string(...).analyze(messages), read AnalysisResult.errors. Three steps to a first result, but the user is a developer, not an operator watching a running task. Proxy path: run Explorer via Docker Compose, run the gateway, repoint the agent's LLM base URL at the gateway, then configure guardrail rules per project in the Explorer web UI. The Explorer README shows a screenshot of a trace timeline with tool calls, described as letting a developer inspect exactly why a guardrail fired.

There is no approval or intervention concept anywhere: a triggered rule can only log or block a call, it cannot route to a human queue, because there is no task or workflow state at all. This is closer to a WAF or a request log viewer for LLM traffic than to our console's kanban board with a human lane. Since January 2026 the only working path is fully self-hosted; https://explorer.invariantlabs.ai now returns a 301 redirect straight to the GitHub repository.

## 5. Security, identity, sandbox, policy, cost
Sandbox: none. Invariant never executes agent code, it only inspects and can block the messages and tool calls that pass through its proxy, so sandbox_isolation scores 0.

Identity: the agent's real provider key still passes straight through the gateway to OpenAI, Anthropic or Gemini. A second, static "Invariant" key is added for logging and guardrail lookups, distinct from the provider key but not short-lived or task-scoped, so identity_per_task scores 1, not 0.

Policy: this is the actual product. Rules such as raise "..." if: (call: ToolCall) -> (call2: ToolCall) ... are evaluated against the raw trace by code outside the agent's own prompt, at a proxy boundary the agent cannot see or influence, matching our "policy lives outside the model" principle for content and call-order rules. It says nothing about capability grants, spend, or network egress, so policy_outside_model scores 3: real, but narrower in scope than our capability policy.

Cost: none found in the repos, docs or website. No budget, hold, or ledger of any kind, so cost_control scores 0.

Verification: a Monitor can be wired to block a call before it reaches the provider or before a tool result reaches the agent, which is a legitimate inline check, giving verification a 2: present but limited to one behavioural gate, with none of the deterministic-first, cheapest-evidence-first ordering our verification plane has.

## 6. What we should take from it
Narrow: the flow-matching operators -> and ~> over a typed trace of Message/ToolCall/ToolOutput events (invariant/analyzer/language) are a compact way to express call-order constraints like "no send_email after get_inbox." Our policy is currently static capability grants in YAML; a small sequence-matching layer in this shape would fit our supervisor's stall and repeated-failing-command detectors better than hand-rolled state tracking. The detector catalogue (PII via Presidio, secrets, prompt injection, semgrep code check, moderation) is a ready checklist to compare our own untrusted-input handling against, even without taking the code. Monitor's de-duplicating check (monitor.py: a violation on the same trace location reports once, not every poll) is a small pattern worth copying directly into our supervisor loop, which should not re-alert on an unchanged condition.

Broad: enforcing behavioural policy at the LLM or MCP proxy choke point, before a call reaches the provider or before a tool result reaches the agent, is a shape we can add to factory-gateway alongside its existing pricing and authorization checks, since the choke point already exists there. It would land as one more check in the same forwarding path, not a new service.

## 7. Where our philosophy differs and what that costs or buys us
Invariant has no task, identity, sandbox or budget concept at all. It solves one narrow slice, content and call-order policy on the wire, of what our "policy outside the model" principle covers end to end. Using it would at most mean calling its analyzer as a library from inside factory-gateway for content checks; it can never replace factoryd's control plane or the sandbox layer, and running two policy languages side by side (our YAML capability rules and their .iv behaviour rules) would cost us a second thing to keep consistent unless deliberately scoped to content checks only.

Their identity model, a second static key next to the real provider key, is the exact long-lived-secret shape our projected, audience-scoped ServiceAccount tokens exist to avoid. Adopting their gateway's auth pattern as-is would be a step backward on our identity-per-task principle; the cost of doing better is the complexity we already carry in factory-gateway, which is a price we have already decided to pay.

## 8. Red flags and slop assessment
The hosted Explorer was shut down in January 2026; https://explorer.invariantlabs.ai now 301-redirects to github.com/invariantlabs-ai/explorer, confirmed by fetching it directly. Snyk announced its acquisition of Invariant Labs on 24 June 2025 (snyk.io press release, corroborated by Techzine, BankInfoSecurity, Startupticker and Channel Insider); the flagship security scanner, mcp-scan, has since been renamed and repackaged as the proprietary Snyk Agent Scan (github.com/snyk/agent-scan), leaving the original invariantlabs-ai repos as a slowly cooling snapshot rather than the maintained product. GitHub's contributors API lists 3 contributors on the core invariant repo, consistent with Snyk's own figure of about 10 total staff at acquisition. The invariant-gateway README has unfixed copy errors (EXAMPLE_MODELS defined but SAMPLE_MODELS referenced in a LiteLLM snippet, a missing comma in an example header dict), a small but real sign of thin maintenance capacity. CI is not hermetic: guardrails_ci.yml needs a live OPENAI_API_KEY secret to run, with a coverage floor of only 60 percent. No independent audit or published detection-rate numbers turned up; an external comparison from July 2026 (decryptiondigest.com) explicitly notes that no MCP scanner in this space, Invariant's included, publishes audited detection rates, and rates mcp-scan as narrower and more static than Cisco's competing scanner. On balance this is real, used code, cited in an ACM/IEEE workshop paper on MCP-Scan, not a landing page over an empty repo, but it is now best read as a frozen reference implementation rather than a moving target to track.

## 9. Sources
https://invariantlabs.ai (fetched 2026-09-29)
https://invariantlabs-ai.github.io/docs/mcp-scan/guardrails-reference/ (fetched 2026-09-29)
https://explorer.invariantlabs.ai (fetched 2026-09-29, 301 redirect to GitHub)
https://raw.githubusercontent.com/invariantlabs-ai/invariant-gateway/main/README.md (fetched 2026-09-29)
https://raw.githubusercontent.com/invariantlabs-ai/explorer/main/README.md (fetched 2026-09-29)
https://snyk.io/news/snyk-acquires-invariant-labs-to-accelerate-agentic-ai-security-innovation/ (2025-06-24)
https://www.channelinsider.com/ai/agentic-ai-llm-research-snyk-platform/
https://www.techzine.eu/news/security/132501/snyk-acquires-invariant-labs-for-ai-security/
https://www.startupticker.ch/en/news/snyk-acquires-invariant-labs-to-accelerate-agentic-ai-security-innovation
https://www.decryptiondigest.com/blog/mcp-server-security-scanners-cisco-invariant-akto (2026-07)
https://dl.acm.org/doi/10.1145/3786160.3788471
gh api repos/invariantlabs-ai/invariant (2026-09-29)
gh api users/invariantlabs-ai/repos (2026-09-29)
gh api repos/invariantlabs-ai/invariant/contributors (2026-09-29)
~/repos/market-research-clones/invariant-labs/README.md
~/repos/market-research-clones/invariant-labs/pyproject.toml
~/repos/market-research-clones/invariant-labs/invariant/analyzer/policy.py
~/repos/market-research-clones/invariant-labs/invariant/analyzer/monitor.py
~/repos/market-research-clones/invariant-labs/invariant/analyzer/remote_policy.py
~/repos/market-research-clones/invariant-labs/invariant/analyzer/stdlib/invariant/access_control.py
~/repos/market-research-clones/invariant-labs/invariant/analyzer/stdlib/invariant/detectors/prompt_injection.py
~/repos/market-research-clones/invariant-labs/invariant/analyzer/stdlib/invariant/detectors/pii.py
~/repos/market-research-clones/invariant-labs/.github/workflows/guardrails_ci.yml
