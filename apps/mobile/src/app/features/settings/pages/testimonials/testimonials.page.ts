/**
 * Sprint 68 — TestimonialsPage
 *
 * Trainer-facing: review/approve/reject testimonials.
 * Reviews with rating >= 4 are auto-queued by a DB trigger.
 *
 * Flow:
 *   Approved → trainer_reviews.is_public = true → appears on public profile
 *   Rejected → stays private; removed from queue
 *
 * Route: /tabs/settings/testimonials (trainerOrOwnerGuard)
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonBadge,
  IonSkeletonText,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  starOutline,
  star,
} from 'ionicons/icons';
import { NpsService, TestimonialQueueItem } from '../../../../core/services/nps.service';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonBadge,
    IonSkeletonText,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>
          Testimonials
          @if (pendingCount() > 0) {
            <ion-badge color="success" class="title-badge">{{ pendingCount() }}</ion-badge>
          }
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-body">

        <!-- ── Header context ────────────────────────────────────────────── -->
        <div class="context-card">
          <p class="context-text">
            High-rated client reviews (⭐ 4–5 stars) appear here for your approval.
            Approved testimonials are shown publicly on your FitOS profile page.
          </p>
        </div>

        <!-- ── Loading ───────────────────────────────────────────────────── -->
        @if (isLoading()) {
          <div class="skeleton-list">
            @for (_ of [1, 2, 3]; track $_) {
              <div class="skeleton-card">
                <ion-skeleton-text animated class="sk-stars"></ion-skeleton-text>
                <ion-skeleton-text animated class="sk-text"></ion-skeleton-text>
                <ion-skeleton-text animated class="sk-author"></ion-skeleton-text>
              </div>
            }
          </div>
        }

        <!-- ── Empty state ────────────────────────────────────────────────── -->
        @if (!isLoading() && queue().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">⭐</div>
            <h3>No pending testimonials</h3>
            <p>Great reviews (4–5 stars) will appear here as clients submit them.</p>
            <p class="empty-hint">Tip: After a great session, send a review request from the client detail page.</p>
          </div>
        }

        <!-- ── Testimonial queue ──────────────────────────────────────────── -->
        @if (!isLoading() && queue().length > 0) {
          <div class="queue-header">
            <span class="queue-count">{{ pendingCount() }} awaiting review</span>
          </div>

          <div class="queue-list">
            @for (item of queue(); track item.id) {
              <div class="testimonial-card">

                <!-- Stars -->
                <div class="stars-row">
                  @for (n of [1, 2, 3, 4, 5]; track n) {
                    <ion-icon
                      [name]="item.rating >= n ? 'star' : 'star-outline'"
                      [class.filled]="item.rating >= n"
                    ></ion-icon>
                  }
                  <span class="rating-num">{{ item.rating }}/5</span>
                </div>

                <!-- Review text -->
                @if (item.text) {
                  <blockquote class="review-text">"{{ item.text }}"</blockquote>
                } @else {
                  <p class="no-text-hint">No text — rating only</p>
                }

                <!-- Author + date -->
                <div class="review-meta">
                  <span class="reviewer-name">— {{ item.reviewer }}</span>
                  <span class="review-date">{{ item.created_at | date:'MMM d, yyyy' }}</span>
                </div>

                <!-- Actions -->
                <div class="action-row">
                  <ion-button
                    expand="block"
                    color="success"
                    (click)="approve(item)"
                    [disabled]="isActing(item.id)"
                    class="approve-btn"
                  >
                    <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                    Approve & Publish
                  </ion-button>
                  <ion-button
                    fill="outline"
                    color="medium"
                    (click)="reject(item)"
                    [disabled]="isActing(item.id)"
                    class="reject-btn"
                  >
                    <ion-icon name="close-circle-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>

              </div>
            }
          </div>
        }

        <div class="bottom-spacer"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .title-badge { margin-left: 8px; font-size: 11px; vertical-align: middle; }

    .page-body { padding: 12px 16px; }

    /* ── Context card ── */
    .context-card {
      background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);
      border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;
    }
    .context-text { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; line-height: 1.5; }

    /* ── Skeletons ── */
    .skeleton-list { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-card { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 16px; }
    .sk-stars  { height: 20px; width: 100px; margin-bottom: 10px; border-radius: 4px; }
    .sk-text   { height: 48px; margin-bottom: 10px; border-radius: 6px; }
    .sk-author { height: 14px; width: 60%; border-radius: 4px; }

    /* ── Empty ── */
    .empty-state {
      text-align: center; padding: 48px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .empty-icon { font-size: 52px; }
    .empty-state h3 { font-size: 18px; font-weight: 800; margin: 0; }
    .empty-state p  { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; max-width: 280px; }
    .empty-hint { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B) !important; }

    /* ── Queue ── */
    .queue-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .queue-count { font-size: 13px; font-weight: 700; color: var(--fitos-text-secondary, #A3A3A3); }

    .queue-list { display: flex; flex-direction: column; gap: 12px; }

    .testimonial-card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }

    /* Stars */
    .stars-row { display: flex; align-items: center; gap: 3px; }
    ion-icon { font-size: 18px; color: rgba(255,255,255,0.2); }
    ion-icon.filled { color: #F59E0B; }
    .rating-num { font-size: 12px; font-weight: 700; color: var(--fitos-text-secondary, #A3A3A3); margin-left: 4px; }

    /* Review text */
    .review-text {
      font-size: 15px; line-height: 1.6; color: #D1D5DB;
      font-style: italic; margin: 0; padding: 0;
      border-left: 3px solid rgba(16,185,129,0.3); padding-left: 12px;
    }
    .no-text-hint { font-size: 13px; color: var(--fitos-text-tertiary, #6B6B6B); margin: 0; font-style: italic; }

    /* Meta */
    .review-meta {
      display: flex; justify-content: space-between; align-items: center;
    }
    .reviewer-name { font-size: 13px; font-weight: 700; }
    .review-date   { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* Actions */
    .action-row { display: flex; gap: 8px; align-items: center; }
    .approve-btn { flex: 1; --border-radius: 10px; }
    .reject-btn  { --border-radius: 10px; }

    .bottom-spacer { height: 32px; }
  `],
})
export class TestimonialsPage implements OnInit {
  private npsService = inject(NpsService);
  private alertCtrl  = inject(AlertController);
  private toastCtrl  = inject(ToastController);

  queue      = signal<TestimonialQueueItem[]>([]);
  isLoading  = signal(true);
  actingIds  = signal<Set<string>>(new Set());

  pendingCount = computed(() => this.queue().length);

  constructor() {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, starOutline, star });
  }

  async ngOnInit(): Promise<void> {
    const items = await this.npsService.getTestimonialQueue();
    this.queue.set(items);
    this.isLoading.set(false);
  }

  isActing(id: string): boolean {
    return this.actingIds().has(id);
  }

  // ── Approve ─────────────────────────────────────────────────────────────────

  async approve(item: TestimonialQueueItem): Promise<void> {
    this.actingIds.update((s) => new Set([...s, item.id]));

    const ok = await this.npsService.approveTestimonial(item.id, item.review_id);
    this.queue.update((q) => q.filter((i) => i.id !== item.id));

    this.actingIds.update((s) => { const n = new Set(s); n.delete(item.id); return n; });

    const toast = await this.toastCtrl.create({
      message:  ok ? 'Testimonial approved! It\'s now on your public profile. 🎉' : 'Failed to approve.',
      duration: 2500,
      color:    ok ? 'success' : 'warning',
      position: 'top',
    });
    await toast.present();
  }

  // ── Reject ──────────────────────────────────────────────────────────────────

  async reject(item: TestimonialQueueItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header:  'Reject Testimonial?',
      message: 'This review will be kept private and removed from your approval queue.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          role: 'destructive',
          handler: async () => {
            this.actingIds.update((s) => new Set([...s, item.id]));
            await this.npsService.rejectTestimonial(item.id);
            this.queue.update((q) => q.filter((i) => i.id !== item.id));
            this.actingIds.update((s) => { const n = new Set(s); n.delete(item.id); return n; });
          },
        },
      ],
    });
    await alert.present();
  }
}
