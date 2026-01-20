"""
Habit Formation & Tracking Module

Science-backed 66-day habit formation system based on University of South
Australia 2024 research debunking the 21-day myth.

Research:
- Health habits take 59-66 days median (not 21 days)
- Gym habits specifically require 4-7 months
- Morning habits form 43% more reliably than evening
- Self-selected habits have 37% higher success rate
- Habit stacking increases formation probability by 2.3x

Sprint 38: 66-Day Habit Tracking
"""

from app.habits.habit_formation import (
    HabitFormation,
    HabitType,
    HabitFrequency,
    HabitTimePreference,
    HabitDifficulty,
    HabitProgress,
    get_habit_formation,
)
from app.habits.habit_stacking import (
    HabitStackingEngine,
    StackSuggestion,
    get_habit_stacking_engine,
)
from app.habits.context_notifications import (
    ContextNotificationEngine,
    NotificationContext,
    NotificationTiming,
    get_notification_engine,
)

__all__ = [
    "HabitFormation",
    "HabitType",
    "HabitFrequency",
    "HabitTimePreference",
    "HabitDifficulty",
    "HabitProgress",
    "get_habit_formation",
    "HabitStackingEngine",
    "StackSuggestion",
    "get_habit_stacking_engine",
    "ContextNotificationEngine",
    "NotificationContext",
    "NotificationTiming",
    "get_notification_engine",
]
