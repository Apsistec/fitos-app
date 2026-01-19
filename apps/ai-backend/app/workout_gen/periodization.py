"""
Auto-Periodization with Block Programming

Implements evidence-based periodization models:
- Linear periodization
- Undulating periodization (DUP)
- Block periodization
- Conjugate method

Sprint 33: AI Workout Generation
"""

from dataclasses import dataclass, field
from typing import Literal, Optional
from enum import Enum
from datetime import datetime, timedelta


class PeriodizationModel(str, Enum):
    """Periodization models"""

    LINEAR = "linear"  # Progressive volume → intensity
    UNDULATING = "undulating"  # Daily/weekly variation (DUP)
    BLOCK = "block"  # Accumulation → Intensification → Realization
    CONJUGATE = "conjugate"  # Concurrent max effort + dynamic effort


class BlockType(str, Enum):
    """Training block types"""

    ACCUMULATION = "accumulation"  # High volume, moderate intensity
    INTENSIFICATION = "intensification"  # Moderate volume, high intensity
    REALIZATION = "realization"  # Low volume, peak intensity
    DELOAD = "deload"  # Recovery week


@dataclass
class VolumeIntensityTarget:
    """Volume and intensity targets for a period"""

    sets_per_exercise: tuple[int, int]  # (min, max)
    reps_per_set: tuple[int, int]  # (min, max)
    intensity_percent_1rm: tuple[int, int]  # (min, max)
    rpe_target: tuple[float, float]  # (min, max)


@dataclass
class PeriodizationBlock:
    """Training block (mesocycle)"""

    block_number: int
    block_type: BlockType
    start_week: int
    duration_weeks: int
    volume_intensity: VolumeIntensityTarget
    focus: str  # e.g., "Volume accumulation", "Strength peaking"
    notes: Optional[str] = None

    @property
    def end_week(self) -> int:
        """Last week of this block"""
        return self.start_week + self.duration_weeks - 1


class Periodizer:
    """
    Auto-periodization engine.

    Creates periodized training blocks based on program goals and duration.
    """

    # Volume/Intensity landmarks by block type
    BLOCK_TARGETS = {
        BlockType.ACCUMULATION: VolumeIntensityTarget(
            sets_per_exercise=(4, 6),
            reps_per_set=(8, 12),
            intensity_percent_1rm=(60, 75),
            rpe_target=(6.5, 8.0),
        ),
        BlockType.INTENSIFICATION: VolumeIntensityTarget(
            sets_per_exercise=(3, 5),
            reps_per_set=(4, 8),
            intensity_percent_1rm=(75, 87),
            rpe_target=(7.5, 9.0),
        ),
        BlockType.REALIZATION: VolumeIntensityTarget(
            sets_per_exercise=(2, 4),
            reps_per_set=(1, 5),
            intensity_percent_1rm=(85, 95),
            rpe_target=(8.5, 9.5),
        ),
        BlockType.DELOAD: VolumeIntensityTarget(
            sets_per_exercise=(2, 3),
            reps_per_set=(6, 10),
            intensity_percent_1rm=(50, 60),
            rpe_target=(5.0, 6.5),
        ),
    }

    def __init__(self):
        pass

    def create_linear_periodization(
        self,
        total_weeks: int,
        deload_frequency: int = 4,
    ) -> list[PeriodizationBlock]:
        """
        Create linear periodization blocks.

        Progressively increases intensity while decreasing volume.

        Args:
            total_weeks: Total program duration
            deload_frequency: Deload every N weeks

        Returns:
            List of periodization blocks
        """
        blocks = []
        current_week = 1
        block_num = 1

        while current_week <= total_weeks:
            # Determine if this is a deload week
            is_deload_week = (current_week % deload_frequency == 0)

            if is_deload_week:
                blocks.append(
                    PeriodizationBlock(
                        block_number=block_num,
                        block_type=BlockType.DELOAD,
                        start_week=current_week,
                        duration_weeks=1,
                        volume_intensity=self.BLOCK_TARGETS[BlockType.DELOAD],
                        focus="Recovery and adaptation",
                    )
                )
                current_week += 1
                block_num += 1
                continue

            # Determine phase based on program progression
            progress_ratio = current_week / total_weeks

            if progress_ratio < 0.4:
                # First 40%: Accumulation
                block_type = BlockType.ACCUMULATION
                focus = "Volume accumulation and work capacity"
                duration = min(3, total_weeks - current_week + 1)
            elif progress_ratio < 0.75:
                # Middle 35%: Intensification
                block_type = BlockType.INTENSIFICATION
                focus = "Strength building and intensification"
                duration = min(3, total_weeks - current_week + 1)
            else:
                # Final 25%: Realization
                block_type = BlockType.REALIZATION
                focus = "Peak strength and performance"
                duration = min(2, total_weeks - current_week + 1)

            blocks.append(
                PeriodizationBlock(
                    block_number=block_num,
                    block_type=block_type,
                    start_week=current_week,
                    duration_weeks=duration,
                    volume_intensity=self.BLOCK_TARGETS[block_type],
                    focus=focus,
                )
            )

            current_week += duration
            block_num += 1

        return blocks

    def create_block_periodization(
        self,
        total_weeks: int,
        goal: Literal["strength", "hypertrophy", "power"] = "strength",
    ) -> list[PeriodizationBlock]:
        """
        Create block periodization (accumulation → intensification → realization).

        Classic block model: 3-4 week blocks with specific adaptations.

        Args:
            total_weeks: Total program duration
            goal: Primary training goal

        Returns:
            List of periodization blocks
        """
        blocks = []
        current_week = 1
        block_num = 1

        # Block sequence based on goal
        if goal == "strength":
            # Classic strength block: Accumulation → Intensification → Realization
            block_sequence = [
                (BlockType.ACCUMULATION, 4, "Hypertrophy and work capacity"),
                (BlockType.INTENSIFICATION, 3, "Strength building"),
                (BlockType.REALIZATION, 2, "Strength peaking"),
                (BlockType.DELOAD, 1, "Recovery"),
            ]
        elif goal == "hypertrophy":
            # Hypertrophy focus: Longer accumulation blocks
            block_sequence = [
                (BlockType.ACCUMULATION, 5, "Volume accumulation"),
                (BlockType.INTENSIFICATION, 2, "Strength emphasis"),
                (BlockType.DELOAD, 1, "Recovery"),
            ]
        else:  # power
            # Power development: Intensification → Realization emphasis
            block_sequence = [
                (BlockType.ACCUMULATION, 3, "Work capacity"),
                (BlockType.INTENSIFICATION, 3, "Strength-speed"),
                (BlockType.REALIZATION, 2, "Power expression"),
                (BlockType.DELOAD, 1, "Recovery"),
            ]

        # Repeat sequence until total weeks reached
        while current_week <= total_weeks:
            for block_type, duration, focus in block_sequence:
                if current_week > total_weeks:
                    break

                # Adjust duration if near end of program
                actual_duration = min(duration, total_weeks - current_week + 1)

                blocks.append(
                    PeriodizationBlock(
                        block_number=block_num,
                        block_type=block_type,
                        start_week=current_week,
                        duration_weeks=actual_duration,
                        volume_intensity=self.BLOCK_TARGETS[block_type],
                        focus=focus,
                    )
                )

                current_week += actual_duration
                block_num += 1

        return blocks

    def create_undulating_periodization(
        self,
        total_weeks: int,
        variation_frequency: Literal["daily", "weekly"] = "daily",
    ) -> list[PeriodizationBlock]:
        """
        Create undulating periodization (DUP).

        Varies volume/intensity on a daily or weekly basis.

        Args:
            total_weeks: Total program duration
            variation_frequency: How often to vary (daily or weekly)

        Returns:
            List of periodization blocks
        """
        blocks = []
        current_week = 1
        block_num = 1

        if variation_frequency == "weekly":
            # Weekly undulation: alternate weeks between volume and intensity
            while current_week <= total_weeks:
                # Check if deload week (every 4 weeks)
                if current_week % 4 == 0:
                    blocks.append(
                        PeriodizationBlock(
                            block_number=block_num,
                            block_type=BlockType.DELOAD,
                            start_week=current_week,
                            duration_weeks=1,
                            volume_intensity=self.BLOCK_TARGETS[BlockType.DELOAD],
                            focus="Recovery week",
                        )
                    )
                    current_week += 1
                    block_num += 1
                    continue

                # Alternate between accumulation and intensification
                if block_num % 2 == 1:
                    block_type = BlockType.ACCUMULATION
                    focus = "Volume emphasis"
                else:
                    block_type = BlockType.INTENSIFICATION
                    focus = "Intensity emphasis"

                blocks.append(
                    PeriodizationBlock(
                        block_number=block_num,
                        block_type=block_type,
                        start_week=current_week,
                        duration_weeks=1,
                        volume_intensity=self.BLOCK_TARGETS[block_type],
                        focus=focus,
                    )
                )

                current_week += 1
                block_num += 1

        else:  # daily
            # Daily undulation: handled at workout level, not block level
            # Create 1-week blocks with mixed training
            while current_week <= total_weeks:
                if current_week % 4 == 0:
                    block_type = BlockType.DELOAD
                    focus = "Recovery week"
                else:
                    # Mixed training week
                    block_type = BlockType.INTENSIFICATION
                    focus = "Daily undulating training (mix of volume/intensity days)"

                blocks.append(
                    PeriodizationBlock(
                        block_number=block_num,
                        block_type=block_type,
                        start_week=current_week,
                        duration_weeks=1,
                        volume_intensity=self.BLOCK_TARGETS[block_type],
                        focus=focus,
                        notes="Vary volume/intensity daily within week" if block_type != BlockType.DELOAD else None,
                    )
                )

                current_week += 1
                block_num += 1

        return blocks

    def get_week_targets(
        self,
        week_number: int,
        blocks: list[PeriodizationBlock],
    ) -> VolumeIntensityTarget:
        """
        Get volume/intensity targets for a specific week.

        Args:
            week_number: Week number (1-indexed)
            blocks: List of periodization blocks

        Returns:
            Volume and intensity targets for the week
        """
        for block in blocks:
            if block.start_week <= week_number <= block.end_week:
                return block.volume_intensity

        # Fallback to accumulation if not found
        return self.BLOCK_TARGETS[BlockType.ACCUMULATION]

    def apply_wave_loading(
        self,
        week_number: int,
        block: PeriodizationBlock,
        wave_length: int = 3,
    ) -> VolumeIntensityTarget:
        """
        Apply wave loading within a block.

        Wave loading: Gradual increase in intensity with periodic drops.
        Example: Week 1: 70%, Week 2: 75%, Week 3: 80%, Week 4: 72%, etc.

        Args:
            week_number: Current week
            block: Current block
            wave_length: Length of wave cycle (typically 3)

        Returns:
            Adjusted volume/intensity targets
        """
        week_in_block = week_number - block.start_week
        wave_position = week_in_block % wave_length

        base_targets = block.volume_intensity

        # Wave multipliers
        if wave_position == 0:
            # First week of wave: baseline
            intensity_mult = 1.0
            volume_mult = 1.0
        elif wave_position == 1:
            # Second week: increase intensity, decrease volume slightly
            intensity_mult = 1.05
            volume_mult = 0.95
        else:
            # Third week: peak intensity, lower volume
            intensity_mult = 1.10
            volume_mult = 0.85

        return VolumeIntensityTarget(
            sets_per_exercise=base_targets.sets_per_exercise,
            reps_per_set=base_targets.reps_per_set,
            intensity_percent_1rm=(
                int(base_targets.intensity_percent_1rm[0] * intensity_mult),
                int(base_targets.intensity_percent_1rm[1] * intensity_mult),
            ),
            rpe_target=(
                round(base_targets.rpe_target[0] * intensity_mult, 1),
                round(min(base_targets.rpe_target[1] * intensity_mult, 10.0), 1),
            ),
        )


# Global periodizer instance
_periodizer: Optional[Periodizer] = None


def get_periodizer() -> Periodizer:
    """Get or create global periodizer"""
    global _periodizer
    if _periodizer is None:
        _periodizer = Periodizer()
    return _periodizer
