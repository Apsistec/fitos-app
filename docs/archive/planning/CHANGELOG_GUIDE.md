# Changelog Management Guide

## Overview

The FitOS changelog system uses a JSON-based approach to manage version history. Changes are stored in `docs/CHANGELOG.json` and automatically compiled into TypeScript during the build process.

## File Structure

```
docs/
  └── CHANGELOG.json          # Source of truth for all versions
scripts/
  └── generate-changelog.js   # Generator script
apps/landing/src/app/pages/changelog/
  ├── changelog.component.ts  # Component that displays changelog
  └── changelog.data.ts       # AUTO-GENERATED - Do not edit manually
```

## Adding a New Version

### 1. Edit `docs/CHANGELOG.json`

Add your new version to the `versions` array:

```json
{
  "versions": [
    {
      "version": "1.1.0",
      "date": "2026-02-15",
      "released": true,
      "changes": [
        {
          "type": "feature",
          "description": "AI-powered voice workout logging with Deepgram"
        },
        {
          "type": "improvement",
          "description": "Enhanced workout builder with drag-and-drop"
        },
        {
          "type": "bugfix",
          "description": "Fixed sync issue with offline workout logs"
        },
        {
          "type": "breaking",
          "description": "Updated API authentication - requires re-login"
        }
      ]
    }
  ]
}
```

### 2. Change Types

Use these standard types:
- `feature` - New functionality
- `improvement` - Enhancement to existing feature
- `bugfix` - Bug fixes
- `breaking` - Breaking changes that require user action

### 3. Version Visibility

Set `"released": true` to show the version on the changelog page. Unreleased versions can be prepared in advance with `"released": false`.

### 4. Generate TypeScript

Run the generation script:

```bash
npm run changelog:generate
```

This will update `apps/landing/src/app/pages/changelog/changelog.data.ts`.

### 5. Commit Changes

```bash
git add docs/CHANGELOG.json apps/landing/src/app/pages/changelog/changelog.data.ts
git commit -m "docs: add changelog for v1.1.0"
```

## Automation

The changelog is automatically generated during production builds:

```bash
npm run build:landing  # Runs changelog:generate before building
npm run build:all      # Runs changelog:generate before building all apps
```

## Best Practices

1. **Date Format**: Use ISO 8601 format (YYYY-MM-DD) for dates
2. **Version Order**: Place newest versions first in the array
3. **Change Descriptions**: Be concise but descriptive
4. **Breaking Changes**: Always mark breaking changes clearly
5. **Release Notes**: Consider adding a summary for major versions

## Accordion Behavior

The changelog page uses an accordion component that:
- Shows all version numbers (questions)
- Expands only the latest version by default
- Closes other versions when a new one is clicked
- Animates smoothly between states

## Example Entry

```json
{
  "version": "2.0.0",
  "date": "2026-03-01",
  "released": true,
  "changes": [
    {
      "type": "breaking",
      "description": "Migrated to new pricing model - all users must update subscription"
    },
    {
      "type": "feature",
      "description": "Apple Watch companion app with offline workout tracking"
    },
    {
      "type": "feature",
      "description": "Photo nutrition AI with transparent breakdown"
    },
    {
      "type": "improvement",
      "description": "50% faster workout sync performance"
    },
    {
      "type": "bugfix",
      "description": "Fixed notification delivery on Android 15"
    }
  ]
}
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Generate Changelog
  run: npm run changelog:generate

- name: Verify Changelog
  run: |
    if git diff --exit-code apps/landing/src/app/pages/changelog/changelog.data.ts; then
      echo "Changelog is up to date"
    else
      echo "ERROR: Changelog data is out of sync"
      echo "Run: npm run changelog:generate"
      exit 1
    fi
```

## Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run changelog:generate
git add apps/landing/src/app/pages/changelog/changelog.data.ts
```
