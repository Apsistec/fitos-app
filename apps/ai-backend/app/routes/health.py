"""Health check endpoints"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "fitos-ai-backend"
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check for load balancers"""
    # Could add checks for database connectivity, external APIs, etc.
    return {"ready": True}
