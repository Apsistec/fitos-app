import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';

@Component({
  selector: 'app-otp-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div
      class="otp-container"
      [class.error]="hasError()"
      [class.shake]="shaking()"
      [class.success]="isSuccess()"
      [class.disabled]="isDisabled()"
    >
      @for (i of digitIndices(); track i) {
        <input
          #digitInput
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="1"
          class="otp-digit"
          [class.filled]="digits()[i] !== ''"
          [class.focused]="focusedIndex() === i"
          [value]="digits()[i]"
          [disabled]="isDisabled()"
          (input)="onInput($event, i)"
          (keydown)="onKeyDown($event, i)"
          (focus)="onFocus(i)"
          (paste)="onPaste($event)"
          autocomplete="one-time-code"
        />
      }
    </div>
  `,
  styles: [`
    .otp-container {
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 16px 0;
    }

    .otp-digit {
      width: 48px;
      height: 56px;
      border: 2px solid var(--ion-color-light-shade);
      border-radius: 12px;
      background: var(--ion-background-color);
      color: var(--ion-text-color);
      font-size: 24px;
      font-weight: 700;
      text-align: center;
      caret-color: var(--ion-color-primary);
      transition: all 0.2s ease;
      -webkit-appearance: none;
      -moz-appearance: textfield;

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      &:focus {
        outline: none;
        border-color: var(--ion-color-primary);
        box-shadow: 0 0 0 3px rgba(var(--ion-color-primary-rgb), 0.2);
      }

      &.filled {
        border-color: var(--ion-color-primary);
        background: rgba(var(--ion-color-primary-rgb), 0.05);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .otp-container.error {
      .otp-digit {
        border-color: var(--ion-color-danger);
        background: rgba(var(--ion-color-danger-rgb), 0.05);

        &:focus {
          box-shadow: 0 0 0 3px rgba(var(--ion-color-danger-rgb), 0.2);
        }
      }
    }

    .otp-container.success {
      .otp-digit {
        border-color: var(--ion-color-success);
        background: rgba(var(--ion-color-success-rgb), 0.1);
      }
    }

    .otp-container.shake {
      animation: shake 0.5s ease-in-out;
    }

    .otp-container.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
      20%, 40%, 60%, 80% { transform: translateX(8px); }
    }

    /* Dark mode adjustments */
    :host-context(.dark) {
      .otp-digit {
        border-color: var(--ion-color-step-300);
        background: var(--ion-color-step-50);

        &.filled {
          background: rgba(var(--ion-color-primary-rgb), 0.15);
        }
      }
    }

    /* Responsive adjustments for smaller screens */
    @media (max-width: 360px) {
      .otp-container {
        gap: 6px;
      }

      .otp-digit {
        width: 42px;
        height: 50px;
        font-size: 20px;
      }
    }
  `],
})
export class OtpInputComponent implements AfterViewInit {
  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  @Input() set length(value: number) {
    this._length.set(value);
  }

  @Input() set error(value: boolean) {
    if (value && !this.hasError()) {
      this.triggerError();
    }
    this.hasError.set(value);
  }

  @Input() set success(value: boolean) {
    this.isSuccess.set(value);
  }

  @Input() set disabled(value: boolean) {
    this._disabled.set(value);
  }

  @Input() autofocus = true;

  @Output() codeComplete = new EventEmitter<string>();
  @Output() codeChange = new EventEmitter<string>();

  private _length = signal(6);
  private _disabled = signal(false);

  digits = signal<string[]>(['', '', '', '', '', '']);
  focusedIndex = signal<number>(0);
  hasError = signal(false);
  isSuccess = signal(false);
  shaking = signal(false);

  isDisabled = computed(() => this._disabled());

  digitIndices = computed(() => {
    const len = this._length();
    return Array.from({ length: len }, (_, i) => i);
  });

  currentCode = computed(() => this.digits().join(''));

  constructor() {
    // Reset digits array when length changes
    effect(() => {
      const len = this._length();
      this.digits.set(Array(len).fill(''));
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit(): void {
    if (this.autofocus) {
      setTimeout(() => this.focusInput(0), 100);
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    // Update the digit
    const newDigits = [...this.digits()];
    newDigits[index] = digit;
    this.digits.set(newDigits);

    // Clear error state on input
    if (this.hasError()) {
      this.hasError.set(false);
    }

    // Emit change
    this.codeChange.emit(this.currentCode());

    // Move to next input if we have a digit
    if (digit && index < this._length() - 1) {
      this.focusInput(index + 1);
    }

    // Check if complete
    if (this.isComplete()) {
      this.codeComplete.emit(this.currentCode());
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const key = event.key;

    switch (key) {
      case 'Backspace':
        event.preventDefault();
        this.handleBackspace(index);
        break;

      case 'Delete':
        event.preventDefault();
        this.handleDelete(index);
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          this.focusInput(index - 1);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (index < this._length() - 1) {
          this.focusInput(index + 1);
        }
        break;

      case 'Home':
        event.preventDefault();
        this.focusInput(0);
        break;

      case 'End':
        event.preventDefault();
        this.focusInput(this._length() - 1);
        break;

      default:
        // If it's not a digit, prevent input
        if (!/^\d$/.test(key) && !['Tab', 'Enter'].includes(key)) {
          event.preventDefault();
        }
    }
  }

  onFocus(index: number): void {
    this.focusedIndex.set(index);
    // Select the content when focusing
    const inputs = this.digitInputs?.toArray();
    if (inputs?.[index]) {
      inputs[index].nativeElement.select();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, this._length());

    if (digits.length > 0) {
      const newDigits = [...this.digits()];
      for (let i = 0; i < digits.length; i++) {
        newDigits[i] = digits[i];
      }
      this.digits.set(newDigits);

      // Clear error state
      if (this.hasError()) {
        this.hasError.set(false);
      }

      // Emit change
      this.codeChange.emit(this.currentCode());

      // Focus the next empty input or last input
      const nextEmptyIndex = newDigits.findIndex(d => d === '');
      if (nextEmptyIndex >= 0) {
        this.focusInput(nextEmptyIndex);
      } else {
        this.focusInput(this._length() - 1);
      }

      // Check if complete
      if (this.isComplete()) {
        this.codeComplete.emit(this.currentCode());
      }
    }
  }

  private handleBackspace(index: number): void {
    const newDigits = [...this.digits()];

    if (newDigits[index]) {
      // Clear current digit
      newDigits[index] = '';
      this.digits.set(newDigits);
    } else if (index > 0) {
      // Move to previous and clear it
      newDigits[index - 1] = '';
      this.digits.set(newDigits);
      this.focusInput(index - 1);
    }

    this.codeChange.emit(this.currentCode());
  }

  private handleDelete(index: number): void {
    const newDigits = [...this.digits()];
    newDigits[index] = '';
    this.digits.set(newDigits);
    this.codeChange.emit(this.currentCode());
  }

  private focusInput(index: number): void {
    this.focusedIndex.set(index);
    const inputs = this.digitInputs?.toArray();
    if (inputs?.[index]) {
      inputs[index].nativeElement.focus();
    }
  }

  private isComplete(): boolean {
    return this.digits().every(d => d !== '');
  }

  private triggerError(): void {
    this.shaking.set(true);
    setTimeout(() => {
      this.shaking.set(false);
    }, 500);
  }

  /** Public method to clear all digits */
  clear(): void {
    this.digits.set(Array(this._length()).fill(''));
    this.hasError.set(false);
    this.isSuccess.set(false);
    this.focusInput(0);
  }

  /** Public method to focus the first empty input */
  focus(): void {
    const emptyIndex = this.digits().findIndex(d => d === '');
    this.focusInput(emptyIndex >= 0 ? emptyIndex : 0);
  }
}
