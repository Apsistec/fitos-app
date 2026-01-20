"""
FitOS AI Backend - FastAPI + LangGraph
Multi-agent coaching system with voice, photo, and JITAI features
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import settings
from app.core.logging import setup_logging
from app.routes import coach, nutrition, voice, jitai, health, coach_brain, workout_generation, recovery, chronotype, nutrition_intelligence, wellness, habits, integrations

# Setup logging
logger = setup_logging()

# Create FastAPI app
app = FastAPI(
    title="FitOS AI Backend",
    description="Multi-agent AI coaching system for fitness trainers",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(coach.router, prefix="/api/v1/coach", tags=["AI Coach"])
app.include_router(coach_brain.router, prefix="/api/v1", tags=["Coach Brain"])
app.include_router(nutrition.router, prefix="/api/v1/nutrition", tags=["Nutrition AI"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["Voice AI"])
app.include_router(jitai.router, prefix="/api/v1/jitai", tags=["JITAI"])
app.include_router(workout_generation.router, prefix="/api/v1", tags=["Workout Generation"])
app.include_router(recovery.router, prefix="/api/v1", tags=["Recovery"])
app.include_router(chronotype.router, tags=["Chronotype"])
app.include_router(nutrition_intelligence.router, tags=["Nutrition Intelligence"])
app.include_router(wellness.router, tags=["Wellness"])
app.include_router(habits.router, tags=["Habits"])
app.include_router(integrations.router, tags=["Integrations"])


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "FitOS AI Backend",
        "version": "0.1.0",
        "status": "operational",
        "docs": "/docs" if settings.ENVIRONMENT == "development" else None,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
