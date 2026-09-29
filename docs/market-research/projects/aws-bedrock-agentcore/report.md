---
name: Amazon Bedrock AgentCore
slug: aws-bedrock-agentcore
url: https://aws.amazon.com/bedrock/agentcore/
repo: https://github.com/aws/bedrock-agentcore-sdk-python
category: enterprise-agent-platform
license: Apache-2.0
open_source: partial
self_hostable: no
hosting_model: AWS-managed cloud service only. The Python SDK is Apache-2.0 but Runtime, Gateway, Identity, Memory, Policy and Evaluations run exclusively as proprietary AWS infrastructure
company: Amazon Web Services, a subsidiary of Amazon.com, Seattle. AgentCore preview 2025-07-16, general availability 2025-10-13
maturity: 771 stars, 153 forks, 127 open issues on the SDK repo. First commit 2025-07-07, last commit 2026-09-28. Weekly point releases, v1.24.0 as of this report. No external pull requests accepted
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 4
  verification: 0
  policy_outside_model: 4
  identity_per_task: 4
  cost_control: 1
  ux: 3
  reseedable_selfhost: 0
steal:
  - Temporal (session-aware) Cedar/Dogwood policy conditions: rules that read the history of a session, not just the current call, such as "require an approval before a transfer" or "cap a running total". Our capability policy is stateless per call, this is a real gap.
  - Natural-language policy authoring checked by automated reasoning before it takes effect, catching rules that are always-true, always-false or over-broad. A cheap lint pass we could add to our own YAML capability policy in Git.
  - The explicit warning that a policy gateway only protects you if the protected resource refuses direct calls. Worth an audit of whether every path to our worker sandboxes and tool targets actually forces traffic through factory-gateway, with nothing reachable around it.
  - The inbound auth split between IAM/SigV4 (service-to-service) and JWT bearer (end user through an IdP), with an explicit warning to deny the "trust an opaque user id header" path in production. A clean model for any endpoint we expose to more than one kind of caller.
  - Concrete input-validation guidance against structuring an attacker's text as a toolUse content block so it dispatches a tool without model reasoning. Directly applicable to how we pass untrusted issue and PR-comment text into the harness.
  - Persistent session filesystem across stop and resume with no external storage step. Relevant if we ever want cheaper long-running or paused agent sessions than a full re-clone per resume.
  - Semantic search over a large tool catalogue at the gateway, so an agent's prompt lists a handful of relevant tools instead of every registered one. Worth revisiting once our MCP tool surface grows past a handful of targets.
differs:
  - Their compute trust boundary still hands the sandbox an IAM execution role reachable from inside the microVM through the metadata service. AWS's own security guide says any code or actor running inside the microVM can access execution role credentials. Our principle is that the sandbox holds no key material at all, the gateway holds it. Copying their model would mean accepting the exact half measure we built the gateway to avoid.
  - Their outbound-auth decorator, requires_access_token, fetches a bearer token and hands it to the agent's own function as an argument. The agent process holds the token. Our design instead proxies every model and tool call through factory-gateway so no token ever reaches agent code. Their pattern is simpler to code against but is a materially weaker boundary than ours.
  - AgentCore has no signals plane, no task registry, no verification-before-merge step and no merge-and-deploy step, because its unit of work is a live request or streaming session, not an issue that becomes a reviewed, merged, deployed change. Four of our five planes have no equivalent here. It answers how do I run an agent that answers requests, we answer how do I turn an issue into a shipped fix.
  - It is closed, AWS-only infrastructure. Every review that asked can I self-host this answers no. Adopting it as more than a design reference would break our commodity-hardware and re-seedability constraints outright.
  - Cost control is pure metered billing across roughly a dozen separately priced components, left to AWS Cost Explorer and Budgets alarms after the fact. There is no documented per-task spend hold or hard pre-call cap of the kind our gateway enforces before it lets a call through.
ux_verdict: Two CLI commands get a single hosted agent running and streaming traces to a CloudWatch dashboard, but there is no equivalent of our kanban board, human lane or approval workflow, because AgentCore has no task concept to show one for.
slop_verdict: Real and heavily used in production, 771 stars, weekly releases, AWS reports over two million SDK downloads since preview, but the open source framing is cosmetic. The repo takes no external pull requests and the services it wraps are entirely closed. Several 2026 security findings, including a Code Interpreter sandbox network-isolation bypass, show the deterministic security marketing gets ahead of the shipped controls in places.
---

# Amazon Bedrock AgentCore

## 1. What it is

Amazon Bedrock AgentCore is AWS's managed platform for running AI agents in production. It is a set of independent services, Runtime, Gateway, Identity, Memory, Code Interpreter, Browser, Observability, Policy, Evaluations, Payments, Registry, Optimization, and a newer managed agent loop called Harness, that a developer wires into their own agent code, written in any framework such as Strands, LangGraph, CrewAI or LlamaIndex, and pointed at any model. AWS sells it as removing undifferentiated heavy lifting: session isolation, credential brokering, tool authentication, tracing, and now, since Policy reached GA in March 2026, authorisation. It went to preview in July 2025, reached general availability in October 2025, then grew fast. Policy, Evaluations and an episodic Memory feature were announced at re:Invent in December 2025 and reached GA through early-to-mid 2026.

AWS's product page claims security is "enforced at the platform layer with access policies verified by automated reasoning," the same approach AWS uses for IAM and S3. What the SDK repository actually shows is a Python client, bedrock-agentcore on PyPI, Apache-2.0, under src/bedrock_agentcore/, that is almost entirely a thin wrapper around boto3 control-plane and data-plane calls, plus a Starlette HTTP server in runtime/app.py that turns a Python function into the /invocations and /ping contract the managed Runtime expects. None of the actual isolation, policy evaluation or credential-vaulting logic lives in this repository. It is a client for a proprietary service, not the service itself, and its own CONTRIBUTING.md states plainly it "is not currently accepting external pull requests."

It is sold as consumption-based, no minimum, billed separately across roughly a dozen components, see section 5.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. An agent is invoked directly by an app or caller through the SDK, CLI or invoke_agent_runtime API. There is no issue, alert or telemetry intake concept | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue | not comparable |
| Control plane | Runtime tracks session lifecycle and a persistent filesystem, Memory holds cross-session context. No task registry, no approval workflow, no cost ledger | Temporal workflow per task, Postgres task registry, human approval as a workflow state, append-only cost ledger | we lead |
| Worker plane | One microVM per session, fully isolated CPU, memory and filesystem, terminated and sanitised on completion. Eight hour cap on the managed microVM tier, up to fourteen days on the newer EC2-backed Instances option | One gVisor pod, namespace and ServiceAccount per task, default-deny egress through an explicit allowlist | they lead |
| Verification | Evaluations service scores an agent's traces and spans against LLM-judged or custom evaluators, a quality signal, not a merge gate | CI, policy gates, and a stronger-model review before a pull request can merge | not comparable |
| Merge and deploy | None. Deploy means pushing an agent container or code bundle to Runtime. There is no pull request or merge concept | Bot merge after approval or an auto rule, Flux GitOps rollout with a staged wait | not comparable |
| Policy outside the model | Policy service: Cedar or the Cedar-compatible Dogwood language, evaluated at the Gateway before every tool call, with session-aware temporal conditions, natural-language authoring validated by automated reasoning, and Guardrails as a policy input | Capability rules as a YAML file in Git, enforced in gateway code and network policy | they lead |
| Identity per task | Identity service: a workload identity per agent, a token vault, inbound JWT or SigV4, outbound OAuth, two-legged client-credentials or three-legged authorisation-code, to third-party IdPs. The execution role's AWS credentials are still reachable from inside the microVM through its metadata service | A projected, audience-scoped ServiceAccount token verified by the gateway against the cluster OIDC issuer. The sandbox itself holds no key material at all | equal, broader third-party auth support on their side, a cleaner nothing-in-the-sandbox boundary on ours |
| Artifacts not chat | The unit of work is a live request or a streaming session, SSE, WebSocket, MCP, A2A, AG-UI. Chat and event streams are the interface, not a by-product | A TaskBrief in, a branch, a pull request and a normalised event stream out. Git is the coordination mechanism | not comparable, this is what their product is for |

## 3. Architecture and stack

The SDK, per pyproject.toml, is Python 3.10 plus, built on boto3 and botocore for every control-plane and data-plane call, starlette and uvicorn for the agent-side HTTP server, and pydantic for request models. Optional extras add a2a-sdk, ag-ui-protocol, and evaluation libraries such as deepeval, ragas and autoevals.

The directory layout under src/bedrock_agentcore/ is: runtime/, the Starlette app in app.py, 951 lines, implementing the /invocations, /ping and WebSocket contract the managed Runtime calls into, plus context.py for the per-request BedrockAgentCoreContext; identity/auth.py, 418 lines of decorators, requires_access_token, requires_iam_access_token, requires_api_key, requires_wat; services/identity.py, the IdentityClient and TokenPoller the decorators call; gateway/client.py, GatewayClient, a pass-through to the create_gateway and create_gateway_target boto3 API with helpers such as create_web_search_target; policy/client.py, PolicyEngineClient, pass-through to create_policy_engine and create_policy with Cedar definition payloads; plus memory/, payments/, knowledge_base/ and evaluation/.

Deployment is entirely SaaS. A developer writes a Python function decorated with app.entrypoint, then either the agentcore CLI, npm package @aws/agentcore, which generates AWS CDK under the hood, or direct code deployment packages it and hands it to the managed Runtime. There is no Helm chart, no container orchestration the customer runs, and no self-hosted mode. The Runtime has two compute types: managed microVMs, serverless, per-second billed, eight hour session cap, and Instances, the customer's own EC2 capacity, up to fourteen day sessions, GPU support. Model access goes through Bedrock, or directly to OpenAI, Gemini, or any model reachable from the agent's own code, since AgentCore does not force model traffic through its own proxy the way our LiteLLM layer does, except where the newer Gateway model-based routing feature fronts multiple providers.

Files read: README.md, pyproject.toml, CONTRIBUTING.md, CHANGELOG.md, src/bedrock_agentcore/identity/auth.py, src/bedrock_agentcore/policy/client.py, src/bedrock_agentcore/runtime/app.py, src/bedrock_agentcore/runtime/context.py, src/bedrock_agentcore/gateway/client.py, and the top-level layout of src/bedrock_agentcore/identity, policy, runtime, gateway, memory, services, evaluation and payments.

## 4. UX

From zero to a running hosted agent is short: npm i -g @aws/agentcore, agentcore create --name MyAgent --defaults, edit the generated entrypoint, agentcore deploy. That is two or three commands before a first invocation with agentcore invoke or boto3.client('bedrock-agentcore').invoke_agent_runtime(...). This is faster to a first result than our path, a Forgejo issue, a webhook, a Temporal workflow, a sandboxed session, because their first result is a deployed endpoint, not a reviewed and merged change.

Watching an agent work happens in the CloudWatch GenAI Observability console: an Agents view, a Sessions view, and a Trace view with an execution graph per trace, built from OpenTelemetry spans AWS auto-instruments when the agent runs on Runtime. There is no equivalent of our kanban board or human lane. Intervention and approval are not a console workflow at all, they are IAM and resource-based policy decisions made before an Invoke call is even allowed, plus, since Policy GA, a Cedar or Dogwood rule evaluated per tool call at the Gateway. A human does not approve a task the way our console models it, they either can call an API or they cannot. The closest thing to a human-facing approval UI is the OAuth consent portal Identity shows an end user during a three-legged token exchange, and the natural-language policy authoring flow for writing Cedar rules.

No screenshots were captured for this report. The description above is built from the documented flows and the dashboard's described tabs, not a visual check, so treat the console description as not verified visually.

## 5. Security, identity, sandbox, policy, cost

Security. TLS 1.2 or higher is enforced in transit by default, encryption at rest uses AWS-owned KMS keys by default. AWS's own shared-responsibility split puts microVM isolation and host OS patching on AWS, and container image updates, IAM policy scoping, input validation and prompt-injection defence on the customer. AWS's Runtime security guide names a real weakness directly: any code or actor running inside the microVM can access execution role credentials by calling the metadata endpoint, the same MMDS or IMDS pattern as EC2, so the execution role must be scoped tightly because the sandbox is not credential-free.

Identity. A workload identity per agent, a token vault, inbound auth as either IAM SigV4, service-to-service, or JWT bearer, end user through an IdP such as Cognito, Okta or Entra ID, and outbound auth as either two-legged client-credentials, autonomous, or three-legged authorisation-code, user-delegated, with a consent portal, against third-party providers. The requires_access_token decorator fetches a token and injects it as a keyword argument into the agent's own function. The token itself reaches agent code, it is not proxied the way our gateway proxies every call.

Sandbox. Each session gets a dedicated microVM, AWS calls it a microVM throughout its own docs, third-party write-ups name it as Firecracker-based, not verified against AWS's own text, with isolated CPU, memory and filesystem, torn down and memory-sanitised after the session. Filesystem permissions inside the VM are stored but not enforced, since the agent is the VM's only user. Sessions run up to eight hours on the managed microVM tier, up to fourteen days on the EC2-backed Instances tier.

Policy. Since GA in March 2026, Policy in AgentCore intercepts every call through a Gateway and evaluates it against Cedar or Dogwood policies before allowing the tool call through, including temporal, session-aware conditions and Guardrails-provided safety signals. AWS is explicit that this only holds if nothing can reach the protected resource except through the Gateway. A resource with a directly reachable Runtime bypasses every policy check.

Cost. Pure consumption billing, per-second on Runtime and Code Interpreter or Browser vCPU-hours and GB-hours, per-thousand calls on Gateway and Identity, per-thousand events or records on Memory, per-request on Policy and Evaluations. There is no described spend cap, hold, or per-task budget enforced by AgentCore itself, only whatever AWS Budgets or Cost Explorer alarms the customer sets up separately.

## 6. What we should take from it

Narrow, this month. The session-aware temporal condition model in Dogwood and Cedar, a rule that reasons over what already happened in a session, not just the current call, is a real gap in our stateless YAML capability policy, and is worth prototyping as an extension to our gateway's policy check. The natural-language-authored-then-automated-reasoning-validated policy pipeline is a cheap idea to borrow as a lint step over our own policy YAML, flagging rules that are vacuous or contradictory before they merge into the policy repo. Their explicit warning that a gateway only protects you if the backend refuses direct calls is worth turning into an actual audit of our own cluster, confirming nothing bypasses factory-gateway to reach a worker pod or MCP target directly.

Broad, product shape. Two things are worth noting even though we will not copy them. First, their inbound-auth split between service-to-service SigV4 and end-user JWT, with an explicit recommendation to deny the trust-a-client-supplied-user-id-header shortcut in production, is a clean model for any endpoint we expose to more than one kind of caller, including our own console and any future public API. Second, their input-validation guidance against a caller smuggling a toolUse content block into a prompt field is a concrete, specific version of a problem we already have in the abstract, untrusted issue text and PR comments reaching the harness, worth checking our harness adapter actually rejects structured content the same way.

## 7. Where our philosophy differs and what that costs or buys us

The deepest difference is at the compute trust boundary. AgentCore still hands the sandbox an assumable IAM role whose credentials are reachable from inside the microVM. Our design deliberately gives the sandbox nothing. All model and tool calls are proxied through factory-gateway using a token that never leaves the pod's projected ServiceAccount mount and is never itself a usable credential outside that verification step. Copying AgentCore's simpler decorator-based token injection, requires_access_token with an into parameter that hands a real bearer token to the agent's own code, would be less code for us to write, but it is exactly the half-measure our sandbox-holds-no-key-material principle exists to rule out. We keep the harder design and pay for it in extra gateway plumbing.

The second difference is scope. AgentCore has no signals plane, no task registry with an approval workflow, no verification-before-merge gate and no merge-and-deploy step, because its whole job is serving a live agent request or session, not turning an issue into a reviewed and shipped change. Four of our five planes simply have no counterpart here. This means AgentCore is a stronger reference for our worker plane and our policy and identity mechanisms specifically, and no reference at all for the rest of the loop.

The third difference is not a philosophy choice but a hard constraint. AgentCore is AWS-only, closed infrastructure with no self-hosting path, which independently rules it out as anything but a design reference, since it cannot satisfy either our commodity-hardware constraint or our re-seedability constraint.

## 8. Red flags and slop assessment

The repository is genuinely active, last commit 2026-09-28, weekly point releases, AWS reports over two million SDK downloads since preview, but it is not a community open-source project in any meaningful sense. CONTRIBUTING.md states the repository is not currently accepting external pull requests, and every service the SDK talks to is closed AWS infrastructure. The Apache-2.0, self-hostable framing some third-party comparison pages imply does not hold. Per AWS's own docs and independent comparisons, AgentCore cannot run outside AWS.

Security findings in 2026 are the sharpest concrete red flag. BeyondTrust reported in March 2026 that Bedrock AgentCore's Code Interpreter sandbox permits outbound DNS queries an attacker can exploit for interactive shells, bypassing intended network isolation, CVSS 7.5, no CVE assigned. A separate March 2026 report catalogued eight distinct Bedrock attack vectors enabling data theft and agent hijacking. A CLI docstring-injection issue tracked as CVE-2026-11393 was patched in @aws/agentcore. A cross-vendor CoreBreak agent confirmation-bypass flaw was patched by AWS alongside Google and Vercel. None of these are fatal to the product, but they undercut the deterministic security, verified by automated reasoning marketing line on the product page.

Feature churn is a maintenance signal worth watching rather than a red flag on its own. Policy and Evaluations were both announced at re:Invent in December 2025 and did not reach GA until March 2026, and Harness reached GA only in June 2026. A team building against AgentCore today is building against services that were preview-grade a few months ago. Several public write-ups, Rackspace's preview review, several 2026 comparison posts, specifically flag thin infrastructure-as-code support and cost unpredictability across roughly a dozen separately billed components as the practical friction points, one anecdote cited three weeks of setup effort before any agent logic ran.

## 9. Sources

https://github.com/aws/bedrock-agentcore-sdk-python, cloned to a local scratch directory outside this worktree, last commit 2026-09-28T16:38:31Z
README.md
pyproject.toml
CONTRIBUTING.md
CHANGELOG.md
src/bedrock_agentcore/identity/auth.py
src/bedrock_agentcore/policy/client.py
src/bedrock_agentcore/runtime/app.py
src/bedrock_agentcore/runtime/context.py
src/bedrock_agentcore/gateway/client.py
top-level layout of src/bedrock_agentcore/identity, policy, runtime, gateway, memory, services, evaluation, payments, knowledge_base
GitHub API metadata for aws/bedrock-agentcore-sdk-python, fetched 2026-09-29, 771 stars, 153 forks, 127 open issues, Apache-2.0, created 2025-07-07
https://aws.amazon.com/bedrock/agentcore/, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-getting-started.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-getting-started.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-overview.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-security-best-practices.html, fetched 2026-09-29
https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-get-started.html, fetched 2026-09-29
https://aws.amazon.com/bedrock/agentcore/pricing/, fetched 2026-09-29
WebSearch, Bedrock AgentCore general availability launch date 2025 re:Invent, fetched 2026-09-29, sources include aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available and aws.amazon.com/about-aws/whats-new/2025/07/amazon-bedrock-agentcore-preview
WebSearch, Bedrock AgentCore review criticism Hacker News 2026, fetched 2026-09-29, sources include thehackernews.com/2026/03/we-found-eight-attack-vectors-inside.html, thehackernews.com/2026/03/ai-flaws-in-amazon-bedrock-langsmith.html, drel.ai/blog/aws-bedrock-agentcore-security-review, rackspace.com/blog/amazon-bedrock-agentcore-preview-agentic-ai-platform
WebSearch, AgentCore vs comparison self-hosted alternative, fetched 2026-09-29, sources include scalevise.com/resources/agentcore-bedrock-pricing-self-hosting, betterclaw.io/blog/aws-bedrock-agentcore-pricing-alternatives, preloop.ai/vs/aws-agentcore
