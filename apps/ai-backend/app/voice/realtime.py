"""
Real-Time Voice Coaching Service

Orchestrates STT → LLM → TTS pipeline for sub-500ms conversations.

Latency Breakdown (Target):
- STT (Deepgram Nova-3): 100-300ms
- LLM (Claude Sonnet 4.5): 100-400ms
- TTS (ElevenLabs Turbo v2): 50-250ms
- Total: ~250-950ms (avg ~465ms)

Optimizations:
- Streaming at every stage
- Parallel processing where possible
- Connection pooling
- Audio buffering

Sprint 32: Voice AI Sub-500ms
"""

import asyncio
import time
from typing import AsyncIterator, Callable, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from langchain_core.messages import HumanMessage, AIMessage

from app.voice.stt import DeepgramSTT, TranscriptionResult, TurnDetector
from app.voice.tts import ElevenLabsTTS
from app.agents.supervisor import get_coach_graph, CoachState


class ConversationState(str, Enum):
    """Voice conversation states"""

    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"
    ERROR = "error"


@dataclass
class VoiceMessage:
    """Message in voice conversation"""

    text: str
    role: str  # "user" or "assistant"
    audio_data: Optional[bytes] = None
    latency_ms: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class LatencyMetrics:
    """Latency tracking for voice pipeline"""

    stt_ms: float = 0.0
    llm_ms: float = 0.0
    tts_ms: float = 0.0
    total_ms: float = 0.0

    @property
    def breakdown(self) -> dict:
        """Get latency breakdown"""
        return {
            "stt_ms": round(self.stt_ms, 2),
            "llm_ms": round(self.llm_ms, 2),
            "tts_ms": round(self.tts_ms, 2),
            "total_ms": round(self.total_ms, 2),
            "under_500ms": self.total_ms < 500,
        }


class RealtimeVoiceService:
    """
    Real-time voice coaching service.

    Manages end-to-end voice conversation with sub-500ms latency goal.
    """

    def __init__(
        self,
        user_id: str,
        trainer_id: Optional[str] = None,
        voice_profile: str = "professional",
    ):
        self.user_id = user_id
        self.trainer_id = trainer_id
        self.voice_profile = voice_profile

        # Services
        self.stt = DeepgramSTT()
        self.tts = ElevenLabsTTS()
        self.turn_detector = TurnDetector()
        self.coach_graph = get_coach_graph()

        # State
        self.state = ConversationState.IDLE
        self.conversation_history: list[VoiceMessage] = []
        self.latency_history: list[LatencyMetrics] = []

        # Callbacks
        self.on_state_change: Optional[Callable] = None
        self.on_transcript: Optional[Callable] = None
        self.on_response: Optional[Callable] = None
        self.on_audio_chunk: Optional[Callable] = None

    async def start_conversation(self):
        """Start voice conversation session"""
        print("🎙️ Starting real-time voice session")
        self.state = ConversationState.LISTENING

        # Start STT stream
        await self.stt.start_stream(
            on_transcription=self._on_transcription,
            interim_results=True,
        )

        if self.on_state_change:
            self.on_state_change(self.state)

    async def stop_conversation(self):
        """Stop voice conversation session"""
        print("🎙️ Stopping voice session")

        await self.stt.stop_stream()
        self.state = ConversationState.IDLE

        if self.on_state_change:
            self.on_state_change(self.state)

    async def send_audio(self, audio_data: bytes):
        """
        Send audio data from user.

        Args:
            audio_data: Raw audio bytes (PCM, 16-bit, 16kHz)
        """
        if self.state != ConversationState.LISTENING:
            return

        await self.stt.send_audio(audio_data)

    def _on_transcription(self, result: TranscriptionResult):
        """
        Handle transcription result from STT.

        Checks for turn completion and triggers LLM response.
        """
        # Notify transcript callback
        if self.on_transcript:
            self.on_transcript(result)

        # Check if turn is complete
        turn_complete, utterance = self.turn_detector.add_transcription(result)

        if turn_complete and utterance:
            print(f"👤 User: {utterance}")

            # Save user message
            user_message = VoiceMessage(
                text=utterance,
                role="user",
                latency_ms=result.duration_ms,
            )
            self.conversation_history.append(user_message)

            # Process with LLM
            asyncio.create_task(self._process_and_respond(utterance))

    async def _process_and_respond(self, user_text: str):
        """
        Process user input with LLM and generate speech response.

        Args:
            user_text: User's transcribed text
        """
        start_time = time.time()
        metrics = LatencyMetrics()

        try:
            # Update state
            self.state = ConversationState.PROCESSING
            if self.on_state_change:
                self.on_state_change(self.state)

            # Measure STT latency (already completed)
            stt_time = time.time()
            metrics.stt_ms = (stt_time - start_time) * 1000

            # Get LLM response
            llm_start = time.time()
            response_text = await self._get_llm_response(user_text)
            llm_end = time.time()
            metrics.llm_ms = (llm_end - llm_start) * 1000

            print(f"🤖 Assistant: {response_text}")

            # Generate speech
            tts_start = time.time()
            await self._generate_and_stream_speech(response_text)
            tts_end = time.time()
            metrics.tts_ms = (tts_end - tts_start) * 1000

            # Calculate total latency
            end_time = time.time()
            metrics.total_ms = (end_time - start_time) * 1000

            # Save metrics
            self.latency_history.append(metrics)

            # Log latency
            print(f"⚡ Latency: {metrics.breakdown}")

            # Check if under target
            if metrics.total_ms > 500:
                print(f"⚠️  Warning: Latency {metrics.total_ms:.0f}ms exceeds 500ms target")

            # Return to listening
            self.state = ConversationState.LISTENING
            if self.on_state_change:
                self.on_state_change(self.state)

        except Exception as e:
            print(f"❌ Error processing: {e}")
            self.state = ConversationState.ERROR
            if self.on_state_change:
                self.on_state_change(self.state)

    async def _get_llm_response(self, user_text: str) -> str:
        """
        Get response from LLM agent.

        Args:
            user_text: User's message

        Returns:
            Assistant's response text
        """
        # Build state for coach graph
        coach_state: CoachState = {
            "messages": [HumanMessage(content=user_text)],
            "user_id": self.user_id,
            "trainer_id": self.trainer_id,
            "client_id": None,
            "current_agent": None,
            "next_agent": None,
            "requires_approval": False,
            "approval_reason": None,
            "pending_action": None,
            "confidence": 1.0,
            "should_escalate": False,
            "suggested_actions": [],
            "available_tools": [],
            "user_context": {},
        }

        # Invoke coach graph
        result = await self.coach_graph.ainvoke(coach_state)

        # Extract response
        messages = result.get("messages", [])
        if messages:
            last_message = messages[-1]
            if hasattr(last_message, 'content'):
                return last_message.content

        return "I'm sorry, I didn't quite catch that. Could you repeat?"

    async def _generate_and_stream_speech(self, text: str):
        """
        Generate and stream speech audio.

        Args:
            text: Text to convert to speech
        """
        self.state = ConversationState.SPEAKING
        if self.on_state_change:
            self.on_state_change(self.state)

        # Stream TTS audio
        audio_chunks = []
        async for chunk in self.tts.stream_text_to_speech(text):
            audio_chunks.append(chunk)

            # Send chunk to callback if provided
            if self.on_audio_chunk:
                self.on_audio_chunk(chunk)

        # Save complete audio
        complete_audio = b"".join(audio_chunks)
        assistant_message = VoiceMessage(
            text=text,
            role="assistant",
            audio_data=complete_audio,
        )
        self.conversation_history.append(assistant_message)

        if self.on_response:
            self.on_response(assistant_message)

    def get_average_latency(self) -> dict:
        """
        Get average latency metrics across conversation.

        Returns:
            Average latency breakdown
        """
        if not self.latency_history:
            return {
                "stt_ms": 0,
                "llm_ms": 0,
                "tts_ms": 0,
                "total_ms": 0,
                "count": 0,
            }

        n = len(self.latency_history)
        return {
            "stt_ms": round(sum(m.stt_ms for m in self.latency_history) / n, 2),
            "llm_ms": round(sum(m.llm_ms for m in self.latency_history) / n, 2),
            "tts_ms": round(sum(m.tts_ms for m in self.latency_history) / n, 2),
            "total_ms": round(sum(m.total_ms for m in self.latency_history) / n, 2),
            "count": n,
            "under_500ms_percent": round(
                sum(1 for m in self.latency_history if m.total_ms < 500) / n * 100, 1
            ),
        }

    def get_conversation_history(self) -> list[dict]:
        """Get conversation history as dict list"""
        return [
            {
                "role": msg.role,
                "text": msg.text,
                "timestamp": msg.timestamp.isoformat(),
                "latency_ms": msg.latency_ms,
            }
            for msg in self.conversation_history
        ]


# Active voice sessions
_active_sessions: dict[str, RealtimeVoiceService] = {}


async def create_voice_session(
    user_id: str,
    trainer_id: Optional[str] = None,
    voice_profile: str = "professional",
) -> RealtimeVoiceService:
    """
    Create and start a new voice session.

    Args:
        user_id: User ID
        trainer_id: Optional trainer ID
        voice_profile: Voice profile (professional, energetic, calm)

    Returns:
        RealtimeVoiceService instance
    """
    # End existing session if any
    if user_id in _active_sessions:
        await _active_sessions[user_id].stop_conversation()

    # Create new session
    session = RealtimeVoiceService(
        user_id=user_id,
        trainer_id=trainer_id,
        voice_profile=voice_profile,
    )

    _active_sessions[user_id] = session

    return session


def get_voice_session(user_id: str) -> Optional[RealtimeVoiceService]:
    """Get active voice session for user"""
    return _active_sessions.get(user_id)


async def end_voice_session(user_id: str):
    """End active voice session"""
    session = _active_sessions.get(user_id)
    if session:
        await session.stop_conversation()
        del _active_sessions[user_id]
