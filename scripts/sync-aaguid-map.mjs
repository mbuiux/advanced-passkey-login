#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SOURCE_URL = 'https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/aaguid.json';

const OUTPUT_AAGUID_MAP_PATH = 'includes/data/aaguid-provider-map.php';
const OUTPUT_PROVIDER_ICON_MAP_PATH = 'includes/data/provider-icon-map.php';

const CANONICAL_LABELS = new Map([
  ['apple passwords', 'iCloud Keychain'],
  ['icloud keychain managed', 'iCloud Keychain'],
  ['chrome on mac', 'Google Password Manager'],
  ['chromium browser', 'Google Password Manager'],
  ['edge on mac', 'Microsoft Password Manager'],
]);

function normalizeLabel(label) {
  const normalized = String(label || '').trim();
  if (!normalized) {
    return '';
  }

  const key = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const canonical = CANONICAL_LABELS.get(key) || normalized;

  // Keep generated file ASCII-friendly for repository consistency.
  return canonical
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function normalizeAaguid(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return '';
  }

  // Keep UUID-like AAGUID values only.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(raw)) {
    return '';
  }

  return raw;
}

function normalizeProviderKey(label) {
  const signal = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!signal) {
    return 'unknown';
  }

  if (signal.includes('bitwarden')) return 'bitwarden';
  if (signal.includes('icloud') || signal.includes('apple')) return 'icloud';
  if (signal.includes('1password') || signal.includes('onepassword')) return 'onepassword';
  if (signal.includes('lastpass')) return 'lastpass';
  if (signal.includes('google') || signal.includes('chrome')) return 'google';
  if (signal.includes('samsung')) return 'samsung';
  if (signal.includes('windows hello') || signal.includes('microsoft authenticator') || signal.includes('microsoft password manager')) return 'windows-hello';
  if (signal.includes('yubikey') || signal.includes('yubico')) return 'yubikey';
  if (signal.includes('keeper')) return 'keeper';
  if (signal.includes('enpass')) return 'enpass';
  if (signal.includes('roboform')) return 'roboform';
  if (signal.includes('dashlane')) return 'dashlane';
  if (signal.includes('nordpass')) return 'nordpass';
  if (signal.includes('proton')) return 'proton-pass';

  return 'unknown';
}

function normalizeIconDataUri(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (!raw.startsWith('data:image/')) {
    return '';
  }

  // Keep ASCII output stable and avoid control characters.
  return raw.replace(/[^\x20-\x7E]/g, '');
}

function toPhpAaguidMap(map) {
  const lines = [];
  lines.push('<?php');
  lines.push('// phpcs:ignoreFile -- Generated file, do not edit manually.');
  lines.push('/**');
  lines.push(' * Generated file: AAGUID to provider label map.');
  lines.push(' * Source: passkeydeveloper/passkey-authenticator-aaguids (aaguid.json).');
  lines.push(' * Regenerate with: npm run sync:aaguid-map');
  lines.push(' *');
  lines.push(' * @package AdvancedPasskeyLogin');
  lines.push(' */');
  lines.push('');
  lines.push("if ( ! defined( 'ABSPATH' ) ) {");
  lines.push('\texit;');
  lines.push('}');
  lines.push('');
  lines.push('return array(');

  for (const [aaguid, provider] of map) {
    const escapedProvider = provider.replace(/'/g, "\\'");
    lines.push(`\t'${aaguid}' => '${escapedProvider}',`);
  }

  lines.push(');');
  lines.push('');

  return `${lines.join('\n')}`;
}

function toPhpProviderIconMap(map) {
  const lines = [];
  lines.push('<?php');
  lines.push('// phpcs:ignoreFile -- Generated file, do not edit manually.');
  lines.push('/**');
  lines.push(' * Generated file: provider key to icon asset map.');
  lines.push(' * Source: passkeydeveloper/passkey-authenticator-aaguids (aaguid.json).');
  lines.push(' * Regenerate with: npm run sync:aaguid-map');
  lines.push(' *');
  lines.push(' * @package AdvancedPasskeyLogin');
  lines.push(' */');
  lines.push('');
  lines.push("if ( ! defined( 'ABSPATH' ) ) {");
  lines.push('\texit;');
  lines.push('}');
  lines.push('');
  lines.push('return array(');

  for (const [providerKey, icons] of map) {
    const iconLight = String(icons.icon_light || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const iconDark = String(icons.icon_dark || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`\t'${providerKey}' => array(`);
    lines.push(`\t\t'icon_light' => '${iconLight}',`);
    lines.push(`\t\t'icon_dark' => '${iconDark}',`);
    lines.push('\t),');
  }

  lines.push(');');
  lines.push('');

  return `${lines.join('\n')}`;
}

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'advanced-passkey-login-sync-script',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source JSON: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('Unexpected JSON format: expected object keyed by AAGUID');
  }

  const entries = [];
  const providerIcons = new Map();

  for (const [rawAaguid, value] of Object.entries(json)) {
    const aaguid = normalizeAaguid(rawAaguid);
    if (!aaguid) {
      continue;
    }

    const name = normalizeLabel(value && typeof value === 'object' ? value.name : '');
    if (!name) {
      continue;
    }

    entries.push([aaguid, name]);

    const providerKey = normalizeProviderKey(name);
    if ('unknown' === providerKey) {
      continue;
    }

    const iconLight = normalizeIconDataUri(value && typeof value === 'object' ? value.icon_light : '');
    const iconDark = normalizeIconDataUri(value && typeof value === 'object' ? value.icon_dark : '');

    if (!iconLight && !iconDark) {
      continue;
    }

    const existing = providerIcons.get(providerKey) || { icon_light: '', icon_dark: '' };
    if (!existing.icon_light && iconLight) {
      existing.icon_light = iconLight;
    }
    if (!existing.icon_dark && iconDark) {
      existing.icon_dark = iconDark;
    }

    providerIcons.set(providerKey, existing);
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const deduped = new Map(entries);

  const providerIconEntries = Array.from(providerIcons.entries())
    .filter(([, icons]) => String(icons.icon_light || '') !== '' || String(icons.icon_dark || '') !== '')
    .sort((a, b) => a[0].localeCompare(b[0]));

  const dedupedProviderIcons = new Map(providerIconEntries);

  const aaguidMapOutput = toPhpAaguidMap(deduped);
  const providerIconMapOutput = toPhpProviderIconMap(dedupedProviderIcons);

  const aaguidMapPath = path.resolve(process.cwd(), OUTPUT_AAGUID_MAP_PATH);
  const providerIconMapPath = path.resolve(process.cwd(), OUTPUT_PROVIDER_ICON_MAP_PATH);

  await writeFile(aaguidMapPath, aaguidMapOutput, 'utf8');
  await writeFile(providerIconMapPath, providerIconMapOutput, 'utf8');

  console.log(`Generated ${OUTPUT_AAGUID_MAP_PATH} with ${deduped.size} entries.`);
  console.log(`Generated ${OUTPUT_PROVIDER_ICON_MAP_PATH} with ${dedupedProviderIcons.size} entries.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
