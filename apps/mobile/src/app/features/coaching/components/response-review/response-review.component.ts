import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TrainerMethodologyService, MethodologyResponseLog } from '../../../../core/services/trainer-methodology.service';

type FilterType = 'unapproved' | 'approved' | 'all';

@Component({
  selector: 'app-response-review',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './response-review.component.html',
  styleUrls: ['./response-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResponseReviewComponent implements OnInit {
  // State
  responses = signal<MethodologyResponseLog[]>([]);
  loading = signal<boolean>(true);
  filter = signal<FilterType>('unapproved');

  // Computed
  filteredResponses = computed(() => {
    const allResponses = this.responses();
    const filterValue = this.filter();

    if (filterValue === 'all') {
      return allResponses;
    } else if (filterValue === 'approved') {
      return allResponses.filter(r => r.trainer_approved === true);
    } else {
      return allResponses.filter(r => r.trainer_approved === null || r.trainer_approved === undefined);
    }
  });

  // Expansion state for response cards
  expandedResponses = signal<Set<string>>(new Set());

  // Review form state
  reviewingResponse = signal<string | null>(null);
  reviewRating = signal<number>(3);
  reviewFeedback = signal<string>('');

  constructor(
    private methodologyService: TrainerMethodologyService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadResponses();
  }

  async loadResponses() {
    this.loading.set(true);
    try {
      const responses = await this.methodologyService.getUnapprovedResponses();
      this.responses.set(responses);
    } catch (error) {
      console.error('Error loading responses:', error);
      await this.showToast('Failed to load responses', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(filter: FilterType) {
    this.filter.set(filter);
  }

  toggleExpanded(responseId: string) {
    const expanded = new Set(this.expandedResponses());
    if (expanded.has(responseId)) {
      expanded.delete(responseId);
    } else {
      expanded.add(responseId);
    }
    this.expandedResponses.set(expanded);
  }

  isExpanded(responseId: string): boolean {
    return this.expandedResponses().has(responseId);
  }

  startReview(responseId: string) {
    this.reviewingResponse.set(responseId);
    this.reviewRating.set(3);
    this.reviewFeedback.set('');
  }

  cancelReview() {
    this.reviewingResponse.set(null);
    this.reviewRating.set(3);
    this.reviewFeedback.set('');
  }

  async approveResponse(responseId: string, rating?: number, feedback?: string) {
    try {
      const success = await this.methodologyService.reviewResponse(
        responseId,
        true,
        rating,
        feedback
      );

      if (success) {
        await this.showToast('Response approved!', 'success');
        await this.loadResponses();
        this.cancelReview();
      } else {
        await this.showToast('Failed to approve response', 'danger');
      }
    } catch (error) {
      console.error('Error approving response:', error);
      await this.showToast('Failed to approve response', 'danger');
    }
  }

  async rejectResponse(responseId: string, feedback?: string) {
    try {
      const success = await this.methodologyService.reviewResponse(
        responseId,
        false,
        1,
        feedback
      );

      if (success) {
        await this.showToast('Response rejected', 'warning');
        await this.loadResponses();
        this.cancelReview();
      } else {
        await this.showToast('Failed to reject response', 'danger');
      }
    } catch (error) {
      console.error('Error rejecting response:', error);
      await this.showToast('Failed to reject response', 'danger');
    }
  }

  async submitReview(responseId: string, approved: boolean) {
    if (approved) {
      await this.approveResponse(
        responseId,
        this.reviewRating(),
        this.reviewFeedback() || undefined
      );
    } else {
      await this.rejectResponse(
        responseId,
        this.reviewFeedback() || undefined
      );
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  getContextSnippet(context: any[]): string {
    if (!context || context.length === 0) return 'No context used';

    const firstItem = context[0];
    if (firstItem.content) {
      return firstItem.content.substring(0, 100) + (firstItem.content.length > 100 ? '...' : '');
    }

    return `${context.length} context item(s)`;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
