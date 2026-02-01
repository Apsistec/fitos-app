/**
 * SEO Dashboard Page
 * Main dashboard for local SEO automation and tracking
 * Sprint 42: Local SEO Automation
 */

import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  ModalController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { SeoService } from '../../services/seo.service';

interface SEOStats {
  googleBusinessProfile: {
    connected: boolean;
    verified: boolean;
    views: number;
    searches: number;
    actions: number;
  };
  keywords: {
    total: number;
    topTen: number;
    topThree: number;
    avgRank: number;
    improving: number;
    declining: number;
  };
  reviews: {
    total: number;
    avgRating: number;
    pending: number;
    responseRate: number;
  };
  napConsistency: {
    score: number;
    issues: number;
    platforms: number;
  };
  schemaOrg: {
    implemented: boolean;
    types: string[];
    validated: boolean;
  };
}

interface RecentActivity {
  id: string;
  type: 'review' | 'ranking' | 'profile' | 'nap';
  title: string;
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-seo-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './seo-dashboard.page.html',
  styleUrls: ['./seo-dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoDashboardPage implements OnInit {
  loading = signal(true);
  stats = signal<SEOStats | null>(null);
  activities = signal<RecentActivity[]>([]);
  selectedTimeRange = signal<'7d' | '30d' | '90d'>('30d');

  // Computed values
  gbpConnected = computed(() => this.stats()?.googleBusinessProfile.connected || false);
  overallScore = computed(() => {
    const s = this.stats();
    if (!s) return 0;

    let score = 0;
    let maxScore = 0;

    // GBP Connection (25 points)
    maxScore += 25;
    if (s.googleBusinessProfile.connected) score += 15;
    if (s.googleBusinessProfile.verified) score += 10;

    // Keywords (25 points)
    maxScore += 25;
    if (s.keywords.total > 0) {
      score += Math.min(25, (s.keywords.topTen / s.keywords.total) * 25);
    }

    // Reviews (25 points)
    maxScore += 25;
    if (s.reviews.total > 0) {
      score += (s.reviews.avgRating / 5) * 15;
      score += (s.reviews.responseRate / 100) * 10;
    }

    // NAP Consistency (25 points)
    maxScore += 25;
    score += (s.napConsistency.score / 100) * 25;

    return Math.round((score / maxScore) * 100);
  });

  scoreColor = computed(() => {
    const score = this.overallScore();
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  });

  constructor(
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private seoService: SeoService
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    try {
      this.loading.set(true);
      const [stats, activities] = await Promise.all([
        this.seoService.getDashboardStats(this.selectedTimeRange()),
        this.seoService.getRecentActivity(10),
      ]);

      this.stats.set(stats);
      this.activities.set(activities);
    } catch (error) {
      console.error('Error loading SEO dashboard:', error);
      await this.showToast('Failed to load dashboard', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: any) {
    await this.loadDashboard();
    event.target.complete();
  }

  async changeTimeRange(range: '7d' | '30d' | '90d') {
    this.selectedTimeRange.set(range);
    await this.loadDashboard();
  }

  // Navigation methods
  navigateToGoogleBusiness() {
    this.router.navigate(['/seo/google-business']);
  }

  navigateToKeywords() {
    this.router.navigate(['/seo/keywords']);
  }

  navigateToReviews() {
    this.router.navigate(['/seo/reviews']);
  }

  navigateToNAP() {
    this.router.navigate(['/seo/nap-consistency']);
  }

  navigateToSchema() {
    this.router.navigate(['/seo/schema']);
  }

  // Google Business Profile actions
  async connectGoogleBusiness() {
    try {
      await this.seoService.initiateGoogleOAuth();
      await this.showToast('Connecting to Google Business Profile...', 'primary');
    } catch (error) {
      console.error('Error connecting Google Business:', error);
      await this.showToast('Failed to connect', 'danger');
    }
  }

  // Activity helpers
  getActivityIcon(type: string): string {
    switch (type) {
      case 'review':
        return 'star-outline';
      case 'ranking':
        return 'trending-up-outline';
      case 'profile':
        return 'business-outline';
      case 'nap':
        return 'location-outline';
      default:
        return 'information-circle-outline';
    }
  }

  getActivityColor(status: string): string {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  }

  getTimeRangeLabel(range: string): string {
    switch (range) {
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '90d':
        return 'Last 90 Days';
      default:
        return 'Last 30 Days';
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  // Format numbers
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatPercentage(num: number): string {
    return num.toFixed(1) + '%';
  }
}
