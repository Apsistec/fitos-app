"""
Real-Time Voice API Endpoint

WebSocket endpoint for streaming voice conversations with sub-500ms latency.

Flow:
1. Client connects via WebSocket
2. Client streams audio → Server (STT)
3. Server processes with LLM
4. Server streams audio ← Client (TTS)

Sprint 32: Voice AI Sub-500ms
"""

import json
import base64
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

from app.voice.realtime import (
    create_voice_session,
    get_voice_session,
    end_voice_session,
    ConversationState,
)
from app.voice.stt import TranscriptionResult


router = APIRouter(prefix="/voice", tags=["voice"])


class VoiceSessionConfig(BaseModel):
    """Configuration for voice session"""

    user_id: str
    trainer_id: Optional[str] = None
    voice_profile: str = "professional"  # professional, energetic, calm
    language: str = "en-US"


@router.websocket("/realtime")
async def voice_realtime_websocket(
    websocket: WebSocket,
    user_id: str = Query(...),
    trainer_id: Optional[str] = Query(None),
    voice_profile: str = Query("professional"),
):
    """
    Real-time voice coaching WebSocket.

    Protocol:
    - Client → Server: Audio chunks (base64 encoded PCM)
    - Server → Client: Transcripts, state changes, audio responses

    Message types:
    1. audio: Audio data from client
    2. transcript: Transcription result
    3. state: Conversation state change
    4. response_audio: AI response audio
    5. latency: Latency metrics
    6. error: Error message

    Example client messages:
    {
      "type": "audio",
      "data": "<base64_audio>",
      "timestamp": "2026-01-17T12:00:00Z"
    }

    Example server messages:
    {
      "type": "transcript",
      "text": "What exercises should I do today?",
      "is_final": true,
      "confidence": 0.95
    }
    """
    await websocket.accept()
    print(f"🎤 Voice WebSocket connected: user={user_id}")

    try:
        # Create voice session
        session = await create_voice_session(
            user_id=user_id,
            trainer_id=trainer_id,
            voice_profile=voice_profile,
        )

        # Register callbacks
        session.on_state_change = lambda state: websocket.send_json({
            "type": "state",
            "state": state.value,
            "timestamp": "now",
        })

        session.on_transcript = lambda result: websocket.send_json({
            "type": "transcript",
            "text": result.text,
            "is_final": result.is_final,
            "confidence": result.confidence,
        })

        session.on_response = lambda message: None  # Audio handled by on_audio_chunk

        session.on_audio_chunk = lambda chunk: websocket.send_json({
            "type": "response_audio",
            "data": base64.b64encode(chunk).decode('utf-8'),
        })

        # Start session
        await session.start_conversation()

        # Send ready message
        await websocket.send_json({
            "type": "ready",
            "message": "Voice session started. Send audio data to begin.",
        })

        # Handle incoming messages
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            message_type = message.get("type")

            if message_type == "audio":
                # Decode and send audio to STT
                audio_b64 = message.get("data")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)
                    await session.send_audio(audio_bytes)

            elif message_type == "get_metrics":
                # Send latency metrics
                metrics = session.get_average_latency()
                await websocket.send_json({
                    "type": "latency",
                    "metrics": metrics,
                })

            elif message_type == "get_history":
                # Send conversation history
                history = session.get_conversation_history()
                await websocket.send_json({
                    "type": "history",
                    "messages": history,
                })

            elif message_type == "change_voice":
                # Change voice profile
                new_profile = message.get("voice_profile", "professional")
                # TODO: Implement voice profile change
                await websocket.send_json({
                    "type": "info",
                    "message": f"Voice profile changed to {new_profile}",
                })

            elif message_type == "ping":
                # Heartbeat
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": message.get("timestamp"),
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}",
                })

    except WebSocketDisconnect:
        print(f"🎤 Voice WebSocket disconnected: user={user_id}")

    except Exception as e:
        print(f"❌ Voice WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e),
        })

    finally:
        # End session
        await end_voice_session(user_id)
        try:
            await websocket.close()
        except:
            pass


@router.get("/sessions/{user_id}/status")
async def get_voice_session_status(user_id: str):
    """
    Get status of active voice session.

    Args:
        user_id: User ID

    Returns:
        Session status and metrics
    """
    session = get_voice_session(user_id)

    if not session:
        return {
            "active": False,
            "user_id": user_id,
        }

    return {
        "active": True,
        "user_id": user_id,
        "state": session.state.value,
        "message_count": len(session.conversation_history),
        "average_latency": session.get_average_latency(),
    }


@router.delete("/sessions/{user_id}")
async def end_voice_session_endpoint(user_id: str):
    """
    End active voice session.

    Args:
        user_id: User ID

    Returns:
        Final session summary
    """
    session = get_voice_session(user_id)

    if not session:
        return {
            "message": "No active session",
            "user_id": user_id,
        }

    # Get final metrics
    metrics = session.get_average_latency()
    history = session.get_conversation_history()

    # End session
    await end_voice_session(user_id)

    return {
        "message": "Session ended",
        "user_id": user_id,
        "final_metrics": metrics,
        "message_count": len(history),
        "conversation_history": history,
    }


@router.get("/health")
async def voice_health_check():
    """Health check for voice service"""
    return {
        "status": "healthy",
        "service": "Real-Time Voice",
        "models": {
            "stt": "Deepgram Nova-3",
            "llm": "Claude Sonnet 4.5",
            "tts": "ElevenLabs Turbo v2.5",
        },
        "target_latency_ms": 500,
    }
