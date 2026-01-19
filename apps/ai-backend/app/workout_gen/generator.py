"""
AI Workout Program Generator

Natural language → Structured workout programs using Claude.

Features:
- Text-to-workout from natural language prompts
- Voice-to-program creation
- PDF import with OCR (future)
- Intelligent exercise selection
- Volume/intensity progression
- Deload week insertion

Sprint 33: AI Workout Generation
"""

import json
from typing import Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_anthropic import ChatAnthropic

from app.core.config import settings


class ProgramGoal(str, Enum):
    """Training program goals"""

    STRENGTH = "strength"
    HYPERTROPHY = "hypertrophy"
    ENDURANCE = "endurance"
    POWER = "power"
    GENERAL_FITNESS = "general_fitness"
    SPORT_SPECIFIC = "sport_specific"
    WEIGHT_LOSS = "weight_loss"


class ExperienceLevel(str, Enum):
    """Client experience levels"""

    BEGINNER = "beginner"  # <1 year training
    INTERMEDIATE = "intermediate"  # 1-3 years
    ADVANCED = "advanced"  # 3+ years


@dataclass
class GenerationConfig:
    """Configuration for workout generation"""

    goal: ProgramGoal
    experience_level: ExperienceLevel
    days_per_week: int  # 2-7
    duration_weeks: int  # 4-52
    equipment_available: list[str] = field(default_factory=list)
    injuries_limitations: list[str] = field(default_factory=list)
    session_duration_minutes: int = 60
    include_deload: bool = True
    deload_frequency_weeks: int = 4

    # Optional specific requirements
    specific_sport: Optional[str] = None
    focus_muscle_groups: list[str] = field(default_factory=list)
    avoid_exercises: list[str] = field(default_factory=list)

    def to_prompt(self) -> str:
        """Convert config to natural language prompt"""
        prompt = f"""
Create a {self.duration_weeks}-week {self.goal.value} training program for a {self.experience_level.value} client.

**Program Requirements:**
- Training days per week: {self.days_per_week}
- Session duration: ~{self.session_duration_minutes} minutes
- Equipment available: {', '.join(self.equipment_available) if self.equipment_available else 'Full gym'}

**Client Context:**
- Experience level: {self.experience_level.value}
- Primary goal: {self.goal.value}
"""

        if self.specific_sport:
            prompt += f"- Sport: {self.specific_sport}\n"

        if self.focus_muscle_groups:
            prompt += f"- Focus areas: {', '.join(self.focus_muscle_groups)}\n"

        if self.injuries_limitations:
            prompt += f"- Injuries/limitations: {', '.join(self.injuries_limitations)}\n"

        if self.avoid_exercises:
            prompt += f"- Avoid exercises: {', '.join(self.avoid_exercises)}\n"

        prompt += f"\n**Periodization:**\n"
        if self.include_deload:
            prompt += f"- Include deload weeks every {self.deload_frequency_weeks} weeks\n"

        return prompt


@dataclass
class Exercise:
    """Exercise within a workout"""

    name: str
    sets: int
    reps: str  # Can be "8-10" or "12" or "AMRAP"
    rpe: Optional[float] = None  # Rate of Perceived Exertion (1-10)
    rest_seconds: int = 90
    tempo: Optional[str] = None  # e.g., "3010" (3s eccentric, 0s pause, 1s concentric, 0s pause)
    notes: Optional[str] = None
    substitutions: list[str] = field(default_factory=list)


@dataclass
class Workout:
    """Single workout session"""

    day_number: int
    week_number: int
    name: str  # e.g., "Upper Power", "Lower Hypertrophy"
    exercises: list[Exercise]
    warmup_notes: Optional[str] = None
    cooldown_notes: Optional[str] = None
    total_duration_minutes: int = 60


@dataclass
class WorkoutProgram:
    """Complete workout program"""

    id: str
    name: str
    description: str
    goal: ProgramGoal
    experience_level: ExperienceLevel
    duration_weeks: int
    days_per_week: int
    workouts: list[Workout]
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = "AI"  # "AI" or trainer_id

    # Metadata
    equipment_required: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)

    def get_week(self, week_number: int) -> list[Workout]:
        """Get all workouts for a specific week"""
        return [w for w in self.workouts if w.week_number == week_number]

    def to_dict(self) -> dict:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "goal": self.goal.value,
            "experience_level": self.experience_level.value,
            "duration_weeks": self.duration_weeks,
            "days_per_week": self.days_per_week,
            "workouts": [
                {
                    "day_number": w.day_number,
                    "week_number": w.week_number,
                    "name": w.name,
                    "exercises": [
                        {
                            "name": e.name,
                            "sets": e.sets,
                            "reps": e.reps,
                            "rpe": e.rpe,
                            "rest_seconds": e.rest_seconds,
                            "tempo": e.tempo,
                            "notes": e.notes,
                            "substitutions": e.substitutions,
                        }
                        for e in w.exercises
                    ],
                    "warmup_notes": w.warmup_notes,
                    "cooldown_notes": w.cooldown_notes,
                    "total_duration_minutes": w.total_duration_minutes,
                }
                for w in self.workouts
            ],
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by,
            "equipment_required": self.equipment_required,
            "tags": self.tags,
        }


class WorkoutGenerator:
    """
    AI-powered workout program generator.

    Uses Claude to generate intelligent, periodized workout programs
    from natural language prompts.
    """

    def __init__(self):
        self.llm = ChatAnthropic(
            model=settings.ANTHROPIC_MODEL or "claude-sonnet-4-5-20250929",
            temperature=0.3,  # Lower for more consistent program structure
            api_key=settings.ANTHROPIC_API_KEY,
        )

        self.system_prompt = """You are an expert strength & conditioning coach with 15+ years of experience designing training programs.

Your expertise includes:
- Exercise science and biomechanics
- Periodization models (linear, undulating, block, conjugate)
- Program design for all experience levels
- Injury prevention and exercise modifications
- Sport-specific training adaptations

When generating workout programs:
1. **Exercise Selection**: Choose evidence-based, effective exercises that match the goal
2. **Volume Landmarks**: Follow research-based volume recommendations
   - Strength: 3-6 sets per exercise, 1-6 reps, 85-95% 1RM
   - Hypertrophy: 3-5 sets per exercise, 6-12 reps, 65-85% 1RM
   - Endurance: 2-3 sets per exercise, 12-20+ reps, 40-65% 1RM
3. **Frequency**: Distribute volume across the week (2-3x per muscle group for hypertrophy)
4. **Progression**: Build in logical week-to-week progression (volume, intensity, or both)
5. **Deload Weeks**: Include deload (50-60% volume) every 4-6 weeks
6. **Recovery**: Consider fatigue management and exercise order
7. **Safety**: Prioritize form, injury prevention, and appropriate exercise selection

**Output Format**: Return valid JSON matching the WorkoutProgram schema exactly.
"""

    async def generate_from_config(
        self,
        config: GenerationConfig,
        trainer_id: Optional[str] = None,
    ) -> WorkoutProgram:
        """
        Generate workout program from configuration.

        Args:
            config: Generation configuration
            trainer_id: Optional trainer ID (for customization)

        Returns:
            Complete workout program
        """
        prompt = config.to_prompt()
        prompt += """

Return a JSON object with this exact structure:
{
  "name": "Program name",
  "description": "Brief description",
  "workouts": [
    {
      "day_number": 1,
      "week_number": 1,
      "name": "Workout name (e.g., Upper Power)",
      "warmup_notes": "Brief warmup instructions",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 4,
          "reps": "6-8",
          "rpe": 8.0,
          "rest_seconds": 180,
          "tempo": "3010",
          "notes": "Optional notes",
          "substitutions": ["Alternative 1", "Alternative 2"]
        }
      ],
      "cooldown_notes": "Brief cooldown",
      "total_duration_minutes": 60
    }
  ],
  "equipment_required": ["Barbell", "Dumbbells"],
  "tags": ["strength", "powerlifting"]
}

Generate the complete program now.
"""

        # Call Claude
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=prompt),
        ]

        response = await self.llm.ainvoke(messages)
        program_json = self._extract_json(response.content)

        # Parse into WorkoutProgram
        program = self._parse_program(
            program_json=program_json,
            config=config,
            trainer_id=trainer_id,
        )

        return program

    async def generate_from_text(
        self,
        prompt: str,
        trainer_id: Optional[str] = None,
    ) -> WorkoutProgram:
        """
        Generate workout program from natural language prompt.

        Args:
            prompt: Natural language description
            trainer_id: Optional trainer ID

        Returns:
            Complete workout program

        Example:
            "Create a 4-day upper/lower split for intermediate lifters
             focusing on hypertrophy. 12 weeks with deloads every 4 weeks."
        """
        # First, extract config from natural language
        extraction_prompt = f"""
Analyze this workout program request and extract the key parameters:

"{prompt}"

Return JSON with:
{{
  "goal": "strength|hypertrophy|endurance|power|general_fitness|sport_specific|weight_loss",
  "experience_level": "beginner|intermediate|advanced",
  "days_per_week": 2-7,
  "duration_weeks": 4-52,
  "session_duration_minutes": 30-120,
  "equipment_available": ["list", "of", "equipment"],
  "injuries_limitations": ["any", "mentioned"],
  "specific_sport": "sport name or null",
  "focus_muscle_groups": ["any", "mentioned"],
  "include_deload": true/false,
  "deload_frequency_weeks": 4-6
}}
"""

        messages = [
            SystemMessage(content="You are a fitness program analyzer. Extract parameters from natural language requests."),
            HumanMessage(content=extraction_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        config_json = self._extract_json(response.content)

        # Create config
        config = GenerationConfig(
            goal=ProgramGoal(config_json.get("goal", "general_fitness")),
            experience_level=ExperienceLevel(config_json.get("experience_level", "intermediate")),
            days_per_week=config_json.get("days_per_week", 4),
            duration_weeks=config_json.get("duration_weeks", 12),
            session_duration_minutes=config_json.get("session_duration_minutes", 60),
            equipment_available=config_json.get("equipment_available", []),
            injuries_limitations=config_json.get("injuries_limitations", []),
            specific_sport=config_json.get("specific_sport"),
            focus_muscle_groups=config_json.get("focus_muscle_groups", []),
            include_deload=config_json.get("include_deload", True),
            deload_frequency_weeks=config_json.get("deload_frequency_weeks", 4),
        )

        # Generate program
        return await self.generate_from_config(config, trainer_id)

    def _extract_json(self, content: str) -> dict:
        """Extract JSON from Claude response"""
        # Remove markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Content: {content[:500]}")
            raise

    def _parse_program(
        self,
        program_json: dict,
        config: GenerationConfig,
        trainer_id: Optional[str],
    ) -> WorkoutProgram:
        """Parse JSON into WorkoutProgram object"""
        import uuid

        workouts = []
        for w_data in program_json.get("workouts", []):
            exercises = [
                Exercise(
                    name=e.get("name", ""),
                    sets=e.get("sets", 3),
                    reps=e.get("reps", "8-12"),
                    rpe=e.get("rpe"),
                    rest_seconds=e.get("rest_seconds", 90),
                    tempo=e.get("tempo"),
                    notes=e.get("notes"),
                    substitutions=e.get("substitutions", []),
                )
                for e in w_data.get("exercises", [])
            ]

            workout = Workout(
                day_number=w_data.get("day_number", 1),
                week_number=w_data.get("week_number", 1),
                name=w_data.get("name", "Workout"),
                exercises=exercises,
                warmup_notes=w_data.get("warmup_notes"),
                cooldown_notes=w_data.get("cooldown_notes"),
                total_duration_minutes=w_data.get("total_duration_minutes", 60),
            )
            workouts.append(workout)

        return WorkoutProgram(
            id=str(uuid.uuid4()),
            name=program_json.get("name", "Untitled Program"),
            description=program_json.get("description", ""),
            goal=config.goal,
            experience_level=config.experience_level,
            duration_weeks=config.duration_weeks,
            days_per_week=config.days_per_week,
            workouts=workouts,
            created_by=trainer_id or "AI",
            equipment_required=program_json.get("equipment_required", []),
            tags=program_json.get("tags", []),
        )


# Global generator instance
_generator: Optional[WorkoutGenerator] = None


def get_workout_generator() -> WorkoutGenerator:
    """Get or create global workout generator"""
    global _generator
    if _generator is None:
        _generator = WorkoutGenerator()
    return _generator
