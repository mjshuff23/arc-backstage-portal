#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const checks = [];

function check(name, predicate, detail) {
  checks.push({ name, passed: Boolean(predicate()), detail });
}

function getBracketedValueAfter(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }

  const openIndex = source.indexOf('[', markerIndex);
  if (openIndex === -1) {
    return '';
  }

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex + 1, index);
      }
    }
  }

  return '';
}

function hasFrontendFeature(source, featureName) {
  return new RegExp(String.raw`\b${featureName}\b`).test(
    getBracketedValueAfter(source, 'features'),
  );
}

function getAllowedCatalogKinds(configText) {
  const inlineMatch = configText.match(/allow:\s*\[([^\]]*)\]/);
  if (inlineMatch) {
    return new Set(
      inlineMatch[1]
        .split(',')
        .map(kind => kind.trim())
        .filter(Boolean),
    );
  }

  const allowIndex = configText.indexOf('allow:');
  if (allowIndex === -1) {
    return new Set();
  }

  const kinds = new Set();
  const linesAfterAllow = configText.slice(allowIndex).split('\n').slice(1);
  for (const line of linesAfterAllow) {
    const itemMatch = line.match(/^\s*-\s*([A-Za-z]+)\s*$/);
    if (!itemMatch) {
      break;
    }
    kinds.add(itemMatch[1]);
  }

  return kinds;
}

function allowsCatalogKinds(configText, expectedKinds) {
  const allowedKinds = getAllowedCatalogKinds(configText);
  return expectedKinds.every(kind => allowedKinds.has(kind));
}

const packageJson = readJson('package.json');
const backstageJson = readJson('backstage.json');
const readme = readText('README.md');
const appTsx = readText('packages/app/src/App.tsx');
const appPackageJson = readJson('packages/app/package.json');
const yarnrc = readText('.yarnrc.yml');
const appConfig = readText('app-config.yaml');
const arcConfigPath = 'app-config.arc.yaml';
const hasArcConfig = fs.existsSync(path.join(root, arcConfigPath));
const arcConfig = hasArcConfig ? readText(arcConfigPath) : '';
const nodeVersion = readText('.node-version').trim();
const nvmrc = readText('.nvmrc').trim();

check(
  'root package mirrors ARC Node baseline',
  () => packageJson.engines?.node === '>=26.1.0',
  'package.json engines.node should be exactly ">=26.1.0"',
);

check(
  'Node version files mirror ARC',
  () => nodeVersion === '26.1.0' && nvmrc === '26',
  '.node-version should be 26.1.0 and .nvmrc should be 26',
);

check(
  'root package pins Yarn 4.13.0',
  () => packageJson.packageManager === 'yarn@4.13.0',
  'package.json packageManager should be yarn@4.13.0',
);

check(
  'repo uses committed Yarn 4.13.0 release',
  () =>
    yarnrc.includes('yarnPath: .yarn/releases/yarn-4.13.0.cjs') &&
    fs.existsSync(path.join(root, '.yarn/releases/yarn-4.13.0.cjs')),
  '.yarnrc.yml should point at .yarn/releases/yarn-4.13.0.cjs and the release file should exist',
);

check(
  'repo mirrors ARC immediate dependency adoption policy',
  () => yarnrc.includes('npmMinimalAgeGate: 0'),
  '.yarnrc.yml should set npmMinimalAgeGate: 0',
);

check(
  'Backstage version is recorded in backstage.json',
  () => backstageJson.version === '1.53.0-next.1',
  'backstage.json should record the generated Backstage version',
);

check(
  'README documents required runtime versions',
  () =>
    readme.includes('Node 26.1.0') &&
    readme.includes('Yarn 4.13.0') &&
    readme.includes('Backstage 1.53.0-next.1') &&
    readme.includes('@backstage/cli 0.36.4-next.1') &&
    readme.includes('TypeScript 6.0.3') &&
    readme.includes('React 18.3.1'),
  'README should list Node, Yarn, Backstage, and Backstage CLI versions',
);

check(
  'README documents startup commands',
  () =>
    readme.includes('corepack enable') &&
    readme.includes('yarn install --immutable') &&
    readme.includes('yarn start'),
  'README should document install and startup steps',
);

check(
  'README documents ARC catalog ingestion',
  () =>
    readme.includes('app-config.arc.yaml') &&
    readme.includes(
      'agents-with-remote-control-mobile-controller/catalog-info.yaml',
    ) &&
    readme.includes('yarn start:arc'),
  'README should document the optional ARC catalog config path',
);

check(
  'README documents TechDocs local requirements',
  () =>
    readme.includes('GITHUB_TOKEN') &&
    readme.includes('Docker') &&
    readme.includes('generator.runIn'),
  'README should document that GITHUB_TOKEN and a running Docker daemon are required for local TechDocs generation against the private ARC repo',
);

check(
  'app package includes API Docs plugin',
  () => Boolean(appPackageJson.dependencies?.['@backstage/plugin-api-docs']),
  'packages/app/package.json should depend on @backstage/plugin-api-docs so api:default/arc-backend-openapi can render',
);

check(
  'README documents API Docs/OpenAPI validation path',
  () =>
    readme.includes('arc-backend-openapi') &&
    readme.includes('openapi:generate') &&
    readme.includes('servers: []'),
  'README should document the API Docs entity, how to regenerate the ARC OpenAPI artifact, and the servers: [] contract-only behavior',
);

check(
  'package exposes optional ARC startup command',
  () =>
    packageJson.scripts?.['start:arc'] ===
    'backstage-cli repo start --config ../../app-config.yaml --config ../../app-config.arc.yaml',
  'package.json should expose yarn start:arc with package-relative config paths without changing the default yarn start',
);

check(
  'package exposes local security regression check',
  () =>
    packageJson.scripts?.['check:security'] ===
    'node scripts/check-elliptic-cve-2025-14505.mjs',
  'package.json should expose yarn check:security for the local elliptic CVE patch',
);

check(
  'frontend registers TechDocs plugin',
  () =>
    appTsx.includes(
      "import techDocsPlugin from '@backstage/plugin-techdocs/alpha';",
    ) && hasFrontendFeature(appTsx, 'techDocsPlugin'),
  'packages/app/src/App.tsx should register TechDocs so ARC docs routes render',
);

check(
  'default catalog keeps generated examples only',
  () =>
    appConfig.includes('../../examples/entities.yaml') &&
    !appConfig.includes('agents-with-remote-control-mobile-controller'),
  'app-config.yaml should not require the ARC repo for default boot',
);

check(
  'ARC catalog config is optional and committed',
  () =>
    hasArcConfig &&
    arcConfig.includes(
      '../../../agents-with-remote-control-mobile-controller/catalog-info.yaml',
    ) &&
    allowsCatalogKinds(arcConfig, [
      'Component',
      'API',
      'Location',
      'Group',
      'Domain',
      'System',
      'Resource',
    ]),
  'app-config.arc.yaml should register the neighboring ARC catalog-info.yaml and allow every ARC catalog kind',
);

const failed = checks.filter(item => !item.passed);

for (const item of checks) {
  const marker = item.passed ? 'ok' : 'fail';
  console.log(`${marker} - ${item.name}`);
  if (!item.passed) {
    console.log(`  ${item.detail}`);
  }
}

if (failed.length > 0) {
  console.error(`\n${failed.length} issue readiness check(s) failed.`);
  process.exit(1);
}

console.log('\nIssue readiness checks passed.');
