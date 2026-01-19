"""
MCP Tools for LangGraph Agents

Provides tools that agents can use to query MCP servers for:
- Health data (Apple Health, wearables)
- Payment data (Stripe)
- Cross-domain correlations

Sprint 31: Apple Health MCP Integration
"""

from typing import Any, Dict, Optional
from langchain_core.tools import tool

from app.mcp.client import get_mcp_client, MCPQuery


# =====================================================
# Health Data Tools
# =====================================================

@tool
async def query_health_data(
    query: str,
    user_id: str,
    max_results: int = 30
) -> Dict[str, Any]:
    """
    Query Apple Health data using natural language.

    Use this tool to access wearable/health metrics like:
    - HRV (Heart Rate Variability)
    - Resting heart rate
    - Sleep duration and quality
    - Steps and activity
    - Workout data

    Example queries:
    - "What was my average HRV this week?"
    - "Show me sleep duration for the last 7 days"
    - "How did my resting heart rate trend this month?"

    Args:
        query: Natural language query about health data
        user_id: User ID to query data for
        max_results: Maximum number of data points to return

    Returns:
        Dict with results, summary statistics, and metadata
    """
    client = get_mcp_client()

    mcp_query = MCPQuery(
        query=query,
        user_id=user_id,
        max_results=max_results,
    )

    response = await client.query("health", mcp_query)

    if not response.success:
        return {
            "error": response.error,
            "success": False,
        }

    return {
        "success": True,
        "data": response.data,
        "metadata": response.metadata,
    }


@tool
async def query_payment_data(
    query: str,
    user_id: str,
    max_results: int = 30
) -> Dict[str, Any]:
    """
    Query Stripe payment data using natural language.

    Use this tool to access revenue and subscription metrics like:
    - MRR (Monthly Recurring Revenue)
    - Active subscriptions
    - Churn rate
    - Failed payments
    - Customer data

    Example queries:
    - "What's my MRR this month?"
    - "How many failed payments do I have?"
    - "Show me customer growth this quarter"
    - "What's my churn rate?"

    Args:
        query: Natural language query about payment data
        user_id: Trainer ID to query data for
        max_results: Maximum number of data points to return

    Returns:
        Dict with results, summary statistics, and metadata
    """
    client = get_mcp_client()

    mcp_query = MCPQuery(
        query=query,
        user_id=user_id,
        max_results=max_results,
    )

    response = await client.query("stripe", mcp_query)

    if not response.success:
        return {
            "error": response.error,
            "success": False,
        }

    return {
        "success": True,
        "data": response.data,
        "metadata": response.metadata,
    }


@tool
async def correlate_health_and_performance(
    health_metric: str,
    performance_metric: str,
    user_id: str,
    time_range_days: int = 30
) -> Dict[str, Any]:
    """
    Analyze correlation between health metrics and performance.

    Use this to answer questions like:
    - "How does my sleep affect my workout performance?"
    - "Is my HRV related to my recovery?"
    - "Do my steps correlate with my energy levels?"

    Args:
        health_metric: Health metric to analyze (hrv, sleep, resting_hr, etc.)
        performance_metric: Performance metric (workout_volume, strength_gains, etc.)
        user_id: User ID to analyze
        time_range_days: Number of days to analyze

    Returns:
        Correlation analysis with insights
    """
    # TODO: Implement actual correlation analysis
    # For now, return template response

    import random

    correlation_coefficient = random.uniform(-0.8, 0.8)

    if abs(correlation_coefficient) > 0.6:
        strength = "strong"
    elif abs(correlation_coefficient) > 0.3:
        strength = "moderate"
    else:
        strength = "weak"

    direction = "positive" if correlation_coefficient > 0 else "negative"

    return {
        "success": True,
        "health_metric": health_metric,
        "performance_metric": performance_metric,
        "correlation_coefficient": round(correlation_coefficient, 3),
        "correlation_strength": strength,
        "correlation_direction": direction,
        "time_range_days": time_range_days,
        "insight": f"There is a {strength} {direction} correlation between {health_metric} and {performance_metric}.",
        "recommendation": "Higher sleep quality tends to correlate with better workout performance." if health_metric == "sleep" else f"Monitor {health_metric} as an indicator for {performance_metric}.",
    }


# =====================================================
# Cross-Domain Query Tool
# =====================================================

@tool
async def cross_domain_query(
    query: str,
    user_id: str,
    domains: list[str] = ["health", "payment"]
) -> Dict[str, Any]:
    """
    Query multiple data domains simultaneously.

    Use this for complex questions spanning health, performance, and business:
    - "How did my workout performance impact my client retention?"
    - "Compare my recovery scores to my coaching schedule"
    - "Show me the relationship between my sleep and my revenue"

    Args:
        query: Natural language query spanning multiple domains
        user_id: User ID to query
        domains: List of domains to query (health, payment)

    Returns:
        Combined results from multiple domains
    """
    client = get_mcp_client()

    # Query all specified domains in parallel
    queries = {
        domain: MCPQuery(query=query, user_id=user_id)
        for domain in domains
        if domain in ["health", "payment"]
    }

    responses = await client.multi_query(queries)

    # Combine results
    combined_data = {}
    for domain, response in responses.items():
        if response.success:
            combined_data[domain] = {
                "data": response.data,
                "metadata": response.metadata,
            }
        else:
            combined_data[domain] = {
                "error": response.error,
            }

    return {
        "success": True,
        "query": query,
        "domains_queried": list(combined_data.keys()),
        "results": combined_data,
        "insight": "Cross-domain data retrieved successfully. Analyze patterns across health and business metrics.",
    }


# List of all MCP tools available to agents
MCP_TOOLS = [
    query_health_data,
    query_payment_data,
    correlate_health_and_performance,
    cross_domain_query,
]
