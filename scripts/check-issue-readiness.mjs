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

const packageJson = readJson('package.json');
const backstageJson = readJson('backstage.json');
const readme = readText('README.md');
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
  'package exposes optional ARC startup command',
  () =>
    packageJson.scripts?.['start:arc'] ===
    'backstage-cli repo start --config app-config.yaml --config app-config.arc.yaml',
  'package.json should expose yarn start:arc without changing the default yarn start',
);

check(
  'package exposes local security regression check',
  () =>
    packageJson.scripts?.['check:security'] ===
    'node scripts/check-elliptic-cve-2025-14505.mjs',
  'package.json should expose yarn check:security for the local elliptic CVE patch',
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
    arcConfig.includes('allow: [Location]'),
  'app-config.arc.yaml should register the neighboring ARC catalog-info.yaml as an optional Location',
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
