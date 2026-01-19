# MCP (Model Context Protocol) Integration

## Overview

FitOS uses the Model Context Protocol to enable agents to query external data sources using natural language. This provides a unified interface for accessing health, payment, and user data across multiple platforms.

## Architecture

```
┌─────────────┐
│   Agents    │ (Workout, Nutrition, Recovery)
└──────┬──────┘
       │ Uses MCP Tools
       ↓
┌─────────────┐
│  MCP Client │ (app/mcp/client.py)
└──────┬──────┘
       │ HTTP/JSON
       ↓
┌─────────────────────────────────┐
│     MCP Servers (FastAPI)       │
├─────────────┬──────────┬────────┤
│   Health    │  Stripe  │ Custom │
└─────────────┴──────────┴────────┘
       │            │         │
       ↓            ↓         ↓
┌─────────────────────────────────┐
│      Data Sources               │
├─────────────┬──────────┬────────┤
│ Apple Health│  Stripe  │Supabase│
│   HealthKit │   API    │   DB   │
└─────────────┴──────────┴────────┘
```

## Available MCP Servers

### 1. Health Server (`health_server.py`)

**Port:** 8001
**Purpose:** Access Apple Health / HealthKit data

**Supported Metrics:**
- HRV (Heart Rate Variability)
- Resting Heart Rate
- Sleep Duration & Quality
- Steps & Activity
- Workout Data
- Body Metrics (weight, body fat)

**Example Queries:**
```python
"What was my average HRV this week?"
"Show me sleep duration for the last 7 days"
"How did my resting heart rate trend this month?"
```

### 2. Stripe Server (`stripe_server.py`)

**Port:** 8002
**Purpose:** Access Stripe payment and subscription data

**Supported Metrics:**
- MRR (Monthly Recurring Revenue)
- Active Subscriptions
- Churn Rate
- Failed Payments
- Customer Data
- Payouts

**Example Queries:**
```python
"What's my MRR for this month?"
"How many failed payments do I have?"
"Show me customer growth this quarter"
```

## Using MCP Tools in Agents

### Basic Health Query

```python
from app.mcp.tools import query_health_data

result = await query_health_data(
    query="What was my average HRV this week?",
    user_id="user_123",
    max_results=30
)

# Result includes:
# - results: List of data points
# - summary: Statistics (avg, min, max, trend)
# - metadata: Query info, time range, source
```

### Correlation Analysis

```python
from app.mcp.tools import correlate_health_and_performance

correlation = await correlate_health_and_performance(
    health_metric="sleep_duration",
    performance_metric="workout_volume",
    user_id="user_123",
    time_range_days=30
)

# Returns correlation coefficient and insights
```

### Cross-Domain Queries

```python
from app.mcp.tools import cross_domain_query

result = await cross_domain_query(
    query="How did my sleep affect my business performance?",
    user_id="trainer_123",
    domains=["health", "payment"]
)

# Queries multiple MCP servers in parallel
```

## Running MCP Servers

### Development (Local)

```bash
# Terminal 1: Health Server
cd apps/ai-backend
python -m app.mcp.health_server

# Terminal 2: Stripe Server
python -m app.mcp.stripe_server

# Terminal 3: Main API
uvicorn main:app --reload
```

### Production

MCP servers should be deployed as separate services:

```yaml
# docker-compose.yml
services:
  health-mcp:
    build: .
    command: python -m app.mcp.health_server
    ports:
      - "8001:8001"
    environment:
      - HEALTHKIT_API_KEY=${HEALTHKIT_API_KEY}

  stripe-mcp:
    build: .
    command: python -m app.mcp.stripe_server
    ports:
      - "8002:8002"
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

  ai-backend:
    build: .
    command: uvicorn main:app --host 0.0.0.0
    ports:
      - "8000:8000"
    depends_on:
      - health-mcp
      - stripe-mcp
```

## Agent Integration

### Recovery Agent with MCP

The recovery agent can now access real health data:

```python
# User asks: "How was my HRV this week?"
# Agent uses query_health_data tool
# Returns actual Apple Health data with trends
```

### Workout Agent with Performance Correlation

```python
# User asks: "Should I train hard today?"
# Agent queries HRV/sleep data
# Provides auto-regulated recommendation
```

## Data Flow

1. **User Query** → Agent receives natural language query
2. **Tool Selection** → Agent decides to use MCP tool
3. **MCP Query** → Tool calls MCP client with query
4. **Server Processing** → MCP server parses NL, fetches data
5. **Response** → Server returns structured data + summary
6. **Agent Synthesis** → Agent uses data to answer user

## Benefits

1. **Natural Language Interface**: No need for complex API calls
2. **Cross-Platform**: Unified interface for Apple Health, Garmin, Whoop, etc.
3. **Agent-Friendly**: Tools integrate seamlessly with LangGraph
4. **Scalable**: Add new data sources by adding MCP servers
5. **Cached**: Can cache MCP responses for performance

## Future Enhancements

### Sprint 32+
- [ ] Garmin MCP server
- [ ] Whoop MCP server
- [ ] MyFitnessPal nutrition server
- [ ] Terra API unified server (cross-platform)
- [ ] Response caching layer
- [ ] Real-time data subscriptions
- [ ] Multi-user data aggregation

## Testing

```bash
# Test Health MCP Server
curl -X POST http://localhost:8001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show my HRV this week", "user_id": "test_user"}'

# Test Stripe MCP Server
curl -X POST http://localhost:8002/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is my MRR?", "user_id": "test_trainer"}'

# Test capabilities
curl http://localhost:8001/capabilities
curl http://localhost:8002/capabilities
```

## Troubleshooting

**MCP server not responding:**
- Check if server is running on correct port
- Verify firewall/network settings
- Check server logs for errors

**Empty data returned:**
- Verify user has data in the time range
- Check data source connection (HealthKit, Stripe API)
- Ensure user ID is correct

**Slow queries:**
- Consider adding caching layer
- Optimize data source queries
- Use smaller time ranges

## References

- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [LangChain Tools Documentation](https://python.langchain.com/docs/modules/agents/tools/)
- [Apple HealthKit](https://developer.apple.com/documentation/healthkit)
- [Terra API](https://docs.tryterra.co/)
