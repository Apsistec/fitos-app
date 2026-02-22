/**
 * ClientLedgerComponent — Sprint 59 (Phase 5C)
 *
 * Displays a client's financial ledger:
 * - Running balance (green = credit, amber = debt)
 * - Scrollable transaction history with debit/credit rows
 * - Manual adjustment button (trainer adds credit or debit)
 *
 * Usage:
 *   <app-client-ledger [clientId]="clientId" [trainerId]="trainerId" />
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonItem,
  IonLabel,
  IonNote,
  IonInput,
  IonSelect,
  IonSelectOption,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  addCircleOutline,
  removeCircleOutline,
  trendingUpOutline,
  trendingDownOutline,
  cashOutline,
  receiptOutline,
  createOutline,
} from 'ionicons/icons';
import {
  ClientLedgerService,
  LedgerEntry,
  LedgerReason,
} from '../../../../core/services/client-ledger.service';

addIcons({
  walletOutline,
  addCircleOutline,
  removeCircleOutline,
  trendingUpOutline,
  trendingDownOutline,
  cashOutline,
  receiptOutline,
  createOutline,
});

@Component({
  selector: 'app-client-ledger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonItem,
    IonLabel,
    IonNote,
    IonInput,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-card class="ledger-card">
      <ion-card-header>
        <div class="card-header-row">
          <ion-card-title>
            <ion-icon name="wallet-outline"></ion-icon>
            Account Ledger
          </ion-card-title>
          <ion-button fill="clear" size="small" (click)="openAdjustment()">
            <ion-icon slot="start" name="create-outline"></ion-icon>
            Adjust
          </ion-button>
        </div>
      </ion-card-header>

      <ion-card-content>
        <!-- Balance display -->
        <div class="balance-section">
          <div class="balance-label">CURRENT BALANCE</div>
          <div
            class="balance-amount"
            [class.credit]="ledgerService.balance() >= 0"
            [class.debt]="ledgerService.balance() < 0"
          >
            @if (ledgerService.balance() >= 0) {
              +${{ ledgerService.balance() | number:'1.2-2' }}
            } @else {
              -${{ absBalance() | number:'1.2-2' }}
            }
          </div>
          <div
            class="balance-status"
            [class.credit]="ledgerService.balance() >= 0"
            [class.debt]="ledgerService.balance() < 0"
          >
            @if (ledgerService.balance() > 0) {
              <ion-icon name="trending-up-outline"></ion-icon>
              Credit on account
            } @else if (ledgerService.balance() < 0) {
              <ion-icon name="trending-down-outline"></ion-icon>
              Outstanding balance owed
            } @else {
              <ion-icon name="receipt-outline"></ion-icon>
              Account settled
            }
          </div>
        </div>

        <!-- Loading -->
        @if (ledgerService.isLoading()) {
          <div class="loading-row">
            <ion-spinner name="crescent"></ion-spinner>
          </div>
        }

        <!-- Transaction list -->
        @else if (ledgerService.entries().length === 0) {
          <div class="empty-ledger">
            <ion-icon name="receipt-outline"></ion-icon>
            <p>No transactions yet</p>
          </div>
        }

        @else {
          <div class="transaction-list">
            <div class="list-header">
              <span>RECENT TRANSACTIONS</span>
            </div>

            @for (entry of ledgerService.entries(); track entry.id) {
              <div class="transaction-row">
                <div class="transaction-icon" [class.credit]="entry.entry_type === 'credit'" [class.debit]="entry.entry_type === 'debit'">
                  @if (entry.entry_type === 'credit') {
                    <ion-icon name="add-circle-outline"></ion-icon>
                  } @else {
                    <ion-icon name="remove-circle-outline"></ion-icon>
                  }
                </div>

                <div class="transaction-info">
                  <div class="transaction-reason">{{ ledgerService.formatReason(entry.reason) }}</div>
                  @if (entry.notes) {
                    <div class="transaction-notes">{{ entry.notes }}</div>
                  }
                  <div class="transaction-date">{{ formatDate(entry.created_at) }}</div>
                </div>

                <div
                  class="transaction-amount"
                  [class.credit]="entry.entry_type === 'credit'"
                  [class.debit]="entry.entry_type === 'debit'"
                >
                  {{ entry.entry_type === 'credit' ? '+' : '−' }}${{ entry.amount | number:'1.2-2' }}
                </div>
              </div>
            }
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .ledger-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-card-title ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary, #10B981);
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* ── Balance section ── */
    .balance-section {
      text-align: center;
      padding: 20px 0 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 16px;
    }

    .balance-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      color: var(--fitos-text-tertiary, #737373);
      margin-bottom: 8px;
    }

    .balance-amount {
      font-size: 40px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      line-height: 1;
      margin-bottom: 8px;
    }

    .balance-amount.credit {
      color: var(--ion-color-primary, #10B981);
    }

    .balance-amount.debt {
      color: var(--fitos-status-warning, #F59E0B);
    }

    .balance-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .balance-status.credit {
      color: var(--ion-color-primary, #10B981);
    }

    .balance-status.debt {
      color: var(--fitos-status-warning, #F59E0B);
    }

    .balance-status ion-icon {
      font-size: 16px;
    }

    /* ── Loading / empty ── */
    .loading-row {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .empty-ledger {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .empty-ledger ion-icon {
      font-size: 32px;
    }

    .empty-ledger p {
      margin: 0;
      font-size: 14px;
    }

    /* ── Transaction list ── */
    .transaction-list {
      display: flex;
      flex-direction: column;
    }

    .list-header {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.8px;
      color: var(--fitos-text-tertiary, #737373);
      margin-bottom: 12px;
    }

    .transaction-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .transaction-row:last-child {
      border-bottom: none;
    }

    .transaction-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 18px;
    }

    .transaction-icon.credit {
      background: rgba(16, 185, 129, 0.12);
      color: var(--ion-color-primary, #10B981);
    }

    .transaction-icon.debit {
      background: rgba(245, 158, 11, 0.12);
      color: var(--fitos-status-warning, #F59E0B);
    }

    .transaction-info {
      flex: 1;
      min-width: 0;
    }

    .transaction-reason {
      font-size: 14px;
      font-weight: 500;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 2px;
    }

    .transaction-notes {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .transaction-date {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .transaction-amount {
      font-size: 15px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .transaction-amount.credit {
      color: var(--ion-color-primary, #10B981);
    }

    .transaction-amount.debit {
      color: var(--fitos-status-warning, #F59E0B);
    }
  `],
})
export class ClientLedgerComponent implements OnInit, OnDestroy {
  // ── Inputs ──────────────────────────────────────────────────────────────────

  clientId  = input.required<string>();
  trainerId = input.required<string>();

  // ── DI ──────────────────────────────────────────────────────────────────────

  ledgerService = inject(ClientLedgerService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  // ── Computed ─────────────────────────────────────────────────────────────────

  absBalance = computed(() => Math.abs(this.ledgerService.balance()));

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.ledgerService.getHistory(this.clientId());
  }

  ngOnDestroy(): void {
    this.ledgerService.clear();
  }

  // ── Manual adjustment ─────────────────────────────────────────────────────────

  async openAdjustment(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Manual Adjustment',
      message: 'Add a credit or debit to the client account.',
      inputs: [
        {
          name:        'amount',
          type:        'number',
          placeholder: 'Amount (e.g. 25.00)',
          min:         0.01,
        },
        {
          name:        'notes',
          type:        'textarea',
          placeholder: 'Notes (optional)',
        },
      ],
      buttons: [
        {
          text:    'Cancel',
          role:    'cancel',
        },
        {
          text:    'Add Credit',
          handler: (data) => this.applyAdjustment('credit', data),
        },
        {
          text:    'Add Debit',
          handler: (data) => this.applyAdjustment('debit', data),
        },
      ],
      cssClass: 'fitos-alert',
    });

    await alert.present();
  }

  private async applyAdjustment(
    type: 'credit' | 'debit',
    data: { amount: string; notes: string },
  ): Promise<boolean> {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter a valid positive amount',
        duration: 2500,
        color:    'warning',
        position: 'top',
      });
      await toast.present();
      return false;
    }

    const reason: LedgerReason = 'manual_adjustment';
    const entry = type === 'credit'
      ? await this.ledgerService.addCredit({
          client_id:  this.clientId(),
          trainer_id: this.trainerId(),
          amount,
          reason,
          notes: data.notes || undefined,
        })
      : await this.ledgerService.addDebit({
          client_id:  this.clientId(),
          trainer_id: this.trainerId(),
          amount,
          reason,
          notes: data.notes || undefined,
        });

    if (entry) {
      const toast = await this.toastCtrl.create({
        message: `✓ ${type === 'credit' ? 'Credit' : 'Debit'} of $${amount.toFixed(2)} added`,
        duration: 2500,
        color:    'success',
        position: 'top',
      });
      await toast.present();
    } else if (this.ledgerService.error()) {
      const toast = await this.toastCtrl.create({
        message: `Failed: ${this.ledgerService.error()}`,
        duration: 3000,
        color:    'warning',
        position: 'top',
      });
      await toast.present();
    }

    return true;
  }

  // ── Formatting ────────────────────────────────────────────────────────────────

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });
  }
}
