# ARC Backstage Portal

Standalone Backstage companion portal for ARC. Generated with `@backstage/create-app`, and
deliberately kept **outside** the ARC pnpm workspace — this is its own Yarn 4 workspace.

`README.md` is the reference doc (version tables, validation walkthroughs, MCP inventory).
This file covers what you need in every session and the traps that aren't obvious from the code.

## Commands

```sh
corepack enable && yarn install --immutable   # Yarn 4.13.0, committed in .yarn/releases
yarn start              # default: generated app + example catalog, no ARC dependency
yarn start:arc          # + ARC catalog ingestion from a sibling checkout
yarn start:arc:mcp      # + read-only MCP server access (needs BACKSTAGE_MCP_TOKEN)
yarn test               # backstage-cli repo test
yarn tsc                # typecheck
yarn lint               # NOTE: --since origin/main (changed files only)
yarn lint:all           # whole repo
yarn check:issue        # repo invariant checks — see below, run before every commit
yarn check:security     # elliptic CVE-2025-14505 patch regression test
```

## `yarn check:issue` asserts README prose

This is the biggest trap in the repo. `scripts/check-issue-readiness.mjs` encodes ~33 invariants,
and many of them assert that **`README.md` still documents specific things** — startup commands,
TechDocs `GITHUB_TOKEN`/Docker requirements, the OpenAPI `servers: []` contract-only behavior,
Search validation and its sensitive-data exclusions, the MCP server shape.

Consequences:

- Trimming or restructuring `README.md` can fail the check even with zero code changes.
- Changing `engines.node`, `.node-version`, `.nvmrc`, `packageManager`, `.yarnrc.yml`, or
  `backstage.json` fails the check unless the pinned values still match ARC's baseline.
- Removing a frontend feature from `App.tsx` or a backend module from `packages/backend/src/index.ts`
  fails the corresponding registration check.

Run `yarn check:issue` before committing anything that touches config, the README, or plugin
registration. When bumping dependencies, update the README version tables in the same commit.

## Toolchain constraints

- Node **26.1.0** exactly in `.node-version`; `engines.node` is `>=26.1.0`; `.nvmrc` tracks major `26`.
- Yarn 4.13.0 via the committed release in `.yarn/releases` — use `corepack`, never a global yarn.
- `.yarnrc.yml` sets `npmMinimalAgeGate: 0` intentionally, mirroring ARC's immediate-adoption policy.
- `nodeLinker: node-modules` (not PnP).
- Backstage tracks `next` prereleases. Bump with `yarn backstage-cli versions:bump`, not by hand.

## Frontend: new frontend system

`packages/app/src/App.tsx` uses `createApp` from `@backstage/frontend-defaults` with a `features:`
array, **not** the legacy `createApp`/`FlatRoutes` shape. Plugins come from `/alpha` entry points:

```ts
import catalogPlugin from '@backstage/plugin-catalog/alpha';
```

`app-config.yaml` sets `app.packages: all`, so most plugins are discovered from
`packages/app/package.json` dependencies without explicit registration. TechDocs and Search are
the exceptions — they are explicitly registered in `App.tsx` and `check:issue` enforces that.
Adding a frontend plugin usually means adding the dependency; only add it to `features:` if it
needs explicit wiring.

## Config layering

Configs are layered in order via repeated `--config` flags. `backstage-cli repo start` runs app and
backend from their package directories, so ARC config paths are **package-relative** (`../../`).

- `app-config.yaml` — base. Must keep booting with no ARC checkout, no token, and no Docker.
- `app-config.arc.yaml` — optional ARC catalog ingestion from a sibling checkout.
- `app-config.mcp-local.yaml` — MCP client bearer token, env-var sourced.

**Never make the default `yarn start` path depend on ARC, `GITHUB_TOKEN`, or Docker.** Local
overrides go in `app-config.local.yaml` (gitignored via `*.local.yaml`), never in committed configs.

Local dev uses `better-sqlite3` in-memory. `search-backend-module-pg` is installed and logs that
Postgres search is unsupported at startup — that is expected, not a bug. Don't switch local
development to Postgres.

## MCP server: the allowlist is load-bearing

`mcpActions.servers.arc-catalog` in `app-config.yaml` exposes a read-only catalog/search surface to
coding agents. The filter uses an **explicit id allowlist**, deliberately not wildcards, so a
Backstage upgrade can't silently introduce a write action.

Rules when touching this block:

- Never add `scaffolder:*`, `catalog:register-entity`, or `catalog:unregister-entity`. They stay in
  `exclude` as defense in depth even though the include list is already exhaustive.
- Do not replace the id allowlist with an attribute filter. Upstream annotates `search:query` as
  `readOnlyHint: true` **and** `destructiveHint: true`, so `exclude: {attributes: {destructive: true}}`
  would silently drop it; and `catalog:register-entity` is _not_ flagged destructive, so an
  attribute filter would let a write action through.
- `mcpActions.tracing.capture.toolPayload` is intentionally left unset so it keeps its upstream
  default of `false` — don't enable it, captured payloads can contain secrets.
- Server keys must be lowercase alphanumeric with hyphens (`arc-catalog`); the plugin refuses to start otherwise.
- Because `mcpActions.servers` is set, `/api/mcp-actions/v1` returns 404 by design. Only the
  per-server endpoint `/api/mcp-actions/v1/arc-catalog` is reachable.

The static bearer token is a documented local/dev bridge, not a production posture. This
configuration must not be exposed beyond localhost.

## Security posture

- `.yarn/patches/` carries a local `elliptic` patch for CVE-2025-14505 (no upstream release exists).
  Version-only scanners still report `elliptic@6.6.1`; `yarn check:security` verifies the patched
  behavior. Don't remove the patch or the `resolutions` entries that apply it.
- Never commit tokens. `GITHUB_TOKEN` and `BACKSTAGE_MCP_TOKEN` come from the environment.
- Search must index only Catalog entities, API metadata, and generated TechDocs. It must not index
  ARC runtime task state, agent logs, provider payloads, MCP request/response bodies, local absolute
  paths, database files, session cookies, or tokens.
- With ARC ingestion, `backstage.io/managed-by-location` annotations contain local absolute paths.
  Acceptable for the local bridge; another reason not to expose it.

## Layout

- `packages/app` — frontend (`app`), `packages/backend` — backend (`backend`).
- `plugins/` — workspace slot for custom plugins; none exist yet. Scaffold with `yarn new`.
- `examples/` — generated demo catalog data, kept as the default ARC-free boot path.
- `scripts/` — repo invariant and security checks.

## Conventions

- Prettier config comes from `@backstage/cli/config/prettier`. Run `yarn fix` / `yarn prettier:check`.
- ESLint is per-package via `backstage-cli`; the root `.eslintrc.js` is intentionally just `root: true`.
- TechDocs local generation requires a running Docker daemon and `GITHUB_TOKEN` (ARC repo is private).
  Absence of either is an environment gap, not a code bug.
