# ROADMAP Update — Phase 7 Addition

**Append the following section to your existing `ROADMAP.md` after the Phase 5 section.**

---

## Phase 7: Service Security Hardening (Sprints 78–86) — PRIORITY: P0

**Timeline:** Recommended to execute BEFORE or PARALLEL with Phases 3–5
**Duration:** 6–8 weeks
**Points:** 94

A comprehensive service-layer security audit identified ~150 issues across 50+ Angular services. This phase systematically addresses all findings, organized by severity and domain.

### Sprint Summary

| Sprint | Focus | Severity | Points |
|--------|-------|----------|--------|
| 78 | Core Auth & Identity — IDOR Fixes | CRITICAL | 13 |
| 79 | Financial Security — Server-Side Calculations | CRITICAL | 13 |
| 80 | HIPAA & Compliance — Audit Trail Hardening | CRITICAL | 13 |
| 81 | Token, Key & Session Security | CRITICAL/HIGH | 8 |
| 82 | Authorization Sweep — Client/CRM/Social | HIGH | 13 |
| 83 | Authorization Sweep — Scheduling/Payments/Recovery | HIGH | 13 |
| 84 | Input Validation, Mock Data & Compliance | HIGH/MEDIUM | 8 |
| 85 | Performance — N+1 Queries & Pagination | HIGH/MEDIUM | 8 |
| 86 | Production Readiness — Logging & Polish | MEDIUM/LOW | 5 |

### Key Deliverables
- Zero IDOR vulnerabilities (all services derive identity from auth session)
- All financial calculations server-side via Supabase RPCs
- HIPAA-compliant audit trail with retry and local queue
- No API keys or OAuth tokens in client-side code
- Centralized `LogService` replacing all `console.*` calls
- N+1 queries eliminated; all list queries paginated

### Related Documents
- `SPRINTS_78-86_SECURITY_ROADMAP.md` — Detailed sprint plan with exact issues and fixes
- `PHASE7_SECURITY_BACKLOG.md` — Backlog with service-level issue inventory
- `CLAUDE_CODE_SECURITY_HANDOFF.md` — Development handoff for Sprint 78

---

## Updated Phase Timeline

| Phase | Sprints | Status | Priority |
|-------|---------|--------|----------|
| Phase 1 (MVP) | 1–6 | ✅ Complete | — |
| Phase 2 (AI) | 7–16 | ✅ Complete | — |
| Phase 2D/3A | 17–26 | ✅ Complete | — |
| **Phase 7 (Service Security)** | **78–86** | **📋 Planned** | **P0 — Do First** |
| Phase 3 (Market Leadership) | 27–45 | 📋 Planned | P1 |
| Phase 4 (Zero Friction) | 46–53 | 📋 Planned | P2 |
| Phase 5 (Scheduling) | 54–61 | 📋 Planned | P2 |

> **Note:** Phase 7 sprint numbers (78–86) are sequenced after Phase 5 for numbering consistency, but should be EXECUTED before Phases 3–5. Security hardening establishes patterns (ownership checks, server-side computation, centralized logging) that all future feature work will inherit, reducing rework.

---

## Sprint Numbering Audit (March 2026)

All existing sprint numbers were reviewed for overlaps:
- Sprints 1–26: ✅ Sequential, unique (completed)
- Sprints 27–45: ✅ Sequential, unique (Phase 3 planned)
- Sprints 46–53: ✅ Sequential, unique (Phase 4 planned)
- Sprints 54–61: ✅ Sequential, unique (Phase 5 planned)
- Sprints 78–86: ✅ New, no conflicts (Phase 7 service security)

**No sprint numbering overlaps were found.** All sprints have unique numbers in order.
