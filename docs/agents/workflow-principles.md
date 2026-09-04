# Agent workflow principles

Durable notes on how Michael runs multi-agent work. Cross-project and tool-agnostic —
not specific to this repository. Kept here so it survives across machines; move it to a
dedicated memory repo if one gets created.

## The loop

```text
research / challenge assumptions
  ↓
multiple independent models
  ↓
collapse uncertainty
  ↓
harden ticket / architecture
  ↓
implementation agent
  ↓
tests + deterministic checks
  ↓
independent review
  ↓
capture misses
  ↓
promote recurring lessons into guardrails
```

## Principles

**Independence over agreement.** When triangulating, track whether sources are genuinely
independent, not merely whether they agree. Three runs of the same model is one opinion with
error bars, not three opinions. Pin different model/provider combinations to different roles
so correlated error is reduced rather than disguised as consensus.

**A reviewer must not inherit the implementer's reasoning.** Review is only worth something
if it starts from the diff, not from the story that produced the diff.

**Instruction → recurring failure → executable invariant.** A rule repeated in prompts is a
rule that will eventually be missed. Once a miss recurs, promote it out of prose into
something mechanical: a check, a hook, a lint rule, a test, a denied command. This repo's
`scripts/check-issue-readiness.mjs` is an instance of exactly that pattern.

**Smallest sufficient mechanism.** If a task is `git fetch`, `pnpm outdated`, parse, write
report — that is a script, not an LLM call. Reserve model tokens for work that needs judgment.

**Consistency is compression.** Stable conventions mean less has to be re-explained per
session, to humans and agents alike.

**Research broadly first, then collapse uncertainty before implementation.** Do not begin
implementing while the problem statement is still moving.

## Standing rules for implementation agents

- Never resolve a lint or type error with a disable comment (`@ts-ignore`, `eslint-disable`)
  unless the suppression is explicitly justified in the same change.
- Never force-push a shared branch.
- Tests and typecheck are part of the change, not a follow-up.
- Adequate TDD means the test fails for the right reason before it passes.

## Role separation

Distinct roles with distinct authority, rather than one agent doing everything:

| Role        | Reads                    | Writes            |
| ----------- | ------------------------ | ----------------- |
| Researcher  | web, docs, read-only MCP | nothing           |
| Architect   | repo, code intelligence  | decisions only    |
| Implementer | repo                     | branch-scoped     |
| Reviewer    | diff only                | nothing           |
| Librarian   | decisions, history       | memory and skills |

The value is that roles become durable objects with fixed privilege, instead of prompts
reconstructed from scratch each session.
