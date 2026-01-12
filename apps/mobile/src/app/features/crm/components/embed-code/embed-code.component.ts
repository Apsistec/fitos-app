import { Component, inject, input, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@capacitor/clipboard';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { copyOutline, checkmarkOutline } from 'ionicons/icons';
import { HapticService } from '@app/core/services/haptic.service';

type EmbedType = 'iframe' | 'script' | 'direct';

/**
 * EmbedCodeComponent - Generate and display embed code
 *
 * Features:
 * - Multiple embed options (iframe, script, direct link)
 * - Copy to clipboard
 * - Installation instructions
 * - Customization options
 */
@Component({
  selector: 'app-embed-code',
  standalone: true,
  imports: [
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Embed Code</ion-card-title>
        <ion-text color="medium">
          <p class="subtitle">Add this form to your website</p>
        </ion-text>
      </ion-card-header>

      <ion-card-content>
        <!-- Embed Type Selector -->
        <ion-segment [(ngModel)]="embedType" (ionChange)="onEmbedTypeChange()">
          <ion-segment-button value="iframe">
            <ion-label>iFrame</ion-label>
          </ion-segment-button>
          <ion-segment-button value="script">
            <ion-label>JavaScript</ion-label>
          </ion-segment-button>
          <ion-segment-button value="direct">
            <ion-label>Direct Link</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Code Display -->
        <div class="code-container">
          <pre class="code-block">{{ getEmbedCode() }}</pre>
          <ion-button
            size="small"
            (click)="copyCode()"
            class="copy-button"
          >
            <ion-icon
              slot="start"
              [name]="copied() ? 'checkmark-outline' : 'copy-outline'"
            ></ion-icon>
            {{ copied() ? 'Copied!' : 'Copy' }}
          </ion-button>
        </div>

        <!-- Instructions -->
        <div class="instructions">
          <h3>Installation Instructions</h3>

          @if (embedType() === 'iframe') {
            <ol>
              <li>Copy the code above</li>
              <li>Paste it into your website's HTML where you want the form to appear</li>
              <li>Adjust the width and height attributes as needed</li>
              <li>The form will automatically submit leads to your FitOS account</li>
            </ol>

            <div class="note">
              <ion-text color="warning">
                <p><strong>Note:</strong> iFrames work on all websites but may have limited styling options.</p>
              </ion-text>
            </div>
          }

          @if (embedType() === 'script') {
            <ol>
              <li>Copy the code above</li>
              <li>Paste it into your website's HTML where you want the form to appear</li>
              <li>The form will blend seamlessly with your site's styling</li>
              <li>Leads will be sent directly to your FitOS account</li>
            </ol>

            <div class="note">
              <ion-text color="warning">
                <p><strong>Note:</strong> JavaScript embed provides the best user experience but requires your site to allow external scripts.</p>
              </ion-text>
            </div>
          }

          @if (embedType() === 'direct') {
            <ol>
              <li>Copy the link above</li>
              <li>Add it to your website as a button or link</li>
              <li>Users will be redirected to a FitOS-hosted form page</li>
              <li>After submission, they'll see your thank you message</li>
            </ol>

            <div class="note">
              <ion-text color="primary">
                <p><strong>Tip:</strong> Use this option if you can't embed code on your website (e.g., social media bios, email signatures).</p>
              </ion-text>
            </div>
          }
        </div>

        <!-- Customization -->
        @if (embedType() === 'iframe' || embedType() === 'script') {
          <div class="customization">
            <h3>Customization</h3>
            <p>You can customize the form's appearance by adding these URL parameters:</p>
            <ul>
              <li><code>theme=dark</code> - Use dark theme</li>
              <li><code>accent=your-color</code> - Custom accent color (hex without #)</li>
              <li><code>hideHeader=true</code> - Hide the form title</li>
            </ul>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .subtitle {
      margin: 4px 0 0 0;
      font-size: var(--fitos-text-sm);
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary);
      margin-bottom: var(--fitos-space-4);
    }

    .code-container {
      position: relative;
      margin: var(--fitos-space-4) 0;
    }

    .code-block {
      background: var(--fitos-bg-tertiary);
      border: 1px solid var(--fitos-border-subtle);
      border-radius: var(--fitos-radius-md);
      padding: var(--fitos-space-4);
      font-family: var(--fitos-font-mono);
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-primary);
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
    }

    .copy-button {
      position: absolute;
      top: var(--fitos-space-2);
      right: var(--fitos-space-2);
    }

    .instructions {
      margin-top: var(--fitos-space-6);

      h3 {
        margin: 0 0 var(--fitos-space-3) 0;
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      ol {
        margin: 0;
        padding-left: var(--fitos-space-6);

        li {
          margin: var(--fitos-space-2) 0;
          font-size: var(--fitos-text-sm);
          color: var(--fitos-text-secondary);
        }
      }
    }

    .note {
      margin-top: var(--fitos-space-3);
      padding: var(--fitos-space-3);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);
      border-left: 3px solid var(--ion-color-warning);

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
      }
    }

    .customization {
      margin-top: var(--fitos-space-6);
      padding-top: var(--fitos-space-4);
      border-top: 1px solid var(--fitos-border-subtle);

      h3 {
        margin: 0 0 var(--fitos-space-3) 0;
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      p {
        margin: 0 0 var(--fitos-space-2) 0;
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-secondary);
      }

      ul {
        margin: 0;
        padding-left: var(--fitos-space-6);

        li {
          margin: var(--fitos-space-1) 0;
          font-size: var(--fitos-text-sm);
          color: var(--fitos-text-secondary);

          code {
            font-family: var(--fitos-font-mono);
            background: var(--fitos-bg-tertiary);
            padding: 2px 6px;
            border-radius: var(--fitos-radius-sm);
            font-size: var(--fitos-text-xs);
          }
        }
      }
    }
  `],
})
export class EmbedCodeComponent {
  private haptic = inject(HapticService);

  // Inputs
  formId = input.required<string>();
  formName = input<string>('Lead Capture Form');

  // State
  embedType = signal<EmbedType>('iframe');
  copied = signal(false);

  constructor() {
    addIcons({ copyOutline, checkmarkOutline });
  }

  onEmbedTypeChange(): void {
    this.haptic.light();
    this.copied.set(false);
  }

  getEmbedCode(): string {
    const baseUrl = 'https://forms.fitos.app'; // TODO: Get from environment
    const formUrl = `${baseUrl}/lead/${this.formId()}`;

    switch (this.embedType()) {
      case 'iframe':
        return `<iframe
  src="${formUrl}"
  width="100%"
  height="600"
  frameborder="0"
  title="${this.formName()}"
></iframe>`;

      case 'script':
        return `<div id="fitos-lead-form"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed.js';
    script.async = true;
    script.onload = function() {
      FitosForm.init({
        formId: '${this.formId()}',
        target: '#fitos-lead-form'
      });
    };
    document.head.appendChild(script);
  })();
</script>`;

      case 'direct':
        return formUrl;

      default:
        return '';
    }
  }

  async copyCode(): Promise<void> {
    try {
      await Clipboard.write({
        string: this.getEmbedCode(),
      });

      this.copied.set(true);
      await this.haptic.success();

      // Reset copied state after 3 seconds
      setTimeout(() => {
        this.copied.set(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      await this.haptic.error();
    }
  }
}
