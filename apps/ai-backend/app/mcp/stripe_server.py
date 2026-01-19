"""
Stripe MCP Server

Provides natural language interface to Stripe payment data.

Features:
- Revenue queries (MRR, total revenue, ARPU)
- Subscription analytics
- Customer data
- Payout information
- Failed payment tracking

Example Queries:
- "What's my MRR for this month?"
- "Show me customers who joined last week"
- "How many failed payments do I have?"
- "What's my churn rate this quarter?"

Sprint 31: Apple Health MCP Integration
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class StripeMetric(str, Enum):
    """Available Stripe metrics"""

    MRR = "mrr"
    REVENUE = "revenue"
    ARPU = "arpu"
    CHURN_RATE = "churn_rate"
    ACTIVE_SUBSCRIPTIONS = "active_subscriptions"
    FAILED_PAYMENTS = "failed_payments"
    PAYOUTS = "payouts"
    CUSTOMERS = "customers"


class StripeQuery(BaseModel):
    """Natural language Stripe query"""

    query: str
    user_id: str  # Trainer ID
    context: Dict[str, Any] = {}
    max_results: int = 100


class StripeDataPoint(BaseModel):
    """Single Stripe data point"""

    metric: str
    value: Any
    timestamp: datetime
    metadata: Dict[str, Any] = {}


class StripeQueryResult(BaseModel):
    """Result from Stripe query"""

    results: List[StripeDataPoint]
    summary: Dict[str, Any]
    metadata: Dict[str, Any]


# FastAPI app for Stripe MCP server
app = FastAPI(
    title="FitOS Stripe MCP Server",
    description="Natural language interface to Stripe payment data",
    version="1.0.0",
)


def parse_stripe_time_range(query: str) -> tuple[datetime, datetime]:
    """Parse time range from query"""
    now = datetime.now()
    query_lower = query.lower()

    if "today" in query_lower or "this day" in query_lower:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif "week" in query_lower or "7 day" in query_lower:
        start = now - timedelta(days=7)
        end = now
    elif "month" in query_lower or "30 day" in query_lower:
        start = now - timedelta(days=30)
        end = now
    elif "quarter" in query_lower or "90 day" in query_lower:
        start = now - timedelta(days=90)
        end = now
    elif "year" in query_lower:
        start = now - timedelta(days=365)
        end = now
    else:
        # Default to current month
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now

    return start, end


def detect_stripe_metric(query: str) -> Optional[StripeMetric]:
    """Detect which Stripe metric is being queried"""
    query_lower = query.lower()

    metric_keywords = {
        StripeMetric.MRR: ["mrr", "monthly recurring revenue", "recurring revenue"],
        StripeMetric.REVENUE: ["revenue", "total revenue", "earnings", "income"],
        StripeMetric.ARPU: ["arpu", "average revenue per user", "average per customer"],
        StripeMetric.CHURN_RATE: ["churn", "churn rate", "cancellation", "canceled"],
        StripeMetric.ACTIVE_SUBSCRIPTIONS: ["active", "subscribers", "subscriptions"],
        StripeMetric.FAILED_PAYMENTS: ["failed", "failed payment", "payment fail", "declined"],
        StripeMetric.PAYOUTS: ["payout", "transfer", "bank transfer"],
        StripeMetric.CUSTOMERS: ["customer", "client", "new customer", "joined"],
    }

    for metric, keywords in metric_keywords.items():
        if any(keyword in query_lower for keyword in keywords):
            return metric

    return None


async def fetch_stripe_data(
    user_id: str,
    metric: StripeMetric,
    start_time: datetime,
    end_time: datetime,
) -> List[StripeDataPoint]:
    """
    Fetch Stripe data.

    In production, this would query Supabase payment_analytics table
    or call Stripe API directly.

    Args:
        user_id: Trainer user ID
        metric: Stripe metric to fetch
        start_time: Start of time range
        end_time: End of time range

    Returns:
        List of Stripe data points
    """
    # TODO: Integrate with Supabase payment_analytics table
    # For now, return mock data

    import random

    data_points = []
    current = start_time

    while current <= end_time:
        if metric == StripeMetric.MRR:
            value = random.uniform(5000, 8000)
            unit = "cents"
        elif metric == StripeMetric.REVENUE:
            value = random.uniform(150000, 250000)
            unit = "cents"
        elif metric == StripeMetric.ACTIVE_SUBSCRIPTIONS:
            value = random.randint(40, 60)
            unit = "count"
        elif metric == StripeMetric.CHURN_RATE:
            value = random.uniform(3, 8)
            unit = "percent"
        elif metric == StripeMetric.ARPU:
            value = random.uniform(12000, 18000)
            unit = "cents"
        elif metric == StripeMetric.FAILED_PAYMENTS:
            value = random.randint(1, 5)
            unit = "count"
        else:
            value = random.uniform(1000, 5000)
            unit = "cents"

        data_points.append(StripeDataPoint(
            metric=metric.value,
            value=round(value, 2) if isinstance(value, float) else value,
            timestamp=current,
            metadata={"unit": unit},
        ))

        # Increment by 1 day
        current += timedelta(days=1)

    return data_points


def calculate_stripe_summary(data_points: List[StripeDataPoint]) -> Dict[str, Any]:
    """Calculate summary statistics for Stripe data"""
    if not data_points:
        return {}

    numeric_values = [
        dp.value for dp in data_points
        if isinstance(dp.value, (int, float))
    ]

    if not numeric_values:
        return {"count": len(data_points)}

    latest = data_points[-1]
    unit = latest.metadata.get("unit", "")

    # Calculate trend
    n = len(numeric_values)
    if n >= 2:
        first_half_avg = sum(numeric_values[:n//2]) / (n//2)
        second_half_avg = sum(numeric_values[n//2:]) / (n - n//2)
        growth_percent = ((second_half_avg - first_half_avg) / first_half_avg) * 100 if first_half_avg > 0 else 0
        trend = "growing" if growth_percent > 5 else "declining" if growth_percent < -5 else "stable"
    else:
        growth_percent = 0
        trend = "stable"

    return {
        "count": len(data_points),
        "current": round(numeric_values[-1], 2) if numeric_values else 0,
        "average": round(sum(numeric_values) / len(numeric_values), 2),
        "min": round(min(numeric_values), 2),
        "max": round(max(numeric_values), 2),
        "trend": trend,
        "growth_percent": round(growth_percent, 2),
        "unit": unit,
        "time_range": {
            "start": data_points[0].timestamp.isoformat(),
            "end": data_points[-1].timestamp.isoformat(),
        },
    }


@app.post("/query", response_model=StripeQueryResult)
async def query_stripe_data(query: StripeQuery):
    """
    Execute natural language query against Stripe data.

    Example queries:
    - "What's my MRR for this month?"
    - "Show me failed payments this week"
    - "How many active subscriptions do I have?"
    - "What's my churn rate this quarter?"

    Args:
        query: StripeQuery with natural language query

    Returns:
        StripeQueryResult with data and summary
    """
    # Parse query
    metric = detect_stripe_metric(query.query)
    if not metric:
        raise HTTPException(
            status_code=400,
            detail="Could not detect Stripe metric. Try: MRR, revenue, churn, customers, etc."
        )

    start_time, end_time = parse_stripe_time_range(query.query)

    # Fetch data
    data_points = await fetch_stripe_data(
        user_id=query.user_id,
        metric=metric,
        start_time=start_time,
        end_time=end_time,
    )

    # Calculate summary
    summary = calculate_stripe_summary(data_points)

    return StripeQueryResult(
        results=data_points[:query.max_results],
        summary=summary,
        metadata={
            "query": query.query,
            "detected_metric": metric.value,
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
            },
            "source": "Stripe via MCP",
        },
    )


@app.get("/capabilities")
async def get_capabilities():
    """Get MCP server capabilities"""
    return {
        "name": "FitOS Stripe MCP Server",
        "version": "1.0.0",
        "supported_metrics": [metric.value for metric in StripeMetric],
        "features": [
            "Natural language queries",
            "Revenue analytics",
            "Subscription metrics",
            "Churn analysis",
        ],
        "example_queries": [
            "What's my MRR this month?",
            "How many customers joined last week?",
            "Show me failed payments",
            "What's my churn rate?",
        ],
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FitOS Stripe MCP Server"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
