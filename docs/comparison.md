# How the factory compares

One row per guarantee, one column per product: GitHub Copilot cloud agent, Cursor cloud agents, Devin, GitLab Duo Agent Platform, OpenHands and Factory. Each cell says what the product does for that guarantee and names the page it rests on. The landing page carries the same cells.

## How the cells were checked

Every cell was checked on 22 October 2026 against the vendor's own documentation, changelog or repository. The first draft came from a market sweep of 148 tools dated 29 September 2026, and every cell taken from it was checked again. Several cells changed. Factory now offers a self-hosted preview. GitLab Duo and OpenHands run on self-hosted models. GitHub's agent cannot run git push itself. GitLab caps usage per user, group and subscription.

Closed products were read from their documentation only, so their security cells rest on what the vendor writes. Where the documentation says nothing, the cell says "Not documented".

## What each row asks

- **The control plane runs on your servers.** Can you run the orchestration itself on your own servers, task state and scheduler included, and is its source published? Workers or sandboxes on your servers alone do not count.
- **Your own model behind the same gateway.** Can the agent run on a model you host yourself, not only on models the vendor picks?
- **The agent never holds a push token.** While the agent works, can it reach a credential that pushes to the repository?
- **The money is held before each call.** Is the cost of each model call reserved before the call, so a cap cannot be overshot, and does the product ask a person to fund or end the task at the cap?
- **A fix must fail at base and pass at head.** When an issue or an alert starts a fix, must a reproduction fail at the base commit and pass at the fix's head before the fix merges?
- **The gates run the tests the criteria name.** Do acceptance criteria name tests that a gate runs and requires green, and is there a floor of checks that no project file can remove?
- **The process is a set of YAML files.** Are the stages a change passes, the tracks and the merge rule files in the repository?
- **Delete everything and rebuild.** Can you delete the whole deployment, control plane included, and rebuild it from version control and a backup bucket?

## The control plane runs on your servers, source published

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. Self-hosted on rented commodity servers, source published. | [architecture.md](architecture.md) |
| GitHub Copilot cloud agent | No. Runners can be yours, the control plane stays in GitHub's cloud. Closed source. | [docs.github.com](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment) |
| Cursor cloud agents | No. Workers can be yours, the control plane stays in Cursor's cloud. Closed source. | [cursor.com](https://cursor.com/docs/cloud-agent/self-hosted) |
| Devin | No. Outposts workers can be yours, the control plane stays in Cognition's cloud. | [docs.devin.ai](https://docs.devin.ai/cloud/outposts/overview) |
| GitLab Duo Agent Platform | Partial. The whole stack self-hosts under a paid, source-available licence. | [docs.gitlab.com](https://docs.gitlab.com/install/install_ai_gateway/) |
| OpenHands | Yes. MIT core. The enterprise tier is source-available and paid. | [docs.openhands.dev](https://docs.openhands.dev/enterprise/enterprise-vs-oss) |
| Factory | Partial. Factory Private is in preview, by quote, closed source. | [factory.com](https://factory.com/news/factory-private) |

## Your own model behind the same gateway, run end to end

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. Hosted APIs and self-hosted models sit behind one gateway. The factory has completed tasks on a self-hosted model. | The builder's own runs on self-hosted models. No record of them is kept. |
| GitHub Copilot cloud agent | No. The cloud agent offers a hosted model list. | [docs.github.com](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/changing-the-ai-model) |
| Cursor cloud agents | No, hosted models. | [cursor.com](https://cursor.com/docs/cloud-agent/self-hosted) |
| Devin | No, its own models. | [docs.devin.ai](https://docs.devin.ai/enterprise/deployment/overview) |
| GitLab Duo Agent Platform | Yes. vLLM or any OpenAI-compatible endpoint, documented. | [docs.gitlab.com](https://docs.gitlab.com/administration/gitlab_duo_self_hosted/supported_models_and_hardware_requirements/) |
| OpenHands | Yes. vLLM, Ollama and LM Studio, documented. | [docs.openhands.dev](https://docs.openhands.dev/openhands/usage/llms/local-llms) |
| Factory | Partial. Any OpenAI-compatible endpoint in the CLI, no published run. | [docs.factory.com](https://docs.factory.com/model-independence/byok) |

## The agent never holds a push token

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. A fresh identity per task, minted after the agent is dead, used once, revoked. | [evidence.md](evidence.md#10-the-sandbox-is-the-guardrail) |
| GitHub Copilot cloud agent | Partial. It cannot run git push. The platform pushes for it, to one branch. | [docs.github.com](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations) |
| Cursor cloud agents | Not documented. The agent pushes its own branch. | [cursor.com](https://cursor.com/docs/cloud-agent/security) |
| Devin | No. Devin pushes itself, with the GitHub App's permissions. | [docs.devin.ai](https://docs.devin.ai/integrations/gh) |
| GitLab Duo Agent Platform | No. The agent runs with the user's token, a composite identity. | [docs.gitlab.com](https://docs.gitlab.com/user/duo_agent_platform/flows/execution/security-considerations/) |
| OpenHands | No. The token sits in the agent's shell, and it runs git push. | [docs.openhands.dev](https://docs.openhands.dev/cookbook/service-account-github-pat) |
| Factory | No. The agent runs with the user's own git credentials. | [docs.factory.com](https://docs.factory.com/cli/configuration/sandbox) |

## The money is held before each call, and at the cap it asks

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. The hold is taken under a database lock. At a cap: fund or end. | [evidence.md](evidence.md#8-no-model-call-runs-without-its-cost-covered) |
| GitHub Copilot cloud agent | No, organisation and user budgets. | [docs.github.com](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-limits) |
| Cursor cloud agents | No. The cap lags, and usage stops without a question. | [cursor.com](https://cursor.com/help/account-and-billing/spend-limits) |
| Devin | No. Limits per session, user and organisation block work at the cap. | [docs.devin.ai](https://docs.devin.ai/admin/billing/enterprise) |
| GitLab Duo Agent Platform | Partial. Caps per user, group and subscription pause use. No hold before a call. | [about.gitlab.com](https://about.gitlab.com/blog/make-every-ai-credit-count/) |
| OpenHands | No. Budgets and a per-run cap stop the run with an error. | [github.com](https://github.com/OpenHands/software-agent-sdk) |
| Factory | No. Rolling rate limits, long tasks pause at the limit. | [docs.factory.com](https://docs.factory.com/pricing) |

## A fix must fail at base and pass at head

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. An issue or an alert files the fix card. The gate runs the repro command at base and at head. | [evidence.md](evidence.md#5-an-issue-lands-the-fix-ships) |
| GitHub Copilot cloud agent | No gate. Issues, schedules and code scanning alerts start tasks. | [docs.github.com](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent) |
| Cursor cloud agents | No gate. Sentry, PagerDuty, Linear and labels start runs. | [cursor.com](https://cursor.com/docs/cloud-agent/automations) |
| Devin | No gate. PagerDuty, Linear and GitHub issues start sessions. | [docs.devin.ai](https://docs.devin.ai/product-guides/automations) |
| GitLab Duo Agent Platform | No gate. Failed pipelines, merge requests and scans start flows. | [docs.gitlab.com](https://docs.gitlab.com/user/duo_agent_platform/triggers/) |
| OpenHands | No gate. Issue labels and webhooks start tasks. | [docs.openhands.dev](https://docs.openhands.dev/openhands/usage/automations/event-automations) |
| Factory | No gate. Sentry, PagerDuty, Slack and GitHub events start runs. | [docs.factory.com](https://docs.factory.com/web/automations) |

## The gates run the tests the criteria name, and a file cannot lower the floor

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. The criteria gate runs each named test and requires it green. Four stages stay in every process. | [evidence.md](evidence.md#3-it-plans-before-it-builds) |
| GitHub Copilot cloud agent | Partial. Rulesets require checks. No criteria name tests. | [docs.github.com](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations) |
| Cursor cloud agents | No. Bugbot's review advises. No named-test gate. | [cursor.com](https://cursor.com/docs/bugbot) |
| Devin | No. Devin Review comments. Merge gating is your branch protection. | [docs.devin.ai](https://docs.devin.ai/work-with-devin/devin-review) |
| GitLab Duo Agent Platform | Partial. Policy pipelines a project cannot remove, on Ultimate. No criteria name tests. | [docs.gitlab.com](https://docs.gitlab.com/user/application_security/policies/pipeline_execution_policies/) |
| OpenHands | No. Hooks and a critic are optional. No named-test gate. | [github.com](https://github.com/OpenHands/software-agent-sdk) |
| Factory | Partial. Organisation policy a project cannot weaken. No named-test gate. | [docs.factory.com](https://docs.factory.com/enterprise/hierarchical-settings-and-org-control) |

## The process is a set of YAML files

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. Tracks, stages, merge rule. Ours is spec-driven, bring your own. | [layers.md](layers.md) |
| GitHub Copilot cloud agent | Partial. Agents and workflows in YAML, the merge rule in settings. | [docs.github.com](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-automations) |
| Cursor cloud agents | Partial. Files set the environment, hooks and review, not the stages. | [cursor.com](https://cursor.com/docs/hooks) |
| Devin | No. Files hold the environment, rules and skills, not stages or a merge rule. | [docs.devin.ai](https://docs.devin.ai/cli/extensibility) |
| GitLab Duo Agent Platform | Partial. Flows, agents and CI are YAML. Triggers are set in the UI. | [docs.gitlab.com](https://docs.gitlab.com/user/duo_agent_platform/ai_catalog/) |
| OpenHands | Partial. Automations sync to YAML in Git. No stages or merge rule. | [docs.openhands.dev](https://docs.openhands.dev/openhands/usage/agent-canvas/git-sync) |
| Factory | Partial. Settings, hooks and skills in the repository. No stage process. | [docs.factory.com](https://docs.factory.com/enterprise/hierarchical-settings-and-org-control) |

## Delete everything and rebuild from Git and a bucket

| Product | Cell | Source |
|---|---|---|
| This factory | Yes. Rebuilt from the repositories and a backup bucket, rehearsed on 13 October. | [architecture.md](architecture.md) |
| GitHub Copilot cloud agent | No, SaaS. | [docs.github.com](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment) |
| Cursor cloud agents | No, SaaS. | [cursor.com](https://cursor.com/docs/cloud-agent/self-hosted) |
| Devin | No, SaaS. Only Outposts workers rebuild from Helm and Terraform. | [github.com](https://github.com/CognitionAI/devin-outpost-k8s) |
| GitLab Duo Agent Platform | Yes, self-managed. Helm charts, and backup and restore through a bucket. | [docs.gitlab.com](https://docs.gitlab.com/charts/backup-restore/) |
| OpenHands | Partial. Helm charts and Terraform. The backup is database dumps only. | [github.com](https://github.com/OpenHands/OpenHands-Cloud) |
| Factory | No, SaaS. The Private preview is undocumented. | [factory.com](https://factory.com/articles/self-hosted-ai-agents) |
## Limits of this check

- The vendor pages were read through a fetching tool that summarises, so the quotes behind the cells are extracts, not full pages.
- Cursor does not document how the push credential reaches the agent. GitLab does not document the lifetime of the agent's token.
- GitLab's usage caps rest on a vendor blog post of 13 October 2026, not on the documentation. Devin's billing page was read through a search summary.
- OpenHands' budget and hook cells rest partly on its source code. A feature missing from the code we read may still exist elsewhere.
- Factory announced Factory Private on 18 September 2026. It is a preview with no public documentation or licence.
- The factory's own cells link to [the evidence page](evidence.md), which names the file and the test behind each guarantee.
