# Config Validation Policy

## Purpose

This document defines the mandatory config validation rules for the FitOS monorepo. **Every time a config file is added, updated, or removed, the entire config dependency chain must be validated** to prevent cascading failures across apps.

---

## Single Source of Truth

| Concern | Authority File | Consumers |
|---------|---------------|-----------|
| **Environment variables** | `.env` (root) | `environment.ts`, `environment.prod.ts`, `supabase/config.toml`, `docker-compose.yml` |
| **Node.js version** | `package.json` → `engines.node` + `.nvmrc` | CI/CD, developer machines |
| **TypeScript version** | `package.json` → `devDependencies.typescript` | All `tsconfig*.json` files |
| **Angular version** | `package.json` → `dependencies.@angular/core` | All `project.json`, `tsconfig*.json` |
| **Dependencies** | Root `package.json` only | App `package.json` files are scripts-only (no deps) |
| **ESLint rules** | Root `eslint.config.mjs` | App `eslint.config.js` must extend root |
| **TypeScript base config** | `tsconfig.base.json` | App `tsconfig.json` extends base; app `tsconfig.app.json` extends local `tsconfig.json` |
| **Capacitor config** | Root `capacitor.config.ts` only | No per-app Capacitor configs |
| **NX project config** | `project.json` per app | No `angular.json` files in apps |
| **Service worker** | `apps/mobile/ngsw-config.json` | Referenced by `project.json` `serviceWorker` field. No copy in `src/`. |
| **Supabase project** | `supabase/config.toml` | Must include `project_id`, env vars must match `.env` names |
| **Python tools** | `pytest.ini` for pytest (single source) | No duplicate `[tool.pytest.ini_options]` in `pyproject.toml` |
| **Docker** | `Dockerfile` + `docker-compose.yml` | `env_file` must point to root `.env` via relative path |

---

## Validation Checklist

Run this checklist whenever ANY config file is modified:

### 1. No Duplicate Config Files
- [ ] Only ONE `capacitor.config.ts` (root only, never `apps/mobile/`)
- [ ] No `capacitor.config.json` anywhere
- [ ] No `angular.json` in any app (use `project.json` for NX)
- [ ] Only ONE `ngsw-config.json` at `apps/mobile/ngsw-config.json`
- [ ] No nested `node_modules/` in `apps/` or `libs/` or `docs/`
- [ ] pytest config in ONE place only (`pytest.ini` OR `pyproject.toml`, not both)

### 2. Dependency Management
- [ ] ALL npm dependencies declared in root `package.json` only
- [ ] App `package.json` files contain ONLY `scripts` and `engines` (no deps, devDeps, or overrides)
- [ ] Run `npm ls @angular/core` — must show single version, all `deduped`
- [ ] Run `npm ls @angular/core 2>&1 | grep -v deduped | grep @angular/core` — should show exactly ONE line

### 3. Environment Variable Consistency
- [ ] `.env` is the single source of truth for all env var NAMES
- [ ] `supabase/config.toml` `env()` references match `.env` variable names exactly
- [ ] `environment.ts` (dev) values match `.env` values for local development
- [ ] `environment.prod.ts` uses remote/production values (Supabase JWT, not local key)
- [ ] No `localhost` URLs in any `environment.prod.ts`
- [ ] PORT in `.env` doesn't conflict with Angular dev server ports (4200, 4201)

### 4. TypeScript Config Chain
- [ ] `tsconfig.base.json` → shared settings and path aliases for `@fitos/shared`, `@fitos/libs`
- [ ] `apps/*/tsconfig.json` → extends `../../tsconfig.base.json`, adds app-specific paths
- [ ] `apps/*/tsconfig.app.json` → extends `./tsconfig.json` (NOT `../../tsconfig.base.json`)
- [ ] If app `tsconfig.json` has `baseUrl: "."`, it must redeclare shared path aliases relative to app dir
- [ ] No `emitDecoratorMetadata` (not needed for Angular 21)

### 5. Build Config Consistency
- [ ] `project.json` `outputPath` matches `capacitor.config.ts` `webDir` (relative paths differ)
- [ ] `firebase.json` `public` matches build output path
- [ ] `firebase.json` manifest header matches actual manifest filename (`manifest.webmanifest`)
- [ ] All apps use same lint executor (`@nx/eslint:lint`)
- [ ] All apps have `build`, `serve`, `test`, and `lint` targets

### 6. NX Config
- [ ] `nx.json` lint inputs reference only files that exist (`eslint.config.mjs`, NOT `.eslintrc.json`)
- [ ] `nx.json` production named inputs exclude only files that exist
- [ ] No stale references to removed config formats

### 7. Docker/Python Config
- [ ] No `version:` key in `docker-compose.yml` (deprecated)
- [ ] `docker-compose.yml` healthcheck uses tools available in the image (python, not curl)
- [ ] `docker-compose.yml` `env_file` points to root `.env` (e.g., `../../.env`)
- [ ] `Dockerfile` uses `--only main` not deprecated `--no-dev`

---

## Config File Registry

Every config file in the repo and its purpose:

### Root
| File | Purpose | Authority For |
|------|---------|--------------|
| `package.json` | ALL npm dependencies, scripts, engines | Dependencies, Node version |
| `tsconfig.base.json` | Shared TS compiler options, path aliases | TS compilation base |
| `nx.json` | NX workspace config, cache inputs, generators | Build orchestration |
| `eslint.config.mjs` | Root ESLint rules inc. `@nx/enforce-module-boundaries` | Lint rules base |
| `capacitor.config.ts` | Capacitor native app config | Mobile native builds |
| `firebase.json` | Firebase Hosting + Functions config | Deployment |
| `.env` | ALL environment variables | Env vars (SINGLE SOURCE OF TRUTH) |
| `.nvmrc` | Node.js version for nvm/fnm | Developer Node version |
| `.gitignore` | Git ignore patterns | Version control |

### apps/mobile
| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | Scripts only, NO dependencies | Deps hoisted to root |
| `tsconfig.json` | App TS config, extends base | Adds `@app/*`, `@env/*` paths |
| `tsconfig.app.json` | Build TS config, extends local tsconfig | Overrides for build |
| `tsconfig.spec.json` | Test TS config | Used by vitest.config.ts |
| `project.json` | NX project config | Build, serve, test, lint targets |
| `eslint.config.js` | App ESLint, extends root | Adds Angular-specific rules |
| `vitest.config.ts` | Vitest test runner config | |
| `ngsw-config.json` | Service worker caching config | Referenced by project.json |

### apps/landing
| File | Purpose | Notes |
|------|---------|-------|
| `tsconfig.json` | App TS config, extends base | |
| `tsconfig.app.json` | Build TS config, extends local tsconfig | |
| `project.json` | NX project config | Build, serve, test, lint targets |
| `eslint.config.js` | App ESLint, extends root | |
| `server.ts` | SSR entry point | Reads PORT from env |

### apps/ai-backend
| File | Purpose | Notes |
|------|---------|-------|
| `pyproject.toml` | Poetry deps, black/ruff config | NO pytest config here |
| `pytest.ini` | Pytest config (single source) | Markers, addopts, testpaths |
| `Dockerfile` | Production container build | |
| `docker-compose.yml` | Dev environment | `env_file` → root `.env` |

### supabase
| File | Purpose | Notes |
|------|---------|-------|
| `config.toml` | Local Supabase config | `project_id`, auth, env() refs must match `.env` |

---

## When to Run Validation

| Trigger | Action |
|---------|--------|
| Any `package.json` change | Run dependency dedup check |
| Any `tsconfig*.json` change | Verify extends chain, check path aliases resolve |
| Any `environment*.ts` change | Cross-check with `.env` authority values |
| Any `.env` change | Update all `environment.ts` dev files to match |
| Any `project.json` change | Verify all targets exist, output paths match firebase.json |
| New app or library added | Verify extends root ESLint, tsconfig chain, no duplicate deps |
| Capacitor plugin added | Add to root `capacitor.config.ts` only |
| New supabase env var | Add to both `.env` and `supabase/config.toml` with matching names |
| Docker config change | Verify image has required tools, env_file path correct |
