# ✅ AI Backend - Ready to Test!

**Status:** Configuration complete! API keys are set.

---

## 🎯 **What I Did**

✅ Created `apps/ai-backend/.env` with:
- Anthropic API key (Claude)
- Supabase URL and secret key
- All configuration settings

✅ Updated root `.env` with Supabase secret key

---

## 🧪 **Test the AI Backend (You need to run this)**

### Prerequisites

You need Python 3.11+ and Poetry installed. Your system has Python 3.9, which is too old.

**Install Python 3.11+ using Homebrew:**

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11
brew install python@3.11

# Verify
python3.11 --version
```

**Install Poetry:**

```bash
curl -sSL https://install.python-poetry.org | python3.11 -
export PATH="$HOME/.local/bin:$PATH"
```

---

### Start the AI Backend

```bash
cd apps/ai-backend

# Install dependencies
poetry install

# Start server
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

### Test the Endpoints

**Open your browser:**

1. **API Docs:** http://localhost:8000/docs
2. **Health Check:** http://localhost:8000/api/v1/health

**Or use curl:**

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Test AI chat
curl -X POST http://localhost:8000/api/v1/coach/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How much protein should I eat?",
    "conversationHistory": [],
    "userContext": {
      "user_id": "test-123",
      "role": "client",
      "goals": ["muscle_gain"],
      "fitness_level": "intermediate",
      "current_streak": 5,
      "weekly_adherence": 0.85
    }
  }'
```

**Expected response:**
```json
{
  "message": "For muscle gain at your intermediate level...",
  "agentSource": "nutrition",
  "actions": [],
  "shouldEscalate": false
}
```

---

## 🚀 **Next Steps After Testing**

Once the AI backend is running successfully:

1. **Test mobile app** - Open http://localhost:4200 (npm start)
2. **Build production** - I can build the production bundles
3. **Deploy** - Deploy to Google Cloud Run, Railway, or Render

---

## ❌ **Can't Install Python 3.11?**

**Alternative: Use Docker**

```bash
cd apps/ai-backend

# Build Docker image
docker build -t fitos-ai-backend .

# Run container
docker run -p 8000:8000 --env-file .env fitos-ai-backend
```

Then visit http://localhost:8000/docs

---

## 📊 **Summary**

| Task | Status | Notes |
|------|--------|-------|
| API Keys | ✅ Configured | Anthropic + Supabase |
| .env Files | ✅ Created | Both root and ai-backend |
| Dependencies | ⏳ Needs Poetry | Install Python 3.11 first |
| AI Backend | ⏳ Ready to test | Run commands above |
| Mobile App | ✅ Ready | npm start |

---

## 🆘 **Need Help?**

**If you get errors:**

1. Share the error message
2. I'll help you fix it
3. We can try Docker as backup

**If it works:**

Let me know and I'll:
- Update mobile app to connect to AI backend
- Build production bundles
- Create deployment scripts

---

**Ready to test?** Run the commands above and let me know how it goes! 🚀
