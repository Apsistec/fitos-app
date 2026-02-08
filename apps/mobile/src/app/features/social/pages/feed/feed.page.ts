import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonAvatar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonFab,
  IonFabButton,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heartOutline,
  heart,
  chatbubbleOutline,
  shareOutline,
  trophyOutline,
  barbellOutline,
  ribbonOutline,
  flameOutline,
  addOutline,
  timeOutline,
  thumbsUpOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

interface FeedPost {
  id: string;
  user_id: string;
  post_type: 'achievement' | 'pr' | 'workout' | 'milestone' | 'challenge' | 'general';
  content: string | null;
  metadata: Record<string, any>;
  like_count: number;
  comment_count: number;
  is_public: boolean;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
  isLiked?: boolean;
}

type FeedFilter = 'all' | 'following' | 'achievements';

@Component({
  selector: 'app-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonAvatar,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonFab,
    IonFabButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Community</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [(ngModel)]="feedFilter" (ionChange)="onFilterChange()">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="following">
            <ion-label>Following</ion-label>
          </ion-segment-button>
          <ion-segment-button value="achievements">
            <ion-label>Achievements</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading feed...</p>
        </div>
      } @else if (posts().length === 0) {
        <div class="empty-state">
          <ion-icon name="trophy-outline"></ion-icon>
          <h3>No posts yet</h3>
          <p>Share your first achievement or follow others to see their updates!</p>
          <ion-button size="small" (click)="createPost()">
            <ion-icon slot="start" name="add-outline"></ion-icon>
            Share Something
          </ion-button>
        </div>
      } @else {
        <div class="feed-list">
          @for (post of posts(); track post.id) {
            <div class="feed-card">
              <!-- Post Header -->
              <div class="post-header">
                <ion-avatar class="post-avatar">
                  @if (post.user?.avatar_url) {
                    <img [src]="post.user.avatar_url" alt="Avatar" />
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(post.user?.full_name || 'U') }}
                    </div>
                  }
                </ion-avatar>
                <div class="post-info">
                  <span class="post-author">{{ post.user?.full_name || 'Anonymous' }}</span>
                  <span class="post-time">{{ formatTime(post.created_at) }}</span>
                </div>
                <ion-badge [color]="getPostTypeColor(post.post_type)">
                  <ion-icon [name]="getPostTypeIcon(post.post_type)"></ion-icon>
                  {{ getPostTypeLabel(post.post_type) }}
                </ion-badge>
              </div>

              <!-- Post Content -->
              <div class="post-content">
                @if (post.metadata?.['title']) {
                  <h4 class="post-title">{{ post.metadata['title'] }}</h4>
                }
                @if (post.content) {
                  <p>{{ post.content }}</p>
                }
                @if (post.metadata?.['value']) {
                  <div class="post-metric">
                    <span class="metric-value">{{ post.metadata['value'] }}</span>
                    @if (post.metadata?.['unit']) {
                      <span class="metric-unit">{{ post.metadata['unit'] }}</span>
                    }
                  </div>
                }
              </div>

              <!-- Post Actions -->
              <div class="post-actions">
                <ion-button fill="clear" size="small" (click)="toggleLike(post)">
                  <ion-icon slot="start" [name]="post.isLiked ? 'heart' : 'heart-outline'"
                    [style.color]="post.isLiked ? '#EF4444' : ''"></ion-icon>
                  {{ post.like_count || '' }}
                </ion-button>
                <ion-button fill="clear" size="small" (click)="viewComments(post)">
                  <ion-icon slot="start" name="chatbubble-outline"></ion-icon>
                  {{ post.comment_count || '' }}
                </ion-button>
                <ion-button fill="clear" size="small" (click)="sharePost(post)">
                  <ion-icon slot="start" name="share-outline"></ion-icon>
                </ion-button>
              </div>
            </div>
          }
        </div>
      }

      <!-- FAB for creating posts -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button (click)="createPost()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 12px;

      ion-spinner { --color: var(--ion-color-primary, #10B981); }
      p { margin: 0; font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;
      text-align: center;

      ion-icon { font-size: 64px; color: var(--fitos-text-tertiary, #737373); margin-bottom: 16px; }
      h3 { margin: 0 0 8px; color: var(--fitos-text-primary, #F5F5F5); font-size: 18px; }
      p { margin: 0 0 16px; color: var(--fitos-text-secondary, #A3A3A3); font-size: 14px; }
    }

    .feed-list {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feed-card {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .post-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .post-avatar {
      width: 40px;
      height: 40px;
      --border-radius: 50%;
    }

    .avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--ion-color-primary, #10B981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: white;
    }

    .post-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .post-author {
      font-weight: 600;
      font-size: 14px;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .post-time {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .post-content {
      margin-bottom: 12px;

      .post-title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
        line-height: 1.5;
      }
    }

    .post-metric {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 8px;
      padding: 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;

      .metric-value {
        font-family: 'Space Mono', monospace;
        font-size: 28px;
        font-weight: 700;
        color: var(--fitos-accent-primary, #10B981);
      }

      .metric-unit {
        font-size: 14px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .post-actions {
      display: flex;
      gap: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 8px;
      margin-top: 4px;

      ion-button {
        --color: var(--fitos-text-tertiary, #737373);
        font-size: 13px;
      }
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary, #262626);
    }
  `],
})
export class FeedPage implements OnInit {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  posts = signal<FeedPost[]>([]);
  loading = signal(false);
  feedFilter = signal<FeedFilter>('all');

  constructor() {
    addIcons({
      heartOutline, heart, chatbubbleOutline, shareOutline,
      trophyOutline, barbellOutline, ribbonOutline, flameOutline,
      addOutline, timeOutline, thumbsUpOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFeed();
  }

  async loadFeed(): Promise<void> {
    this.loading.set(true);
    try {
      const userId = this.auth.user()?.id;
      let query = this.supabase.client
        .from('social_posts')
        .select(`
          *,
          user:user_id (full_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      const filter = this.feedFilter();

      if (filter === 'following' && userId) {
        // Get followed user IDs first
        const { data: follows } = await this.supabase.client
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId);

        const followedIds = (follows || []).map((f: any) => f.following_id);
        if (followedIds.length > 0) {
          query = query.in('user_id', followedIds);
        } else {
          this.posts.set([]);
          return;
        }
      } else if (filter === 'achievements') {
        query = query.in('post_type', ['achievement', 'pr', 'milestone']);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check which posts the user has liked
      let likedPostIds: Set<string> = new Set();
      if (userId && data && data.length > 0) {
        const { data: likes } = await this.supabase.client
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', data.map((p: any) => p.id));

        likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
      }

      this.posts.set((data || []).map((post: any) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      })));
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleLike(post: FeedPost): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    try {
      if (post.isLiked) {
        await this.supabase.client
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', userId);

        this.posts.update(posts => posts.map(p =>
          p.id === post.id ? { ...p, isLiked: false, like_count: Math.max(0, p.like_count - 1) } : p
        ));
      } else {
        await this.supabase.client
          .from('post_likes')
          .insert({ post_id: post.id, user_id: userId });

        this.posts.update(posts => posts.map(p =>
          p.id === post.id ? { ...p, isLiked: true, like_count: p.like_count + 1 } : p
        ));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }

  async viewComments(post: FeedPost): Promise<void> {
    const { data: comments } = await this.supabase.client
      .from('post_comments')
      .select(`*, user:user_id (full_name)`)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    const commentLines = (comments || [])
      .map((c: any) => `${c.user?.full_name || 'User'}: ${c.content}`)
      .join('\n') || 'No comments yet.';

    const alert = await this.alertCtrl.create({
      header: 'Comments',
      message: commentLines,
      inputs: [{
        name: 'comment',
        type: 'text',
        placeholder: 'Add a comment...',
      }],
      buttons: [
        { text: 'Close', role: 'cancel' },
        {
          text: 'Post',
          handler: async (data) => {
            if (data.comment?.trim()) {
              const userId = this.auth.user()?.id;
              if (!userId) return;

              await this.supabase.client
                .from('post_comments')
                .insert({ post_id: post.id, user_id: userId, content: data.comment.trim() });

              this.posts.update(posts => posts.map(p =>
                p.id === post.id ? { ...p, comment_count: p.comment_count + 1 } : p
              ));

              const toast = await this.toastCtrl.create({
                message: 'Comment posted!',
                duration: 1500,
                color: 'success',
                position: 'bottom',
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async createPost(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Share with Community',
      inputs: [
        {
          name: 'content',
          type: 'textarea',
          placeholder: 'Share an achievement, PR, or motivation...',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Share',
          handler: async (data) => {
            if (!data.content?.trim()) return;

            const userId = this.auth.user()?.id;
            if (!userId) return;

            try {
              await this.supabase.client
                .from('social_posts')
                .insert({
                  user_id: userId,
                  post_type: 'general',
                  content: data.content.trim(),
                  is_public: true,
                });

              await this.loadFeed();

              const toast = await this.toastCtrl.create({
                message: 'Posted to community!',
                duration: 1500,
                color: 'success',
                position: 'bottom',
              });
              await toast.present();
            } catch (err) {
              console.error('Error creating post:', err);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async sharePost(post: FeedPost): Promise<void> {
    try {
      const text = `${post.user?.full_name || 'Someone'} on FitOS: ${post.content || post.metadata?.['title'] || 'Check this out!'}`;
      if (navigator.share) {
        await navigator.share({ text, title: 'FitOS' });
      } else {
        await navigator.clipboard.writeText(text);
        const toast = await this.toastCtrl.create({
          message: 'Copied to clipboard!',
          duration: 1500,
          position: 'bottom',
        });
        await toast.present();
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }

  onFilterChange(): void {
    this.loadFeed();
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadFeed();
    (event.target as HTMLIonRefresherElement).complete();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  getPostTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      achievement: 'trophy-outline',
      pr: 'barbell-outline',
      workout: 'barbell-outline',
      milestone: 'ribbon-outline',
      challenge: 'flame-outline',
      general: 'chatbubble-outline',
    };
    return icons[type] || 'chatbubble-outline';
  }

  getPostTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      achievement: 'Achievement',
      pr: 'New PR',
      workout: 'Workout',
      milestone: 'Milestone',
      challenge: 'Challenge',
      general: 'Post',
    };
    return labels[type] || 'Post';
  }

  getPostTypeColor(type: string): string {
    const colors: Record<string, string> = {
      achievement: 'warning',
      pr: 'success',
      workout: 'primary',
      milestone: 'tertiary',
      challenge: 'danger',
      general: 'medium',
    };
    return colors[type] || 'medium';
  }
}
