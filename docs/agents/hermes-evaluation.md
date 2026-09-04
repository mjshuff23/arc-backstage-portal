# Hermes Agent — evaluation notes

Nous Research's open-source self-hosted agent, assessed as a possible orchestration layer
above existing coding agents. Notes dated 2026-09-04.

## Verification status

Claims below are split by whether they were confirmed against primary sources. The official
docs site was unreachable from the environment these notes were written in, so a chunk of the
feature detail is second-hand and should be checked before any of it is designed against.

**Confirmed** (Nous Research GitHub repo and its installation docs):

- Open-source, self-hosted; runs local, VPS, Docker, or cloud
- Persistent memory across sessions; agent-created reusable skills
- Native MCP client
- Messaging gateway (Telegram, Discord, Slack, others)
- Provider-agnostic: Nous Portal, OpenRouter, OpenAI, any OpenAI-compatible endpoint
- Local state in `~/.hermes/`
- Install via `install.sh`, or clone + `uv pip install -e ".[all,dev]"`

**Unconfirmed — verify against the repo before relying on any of it:**

- "Bot Mode": persistent named agents with per-bot model, memory, credentials, and tool
  permissions; bot-to-bot messaging and group chats
- Hook taxonomy (`pre_tool_call`, `post_tool_call`, `pre_llm_call`, session/subagent events)
  and whether shell hooks can actually block a tool invocation
- Cron with non-LLM deterministic execution
- Approvals config schema (`smart` mode, `cron_mode`, `unattended_mode`, deny rules)
- Subagents propagating only final summaries to parent context
- Shipped skills for delegating to Claude Code / Codex / OpenCode
- Container isolation, write-safe roots, prompt-injection scanning

Note: several high-ranking domains (`hermes-agent.ai`, `hermes-agent.org`) are not Nous
Research and carry inflated claims. Treat `github.com/NousResearch/hermes-agent` as the only
authoritative source.

## Assessment

The strategic read is sound: position Hermes as an orchestration and memory layer above
Claude / Codex / GPT as workers and judges, rather than as a replacement for any of them.
The strongest single recommendation is to let it observe real workflow and promote what
recurs, instead of designing an idealized bot topology upfront.

Start small — one installation, three profiles (coordinator, research with no write access,
engineering with branch-scoped writes) — and connect only GitHub/MCP, one code-intelligence
surface, one messaging channel.

## Open risks

**Authority concentration.** The end state — memory layer, orchestrator, repo write access,
and a public messaging gateway in one process — is a single point of compromise with an
internet-facing input surface. Untrusted text arriving over Telegram would reach a component
that can execute code. This argues for the same posture this portal already takes with its
MCP server: explicit read-only allowlists, writes excluded as defense in depth even when the
allowlist already excludes them, and least privilege per role rather than per installation.

**Memory portability is not automatically solved.** Hermes stores state in `~/.hermes/`,
which is machine-local in exactly the way `~/.claude/` is. Installing it in WSL reproduces
the current split rather than fixing it. Hosting it remotely (VPS or container) is what makes
one memory layer reachable from every surface — that, not the memory feature itself, is the
part that addresses cross-machine continuity.

**Overlap with ARC.** Substantial: mobile remote control, persistent agents, isolated
workers, messaging, approvals, memory, delegation, MCP, scheduled jobs. Treat as prior art to
study rather than a reason to abandon ARC. Whether it belongs _inside_ ARC as a runtime is a
decision that needs its internals and extension boundaries inspected first.
