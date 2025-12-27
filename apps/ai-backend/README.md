# FitOS AI Backend

LangGraph-based multi-agent system for AI coaching.

## Tech Stack

- Python 3.11+
- LangGraph for orchestration
- FastAPI for HTTP endpoints
- Deployed on Google Cloud Run

## Setup

```bash
cd apps/ai-backend
poetry install
```

## Development

```bash
poetry run uvicorn main:app --reload
```

## Agents (Phase 2)

1. **Workout Agent** - Exercise programming, substitutions
2. **Nutrition Agent** - Macro tracking, meal suggestions
3. **Recovery Agent** - HRV analysis, sleep recommendations
4. **Motivation Agent** - Encouragement, accountability
5. **Admin Agent** - Scheduling, payments, reminders

## MCP Servers (Phase 2)

- Terra API (wearables)
- Stripe (payments)
- Calendar integration
