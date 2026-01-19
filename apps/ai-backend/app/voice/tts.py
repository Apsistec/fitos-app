"""
Text-to-Speech Service using ElevenLabs Turbo v2

Features:
- Turbo v2 model: 50-250ms latency
- Streaming audio generation
- Natural, conversational voice
- Emotion and tone control
- High quality audio (24kHz)

Sprint 32: Voice AI Sub-500ms
"""

import asyncio
from typing import AsyncIterator, Optional
from dataclasses import dataclass
from datetime import datetime
import io

from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs

from app.core.config import settings


@dataclass
class TTSConfig:
    """TTS configuration"""

    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel - Clear, professional
    model: str = "eleven_turbo_v2_5"  # Latest turbo model
    stability: float = 0.5  # 0-1, lower = more expressive
    similarity_boost: float = 0.75  # 0-1, voice similarity to original
    style: float = 0.0  # 0-1, style exaggeration
    use_speaker_boost: bool = True


class ElevenLabsTTS:
    """
    ElevenLabs Turbo v2 Text-to-Speech Service

    Provides streaming TTS with sub-250ms latency for natural
    conversational AI.
    """

    def __init__(
        self,
        api_key: str | None = None,
        config: TTSConfig | None = None,
    ):
        self.api_key = api_key or settings.ELEVENLABS_API_KEY
        self.config = config or TTSConfig()

        # Initialize ElevenLabs client
        self.client = ElevenLabs(api_key=self.api_key)

    async def stream_text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """
        Stream text-to-speech audio.

        Yields audio chunks as they're generated for minimal latency.

        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID override

        Yields:
            Audio data chunks (bytes)
        """
        voice_id = voice_id or self.config.voice_id

        # Configure voice settings
        voice_settings = VoiceSettings(
            stability=self.config.stability,
            similarity_boost=self.config.similarity_boost,
            style=self.config.style,
            use_speaker_boost=self.config.use_speaker_boost,
        )

        try:
            # Stream audio generation
            audio_stream = self.client.generate(
                text=text,
                voice=voice_id,
                model=self.config.model,
                stream=True,
                voice_settings=voice_settings,
            )

            # Yield audio chunks
            for chunk in audio_stream:
                if chunk:
                    yield chunk

        except Exception as e:
            print(f"Error in TTS streaming: {e}")
            raise

    async def generate_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> bytes:
        """
        Generate complete speech audio (non-streaming).

        For shorter responses where streaming overhead isn't worth it.

        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID override

        Returns:
            Complete audio data (bytes)
        """
        voice_id = voice_id or self.config.voice_id

        voice_settings = VoiceSettings(
            stability=self.config.stability,
            similarity_boost=self.config.similarity_boost,
            style=self.config.style,
            use_speaker_boost=self.config.use_speaker_boost,
        )

        try:
            audio = self.client.generate(
                text=text,
                voice=voice_id,
                model=self.config.model,
                voice_settings=voice_settings,
            )

            # Convert generator to bytes if needed
            if hasattr(audio, '__iter__'):
                audio_bytes = b"".join(audio)
            else:
                audio_bytes = audio

            return audio_bytes

        except Exception as e:
            print(f"Error generating speech: {e}")
            raise

    async def get_available_voices(self) -> list[dict]:
        """
        Get list of available voices.

        Returns:
            List of voice info dicts
        """
        try:
            voices = self.client.voices.get_all()
            return [
                {
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category,
                    "labels": voice.labels,
                }
                for voice in voices.voices
            ]
        except Exception as e:
            print(f"Error fetching voices: {e}")
            return []


# Coaching-optimized voice configurations
COACHING_VOICES = {
    "professional": {
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel
        "name": "Rachel",
        "description": "Clear, professional, encouraging",
        "stability": 0.5,
        "similarity_boost": 0.75,
    },
    "energetic": {
        "voice_id": "pNInz6obpgDQGcFmaJgB",  # Adam
        "name": "Adam",
        "description": "Energetic, motivating, upbeat",
        "stability": 0.4,
        "similarity_boost": 0.8,
    },
    "calm": {
        "voice_id": "EXAVITQu4vr4xnSDxMaL",  # Bella
        "name": "Bella",
        "description": "Calm, soothing, reassuring",
        "stability": 0.7,
        "similarity_boost": 0.7,
    },
}


# Global TTS instance
_tts_service: Optional[ElevenLabsTTS] = None


def get_tts_service(voice_profile: str = "professional") -> ElevenLabsTTS:
    """
    Get or create global TTS service.

    Args:
        voice_profile: Voice profile to use (professional, energetic, calm)

    Returns:
        ElevenLabsTTS instance
    """
    global _tts_service

    voice_config = COACHING_VOICES.get(voice_profile, COACHING_VOICES["professional"])

    config = TTSConfig(
        voice_id=voice_config["voice_id"],
        stability=voice_config["stability"],
        similarity_boost=voice_config["similarity_boost"],
    )

    if _tts_service is None or _tts_service.config.voice_id != config.voice_id:
        _tts_service = ElevenLabsTTS(config=config)

    return _tts_service
