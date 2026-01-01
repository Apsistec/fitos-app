# FitOS Offline Sync & Real-time Architecture

Comprehensive patterns for offline-first data management with Supabase real-time sync.

---

## Architecture Overview

FitOS uses an **offline-first architecture** where:
1. All data is written to local storage first (IndexedDB via Dexie.js)
2. Changes are queued for sync when offline
3. Real-time subscriptions keep data fresh when online
4. Conflict resolution uses last-write-wins with timestamps

---

## IndexedDB Schema with Dexie.js

```typescript
// lib/database/fitness.db.ts
import Dexie, { Table } from 'dexie';

export interface Workout {
  id: string;
  userId: string;
  name: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped';
  exercises: ExerciseSet[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  _deleted?: boolean;
}

export interface ExerciseLog {
  id: string;
  workoutId: string;
  exerciseId: string;
  sets: SetLog[];
  completedAt: string;
  syncedAt?: string;
}

export interface SyncQueueItem {
  id?: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

class FitOSDatabase extends Dexie {
  workouts!: Table<Workout>;
  exerciseLogs!: Table<ExerciseLog>;
  exercises!: Table<Exercise>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('FitOSDatabase');
    
    this.version(1).stores({
      workouts: 'id, userId, scheduledDate, status, syncedAt',
      exerciseLogs: 'id, workoutId, exerciseId, completedAt',
      exercises: 'id, name, category, muscleGroup',
      syncQueue: '++id, operation, table, timestamp, retryCount'
    });

    // Hooks for auto-updating timestamps
    this.workouts.hook('creating', (primKey, obj) => {
      obj.createdAt = obj.createdAt || new Date().toISOString();
      obj.updatedAt = new Date().toISOString();
    });

    this.workouts.hook('updating', (modifications, primKey, obj) => {
      return { ...modifications, updatedAt: new Date().toISOString() };
    });
  }
}

export const db = new FitOSDatabase();
```

---

## Sync Service

```typescript
// core/services/sync.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { Network } from '@capacitor/network';
import { db, SyncQueueItem } from '../../lib/database/fitness.db';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private supabase = inject(SupabaseService);
  
  // State
  isOnline = signal(true);
  isSyncing = signal(false);
  pendingCount = signal(0);
  lastSyncTime = signal<Date | null>(null);
  syncErrors = signal<string[]>([]);
  
  // Computed
  hasPendingChanges = computed(() => this.pendingCount() > 0);
  
  constructor() {
    this.initNetworkListener();
    this.updatePendingCount();
  }
  
  private async initNetworkListener() {
    const status = await Network.getStatus();
    this.isOnline.set(status.connected);
    
    Network.addListener('networkStatusChange', async (status) => {
      this.isOnline.set(status.connected);
      
      if (status.connected) {
        // Auto-sync when coming back online
        await this.syncAll();
      }
    });
  }
  
  private async updatePendingCount() {
    const count = await db.syncQueue.count();
    this.pendingCount.set(count);
  }
  
  // Queue operation for sync
  async queueOperation(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    table: string,
    recordId: string,
    data: any
  ): Promise<void> {
    await db.syncQueue.add({
      operation,
      table,
      recordId,
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    await this.updatePendingCount();
    
    // Try to sync immediately if online
    if (this.isOnline()) {
      this.syncAll();
    }
  }
  
  // Process sync queue
  async syncAll(): Promise<void> {
    if (this.isSyncing() || !this.isOnline()) return;
    
    this.isSyncing.set(true);
    this.syncErrors.set([]);
    
    try {
      const pending = await db.syncQueue
        .orderBy('timestamp')
        .toArray();
      
      for (const item of pending) {
        try {
          await this.processQueueItem(item);
          await db.syncQueue.delete(item.id!);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Update retry count
          await db.syncQueue.update(item.id!, {
            retryCount: item.retryCount + 1,
            lastError: errorMessage
          });
          
          // Remove after max retries
          if (item.retryCount >= 5) {
            this.syncErrors.update(errors => [...errors, `Failed to sync ${item.table}/${item.recordId}: ${errorMessage}`]);
            await db.syncQueue.delete(item.id!);
          }
        }
      }
      
      this.lastSyncTime.set(new Date());
    } finally {
      this.isSyncing.set(false);
      await this.updatePendingCount();
    }
  }
  
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const client = this.supabase.client;
    
    switch (item.operation) {
      case 'CREATE':
        const { error: createError } = await client
          .from(item.table)
          .insert(item.data);
        if (createError) throw createError;
        break;
        
      case 'UPDATE':
        const { error: updateError } = await client
          .from(item.table)
          .update(item.data)
          .eq('id', item.recordId);
        if (updateError) throw updateError;
        break;
        
      case 'DELETE':
        const { error: deleteError } = await client
          .from(item.table)
          .delete()
          .eq('id', item.recordId);
        if (deleteError) throw deleteError;
        break;
    }
    
    // Mark local record as synced
    const localTable = db.table(item.table);
    await localTable.update(item.recordId, { syncedAt: new Date().toISOString() });
  }
  
  // Pull latest data from server
  async pullFromServer(table: string, since?: Date): Promise<void> {
    const client = this.supabase.client;
    
    let query = client.from(table).select('*');
    
    if (since) {
      query = query.gt('updated_at', since.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Upsert to local database
    const localTable = db.table(table);
    await localTable.bulkPut(data.map(item => ({
      ...item,
      syncedAt: new Date().toISOString()
    })));
  }
}
```

---

## Real-time Subscriptions

```typescript
// core/services/realtime.service.ts
import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { db } from '../../lib/database/fitness.db';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  
  private channels: Map<string, RealtimeChannel> = new Map();
  
  // Subscribe to workout changes
  subscribeToWorkouts(callback?: (payload: any) => void): void {
    const userId = this.authService.userId();
    if (!userId) return;
    
    const channel = this.supabase.client
      .channel('workouts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `user_id=eq.${userId}`
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          await this.handleWorkoutChange(payload);
          callback?.(payload);
        }
      )
      .subscribe();
    
    this.channels.set('workouts', channel);
  }
  
  private async handleWorkoutChange(payload: RealtimePostgresChangesPayload<any>) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        // Update local database
        await db.workouts.put({
          ...newRecord,
          syncedAt: new Date().toISOString()
        });
        break;
        
      case 'DELETE':
        // Remove from local database
        await db.workouts.delete(oldRecord.id);
        break;
    }
  }
  
  // Subscribe to presence (who's online)
  subscribeToPresence(roomId: string): RealtimeChannel {
    const channel = this.supabase.client.channel(`presence:${roomId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: this.authService.userId(),
            online_at: new Date().toISOString()
          });
        }
      });
    
    this.channels.set(`presence:${roomId}`, channel);
    return channel;
  }
  
  // Unsubscribe from channel
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase.client.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }
  
  // Cleanup all subscriptions
  ngOnDestroy(): void {
    this.channels.forEach((channel, name) => {
      this.supabase.client.removeChannel(channel);
    });
    this.channels.clear();
  }
}
```

---

## Optimistic Updates Pattern

```typescript
// features/workouts/services/workout.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { db, Workout } from '../../../lib/database/fitness.db';
import { SyncService } from '../../../core/services/sync.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private syncService = inject(SyncService);
  
  // State
  private _workouts = signal<Workout[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  
  // Public readonly
  workouts = this._workouts.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  
  // Computed
  todayWorkout = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._workouts().find(w => w.scheduledDate.startsWith(today));
  });
  
  upcomingWorkouts = computed(() => {
    const now = new Date().toISOString();
    return this._workouts()
      .filter(w => w.scheduledDate > now && w.status === 'scheduled')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 5);
  });
  
  // Load workouts from local DB
  async loadWorkouts(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    
    try {
      const workouts = await db.workouts
        .where('_deleted')
        .notEqual(true)
        .toArray();
      this._workouts.set(workouts);
    } catch (error) {
      this._error.set('Failed to load workouts');
      console.error('Load workouts error:', error);
    } finally {
      this._loading.set(false);
    }
  }
  
  // Create workout with optimistic update
  async createWorkout(data: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workout> {
    const workout: Workout = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistic update - add to UI immediately
    this._workouts.update(workouts => [...workouts, workout]);
    
    // Save to local DB
    await db.workouts.add(workout);
    
    // Queue for server sync
    await this.syncService.queueOperation('CREATE', 'workouts', workout.id, workout);
    
    return workout;
  }
  
  // Update workout with optimistic update
  async updateWorkout(id: string, updates: Partial<Workout>): Promise<void> {
    const updatedAt = new Date().toISOString();
    
    // Optimistic update
    this._workouts.update(workouts => 
      workouts.map(w => w.id === id ? { ...w, ...updates, updatedAt } : w)
    );
    
    // Update local DB
    await db.workouts.update(id, { ...updates, updatedAt });
    
    // Queue for server sync
    const workout = await db.workouts.get(id);
    await this.syncService.queueOperation('UPDATE', 'workouts', id, workout);
  }
  
  // Delete workout with optimistic update
  async deleteWorkout(id: string): Promise<void> {
    // Optimistic update - remove from UI
    this._workouts.update(workouts => workouts.filter(w => w.id !== id));
    
    // Soft delete in local DB (for sync)
    await db.workouts.update(id, { _deleted: true, updatedAt: new Date().toISOString() });
    
    // Queue for server sync
    await this.syncService.queueOperation('DELETE', 'workouts', id, null);
  }
  
  // Rollback optimistic update on error
  async rollbackWorkout(workout: Workout): Promise<void> {
    this._workouts.update(workouts => {
      const existing = workouts.find(w => w.id === workout.id);
      if (existing) {
        return workouts.map(w => w.id === workout.id ? workout : w);
      } else {
        return [...workouts, workout];
      }
    });
  }
}
```

---

## Conflict Resolution

```typescript
// core/services/conflict-resolver.service.ts
import { Injectable } from '@angular/core';

export interface ConflictResolution<T> {
  resolved: T;
  strategy: 'local' | 'remote' | 'merged';
}

@Injectable({ providedIn: 'root' })
export class ConflictResolverService {
  
  // Last-write-wins (default strategy)
  resolveLastWriteWins<T extends { updatedAt: string }>(
    local: T,
    remote: T
  ): ConflictResolution<T> {
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    
    if (localTime > remoteTime) {
      return { resolved: local, strategy: 'local' };
    } else {
      return { resolved: remote, strategy: 'remote' };
    }
  }
  
  // Field-level merge for complex objects
  resolveFieldMerge<T extends Record<string, any>>(
    local: T,
    remote: T,
    base: T | null
  ): ConflictResolution<T> {
    const resolved = { ...remote };
    
    for (const key of Object.keys(local)) {
      if (key === 'id' || key === 'createdAt') continue;
      
      const localValue = local[key];
      const remoteValue = remote[key];
      const baseValue = base?.[key];
      
      // If local changed from base but remote didn't, use local
      if (localValue !== baseValue && remoteValue === baseValue) {
        resolved[key] = localValue;
      }
      // If both changed, use the most recent
      else if (localValue !== remoteValue) {
        if (key === 'updatedAt' || key.endsWith('At')) {
          const localTime = new Date(localValue).getTime();
          const remoteTime = new Date(remoteValue).getTime();
          resolved[key] = localTime > remoteTime ? localValue : remoteValue;
        }
      }
    }
    
    return { resolved: resolved as T, strategy: 'merged' };
  }
}
```

---

## Service Worker Configuration

```json
// ngsw-config.json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(svg|cur|jpg|jpeg|png|apng|webp|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-freshness",
      "urls": ["/api/workouts/**", "/api/exercises/**", "/api/clients/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "5s"
      }
    },
    {
      "name": "api-performance",
      "urls": ["/api/exercises-library/**", "/api/templates/**"],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 200,
        "maxAge": "7d"
      }
    }
  ]
}
```

---

## Usage in Components

```typescript
@Component({
  template: `
    <!-- Sync status indicator -->
    <div class="sync-status">
      @if (syncService.isSyncing()) {
        <ion-spinner name="dots" />
        <span>Syncing...</span>
      } @else if (syncService.hasPendingChanges()) {
        <ion-icon name="cloud-offline" color="warning" />
        <span>{{ syncService.pendingCount() }} pending</span>
      } @else if (!syncService.isOnline()) {
        <ion-icon name="cloud-offline" color="medium" />
        <span>Offline</span>
      } @else {
        <ion-icon name="cloud-done" color="success" />
        <span>Synced</span>
      }
    </div>
    
    <!-- Manual sync button -->
    <ion-button 
      fill="clear" 
      (click)="syncService.syncAll()"
      [disabled]="syncService.isSyncing() || !syncService.isOnline()">
      <ion-icon slot="icon-only" name="sync" />
    </ion-button>
    
    <!-- Sync errors -->
    @if (syncService.syncErrors().length > 0) {
      <ion-list>
        @for (error of syncService.syncErrors(); track $index) {
          <ion-item color="danger">
            <ion-icon name="alert-circle" slot="start" />
            <ion-label>{{ error }}</ion-label>
          </ion-item>
        }
      </ion-list>
    }
  `
})
export class SyncStatusComponent {
  syncService = inject(SyncService);
}
```
