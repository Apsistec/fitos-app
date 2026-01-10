"""Nutrition AI endpoints - photo recognition and natural language parsing"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
import logging
import base64
from io import BytesIO
from PIL import Image

from app.core.llm import get_smart_llm
from langchain_core.messages import HumanMessage

logger = logging.getLogger("fitos-ai")
router = APIRouter()


class RecognizedFood(BaseModel):
    """Single recognized food item"""
    name: str
    portion: str
    calories: int
    protein: float
    carbs: float
    fat: float
    confidence: float
    editable: bool = True


class FoodRecognitionResult(BaseModel):
    """Photo recognition result"""
    foods: List[RecognizedFood]
    totals: dict
    overallConfidence: float
    imageUrl: str | None = None


class NaturalLanguageRequest(BaseModel):
    """Natural language food parsing request"""
    text: str


@router.post("/recognize", response_model=FoodRecognitionResult)
async def recognize_food_from_photo(
    image: str,  # Base64 encoded
    format: str = "jpeg"
):
    """
    Recognize food items from a photo using vision-capable LLM.

    Uses Claude or GPT-4 Vision to:
    1. Identify all visible food items
    2. Estimate portion sizes
    3. Calculate nutritional values
    4. Return transparent breakdown (user can edit each item)

    Returns list of foods with confidence scores.
    """
    try:
        logger.info("Processing food recognition request")

        # Use vision-capable LLM
        llm = get_smart_llm()

        # Build prompt for food recognition
        prompt = """Analyze this food image and identify all visible food items.

For each item, provide:
1. Name of the food
2. Estimated portion size (e.g., "1 cup", "6 oz", "1 medium")
3. Estimated calories
4. Estimated protein (grams)
5. Estimated carbs (grams)
6. Estimated fat (grams)
7. Confidence level (0-1)

Format your response as JSON:
{
  "foods": [
    {
      "name": "Grilled Chicken Breast",
      "portion": "6 oz",
      "calories": 280,
      "protein": 53,
      "carbs": 0,
      "fat": 6,
      "confidence": 0.9
    }
  ]
}

Be conservative with portions. If unsure, note lower confidence.
"""

        # In a real implementation with vision models:
        # response = llm.invoke([
        #     HumanMessage(content=[
        #         {"type": "text", "text": prompt},
        #         {"type": "image_url", "image_url": f"data:image/{format};base64,{image}"}
        #     ])
        # ])

        # Mock response for now (replace with actual vision API)
        mock_result = FoodRecognitionResult(
            foods=[
                RecognizedFood(
                    name="Grilled Chicken Breast",
                    portion="6 oz",
                    calories=280,
                    protein=53.0,
                    carbs=0.0,
                    fat=6.0,
                    confidence=0.85,
                    editable=True
                ),
                RecognizedFood(
                    name="Brown Rice",
                    portion="1 cup",
                    calories=215,
                    protein=5.0,
                    carbs=45.0,
                    fat=1.8,
                    confidence=0.80,
                    editable=True
                )
            ],
            totals={
                "calories": 495,
                "protein": 58.0,
                "carbs": 45.0,
                "fat": 7.8
            },
            overallConfidence=0.82
        )

        logger.info(f"Recognized {len(mock_result.foods)} food items")
        return mock_result

    except Exception as e:
        logger.error(f"Error in food recognition: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to recognize food")


@router.post("/parse", response_model=FoodRecognitionResult)
async def parse_natural_language(request: NaturalLanguageRequest):
    """
    Parse natural language food descriptions.

    Examples:
    - "two eggs and toast with butter"
    - "chicken salad with ranch"
    - "protein shake with banana"

    Uses Nutritionix NLP API or LLM-based parsing.
    """
    try:
        logger.info(f"Parsing natural language: {request.text}")

        llm = get_smart_llm()

        prompt = f"""Parse this food description into structured nutrition data:

"{request.text}"

Identify each food item and estimate:
1. Portion size (use common serving sizes)
2. Calories
3. Protein (g)
4. Carbs (g)
5. Fat (g)

Format as JSON:
{{
  "foods": [
    {{
      "name": "Whole Eggs",
      "portion": "2 large",
      "calories": 140,
      "protein": 12,
      "carbs": 1,
      "fat": 10,
      "confidence": 0.95
    }}
  ]
}}

Use USDA nutrition database knowledge.
"""

        # Mock response (replace with actual LLM call or Nutritionix API)
        mock_result = FoodRecognitionResult(
            foods=[
                RecognizedFood(
                    name="Whole Eggs",
                    portion="2 large",
                    calories=140,
                    protein=12.0,
                    carbs=1.0,
                    fat=10.0,
                    confidence=0.95,
                    editable=True
                ),
                RecognizedFood(
                    name="Whole Wheat Toast",
                    portion="2 slices",
                    calories=160,
                    protein=8.0,
                    carbs=28.0,
                    fat=2.0,
                    confidence=0.90,
                    editable=True
                ),
                RecognizedFood(
                    name="Butter",
                    portion="1 tbsp",
                    calories=100,
                    protein=0.0,
                    carbs=0.0,
                    fat=11.0,
                    confidence=0.85,
                    editable=True
                )
            ],
            totals={
                "calories": 400,
                "protein": 20.0,
                "carbs": 29.0,
                "fat": 23.0
            },
            overallConfidence=0.90
        )

        return mock_result

    except Exception as e:
        logger.error(f"Error parsing natural language: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to parse food description")


@router.post("/verify")
async def verify_food(original: RecognizedFood, correction: RecognizedFood | None = None):
    """
    Verify or correct AI-suggested food entries.

    Allows users to:
    1. Confirm AI suggestions
    2. Adjust portions
    3. Correct misidentified foods
    4. Add missing items

    This feedback improves future recognition accuracy.
    """
    try:
        # In production, this would:
        # 1. Log user corrections for model improvement
        # 2. Fetch verified nutrition data from database
        # 3. Return corrected values

        if correction:
            logger.info(f"User corrected {original.name} to {correction.name}")
            return correction
        else:
            logger.info(f"User verified {original.name}")
            return original

    except Exception as e:
        logger.error(f"Error verifying food: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to verify food")
