import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTextarea,
  IonToggle,
  IonChip,
  IonSkeletonText,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  globeOutline,
  starOutline,
  addOutline,
  closeOutline,
  eyeOutline,
  checkmarkOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  TrainerPublicProfileService,
  UpsertProfileDto,
  Certification,
  SPECIALTY_TAGS,
} from '../../../../core/services/trainer-public-profile.service';
import { AuthService } from '../../../../core/services/auth.service';

// ─── Form state ───────────────────────────────────────────────────────────────

interface ProfileForm {
  username:                   string;
  bio:                        string;
  specialty_tags:             string[];
  hero_photo_url:             string;
  years_experience:           string;  // string for input binding
  certifications:             Certification[];
  is_accepting_clients:       boolean;
  intro_session_price_cents:  string;  // display as dollars
  booking_url_override:       string;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonTextarea,
    IonToggle,
    IonChip,
    IonSkeletonText,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Public Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="previewProfile()" [disabled]="!form().username">
            <ion-icon name="eye-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-body">

        <!-- ── Username claim ─────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Your Profile URL</div>
          <div class="url-preview">
            <span class="url-base">nutrifitos.com/t/</span>
            <ion-input
              class="url-input"
              placeholder="yourname"
              [value]="form().username"
              (ionInput)="updateField('username', $event)"
              autocapitalize="none"
              autocorrect="off"
              inputmode="url"
            ></ion-input>
          </div>
          @if (form().username) {
            @if (usernameChecking()) {
              <p class="url-status checking">Checking availability…</p>
            } @else if (usernameAvailable() === true) {
              <p class="url-status available">✓ {{ form().username }} is available!</p>
            } @else if (usernameAvailable() === false) {
              <p class="url-status taken">✗ That username is already taken</p>
            }
          }
        </div>

        <!-- ── Accepting clients toggle ───────────────────────────────────── -->
        <div class="form-section">
          <ion-list>
            <ion-item>
              <ion-label>
                <h3>Accepting New Clients</h3>
                <p>Shown on your public profile</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [checked]="form().is_accepting_clients"
                (ionChange)="updateField('is_accepting_clients', $event)"
              ></ion-toggle>
            </ion-item>
          </ion-list>
        </div>

        <!-- ── Bio ───────────────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Bio</div>
          <div class="bio-container">
            <ion-textarea
              placeholder="Tell prospective clients about your training philosophy, background, and what makes you unique…"
              [value]="form().bio"
              (ionInput)="updateField('bio', $event)"
              :rows="5"
              autocapitalize="sentences"
            ></ion-textarea>
            <div class="char-count" [class.over]="form().bio.length > 500">
              {{ form().bio.length }}/500
            </div>
          </div>
        </div>

        <!-- ── Specialty tags ─────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Specialties</div>
          <div class="tags-grid">
            @for (tag of allTags; track tag) {
              <ion-chip
                [class.selected]="isTagSelected(tag)"
                (click)="toggleTag(tag)"
              >
                {{ tag }}
                @if (isTagSelected(tag)) {
                  <ion-icon name="checkmark-outline"></ion-icon>
                }
              </ion-chip>
            }
          </div>
        </div>

        <!-- ── Hero photo URL ─────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Profile Photo URL</div>
          <ion-list>
            <ion-item>
              <ion-icon name="person-outline" slot="start"></ion-icon>
              <ion-input
                placeholder="https://example.com/your-photo.jpg"
                [value]="form().hero_photo_url"
                (ionInput)="updateField('hero_photo_url', $event)"
                type="url"
                inputmode="url"
              ></ion-input>
            </ion-item>
          </ion-list>
          @if (form().hero_photo_url) {
            <div class="photo-preview">
              <img [src]="form().hero_photo_url" alt="Profile photo preview" class="preview-img" />
            </div>
          }
        </div>

        <!-- ── Experience & intro price ──────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Experience & Pricing</div>
          <ion-list>
            <ion-item>
              <ion-label position="stacked">Years of Experience</ion-label>
              <ion-input
                type="number"
                placeholder="e.g. 5"
                [value]="form().years_experience"
                (ionInput)="updateField('years_experience', $event)"
                inputmode="numeric"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Intro Session Price ($ USD, 0 = free)</ion-label>
              <ion-input
                type="number"
                placeholder="0"
                [value]="form().intro_session_price_cents"
                (ionInput)="updateField('intro_session_price_cents', $event)"
                inputmode="decimal"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Custom Booking URL (optional)</ion-label>
              <ion-input
                type="url"
                placeholder="https://calendly.com/yourname (leave blank to use FitOS)"
                [value]="form().booking_url_override"
                (ionInput)="updateField('booking_url_override', $event)"
                inputmode="url"
              ></ion-input>
            </ion-item>
          </ion-list>
        </div>

        <!-- ── Certifications ─────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-label">Certifications</div>
            <ion-button fill="clear" size="small" (click)="addCertification()">
              <ion-icon name="add-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>

          @if (form().certifications.length === 0) {
            <p class="empty-hint">Add your certifications to build trust with prospective clients.</p>
          }

          @for (cert of form().certifications; track $index; let i = $index) {
            <div class="cert-row">
              <div class="cert-info">
                <div class="cert-name">{{ cert.name }}</div>
                <div class="cert-meta">{{ cert.issuer }}@if (cert.year) { · {{ cert.year }} }</div>
              </div>
              <ion-button fill="clear" size="small" color="danger" (click)="removeCertification(i)">
                <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          }
        </div>

        <!-- ── Save button ────────────────────────────────────────────────── -->
        <div class="save-section">
          <ion-button
            expand="block"
            [disabled]="!isValid() || isSaving()"
            (click)="save()"
          >
            {{ isSaving() ? 'Saving…' : 'Save Public Profile' }}
          </ion-button>

          @if (form().username && hasExistingProfile()) {
            <ion-button
              expand="block"
              fill="outline"
              class="preview-btn"
              (click)="previewProfile()"
            >
              <ion-icon name="globe-outline" slot="start"></ion-icon>
              Preview Live Profile
            </ion-button>
          }
        </div>

        <div class="bottom-spacer"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .page-body { padding: 12px 16px; }

    /* ── Section ─────────────────────────────────── */
    .form-section {
      background: rgba(255,255,255,0.04);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .section-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 10px;
    }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-header .section-label { margin-bottom: 0; }

    /* ── URL input ─────────────────────────────────── */
    .url-preview {
      display: flex; align-items: center; gap: 0;
      background: rgba(255,255,255,0.06); border-radius: 10px;
      padding: 8px 12px;
    }
    .url-base {
      font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3);
      white-space: nowrap; flex-shrink: 0;
    }
    .url-input { flex: 1; --background: transparent; font-size: 14px; font-weight: 700; }
    .url-status {
      font-size: 12px; margin: 6px 0 0;
      &.available { color: var(--fitos-accent-primary, #10B981); }
      &.taken     { color: #EF4444; }
      &.checking  { color: var(--fitos-text-secondary, #A3A3A3); }
    }

    /* ── Bio ─────────────────────────────────────── */
    .bio-container { position: relative; }
    ion-textarea { --background: rgba(255,255,255,0.04); border-radius: 10px; }
    .char-count {
      text-align: right; font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B);
      margin-top: 4px;
      &.over { color: #EF4444; }
    }

    /* ── Tags ─────────────────────────────────────── */
    .tags-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    ion-chip {
      --background: rgba(255,255,255,0.06);
      --color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 13px; cursor: pointer;
      &.selected {
        --background: rgba(16,185,129,0.15);
        --color: var(--fitos-accent-primary, #10B981);
        border: 1px solid rgba(16,185,129,0.3);
      }
    }

    /* ── Photo preview ─────────────────────────────── */
    .photo-preview { margin-top: 12px; text-align: center; }
    .preview-img {
      width: 100px; height: 100px; border-radius: 50%;
      object-fit: cover; border: 2px solid rgba(255,255,255,0.1);
    }

    /* ── Ion list ──────────────────────────────────── */
    ion-list { background: transparent; margin: 0; }
    ion-item { --background: transparent; --border-color: rgba(255,255,255,0.06); }
    ion-label h3 { font-size: 14px; font-weight: 700; }
    ion-label p  { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }

    /* ── Certifications ─────────────────────────────── */
    .empty-hint {
      font-size: 13px; color: var(--fitos-text-tertiary, #6B6B6B);
      text-align: center; padding: 8px 0;
    }
    .cert-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
      &:last-of-type { border-bottom: none; }
    }
    .cert-name { font-size: 14px; font-weight: 700; }
    .cert-meta { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }

    /* ── Save ─────────────────────────────────────── */
    .save-section { margin-top: 8px; }
    .preview-btn { margin-top: 10px; --border-radius: 12px; }

    .bottom-spacer { height: 32px; }
  `],
})
export class PublicProfilePage implements OnInit {
  private profileService = inject(TrainerPublicProfileService);
  private authService    = inject(AuthService);
  private router         = inject(Router);
  private alertCtrl      = inject(AlertController);
  private toastCtrl      = inject(ToastController);

  readonly allTags = SPECIALTY_TAGS;

  form = signal<ProfileForm>({
    username:                  '',
    bio:                       '',
    specialty_tags:            [],
    hero_photo_url:            '',
    years_experience:          '',
    certifications:            [],
    is_accepting_clients:      true,
    intro_session_price_cents: '',
    booking_url_override:      '',
  });

  isSaving           = signal(false);
  usernameChecking   = signal(false);
  usernameAvailable  = signal<boolean | null>(null);
  hasExistingProfile = signal(false);

  private usernameCheckTimer: ReturnType<typeof setTimeout> | null = null;

  isValid = computed(() => {
    const f = this.form();
    return (
      f.username.trim().length >= 3 &&
      f.username.trim().length <= 30 &&
      /^[a-z0-9_-]+$/i.test(f.username) &&
      f.bio.length <= 500 &&
      usernameAvailable !== null
    );
  });

  async ngOnInit(): Promise<void> {
    const existing = await this.profileService.getMyProfile();
    if (existing) {
      this.hasExistingProfile.set(true);
      this.form.set({
        username:                  existing.username,
        bio:                       existing.bio ?? '',
        specialty_tags:            existing.specialty_tags,
        hero_photo_url:            existing.hero_photo_url ?? '',
        years_experience:          existing.years_experience?.toString() ?? '',
        certifications:            existing.certifications,
        is_accepting_clients:      existing.is_accepting_clients,
        intro_session_price_cents: existing.intro_session_price_cents
          ? (existing.intro_session_price_cents / 100).toString()
          : '',
        booking_url_override:      existing.booking_url_override ?? '',
      });
      // Existing username is always "available" (it's theirs)
      this.usernameAvailable.set(true);
    }
  }

  // ── Field update handler ────────────────────────────────────────────────────

  updateField(field: keyof ProfileForm, event: Event | CustomEvent): void {
    const val = (event as CustomEvent).detail?.value ?? (event as CustomEvent).detail?.checked;

    this.form.update((f) => ({ ...f, [field]: val }));

    if (field === 'username') {
      this.scheduleUsernameCheck(String(val ?? ''));
    }
  }

  // ── Username availability debounce ──────────────────────────────────────────

  private scheduleUsernameCheck(username: string): void {
    if (this.usernameCheckTimer) clearTimeout(this.usernameCheckTimer);
    this.usernameAvailable.set(null);

    if (username.length < 3) return;

    // Don't re-check if it's their current username
    const existing = this.profileService.myProfile();
    if (existing && existing.username === username.toLowerCase()) {
      this.usernameAvailable.set(true);
      return;
    }

    this.usernameChecking.set(true);
    this.usernameCheckTimer = setTimeout(async () => {
      const available = await this.profileService.isUsernameAvailable(username);
      this.usernameAvailable.set(available);
      this.usernameChecking.set(false);
    }, 600);
  }

  // ── Specialty tags ──────────────────────────────────────────────────────────

  isTagSelected(tag: string): boolean {
    return this.form().specialty_tags.includes(tag);
  }

  toggleTag(tag: string): void {
    this.form.update((f) => {
      const selected = f.specialty_tags.includes(tag);
      return {
        ...f,
        specialty_tags: selected
          ? f.specialty_tags.filter((t) => t !== tag)
          : [...f.specialty_tags, tag],
      };
    });
  }

  // ── Certifications ──────────────────────────────────────────────────────────

  async addCertification(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header:  'Add Certification',
      inputs: [
        { name: 'name',   type: 'text',   placeholder: 'Certification name (e.g. NASM CPT)', attributes: { required: true } },
        { name: 'issuer', type: 'text',   placeholder: 'Issuing organization (e.g. NASM)' },
        { name: 'year',   type: 'number', placeholder: 'Year obtained (e.g. 2021)', min: 1980, max: new Date().getFullYear() },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data: { name: string; issuer: string; year: string }) => {
            if (!data.name?.trim()) return false;
            this.form.update((f) => ({
              ...f,
              certifications: [
                ...f.certifications,
                { name: data.name.trim(), issuer: data.issuer?.trim() ?? '', year: parseInt(data.year) || 0 },
              ],
            }));
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  removeCertification(index: number): void {
    this.form.update((f) => ({
      ...f,
      certifications: f.certifications.filter((_, i) => i !== index),
    }));
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;

    this.isSaving.set(true);

    const f = this.form();
    const dto: UpsertProfileDto = {
      username:                  f.username.toLowerCase().trim(),
      bio:                       f.bio.trim() || null,
      specialty_tags:            f.specialty_tags,
      hero_photo_url:            f.hero_photo_url.trim() || null,
      years_experience:          f.years_experience ? parseInt(f.years_experience) : null,
      certifications:            f.certifications,
      is_accepting_clients:      f.is_accepting_clients,
      intro_session_price_cents: f.intro_session_price_cents
        ? Math.round(parseFloat(f.intro_session_price_cents) * 100)
        : null,
      booking_url_override:      f.booking_url_override.trim() || null,
    };

    const saved = await this.profileService.saveProfile(dto);
    this.isSaving.set(false);

    if (saved) {
      this.hasExistingProfile.set(true);
      const toast = await this.toastCtrl.create({
        message:  'Public profile saved! 🎉',
        duration: 2500,
        color:    'success',
        position: 'top',
      });
      await toast.present();
    } else {
      const toast = await this.toastCtrl.create({
        message:  this.profileService.error() ?? 'Failed to save profile.',
        duration: 3000,
        color:    'warning',
        position: 'top',
      });
      await toast.present();
    }
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  previewProfile(): void {
    const username = this.form().username;
    if (!username) return;
    // Opens the SSR landing page in the system browser
    import('@capacitor/browser').then(({ Browser }) => {
      Browser.open({ url: this.profileService.publicProfileUrl(username) });
    });
  }
}
