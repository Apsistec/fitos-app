"""
Usage tracker for AI model calls.

Logs token usage and estimated cost per LLM invocation.
Uses Python's built-in logging module — no external dependencies.

Usage:
    from app.core.usage_tracker import log_usage

    log_usage(
        user_id="user-123",
        agent_source="nutrition",
        model_used="claude-3-5-haiku-20241022",
        input_tokens=150,
        output_tokens=300,
    )
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger("fitos-ai.usage")

# Cost per 1M tokens (USD) — updated 2025-05
MODEL_COSTS: dict[str, dict[str, float]] = {
    # Anthropic
    "claude-sonnet-4-5-20250514": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.25, "output": 1.25},
    # OpenAI (fallback)
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost in USD for a single LLM call."""
    costs = MODEL_COSTS.get(model)
    if not costs:
        return 0.0
    input_cost = (input_tokens / 1_000_000) * costs["input"]
    output_cost = (output_tokens / 1_000_000) * costs["output"]
    return round(input_cost + output_cost, 6)


def log_usage(
    user_id: str,
    agent_source: str,
    model_used: str,
    input_tokens: int,
    output_tokens: int,
    complexity: str = "moderate",
) -> None:
    """
    Log a single LLM usage event.

    Args:
        user_id: The user who triggered the call
        agent_source: Which specialist agent handled it
        model_used: The model identifier
        input_tokens: Prompt/input token count
        output_tokens: Completion/output token count
        complexity: Query complexity classification
    """
    estimated_cost = _estimate_cost(model_used, input_tokens, output_tokens)
    timestamp = datetime.now(timezone.utc).isoformat()

    logger.info(
        "LLM_USAGE | ts=%s | user=%s | agent=%s | complexity=%s | model=%s | "
        "in_tokens=%d | out_tokens=%d | est_cost=$%.6f",
        timestamp,
        user_id,
        agent_source,
        complexity,
        model_used,
        input_tokens,
        output_tokens,
        estimated_cost,
    )
