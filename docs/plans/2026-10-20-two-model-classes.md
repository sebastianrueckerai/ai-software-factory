# Two model classes: big and small

Sebastian's ruling, 2026-10-20: the factory's text models are two classes, big and small. Each class has a z.ai model and an Alibaba model, z.ai first, Alibaba when z.ai fails or refuses. Every purpose alias (coding-frontier, coding-cheap, review-frontier, supervisor, checkin, operator, pulse) goes: a call names its class, and its purpose already sits on the audit row and in the ledger ref. Vision stays as a model but reads under tools on the metrics page. The page shows cost per class.

## Facts the design rests on

- A call's hold is sized by the output it asks for, capped by the alias limit (policy.Fit), so per-purpose caps protect nothing the callers do not ask. Two caps remain, big and small, plus vision.
- LiteLLM prices alias names from `model_group_alias` by name in `/model/info` (verified live 2026-10-20), so `big` and `small` are priced once the alias map names them.
- The audit row records the deployment that served each call (`audit.deployment`), so the provider split inside a class is hard data.
- The pulse band stopped on 2026-10-18; the pulse alias served two compactions since. Compaction calls small.
- The ledger (`policy/schema.sql`) is complete money: 28 days to 2026-10-20, big €419.46 (89 %), small €52.28 (11 %). Audit tokens and per-call cost exist since 2026-10-14.

## Rollout order

1. Infra, LiteLLM: groups big-zai, big-alibaba, small-zai, small-alibaba, vision; aliases big and small on the z.ai groups, fallbacks to the Alibaba groups, cooldowns on; the old alias names kept on the same groups until step 3 is live; tier-mid dropped.
2. Infra, policy.yaml: classes call small and big; caps for big, small, vision and, until step 3 is live, the old aliases.
3. Code: the constants Big, Small; PulseModel gone; chat defaults; the rename in tests and comments; a migration renaming history (audit.model_alias, ledger.ref, tasks.model_alias, thread summaries); the metrics page's cost by class, served by, tools including vision.
4. Infra cleanup: the old aliases and caps go.

## Page rows under Cost

spend / week · per card, median · tokens / card · spend by model (big · small, euros from the ledger) · served by (deployments by euros from the audit) · tools / week · tool mix (ledger tools and every model call that is not big or small, so vision).

## Rollout notes, 2026-10-20

- The ledger is immutable by trigger (`ledger_immutable`), so its refs keep the old alias names. The metrics map them to their classes in one SQL expression (`ledgerAlias` in `internal/factoryd/metrics.go`). The audit row, the card's model and the compaction model are renamed by migration `gateway/20261020150000_model_classes.sql`.
- The running factoryd rejected the first policy: `checkLinks` requires a class to allow the ladder model its lanes start on, and the old binary's ladder starts on `coding-cheap`. The transition policy lists both ladder names; the cleanup removes the old ones once the new binary is live.
- LiteLLM prices alias names by name, so the old aliases stayed mapped on the classes through the transition.
