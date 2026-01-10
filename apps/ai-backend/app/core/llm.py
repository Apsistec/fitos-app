"""LLM provider abstraction"""

from typing import Any
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from app.core.config import settings


def get_llm(
    provider: str | None = None,
    model: str | None = None,
    temperature: float | None = None,
    **kwargs: Any
):
    """
    Get LLM instance based on provider.

    Args:
        provider: 'openai' or 'anthropic' (defaults to settings.DEFAULT_LLM_PROVIDER)
        model: Model name (defaults to settings.DEFAULT_MODEL)
        temperature: Sampling temperature (defaults to settings.TEMPERATURE)
        **kwargs: Additional provider-specific arguments

    Returns:
        ChatOpenAI or ChatAnthropic instance
    """
    provider = provider or settings.DEFAULT_LLM_PROVIDER
    model = model or settings.DEFAULT_MODEL
    temperature = temperature if temperature is not None else settings.TEMPERATURE

    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment")

        return ChatOpenAI(
            model=model,
            temperature=temperature,
            max_tokens=settings.MAX_TOKENS,
            api_key=settings.OPENAI_API_KEY,
            **kwargs
        )

    elif provider == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")

        return ChatAnthropic(
            model=model,
            temperature=temperature,
            max_tokens=settings.MAX_TOKENS,
            api_key=settings.ANTHROPIC_API_KEY,
            **kwargs
        )

    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


def get_fast_llm(**kwargs: Any):
    """Get a fast, cheap LLM for simple tasks"""
    return get_llm(
        model="claude-haiku-4.0" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o-mini",
        **kwargs
    )


def get_smart_llm(**kwargs: Any):
    """Get the most capable LLM for complex reasoning"""
    return get_llm(
        model="claude-sonnet-4.5" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o",
        **kwargs
    )
