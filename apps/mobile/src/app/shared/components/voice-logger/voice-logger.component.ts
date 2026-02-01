import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonIcon,
  IonSpinner,
  IonRippleEffect,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { micOutline, micOffOutline, stopOutline } from 'ionicons/icons';
import { VoiceService, ParsedWorkoutCommand } from '../../../core/services/voice.service';

@Component({
  selector: 'app-voice-logger',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner, IonRippleEffect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="voice-logger">
      <!-- Mic Button -->
      <button
        class="mic-button"
        [class.listening]="voiceService.isListening()"
        [class.error]="voiceService.hasError()"
        [disabled]="voiceService.isProcessing()"
        (click)="toggleListening()"
        ion-ripple
      >
        <ion-ripple-effect></ion-ripple-effect>
        @if (voiceService.isProcessing()) {
          <ion-spinner name="crescent"></ion-spinner>
        } @else if (voiceService.isListening()) {
          <ion-icon name="stop-outline"></ion-icon>
        } @else {
          <ion-icon name="mic-outline"></ion-icon>
        }
      </button>

      <!-- Status Indicator -->
      <div class="status-indicator">
        @if (voiceService.isListening()) {
          <div class="pulse-ring"></div>
          <span class="status-text">Listening...</span>
        } @else if (voiceService.hasError()) {
          <span class="status-text error">{{ voiceService.error() }}</span>
        } @else {
          <span class="status-text">Tap to speak</span>
        }
      </div>

      <!-- Transcript Display -->
      @if (voiceService.displayTranscript()) {
        <div class="transcript-container">
          <p class="transcript">{{ voiceService.displayTranscript() }}</p>
          @if (voiceService.confidence() > 0) {
            <span class="confidence">{{ (voiceService.confidence() * 100).toFixed(0) }}% confident</span>
          }
        </div>
      }

      <!-- Quick Commands -->
      <div class="quick-commands">
        <button class="command-chip" (click)="emitCommand('repeat')">
          Repeat
        </button>
        <button class="command-chip" (click)="emitCommand('skip')">
          Skip
        </button>
        <button class="command-chip" (click)="emitCommand('next')">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .voice-logger {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--fitos-space-4);
      padding: var(--fitos-space-4);
    }

    .mic-button {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: none;
      background: var(--fitos-accent-primary);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--fitos-duration-normal) var(--fitos-ease-default);
      overflow: hidden;

      ion-icon {
        font-size: 32px;
      }

      ion-spinner {
        --color: white;
      }

      &:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: var(--fitos-glow-primary);
      }

      &:active:not(:disabled) {
        transform: scale(0.95);
      }

      &.listening {
        background: var(--fitos-status-error);
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
        animation: pulse 1.5s ease-in-out infinite;
      }

      &.error {
        background: var(--fitos-status-warning);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
      }
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      min-height: 24px;
    }

    .pulse-ring {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--fitos-status-error);
      animation: pulse-dot 1s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-text {
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);

      &.error {
        color: var(--fitos-status-error);
      }
    }

    .transcript-container {
      width: 100%;
      max-width: 400px;
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-lg);
      padding: var(--fitos-space-4);
      text-align: center;
    }

    .transcript {
      margin: 0;
      font-size: var(--fitos-text-lg);
      color: var(--fitos-text-primary);
      line-height: 1.4;
    }

    .confidence {
      display: block;
      margin-top: var(--fitos-space-2);
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
    }

    .quick-commands {
      display: flex;
      gap: var(--fitos-space-2);
      flex-wrap: wrap;
      justify-content: center;
    }

    .command-chip {
      padding: var(--fitos-space-2) var(--fitos-space-4);
      border-radius: var(--fitos-radius-full);
      border: 1px solid var(--fitos-border-default);
      background: var(--fitos-bg-secondary);
      color: var(--fitos-text-secondary);
      font-size: var(--fitos-text-sm);
      cursor: pointer;
      transition: all var(--fitos-duration-fast);

      &:hover {
        border-color: var(--fitos-accent-primary);
        color: var(--fitos-accent-primary);
      }

      &:active {
        background: var(--fitos-bg-tertiary);
      }
    }
  `],
})
export class VoiceLoggerComponent {
  voiceService = inject(VoiceService);

  // Output events
  commandParsed = output<ParsedWorkoutCommand>();

  constructor() {
    addIcons({ micOutline, micOffOutline, stopOutline });
  }

  async toggleListening(): Promise<void> {
    if (this.voiceService.isListening()) {
      this.voiceService.stopListening();
      
      // Parse the final transcript
      const transcript = this.voiceService.transcript();
      if (transcript) {
        const command = this.voiceService.parseWorkoutCommand(transcript);
        this.commandParsed.emit(command);
        
        // Provide audio feedback
        if (command.type !== 'unknown') {
          await this.provideFeedback(command);
        }
      }
    } else {
      await this.voiceService.startListening({
        keywords: ['reps', 'pounds', 'repeat', 'skip', 'next'],
      });
    }
  }

  emitCommand(type: 'repeat' | 'skip' | 'next'): void {
    this.commandParsed.emit({ type });
  }

  private async provideFeedback(command: ParsedWorkoutCommand): Promise<void> {
    let message = '';
    
    switch (command.type) {
      case 'log_set':
        if (command.reps && command.weight) {
          message = `Logged ${command.reps} reps at ${command.weight} ${command.unit || 'pounds'}`;
        } else if (command.reps) {
          message = `Logged ${command.reps} reps`;
        }
        break;
      case 'repeat':
        message = 'Repeating last set';
        break;
      case 'skip':
        message = 'Skipping exercise';
        break;
      case 'next':
        message = 'Moving to next';
        break;
      case 'rest':
        message = command.duration 
          ? `Starting ${command.duration} second rest`
          : 'Starting rest timer';
        break;
      case 'done':
        message = 'Workout complete';
        break;
    }

    if (message) {
      await this.voiceService.speak(message);
    }
  }
}
