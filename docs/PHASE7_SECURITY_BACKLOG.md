# Phase 7: Service Security Hardening Backlog

**Created:** 2026-03-06
**Phase:** 6 — Security Hardening (Sprints 78–86)
**Priority:** P0 — Must complete before public launch
**Source:** Service-layer security audit (March 2026)

---

## Phase Overview

| Attribute | Value |
|-----------|-------|
| Total Sprints | 9 (78–86) |
| Total Issues | ~150 (deduplicated) |
| CRITICAL Issues | ~18 |
| HIGH Issues | ~45 |
| MEDIUM Issues | ~65 |
| LOW Issues | ~22 |
| Estimated Points | 94 |
| Estimated Duration | 6–8 weeks (with parallelization) |

---

## Sprint Status Tracker

| Sprint | Name | Status | Points | Completion |
|--------|------|--------|--------|------------|
| 78 | Core Auth & Identity — IDOR Fixes | 📋 Planned | 13 | — |
| 79 | Financial Security — Server-Side Calculations | 📋 Planned | 13 | — |
| 80 | HIPAA & Compliance — Audit Trail Hardening | 📋 Planned | 13 | — |
| 81 | Token, Key & Session Security | 📋 Planned | 8 | — |
| 82 | Authorization Sweep — Client/CRM/Social | 📋 Planned | 13 | — |
| 83 | Authorization Sweep — Scheduling/Payments/Recovery | 📋 Planned | 13 | — |
| 84 | Input Validation, Mock Data & Compliance | 📋 Planned | 8 | — |
| 85 | Performance — N+1 Queries & Pagination | 📋 Planned | 8 | — |
| 86 | Production Readiness — Logging & Polish | 📋 Planned | 5 | — |

---

## Completed Phases Reference

| Phase | Sprints | Focus | Status |
|-------|---------|-------|--------|
| Phase 1 (MVP) | 1–6 | Core features, auth, workouts, nutrition | ✅ Complete |
| Phase 2 (AI) | 7–16 | Voice AI, Photo Nutrition, CRM, JITAI | ✅ Complete |
| Phase 2D/3A | 17–26 | Coach Brain, Autonomy, Streaks, Gym Owner Analytics | ✅ Complete |
| Phase 3 (Market Leadership) | 27–45 | Stripe Connect, Agentic AI, Fitness Science | 📋 Planned |
| Phase 4 (Zero Friction) | 46–53 | NFC, Widgets, HealthKit/Health Connect, Voice | 📋 Planned |
| Phase 5 (Scheduling) | 54–61 | Mindbody-equivalent appointments, POS, Payroll | 📋 Planned |
| **Phase 7 (Service Security)** | **78–86** | **Security hardening across all services** | **📋 Planned** |

---

## Issue Inventory by Service (Deduplicated)

### Services with CRITICAL Issues

| Service | CRITICAL | HIGH | MEDIUM | LOW | Sprint(s) |
|---------|----------|------|--------|-----|-----------|
| ai-coach.service.ts | 3 | 3 | 3 | 2 | 78, 86 |
| appointment-fsm.service.ts | 2 | 3 | 3 | 2 | 78, 86 |
| appointment.service.ts | 3 | 3 | 3 | 2 | 78, 86 |
| assignment.service.ts | 3 | 3 | 2 | 2 | 78, 86 |
| audit-log.service.ts | 3 | 4 | 3 | 2 | 80 |
| cancellation-policy.service.ts | 1 | 2 | 2 | 0 | 79 |
| client-ledger.service.ts | 1 | 1 | 1 | 0 | 79 |
| digital-product.service.ts | 1 | 2 | 2 | 0 | 79 |
| integration.service.ts | 1 | 1 | 2 | 0 | 81 |
| payroll.service.ts | 1 | 1 | 1 | 0 | 79 |
| sale-transactions.service.ts | 1 | 1 | 1 | 0 | 79 |
| sso.service.ts | 1 | 1 | 3 | 0 | 81 |

### Services with HIGH Issues (No CRITICAL)

| Service | HIGH | MEDIUM | LOW | Sprint(s) |
|---------|------|--------|-----|-----------|
| accountability-group.service.ts | 2 | 2 | 2 | 82 |
| auth.service.ts | 3 | 5 | 2 | 78 |
| autonomy.service.ts | 1 | 3 | 0 | 82 |
| checkin.service.ts | 2 | 1 | 0 | 82 |
| chronotype.service.ts | 1 | 2 | 0 | 81, 84 |
| client.service.ts | 3 | 3 | 1 | 82, 85, 86 |
| email-template.service.ts | 2 | 3 | 0 | 82, 84 |
| email.service.ts | 2 | 3 | 0 | 82, 84 |
| exercise.service.ts | 1 | 2 | 0 | 84 |
| food.service.ts | 1 | 3 | 0 | 81 |
| gamification.service.ts | 1 | 2 | 0 | 82 |
| growth-analytics.service.ts | 1 | 2 | 0 | 82 |
| jitai.service.ts | 2 | 1 | 0 | 81, 84 |
| lead.service.ts | 2 | 3 | 0 | 82 |
| measurement.service.ts | 2 | 2 | 0 | 83 |
| messaging.service.ts | 1 | 3 | 0 | 82, 85 |
| nutrition-parser.service.ts | 1 | 2 | 0 | 84 |
| photo-nutrition.service.ts | 1 | 2 | 0 | 84 |
| pricing-option.service.ts | 1 | 1 | 0 | 79 |
| progress-photo.service.ts | 1 | 2 | 0 | 83 |
| rbac.service.ts | 3 | 3 | 1 | 83 |
| recovery.service.ts | 1 | 3 | 0 | 83 |
| referral.service.ts | 1 | 3 | 0 | 83 |
| stripe.service.ts | 1 | 2 | 1 | 83 |
| supabase.service.ts | 1 | 2 | 1 | 81 |
| support.service.ts | 1 | 1 | 0 | 81 |
| trainer-performance.service.ts | 1 | 2 | 0 | 79, 85 |
| video-feedback.service.ts | 1 | 2 | 0 | 83 |
| voice.service.ts | 1 | 2 | 0 | 81 |
| wellness.service.ts | 1 | 2 | 0 | 80 |

### Services with MEDIUM/LOW Issues Only

| Service | MEDIUM | LOW | Sprint(s) |
|---------|--------|-----|-----------|
| app-shortcuts.service.ts | 2 | 3 | 85, 86 |
| availability.service.ts | 2 | 1 | 83 |
| barcode-scanner.service.ts | 1 | 1 | 83, 86 |
| celebration.service.ts | 1 | 1 | 85 |
| client-dashboard.service.ts | 2 | 1 | 86 |
| deep-link.service.ts | 2 | 0 | 84 |
| equipment-ocr.service.ts | 2 | 1 | 84 |
| firebase.service.ts | 2 | 1 | 80 |
| geofence.service.ts | 2 | 1 | 84 |
| haptic.service.ts | 0 | 1 | 86 |
| health-sync.service.ts | 1 | 1 | 80 |
| healthkit.service.ts | 1 | 1 | 80 |
| idle-timeout.service.ts | 3 | 1 | 80 |
| invitation.service.ts | 2 | 1 | 83 |
| live-activity.service.ts | 0 | 2 | 85 |
| milestone-detector.service.ts | 2 | 0 | 86 |
| milestone.service.ts | 1 | 1 | 85 |
| nfc.service.ts | 1 | 1 | 83 |
| notification.service.ts | 3 | 0 | 83, 86 |
| nps.service.ts | 2 | 0 | 83 |
| nutrition.service.ts | 3 | 1 | 83, 86 |
| passkey.service.ts | 2 | 1 | 83 |
| program-assignment.service.ts | 2 | 0 | 83 |
| progress-timeline.service.ts | 2 | 0 | 83 |
| progressive-profiling.service.ts | 2 | 1 | 84 |
| scheduling-permissions.service.ts | 2 | 0 | 83 |
| service-type.service.ts | 2 | 0 | 83 |
| social-login.service.ts | 2 | 0 | 86 |
| streak.service.ts | 2 | 0 | 85 |
| subscription.service.ts | 2 | 0 | 79 |
| sync.service.ts | 2 | 0 | 85 |
| terra.service.ts | 2 | 0 | 86 |
| trainer-methodology.service.ts | 2 | 0 | 83 |
| trainer-public-profile.service.ts | 2 | 0 | 83 |
| update.service.ts | 0 | 1 | 86 |
| watch.service.ts | 0 | 1 | 86 |
| widget.service.ts | 0 | 2 | 86 |
| workout-session.service.ts | 3 | 0 | 83 |
| workout.service.ts | 2 | 0 | 83 |

### Services with No Issues

| Service | Notes |
|---------|-------|
| loading.service.ts | Clean minimal service |
| schedule-optimization.service.ts | Clean computational service |
| tab-config.service.ts | Stateless configuration |
| theme.service.ts | Well-structured |

---

## Database Migrations Required

Sprint 79 and 85 require new Supabase RPCs:

```
supabase/migrations/00XXX_security_rpcs.sql
├── get_client_ledger_balance(p_client_id uuid) → numeric
├── get_daily_revenue_summary(p_trainer_id uuid, p_date text) → json
├── get_outstanding_balances(p_trainer_id uuid) → json[]
├── get_trainer_mrr(p_trainer_id uuid) → numeric
├── get_trainer_performance_metrics(p_gym_owner_id uuid, ...) → json
├── get_payroll_summary(p_trainer_id uuid, ...) → json
├── increment_download_count(p_purchase_id uuid) → void
├── get_clients_needing_attention(p_trainer_id uuid, ...) → json[]
├── get_conversations(p_user_id uuid) → json[]
├── get_leaderboard(p_type text, ...) → json[]
├── get_trainer_email_metrics(p_trainer_id uuid) → json
├── calculate_and_save_recovery_score(p_user_id uuid, ...) → json
├── increment_referral_click(p_code text) → void
├── create_autonomy_assessment(...) → json
└── update_permission_with_audit(...) → void
```

Sprint 80 requires a new table:

```
supabase/migrations/00XXX_crisis_resource_log.sql
├── crisis_resource_access_log (user_id, resource_type, urgency_level, ...)
├── wellness_screenings (user_id, screening_type, responses, result, ...)
└── user_consents (user_id, health_data_sync boolean, ...)
```

Sprint 83 requires schema changes:

```
supabase/migrations/00XXX_push_tokens.sql
├── push_tokens (user_id, token, platform, updated_at)
└── Remove fcm_token column from profiles
```

Sprint 86 requires a new service:

```
apps/mobile/src/app/core/services/log.service.ts
```

---

## Recommended Priority Order

**If security sprints must run alongside feature work:**

| Priority | Sprint | Reason |
|----------|--------|--------|
| Immediate | 78 | CRITICAL IDORs allow cross-user data access |
| Immediate | 80 | HIPAA violations are legal liability |
| Immediate | 81 | API keys and tokens exposed in production |
| Week 2 | 79 | Financial calculations must be server-side |
| Week 3 | 82 | Remaining authorization gaps |
| Week 4 | 83 | Complete authorization coverage |
| Week 5 | 84 | Input validation and mock data |
| Week 6 | 85 | Performance fixes |
| Week 7 | 86 | Final production readiness |

---

## Relationship to Other Phases

Security hardening SHOULD be completed before:
- Phase 3 (Sprints 27–45): Payment infrastructure must be secure before processing real money
- Phase 4 (Sprints 46–53): NFC/widget features expand attack surface
- Phase 5 (Sprints 54–61): Scheduling adds new IDOR-vulnerable surfaces

Security fixes in this phase will REDUCE work in future phases by establishing patterns (ownership checks, server-side computation, centralized logging) that new features will inherit.
