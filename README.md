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

`yarn npm audit --all --recursive` can still report deprecation notices and the low-severity `elliptic` advisory through `browserify-sign`/`create-ecdh`; npm does not currently publish a patched `elliptic` release for that advisory path.

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

## Checks

```sh
yarn check:issue
yarn backstage-cli config:check --config app-config.yaml
yarn backstage-cli config:check --config app-config.yaml --config app-config.arc.yaml
```

`yarn check:issue` verifies this repository still matches the companion-repo requirements: standalone Yarn workspace, ARC-aligned Node/Yarn/Backstage documentation, default ARC-free boot config, and optional ARC catalog ingestion setup.
