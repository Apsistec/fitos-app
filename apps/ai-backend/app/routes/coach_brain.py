"""
Coach Brain API Routes

Endpoints for trainer methodology-based AI coaching responses.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional

from ..agents.coach_brain import (
    CoachBrainAgent,
    generate_and_store_embedding,
    batch_generate_embeddings
)

router = APIRouter(prefix="/coach-brain", tags=["coach-brain"])


class CoachBrainRequest(BaseModel):
    """Request for AI coaching response"""
    trainer_id: str = Field(..., description="Trainer's user ID")
    client_id: Optional[str] = Field(None, description="Client's user ID (optional)")
    query: str = Field(..., description="Client's question or message")

    class Config:
        json_schema_extra = {
            "example": {
                "trainer_id": "123e4567-e89b-12d3-a456-426614174000",
                "client_id": "987fcdeb-51a2-43f1-b9c2-123456789abc",
                "query": "Should I increase my squat weight this week?"
            }
        }


class CoachBrainResponse(BaseModel):
    """AI coaching response"""
    response: str = Field(..., description="AI-generated response in trainer's voice")
    context_used: list[dict] = Field(..., description="Training examples used for context")
    error: Optional[str] = Field(None, description="Error message if request failed")

    class Config:
        json_schema_extra = {
            "example": {
                "response": "Great question! Looking at your progress, if you hit all your reps at RPE 7-8 last week, then yes - let's bump up 5-10 lbs. Remember, progressive overload is key. Trust the process!",
                "context_used": [
                    {
                        "content": "I always tell my clients: trust the process...",
                        "input_type": "message",
                        "similarity": 0.85
                    }
                ],
                "error": null
            }
        }


class AddTrainingDataRequest(BaseModel):
    """Request to add training data for methodology learning"""
    trainer_id: str = Field(..., description="Trainer's user ID")
    content: str = Field(..., description="Content to learn from")
    input_type: str = Field(..., description="Type: message, program, feedback, note, workout_description")
    source_id: Optional[str] = Field(None, description="Source record ID (optional)")

    class Config:
        json_schema_extra = {
            "example": {
                "trainer_id": "123e4567-e89b-12d3-a456-426614174000",
                "content": "Remember, consistency beats perfection. Focus on showing up, even if it's just for 20 minutes.",
                "input_type": "message",
                "source_id": "msg_123abc"
            }
        }


class BatchEmbeddingsRequest(BaseModel):
    """Request to batch process embeddings for a trainer"""
    trainer_id: str = Field(..., description="Trainer's user ID")


class BatchEmbeddingsResponse(BaseModel):
    """Response from batch embedding processing"""
    processed: int = Field(..., description="Number of items processed")
    failed: int = Field(..., description="Number of items that failed")


@router.post("/respond", response_model=CoachBrainResponse)
async def generate_coach_response(
    request: CoachBrainRequest,
    authorization: str = Header(None)
) -> CoachBrainResponse:
    """
    Generate AI coaching response using trainer's methodology.

    This endpoint:
    1. Retrieves the trainer's methodology from database
    2. Performs RAG retrieval for relevant training examples
    3. Generates response using Claude with trainer-specific prompt
    4. Logs response for trainer review

    Returns:
        CoachBrainResponse with AI-generated response and context
    """
    try:
        agent = CoachBrainAgent()

        result = await agent.run(
            trainer_id=request.trainer_id,
            query=request.query,
            client_id=request.client_id
        )

        return CoachBrainResponse(
            response=result['response'],
            context_used=result['context_used'],
            error=result.get('error')
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate response: {str(e)}"
        )


@router.post("/add-training-data", status_code=201)
async def add_training_data(
    request: AddTrainingDataRequest,
    authorization: str = Header(None)
) -> dict:
    """
    Add content to trainer's training data for methodology learning.

    This endpoint:
    1. Generates vector embedding for the content
    2. Stores content and embedding in methodology_training_data table
    3. Makes content available for future RAG retrieval

    Use this to collect:
    - Messages sent by trainer to clients
    - Workout program descriptions
    - Feedback and form cues
    - Training notes and philosophy statements

    Returns:
        Success status
    """
    try:
        success = await generate_and_store_embedding(
            trainer_id=request.trainer_id,
            content=request.content,
            input_type=request.input_type,
            source_id=request.source_id
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to store training data"
            )

        return {
            "success": True,
            "message": "Training data added successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add training data: {str(e)}"
        )


@router.post("/batch-embeddings", response_model=BatchEmbeddingsResponse)
async def batch_process_embeddings(
    request: BatchEmbeddingsRequest,
    authorization: str = Header(None)
) -> BatchEmbeddingsResponse:
    """
    Batch process embeddings for existing training data.

    This endpoint processes all training data records for a trainer
    that don't have embeddings yet. Useful for:
    - Initial setup with historical data
    - Recovering from embedding generation failures
    - Migrating to new embedding models

    Returns:
        Count of processed and failed items
    """
    try:
        result = await batch_generate_embeddings(request.trainer_id)

        return BatchEmbeddingsResponse(
            processed=result['processed'],
            failed=result['failed']
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to batch process embeddings: {str(e)}"
        )


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Coach Brain service"""
    return {
        "status": "healthy",
        "service": "coach-brain",
        "version": "1.0.0"
    }
