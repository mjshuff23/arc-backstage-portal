# ARC Backstage Portal

This repository is ARC's standalone Backstage companion portal. It was generated with the official `npx @backstage/create-app@latest` flow and intentionally lives outside the ARC pnpm workspace.

## Version Snapshot

Use Node 22 or 24. The current verified local runtime is Node 24.18.0.

| Surface         | Version               |
| --------------- | --------------------- |
| Backstage       | Backstage 1.52.0      |
| Backstage CLI   | @backstage/cli 0.36.3 |
| Yarn            | Yarn 4.4.1            |
| Root package    | root 1.0.0            |
| App package     | app 0.0.0             |
| Backend package | backend 0.0.0         |
| TypeScript      | TypeScript 5.8.3      |
| React           | React 18.3.1          |
| React DOM       | react-dom 18.3.1      |

Core Backstage package versions from `yarn backstage-cli info`:

| Package                               | Version |
| ------------------------------------- | ------- |
| @backstage/backend-defaults           | 0.17.4  |
| @backstage/core-components            | 0.18.11 |
| @backstage/core-plugin-api            | 1.12.7  |
| @backstage/frontend-defaults          | 0.5.3   |
| @backstage/plugin-api-docs            | 0.14.2  |
| @backstage/plugin-catalog             | 2.0.6   |
| @backstage/plugin-catalog-backend     | 3.8.0   |
| @backstage/plugin-scaffolder          | 1.38.0  |
| @backstage/plugin-search              | 1.7.5   |
| @backstage/plugin-search-backend      | 2.1.3   |
| @backstage/plugin-techdocs            | 1.17.7  |
| @backstage/plugin-techdocs-backend    | 2.2.1   |
| @backstage/plugin-user-settings       | 0.9.4   |
| @backstage/plugin-kubernetes          | 0.12.20 |
| @backstage/plugin-kubernetes-backend  | 0.21.5  |
| @backstage/plugin-mcp-actions-backend | 0.1.14  |

The exact package graph is locked in `yarn.lock`.

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

`yarn check:issue` verifies this repository still matches the companion-repo issue requirements: standalone Yarn workspace, Node/Yarn/Backstage documentation, default ARC-free boot config, and optional ARC catalog ingestion setup.
