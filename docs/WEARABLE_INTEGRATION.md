# FitOS Wearable Integration Guide

**Version:** 1.0  
**Date:** January 2026  
**Status:** Implementation Ready

---

## Overview

FitOS implements a three-tier wearable integration strategy optimized for cost and coverage:

1. **Tier 1 (MVP):** Direct Health Connect + HealthKit integration ($0)
2. **Tier 2 (Growth):** Terra API for Garmin/WHOOP/Oura ($399+/mo)
3. **Tier 3 (Scale):** Junction/Vital for healthcare markets ($0.50/user)

---

## Tier 1: Direct Integration (MVP)

### Health Connect (Android)

**Why Health Connect:**
- Google Fit APIs deprecated July 1, 2025
- Mandatory for Android wearable integration
- 50+ data types supported
- Single integration covers Samsung Health, Fitbit (via Health Connect), Google Fit migration

**Capacitor Plugin:** `@capgo/capacitor-health`

#### Installation

```bash
npm install @capgo/capacitor-health
npx cap sync android
```

#### Android Configuration

**android/app/src/main/AndroidManifest.xml:**
```xml
<manifest>
    <!-- Health Connect Permissions -->
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_HEART_RATE" />
    <uses-permission android:name="android.permission.health.READ_SLEEP" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.health.READ_DISTANCE" />
    <uses-permission android:name="android.permission.health.READ_EXERCISE" />
    <uses-permission android:name="android.permission.health.READ_WEIGHT" />
    <uses-permission android:name="android.permission.health.READ_HEIGHT" />
    <uses-permission android:name="android.permission.health.READ_BODY_FAT" />
    
    <uses-permission android:name="android.permission.health.WRITE_STEPS" />
    <uses-permission android:name="android.permission.health.WRITE_EXERCISE" />
    <uses-permission android:name="android.permission.health.WRITE_WEIGHT" />
    
    <application>
        <!-- Health Connect Intent Filter -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
        
        <!-- Privacy Policy Activity -->
        <activity
            android:name=".HealthConnectPrivacyPolicyActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### Service Implementation

```typescript
// core/services/healthkit.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorHealth } from '@capgo/capacitor-health';

export interface WearableData {
  steps: number;
  activeCalories: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  sleepHours?: number;
  sleepStages?: {
    awake: number;
    light: number;
    deep: number;
    rem: number;
  };
  weight?: number;
  bodyFat?: number;
}

export interface WorkoutData {
  type: string;
  startDate: Date;
  endDate: Date;
  calories: number;
  distance?: number;
  heartRateAvg?: number;
}

@Injectable({ providedIn: 'root' })
export class HealthKitService {
  isAvailable = signal(false);
  isAuthorized = signal(false);
  lastSyncDate = signal<Date | null>(null);

  private readonly READ_PERMISSIONS = [
    'steps',
    'heart_rate',
    'sleep',
    'calories.active',
    'calories.basal',
    'distance',
    'workouts',
    'weight',
    'height',
    'body_fat'
  ];

  private readonly WRITE_PERMISSIONS = [
    'steps',
    'workouts',
    'weight'
  ];

  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Health data not available on web');
      return false;
    }

    try {
      const result = await CapacitorHealth.isAvailable();
      this.isAvailable.set(result.available);
      
      if (result.available) {
        const authStatus = await CapacitorHealth.checkAuthorization({
          read: this.READ_PERMISSIONS,
          write: this.WRITE_PERMISSIONS
        });
        this.isAuthorized.set(authStatus.authorized);
      }
      
      return result.available;
    } catch (error) {
      console.error('Health initialization failed:', error);
      return false;
    }
  }

  async requestAuthorization(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await CapacitorHealth.requestAuthorization({
        read: this.READ_PERMISSIONS,
        write: this.WRITE_PERMISSIONS
      });
      
      this.isAuthorized.set(result.authorized);
      return result.authorized;
    } catch (error) {
      console.error('Authorization request failed:', error);
      return false;
    }
  }

  async getTodayData(): Promise<WearableData> {
    if (!this.isAuthorized()) {
      throw new Error('Not authorized to read health data');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const [steps, calories, heartRate, sleep, weight] = await Promise.all([
      this.getSteps(today, now),
      this.getActiveCalories(today, now),
      this.getRestingHeartRate(today, now),
      this.getSleepData(today),
      this.getWeight()
    ]);

    this.lastSyncDate.set(new Date());

    return {
      steps,
      activeCalories: calories,
      restingHeartRate: heartRate.resting,
      heartRateVariability: heartRate.hrv,
      sleepHours: sleep.total,
      sleepStages: sleep.stages,
      weight: weight.value,
      bodyFat: weight.bodyFat
    };
  }

  private async getSteps(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await CapacitorHealth.query({
        type: 'steps',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        aggregation: 'sum'
      });
      return result.value || 0;
    } catch {
      return 0;
    }
  }

  private async getActiveCalories(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await CapacitorHealth.query({
        type: 'calories.active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        aggregation: 'sum'
      });
      return Math.round(result.value || 0);
    } catch {
      return 0;
    }
  }

  private async getRestingHeartRate(startDate: Date, endDate: Date): Promise<{
    resting?: number;
    hrv?: number;
  }> {
    try {
      const [resting, hrv] = await Promise.all([
        CapacitorHealth.query({
          type: 'heart_rate.resting',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          aggregation: 'average'
        }),
        CapacitorHealth.query({
          type: 'heart_rate_variability',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          aggregation: 'average'
        })
      ]);
      
      return {
        resting: resting.value ? Math.round(resting.value) : undefined,
        hrv: hrv.value ? Math.round(hrv.value) : undefined
      };
    } catch {
      return {};
    }
  }

  private async getSleepData(date: Date): Promise<{
    total: number;
    stages?: {
      awake: number;
      light: number;
      deep: number;
      rem: number;
    };
  }> {
    // Query sleep from previous night
    const sleepStart = new Date(date);
    sleepStart.setDate(sleepStart.getDate() - 1);
    sleepStart.setHours(18, 0, 0, 0); // 6 PM previous day
    
    const sleepEnd = new Date(date);
    sleepEnd.setHours(12, 0, 0, 0); // Noon current day

    try {
      const result = await CapacitorHealth.query({
        type: 'sleep',
        startDate: sleepStart.toISOString(),
        endDate: sleepEnd.toISOString()
      });

      // Calculate total sleep in hours
      const totalMinutes = result.value || 0;
      const totalHours = totalMinutes / 60;

      // Try to get sleep stages if available
      let stages;
      try {
        const stagesResult = await CapacitorHealth.query({
          type: 'sleep.stages',
          startDate: sleepStart.toISOString(),
          endDate: sleepEnd.toISOString()
        });
        
        if (stagesResult.stages) {
          stages = {
            awake: stagesResult.stages.awake || 0,
            light: stagesResult.stages.light || 0,
            deep: stagesResult.stages.deep || 0,
            rem: stagesResult.stages.rem || 0
          };
        }
      } catch {
        // Sleep stages not available
      }

      return { total: totalHours, stages };
    } catch {
      return { total: 0 };
    }
  }

  private async getWeight(): Promise<{
    value?: number;
    bodyFat?: number;
  }> {
    try {
      const [weight, bodyFat] = await Promise.all([
        CapacitorHealth.queryLatest({ type: 'weight' }),
        CapacitorHealth.queryLatest({ type: 'body_fat' })
      ]);

      return {
        value: weight.value,
        bodyFat: bodyFat.value
      };
    } catch {
      return {};
    }
  }

  async getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutData[]> {
    if (!this.isAuthorized()) return [];

    try {
      const result = await CapacitorHealth.queryWorkouts({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      return result.workouts?.map(w => ({
        type: w.type,
        startDate: new Date(w.startDate),
        endDate: new Date(w.endDate),
        calories: w.calories || 0,
        distance: w.distance,
        heartRateAvg: w.heartRateAvg
      })) || [];
    } catch (error) {
      console.error('Failed to get workouts:', error);
      return [];
    }
  }

  async writeWorkout(workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
  }): Promise<boolean> {
    if (!this.isAuthorized()) return false;

    try {
      await CapacitorHealth.writeWorkout({
        type: workout.type,
        startDate: workout.startDate.toISOString(),
        endDate: workout.endDate.toISOString(),
        calories: workout.calories
      });
      return true;
    } catch (error) {
      console.error('Failed to write workout:', error);
      return false;
    }
  }

  async writeWeight(weight: number, date?: Date): Promise<boolean> {
    if (!this.isAuthorized()) return false;

    try {
      await CapacitorHealth.write({
        type: 'weight',
        value: weight,
        date: (date || new Date()).toISOString()
      });
      return true;
    } catch (error) {
      console.error('Failed to write weight:', error);
      return false;
    }
  }
}
```

---

### HealthKit (iOS)

**iOS Configuration:**

**ios/App/App/Info.plist:**
```xml
<key>NSHealthShareUsageDescription</key>
<string>FitOS reads your health data to track your fitness progress and provide personalized coaching.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>FitOS writes workout data to keep your health records complete.</string>
```

**ios/App/App/Entitlements.plist:**
```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.access</key>
<array/>
<key>com.apple.developer.healthkit.background-delivery</key>
<true/>
```

The same `HealthKitService` works for both platforms via `@capgo/capacitor-health`.

---

## Tier 2: Terra API Integration

### When to Implement
- After 100+ paying users
- When users frequently request Garmin/WHOOP/Oura support
- Estimated timeline: Months 4-6

### Cost Structure
- **Free tier:** 100K API credits
- **After free tier:** $0.005/credit (~$0.80-1.00/user/month)
- **Minimum:** $399/month

### Devices Covered Without Individual Licensing
- Garmin (saves $5,000 commercial fee)
- WHOOP
- Oura
- Polar
- Coros
- 300+ other devices

### Implementation

```typescript
// core/services/terra.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TerraUser {
  userId: string;
  provider: string;
  lastSyncDate?: Date;
}

export interface TerraActivity {
  type: string;
  startTime: Date;
  endTime: Date;
  calories: number;
  distance?: number;
  avgHeartRate?: number;
  source: string;
}

export interface TerraSleep {
  totalMinutes: number;
  efficiency: number;
  stages: {
    awake: number;
    light: number;
    deep: number;
    rem: number;
  };
  hrv?: number;
}

export interface TerraBody {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
}

@Injectable({ providedIn: 'root' })
export class TerraService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.terraApiUrl || 'https://api.tryterra.co/v2';

  /**
   * Generate authentication widget URL for user to connect their wearable
   */
  async generateWidgetSession(userId: string): Promise<string> {
    const response = await this.http.post<{ url: string }>(
      `${environment.aiApiUrl}/terra/widget`,
      { userId }
    ).toPromise();
    
    return response!.url;
  }

  /**
   * Get all connected providers for a user
   */
  async getConnectedProviders(userId: string): Promise<TerraUser[]> {
    const response = await this.http.get<{ users: TerraUser[] }>(
      `${environment.aiApiUrl}/terra/users/${userId}`
    ).toPromise();
    
    return response!.users || [];
  }

  /**
   * Disconnect a provider
   */
  async disconnectProvider(terraUserId: string): Promise<void> {
    await this.http.delete(
      `${environment.aiApiUrl}/terra/users/${terraUserId}`
    ).toPromise();
  }

  /**
   * Get activity data for a date range
   */
  async getActivity(
    terraUserId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TerraActivity[]> {
    const response = await this.http.get<{ data: TerraActivity[] }>(
      `${environment.aiApiUrl}/terra/activity/${terraUserId}`,
      {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }
      }
    ).toPromise();
    
    return response!.data || [];
  }

  /**
   * Get sleep data for a date range
   */
  async getSleep(
    terraUserId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TerraSleep[]> {
    const response = await this.http.get<{ data: TerraSleep[] }>(
      `${environment.aiApiUrl}/terra/sleep/${terraUserId}`,
      {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }
      }
    ).toPromise();
    
    return response!.data || [];
  }

  /**
   * Get body metrics
   */
  async getBody(
    terraUserId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TerraBody[]> {
    const response = await this.http.get<{ data: TerraBody[] }>(
      `${environment.aiApiUrl}/terra/body/${terraUserId}`,
      {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }
      }
    ).toPromise();
    
    return response!.data || [];
  }

  /**
   * Get daily summary (combines activity, sleep, body)
   */
  async getDailySummary(
    terraUserId: string,
    date: Date
  ): Promise<{
    activity: TerraActivity[];
    sleep?: TerraSleep;
    body?: TerraBody;
  }> {
    const dateStr = date.toISOString().split('T')[0];
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);

    const [activity, sleep, body] = await Promise.all([
      this.getActivity(terraUserId, date, date),
      this.getSleep(terraUserId, prevDate, date), // Sleep from previous night
      this.getBody(terraUserId, date, date)
    ]);

    return {
      activity,
      sleep: sleep[0],
      body: body[0]
    };
  }
}
```

### Backend Webhook Handler

```python
# apps/ai-backend/routes/terra.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import httpx
import os

router = APIRouter(prefix="/terra", tags=["Terra Wearables"])

TERRA_API_KEY = os.getenv("TERRA_API_KEY")
TERRA_DEV_ID = os.getenv("TERRA_DEV_ID")

class WidgetRequest(BaseModel):
    userId: str

@router.post("/widget")
async def generate_widget(request: WidgetRequest):
    """Generate authentication widget URL for user"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.tryterra.co/v2/auth/generateWidgetSession",
            headers={
                "x-api-key": TERRA_API_KEY,
                "dev-id": TERRA_DEV_ID
            },
            json={
                "reference_id": request.userId,
                "providers": "GARMIN,WITHINGS,FITBIT,OURA,WHOOP,POLAR,SUUNTO,COROS",
                "language": "en"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to generate widget")
        
        return response.json()

@router.post("/webhook")
async def terra_webhook(request: Request):
    """Handle Terra webhooks for data updates"""
    payload = await request.json()
    
    event_type = payload.get("type")
    user = payload.get("user", {})
    
    if event_type == "user_reauth":
        # User re-authenticated, refresh their data
        await sync_user_data(user.get("reference_id"))
    elif event_type == "activity":
        # New activity data available
        await process_activity(user.get("reference_id"), payload.get("data"))
    elif event_type == "sleep":
        # New sleep data available
        await process_sleep(user.get("reference_id"), payload.get("data"))
    
    return {"status": "ok"}
```

---

## Unified Wearable Data Service

```typescript
// core/services/wearable-data.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HealthKitService, WearableData } from './healthkit.service';
import { TerraService, TerraUser } from './terra.service';
import { environment } from '../../../environments/environment';

export interface UnifiedWearableData extends WearableData {
  source: 'healthkit' | 'terra';
  provider?: string;
  syncedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class WearableDataService {
  private healthKit = inject(HealthKitService);
  private terra = inject(TerraService);
  
  isConnected = signal(false);
  connectedSources = signal<string[]>([]);
  lastSync = signal<Date | null>(null);

  async initialize(userId: string): Promise<void> {
    // Check native Health Connect/HealthKit first
    const nativeAvailable = await this.healthKit.initialize();
    
    if (nativeAvailable && this.healthKit.isAuthorized()) {
      this.isConnected.set(true);
      this.connectedSources.update(sources => [...sources, 'Apple Health/Health Connect']);
    }

    // Check Terra connections if feature is enabled
    if (environment.features?.terraIntegration) {
      const terraUsers = await this.terra.getConnectedProviders(userId);
      if (terraUsers.length > 0) {
        this.isConnected.set(true);
        const providers = terraUsers.map(u => u.provider);
        this.connectedSources.update(sources => [...sources, ...providers]);
      }
    }
  }

  async getTodayData(userId: string): Promise<UnifiedWearableData | null> {
    // Prefer native Health data if available
    if (this.healthKit.isAuthorized()) {
      const data = await this.healthKit.getTodayData();
      this.lastSync.set(new Date());
      return {
        ...data,
        source: 'healthkit',
        syncedAt: new Date()
      };
    }

    // Fall back to Terra if configured
    if (environment.features?.terraIntegration) {
      const terraUsers = await this.terra.getConnectedProviders(userId);
      if (terraUsers.length > 0) {
        // Use first connected provider
        const terraUser = terraUsers[0];
        const summary = await this.terra.getDailySummary(terraUser.userId, new Date());
        
        this.lastSync.set(new Date());
        return {
          steps: summary.activity.reduce((sum, a) => sum + (a.calories || 0), 0),
          activeCalories: summary.activity.reduce((sum, a) => sum + (a.calories || 0), 0),
          sleepHours: summary.sleep?.totalMinutes ? summary.sleep.totalMinutes / 60 : undefined,
          sleepStages: summary.sleep?.stages,
          weight: summary.body?.weight,
          bodyFat: summary.body?.bodyFat,
          source: 'terra',
          provider: terraUser.provider,
          syncedAt: new Date()
        };
      }
    }

    return null;
  }

  async connectNative(): Promise<boolean> {
    return this.healthKit.requestAuthorization();
  }

  async connectTerra(userId: string): Promise<string> {
    if (!environment.features?.terraIntegration) {
      throw new Error('Terra integration not enabled');
    }
    return this.terra.generateWidgetSession(userId);
  }

  async disconnect(userId: string, source: string): Promise<void> {
    if (source === 'Apple Health' || source === 'Health Connect') {
      // Can't programmatically revoke native permissions
      // User must do this in system settings
      throw new Error('Please revoke access in your device settings');
    }

    // Disconnect Terra provider
    const terraUsers = await this.terra.getConnectedProviders(userId);
    const user = terraUsers.find(u => u.provider === source);
    if (user) {
      await this.terra.disconnectProvider(user.userId);
      this.connectedSources.update(sources => 
        sources.filter(s => s !== source)
      );
    }
  }
}
```

---

## UI Component: Wearables Settings Page

```typescript
// features/settings/pages/wearables/wearables.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton,
  IonButtons, IonList, IonItem, IonLabel, IonToggle, IonIcon,
  IonButton, IonSpinner, IonNote, IonBadge, AlertController
} from '@ionic/angular/standalone';
import { Browser } from '@capacitor/browser';
import { WearableDataService } from '@core/services/wearable-data.service';
import { AuthService } from '@core/services/auth.service';
import { addIcons } from 'ionicons';
import { 
  watchOutline, heartOutline, bedOutline, 
  syncOutline, checkmarkCircle, alertCircle 
} from 'ionicons/icons';

@Component({
  selector: 'app-wearables',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton,
    IonButtons, IonList, IonItem, IonLabel, IonToggle, IonIcon,
    IonButton, IonSpinner, IonNote, IonBadge
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Wearables</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Native Health Integration -->
      <div class="section-header">
        <h2>Device Health Data</h2>
        <p class="section-description">
          Connect to Apple Health or Health Connect to sync your fitness data automatically.
        </p>
      </div>

      <ion-list>
        <ion-item>
          <ion-icon name="heart-outline" slot="start"></ion-icon>
          <ion-label>
            <h3>{{ platform === 'ios' ? 'Apple Health' : 'Health Connect' }}</h3>
            <p>Steps, heart rate, sleep, workouts</p>
          </ion-label>
          @if (wearableService.isConnected()) {
            <ion-badge color="success" slot="end">Connected</ion-badge>
          } @else {
            <ion-button slot="end" fill="outline" (click)="connectNative()">
              Connect
            </ion-button>
          }
        </ion-item>
      </ion-list>

      <!-- Terra Integrations (if enabled) -->
      @if (terraEnabled) {
        <div class="section-header">
          <h2>Additional Wearables</h2>
          <p class="section-description">
            Connect Garmin, WHOOP, Oura, and other devices.
          </p>
        </div>

        <ion-list>
          @for (provider of terraProviders; track provider.name) {
            <ion-item>
              <ion-icon [name]="provider.icon" slot="start"></ion-icon>
              <ion-label>
                <h3>{{ provider.name }}</h3>
                <p>{{ provider.description }}</p>
              </ion-label>
              @if (isProviderConnected(provider.name)) {
                <ion-button slot="end" fill="clear" color="danger" 
                            (click)="disconnectProvider(provider.name)">
                  Disconnect
                </ion-button>
              } @else {
                <ion-button slot="end" fill="outline" (click)="connectTerra()">
                  Connect
                </ion-button>
              }
            </ion-item>
          }
        </ion-list>
      }

      <!-- Sync Status -->
      @if (wearableService.lastSync()) {
        <div class="sync-status">
          <ion-icon name="sync-outline"></ion-icon>
          <span>Last synced: {{ wearableService.lastSync() | date:'short' }}</span>
          <ion-button fill="clear" size="small" (click)="syncNow()">
            Sync Now
          </ion-button>
        </div>
      }

      <!-- Data Preview -->
      @if (wearableService.isConnected() && todayData) {
        <div class="section-header">
          <h2>Today's Data</h2>
        </div>

        <div class="data-cards">
          <div class="data-card">
            <ion-icon name="walk-outline"></ion-icon>
            <div class="value">{{ todayData.steps | number }}</div>
            <div class="label">Steps</div>
          </div>
          
          <div class="data-card">
            <ion-icon name="flame-outline"></ion-icon>
            <div class="value">{{ todayData.activeCalories | number }}</div>
            <div class="label">Calories</div>
          </div>
          
          @if (todayData.sleepHours) {
            <div class="data-card">
              <ion-icon name="bed-outline"></ion-icon>
              <div class="value">{{ todayData.sleepHours | number:'1.1-1' }}h</div>
              <div class="label">Sleep</div>
            </div>
          }
          
          @if (todayData.restingHeartRate) {
            <div class="data-card">
              <ion-icon name="heart-outline"></ion-icon>
              <div class="value">{{ todayData.restingHeartRate }}</div>
              <div class="label">Resting HR</div>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .section-header {
      margin: 24px 0 12px;
      
      h2 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 4px;
      }
      
      .section-description {
        font-size: 14px;
        color: var(--fitos-text-secondary);
        margin: 0;
      }
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: var(--fitos-bg-secondary);
      border-radius: 12px;
      margin: 16px 0;
      font-size: 14px;
      color: var(--fitos-text-secondary);
      
      ion-icon {
        font-size: 18px;
      }
    }

    .data-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 16px;
    }

    .data-card {
      background: var(--fitos-bg-secondary);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      
      ion-icon {
        font-size: 24px;
        color: var(--fitos-primary);
        margin-bottom: 8px;
      }
      
      .value {
        font-size: 24px;
        font-weight: 700;
        font-feature-settings: 'tnum';
      }
      
      .label {
        font-size: 12px;
        color: var(--fitos-text-secondary);
        margin-top: 4px;
      }
    }
  `]
})
export class WearablesPage implements OnInit {
  wearableService = inject(WearableDataService);
  private authService = inject(AuthService);
  private alertCtrl = inject(AlertController);

  platform = Capacitor.getPlatform();
  terraEnabled = environment.features?.terraIntegration ?? false;
  todayData: UnifiedWearableData | null = null;

  terraProviders = [
    { name: 'Garmin', icon: 'watch-outline', description: 'Activity, sleep, HRV' },
    { name: 'WHOOP', icon: 'pulse-outline', description: 'Recovery, strain, sleep' },
    { name: 'Oura', icon: 'ellipse-outline', description: 'Sleep, readiness, activity' },
    { name: 'Polar', icon: 'heart-outline', description: 'Heart rate, training load' }
  ];

  constructor() {
    addIcons({ watchOutline, heartOutline, bedOutline, syncOutline, checkmarkCircle, alertCircle });
  }

  async ngOnInit() {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      await this.wearableService.initialize(userId);
      await this.loadTodayData(userId);
    }
  }

  async connectNative() {
    const success = await this.wearableService.connectNative();
    if (success) {
      const userId = this.authService.currentUser()?.id;
      if (userId) {
        await this.loadTodayData(userId);
      }
    }
  }

  async connectTerra() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    try {
      const url = await this.wearableService.connectTerra(userId);
      await Browser.open({ url });
    } catch (error) {
      const alert = await this.alertCtrl.create({
        header: 'Connection Error',
        message: 'Unable to open wearable connection. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async disconnectProvider(provider: string) {
    const alert = await this.alertCtrl.create({
      header: 'Disconnect ' + provider,
      message: 'Are you sure you want to disconnect this device?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: async () => {
            const userId = this.authService.currentUser()?.id;
            if (userId) {
              await this.wearableService.disconnect(userId, provider);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  isProviderConnected(provider: string): boolean {
    return this.wearableService.connectedSources().includes(provider);
  }

  async syncNow() {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      await this.loadTodayData(userId);
    }
  }

  private async loadTodayData(userId: string) {
    this.todayData = await this.wearableService.getTodayData(userId);
  }
}
```

---

## Database Schema for Wearable Data

```sql
-- Store synced wearable data
CREATE TABLE wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT NOT NULL, -- 'healthkit', 'terra'
  provider TEXT, -- 'Apple Health', 'Garmin', 'WHOOP', etc.
  
  -- Activity
  steps INTEGER,
  active_calories INTEGER,
  total_calories INTEGER,
  distance_meters INTEGER,
  
  -- Heart
  resting_heart_rate INTEGER,
  heart_rate_variability INTEGER,
  
  -- Sleep
  sleep_minutes INTEGER,
  sleep_efficiency DECIMAL(5,2),
  sleep_awake_minutes INTEGER,
  sleep_light_minutes INTEGER,
  sleep_deep_minutes INTEGER,
  sleep_rem_minutes INTEGER,
  
  -- Body
  weight_kg DECIMAL(5,2),
  body_fat_percent DECIMAL(5,2),
  
  -- Meta
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,
  
  UNIQUE(user_id, date, source)
);

CREATE INDEX idx_wearable_user_date ON wearable_data(user_id, date DESC);

-- Store Terra user connections
CREATE TABLE terra_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  terra_user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY wearable_data_select ON wearable_data
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY wearable_data_insert ON wearable_data
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY terra_connections_all ON terra_connections
  FOR ALL USING (user_id = auth.uid());
```

---

## Testing Checklist

### Health Connect / HealthKit
- [ ] Permission request flow works
- [ ] Steps data syncs correctly
- [ ] Heart rate data syncs correctly
- [ ] Sleep data syncs correctly
- [ ] Weight data syncs correctly
- [ ] Workout write works
- [ ] Handles no data gracefully
- [ ] Handles revoked permissions

### Terra (When Implemented)
- [ ] Widget opens correctly
- [ ] Callback handles connection
- [ ] Activity data syncs
- [ ] Sleep data syncs
- [ ] Body data syncs
- [ ] Webhook handles updates
- [ ] Disconnect flow works

---

## Cost Summary

| Tier | Monthly Cost | Coverage |
|------|--------------|----------|
| Tier 1 (MVP) | $0 | 80%+ (Apple, Samsung, Google) |
| Tier 2 (Growth) | $399+ | 95%+ (adds Garmin, WHOOP, Oura) |
| Tier 3 (Scale) | $0.50/user | Healthcare/clinical |
