"""Application configuration using Pydantic Settings"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["http://localhost:4200", "http://localhost:8100"]

    # LLM Provider
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    DEFAULT_LLM_PROVIDER: str = "anthropic"  # or 'openai'
    DEFAULT_MODEL: str = "claude-sonnet-4.5"
    MAX_TOKENS: int = 2048
    TEMPERATURE: float = 0.7

    # Voice AI
    DEEPGRAM_API_KEY: str | None = None

    # Database
    SUPABASE_URL: str = "http://localhost:54321"
    SUPABASE_SERVICE_ROLE_KEY: str | None = None

    # Food Recognition
    PASSIO_API_KEY: str | None = None
    NUTRITIONIX_APP_ID: str | None = None
    NUTRITIONIX_APP_KEY: str | None = None

    # Wearables
    TERRA_API_KEY: str | None = None
    TERRA_DEV_ID: str | None = None

    # JITAI Configuration
    MAX_DAILY_INTERVENTIONS: int = 3
    INTERVENTION_THRESHOLD: float = 0.7

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
