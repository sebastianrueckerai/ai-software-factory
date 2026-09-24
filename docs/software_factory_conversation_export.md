# Chat Export: Cloud-Native AI Software Factory Architecture

Exported on 2026-09-24.

> This export contains the user/assistant conversation content relevant to the software-factory discussion. Internal system/developer instructions and private reasoning are not included.

---

## User

Here is a transcript from youtube:

> I want to build my own software factory, mostly to be on top of that trend. To do that I dont want to do what this guy does. Run it of 2 laptops. If I want to have the skill to be able to build this in a corporate environment, I need this to work in a cloudnative environment. The servers could be self hosted of course, but all of this needs to be on servers, probably on some cluster.
>
> I also want to be flexible with the actual models and harnesses. Locally I am using claude code and switch between anthropic and z.ais models. But doing this properly, a more open harness might be best. So I dont just learn how this can be doen setting everything on a proprietary solution.
>
> Things like treads messaging each other and more powerful models chekcing up on less powerfull ones: That seems much harder in such a non local setup.
>
> I guess you would also need a task tracking system or use the inbuilt one from a repo like guithub,
>
> ---
>
> Teach me the current state of all these topics and tell me what the current meta is on software factories.
>
> I am also currently not really sandboxing my agents, which if fine more me as an individual, but onthe real thing I would like policy and access management and clear settign about which agent can do what. Things like reading or writing databases, prod or otherwise!

---

## Assistant

Yes. What you are describing is much closer to the enterprise direction than the laptop-centric setup in the video.

The useful part of the video is the feedback loop: signal → reproduce → fix → verify → PR → review → deploy → observe. The part I would **not** copy is giving an agent a long-lived workstation full of browser sessions, credentials, SSH keys, and ambient access.

As of September 2026, the emerging meta is roughly:

> **durable control plane + disposable isolated workers + model-independent harness + explicit capabilities + verification-heavy promotion gates**

Not “a bunch of Claude Code terminals talking to each other.”

### 1. Think of it as five separate systems

```text
          SIGNALS
             │
   GitHub / Sentry / telemetry
   feedback / security alerts
             │
             ▼
┌────────────────────────────┐
│       CONTROL PLANE        │
│                            │
│ task state / scheduler     │
│ policy / approvals         │
│ model selection            │
│ retries / timeouts         │
│ cost / audit / provenance  │
└─────────────┬──────────────┘
              │
        spawn task
              ▼
┌────────────────────────────┐
│       AGENT WORKER         │
│ OpenCode / OpenHands / ... │
│ selected model             │
│ selected capabilities      │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│       SANDBOX              │
│ ephemeral workspace        │
│ repo checkout              │
│ constrained network        │
│ temporary credentials      │
└─────────────┬──────────────┘
              │
       commit / evidence
              ▼
┌────────────────────────────┐
│     VERIFICATION PLANE     │
│ tests / build / lint       │
│ security / browser tests   │
│ stronger model review      │
│ policy evaluation          │
└─────────────┬──────────────┘
              │
          PR / merge
              ▼
       staging → prod
              │
              └──── telemetry ────► SIGNALS
```

OpenHands has started describing essentially the same separation as **harness, orchestrator, and control plane**, which is evidence that this architecture is becoming an identifiable category rather than just bespoke scripts.

The term “software factory” is still fuzzy and vendor-heavy, but the architectural convergence is real.

### 2. Kubernetes is a good substrate — but not your orchestrator

Your instinct about running this on servers or a cluster is good.

A task might become:

```text
Temporal Workflow
    │
    ├── create sandbox
    │
    ├── checkout repo @ SHA
    │
    ├── inject task-specific identity
    │
    ├── launch OpenCode
    │
    ├── wait
    │
    ├── run verification
    │
    ├── create PR
    │
    └── destroy sandbox
```

The sandbox itself can be a Kubernetes pod/job.

But I would **not** encode the whole factory as Kubernetes Jobs chained together.

Kubernetes answers:

> Where should this workload run?

It is poor at answering:

> This agent failed after 73 minutes, retry it with a stronger model, but keep its existing artifacts, wait three days for somebody to approve its database migration, then resume at step 11.

That is durable-workflow territory.

For something you want to learn from an **enterprise platform-engineering perspective**, I would lean toward:

**Kubernetes + Temporal**, rather than making an agent framework your fundamental scheduler.

### 3. Make the harness replaceable

Don't build:

```text
OurFactory = ClaudeCode
```

Build:

```text
OurFactory
   │
   ├── Harness adapter
   │      ├── OpenCode
   │      ├── OpenHands
   │      ├── Claude Code adapter
   │      └── other ACP agent
   │
   └── Model gateway
          ├── Anthropic
          ├── OpenAI
          ├── Z.ai
          ├── Gemini
          └── self-hosted model
```

OpenCode is particularly relevant because it supports many providers, local models and OpenAI-compatible endpoints. Models can be chosen per agent/task.

OpenHands is interesting at a higher level because it is moving toward a self-hosted enterprise agent control plane.

I would probably start lower down the stack with **OpenCode** precisely because you'll learn more of the infrastructure yourself.

### 4. Put a model gateway between the agents and the models

A pattern such as:

```text
OpenCode
    │
    ▼
LiteLLM
    │
    ├── Claude
    ├── GPT
    ├── Z.ai
    ├── Gemini
    └── self-hosted OpenAI-compatible endpoint
```

gives you centralized:

- model aliases
- budgets
- per-agent model access
- fallbacks
- rate limits
- provider failover
- telemetry

Your agents then request things like:

```text
coding-cheap
coding-frontier
review-frontier
architecture-frontier
```

instead of provider-specific model names.

### 5. “Big model checks small model” is useful, but don't treat it as your security boundary

Formalize it as escalation:

```text
cheap worker
     │
     ▼
deterministic verification
     │
     ├── PASS → normal review
     │
     └── FAIL / uncertain
              │
              ▼
        expensive verifier
```

The hierarchy should be:

```text
tests / invariants / type checker / compiler
            >
static security tooling
            >
runtime verification
            >
model reviewer
```

A model saying “looks correct” is evidence.

A reproduced failing test that now passes is substantially stronger evidence.

### 6. Don't make agents “chat”; make them exchange artifacts

Avoid:

```text
Agent A:
"Hey Agent B, what do you think?"

Agent B:
"I think..."

Agent A:
"Cool..."
```

Prefer:

```text
Task #8271

input:
  repo: payments
  sha: abc123
  issue: PAY-419

analysis.json
reproduction.json
patch.diff
tests.json
review.json
security.json
```

Then each agent consumes explicit state and emits explicit state.

A supervisor might produce:

```json
{
  "decision": "escalate",
  "reason": "schema migration detected",
  "next_stage": "db-migration-review"
}
```

Direct agent-to-agent messaging becomes a specialized feature rather than the basis of the system.

### 7. Relevant interoperability protocols

- **MCP**: agent ↔ tools/data/services
- **ACP**: coding agent ↔ IDE/client
- **A2A**: independent agent ↔ independent agent

For the first version, MCP is the one I would care most about. ACP is useful for coding-agent portability. A2A is interesting later but should not be the foundation of the first factory.

### 8. Sandboxing

A plain Kubernetes container is better than giving the agent your laptop, but:

```text
container != strong hostile-code sandbox
```

Coding agents deliberately execute untrusted build/test commands.

For lower-risk workloads:

```text
Kubernetes
+ restricted PodSecurity
+ seccomp
+ non-root
+ dropped capabilities
+ read-only mounts where possible
+ default-deny networking
```

For stronger isolation, investigate gVisor, Kata Containers, Firecracker/microVM approaches, or purpose-built sandbox systems.

### 9. Network isolation matters as much as filesystem isolation

Default should be:

```text
NO NETWORK
```

followed by explicit allowlisting.

A worker might get:

```text
✓ GitHub
✓ npm registry
✓ PyPI
✓ model gateway
✓ task-specific MCP gateway

✗ arbitrary Internet
✗ company LAN
✗ metadata endpoint
✗ Kubernetes API
✗ databases
```

### 10. Identity should belong to the task, not the machine

Don't place broad static secrets on the agent machine.

Give each execution its own identity:

```text
factory/task/8271
```

or:

```text
spiffe://company/factory/repo-x/task-8271
```

This makes authorization and auditing attributable to a specific task/session.

### 11. Use short-lived credentials

Example:

```text
Agent workload identity
       │
       ▼
Secret broker
       │
       ▼
temporary credential
TTL = 15 minutes
role = app_staging_read
```

When the worker dies, credential renewal stops.

### 12. Define explicit agent capability classes

Example:

| Class | Repository | Internet | Dev DB | Staging | Prod |
|---|---|---|---|---|---|
| `analyzer` | read | restricted | none | none | none |
| `coder` | branch write | package registries | none | none | none |
| `integration-tester` | read | restricted | rw ephemeral | rw ephemeral | none |
| `incident-analyzer` | read | restricted | read | read | read telemetry only |
| `release-agent` | PR/merge | none | none | deploy | deployment API |
| `prod-operator` | read | none | none | limited | narrowly scoped + approval |

Avoid giving agents unrestricted shell + arbitrary prod DB credentials. Prefer constrained authenticated tools.

### 13. Policy must be outside the LLM

Never rely on:

```text
SYSTEM PROMPT:
Please never modify production.
```

Actual enforcement should be:

```text
agent = coder
environment = production
operation = database.write

=> DENY
```

The tool gateway should authenticate, authorize, optionally require human approval, execute, and audit.

### 14. GitHub Issues alone are not enough for task state

Separate:

```text
Human work system
    GitHub / Jira / Linear

from

Factory execution system
    Temporal + PostgreSQL
```

GitHub may know:

```text
BUG-412 = open
```

The factory needs richer execution state such as attempt number, sandbox, model, verification status, cost, approval policy, etc.

### 15. Git becomes the coordination mechanism

Use:

```text
commit
branch
diff
PR
check
review
merge
```

Workers generally should not share writable filesystems.

### 16. The current meta is increasingly “ephemeral agent per task”

Persistent state should live outside the worker:

```text
Git
object storage
Postgres
Temporal
telemetry
```

### 17. Human approval becomes just another workflow state

Long waits should not require a pod to remain alive.

### 18. The factory should optimize evidence, not autonomy

The winning architecture is not:

> Make the smartest possible autonomous agent.

It is:

> Construct an environment where wrong work is cheap, isolated, observable and rejected automatically.

### 19. “Self-improving factory” should mostly mean improving the factory's policy

Analyze execution history, failures, human intervention, model choice, costs, tests, reverts, and update routing/policies/prompts/tests accordingly.

### 20. Initial stack to investigate

| Concern | First thing to investigate |
|---|---|
| Cluster | Kubernetes |
| Durable orchestration | Temporal |
| Open coding harness | OpenCode |
| More complete agent platform | OpenHands |
| Model abstraction | LiteLLM |
| Tool integration | MCP |
| Coding-agent client portability | ACP |
| Agent-agent interoperability | A2A, later |
| Strong sandbox | gVisor or Kata Containers |
| Hosted sandbox abstraction | Daytona |
| Workload identity | Kubernetes SA → SPIFFE/SPIRE later |
| Secret broker | Vault or cloud-native equivalent |
| Policy | OPA/CEL + application-level policy gateway |
| Task intake | GitHub/Jira/Linear |
| Machine workflow state | Temporal + PostgreSQL |
| Coordination artifact | Git commits/PRs |
| Observability | OpenTelemetry |
| Deployment | existing GitOps/CI/CD pipeline |

The key point: **your “factory” is the control plane, not OpenCode or Claude Code**.

---

## User

"**Kubernetes + Temporal**, rather than making an agent framework your fundamental scheduler." -> Is temporal a piecve of software or a name for the concept?

I already did Litellm as a gateway, so I am familiar with that. But that is only the model endpoint solved. I am unsure about the control plane and espeically things like: How do agents communicate with each other? Or do you say they never communicate except trough artifacts? And then presumable its one session picking up an old sessions work, not talking to a working session? If the agents are short lived or at least will shut down after the work is done (so as to terminate their credentials) how can I go back and see what they did? Branch off, review the work, etc?

And then the whole thing of prioritizing tasks... I guess that could come from soemthign like jira or github / gitlab, but then the queque of processes prioritzing and working on stuff... were do I manage that?

---

## Assistant

Temporal is a **specific piece of software/platform**, built around the broader concept of durable workflow orchestration. The underlying concept is usually called **durable execution / durable workflow orchestration**.

A useful separation is:

```text
┌─────────────────────────────────────────────┐
│ CONTROL PLANE                               │
│ Task registry / priorities                  │
│ Temporal workflows                          │
│ Session metadata                            │
│ Permissions / policy                        │
│ Audit / logs / cost                         │
└─────────────┬───────────────────────────────┘
              │
              │ launches / signals
              ▼
┌──────────────────────────┐
│ AGENT SESSION            │
│ logical conversation     │
│ model + harness config   │
│ tool calls / messages    │
└────────────┬─────────────┘
             │ runs inside
             ▼
┌──────────────────────────┐
│ SANDBOX                  │
│ Kubernetes pod / VM      │
│ repo checkout            │
│ temporary credentials    │
└────────────┬─────────────┘
             │
             ▼
       Git / DB / S3
       persistent state
```

These have different lifetimes.

A sandbox might live 45 minutes.

An agent session might logically last three days.

A Temporal workflow might remain alive for two weeks waiting for human approval.

The Git branch and audit records might exist forever.

### How agents communicate

Use three mechanisms:

1. **Artifacts for substantial work**
2. **Durable messages through the control plane**
3. **Direct live interaction only when useful**

For example, a reviewer sends feedback to the workflow. If the original coder is alive, the workflow can deliver it to that session. If the coder is gone, the workflow launches a new coder session with the relevant state.

Direct pod-to-pod agent coupling should not be the persistence mechanism.

### Short-lived doesn't mean one prompt

The sandbox can remain alive while the coding task is active. Credentials can have shorter TTLs and be renewed while the workload remains authorized.

For example:

```text
sandbox lifetime:       3 hours
GitHub credential TTL: 15 minutes
```

### What survives sandbox destruction?

Everything interesting should be streamed out:

```text
session ID
parent session ID

prompts
model responses
tool calls
shell commands
stdout/stderr
files touched
git commits

test results
browser screenshots
review decisions
policy decisions

model used
tokens
cost
timestamps
```

The sandbox is disposable. The session record is not.

### Forking an old session

A later session can restore:

- checkpoint commit
- parent session ID
- relevant session context
- findings / remaining work
- fresh credentials

You're not resurrecting the old Linux process. You're reconstructing its logical state.

### Full history vs restart context

Preserve both:

**Full event history** for audit/debugging.

**Compact restartable state** for continuation, e.g.:

```yaml
objective: Fix race condition #481
current_commit: def456

findings:
  - race occurs between A and B
  - reproduced by test xyz

completed:
  - reproduction test
  - initial implementation

remaining:
  - investigate retry semantics
  - run integration tests
```

### Where task prioritization lives

GitHub/Jira/GitLab should hold human-facing demand.

Your own factory DB should hold the canonical factory task.

Example:

```yaml
id: 1832

source:
  type: github_issue
  repo: foo/bar
  id: 981

priority: P1
severity: high
status: queued

risk: medium
estimated_cost: 2

required_capabilities:
  - repository.write
  - ci.run

forbidden:
  - production.db

workflow_id: null
```

There are two kinds of priority:

- **Business priority**: what should be worked on first? This belongs to your scheduler/admission logic.
- **Execution priority**: once tasks are admitted, which workers should pick up which work first? This can be handled by Temporal queues/priorities.

### Is Temporal itself the control plane?

No.

```text
Temporal
= durable orchestration engine

Your factory control plane
= Temporal
+ task service
+ scheduler
+ agent/session registry
+ sandbox manager
+ policy engine
+ audit/logging
+ UI/API
```

A reasonable first stack:

| Component | Role |
|---|---|
| PostgreSQL | tasks + sessions + metadata |
| Temporal | durable workflow execution |
| Kubernetes | sandbox compute |
| OpenCode | agent harness |
| MinIO/S3 | logs/screenshots/artifacts |
| GitHub/GitLab | code/PR source of truth |
| OPA/Cedar | authorization policies |
| OpenTelemetry | tracing |
| Small custom API | control plane |
| Small web UI | tasks + sessions + intervention |

The useful mental model is:

**Don't think "persistent agents." Think "persistent work, executed by replaceable agents."**

---

## User

So agents should be short lived processes that need the relevant credentials to do things. Lets talk about the part were I need to be able to grant that and still make sure they are safe.

- Sandobox: In principle easy - on the k8s level, it is solvable, not what I am worried about
- Credentials token: More interesting and difficult. We want least privilege but for an agent to be useful it might need all kinds of access. I would differentiate two things: He might need to deploy credentials into an app. This should be abstracted away. I am not 100% sure about the process but I guess something like HashiCorp Boundary and Vault can do it were the credentials arte never seen by the agent at all. Hm, thinking about it: That may solve the second case - access to tool used in the dev process but are not part of the developed software. Maybe the agent needs to be able to look into a db and see some data, maybe it needs to be able to query firecrawl or an image ai api... I guess the challenge is two fold: Avoid the real token landing on the actual agent box ever - give him a pseuido token that a service behind it changes for the real thing, and then cut out the right fine grain permissions. Have spending limits on things that cost money, donmt give write accxess were read is enough... these things.

WDYT? How does this part of the architecture work and are there different options?

---

## Assistant

Your split is the right one, with one critical refinement:

**“The agent never sees the real token” and “the agent cannot misuse the capability” are different security properties.**

A proxy can solve token exfiltration while still letting the agent spend €10,000 or delete data unless authorization and quotas live at the proxy/tool boundary.

There are two different secret problems:

1. **Secrets the software being built needs at runtime** → the coding agent should never receive them.
2. **Capabilities the agent itself needs while doing work** → give the agent an identity/capability, not a durable upstream credential.

A good architecture is:

```text
                     CONTROL PLANE
              task 1832 / session 7
                      │
              capability grants
                      │
                      ▼
┌─────────────────────────────────────────┐
│ Agent sandbox                           │
│ identity: task-1832/session-7           │
│                                         │
│ NO GitHub PAT                           │
│ NO AWS secret                           │
│ NO Firecrawl API key                    │
│ NO production DB password               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ AGENT ACCESS GATEWAY                    │
│ authenticate workload                   │
│ check task policy                       │
│ check operation                         │
│ check environment                       │
│ check budget                            │
│ check approval                          │
│ audit everything                        │
└──────────┬───────────┬──────────┬───────┘
           │           │          │
           ▼           ▼          ▼
         Vault       DB proxy   SaaS connectors
```

The agent should normally possess only a short-lived identity proving something like:

```text
I am task 1832/session 7
```

The system then translates that identity into narrowly scoped capabilities.

### The pseudo-token idea

Rather than:

```text
FAKE_FIRECRAWL_KEY=abc123
```

and swapping it for a real key, prefer:

```text
Agent
  │
  │ authenticated using workload identity
  ▼
Agent Gateway

POST /tools/firecrawl/scrape
{
    "url": "..."
}
```

The gateway checks identity, requested capability, budget, etc., then uses the upstream credential itself.

### Four access patterns

| Pattern | Agent sees upstream credential? | Best use |
|---|---:|---|
| Workload federation | Temporary token, yes | AWS/GCP/Azure APIs |
| Vault dynamic credential | Temporary credential, yes | DBs, PKI, infrastructure |
| Credential-injecting proxy | No | Protocols where proxying works |
| Capability/tool gateway | No | SaaS APIs, DB operations, expensive tools |

### Workload federation

For cloud APIs, use workload identity to obtain short-lived cloud credentials instead of provisioning long-lived keys.

### Vault dynamic credentials

For example:

```text
Agent needs staging PostgreSQL READ access.

task identity
      ↓
Vault
      ↓
creates user:
factory_1832_7

GRANT SELECT ON ...
TTL = 20 min
```

The agent sees a credential, but it is short-lived, narrowly scoped, unique, and auditable.

### Secretless gateway

For a broad SaaS key, expose a narrower capability instead:

```text
firecrawl.scrape(url)
```

rather than giving the agent the provider's admin key.

Add policy such as:

```text
max task spend: €2
max calls: 20
max concurrent: 2
```

### Runtime application secrets are separate

If the software being developed needs a secret, the coding agent should reference the secret, not receive its value.

Example:

```yaml
env:
  - name: STRIPE_API_KEY
    valueFrom:
      secretKeyRef:
        name: stripe
        key: api-key
```

The deployment/runtime system delivers the secret to the application.

### Caveat: secret injection into a pod

Vault Agent Injector or CSI can mount secrets into a pod, but that does **not** make them invisible to a process in that pod. If the agent can read the file, it can see the secret.

Those mechanisms are good for application runtime secret delivery, not necessarily for secretless agent access.

### Boundary

Boundary is useful where you need protocol-aware access to machines, especially SSH/RDP. It is not a universal SaaS/API secret proxy.

### Least privilege should be dynamic

Start with minimal grants:

```text
repo.read
repo.branch.write
ci.run
```

If the agent needs more:

```text
request capability:
db.staging.read
```

The control plane can respond:

- ALLOW for 30 minutes
- REQUIRE APPROVAL
- DENY

### Capability grants belong to the task

Example:

```yaml
task: 1832

identity:
  session: 7

capabilities:

  github:
    repo: acme/payments
    read: true
    branch_write: true
    merge: false

  database:
    staging:
      read: true
      write: false

    production:
      read: false
      write: false

  firecrawl:
    enabled: true
    max_requests: 50
    max_spend_eur: 2

  deployment:
    staging: true
    production: false
```

These should be machine-enforced facts, not prompt instructions.

### Network policy reinforces capability policy

Agent pods should generally only reach trusted gateways, model gateways, Git, package mirrors, etc., rather than arbitrary provider APIs or production networks directly.

### Practical hierarchy

| Situation | Approach |
|---|---|
| Provider has workload IAM | Use workload identity |
| Provider can issue narrow short-lived credentials | Give agent dynamic credential |
| Credential is broad but protocol supports injection | Secretless proxy |
| Credential is powerful/expensive | Capability gateway |
| Production operation | Capability gateway + approval |
| Secret belongs to deployed app | Agent only references it |

The mental model becomes:

```text
agent receives workload identity
        ↓
requests capability
        ↓
policy decides
        ↓
trusted connector exercises capability
        ↓
real credential remains behind boundary
```

Use Vault for credential lifecycle, workload identity for agent authentication, and the capability gateway for authorization, quotas, approvals and execution.

---

## User

In my old company we discussed using boundary and secret injection were possible, but I guess we had lots of cases were we needed to access VMs. When I build something from scratch, I would not have that... it seems more like a legacy pattern.

I am still hazy about how the ai-gateway (maybe littllm)  and Vaulkt and possibly Boundary split work. Maybe I dont need all of them? Am I forgetting components?

---

## Assistant

For a greenfield cloud-native setup, I would probably **drop Boundary initially**.

The source of confusion is that there are two different “gateways”:

1. **Model gateway** — e.g. LiteLLM
2. **Capability/tool access gateway** — for databases, SaaS APIs, privileged operations

A clean decomposition:

```text
                           ┌───────────────┐
                           │   Temporal    │
                           │ orchestration │
                           └───────┬───────┘
                                   │
                           starts agent task
                                   │
                                   ▼
┌─────────────────────────────────────────────────────┐
│ Agent sandbox                                       │
│ workload identity                                   │
│ short-lived task/session token                      │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
        LLM requests              tool requests
               │                      │
               ▼                      ▼
        ┌────────────┐         ┌──────────────┐
        │  LiteLLM   │         │ MCP / Tool   │
        │  Gateway   │         │   Gateway    │
        └─────┬──────┘         └──────┬───────┘
              │                       │
       OpenAI/Anthropic/...     ┌─────┼────────────┐
                                │     │            │
                                ▼     ▼            ▼
                               DB   GitHub     Firecrawl
                                │                  │
                                └──────┬───────────┘
                                       │
                                   ┌───▼───┐
                                   │ Vault │
                                   └───────┘
```

### LiteLLM

Answers:

> Which models may this agent call, at what rate and cost?

It hides provider credentials and can enforce model access, budget/rate limits, expiration, etc.

### Vault

Answers:

> Where are privileged credentials stored, and can I generate temporary ones instead?

For example:

```text
Vault
├── static Firecrawl API key
├── GitHub App private key
├── database root credential
│
└── dynamic:
     ├── postgres-readonly-1832
     ├── temporary AWS role
     └── short-lived certificate
```

### Tool/MCP gateway

Answers:

> What operations may this particular agent perform?

For example:

```text
task-1832:

models:
  sonnet        ✓
  opus          ✓

tools:
  github.read                    ✓
  github.branch_write            ✓
  database.staging.read          ✓
  database.staging.write         ✗
  firecrawl.scrape               ✓  max €2
  deployment.staging             ✓
  deployment.production          ✗
```

### LiteLLM can cover part of the tool gateway too

LiteLLM now includes MCP gateway functionality in addition to model gateway functionality, so you may be able to use it initially as both model gateway and MCP tool gateway.

Then the flow can be:

```text
Agent
   │
   ▼
LiteLLM MCP Gateway
   │
   ▼
postgres-read MCP server
   │
   ▼
Vault
   │
   ▼
PostgreSQL
```

or:

```text
Agent
   │
   ▼
LiteLLM MCP
   │
   ▼
Firecrawl MCP service
   │
   ▼
Vault
   │
   ▼
Firecrawl
```

### Missing component: workload identity

You need a way to know that a pod really represents task `1832`.

Initially, Kubernetes ServiceAccounts/OIDC may be sufficient. Later, SPIFFE/SPIRE is a vendor-neutral workload identity layer.

### Missing component: policy decision point

Initially, policy can live in your control-plane code.

Later, use something like OPA:

```text
Tool Gateway
     │
     ▼
    OPA
     │
     └── DENY
```

### Missing component: network enforcement

If everything should flow through trusted gateways, enforce that at the network layer too.

### Missing component: runtime secret delivery

Secrets needed by deployed applications should be handled by the deployment/runtime system, not by the coding agent.

### Suggested greenfield stack

| Concern | Component |
|---|---|
| Agent identity | Kubernetes ServiceAccount/OIDC |
| Model gateway | LiteLLM |
| Tool gateway | LiteLLM MCP gateway initially |
| Secrets | Vault |
| Dynamic DB credentials | Vault |
| Policy | control-plane code initially |
| Network enforcement | NetworkPolicy/Cilium |
| Runtime app secrets | CSI/External Secrets/Vault |
| Workflow | Temporal |
| Sandbox | Kubernetes |
| Logs/audit | OpenTelemetry + DB/object storage |
| SSH/RDP sessions | nothing |

So **no Boundary initially**.

A good rule is:

**LiteLLM controls what the agent may ask AI/tool infrastructure to do. Vault controls the credentials trusted infrastructure uses to accomplish it. Boundary controls interactive access to remote machines.**

---

## User

Shorter answer:

So task 1832 could receive:

```yaml
litellm:
  models:
    - coding-cheap
    - coding-review
  max_budget: 5
  duration: 3h
```

I am using litellm currently. But how do you mean this: Giving out a shared key for a certain agent type? With cost control? This is open to abuse. Should not the keys always be matched to the pod running it and be short lived? In that case, how is this accomplished with litellm and also: What if it is a longer task? An agent may for for a day and a half at a task... not all agents will be done in minutes. But matching a key to a workload and killing it wehen the workload is over still seems like a good idea. Advise

---

## Assistant

Yes — I would **not** use one shared LiteLLM key per agent type. Treat a LiteLLM virtual key as a **per-workload/session credential**.

A good flow is:

```text
K8s creates pod
   ↓
pod gets workload identity
   ↓
factory controller verifies identity
   ↓
controller calls LiteLLM /key/generate
   ↓
creates key for task-1832/session-7:
  models: [coding-cheap, coding-review]
  max_budget: $10
  duration: 48h
  metadata: task/session IDs
   ↓
key injected only into that pod
   ↓
task ends
   ↓
key revoked/deleted
```

The important caveat is that a LiteLLM virtual key is still a **bearer token**. LiteLLM does not inherently cryptographically bind that token to one Kubernetes pod. If someone steals it while valid, they can use it from elsewhere unless you add another control.

So use two layers:

```text
Identity: Kubernetes ServiceAccount / SPIFFE
Credential: ephemeral LiteLLM virtual key
```

The controller that mints the LiteLLM key should be the only component holding the LiteLLM master/admin credential.

For long-running tasks:

1. **Simple:** mint a 48–72h key, revoke when the workload finishes early.
2. **Stronger:** mint e.g. a 2h key and have a trusted sidecar/controller renew or replace it while the workload is still authorized.

Example lease model:

```text
agent pod
   │
   ├─ LiteLLM key expires in 2h
   │
controller
   │ every ~1h:
   │ "is task 1832 still legitimately running?"
   │
   ├─ yes → issue/rotate credential
   └─ no  → stop renewing + revoke
```

Recommended per-workload settings:

```yaml
per workload:
  unique_key: true
  max_key_lifetime: 2h
  max_budget: task-specific
  allowed_models: task-specific
  rpm_limit: task-specific
  metadata:
    task_id: 1832
    session_id: 7
    pod_uid: ...
```

A logical task may span several pods:

```text
Task 1832
  ├─ session/pod A — 7h
  ├─ session/pod B — 18h
  └─ session/pod C — 11h
```

Each pod can get its own credential while the task-level budget stays in the control plane.

Recommendation:

**Never shared keys by agent type. Unique key per active workload/session, short TTL, task-specific budget/model permissions, immediate revocation on termination, and periodic renewal for genuinely long-running work.**

---

## User

Yes, not bound to the pod, bound to the workload. How would the sidecar work. Is there a appfor that?

---

## Assistant

With current LiteLLM, I would **avoid the sidecar entirely** if you're willing to use its Enterprise JWT auth.

Kubernetes can issue a **projected ServiceAccount JWT** to the workload. Kubelet rotates it automatically while the workload is running. LiteLLM can validate Kubernetes ServiceAccount tokens directly against the cluster's OIDC/JWKS endpoint.

Flow:

```text
Temporal task 1832 starts
        ↓
create ServiceAccount:
factory-task-1832
        ↓
start one/more agent pods using that SA
        ↓
Kubernetes gives them short-lived JWT
        ↓
Agent sends JWT → LiteLLM
        ↓
LiteLLM validates:
system:serviceaccount:factory:factory-task-1832
        ↓
maps identity → LiteLLM permissions/budget
```

Example projected token:

```yaml
serviceAccountName: factory-task-1832

volumes:
- name: litellm-identity
  projected:
    sources:
    - serviceAccountToken:
        path: token
        audience: litellm
        expirationSeconds: 900
```

Kubernetes renews that token while the workload continues. A 36-hour task is therefore fine: it does not receive a 36-hour secret; it continually gets refreshed short-lived credentials.

This matches the idea that identity belongs to the **workload**, not necessarily a particular pod.

LiteLLM Enterprise also supports JWT → Virtual Key Mapping, so the JWT identity can map to model access, budget, RPM/TPM limits, etc., without distributing a LiteLLM API key.

Conceptually:

```text
K8s identity:
system:serviceaccount:factory:factory-task-1832

        ↓ maps to

LiteLLM policy:
models: [coding-cheap, coding-review]
budget: $30
rpm: 100
```

When task 1832 ends, disable/delete that mapping.

If staying on LiteLLM OSS, a fallback is:

```text
K8s projected SA JWT
        ↓
small credential-broker service
        ↓
mints LiteLLM virtual key
        ↓
local Envoy/custom sidecar
        ↓
LiteLLM
```

There is not a standard off-the-shelf “LiteLLM workload credential sidecar” I would recommend.

For this architecture, my preference is:

**Kubernetes projected SA identity → LiteLLM JWT auth → JWT-to-virtual-key policy. No sidecar.**

---

## User

What is SPIFFE/SPIRE as opposed to smth like keycloak? shorter answer

---

## Assistant

SPIFFE/SPIRE is mainly for **workload identity**; Keycloak is mainly for **human/user identity**.

- **Keycloak**: users, login screens, SSO, OIDC/OAuth2, roles, groups, sessions.
- **SPIFFE**: a standard for giving workloads cryptographic identities like `spiffe://company/factory/task-1832`.
- **SPIRE**: a concrete implementation of SPIFFE that attests workloads and issues short-lived identities, usually X.509 SVIDs or JWT-SVIDs.

Typical split:

```text
Human → Keycloak → "Alice, platform-admin"

Pod/agent → SPIRE → "factory/task-1832"
```

For your software factory, SPIFFE/SPIRE is relevant because agents/pods need **machine identity without static secrets**. Keycloak may still be useful for humans interacting with the control plane.

---

## User

So how is the chain of events to make a new agent that runs on a pod and how can control plane verify that the agent that want tsomething is the one it created for that task? Like the chain of trust?

---

## Assistant

The clean chain is:

```text
1. Control plane decides:
   "Create agent for task-1832"

2. Control plane creates:
   - Kubernetes ServiceAccount: task-1832
   - Pod using that ServiceAccount
   - task record: task-1832 ↔ service account identity

3. Kubernetes starts the pod.

4. Kubernetes gives the pod a short-lived signed identity token:
   sub = system:serviceaccount:factory:task-1832

5. Agent calls your control plane:
   Authorization: Bearer <Kubernetes JWT>

6. Control plane verifies the JWT signature against the Kubernetes API server/OIDC issuer.

7. Control plane checks claims:
   namespace = factory
   service account = task-1832
   audience = factory-control-plane

8. Control plane looks in its DB:
   task-1832 is active
   expected identity = task-1832
   requested capability = db.staging.read

9. Policy says ALLOW/DENY.

10. If allowed, control plane/tool gateway performs the operation
    or issues a narrower temporary credential.
```

The important bit is that the control plane never trusts:

> "Hi, I'm task-1832."

It trusts:

> "Kubernetes cryptographically attests that this caller is running under ServiceAccount `task-1832`."

With SPIFFE/SPIRE, the middle changes slightly:

```text
Kubernetes starts pod
        ↓
SPIRE attests workload properties
        ↓
SPIRE issues identity:
spiffe://company/factory/task-1832
        ↓
agent presents short-lived SVID
        ↓
control plane verifies SPIFFE identity
```

The trust root is roughly:

```text
Cluster / SPIRE authority
        ↓
workload identity
        ↓
task identity
        ↓
capability policy
        ↓
temporary access
```

When task `1832` is finished, mark it inactive. Even if a short-lived token is still technically valid for a few minutes, the control plane rejects it because the **task authorization has been revoked**.

---

## User

Export our conversation so far as a markdown document I can download.
