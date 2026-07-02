# ARC Backstage Portal

This repository is ARC's standalone Backstage companion portal. It was generated with the official `npx @backstage/create-app@latest` flow and intentionally lives outside the ARC pnpm workspace.

The portal follows ARC's current Node baseline while keeping the generated Backstage Yarn workspace separate from ARC's pnpm workspace. Backstage updates are applied with `yarn backstage-cli versions:bump`.

## Version Snapshot

Use Node 26.1.0 or newer. The checked-in `.node-version` pins the exact verified runtime, and `.nvmrc` tracks the matching major version for nvm users.

| Surface                  | Version                      |
| ------------------------ | ---------------------------- |
| Node                     | >=26.1.0                     |
| Backstage                | Backstage 1.53.0-next.1      |
| Backstage CLI            | @backstage/cli 0.36.4-next.1 |
| Yarn                     | Yarn 4.13.0                  |
| Root package             | root 1.0.0                   |
| App package              | app 0.0.0                    |
| Backend package          | backend 0.0.0                |
| TypeScript               | TypeScript 6.0.3             |
| React                    | React 18.3.1                 |
| React DOM                | react-dom 18.3.1             |
| Jest                     | Jest 30.4.2                  |
| Playwright               | @playwright/test 1.61.1      |
| jsdom                    | jsdom 27.4.0                 |
| Node native build helper | node-gyp 13.0.0              |
| V8 sandbox native module | isolated-vm 7.0.0            |

Core Backstage package versions from `yarn backstage-cli info`:

| Package                               | Version        |
| ------------------------------------- | -------------- |
| @backstage/backend-defaults           | 0.17.5-next.1  |
| @backstage/core-components            | 0.18.12-next.0 |
| @backstage/core-plugin-api            | 1.12.8-next.0  |
| @backstage/frontend-defaults          | 0.5.4-next.0   |
| @backstage/plugin-api-docs            | 0.14.3-next.0  |
| @backstage/plugin-catalog             | 2.0.7-next.0   |
| @backstage/plugin-catalog-backend     | 3.8.1-next.0   |
| @backstage/plugin-scaffolder          | 1.38.1-next.1  |
| @backstage/plugin-scaffolder-backend  | 4.0.2-next.0   |
| @backstage/plugin-search              | 1.7.6-next.0   |
| @backstage/plugin-search-backend      | 2.1.4-next.0   |
| @backstage/plugin-techdocs            | 1.17.8-next.0  |
| @backstage/plugin-techdocs-backend    | 2.2.2-next.0   |
| @backstage/plugin-user-settings       | 0.9.5-next.0   |
| @backstage/plugin-kubernetes          | 0.12.21-next.0 |
| @backstage/plugin-kubernetes-backend  | 0.21.6-next.0  |
| @backstage/plugin-mcp-actions-backend | 0.2.0-next.1   |

The exact package graph is locked in `yarn.lock`. `.yarnrc.yml` sets `npmMinimalAgeGate: 0` to mirror ARC's immediate-adoption dependency policy while preserving Backstage's Yarn workspace.

## Security Posture

Known vulnerable transitive packages that had patched releases available have been moved forward in `yarn.lock`, including the PR #1 `protobufjs` bump and the previous `tar`, Octokit, `file-type`, `js-yaml`, `prismjs`, and `uuid` advisories.

The remaining GitHub Dependabot alert is the low-severity `elliptic` CVE-2025-14505 path through Backstage's development-time browser polyfills. npm does not currently publish a patched `elliptic` release for that advisory, so this repo carries a Yarn patch in `.yarn/patches/` and verifies the fixed nonce-truncation behavior with:

```sh
yarn check:security
```

Version-only scanners can still report `elliptic@6.6.1` because the upstream package version is unchanged, but the installed code path is patched and covered by the local regression check.

## Local Startup

```sh
corepack enable
yarn install --immutable
yarn start
```

The default `yarn start` path loads the generated Backstage app and example catalog data only. It does not require the ARC backend, controller, or pnpm workspace to be running.

If port `3000` is busy locally, create an ignored `app-config.local.yaml` override such as:

```yaml
app:
  baseUrl: http://localhost:3002

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007
  cors:
    origin: http://localhost:3002
```

Backstage automatically layers `app-config.local.yaml` during local development.

## ARC Catalog Ingestion

After the ARC-side descriptors from PR #123 are merged and the ARC repository is checked out next to this repository, start the portal with the optional ARC catalog config:

```sh
yarn start:arc
```

`app-config.arc.yaml` registers:

```text
../../../agents-with-remote-control-mobile-controller/catalog-info.yaml
```

That relative path points from the Backstage backend package to the sibling ARC checkout:

```text
job_hunt/projects/
  arc-backstage-portal/
  agents-with-remote-control-mobile-controller/
```

For a different local checkout layout, copy `app-config.arc.yaml` to an ignored local config file and adjust the `catalog.locations[0].target` path, then run Backstage with that config layered after `app-config.yaml`.

The ARC catalog should ingest the root `catalog-info.yaml`, which fans out to the ARC catalog descriptors under `backstage/catalog/`, including the ARC components, resources, systems, ownership, and API entity metadata.

The ARC startup command uses package-relative config paths because `backstage-cli repo start` runs app and backend package processes from their package directories. The optional ARC config allows ARC's `Component`, `API`, `Location`, `Group`, `Domain`, `System`, and `Resource` entities without adding ARC data to the default `yarn start` path.

If local ports are busy while using the ARC config, keep overrides out of git and pass the ignored or temporary config explicitly, for example:

```sh
yarn backstage-cli repo start --config ../../app-config.yaml --config ../../app-config.arc.yaml --config /tmp/app-config.local.yaml
```

### TechDocs local requirements

`arc-platform-docs` uses a `backstage.io/techdocs-ref: url:...` annotation, so TechDocs fetches ARC's `mkdocs.yml` and `docs/` tree from GitHub rather than from a local checkout. Two local prerequisites follow from `app-config.yaml`'s `techdocs` block:

- **`GITHUB_TOKEN` must be set** in the environment `yarn start:arc` runs in. The ARC repository is private, so the `integrations.github` entry in `app-config.yaml` (`token: ${GITHUB_TOKEN}`) needs a real token with read access to fetch the docs source. Without it, the TechDocs build step fails to read from the ARC repository.
- **Docker must be running locally.** `techdocs.generator.runIn` is set to `docker`, so the TechDocs backend shells out to Docker to run the `mkdocs-techdocs-core` build. If Docker isn't reachable (no daemon, no socket), the build step fails with an error like `This operation requires Docker. Docker does not appear to be available.` and the `arc-platform-docs` TechDocs page shows a "Build Details" error banner while still serving the last successfully generated version, if one exists in the local publisher cache.
- If Docker isn't available in your setup, `techdocs.generator.runIn: local` is the documented alternative (requires local `mkdocs` and `mkdocs-techdocs-core` installed) — this repo does not switch to it by default; treat it as a fallback to test manually if Docker access is unreliable in your environment.

To force a fresh TechDocs build (for example, after ARC's docs change upstream), restart `yarn start:arc` — the local publisher cache is not preserved across restarts — or use the settings/build-details control on the TechDocs page to inspect the most recent build attempt.

### API Docs local requirements

`api:default/arc-backend-openapi` renders ARC's committed OpenAPI artifact (`docs/openapi/arc-backend.openapi.json`) through Backstage API Docs. `@backstage/plugin-api-docs` is included via `app.packages: all` in `app-config.yaml`; no explicit frontend plugin registration is needed (unlike TechDocs above), and API Docs renders out of the box once the entity is ingested.

- The `api:default/arc-backend-openapi` descriptor in ARC's `backstage/catalog/apis.yaml` uses `definition.$text` pointed at a GitHub blob URL, so the same `GITHUB_TOKEN` requirement documented above for TechDocs applies here too — the ARC repository is private.
- The committed artifact is regenerated in the ARC repo with `pnpm openapi:generate`, which writes `docs/openapi/arc-backend.openapi.json` deterministically from the live NestJS Swagger document. Backstage always reads the committed file, never a live `/docs-json` endpoint, so the artifact must be regenerated and committed on the ARC side for API Docs to reflect route changes.
- The artifact has `servers: []` set intentionally. API Docs still renders paths, schemas, and security metadata correctly with no servers configured, but the "Try it out" button on each operation falls back to Backstage's own origin as the request target rather than a real ARC backend — API Docs here is for **contract discovery, not live API calls**. Don't rely on "Try it out" for anything other than inspecting a request's shape.
- A handful of request/response DTO schemas render as empty objects in the artifact (decorators not yet added on those DTOs). This doesn't block rendering; it's a known gap, not a bug — see the OpenAPI artifact's `components.schemas` if you need to check which ones.

## Search local validation

`@backstage/plugin-search` is explicitly registered in `packages/app/src/App.tsx` so the generated app exposes the Search page and sidebar/modal affordance. `@backstage/plugin-search-react` is provided by `@backstage/plugin-search` and the app does not import it directly; add it as a direct app dependency only if app source starts importing from that package.

Start the portal with ARC catalog ingestion:

```sh
yarn start:arc
```

Then sign in as the guest user and open `/search`. If `3000` is busy, use a local config override as shown above and open the matching app URL. The Search backend schedules initial indexing with a short delay and then repeats on a cadence, so wait for backend log lines like:

```text
Collating documents for software-catalog succeeded
Collating documents for techdocs succeeded
```

The current local config uses `better-sqlite3`, not Postgres. The installed Postgres search module is harmless in this local shape: startup logs that Postgres search is not supported and skips `search-backend-module-pg`. Do not switch local development to Postgres for this validation path. Backstage's zero-config local search path is the expected local engine behavior here.

Smoke these Catalog queries, using the "Software Catalog" result type filter if TechDocs results rank above exact entity matches:

```text
arc-orchestrator -> /catalog/default/component/arc-orchestrator
arc-controller -> /catalog/default/component/arc-controller
arc-platform-docs -> /catalog/default/component/arc-platform-docs
arc-backend-openapi -> /catalog/default/api/arc-backend-openapi
arc-platform -> /catalog/default/system/arc-platform
ai-agent-operations -> /catalog/default/domain/ai-agent-operations
```

Smoke these TechDocs queries with the "Documentation" result type filter:

```text
local-first
agent-context
approval gates
provider integrations
Backstage Integration Research Plan
MCP
OpenAPI
TechDocs
```

Expected TechDocs results route under `/docs/default/component/arc-platform-docs/...`; open at least one result, such as the approval gate or quality gates page, to confirm the reader route works.

TechDocs search depends on readable generated TechDocs content. For a fresh cache, `GITHUB_TOKEN` must let Backstage read the private ARC repo and Docker must be reachable because `techdocs.generator.runIn` is `docker`. If GitHub DNS/token access or Docker is unavailable, catalog search should still work, while TechDocs generation may fail or search may only reflect previously cached local publisher content.

Search is intentionally limited to public-ish portal surfaces: Catalog entities, API entity metadata, and generated TechDocs. It must not index ARC runtime task state, raw agent logs, provider payloads, MCP request/response bodies, local absolute paths, database files, session cookies, provider tokens, controller secrets, or personal Tailnet URLs.

## Checks

```sh
yarn check:issue
yarn check:security
yarn backstage-cli config:check --config app-config.yaml
yarn backstage-cli config:check --config app-config.yaml --config app-config.arc.yaml
```

`yarn check:issue` verifies this repository still matches the companion-repo requirements: standalone Yarn workspace, ARC-aligned Node/Yarn/Backstage documentation, default ARC-free boot config, and optional ARC catalog ingestion setup.
