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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function hasPackageDependency(packageJson, packageName) {
  return Boolean(packageJson.dependencies?.[packageName]);
}

function hasDefaultImport(source, importedName, packageName) {
  return new RegExp(
    String.raw`import\s+${escapeRegExp(importedName)}\s+from\s+['"]${escapeRegExp(packageName)}['"]\s*;?`,
  ).test(source);
}

function hasBackendRegistration(source, packageName) {
  return new RegExp(
    String.raw`backend\.add\(\s*import\(\s*['"]${escapeRegExp(packageName)}['"]\s*\)\s*\)`,
  ).test(source);
}

function matchesAll(source, patterns) {
  return patterns.every(pattern => pattern.test(source));
}

function getMarkdownSection(source, headingPattern) {
  const headingMatch = headingPattern.exec(source);
  if (headingMatch?.index === undefined) {
    return '';
  }

  const sectionStart = headingMatch.index;
  const contentStart = sectionStart + headingMatch[0].length;
  const sectionRest = source.slice(contentStart);
  const nextHeadingIndex = sectionRest.search(/^##\s+/m);

  if (nextHeadingIndex === -1) {
    return source.slice(sectionStart);
  }

  return source.slice(sectionStart, contentStart + nextHeadingIndex);
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
const backendPackageJson = readJson('packages/backend/package.json');
const backendIndex = readText('packages/backend/src/index.ts');
const yarnrc = readText('.yarnrc.yml');
const appConfig = readText('app-config.yaml');
const arcConfigPath = 'app-config.arc.yaml';
const hasArcConfig = fs.existsSync(path.join(root, arcConfigPath));
const arcConfig = hasArcConfig ? readText(arcConfigPath) : '';
const nodeVersion = readText('.node-version').trim();
const nvmrc = readText('.nvmrc').trim();
const searchReadmeSection = getMarkdownSection(readme, /^##\s+Search\b.*$/m);
const requiredBackendSearchDeps = [
  '@backstage/plugin-search-backend',
  '@backstage/plugin-search-backend-module-catalog',
  '@backstage/plugin-search-backend-module-techdocs',
  '@backstage/plugin-search-backend-module-pg',
];
const requiredBackendSearchRegistrations = [
  '@backstage/plugin-search-backend',
  '@backstage/plugin-search-backend-module-catalog',
  '@backstage/plugin-search-backend-module-techdocs',
];

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
  'app package includes Search plugin',
  () => Boolean(appPackageJson.dependencies?.['@backstage/plugin-search']),
  'packages/app/package.json should depend on @backstage/plugin-search so /search and the search modal can render',
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
  'frontend registers Search plugin',
  () =>
    hasDefaultImport(
      appTsx,
      'searchPlugin',
      '@backstage/plugin-search/alpha',
    ) && hasFrontendFeature(appTsx, 'searchPlugin'),
  'packages/app/src/App.tsx should register Search explicitly so /search renders in this generated app',
);

check(
  'backend package includes Search backend and built-in collators',
  () =>
    requiredBackendSearchDeps.every(packageName =>
      hasPackageDependency(backendPackageJson, packageName),
    ),
  'packages/backend/package.json should include the search backend, catalog collator, TechDocs collator, and currently installed Postgres engine module',
);

check(
  'backend registers Search backend and built-in collators',
  () =>
    requiredBackendSearchRegistrations.every(packageName =>
      hasBackendRegistration(backendIndex, packageName),
    ),
  'packages/backend/src/index.ts should register search backend plus catalog and TechDocs collators',
);

check(
  'README documents Search local validation path',
  () =>
    matchesAll(searchReadmeSection, [
      /^##\s+Search\b/m,
      /\/search\b/,
      /\barc-orchestrator\b/,
      /\bapproval\s+gates\b/i,
      /software-catalog[\s\S]{0,120}succeeded|succeeded[\s\S]{0,120}software-catalog/i,
      /techdocs[\s\S]{0,120}succeeded|succeeded[\s\S]{0,120}techdocs/i,
    ]),
  'README should document /search, representative catalog and TechDocs queries, and the collator timing caveat',
);

check(
  'README documents local Search engine behavior',
  () =>
    matchesAll(searchReadmeSection, [
      /better-sqlite3|sqlite/i,
      /Postgres/i,
      /not supported|skips?|disabled/i,
      /zero[- ]config|local search/i,
    ]),
  'README should document local SQLite behavior and why the Postgres module is skipped locally',
);

check(
  'README documents Search sensitive-data exclusions',
  () =>
    matchesAll(searchReadmeSection, [
      /\bagent logs?\b/i,
      /\bprovider payloads?\b/i,
      /\bMCP\b[\s\S]{0,80}\brequest\/response bodies\b/i,
      /\bsession cookies?\b/i,
      /\bprovider tokens?\b/i,
      /\blocal absolute paths?\b/i,
    ]),
  'README should document that raw ARC runtime/provider/MCP payloads and other private runtime data are not indexed',
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

const mcpLocalConfigPath = 'app-config.mcp-local.yaml';
const hasMcpLocalConfig = fs.existsSync(path.join(root, mcpLocalConfigPath));
const mcpLocalConfig = hasMcpLocalConfig ? readText(mcpLocalConfigPath) : '';
const mcpSection = appConfig.slice(appConfig.indexOf('\nmcpActions:') + 1);
function getFilterIds(block) {
  return [...block.matchAll(/-\s*id:\s*'([^']+)'/g)].map(match => match[1]);
}

// Match the YAML keys on their own lines so prose in comments (which can
// mention include:/exclude:) does not shift the slice boundaries.
const mcpIncludeKeyIndex = mcpSection.search(/^\s*include:\s*$/m);
const mcpExcludeKeyIndex = mcpSection.search(/^\s*exclude:\s*$/m);
const mcpIncludeIds = getFilterIds(
  mcpSection.slice(mcpIncludeKeyIndex, mcpExcludeKeyIndex),
);
const mcpExcludeIds = getFilterIds(mcpSection.slice(mcpExcludeKeyIndex));
const requiredMcpIncludeIds = [
  'catalog:get-catalog-model-description',
  'catalog:get-catalog-entity',
  'catalog:query-catalog-entities',
  'catalog:validate-entity',
  'search:query',
];
const requiredMcpExcludeIds = [
  'scaffolder:*',
  'catalog:register-entity',
  'catalog:unregister-entity',
];
const mcpReadmeSection = getMarkdownSection(
  readme,
  /^##\s+Read-only MCP context\b.*$/m,
);

check(
  'package exposes MCP client startup command',
  () =>
    packageJson.scripts?.['start:arc:mcp'] ===
    'backstage-cli repo start --config ../../app-config.yaml --config ../../app-config.arc.yaml --config ../../app-config.mcp-local.yaml',
  'package.json should expose yarn start:arc:mcp layering app-config.mcp-local.yaml on top of the ARC configs',
);

check(
  'default start paths do not load MCP client access config',
  () =>
    !packageJson.scripts?.start?.includes('mcp-local') &&
    !packageJson.scripts?.['start:arc']?.includes('mcp-local'),
  'yarn start and yarn start:arc should boot without app-config.mcp-local.yaml so no MCP client access is configured by default',
);

check(
  'app config defines the focused arc-catalog MCP server',
  () =>
    appConfig.includes('\nmcpActions:') &&
    mcpSection.includes('arc-catalog:') &&
    !mcpSection.includes('arcCatalog'),
  'app-config.yaml should define mcpActions.servers.arc-catalog (server keys must be lowercase alphanumeric with hyphens)',
);

check(
  'MCP server include list is an explicit read-only allowlist',
  () =>
    requiredMcpIncludeIds.every(id => mcpIncludeIds.includes(id)) &&
    mcpIncludeIds.every(
      id => !id.startsWith('scaffolder') && !id.includes('*'),
    ),
  'mcpActions include filter should list the five verified read-only action ids and avoid wildcards or scaffolder ids',
);

check(
  'MCP server excludes scaffolder and catalog write actions',
  () => requiredMcpExcludeIds.every(id => mcpExcludeIds.includes(id)),
  'mcpActions exclude filter should keep scaffolder:*, catalog:register-entity, and catalog:unregister-entity out even if the include list widens',
);

check(
  'MCP payload tracing stays disabled',
  () => !appConfig.includes('toolPayload: true'),
  'mcpActions.tracing.capture.toolPayload must stay off until a data-handling decision approves it',
);

check(
  'MCP client access config is committed and env-var based',
  () =>
    hasMcpLocalConfig &&
    mcpLocalConfig.includes('${BACKSTAGE_MCP_TOKEN}') &&
    mcpLocalConfig.includes('subject: arc-mcp-client') &&
    mcpLocalConfig.includes('externalAccess') &&
    mcpLocalConfig.includes('accessRestrictions') &&
    mcpLocalConfig.includes('plugin: mcp-actions') &&
    !mcpLocalConfig.includes('plugin: catalog'),
  'app-config.mcp-local.yaml should grant static-token access via the BACKSTAGE_MCP_TOKEN env var under the arc-mcp-client subject, restricted to the mcp-actions plugin only (downstream actions run under the plugin service identity)',
);

check(
  'README documents the read-only MCP server for agents',
  () =>
    matchesAll(mcpReadmeSection, [
      /\/api\/mcp-actions\/v1\/arc-catalog/,
      /BACKSTAGE_MCP_TOKEN/,
      /Intentionally not exposed/i,
      /scaffolder/i,
      /catalog:register-entity/,
      /toolPayload/,
      /code-intelligence/i,
    ]),
  'README should document the arc-catalog endpoint, env-var-only token setup, excluded actions, tracing posture, and Backstage MCP vs ARC code-intelligence guidance',
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
