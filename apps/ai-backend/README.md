# FitOS AI Backend

Multi-agent AI coaching system built with LangGraph, FastAPI, and deployed on Google Cloud Run.

## Features

- **Multi-Agent Coaching System**: 5 specialized agents (workout, nutrition, recovery, motivation, general)
- **Voice AI**: Deepgram integration for real-time workout logging
- **Photo Nutrition**: AI-powered food recognition
- **JITAI Interventions**: Just-In-Time adaptive interventions based on Stanford GPTCoach research
- **Adherence-Neutral**: Non-judgmental nutrition coaching
- **Smart Escalation**: Automatic trainer notification for pain/injury concerns

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Modern async web framework
- **LangGraph** - Multi-agent orchestration
- **LangChain** - LLM abstraction (supports OpenAI, Anthropic, Google)
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## Setup

### 1. Install Dependencies

```bash
cd apps/ai-backend

# Install Poetry if not already installed
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Required: Choose one LLM provider
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-...

# Optional (for full features)
DEEPGRAM_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Run Development Server

```bash
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **Base URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

## API Endpoints

### AI Coach (`/api/v1/coach`)

**POST `/chat`** - Multi-agent conversation
```json
{
  "message": "How much protein should I eat?",
  "conversationHistory": [],
  "userContext": {
    "user_id": "uuid",
    "role": "client",
    "goals": ["muscle_gain"],
    "fitness_level": "intermediate"
  }
}
```

### Nutrition AI (`/api/v1/nutrition`)

**POST `/recognize`** - Photo food recognition
```json
{
  "image": "base64_encoded_image",
  "format": "jpeg"
}
```

**POST `/parse`** - Natural language parsing
```json
{
  "text": "two eggs and toast with butter"
}
```

### Voice AI (`/api/v1/voice`)

**WebSocket `/stream`** - Real-time transcription
- Send: Audio chunks (WebM/Opus)
- Receive: Transcripts with workout intents

**POST `/speak`** - Text-to-speech
```json
{
  "text": "Great set! 10 reps logged.",
  "voice": "aura-asteria-en"
}
```

### JITAI (`/api/v1/jitai`)

**GET `/context/{user_id}`** - Calculate intervention context
```json
{
  "vulnerability": 0.72,
  "receptivity": 0.85,
  "opportunity": 0.68
}
```

**POST `/generate`** - Generate personalized intervention
```json
{
  "id": "int_...",
  "type": "reminder",
  "title": "Your workout is ready",
  "message": "You've been consistent...",
  "priority": 4
}
```

## Agent Architecture

### Router
Classifies user intent and routes to appropriate specialist agent.

### Specialist Agents

1. **Workout Agent**
   - Exercise programming
   - Form advice
   - Progression strategies
   - NEVER diagnoses injuries (escalates)

2. **Nutrition Agent**
   - Macro guidance (adherence-neutral language)
   - Meal suggestions
   - Celebrates all logging efforts

3. **Recovery Agent**
   - HRV/sleep interpretation
   - Rest day recommendations
   - Deload protocols

4. **Motivation Agent**
   - Accountability coaching
   - Reframes setbacks
   - Detects severe distress (escalates)

5. **General Agent**
   - App features/navigation
   - Scheduling
   - Falls back when uncertain

### Escalation
Automatically notifies trainer for:
- Pain/injury mentions
- Complex programming questions
- Mental health concerns
- Low confidence responses (<0.6)

## Testing

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run specific test file
poetry run pytest tests/test_agents.py

# Run only unit tests
poetry run pytest -m unit
```

## Deployment

### Docker (Local)

```bash
# Build image
docker build -t fitos-ai-backend .

# Run container
docker run -p 8000:8000 --env-file .env fitos-ai-backend
```

### Docker Compose

```bash
docker-compose up -d
```

### Google Cloud Run

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud builds submit --config cloudbuild.yaml

# Or use gcloud run deploy directly
gcloud run deploy fitos-ai-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

Set environment variables in Cloud Run:
```bash
gcloud run services update fitos-ai-backend \
  --set-env-vars ANTHROPIC_API_KEY=sk-ant-... \
  --set-env-vars DEEPGRAM_API_KEY=... \
  --set-env-vars ENVIRONMENT=production
```

## Development

### Project Structure

```
apps/ai-backend/
├── app/
│   ├── agents/           # LangGraph agents
│   │   ├── state.py      # Shared state definitions
│   │   ├── coach_graph.py # Multi-agent graph
│   │   └── specialists.py # Agent implementations
│   ├── core/             # Core modules
│   │   ├── config.py     # Settings
│   │   ├── logging.py    # Logging config
│   │   └── llm.py        # LLM abstraction
│   └── routes/           # API endpoints
│       ├── coach.py
│       ├── nutrition.py
│       ├── voice.py
│       └── jitai.py
├── tests/                # Test suite
├── main.py               # FastAPI app
├── pyproject.toml        # Dependencies
├── Dockerfile
└── README.md
```

### Adding New Agents

1. Define agent function in `app/agents/specialists.py`
2. Add routing logic in `app/agents/coach_graph.py`
3. Update `AgentState` if needed
4. Add tests in `tests/test_agents.py`

### Code Style

```bash
# Format code
poetry run black app tests

# Lint
poetry run ruff check app tests

# Type check
poetry run mypy app
```

## Configuration

See `.env.example` for all available settings:

- **LLM Provider**: Choose Anthropic (Claude) or OpenAI (GPT-4)
- **Models**: Use fast models (Haiku/GPT-4o-mini) for routing, smart models (Sonnet/GPT-4o) for coaching
- **JITAI**: Max daily interventions, threshold for sending
- **CORS**: Allowed origins for API access

## Performance

- **Latency**: <2s for chat responses (with caching)
- **Voice STT**: <300ms with Deepgram Nova-3
- **Voice TTS**: <200ms with Deepgram Aura-2
- **Scalability**: Auto-scales on Cloud Run (0-10 instances)

## Monitoring

Health checks:
- `/api/v1/health` - Basic health
- `/api/v1/ready` - Readiness for traffic

Logs are structured JSON for Cloud Logging:
```python
logger.info(f"Processing chat for user {user_id}")
```

## Roadmap

- [ ] Integrate real Deepgram STT/TTS
- [ ] Add Passio AI food recognition
- [ ] Implement trainer methodology learning
- [ ] Add intervention effectiveness tracking
- [ ] Implement conversation summarization
- [ ] Add rate limiting
- [ ] Implement caching layer (Redis)
- [ ] Add authentication middleware

## License

Proprietary - FitOS 2026
