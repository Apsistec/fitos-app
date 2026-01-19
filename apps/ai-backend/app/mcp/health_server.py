"""
Apple Health MCP Server

Provides natural language interface to Apple Health data via HealthKit.

Features:
- HRV, heart rate, sleep, steps, workouts
- Time-range queries ("last week", "past 30 days")
- Aggregations (average, min, max, trends)
- Cross-metric correlations

Example Queries:
- "What was my average HRV this week?"
- "Show me sleep duration for the last 7 days"
- "How did my resting heart rate trend this month?"
- "Compare my workout performance to my sleep quality"

Sprint 31: Apple Health MCP Integration
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class HealthMetric(str, Enum):
    """Available health metrics from Apple Health"""

    HRV = "hrv"  # Heart Rate Variability (RMSSD)
    RESTING_HR = "resting_heart_rate"
    HEART_RATE = "heart_rate"
    SLEEP_DURATION = "sleep_duration"
    SLEEP_QUALITY = "sleep_quality"
    STEPS = "steps"
    ACTIVE_CALORIES = "active_calories"
    DISTANCE = "distance"
    WORKOUT_DURATION = "workout_duration"
    BODY_WEIGHT = "body_weight"
    BODY_FAT = "body_fat_percentage"
    BLOOD_OXYGEN = "blood_oxygen"
    RESPIRATORY_RATE = "respiratory_rate"


class TimeRange(str, Enum):
    """Common time range presets"""

    TODAY = "today"
    YESTERDAY = "yesterday"
    WEEK = "week"  # Last 7 days
    MONTH = "month"  # Last 30 days
    QUARTER = "quarter"  # Last 90 days
    YEAR = "year"  # Last 365 days


class HealthQuery(BaseModel):
    """Natural language health data query"""

    query: str
    user_id: str
    context: Dict[str, Any] = {}
    max_results: int = 100


class HealthDataPoint(BaseModel):
    """Single health data point"""

    metric: HealthMetric
    value: float
    unit: str
    timestamp: datetime
    source: str = "Apple Health"
    metadata: Dict[str, Any] = {}


class HealthQueryResult(BaseModel):
    """Result from health query"""

    results: List[HealthDataPoint]
    summary: Dict[str, Any]
    metadata: Dict[str, Any]


# FastAPI app for MCP server
app = FastAPI(
    title="FitOS Health MCP Server",
    description="Natural language interface to Apple Health data",
    version="1.0.0",
)


def parse_time_range(query: str) -> tuple[datetime, datetime]:
    """
    Parse time range from natural language query.

    Args:
        query: Natural language query

    Returns:
        Tuple of (start_time, end_time)
    """
    now = datetime.now()
    query_lower = query.lower()

    if "today" in query_lower:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif "yesterday" in query_lower:
        start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif "week" in query_lower or "7 day" in query_lower:
        start = now - timedelta(days=7)
        end = now
    elif "month" in query_lower or "30 day" in query_lower:
        start = now - timedelta(days=30)
        end = now
    elif "quarter" in query_lower or "90 day" in query_lower:
        start = now - timedelta(days=90)
        end = now
    elif "year" in query_lower or "365 day" in query_lower:
        start = now - timedelta(days=365)
        end = now
    else:
        # Default to last 7 days
        start = now - timedelta(days=7)
        end = now

    return start, end


def detect_metric(query: str) -> Optional[HealthMetric]:
    """
    Detect which health metric is being queried.

    Args:
        query: Natural language query

    Returns:
        Detected HealthMetric or None
    """
    query_lower = query.lower()

    metric_keywords = {
        HealthMetric.HRV: ["hrv", "heart rate variability", "variability"],
        HealthMetric.RESTING_HR: ["resting heart rate", "resting hr", "rhr"],
        HealthMetric.HEART_RATE: ["heart rate", "bpm", "pulse"],
        HealthMetric.SLEEP_DURATION: ["sleep", "sleep duration", "hours of sleep"],
        HealthMetric.SLEEP_QUALITY: ["sleep quality", "deep sleep", "rem sleep"],
        HealthMetric.STEPS: ["steps", "step count", "walking"],
        HealthMetric.ACTIVE_CALORIES: ["active calories", "calories burned", "energy"],
        HealthMetric.DISTANCE: ["distance", "miles", "kilometers"],
        HealthMetric.WORKOUT_DURATION: ["workout", "exercise", "training duration"],
        HealthMetric.BODY_WEIGHT: ["weight", "body weight"],
        HealthMetric.BODY_FAT: ["body fat", "fat percentage"],
    }

    for metric, keywords in metric_keywords.items():
        if any(keyword in query_lower for keyword in keywords):
            return metric

    return None


async def fetch_health_data(
    user_id: str,
    metric: HealthMetric,
    start_time: datetime,
    end_time: datetime,
) -> List[HealthDataPoint]:
    """
    Fetch health data from Apple Health / HealthKit.

    In production, this would integrate with:
    - iOS HealthKit via Capacitor plugin
    - Terra API for cross-platform wearables
    - Supabase cache of synced health data

    Args:
        user_id: User ID
        metric: Health metric to fetch
        start_time: Start of time range
        end_time: End of time range

    Returns:
        List of health data points
    """
    # TODO: Integrate with actual HealthKit / Terra API
    # For now, return mock data

    import random

    data_points = []
    current = start_time

    while current <= end_time:
        # Generate mock data based on metric
        if metric == HealthMetric.HRV:
            value = random.uniform(40, 80)
            unit = "ms"
        elif metric == HealthMetric.RESTING_HR:
            value = random.uniform(50, 70)
            unit = "bpm"
        elif metric == HealthMetric.SLEEP_DURATION:
            value = random.uniform(6.5, 8.5)
            unit = "hours"
        elif metric == HealthMetric.STEPS:
            value = random.uniform(5000, 15000)
            unit = "steps"
        elif metric == HealthMetric.BODY_WEIGHT:
            value = random.uniform(170, 180)
            unit = "lbs"
        else:
            value = random.uniform(50, 100)
            unit = "units"

        data_points.append(HealthDataPoint(
            metric=metric,
            value=round(value, 2),
            unit=unit,
            timestamp=current,
            source="Apple Health (Mock)",
        ))

        # Increment by 1 day for daily metrics
        current += timedelta(days=1)

    return data_points


def calculate_summary(data_points: List[HealthDataPoint]) -> Dict[str, Any]:
    """
    Calculate summary statistics for health data.

    Args:
        data_points: List of health data points

    Returns:
        Summary dict with average, min, max, trend
    """
    if not data_points:
        return {}

    values = [dp.value for dp in data_points]

    # Calculate trend (simple linear regression)
    n = len(values)
    x = list(range(n))
    y = values

    x_mean = sum(x) / n
    y_mean = sum(y) / n

    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0

    trend = "increasing" if slope > 0.5 else "decreasing" if slope < -0.5 else "stable"

    return {
        "count": len(values),
        "average": round(sum(values) / len(values), 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "latest": round(values[-1], 2),
        "trend": trend,
        "trend_slope": round(slope, 4),
        "unit": data_points[0].unit,
        "time_range": {
            "start": data_points[0].timestamp.isoformat(),
            "end": data_points[-1].timestamp.isoformat(),
        },
    }


@app.post("/query", response_model=HealthQueryResult)
async def query_health_data(query: HealthQuery):
    """
    Execute natural language query against health data.

    Example queries:
    - "What was my average HRV this week?"
    - "Show me sleep duration for the last 7 days"
    - "How did my resting heart rate trend this month?"

    Args:
        query: HealthQuery with natural language query

    Returns:
        HealthQueryResult with data and summary
    """
    # Parse query
    metric = detect_metric(query.query)
    if not metric:
        raise HTTPException(
            status_code=400,
            detail="Could not detect health metric in query. Try: HRV, sleep, heart rate, steps, etc."
        )

    start_time, end_time = parse_time_range(query.query)

    # Fetch data
    data_points = await fetch_health_data(
        user_id=query.user_id,
        metric=metric,
        start_time=start_time,
        end_time=end_time,
    )

    # Calculate summary
    summary = calculate_summary(data_points)

    return HealthQueryResult(
        results=data_points[:query.max_results],
        summary=summary,
        metadata={
            "query": query.query,
            "detected_metric": metric,
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
            },
            "source": "Apple Health via MCP",
        },
    )


@app.get("/capabilities")
async def get_capabilities():
    """Get MCP server capabilities"""
    return {
        "name": "FitOS Health MCP Server",
        "version": "1.0.0",
        "supported_metrics": [metric.value for metric in HealthMetric],
        "supported_time_ranges": [tr.value for tr in TimeRange],
        "features": [
            "Natural language queries",
            "Trend analysis",
            "Summary statistics",
            "Cross-metric correlations (coming soon)",
        ],
        "example_queries": [
            "What was my average HRV this week?",
            "Show me sleep duration for the last 7 days",
            "How did my resting heart rate trend this month?",
            "Compare my steps to my sleep quality",
        ],
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FitOS Health MCP Server"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
