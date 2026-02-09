/**
 * Royalty Dashboard Page
 *
 * Displays royalty payments across all locations:
 * - Payment list with status filtering
 * - Overdue payment alerts
 * - Payment detail view
 * - Export functionality
 *
 * Sprint 40: Multi-Location Management
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { FranchiseService } from '../../services/franchise.service';
import { RoyaltyPayment } from '../../models/franchise.models';

type PaymentStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'processing';

@Component({
  selector: 'app-royalty-dashboard',
  templateUrl: './royalty-dashboard.page.html',
  styleUrls: ['./royalty-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoyaltyDashboardPage implements OnInit, OnDestroy {
  private franchiseService = inject(FranchiseService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // State
  allPayments = signal<RoyaltyPayment[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedStatus = signal<PaymentStatus>('all');
  searchTerm = signal('');

  // Computed
  filteredPayments = computed(() => {
    let payments = this.allPayments();

    // Filter by status
    if (this.selectedStatus() !== 'all') {
      payments = payments.filter(p => p.paymentStatus === this.selectedStatus());
    }

    // Filter by search term
    const search = this.searchTerm().toLowerCase();
    if (search) {
      payments = payments.filter(p =>
        p.id.toLowerCase().includes(search) ||
        p.locationId.toLowerCase().includes(search)
      );
    }

    // Sort by due date (most recent first)
    return payments.sort((a, b) =>
      new Date(b.paymentDueDate).getTime() - new Date(a.paymentDueDate).getTime()
    );
  });

  // Summary metrics
  totalPayments = computed(() => this.allPayments().length);
  totalAmount = computed(() =>
    this.allPayments().reduce((sum, p) => sum + p.totalFees, 0)
  );
  pendingAmount = computed(() =>
    this.allPayments()
      .filter(p => p.paymentStatus === 'pending' || p.paymentStatus === 'processing')
      .reduce((sum, p) => sum + p.totalFees, 0)
  );
  overdueAmount = computed(() =>
    this.allPayments()
      .filter(p => p.paymentStatus === 'overdue')
      .reduce((sum, p) => sum + p.totalFees, 0)
  );
  paidAmount = computed(() =>
    this.allPayments()
      .filter(p => p.paymentStatus === 'paid')
      .reduce((sum, p) => sum + p.totalFees, 0)
  );

  statusCounts = computed(() => ({
    all: this.allPayments().length,
    pending: this.allPayments().filter(p => p.paymentStatus === 'pending').length,
    processing: this.allPayments().filter(p => p.paymentStatus === 'processing').length,
    paid: this.allPayments().filter(p => p.paymentStatus === 'paid').length,
    overdue: this.allPayments().filter(p => p.paymentStatus === 'overdue').length,
  }));

  ngOnInit() {
    this.loadRoyaltyPayments();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load royalty payments
   */
  loadRoyaltyPayments() {
    this.loading.set(true);
    this.error.set(null);

    const organization = this.franchiseService.getCurrentOrganization();
    if (!organization) {
      this.error.set('No organization selected');
      this.loading.set(false);
      return;
    }

    // TODO: Replace with actual API call
    // For now, use mock data
    setTimeout(() => {
      const mockPayments: RoyaltyPayment[] = [
        {
          id: 'roy_001',
          organizationId: organization.id,
          locationId: 'loc_downtown',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          grossRevenue: 24500,
          membershipRevenue: 15000,
          trainingRevenue: 8500,
          retailRevenue: 1000,
          otherRevenue: 0,
          royaltyRate: 0.07,
          royaltyAmount: 1715,
          marketingFeeRate: 0.02,
          marketingFeeAmount: 490,
          technologyFee: 99,
          totalFees: 2304,
          paymentStatus: 'paid',
          paymentDueDate: '2026-02-10',
          paymentDate: '2026-02-08',
          paymentMethod: 'ach',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-08T10:30:00Z',
        },
        {
          id: 'roy_002',
          organizationId: organization.id,
          locationId: 'loc_westside',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          grossRevenue: 18200,
          membershipRevenue: 12000,
          trainingRevenue: 5500,
          retailRevenue: 700,
          otherRevenue: 0,
          royaltyRate: 0.07,
          royaltyAmount: 1274,
          marketingFeeRate: 0.02,
          marketingFeeAmount: 364,
          technologyFee: 99,
          totalFees: 1737,
          paymentStatus: 'overdue',
          paymentDueDate: '2026-02-10',
          daysOverdue: 10,
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-10T00:00:00Z',
        },
        {
          id: 'roy_003',
          organizationId: organization.id,
          locationId: 'loc_downtown',
          periodStart: '2026-02-01',
          periodEnd: '2026-02-28',
          grossRevenue: 26800,
          membershipRevenue: 16500,
          trainingRevenue: 9200,
          retailRevenue: 1100,
          otherRevenue: 0,
          royaltyRate: 0.07,
          royaltyAmount: 1876,
          marketingFeeRate: 0.02,
          marketingFeeAmount: 536,
          technologyFee: 99,
          totalFees: 2511,
          paymentStatus: 'pending',
          paymentDueDate: '2026-03-10',
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
        },
      ];

      this.allPayments.set(mockPayments);
      this.loading.set(false);
    }, 500);
  }

  /**
   * Filter by status
   */
  filterByStatus(status: PaymentStatus) {
    this.selectedStatus.set(status);
  }

  /**
   * Search payments
   */
  onSearchChange(event: any) {
    this.searchTerm.set(event.detail.value || '');
  }

  /**
   * View payment details
   */
  viewPaymentDetail(payment: RoyaltyPayment) {
    this.router.navigate(['/franchise/royalties', payment.id]);
  }

  /**
   * Export payments to CSV
   */
  async exportPayments() {
    const payments = this.filteredPayments();

    // Create CSV content
    const headers = [
      'Payment ID',
      'Location',
      'Period Start',
      'Period End',
      'Gross Revenue',
      'Royalty Amount',
      'Marketing Fee',
      'Tech Fee',
      'Total Fees',
      'Status',
      'Due Date',
      'Payment Date'
    ];

    const rows = payments.map(p => [
      p.id,
      p.locationId,
      p.periodStart,
      p.periodEnd,
      p.grossRevenue,
      p.royaltyAmount,
      p.marketingFeeAmount,
      p.technologyFee,
      p.totalFees,
      p.paymentStatus,
      p.paymentDueDate,
      p.paymentDate || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `royalty-payments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Refresh data
   */
  async refresh(event?: any) {
    await this.loadRoyaltyPayments();
    if (event) {
      event.target.complete();
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.franchiseService.formatCurrency(amount);
  }

  /**
   * Get payment status color
   */
  getStatusColor(status: RoyaltyPayment['paymentStatus']): string {
    return this.franchiseService.getPaymentStatusColor(status);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Get relative time
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}
