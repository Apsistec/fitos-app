import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonProgressBar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { playOutline, pauseOutline, stopOutline, closeOutline } from 'ionicons/icons';
import { HapticService } from '../../../core/services/haptic.service';

// Register icons at file level
addIcons({ playOutline, pauseOutline, stopOutline, closeOutline });

@Component({
  standalone: true,
  selector: 'app-rest-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [

    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
    IonProgressBar
  ],
  template: `
    <ion-card class="rest-timer-card">
      <ion-card-content>
        <div class="timer-header">
          <ion-text color="primary">
            <h2>Rest Period</h2>
          </ion-text>
          <ion-button fill="clear" size="small" (click)="onSkip()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </div>

        <div class="timer-display">
          <div class="time" [class.warning]="timeRemaining() <= 10">
            {{ formatTime(timeRemaining()) }}
          </div>
          <div class="total-time">
            <ion-text color="medium">
              <small>of {{ formatTime(restSeconds) }}</small>
            </ion-text>
          </div>
        </div>

        <ion-progress-bar
          [value]="progress()"
          [color]="timeRemaining() <= 10 ? 'warning' : 'primary'"
        ></ion-progress-bar>

        <div class="timer-controls">
          @if (!isRunning()) {
            <ion-button expand="block" (click)="start()">
              <ion-icon slot="start" name="play-outline"></ion-icon>
              Start
            </ion-button>
          } @else {
            <ion-button expand="block" fill="outline" (click)="pause()">
              <ion-icon slot="start" name="pause-outline"></ion-icon>
              Pause
            </ion-button>
          }

          <ion-button expand="block" fill="clear" (click)="onSkip()">
            Skip Rest
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .rest-timer-card {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 400px;
      z-index: 1000;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateX(-50%) translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }

    .timer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .timer-header h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .timer-display {
      text-align: center;
      margin: 24px 0;
    }

    .time {
      font-size: 3.5rem;
      font-weight: 700;
      color: var(--ion-color-primary);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .time.warning {
      color: var(--ion-color-warning);
      animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    .total-time {
      margin-top: 8px;
    }

    ion-progress-bar {
      margin: 16px 0;
      height: 8px;
      border-radius: 4px;
    }

    .timer-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .timer-controls ion-button {
      margin: 0;
    }
  `]
})
export class RestTimerComponent implements OnInit, OnDestroy {
  private haptic = inject(HapticService);

  @Input() restSeconds: number = 90;
  @Input() autoStart: boolean = true;
  @Output() complete = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();

  timeRemaining = signal(90);
  isRunning = signal(false);
  progress = signal(0);

  private interval?: number;
  private startTime?: number;
  private pausedTime: number = 0;
  private warningHapticTriggered = false;

  ngOnInit() {
    this.timeRemaining.set(this.restSeconds);

    if (this.autoStart) {
      this.start();
    }
  }

  ngOnDestroy() {
    this.clearInterval();
  }

  start() {
    if (this.isRunning()) return;

    this.startTime = Date.now() - this.pausedTime;
    this.isRunning.set(true);

    this.interval = window.setInterval(() => {
      this.tick();
    }, 100);
  }

  pause() {
    if (!this.isRunning()) return;

    this.pausedTime = Date.now() - (this.startTime || 0);
    this.isRunning.set(false);
    this.clearInterval();
  }

  private tick() {
    if (!this.startTime) return;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const remaining = Math.max(0, this.restSeconds - elapsed);

    this.timeRemaining.set(remaining);
    this.progress.set(elapsed / this.restSeconds);

    // Haptic warning at 10 seconds remaining
    if (remaining === 10 && !this.warningHapticTriggered) {
      this.haptic.light();
      this.warningHapticTriggered = true;
    }

    if (remaining === 0) {
      this.onComplete();
    }
  }

  private async onComplete() {
    this.clearInterval();
    this.isRunning.set(false);

    // Haptic notification on timer complete
    await this.haptic.warning();

    this.complete.emit();
  }

  onSkip() {
    this.clearInterval();
    this.skip.emit();
  }

  private clearInterval() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
