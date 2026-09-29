---
name: Cedar
slug: cedar
url: https://www.cedarpolicy.com
repo: https://github.com/cedar-policy/cedar
category: policy-identity
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: embedded library, no server of its own. AWS also sells it hosted, as Amazon Verified Permissions and as the policy engine inside Bedrock AgentCore
company: Started inside AWS, open sourced May 2023. Donated to CNCF as a Sandbox project on 2025-10-08. Named adopters and co-maintainers beyond AWS include Cloudflare, MongoDB, StrongDM and Cloudinary
maturity: 1753 GitHub stars, 174 forks, 175 open issues, 64 contributor pages (incl. anonymous), created 2023-04-25, last commit 2026-09-28, release roughly every six weeks, latest v4.13.0 on 2026-09-15
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 4
  identity_per_task: 0
  cost_control: 0
  ux: 2
  reseedable_selfhost: 3
steal:
  - The permit and forbid, deny by default, forbid wins evaluation model as a clean way to document what our YAML plus Go check already tries to do.
  - cedar-go, a pure Go authorizer, as the concrete shape a "beyond plain Go code" upgrade could take, cheaper than a Rust FFI or a sidecar process.
  - Schema first validation ("cedar validate") as a pattern: a typed check on the policy document at commit time, not only at gateway enforcement time.
  - The action naming convention Bedrock AgentCore Policy uses for MCP tool calls, a Gateway target and tool name pair as the action, the Gateway itself as the resource.
  - cedar-policy-symcc's automated reasoning, equivalence and counterexample search over a policy set, as a worked example of what "prove the security model holds" costs and buys.
differs:
  - Cedar's full safety story lives in Rust. The Go port drops the schema validator, templates and partial evaluation, so getting all of it needs a language boundary our single Go module does not otherwise have.
  - Cedar is a stateless decision function with no policy storage, versioning, approvals or budgets of its own. It would replace one line inside the gateway, not the machinery factoryd already owns.
ux_verdict: A policy authoring tool, not an operator console. Readable syntax, an editor extension, and inside AgentCore a plain English to Cedar generator. Nothing to watch once wired in, a decision returns inline in the same request.
slop_verdict: Real. Daily commits, a six week release cadence, CNCF Sandbox status since October 2025, and shipped in anger as the tool call authorization layer of Amazon Bedrock AgentCore Policy, general availability March 2026.
---

# Cedar

## 1. What it is

Cedar is a domain specific language and an authorization engine for it, built by AWS and open sourced in 2023. A caller hands it a principal, an action, a resource, a context, a policy set and an entity slice, and it returns ALLOW or DENY plus diagnostics. It is not a product a team installs, it is a library a team embeds inside one.

The makers claim three things: expressive enough for RBAC and ABAC, fast enough for real time checks, and analyzable enough that automated reasoning can prove properties of a policy set. The repository backs the third claim with more than marketing: `cedar-spec` gives a Lean formalisation of Cedar's semantics, and the Rust engine runs differential random testing against that formal model in CI. That is a real, checked property, not a slogan.

Cedar joined the CNCF as a Sandbox project on 2025-10-08, with AWS still the dominant contributor but Cloudflare, MongoDB, StrongDM and Cloudinary named as co-maintainers and adopters. Its most relevant deployment for us is Amazon Bedrock AgentCore Policy, general availability March 2026, which uses Cedar as the tool call authorization layer for AI agents: every call through an AgentCore Gateway is checked against a Cedar policy set before the tool runs.

## 2. Mapping to our five planes

Cedar has no equivalent of four of our five planes. It is a decision function, not a loop.

| Plane / principle | What Cedar does | What we do | Verdict |
|---|---|---|---|
| Signals | Nothing, it consumes one decision request at a time | Forgejo webhooks, SigNoz alerts, factoryd intake | not comparable |
| Control plane | Nothing, no task state, scheduling or its own audit trail | factoryd, Temporal, Postgres | not comparable |
| Worker plane | Nothing, no sandbox or execution model | gVisor pod per task | not comparable |
| Verification | Verifies policies with `cedar validate` and, separately, `cedar-policy-symcc`, not code changes | CI, policy gates, model review | not comparable |
| Merge and deploy | Nothing | Bot merge, Flux | not comparable |
| Policy outside the model | A schema typed DSL, validated before it runs, with a Rust engine differentially tested against a Lean reference semantics | A YAML file in Git read by Go code in factory-gateway, no schema, no static validation | they lead |
| Identity per task | None, Cedar takes a principal id as an opaque input it does not authenticate | Projected ServiceAccount token verified against the cluster OIDC issuer | not comparable |
| Artifacts not chat | None, a synchronous function with no artifact model | TaskBrief in, PR and event stream out | not comparable |

## 3. Architecture and stack

The main repository, `cedar-policy/cedar`, is a Rust Cargo workspace of eight crates. `cedar-policy-core` holds the parser, evaluator, typechecker and authorizer (`cedar-policy-core/src/{ast,evaluator,authorizer,validator}`). `cedar-policy` wraps that as the public API (`cedar-policy/src/api.rs`), with an `ffi/` module for other language bindings and a `proto/` module for a protobuf schema. `cedar-policy-cli` is the `cedar` binary. `cedar-policy-symcc` is a symbolic compiler that needs the external SMT solver `cvc5` to prove properties across a policy set. `cedar-wasm` exposes the engine to JavaScript and TypeScript. `cedar-language-server` and `cedar-policy-formatter` are editor tooling.

Two sibling repositories matter for a Go shop. `cedar-go` is a from scratch Go port with the core authorizer, JSON handling and schema parsing, but its own README lists what is missing: the CLI, the schema validator (only an experimental `x/exp/schema`), the formatter, partial evaluation and policy templates. `cedar-access-control-for-k8s`, an AWS Labs Go project applying Cedar to Kubernetes authorization and admission, is archived. Its own README explains why: partial evaluation and typed partial evaluation, the features that would let one schema cover both authorization and admission, exist only in the Rust library, so the Go rewrite could not keep the parts of Cedar that beat writing the check by hand. A third repository, `cedar-for-agents`, is AWS's own answer to agent tool policy: a schema generator that turns an MCP server's tool descriptions into a Cedar schema, and an MCP server that exposes Cedar's analysis capabilities to an agent.

Cedar itself holds no state. The caller supplies the policy set and the entity data on every call. Amazon Verified Permissions and Bedrock AgentCore Policy each add their own storage, versioning and API around a Cedar core.

## 4. UX

There is no product UX, because there is no product. A developer runs `cargo add cedar-policy` or `go get github.com/cedar-policy/cedar-go`, writes a `.cedar` policy file and an entity JSON file, and calls the authorizer in process. The CLI (`cedar authorize --policies --entities --principal --action --resource`) gives a one command way to get from zero, three files, to a first ALLOW or DENY. A VS Code extension and a browser based Monaco editor component add syntax highlighting and autocomplete for the language.

Bedrock AgentCore Policy layers a better UX on top for the one case closest to ours: `agentcore add policy --generate "<plain English rule>"` turns a sentence into a candidate Cedar policy, validates it against the tool schema, and flags overly permissive or overly restrictive results with automated reasoning before it is saved. That generator, not the bare language, is the part worth watching.

Once a policy set is wired into a running system there is nothing further to watch. A decision returns inline inside the same request that asked for it. That is the opposite of a console: no board, no stream, no place an operator looks to see a check happen.

## 5. Security, identity, sandbox, policy, cost

Policy is the entire product. Every decision is deny by default, and any matching `forbid` policy wins over any matching `permit`, with no way to route around that from inside a policy.

Identity is explicitly out of scope. Cedar takes a principal id as a trusted input and does no authentication of its own. Whatever hands Cedar its principal, a JWT claim in AgentCore's case, still has to do the work our `factory-gateway` does today: verify the token, resolve it to an identity, decide it is who it claims to be.

Sandboxing does not apply, Cedar runs in process with the caller.

Cost does not apply to the open source library. Amazon Verified Permissions bills per authorization request, which is one more reason a self-hosted, commodity-hardware design would use the library form, not the AWS hosted form.

## 6. What we should take from it

Narrow. The permit and forbid, deny by default, forbid wins model is worth adopting as a way to talk about the capability YAML we already have, even without adopting the language. `cedar-go` is a real, embeddable answer to the "if rules multiply beyond what plain Go code reads well" line in `target-architecture.md`, cheaper to reach for than standing up an OPA sidecar, though it buys only the evaluator, not the schema validation that is Cedar's actual selling point. Schema first validation of the policy document at commit time, rejecting a typo'd capability name before Flux ever applies it, is a pattern worth copying into our own YAML pipeline regardless of engine. Bedrock AgentCore Policy's action naming for MCP tool calls, a Gateway target and tool name pair as the Cedar action and the Gateway as the resource, is a proven template if our fixed tool allowlist ever grows into a generic MCP proxy.

Broad. AgentCore Policy is a working, shipped answer to exactly the question our "reserved OPA upgrade" line leaves open: when capability rules for agent tool calls outgrow hand written Go, is the next step a general purpose policy engine (OPA and Rego, also infra and Kubernetes admission) or a purpose built one (Cedar, schema validated, formally specified, application authorization only)? AWS chose the narrow tool for the narrow job. `cedar-policy-symcc`'s automated reasoning, proving two policy versions equivalent or finding a concrete counterexample request that a new policy would wrongly allow, is a worked example of what buying a formal guarantee on the capability policy looks like, if that policy ever becomes safety critical enough to want one.

## 7. Where our philosophy differs and what that costs or buys us

Cedar's full safety story is Rust only. The Go port is missing the validator, templates and partial evaluation, so taking all of what Cedar offers means an FFI call into Rust, a subprocess or sidecar running the `cedar` binary, or accepting a materially thinner Go only subset. Any of those adds a language boundary or a process hop to a design that currently keeps its own code in one Go module and two binaries. That directly trades against the "as few tools as possible" constraint.

Cedar is stateless and owns no policy storage, versioning, approval workflow or budget. Adopting it would not remove any of factoryd's job of keeping immutable policy versions in Postgres or enforcing spend caps, it would only replace the boolean check inside the gateway that decides whether a capability is allowed. Treating it as more than that, a policy store, an approval system, a cost ledger, would be scope creep past what the actual gap is.

The archived `cedar-access-control-for-k8s` project is a direct warning against assuming a same-language port is a drop in replacement: its authors gave up specifically because the valuable half of Cedar lives only in Rust. The same gap would apply to us with `cedar-go`.

## 8. Red flags and slop assessment

CNCF Sandbox status is young, granted 2025-10-08, several stages short of Graduated, and AWS remains the dominant contributor even with named co-maintainers. Treat "CNCF project" as early stage governance, not proof of long term multi vendor maintenance.

AWS has already made a breaking change stick against its own paying customers: Amazon Verified Permissions began disabling authorization APIs for policy stores still on the Cedar 2 language from April 2026, with no automatic upgrade. The README's own advice to pin an exact `cedar-policy` version is not decorative, it is a response to real breakage history. This is from search result synthesis, not a primary AWS changelog read, flagged as not fully verified.

Search results also describe "Dogwood," a second AWS controlled policy language inside Bedrock AgentCore from August 2026, said to be "compatible with Cedar." Not verified against a primary source in the time available. Worth checking before treating Cedar as AWS's one settled answer for agent tool policy.

No security incidents surfaced in the time available.

## 9. Sources

https://github.com/cedar-policy/cedar (README.md, SECURITY.md, cedar-policy/CHANGELOG.md, cedar-policy-cli/CHANGELOG.md, cedar-policy/src/api.rs, cedar-policy-core/src layout, top level layout, cloned 2026-09-29)
https://api.github.com/repos/cedar-policy/cedar (2026-09-29)
https://api.github.com/orgs/cedar-policy/repos (2026-09-29)
https://api.github.com/repos/cedar-policy/cedar/releases (2026-09-29)
https://raw.githubusercontent.com/cedar-policy/cedar-for-agents/main/README.md (2026-09-29)
https://raw.githubusercontent.com/cedar-policy/cedar-go/main/README.md (2026-09-29)
https://raw.githubusercontent.com/cedar-policy/cedar-access-control-for-k8s/main/README.md (2026-09-29)
WebSearch: Cedar policy language CNCF sandbox AWS 2026 (2026-09-29)
WebSearch: Cedar policy vs OPA Rego authorization comparison (2026-09-29)
WebSearch: Bedrock AgentCore Policy Cedar tool call authorization agents (2026-09-29)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md (Policy section)
