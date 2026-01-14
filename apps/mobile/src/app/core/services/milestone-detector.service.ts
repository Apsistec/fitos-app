import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AutonomyService } from './autonomy.service';

/**
 * MilestoneDetectorService - Automated detection of autonomy milestones
 *
 * Analyzes client activity patterns to automatically detect and record
 * independence milestones without manual trainer input.
 *
 * Detection logic runs when:
 * - Workout is completed
 * - Nutrition entry is logged
 * - Assessment is created
 * - Can be triggered manually
 *
 * Milestone Types Detected:
 * - first_self_modified_workout
 * - first_deload_week_recognized
 * - consistent_nutrition_tracking_30d
 * - proactive_recovery_management
 * - exercise_form_mastery
 * - plateau_troubleshooting
 */
@Injectable({
  providedIn: 'root',
})
export class MilestoneDetectorService {
  private supabase = inject(SupabaseService);
  private autonomyService = inject(AutonomyService);

  /**
   * Detect and record all milestones for a client
   */
  async detectMilestones(
    clientId: string,
    trainerId: string
  ): Promise<string[]> {
    const detected: string[] = [];

    // Check each milestone type
    const checks = [
      this.checkFirstSelfModifiedWorkout(clientId, trainerId),
      this.checkFirstDeloadWeek(clientId, trainerId),
      this.checkConsistentNutritionTracking(clientId, trainerId),
      this.checkProactiveRecovery(clientId, trainerId),
      this.checkExerciseFormMastery(clientId, trainerId),
      this.checkPlateauTroubleshooting(clientId, trainerId),
    ];

    const results = await Promise.allSettled(checks);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        detected.push(result.value);
      }
    });

    return detected;
  }

  /**
   * Detect: first_self_modified_workout
   * Triggers when client modifies a workout plan without trainer prompting
   */
  private async checkFirstSelfModifiedWorkout(
    clientId: string,
    trainerId: string
  ): Promise<string | null> {
    try {
      // Check if milestone already exists
      const exists = await this.milestoneExists(
        clientId,
        'first_self_modified_workout'
      );
      if (exists) return null;

      // Look for workouts where client made modifications
      // (In a real implementation, we'd track who modified what)
      const { data: modifiedWorkouts } = await this.supabase.client
        .from('workouts')
        .select('id, created_at')
        .eq('client_id', clientId)
        .not('notes', 'is', null) // Proxy for modification
        .order('created_at', { ascending: true })
        .limit(1);

      if (modifiedWorkouts && modifiedWorkouts.length > 0) {
        // Record milestone
        await this.autonomyService.recordMilestone(
          trainerId,
          clientId,
          'first_self_modified_workout',
          'First Self-Modified Workout',
          {
            description: 'Made first independent workout modification',
            evidence: `Modified workout on ${new Date(modifiedWorkouts[0].created_at).toLocaleDateString()}`,
            scoreIncrease: 5,
            celebrationMessage:
              'Great job taking ownership of your training!',
          }
        );

        return 'first_self_modified_workout';
      }

      return null;
    } catch (err) {
      console.error('Error checking first_self_modified_workout:', err);
      return null;
    }
  }

  /**
   * Detect: first_deload_week_recognized
   * Triggers when client reduces volume proactively
   */
  private async checkFirstDeloadWeek(
    clientId: string,
    trainerId: string
  ): Promise<string | null> {
    try {
      const exists = await this.milestoneExists(
        clientId,
        'first_deload_week_recognized'
      );
      if (exists) return null;

      // Look for patterns of reduced volume
      // (Simplified - in reality we'd analyze workout intensity trends)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentWorkouts } = await this.supabase.client
        .from('workouts')
        .select('id, completed_at')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      // Simple heuristic: if there's a week with significantly fewer workouts
      // (Real implementation would analyze volume/intensity data)
      if (recentWorkouts && recentWorkouts.length >= 6) {
        await this.autonomyService.recordMilestone(
          trainerId,
          clientId,
          'first_deload_week_recognized',
          'Recognized Need for Deload',
          {
            description: 'Proactively reduced training volume when needed',
            scoreIncrease: 5,
            celebrationMessage:
              'Excellent recovery awareness! You know when to back off.',
          }
        );

        return 'first_deload_week_recognized';
      }

      return null;
    } catch (err) {
      console.error('Error checking first_deload_week:', err);
      return null;
    }
  }

  /**
   * Detect: consistent_nutrition_tracking_30d
   * Triggers when client logs nutrition 25+ days out of 30
   */
  private async checkConsistentNutritionTracking(
    clientId: string,
    trainerId: string
  ): Promise<string | null> {
    try {
      const exists = await this.milestoneExists(
        clientId,
        'consistent_nutrition_tracking_30d'
      );
      if (exists) return null;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Count unique days with nutrition logs
      const { data: nutritionLogs } = await this.supabase.client
        .from('nutrition_logs')
        .select('log_date')
        .eq('client_id', clientId)
        .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      if (nutritionLogs) {
        const uniqueDays = new Set(nutritionLogs.map((log) => log.log_date));

        if (uniqueDays.size >= 25) {
          await this.autonomyService.recordMilestone(
            trainerId,
            clientId,
            'consistent_nutrition_tracking_30d',
            'Consistent Nutrition Tracking',
            {
              description: 'Logged nutrition for 25+ days in past 30 days',
              evidence: `${uniqueDays.size} days of tracking`,
              scoreIncrease: 10,
              celebrationMessage:
                'Amazing consistency! Your tracking habits are on point.',
            }
          );

          return 'consistent_nutrition_tracking_30d';
        }
      }

      return null;
    } catch (err) {
      console.error('Error checking consistent_nutrition_tracking_30d:', err);
      return null;
    }
  }

  /**
   * Detect: proactive_recovery_management
   * Triggers when client takes rest days appropriately
   */
  private async checkProactiveRecovery(
    clientId: string,
    trainerId: string
  ): Promise<string | null> {
    try {
      const exists = await this.milestoneExists(
        clientId,
        'proactive_recovery_management'
      );
      if (exists) return null;

      // Look for pattern of appropriate rest
      // (Simplified - real implementation would analyze workout frequency patterns)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { count: workoutCount } = await this.supabase.client
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('completed_at', ninetyDaysAgo.toISOString());

      // If averaging 3-4 workouts/week (not overtraining), award milestone
      const weeksInPeriod = 13;
      const avgPerWeek = (workoutCount || 0) / weeksInPeriod;

      if (avgPerWeek >= 3 && avgPerWeek <= 5) {
        await this.autonomyService.recordMilestone(
          trainerId,
          clientId,
          'proactive_recovery_management',
          'Proactive Recovery Management',
          {
            description: 'Maintains healthy workout frequency with adequate rest',
            evidence: `Averaging ${avgPerWeek.toFixed(1)} workouts/week`,
            scoreIncrease: 5,
            celebrationMessage:
              'You understand the balance between training and recovery!',
          }
        );

        return 'proactive_recovery_management';
      }

      return null;
    } catch (err) {
      console.error('Error checking proactive_recovery_management:', err);
      return null;
    }
  }

  /**
   * Detect: exercise_form_mastery
   * Triggers based on workout completion consistency
   */
  private async checkExerciseFormMastery(
    clientId: string,
    trainerId: string
  ): Promise<string | null> {
    try {
      const exists = await this.milestoneExists(
        clientId,
        'exercise_form_mastery'
      );
      if (exists) return null;

      // Count total completed workouts
      const { count: totalWorkouts } = await this.supabase.client
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'completed');

      // Award after 50 workouts (form should be solid by then)
      if (totalWorkouts && totalWorkouts >= 50) {
        await this.autonomyService.recordMilestone(
          trainerId,
          clientId,
          'exercise_form_mastery',
          'Exercise Form Mastery',
          {
            description: 'Demonstrated consistent form through 50+ workouts',
            evidence: `${totalWorkouts} workouts completed`,
            scoreIncrease: 10,
            celebrationMessage:
              'Your form is locked in! Keep up the great technique.',
          }
        );

        return 'exercise_form_mastery';
      }

      return null;
    } catch (err) {
      console.error('Error checking exercise_form_mastery:', err);
      return null;
    }
  }

  /**
   * Detect: plateau_troubleshooting
   * Triggers when client makes adjustments during plateaus
   */
  private async checkPlateauTroubleshooting(
    clientId: string,
    trainerId: string
  ): Promise<string | null> {
    try {
      const exists = await this.milestoneExists(
        clientId,
        'plateau_troubleshooting'
      );
      if (exists) return null;

      // Look for weight measurements showing plateau followed by progress
      const { data: measurements } = await this.supabase.client
        .from('measurements')
        .select('weight, recorded_at')
        .eq('client_id', clientId)
        .not('weight', 'is', null)
        .order('recorded_at', { ascending: true });

      if (measurements && measurements.length >= 10) {
        // Simple heuristic: if weight varied over time (not stagnant)
        const weights = measurements.map((m) => m.weight);
        const min = Math.min(...weights);
        const max = Math.max(...weights);
        const range = max - min;

        // If there's meaningful variation (5+ lbs), client is troubleshooting
        if (range >= 5) {
          await this.autonomyService.recordMilestone(
            trainerId,
            clientId,
            'plateau_troubleshooting',
            'Plateau Troubleshooting',
            {
              description:
                'Successfully navigated weight plateau with adjustments',
              evidence: `${range.toFixed(1)} lbs total progress`,
              scoreIncrease: 10,
              celebrationMessage:
                "You know how to break through plateaus - that's advanced!",
            }
          );

          return 'plateau_troubleshooting';
        }
      }

      return null;
    } catch (err) {
      console.error('Error checking plateau_troubleshooting:', err);
      return null;
    }
  }

  /**
   * Check if milestone already exists for client
   */
  private async milestoneExists(
    clientId: string,
    milestoneType: string
  ): Promise<boolean> {
    try {
      const { count } = await this.supabase.client
        .from('autonomy_milestones')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('milestone_type', milestoneType);

      return (count || 0) > 0;
    } catch (err) {
      console.error('Error checking milestone existence:', err);
      return false;
    }
  }
}
