import { Component, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  trophyOutline,
  peopleOutline,
  trendingUpOutline,
  checkmarkCircleOutline,
  createOutline,
  trashOutline,
  statsChartOutline,
} from 'ionicons/icons';

import { OutcomePricingService, PricingTier } from '../../services/outcome-pricing.service';

@Component({
  selector: 'app-tier-detail',
  standalone: true,
  imports: [
    CommonModule,
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
    IonGrid,
    IonRow,
    IonCol,
    IonSpinner,
    IonBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tier-detail.page.html',
  styleUrls: ['./tier-detail.page.scss'],
})
export class TierDetailPage implements OnInit {
  tierId = signal<string | null>(null);
  tier = signal<PricingTier | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Expose Object to template
  protected readonly Object = Object;

  // Performance metrics (mock data for now - would come from analytics API)
  metrics = computed(() => {
    if (!this.tier()) return null;

    return {
      totalClients: 12,
      activeGoals: 8,
      achievedGoals: 15,
      avgCompletionRate: 67.5,
      totalBonusRevenue: 3450.00,
      avgTimeToCompletion: 84, // days
    };
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private outcomePricingService: OutcomePricingService
  ) {
    addIcons({
      cashOutline,
      trophyOutline,
      peopleOutline,
      trendingUpOutline,
      checkmarkCircleOutline,
      createOutline,
      trashOutline,
      statsChartOutline,
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tierId.set(id);
      this.loadTierDetails(id);
    } else {
      this.error.set('No tier ID provided');
      this.isLoading.set(false);
    }
  }

  loadTierDetails(tierId: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.outcomePricingService.getPricingTier(tierId).subscribe({
      next: (tier) => {
        this.tier.set(tier);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading tier details:', err);
        this.error.set('Failed to load tier details');
        this.isLoading.set(false);
      },
    });
  }

  editTier() {
    if (this.tierId()) {
      this.router.navigate(['/outcome-pricing/tiers', this.tierId(), 'edit']);
    }
  }

  async deactivateTier() {
    if (!this.tierId()) return;

    const confirmed = confirm('Are you sure you want to deactivate this tier? Existing clients will not be affected.');
    if (!confirmed) return;

    this.outcomePricingService.deactivatePricingTier(this.tierId()!).subscribe({
      next: () => {
        this.router.navigate(['/outcome-pricing/tiers']);
      },
      error: (err) => {
        console.error('Error deactivating tier:', err);
        alert('Failed to deactivate tier. Please try again.');
      },
    });
  }

  viewClients() {
    // Navigate to clients page filtered by this tier
    this.router.navigate(['/clients'], {
      queryParams: { pricingTier: this.tierId() },
    });
  }

  formatCurrency(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  getVerificationMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      weight_loss: 'Weight Loss',
      strength_gain: 'Strength Gain',
      body_comp: 'Body Composition',
      consistency: 'Consistency',
      custom: 'Custom',
    };
    return labels[method] || method;
  }

  getVerificationMethodColor(method: string): string {
    const colors: Record<string, string> = {
      weight_loss: 'primary',
      strength_gain: 'success',
      body_comp: 'secondary',
      consistency: 'tertiary',
      custom: 'medium',
    };
    return colors[method] || 'medium';
  }
}
