/**
 * Reviews Management Page
 * Automated review requests and response management
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
import { SeoService } from '../../services/seo.service';

interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  source: 'google' | 'facebook' | 'yelp';
  createdAt: string;
  responded: boolean;
  response?: string;
}

interface ReviewRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  method: 'email' | 'sms';
  status: 'pending' | 'sent' | 'completed';
  sentAt?: string;
  completedAt?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  lastSession?: string;
  totalSessions: number;
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './reviews.page.html',
  styleUrls: ['./reviews.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsPage implements OnInit {
  loading = signal(true);
  reviews = signal<Review[]>([]);
  reviewRequests = signal<ReviewRequest[]>([]);
  clients = signal<Client[]>([]);
  selectedTab = signal<'reviews' | 'requests' | 'send'>('reviews');

  // Computed
  avgRating = computed(() => {
    const allReviews = this.reviews();
    if (allReviews.length === 0) return 0;
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / allReviews.length;
  });

  ratingDistribution = computed(() => {
    const reviews = this.reviews();
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      dist[r.rating as keyof typeof dist]++;
    });
    return dist;
  });

  unansweredReviews = computed(() =>
    this.reviews().filter(r => !r.responded)
  );

  pendingRequests = computed(() =>
    this.reviewRequests().filter(r => r.status === 'pending' || r.status === 'sent')
  );

  eligibleClients = computed(() =>
    this.clients().filter(c => c.totalSessions >= 5 && !c.lastSession)
  );

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private seoService: SeoService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading.set(true);
      const [reviews, requests, clients] = await Promise.all([
        this.seoService.getReviews(),
        this.getReviewRequests(),
        this.getEligibleClients(),
      ]);

      this.reviews.set(reviews);
      this.reviewRequests.set(requests);
      this.clients.set(clients);
    } catch (error) {
      console.error('Error loading reviews:', error);
      await this.showToast('Failed to load reviews', 'danger');
      // Use mock data
      this.loadMockData();
    } finally {
      this.loading.set(false);
    }
  }

  async getReviewRequests(): Promise<ReviewRequest[]> {
    // Mock implementation
    return [
      {
        id: '1',
        clientId: 'client-1',
        clientName: 'John Smith',
        clientEmail: 'john@example.com',
        method: 'email',
        status: 'sent',
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        clientId: 'client-2',
        clientName: 'Sarah Johnson',
        clientEmail: 'sarah@example.com',
        clientPhone: '555-1234',
        method: 'sms',
        status: 'completed',
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  async getEligibleClients(): Promise<Client[]> {
    // Mock implementation
    return [
      {
        id: 'client-3',
        name: 'Mike Williams',
        email: 'mike@example.com',
        phone: '555-5678',
        lastSession: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 12,
      },
      {
        id: 'client-4',
        name: 'Emma Davis',
        email: 'emma@example.com',
        totalSessions: 8,
      },
    ];
  }

  loadMockData() {
    this.reviews.set([
      {
        id: '1',
        clientName: 'Sarah M.',
        rating: 5,
        comment: 'Amazing trainer! Lost 20 lbs in 3 months.',
        source: 'google',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        responded: true,
        response: 'Thank you Sarah! So proud of your progress!',
      },
      {
        id: '2',
        clientName: 'John D.',
        rating: 5,
        comment: 'Best personal trainer in Chicago!',
        source: 'google',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        responded: false,
      },
      {
        id: '3',
        clientName: 'Lisa K.',
        rating: 4,
        comment: 'Great workouts, very professional.',
        source: 'facebook',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        responded: true,
      },
    ]);
  }

  async sendReviewRequest(client: Client, method: 'email' | 'sms') {
    const alert = await this.alertController.create({
      header: 'Send Review Request',
      message: `Send review request to ${client.name} via ${method}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Send',
          handler: async () => {
            try {
              await this.seoService.sendReviewRequest(client.id, method);
              await this.showToast('Review request sent!', 'success');
              await this.loadData();
            } catch (error) {
              console.error('Error sending review request:', error);
              await this.showToast('Failed to send request', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async respondToReview(review: Review) {
    const alert = await this.alertController.create({
      header: 'Respond to Review',
      inputs: [
        {
          name: 'response',
          type: 'textarea',
          placeholder: 'Write your response...',
          value: review.response || '',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Post Response',
          handler: async (data) => {
            if (!data.response || data.response.trim() === '') {
              await this.showToast('Please enter a response', 'warning');
              return false;
            }

            try {
              // Mock implementation
              review.response = data.response;
              review.responded = true;
              await this.showToast('Response posted successfully', 'success');
              return true;
            } catch (error) {
              console.error('Error posting response:', error);
              await this.showToast('Failed to post response', 'danger');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getStars(rating: number): string[] {
    return Array(5).fill('star').map((_, i) => i < rating ? 'star' : 'star-outline');
  }

  getSourceIcon(source: string): string {
    switch (source) {
      case 'google':
        return 'logo-google';
      case 'facebook':
        return 'logo-facebook';
      case 'yelp':
        return 'business-outline';
      default:
        return 'star-outline';
    }
  }

  getSourceColor(source: string): string {
    switch (source) {
      case 'google':
        return 'primary';
      case 'facebook':
        return 'primary';
      case 'yelp':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'sent':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getRatingBarWidth(rating: number): string {
    const total = this.reviews().length;
    const count = this.ratingDistribution()[rating as keyof ReturnType<typeof this.ratingDistribution>];
    return total > 0 ? `${(count / total) * 100}%` : '0%';
  }

  async refresh(event: any) {
    await this.loadData();
    event.target.complete();
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
}
