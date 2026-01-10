"""Voice AI endpoints - Deepgram STT/TTS integration"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import logging
import asyncio
import json

logger = logging.getLogger("fitos-ai")
router = APIRouter()


class SpeakRequest(BaseModel):
    """Text-to-speech request"""
    text: str
    voice: str = "aura-asteria-en"  # Deepgram voice


@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice transcription.

    Client sends audio chunks, receives transcription results.

    Flow:
    1. Client connects and starts streaming audio
    2. Server forwards to Deepgram
    3. Deepgram returns interim and final transcripts
    4. Server parses intent and sends back to client

    Example client message:
    - Binary audio data (WebM/Opus format)

    Example server message:
    ```json
    {
      "transcript": "10 reps at 185",
      "isFinal": true,
      "confidence": 0.95,
      "intent": {
        "action": "log_set",
        "parameters": {"reps": 10, "weight": 185}
      }
    }
    ```
    """
    await websocket.accept()
    logger.info("Voice streaming client connected")

    try:
        # In production, this would:
        # 1. Connect to Deepgram WebSocket
        # 2. Forward audio chunks
        # 3. Parse transcription results
        # 4. Extract workout intents
        # 5. Send structured responses back

        while True:
            # Receive audio chunk from client
            data = await websocket.receive_bytes()

            # Mock response (replace with actual Deepgram integration)
            mock_response = {
                "transcript": "10 reps at 185",
                "isFinal": True,
                "confidence": 0.95,
                "intent": {
                    "action": "log_set",
                    "parameters": {
                        "reps": 10,
                        "weight": 185,
                        "unit": "lbs"
                    },
                    "confidence": 0.9
                }
            }

            await websocket.send_json(mock_response)

    except WebSocketDisconnect:
        logger.info("Voice streaming client disconnected")
    except Exception as e:
        logger.error(f"Error in voice stream: {e}", exc_info=True)
        await websocket.close(code=1011, reason="Internal error")


@router.post("/speak")
async def text_to_speech(request: SpeakRequest):
    """
    Convert text to speech using Deepgram Aura.

    Returns audio file (MP3 or WAV) for playback.

    Example:
    ```json
    {
      "text": "Great set! That's 10 reps logged.",
      "voice": "aura-asteria-en"
    }
    ```

    Response: Audio binary data
    """
    try:
        logger.info(f"TTS request: {request.text[:50]}...")

        # In production, this would:
        # 1. Call Deepgram TTS API
        # 2. Return audio stream

        # Mock response
        return {
            "success": True,
            "message": "TTS endpoint - integrate with Deepgram Aura",
            "text": request.text
        }

    except Exception as e:
        logger.error(f"Error in TTS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate speech")


def parse_workout_intent(transcript: str) -> dict | None:
    """
    Parse workout-specific intents from transcript.

    Supported commands:
    - "10 reps at 185" -> log_set
    - "repeat" -> repeat_set
    - "skip" -> skip_exercise
    - "next" -> next_exercise
    - "start timer" -> start_timer
    """
    lower = transcript.lower().strip()

    # Repeat command
    if lower in ["repeat", "same"]:
        return {
            "action": "repeat_set",
            "parameters": {},
            "confidence": 1.0
        }

    # Skip exercise
    if "skip" in lower:
        return {
            "action": "skip_exercise",
            "parameters": {},
            "confidence": 0.95
        }

    # Next exercise
    if any(word in lower for word in ["next", "done", "complete"]):
        return {
            "action": "next_exercise",
            "parameters": {},
            "confidence": 0.9
        }

    # Timer commands
    if "start" in lower and ("timer" in lower or "rest" in lower):
        return {
            "action": "start_timer",
            "parameters": {},
            "confidence": 0.9
        }

    # Log set patterns
    import re
    patterns = [
        r"(\d+)\s*(?:reps?)?\s*(?:at\s*)?(\d+)",  # "10 reps at 185" or "10 at 185"
        r"(\d+)\s*for\s*(\d+)",  # "185 for 10"
    ]

    for pattern in patterns:
        match = re.search(pattern, lower)
        if match:
            nums = [int(n) for n in match.groups()]
            # Heuristic: larger number is usually weight
            weight = max(nums)
            reps = min(nums)

            return {
                "action": "log_set",
                "parameters": {
                    "reps": reps,
                    "weight": weight,
                    "unit": "lbs"
                },
                "confidence": 0.85
            }

    # No intent matched
    return None
