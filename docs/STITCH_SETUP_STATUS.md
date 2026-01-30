# Stitch MCP Setup Status

**Date:** January 29, 2026
**Purpose:** Track Google Stitch integration setup and design pipeline progress

---

## Completed

### MCP Server Configuration
- [x] Stitch MCP server configured in `~/.claude.json` with API key auth
- [x] Server URL: `https://stitch.googleapis.com/mcp`
- [x] Authentication method: API Key (via `X-Goog-Api-Key` header)

### Google Cloud
- [x] gcloud CLI installed (Homebrew, v553.0.0)
- [x] Authenticated as `email@douglaswhite.dev`
- [x] Active project: `fitos-88fff`

### Stitch Skills
- [x] `design-md` skill installed globally (`~/.agents/skills/design-md`)
- [x] `enhance-prompt` skill installed globally (`~/.agents/skills/enhance-prompt`)
- [x] Skills linked to: Claude Code, Codex, Cursor, Gemini CLI

### Documentation
- [x] App page inventory completed (96+ mobile pages, 11 landing pages)
- [x] Design sprint plan created (`docs/STITCH_DESIGN_SPRINTS.md`)
- [x] 12 design sprints planned (Sprints 46-57)
- [x] Pages organized by feature area and priority

---

## In Progress

### Session Activation
- [ ] Stitch MCP tools need to be loaded in a new Claude Code session
  - The MCP server was added after session start; restart session or run `/mcp` to load
  - Once loaded, Stitch tools will be available: `create_project`, `generate_screen`, `list_screens`, `export_screen`, etc.

---

## Not Yet Started

### Design Generation (Sprints 46-57)
- [ ] Sprint 46: Auth & Onboarding (15 pages) - High priority
- [ ] Sprint 47: Dashboard & Navigation (2 pages) - High priority
- [ ] Sprint 48: Workouts (10 pages) - High priority
- [ ] Sprint 49: Nutrition (4 pages) - High priority
- [ ] Sprint 50: Coaching & Messages (5 pages) - Medium priority
- [ ] Sprint 51: Client Management (7 pages) - Medium priority
- [ ] Sprint 52: CRM & Marketing (8 pages) - Medium priority
- [ ] Sprint 53: Settings & Profile (14 pages) - Medium priority
- [ ] Sprint 54: Analytics & Business (8 pages) - Low priority
- [ ] Sprint 55: Franchise & Enterprise (5 pages) - Low priority
- [ ] Sprint 56: Help, Social & Specialty (13 pages) - Low priority
- [ ] Sprint 57: Landing Site (11 pages) - Medium priority

### Design Application
- [ ] Extract design context from generated Stitch screens
- [ ] Convert designs to Angular/Ionic inline templates
- [ ] Update component styles with design tokens
- [ ] Verify builds after each sprint

---

## Key Files

| File | Purpose |
|------|---------|
| `~/.claude.json` | Stitch MCP server config (user-level) |
| `docs/STITCH_DESIGN_SPRINTS.md` | Sprint plan with all 102 pages |
| `docs/DESIGN_SYSTEM.md` | Design tokens, colors, typography |
| `docs/SPRINT_PLANNING.md` | Original sprint history (1-45) |
| `docs/ROADMAP.md` | Strategic roadmap |
| `~/.agents/skills/design-md/SKILL.md` | Design extraction skill |
| `~/.agents/skills/enhance-prompt/SKILL.md` | Prompt optimization skill |

---

## Next Steps

1. **Start a new Claude Code session** to load Stitch MCP tools
2. Begin with **Sprint 46 (Auth & Onboarding)** - highest user-facing impact
3. Use `enhance-prompt` to generate Stitch-optimized prompts for each page
4. Generate designs via Stitch MCP `generate_screen` tool
5. Apply designs to Angular/Ionic components
6. Build and verify after each page
