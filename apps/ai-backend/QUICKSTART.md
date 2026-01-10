# FitOS AI Backend - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Option 1: Quick Setup (Recommended)

```bash
cd apps/ai-backend

# Run setup script
./scripts/setup.sh

# Add your API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env

# Start server
poetry run uvicorn main:app --reload
```

Visit http://localhost:8000/docs to see the API!

### Option 2: Manual Setup

```bash
cd apps/ai-backend

# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Run server
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🧪 Try the APIs

### 1. Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### 2. Chat with AI Coach
```bash
curl -X POST http://localhost:8000/api/v1/coach/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How should I progress my squat?",
    "conversationHistory": [],
    "userContext": {
      "user_id": "test-123",
      "role": "client",
      "goals": ["strength"],
      "fitness_level": "intermediate",
      "current_streak": 5,
      "weekly_adherence": 0.85
    }
  }'
```

### 3. Parse Food with Natural Language
```bash
curl -X POST http://localhost:8000/api/v1/nutrition/parse \
  -H "Content-Type: application/json" \
  -d '{
    "text": "two eggs and toast with butter"
  }'
```

### 4. Get JITAI Intervention Context
```bash
curl http://localhost:8000/api/v1/jitai/context/test-user-123
```

## 🧩 What's Included?

### ✅ Multi-Agent Coaching System
- **5 Specialized Agents**: Workout, Nutrition, Recovery, Motivation, General
- **Smart Routing**: Automatically routes questions to the right expert
- **Escalation Logic**: Detects pain/injury and notifies trainer
- **Adherence-Neutral**: Non-judgmental nutrition coaching

### ✅ Voice AI (Mock)
- WebSocket endpoint for real-time transcription
- Intent parsing for workout commands ("10 reps at 185")
- Text-to-speech endpoint
- **Note**: Requires Deepgram API key for real implementation

### ✅ Nutrition AI (Mock)
- Photo food recognition endpoint
- Natural language parsing
- Transparent nutrition breakdown (user-editable)
- **Note**: Use Claude Vision or GPT-4 Vision for real implementation

### ✅ JITAI Interventions
- Context scoring (vulnerability, receptivity, opportunity)
- Personalized intervention generation
- Priority-based delivery
- Response tracking for learning

### ✅ Production-Ready
- Docker + Docker Compose
- Google Cloud Run deployment config
- Comprehensive tests
- Health checks & monitoring
- Structured logging

## 🔑 API Keys Needed

### Required (Choose One)
- **Anthropic**: `ANTHROPIC_API_KEY` for Claude (recommended)
- **OpenAI**: `OPENAI_API_KEY` for GPT-4

### Optional (For Full Features)
- **Deepgram**: `DEEPGRAM_API_KEY` for voice STT/TTS
- **Supabase**: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for data
- **Passio/Nutritionix**: For real food recognition

## 📝 Testing

```bash
# Run all tests
poetry run pytest

# Run with coverage
./scripts/run-tests.sh

# Run specific test
poetry run pytest tests/test_agents.py::test_workout_agent_routing -v
```

## 🐳 Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📚 Interactive API Docs

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Try endpoints directly in the browser!

## 🎯 Next Steps

1. **Add Real Integrations**:
   - Integrate Deepgram for voice
   - Add vision model for food photos
   - Connect to Supabase for user data

2. **Customize Agents**:
   - Edit prompts in `app/agents/specialists.py`
   - Add new specialist agents
   - Adjust escalation logic

3. **Deploy**:
   - Push to Cloud Run: `gcloud builds submit`
   - Set environment secrets
   - Configure custom domain

## 🆘 Troubleshooting

### "No module named 'app'"
```bash
# Make sure you're in the ai-backend directory
cd apps/ai-backend
poetry install
```

### "ANTHROPIC_API_KEY not set"
```bash
# Add your API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
```

### "Port 8000 already in use"
```bash
# Use a different port
poetry run uvicorn main:app --reload --port 8001
```

## 📖 Architecture Overview

```
User Message
    ↓
[Router] ← Classifies intent
    ↓
[Specialist Agent] ← Workout/Nutrition/Recovery/Motivation/General
    ↓
[Escalation Check] ← Detects pain, low confidence
    ↓
Response + Actions
```

## 🎓 Learn More

- **LangGraph Docs**: https://python.langchain.com/docs/langgraph
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **FitOS Design System**: `../../docs/DESIGN_SYSTEM.md`
- **AI Integration Spec**: `../../docs/AI_INTEGRATION.md`

## 💡 Key Features

- **Adherence-Neutral**: Never uses "good/bad" for nutrition
- **Smart Escalation**: Automatically notifies trainer for pain/injury
- **Context-Aware**: Uses user goals, fitness level, streak in responses
- **JITAI Research**: Based on Stanford GPTCoach interventions
- **Fast Responses**: <2s with proper caching

---

Built with ❤️ for FitOS - Empowering Solo Trainers with AI
