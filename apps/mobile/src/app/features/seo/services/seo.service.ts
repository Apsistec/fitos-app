/**
 * SEO Service
 * Manages local SEO automation and tracking
 * Sprint 42: Local SEO Automation
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SeoDashboardStats {
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

export interface SeoActivity {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  status: string;
}

export interface SeoKeyword {
  id: string;
  keyword: string;
  type: string;
  currentRank?: number;
  bestRank?: number;
  previousRank?: number;
  searchVolume?: number;
  competition?: string;
  url?: string;
  lastChecked?: string;
  rankHistory?: { date: string; rank: number }[];
}

export interface SeoReview {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  source: string;
  createdAt: string;
  responded: boolean;
  response?: string;
}

export interface NAPConsistencyReport {
  score: number;
  issues: number;
  platforms: number;
  details?: Record<string, unknown>;
}

export interface SchemaMarkup {
  implemented: boolean;
  types: string[];
  validated: boolean;
  markup?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private apiUrl = `${environment.supabaseUrl}/functions/v1`;

  constructor(private http: HttpClient) {}

  /**
   * Get SEO dashboard statistics
   */
  async getDashboardStats(timeRange: '7d' | '30d' | '90d'): Promise<SeoDashboardStats> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.apiUrl}/seo/dashboard`, {
          params: { time_range: timeRange },
        })
      );
      return response;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return mock data for development
      return this.getMockDashboardStats();
    }
  }

  /**
   * Get recent SEO activity
   */
  async getRecentActivity(limit = 10): Promise<SeoActivity[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<SeoActivity[]>(`${this.apiUrl}/seo/activity`, {
          params: { limit: limit.toString() },
        })
      );
      return response;
    } catch (error) {
      console.error('Error fetching activity:', error);
      return this.getMockActivity();
    }
  }

  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleOAuth(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ auth_url: string }>(`${this.apiUrl}/seo/google/auth`, {})
      );

      // Open OAuth URL in browser
      window.open(response.auth_url, '_system');
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      throw error;
    }
  }

  /**
   * Get Google Business Profile data
   */
  async getGoogleBusinessProfile(): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.apiUrl}/seo/google/profile`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching Google Business Profile:', error);
      throw error;
    }
  }

  /**
   * Update Google Business Profile
   */
  async updateGoogleBusinessProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.http.put(`${this.apiUrl}/seo/google/profile`, data)
      );
      return response;
    } catch (error) {
      console.error('Error updating Google Business Profile:', error);
      throw error;
    }
  }

  /**
   * Get keyword rankings
   */
  async getKeywords(): Promise<SeoKeyword[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<SeoKeyword[]>(`${this.apiUrl}/seo/keywords`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching keywords:', error);
      throw error;
    }
  }

  /**
   * Add keyword to track
   */
  async addKeyword(keyword: string, type: string): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/seo/keywords`, { keyword, type })
      );
      return response;
    } catch (error) {
      console.error('Error adding keyword:', error);
      throw error;
    }
  }

  /**
   * Update keyword ranking
   */
  async updateKeywordRanking(keywordId: string, rank: number, url?: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/seo/keywords/${keywordId}/ranking`, {
          rank,
          url,
        })
      );
    } catch (error) {
      console.error('Error updating keyword ranking:', error);
      throw error;
    }
  }

  /**
   * Get reviews
   */
  async getReviews(): Promise<SeoReview[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<SeoReview[]>(`${this.apiUrl}/seo/reviews`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Send review request
   */
  async sendReviewRequest(clientId: string, method: 'email' | 'sms'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/seo/reviews/request`, {
          client_id: clientId,
          method,
        })
      );
    } catch (error) {
      console.error('Error sending review request:', error);
      throw error;
    }
  }

  /**
   * Get NAP consistency report
   */
  async getNAPConsistency(): Promise<NAPConsistencyReport> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.apiUrl}/seo/nap-consistency`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching NAP consistency:', error);
      throw error;
    }
  }

  /**
   * Run NAP consistency check
   */
  async runNAPCheck(): Promise<NAPConsistencyReport> {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/seo/nap-consistency/check`, {})
      );
      return response;
    } catch (error) {
      console.error('Error running NAP check:', error);
      throw error;
    }
  }

  /**
   * Get Schema.org markup
   */
  async getSchemaMarkup(): Promise<SchemaMarkup> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.apiUrl}/seo/schema`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching schema markup:', error);
      throw error;
    }
  }

  /**
   * Generate Schema.org markup
   */
  async generateSchemaMarkup(type: string, data: Record<string, unknown>): Promise<SchemaMarkup> {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/seo/schema/generate`, {
          type,
          data,
        })
      );
      return response;
    } catch (error) {
      console.error('Error generating schema markup:', error);
      throw error;
    }
  }

  // Mock data for development
  private getMockDashboardStats(): SeoDashboardStats {
    return {
      googleBusinessProfile: {
        connected: true,
        verified: true,
        views: 1250,
        searches: 890,
        actions: 145,
      },
      keywords: {
        total: 25,
        topTen: 12,
        topThree: 5,
        avgRank: 8.3,
        improving: 8,
        declining: 3,
      },
      reviews: {
        total: 47,
        avgRating: 4.7,
        pending: 2,
        responseRate: 95.7,
      },
      napConsistency: {
        score: 92,
        issues: 2,
        platforms: 15,
      },
      schemaOrg: {
        implemented: true,
        types: ['LocalBusiness', 'Person', 'Service'],
        validated: true,
      },
    };
  }

  private getMockActivity(): SeoActivity[] {
    return [
      {
        id: '1',
        type: 'review',
        title: 'New 5-star review',
        message: 'Sarah M. left a review on Google',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'success',
      },
      {
        id: '2',
        type: 'ranking',
        title: 'Keyword improved',
        message: '"personal trainer chicago" moved from #12 to #8',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'success',
      },
      {
        id: '3',
        type: 'nap',
        title: 'NAP inconsistency detected',
        message: 'Phone number mismatch found on Yelp',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'warning',
      },
      {
        id: '4',
        type: 'profile',
        title: 'Profile updated',
        message: 'Google Business Profile hours updated',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'info',
      },
    ];
  }
}
