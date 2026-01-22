import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonButton,
  IonIcon,
  IonChip,
  IonProgressBar,
  IonSpinner,
  IonBadge,
  IonInput,
  IonTextarea,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  trendingDownOutline,
  trophyOutline,
  checkmarkCircleOutline,
  timeOutline,
  calendarOutline,
  flashOutline,
  cameraOutline,
  eyeOutline,
} from 'ionicons/icons';

import {
  OutcomePricingService,
  ClientGoal,
  GoalProgress,
  Verification,
} from '../../services/outcome-pricing.service';

type ViewTab = 'overview' | 'history' | 'verify';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonList,
    IonText,
    IonButton,
    IonIcon,
    IonChip,
    IonProgressBar,
    IonSpinner,
    IonBadge,
    IonInput,
    IonTextarea,
    IonSegment,
    IonSegmentButton,
  ],
  templateUrl: './goal-detail.page.html',
  styleUrls: ['./goal-detail.page.scss'],
})
export class GoalDetailPage implements OnInit {
  goalId = signal<string | null>(null);
  goal = signal<ClientGoal | null>(null);
  goalProgress = signal<GoalProgress | null>(null);
  verifications = signal<Verification[]>([]);
  selectedTab = signal<ViewTab>('overview');

  isLoading = signal(true);
  error = signal<string | null>(null);

  // Manual verification form
  manualValue = signal<number | null>(null);
  verificationNotes = signal<string>('');
  isVerifying = signal(false);

  // Computed values
  progressPercent = computed(() => {
    const goal = this.goal();
    if (!goal) return 0;

    const start = parseFloat(goal.start_value.toString());
    const current = parseFloat(goal.current_value.toString());
    const target = parseFloat(goal.target_value.toString());

    return this.outcomePricingService.calculateProgressPercent(start, current, target);
  });

  nextMilestone = computed(() => {
    const progress = this.progressPercent();
    return this.outcomePricingService.getNextMilestone(progress);
  });

  daysRemaining = computed(() => {
    const goal = this.goal();
    if (!goal) return 0;

    const target = new Date(goal.target_date);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private outcomePricingService: OutcomePricingService
  ) {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      trophyOutline,
      checkmarkCircleOutline,
      timeOutline,
      calendarOutline,
      flashOutline,
      cameraOutline,
      eyeOutline,
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.goalId.set(id);
      this.loadGoalDetails(id);
    } else {
      this.error.set('No goal ID provided');
      this.isLoading.set(false);
    }
  }

  loadGoalDetails(goalId: string) {
    this.isLoading.set(true);
    this.error.set(null);

    // Load goal details
    this.outcomePricingService.getGoalDetails(goalId).subscribe({
      next: (goal) => {
        this.goal.set(goal);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading goal details:', err);
        this.error.set('Failed to load goal details');
        this.isLoading.set(false);
      },
    });

    // Load progress
    this.outcomePricingService.getGoalProgress(goalId).subscribe({
      next: (progress) => {
        this.goalProgress.set(progress);
      },
      error: (err) => {
        console.error('Error loading goal progress:', err);
      },
    });

    // Load verification history
    this.outcomePricingService.listVerifications(goalId).subscribe({
      next: (verifications) => {
        this.verifications.set(verifications);
      },
      error: (err) => {
        console.error('Error loading verifications:', err);
      },
    });
  }

  onTabChange(event: any) {
    this.selectedTab.set(event.detail.value as ViewTab);
  }

  submitVerification() {
    const goalId = this.goalId();
    const value = this.manualValue();

    if (!goalId || value === null) {
      alert('Please enter a value');
      return;
    }

    this.isVerifying.set(true);

    this.outcomePricingService.verifyGoalProgress(goalId, { manual_value: value }).subscribe({
      next: (verification) => {
        console.log('Verification submitted:', verification);

        // Refresh goal and verifications
        this.loadGoalDetails(goalId);

        // Reset form
        this.manualValue.set(null);
        this.verificationNotes.set('');
        this.isVerifying.set(false);

        // Switch to history tab
        this.selectedTab.set('history');
      },
      error: (err) => {
        console.error('Error verifying progress:', err);
        alert('Failed to verify progress. Please try again.');
        this.isVerifying.set(false);
      },
    });
  }

  getGoalTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      weight_loss: 'Weight Loss',
      strength_gain: 'Strength Gain',
      body_comp: 'Body Composition',
      consistency: 'Consistency',
      custom: 'Custom',
    };
    return labels[type] || type;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'primary',
      achieved: 'success',
      paused: 'warning',
      cancelled: 'danger',
    };
    return colors[status] || 'medium';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
