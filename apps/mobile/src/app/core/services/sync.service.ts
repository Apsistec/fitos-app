/**
 * SyncService — Sprint 65 (Offline Sync Foundation)
 *
 * Manages bidirectional sync between IndexedDB and Supabase.
 *
 * Write path:
 *   1. Data is written to IndexedDB immediately (optimistic).
 *   2. A SyncQueueItem is appended.
 *   3. If online, the queue is flushed in FIFO order.
 *   4. On reconnection the queue is flushed automatically.
 *
 * Read path:
 *   Callers read from IndexedDB via the `db` singleton.
 *   `pullFromServer()` fetches latest rows and upserts locally.
 */

import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { db, type SyncQueueItem } from '../database/fitos.db';
import { SupabaseService } from './supabase.service';

const MAX_RETRIES = 5;

@Injectable({ providedIn: 'root' })
export class SyncService {
  private supabase = inject(SupabaseService);
  private ngZone   = inject(NgZone);

  /* ── Public state ──────────────────────────────────────── */
  isOnline     = signal(navigator.onLine);
  isSyncing    = signal(false);
  pendingCount = signal(0);
  lastSyncTime = signal<Date | null>(null);
  syncErrors   = signal<string[]>([]);

  hasPendingChanges = computed(() => this.pendingCount() > 0);

  constructor() {
    this.initNetworkListener();
    this.refreshPendingCount();
  }

  /* ── Network listener ──────────────────────────────────── */

  private initNetworkListener(): void {
    const onOnline = () => {
      this.ngZone.run(() => {
        this.isOnline.set(true);
        this.syncAll();
      });
    };

    const onOffline = () => {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
  }

  /* ── Queue an operation ────────────────────────────────── */

  async queueOperation(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    table: string,
    recordId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await db.sync_queue.add({
      operation,
      table,
      record_id: recordId,
      data,
      timestamp: Date.now(),
      retry_count: 0,
    });

    await this.refreshPendingCount();

    if (this.isOnline()) {
      this.syncAll();
    }
  }

  /* ── Flush the sync queue ──────────────────────────────── */

  async syncAll(): Promise<void> {
    if (this.isSyncing() || !this.isOnline()) return;

    this.isSyncing.set(true);
    this.syncErrors.set([]);

    try {
      const pending = await db.sync_queue
        .orderBy('timestamp')
        .toArray();

      for (const item of pending) {
        try {
          await this.processItem(item);
          await db.sync_queue.delete(item.id!);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';

          await db.sync_queue.update(item.id!, {
            retry_count: item.retry_count + 1,
            last_error: msg,
          });

          if (item.retry_count + 1 >= MAX_RETRIES) {
            this.syncErrors.update(errs => [
              ...errs,
              `Failed to sync ${item.table}/${item.record_id}: ${msg}`,
            ]);
            await db.sync_queue.delete(item.id!);
          }
        }
      }

      this.lastSyncTime.set(new Date());
    } finally {
      this.isSyncing.set(false);
      await this.refreshPendingCount();
    }
  }

  /* ── Pull latest rows from server → IndexedDB ─────────── */

  async pullFromServer(table: string, since?: Date): Promise<void> {
    let query = this.supabase.from(table).select('*');

    if (since) {
      query = query.gt('updated_at', since.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return;

    const localTable = db.table(table);
    await localTable.bulkPut(
      data.map((row: Record<string, unknown>) => ({
        ...row,
        synced_at: new Date().toISOString(),
      })),
    );
  }

  /* ── Helpers ───────────────────────────────────────────── */

  private async processItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'CREATE': {
        const { error } = await this.supabase
          .from(item.table)
          .insert(item.data as never);
        if (error) throw error;
        break;
      }
      case 'UPDATE': {
        const { error } = await this.supabase
          .from(item.table)
          .update(item.data as never)
          .eq('id', item.record_id);
        if (error) throw error;
        break;
      }
      case 'DELETE': {
        const { error } = await this.supabase
          .from(item.table)
          .delete()
          .eq('id', item.record_id);
        if (error) throw error;
        break;
      }
    }

    // Mark the local record as synced
    try {
      const localTable = db.table(item.table);
      await localTable.update(item.record_id, {
        synced_at: new Date().toISOString(),
      });
    } catch {
      // Local record may already be deleted — ignore
    }
  }

  async refreshPendingCount(): Promise<void> {
    const count = await db.sync_queue.count();
    this.pendingCount.set(count);
  }
}
