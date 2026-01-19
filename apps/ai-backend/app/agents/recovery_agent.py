"""
Recovery Agent - Specialized in sleep, HRV, and recovery optimization

Tools:
- HRV analysis
- Sleep recommendations
- Soreness assessment
- Recovery score calculation
- Auto-regulation guidance

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from typing import Annotated
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent

from app.core.config import settings


# =====================================================
# Recovery Agent Tools
# =====================================================

@tool
def analyze_hrv(
    hrv_ms: float,
    resting_hr_bpm: int,
    user_baseline_hrv: float | None = None
) -> dict:
    """
    Analyze Heart Rate Variability for recovery insights.

    Args:
        hrv_ms: Current HRV in milliseconds (RMSSD)
        resting_hr_bpm: Current resting heart rate
        user_baseline_hrv: User's 7-day baseline HRV average

    Returns:
        HRV analysis with recovery recommendations
    """
    # If no baseline, use typical adult ranges
    if user_baseline_hrv is None:
        user_baseline_hrv = 50  # Typical adult average

    # Calculate deviation from baseline
    hrv_deviation_percent = ((hrv_ms - user_baseline_hrv) / user_baseline_hrv) * 100

    # Categorize recovery status
    if hrv_deviation_percent >= 10:
        status = "Supercompensated"
        category = "recovered"
        intensity_modifier = 1.2  # Can push harder
        volume_modifier = 1.1
        color = "success"
        recommendation = "Great recovery! Consider increasing training intensity or volume today."
    elif hrv_deviation_percent >= -5:
        status = "Normal"
        category = "moderate"
        intensity_modifier = 1.0
        volume_modifier = 1.0
        color = "primary"
        recommendation = "Good recovery. Proceed with planned training."
    elif hrv_deviation_percent >= -15:
        status = "Slightly Suppressed"
        category = "under_recovered"
        intensity_modifier = 0.9
        volume_modifier = 0.85
        color = "warning"
        recommendation = "Recovery slightly compromised. Consider reducing volume by 10-15%."
    else:
        status = "Suppressed"
        category = "critical"
        intensity_modifier = 0.7
        volume_modifier = 0.5
        color = "danger"
        recommendation = "Poor recovery. Strong recommendation for active recovery or rest day."

    # Resting HR analysis (elevated RHR = poor recovery)
    typical_rhr_range = (50, 70)  # Typical athlete range
    rhr_elevated = resting_hr_bpm > typical_rhr_range[1] + 5

    return {
        "hrv_ms": hrv_ms,
        "baseline_hrv_ms": user_baseline_hrv,
        "deviation_percent": round(hrv_deviation_percent, 1),
        "status": status,
        "category": category,
        "resting_hr_bpm": resting_hr_bpm,
        "resting_hr_elevated": rhr_elevated,
        "intensity_modifier": intensity_modifier,
        "volume_modifier": volume_modifier,
        "color": color,
        "recommendation": recommendation,
        "confidence": 0.85 if user_baseline_hrv else 0.65,
    }


@tool
def calculate_recovery_score(
    hrv_score: int,
    sleep_score: int,
    resting_hr_score: int,
    subjective_feeling: int | None = None
) -> dict:
    """
    Calculate composite recovery score from multiple inputs.

    Args:
        hrv_score: HRV component score (0-100)
        sleep_score: Sleep quality score (0-100)
        resting_hr_score: Resting HR component score (0-100)
        subjective_feeling: Optional subjective readiness (0-100)

    Returns:
        Composite recovery score with recommendations
    """
    # Weighted composite (per Sprint 34 spec)
    weights = {
        "hrv": 0.40,
        "sleep": 0.35,
        "resting_hr": 0.15,
        "subjective": 0.10,
    }

    # Calculate weighted score
    if subjective_feeling is not None:
        total_score = (
            hrv_score * weights["hrv"] +
            sleep_score * weights["sleep"] +
            resting_hr_score * weights["resting_hr"] +
            subjective_feeling * weights["subjective"]
        )
        confidence = 0.90
    else:
        # Redistribute subjective weight if not provided
        adjusted_weights = {
            "hrv": 0.44,
            "sleep": 0.39,
            "resting_hr": 0.17,
        }
        total_score = (
            hrv_score * adjusted_weights["hrv"] +
            sleep_score * adjusted_weights["sleep"] +
            resting_hr_score * adjusted_weights["resting_hr"]
        )
        confidence = 0.75

    total_score = round(total_score)

    # Categorize and recommend
    if total_score >= 80:
        category = "recovered"
        intensity_mod = 1.1
        volume_mod = 1.0
        action = "Optimal for high-intensity training"
    elif total_score >= 60:
        category = "moderate"
        intensity_mod = 1.0
        volume_mod = 1.0
        action = "Proceed with normal training"
    elif total_score >= 40:
        category = "under_recovered"
        intensity_mod = 0.85
        volume_mod = 0.75
        action = "Reduce volume by 20-25%, maintain intensity"
    else:
        category = "critical"
        intensity_mod = 0.6
        volume_mod = 0.5
        action = "Active recovery or rest day recommended"

    return {
        "overall_score": total_score,
        "category": category,
        "intensity_modifier": intensity_mod,
        "volume_modifier": volume_mod,
        "suggested_action": action,
        "confidence": confidence,
        "components": {
            "hrv": {"score": hrv_score, "weight": weights["hrv"]},
            "sleep": {"score": sleep_score, "weight": weights["sleep"]},
            "resting_hr": {"score": resting_hr_score, "weight": weights["resting_hr"]},
            "subjective": {"score": subjective_feeling, "weight": weights["subjective"]} if subjective_feeling else None,
        },
    }


@tool
def recommend_sleep_optimization(
    avg_sleep_hours: float,
    sleep_quality: str,
    chronotype: str | None = None
) -> dict:
    """
    Provide personalized sleep optimization recommendations.

    Args:
        avg_sleep_hours: Average nightly sleep duration
        sleep_quality: Subjective quality (poor, fair, good, excellent)
        chronotype: Optional chronotype (morning_lark, night_owl, intermediate)

    Returns:
        Sleep optimization strategies
    """
    # Sleep duration assessment
    if avg_sleep_hours < 7:
        duration_status = "Insufficient"
        duration_rec = "Aim for 7-9 hours. Even 30 min more can improve recovery significantly."
    elif avg_sleep_hours <= 9:
        duration_status = "Optimal"
        duration_rec = "Sleep duration is in the optimal range for athletes."
    else:
        duration_status = "Excessive"
        duration_rec = "Sleeping >9 hours may indicate overtraining or underlying health issues."

    # Quality-based recommendations
    quality_recs = {
        "poor": [
            "Maintain consistent sleep/wake times (±30 min)",
            "Keep bedroom cool (65-68°F)",
            "Limit blue light 2 hours before bed",
            "Avoid caffeine after 2 PM",
            "Consider magnesium glycinate supplement (400mg before bed)",
        ],
        "fair": [
            "Optimize sleep environment (dark, cool, quiet)",
            "Limit alcohol close to bedtime (disrupts REM)",
            "Try 10-minute wind-down routine",
        ],
        "good": [
            "Maintain current habits",
            "Track HRV to confirm recovery quality",
        ],
        "excellent": [
            "Continue current sleep hygiene practices",
            "You're in the top tier for recovery optimization",
        ],
    }

    recommendations = quality_recs.get(sleep_quality.lower(), quality_recs["fair"])

    # Chronotype-specific guidance
    chronotype_guidance = None
    if chronotype:
        if chronotype == "morning_lark":
            chronotype_guidance = "Schedule high-intensity workouts 6-10 AM for peak performance"
        elif chronotype == "night_owl":
            chronotype_guidance = "Evening workouts (6-10 PM) align with your natural peak performance window"
        else:
            chronotype_guidance = "Flexible schedule - slight preference for afternoon training"

    return {
        "duration_hours": avg_sleep_hours,
        "duration_status": duration_status,
        "duration_recommendation": duration_rec,
        "quality": sleep_quality,
        "recommendations": recommendations,
        "chronotype_guidance": chronotype_guidance,
        "priority": "HIGH" if avg_sleep_hours < 7 else "MEDIUM",
    }


@tool
def assess_soreness(
    muscle_group: str,
    pain_level: int,
    days_since_training: int
) -> dict:
    """
    Assess muscle soreness and provide recovery guidance.

    Args:
        muscle_group: Affected muscle group
        pain_level: Pain level 1-10
        days_since_training: Days since the workout that caused soreness

    Returns:
        Soreness assessment with recommendations
    """
    # DOMS (Delayed Onset Muscle Soreness) typically peaks 24-72 hours post-workout
    if days_since_training <= 1:
        expected_soreness = "Just beginning"
        phase = "Acute"
    elif days_since_training <= 3:
        expected_soreness = "Peak DOMS period"
        phase = "Peak"
    elif days_since_training <= 5:
        expected_soreness = "Resolving"
        phase = "Recovery"
    else:
        expected_soreness = "Should be mostly resolved"
        phase = "Late"

    # Pain level assessment
    if pain_level <= 3:
        severity = "Mild"
        can_train = True
        recommendation = "Can train normally. Light soreness is normal and not harmful."
    elif pain_level <= 6:
        severity = "Moderate"
        can_train = True
        recommendation = "Can train with reduced intensity/volume. Focus on different muscle groups if possible."
    elif pain_level <= 8:
        severity = "Severe"
        can_train = False
        recommendation = "Avoid training this muscle group. Active recovery (walking, light cardio) may help."
    else:
        severity = "Extreme"
        can_train = False
        recommendation = "REST. This level of pain is unusual. If sharp or worsening, consult trainer/medical professional."

    # Red flags for non-DOMS pain
    red_flags = []
    if pain_level >= 8:
        red_flags.append("Pain level unusually high for typical muscle soreness")
    if days_since_training > 5 and pain_level > 5:
        red_flags.append("Soreness persisting beyond normal DOMS timeline")

    should_escalate = len(red_flags) > 0

    return {
        "muscle_group": muscle_group,
        "pain_level": pain_level,
        "severity": severity,
        "days_since_training": days_since_training,
        "expected_phase": expected_soreness,
        "phase": phase,
        "can_train": can_train,
        "recommendation": recommendation,
        "recovery_methods": [
            "Light movement / active recovery",
            "Adequate protein intake (1g per lb)",
            "Sleep 7-9 hours",
            "Hydration",
            "Optional: foam rolling, massage, sauna",
        ],
        "red_flags": red_flags if red_flags else None,
        "should_escalate": should_escalate,
    }


# =====================================================
# Recovery Agent Node
# =====================================================

def recovery_node(state: dict) -> dict:
    """
    Recovery agent node that handles sleep, HRV, and recovery queries.

    Uses React agent pattern with specialized recovery tools.
    """
    messages = state["messages"]
    user_context = state.get("user_context", {})

    # System prompt for recovery agent
    system_prompt = """You are an expert recovery and sports science coach AI assistant.

Your expertise includes:
- Heart Rate Variability (HRV) analysis
- Sleep optimization
- Recovery score calculation
- Soreness assessment (DOMS vs injury)
- Auto-regulation and training modification
- Biomarker interpretation

**Critical Guidelines:**
1. **Safety First**: Escalate to trainer if pain is sharp, asymmetric, or worsening
2. **Evidence-Based**: Use research-backed recovery protocols
3. **Individual Baselines**: Always compare to individual baselines, not population averages
4. **Holistic View**: Consider HRV, sleep, RHR, and subjective feel together
5. **Auto-Regulation**: Provide specific training modifications based on recovery status

User Context:
- Baseline HRV: {baseline_hrv}
- Avg Sleep: {avg_sleep} hours
- Recent Training Load: {training_load}

Use your tools to:
- Analyze HRV and readiness
- Calculate composite recovery scores
- Optimize sleep quality
- Assess soreness vs injury

Always be specific, data-driven, and conservative with safety.""".format(
        baseline_hrv=user_context.get("baseline_hrv_ms", "Unknown"),
        avg_sleep=user_context.get("avg_sleep_hours", "Unknown"),
        training_load=user_context.get("weekly_training_load", "Unknown"),
    )

    # Create React agent with tools
    llm = ChatAnthropic(
        model=settings.ANTHROPIC_MODEL,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.2,  # Lower temp for medical/safety topics
    )

    # Import MCP tools for health data access
    from app.mcp.tools import query_health_data, correlate_health_and_performance

    tools = [
        analyze_hrv,
        calculate_recovery_score,
        recommend_sleep_optimization,
        assess_soreness,
        query_health_data,  # Access Apple Health data via MCP
        correlate_health_and_performance,  # Correlate health with performance
    ]

    agent = create_react_agent(
        llm,
        tools,
        state_modifier=SystemMessage(content=system_prompt)
    )

    # Run agent
    result = agent.invoke({"messages": messages})

    # Extract response and add metadata
    response_message = result["messages"][-1]
    response_message.name = "recovery"

    # Update state
    state["messages"].append(response_message)
    state["current_agent"] = "recovery"
    state["available_tools"] = [tool.name for tool in tools]

    # Set confidence - lower for safety
    used_tools = any(
        msg.type == "tool" for msg in result.get("messages", [])
    )
    state["confidence"] = 0.80 if used_tools else 0.65

    # Check for escalation triggers in tools
    for msg in result.get("messages", []):
        if hasattr(msg, 'content') and isinstance(msg.content, str):
            if "should_escalate" in msg.content.lower() or "red_flag" in msg.content.lower():
                state["should_escalate"] = True
                state["approval_reason"] = "Recovery concern requires trainer review"

    return state
