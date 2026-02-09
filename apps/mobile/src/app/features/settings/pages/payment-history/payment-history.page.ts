import {  Component, OnInit, inject, signal, computed , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonButton,
  IonSegment,
  IonSegmentButton,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  downloadOutline,
  checkmarkCircle,
  timeOutline,
  closeCircle,
  receiptOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: number;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
  receipt_url?: string;
  period_start?: number;
  period_end?: number;
}

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.page.html',
  styleUrls: ['./payment-history.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonButton,
    IonSegment,
    IonSegmentButton,
  ],
})
export class PaymentHistoryPage implements OnInit {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  payments = signal<Payment[]>([]);
  isLoading = signal(false);
  hasMore = signal(false);
  error = signal<string | null>(null);
  filterStatus = signal<string>('all');

  isTrainer = computed(() => this.authService.isTrainer() || this.authService.isOwner());

  filteredPayments = computed(() => {
    const status = this.filterStatus();
    if (status === 'all') {
      return this.payments();
    }
    return this.payments().filter(p => p.status === status);
  });

  totalRevenue = computed(() => {
    return this.payments()
      .filter(p => p.status === 'succeeded' || p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  });

  constructor() {
    addIcons({
      cardOutline,
      downloadOutline,
      checkmarkCircle,
      timeOutline,
      closeCircle,
      receiptOutline,
    });
  }

  async ngOnInit() {
    await this.loadPayments();
  }

  async loadPayments() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'stripe-get-payments',
        {
          body: { limit: 50 }
        }
      );

      if (error) throw error;

      this.payments.set(data.payments || []);
      this.hasMore.set(data.has_more || false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment history';
      this.error.set(message);
      console.error('Error loading payments:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadPayments();
    event.target.complete();
  }

  onFilterChange(value: string | number | undefined): void {
    const statusValue = value?.toString() || 'all';
    this.filterStatus.set(statusValue);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'refunded':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'checkmark-circle';
      case 'pending':
      case 'processing':
        return 'time-outline';
      case 'failed':
      case 'refunded':
        return 'close-circle';
      default:
        return 'receipt-outline';
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  openInvoice(payment: Payment) {
    if (payment.hosted_invoice_url) {
      window.open(payment.hosted_invoice_url, '_blank');
    } else if (payment.receipt_url) {
      window.open(payment.receipt_url, '_blank');
    }
  }

  downloadInvoice(payment: Payment) {
    if (payment.invoice_pdf) {
      window.open(payment.invoice_pdf, '_blank');
    }
  }
}
