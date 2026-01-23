#!/usr/bin/env node
/**
 * Changelog Generator Script
 *
 * Reads docs/CHANGELOG.json and generates TypeScript changelog data
 * for the landing page changelog component.
 *
 * Usage: node scripts/generate-changelog.js
 */

const fs = require('fs');
const path = require('path');

const CHANGELOG_JSON = path.join(__dirname, '../docs/CHANGELOG.json');
const OUTPUT_FILE = path.join(__dirname, '../apps/landing/src/app/pages/changelog/changelog.data.ts');

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateTypeScript(changelogData) {
  const releasedVersions = changelogData.versions.filter(v => v.released);

  const versionsTS = releasedVersions.map(version => {
    const changesTS = version.changes.map(change => {
      return `        { type: '${change.type}', description: '${change.description.replace(/'/g, "\\'")}' }`;
    }).join(',\n');

    return `    {
      version: '${version.version}',
      date: '${formatDate(version.date)}',
      changes: [
${changesTS}
      ],
    }`;
  }).join(',\n');

  return `/**
 * Changelog Data
 *
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from docs/CHANGELOG.json
 * Run 'npm run changelog:generate' to update
 *
 * Last updated: ${new Date().toISOString()}
 */

import type { ChangelogVersion } from './changelog.component';

export const CHANGELOG_VERSIONS: ChangelogVersion[] = [
${versionsTS}
];
`;
}

function main() {
  try {
    console.log('📝 Reading changelog from docs/CHANGELOG.json...');

    if (!fs.existsSync(CHANGELOG_JSON)) {
      console.error('❌ Error: docs/CHANGELOG.json not found');
      process.exit(1);
    }

    const changelogData = JSON.parse(fs.readFileSync(CHANGELOG_JSON, 'utf8'));

    if (!changelogData.versions || !Array.isArray(changelogData.versions)) {
      console.error('❌ Error: Invalid changelog format. Expected { versions: [...] }');
      process.exit(1);
    }

    console.log(`✅ Found ${changelogData.versions.length} version(s)`);

    const releasedCount = changelogData.versions.filter(v => v.released).length;
    console.log(`📦 ${releasedCount} released version(s) will be included`);

    console.log('🔨 Generating TypeScript...');
    const typescript = generateTypeScript(changelogData);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, typescript, 'utf8');

    console.log(`✅ Changelog generated successfully!`);
    console.log(`📄 Output: ${OUTPUT_FILE}`);
    console.log('');
    console.log('💡 Tip: Add this to your pre-commit hook or CI/CD pipeline');

  } catch (error) {
    console.error('❌ Error generating changelog:', error.message);
    process.exit(1);
  }
}

main();
