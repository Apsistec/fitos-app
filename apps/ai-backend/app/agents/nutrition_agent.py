"""
Nutrition Agent - Specialized in meal planning and nutritional guidance

Tools:
- Macro calculation
- Meal suggestions
- Food database search
- Calorie expenditure estimation
- Chrono-nutrition timing

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from typing import Annotated
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent

from app.core.config import settings


# =====================================================
# Nutrition Agent Tools
# =====================================================

@tool
def calculate_macros(
    weight_lbs: float,
    goal: str,
    activity_level: str,
    body_fat_percent: float | None = None
) -> dict:
    """
    Calculate macro targets based on goals and activity level.

    Args:
        weight_lbs: Body weight in pounds
        goal: Goal (fat_loss, maintenance, muscle_gain)
        activity_level: Activity level (sedentary, moderate, active, very_active)
        body_fat_percent: Optional body fat percentage for lean mass calculation

    Returns:
        Daily macro targets (protein, carbs, fats, calories)
    """
    # Estimate lean body mass
    if body_fat_percent:
        lean_mass_lbs = weight_lbs * (1 - body_fat_percent / 100)
    else:
        # Assume 25% body fat if not provided
        lean_mass_lbs = weight_lbs * 0.75

    # Protein: 1g per lb of lean mass (gold standard for muscle retention)
    protein_g = round(lean_mass_lbs)

    # Calorie multipliers by activity level
    activity_multipliers = {
        "sedentary": 14,
        "moderate": 15,
        "active": 16,
        "very_active": 17,
    }
    base_calories = weight_lbs * activity_multipliers.get(activity_level.lower(), 15)

    # Adjust for goal
    goal_adjustments = {
        "fat_loss": 0.80,  # 20% deficit
        "maintenance": 1.0,
        "muscle_gain": 1.15,  # 15% surplus
    }
    target_calories = round(base_calories * goal_adjustments.get(goal.lower(), 1.0))

    # Calculate remaining calories after protein (4 cal/g)
    protein_calories = protein_g * 4
    remaining_calories = target_calories - protein_calories

    # Fat: 25-30% of total calories (0.4g per lb for hormone health)
    fat_g = round(weight_lbs * 0.4)
    fat_calories = fat_g * 9

    # Carbs: Remaining calories (4 cal/g)
    carb_calories = remaining_calories - fat_calories
    carb_g = round(carb_calories / 4)

    return {
        "calories": target_calories,
        "protein_g": protein_g,
        "carbs_g": carb_g,
        "fats_g": fat_g,
        "breakdown": {
            "protein_percent": round((protein_calories / target_calories) * 100),
            "carbs_percent": round((carb_calories / target_calories) * 100),
            "fats_percent": round((fat_calories / target_calories) * 100),
        },
        "goal": goal,
        "rationale": "Based on lean body mass and activity level",
    }


@tool
def search_foods(query: str, limit: int = 5) -> list[dict]:
    """
    Search food database for nutritional information.

    Args:
        query: Food search term
        limit: Maximum results to return

    Returns:
        List of foods with macro information
    """
    # TODO: Integrate with USDA FoodData Central API or Supabase food DB
    # For now, return common foods
    foods = [
        {
            "name": "Chicken Breast (4oz)",
            "calories": 120,
            "protein": 26,
            "carbs": 0,
            "fats": 1.5,
            "serving": "4 oz",
        },
        {
            "name": "White Rice (cooked)",
            "calories": 200,
            "protein": 4,
            "carbs": 45,
            "fats": 0.5,
            "serving": "1 cup",
        },
        {
            "name": "Olive Oil",
            "calories": 120,
            "protein": 0,
            "carbs": 0,
            "fats": 14,
            "serving": "1 tbsp",
        },
        {
            "name": "Greek Yogurt (nonfat)",
            "calories": 100,
            "protein": 17,
            "carbs": 7,
            "fats": 0,
            "serving": "6 oz",
        },
        {
            "name": "Banana",
            "calories": 105,
            "protein": 1,
            "carbs": 27,
            "fats": 0,
            "serving": "1 medium",
        },
    ]

    # Simple keyword matching
    results = [
        food for food in foods
        if query.lower() in food["name"].lower()
    ]

    return results[:limit] if results else foods[:limit]


@tool
def suggest_meal(
    target_protein: int,
    target_carbs: int,
    target_fats: int,
    meal_type: str = "any",
    dietary_restrictions: list[str] | None = None
) -> dict:
    """
    Suggest a meal that hits macro targets.

    Args:
        target_protein: Target protein in grams
        target_carbs: Target carbs in grams
        target_fats: Target fats in grams
        meal_type: Type of meal (breakfast, lunch, dinner, snack)
        dietary_restrictions: List of restrictions (vegetarian, vegan, gluten_free, etc.)

    Returns:
        Suggested meal with ingredients and macros
    """
    # TODO: Build smart meal generator with food combinations
    # For now, return template meal

    meal = {
        "name": "Balanced Power Bowl",
        "meal_type": meal_type,
        "ingredients": [
            {"item": "Grilled chicken breast", "amount": "6 oz", "protein": 39, "carbs": 0, "fats": 2},
            {"item": "Brown rice", "amount": "1 cup", "protein": 5, "carbs": 45, "fats": 2},
            {"item": "Roasted vegetables", "amount": "2 cups", "protein": 4, "carbs": 15, "fats": 0},
            {"item": "Avocado", "amount": "1/4 whole", "protein": 1, "carbs": 3, "fats": 8},
        ],
        "totals": {
            "protein": 49,
            "carbs": 63,
            "fats": 12,
            "calories": 532,
        },
        "preparation": "Grill chicken, cook rice, roast vegetables at 400°F for 20 min, slice avocado",
        "adherence_neutral": "All foods can fit your goals - adjust portions to hit targets",
    }

    return meal


@tool
def calculate_pre_workout_nutrition(
    workout_duration_min: int,
    workout_intensity: str,
    hours_before_workout: float
) -> dict:
    """
    Calculate optimal pre-workout nutrition timing and content.

    Args:
        workout_duration_min: Expected workout duration in minutes
        workout_intensity: Intensity level (low, moderate, high)
        hours_before_workout: Hours until workout

    Returns:
        Pre-workout nutrition recommendations
    """
    # Carb recommendations based on intensity and duration
    intensity_carb_multiplier = {
        "low": 0.5,
        "moderate": 1.0,
        "high": 1.5,
    }

    carb_per_hour = 30 * intensity_carb_multiplier.get(workout_intensity.lower(), 1.0)
    total_carbs = round((workout_duration_min / 60) * carb_per_hour)

    # Timing recommendations
    if hours_before_workout >= 3:
        meal_type = "Full meal"
        protein = 30
        carbs = total_carbs
        fats = 10
        timing_note = "Large meal 3-4 hours before allows full digestion"
    elif hours_before_workout >= 1.5:
        meal_type = "Small meal"
        protein = 20
        carbs = round(total_carbs * 0.7)
        fats = 5
        timing_note = "Moderate meal 1.5-2 hours before with lower fat"
    else:
        meal_type = "Quick snack"
        protein = 10
        carbs = round(total_carbs * 0.5)
        fats = 0
        timing_note = "Close to workout - easily digestible carbs only"

    return {
        "meal_type": meal_type,
        "protein_g": protein,
        "carbs_g": carbs,
        "fats_g": fats,
        "timing": f"{hours_before_workout} hours before workout",
        "timing_note": timing_note,
        "hydration": "16-20 oz water 2-3 hours before, 8-10 oz 15-20 min before",
        "examples": [
            f"{carbs}g carbs + {protein}g protein",
            "Example: Banana + Greek yogurt" if meal_type == "Quick snack" else "Example: Rice + chicken + vegetables",
        ],
    }


# =====================================================
# Nutrition Agent Node
# =====================================================

def nutrition_node(state: dict) -> dict:
    """
    Nutrition agent node that handles meal planning and nutrition queries.

    Uses React agent pattern with specialized nutrition tools.
    """
    messages = state["messages"]
    user_context = state.get("user_context", {})

    # System prompt for nutrition agent
    system_prompt = """You are an expert nutrition coach AI assistant specializing in evidence-based nutritional guidance.

Your expertise includes:
- Macro and calorie calculations
- Meal planning and prep
- Performance nutrition (pre/intra/post workout)
- Adherence-neutral guidance (no food moralizing)
- Flexible dieting and IIFYM principles

**Critical Principles:**
1. **Adherence-Neutral**: NEVER label foods as "good" or "bad", "clean" or "dirty"
2. **No Red for "Over"**: Being over macro targets is NOT failure - it's data
3. **Purple for Progress**: Use encouraging language for all nutrition data
4. **Flexibility**: All foods can fit a nutrition plan with proper planning
5. **Individual Context**: Consider preferences, lifestyle, and sustainability

User Context:
- Weight: {weight}
- Goal: {goal}
- Dietary Restrictions: {restrictions}
- Activity Level: {activity}

Use your tools to:
- Calculate personalized macros
- Search food database
- Suggest meals
- Optimize workout nutrition timing

Always be specific, practical, and non-judgmental.""".format(
        weight=user_context.get("weight_lbs", "Unknown"),
        goal=user_context.get("goal", "Unknown"),
        restrictions=user_context.get("dietary_restrictions", "None"),
        activity=user_context.get("activity_level", "Unknown"),
    )

    # Create React agent with tools
    llm = ChatAnthropic(
        model=settings.ANTHROPIC_MODEL,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.3,
    )

    tools = [
        calculate_macros,
        search_foods,
        suggest_meal,
        calculate_pre_workout_nutrition,
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
    response_message.name = "nutrition"

    # Update state
    state["messages"].append(response_message)
    state["current_agent"] = "nutrition"
    state["available_tools"] = [tool.name for tool in tools]

    # Set confidence
    used_tools = any(
        msg.type == "tool" for msg in result.get("messages", [])
    )
    state["confidence"] = 0.85 if used_tools else 0.70

    return state
