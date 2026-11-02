# The session digest's tree hand: the runbook (written 2026-11-02)

The session digest is on code main at 448048b0, pushed to both remotes. No session sees the `digest` tool until the policy tree lists it in three class stanzas. That commit is yours: the infra repository sits outside every agent credential. This is fault 6 of [needed-fixes.md](needed-fixes.md), built by [planner-read-cut-plan-2026-11-02.md](planner-read-cut-plan-2026-11-02.md).

## When to commit

Commit only after the factoryd roll that carries 448048b0, or a later code main, is live. A factoryd from before that commit rejects the tree with `class coder lists unknown tool "digest"`, and the tree's tip then sits unloadable, the shape of fault 10. Rolled code without the listing is only tool-less.

1. Check that code main's CI is green at 448048b0 or later. The infra repository's config-check pulls factoryd from the `factory-gateway:main` image of that build.
2. Check that the roll card of 448048b0, or of a later commit, reads done on the board.

## The infra commit (sf/ai-software-factory-infra)

One commit on main. It edits `factory/policy.yaml` alone. Each edit adds the line `digest: {}` directly under `analyze_image: {}` in a class's `tools:` block, at the same six-space indent. The line numbers are those of infra main 2b59f75.

1. In the `coder` stanza, after line 184 (`analyze_image: {}`), add the comment and the line:
   ```yaml
         # one text file of the workspace, read by the small model, which
         # answers the session's ask: only the answer enters the session.
         # It books as a small call on the card's account. Free.
         digest: {}
   ```
2. In the `analyzer` stanza, after line 219 (`analyze_image: {}`), add `      digest: {}`.
3. In the `planner` stanza, after line 242 (`analyze_image: {}`), add `      digest: {}`.

Leave `factory/schema/` alone. After the roll, factoryd opens a pull request for its stale copies itself, and `factoryd config check` only warns about them.

Commit message: `The session digest: the coder, analyzer and planner classes list digest (code in ai-software-factory-code 448048b0)`.

## Check before the push

1. Run `grep -c '^      digest: {}$' factory/policy.yaml`. It prints `3`.
2. Run `grep -B1 '^      digest: {}$' factory/policy.yaml`. Each `digest` line follows an `analyze_image: {}` line or the coder's comment.
3. From the code repository at 448048b0, run `go run ./cmd/factoryd config check ~/repos/ai-software-factory-infra/factory`. It prints `factory: ok, 2 projects, 2 processes, 1 template` after three schema warnings.

The builder ran step 3 on a copy of infra main 2b59f75 with these three edits. The build of 448048b0 printed `ok`. Code main before the change (c78869b2) printed `rejected` with the unknown-tool error above.

Push. Flux reconciles the tree with the next sync, and factoryd's loader activates the new version.

## After the push

1. Check that a new planner, coder or analyzer session lists `factory-tools_digest` among its tools. The fault leaves the register only then.
2. Regenerate the agent map by the recipe in [agent-context-map.md](agent-context-map.md). The planner's page then carries the digest tool and the guide's digest sentence. The capture reads the policy tree from infra main, so this step comes only after the push:
   ```sh
   git -C ~/repos/ai-software-factory-infra fetch origin
   rm -rf /tmp/policy-fresh && mkdir -p /tmp/policy-fresh
   git -C ~/repos/ai-software-factory-infra archive origin/main factory | tar -x -C /tmp/policy-fresh
   cd ~/repos/ai-software-factory-code
   go run ./cmd/agentdoc \
     -out ~/repos/ai-software-factory/docs/agents \
     -policy /tmp/policy-fresh/factory \
     -opencode <path to the pinned opencode 1.18.32 binary>
   ```
   Commit `docs/agents/` in this repository and push.
