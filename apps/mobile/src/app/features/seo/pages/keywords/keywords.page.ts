/**
 * Keyword Rankings Page
 * Track and manage local SEO keywords
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

interface Keyword {
  id: string;
  keyword: string;
  type: 'primary' | 'secondary' | 'long_tail' | 'local';
  currentRank?: number;
  bestRank?: number;
  previousRank?: number;
  searchVolume?: number;
  competition?: 'low' | 'medium' | 'high';
  url?: string;
  lastChecked?: string;
  rankHistory?: { date: string; rank: number }[];
}

@Component({
  selector: 'app-keywords',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './keywords.page.html',
  styleUrls: ['./keywords.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeywordsPage implements OnInit {
  loading = signal(true);
  keywords = signal<Keyword[]>([]);
  selectedType = signal<'all' | 'primary' | 'secondary' | 'long_tail' | 'local'>('all');

  // Computed
  filteredKeywords = computed(() => {
    const type = this.selectedType();
    if (type === 'all') return this.keywords();
    return this.keywords().filter(k => k.type === type);
  });

  topThree = computed(() =>
    this.keywords().filter(k => k.currentRank && k.currentRank <= 3)
  );

  topTen = computed(() =>
    this.keywords().filter(k => k.currentRank && k.currentRank <= 10)
  );

  improving = computed(() =>
    this.keywords().filter(k =>
      k.currentRank && k.previousRank && k.currentRank < k.previousRank
    )
  );

  declining = computed(() =>
    this.keywords().filter(k =>
      k.currentRank && k.previousRank && k.currentRank > k.previousRank
    )
  );

  avgRank = computed(() => {
    const ranked = this.keywords().filter(k => k.currentRank);
    if (ranked.length === 0) return 0;
    const sum = ranked.reduce((acc, k) => acc + (k.currentRank || 0), 0);
    return sum / ranked.length;
  });

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private seoService: SeoService
  ) {}

  async ngOnInit() {
    await this.loadKeywords();
  }

  async loadKeywords() {
    try {
      this.loading.set(true);
      const keywords = await this.seoService.getKeywords();
      this.keywords.set(keywords);
    } catch (error) {
      console.error('Error loading keywords:', error);
      // Load mock data
      this.loadMockData();
    } finally {
      this.loading.set(false);
    }
  }

  loadMockData() {
    this.keywords.set([
      {
        id: '1',
        keyword: 'personal trainer chicago',
        type: 'primary',
        currentRank: 8,
        bestRank: 5,
        previousRank: 12,
        searchVolume: 1200,
        competition: 'high',
        url: 'https://example.com/training',
        lastChecked: new Date().toISOString(),
      },
      {
        id: '2',
        keyword: 'fitness coach near me',
        type: 'local',
        currentRank: 3,
        bestRank: 3,
        previousRank: 4,
        searchVolume: 890,
        competition: 'medium',
        url: 'https://example.com',
        lastChecked: new Date().toISOString(),
      },
      {
        id: '3',
        keyword: 'weight loss trainer chicago',
        type: 'secondary',
        currentRank: 15,
        bestRank: 12,
        previousRank: 14,
        searchVolume: 450,
        competition: 'medium',
        lastChecked: new Date().toISOString(),
      },
      {
        id: '4',
        keyword: 'best personal trainer in chicago for weight loss',
        type: 'long_tail',
        currentRank: 6,
        bestRank: 4,
        previousRank: 8,
        searchVolume: 120,
        competition: 'low',
        lastChecked: new Date().toISOString(),
      },
    ]);
  }

  async addKeyword() {
    const alert = await this.alertController.create({
      header: 'Add Keyword',
      inputs: [
        {
          name: 'keyword',
          type: 'text',
          placeholder: 'Enter keyword phrase...',
        },
        {
          name: 'type',
          type: 'text',
          placeholder: 'Type (primary, secondary, local, long_tail)',
          value: 'primary',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.keyword || data.keyword.trim() === '') {
              await this.showToast('Please enter a keyword', 'warning');
              return false;
            }

            try {
              await this.seoService.addKeyword(data.keyword.trim(), data.type);
              await this.showToast('Keyword added successfully', 'success');
              await this.loadKeywords();
              return true;
            } catch (error) {
              console.error('Error adding keyword:', error);
              await this.showToast('Failed to add keyword', 'danger');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getRankTrend(keyword: Keyword): 'up' | 'down' | 'stable' | 'none' {
    if (!keyword.currentRank || !keyword.previousRank) return 'none';
    if (keyword.currentRank < keyword.previousRank) return 'up';
    if (keyword.currentRank > keyword.previousRank) return 'down';
    return 'stable';
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'stable':
        return 'remove-outline';
      default:
        return 'help-outline';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'danger';
      case 'stable':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getRankColor(rank?: number): string {
    if (!rank) return 'medium';
    if (rank <= 3) return 'success';
    if (rank <= 10) return 'warning';
    return 'medium';
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'primary':
        return 'Primary';
      case 'secondary':
        return 'Secondary';
      case 'long_tail':
        return 'Long-tail';
      case 'local':
        return 'Local';
      default:
        return type;
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'primary':
        return 'primary';
      case 'secondary':
        return 'secondary';
      case 'long_tail':
        return 'tertiary';
      case 'local':
        return 'success';
      default:
        return 'medium';
    }
  }

  getCompetitionColor(competition?: string): string {
    switch (competition) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
      default:
        return 'medium';
    }
  }

  async refresh(event: any) {
    await this.loadKeywords();
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
