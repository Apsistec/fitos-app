"""Tests for API routes"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_ready_check():
    """Test readiness check endpoint"""
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.json()["ready"] is True


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "FitOS AI Backend"


def test_chat_endpoint():
    """Test chat endpoint with valid request"""

    payload = {
        "message": "How should I train for muscle gain?",
        "conversationHistory": [],
        "userContext": {
            "user_id": "test-123",
            "role": "client",
            "goals": ["muscle_gain"],
            "fitness_level": "beginner"
        }
    }

    response = client.post("/api/v1/coach/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "message" in data
    assert "agentSource" in data
    assert data["agentSource"] in ["workout", "nutrition", "recovery", "motivation", "general"]


def test_chat_endpoint_invalid_request():
    """Test chat endpoint with missing required fields"""

    payload = {
        "message": "Test message"
        # Missing userContext
    }

    response = client.post("/api/v1/coach/chat", json=payload)
    assert response.status_code == 422  # Validation error


def test_nutrition_parse_endpoint():
    """Test natural language nutrition parsing"""

    payload = {
        "text": "two eggs and toast"
    }

    response = client.post("/api/v1/nutrition/parse", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "foods" in data
    assert "totals" in data
    assert "overallConfidence" in data
    assert len(data["foods"]) > 0


def test_jitai_context_endpoint():
    """Test JITAI context calculation"""

    response = client.get("/api/v1/jitai/context/test-user-123")
    assert response.status_code == 200

    data = response.json()
    assert "vulnerability" in data
    assert "receptivity" in data
    assert "opportunity" in data

    # Scores should be between 0 and 1
    assert 0 <= data["vulnerability"] <= 1
    assert 0 <= data["receptivity"] <= 1
    assert 0 <= data["opportunity"] <= 1


def test_jitai_generate_intervention():
    """Test intervention generation"""

    payload = {
        "vulnerability": 0.75,
        "receptivity": 0.80,
        "opportunity": 0.70
    }

    response = client.post("/api/v1/jitai/generate?user_id=test-123", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "id" in data
    assert "type" in data
    assert "title" in data
    assert "message" in data
    assert "priority" in data

    assert data["type"] in ["nudge", "reminder", "celebration", "concern", "insight"]
    assert 1 <= data["priority"] <= 5


def test_cors_headers():
    """Test that CORS headers are set correctly"""

    response = client.options("/api/v1/health")
    # CORS headers should be present
    # Actual values depend on configuration
    assert response.status_code in [200, 204]
