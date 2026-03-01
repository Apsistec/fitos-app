import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonNote,
  IonSpinner,
  IonReorder,
  IonReorderGroup,
  IonChip,
  AlertController,
  ToastController,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  reorderThreeOutline,
  chatbubbleEllipsesOutline,
  happyOutline,
  checkmarkCircleOutline,
  eyeOutline,
  calendarOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  CheckinService,
  CheckinQuestion,
  CheckinTemplate,
  CreateTemplateDto,
  QuestionType,
} from '../../../../core/services/checkin.service';

// ─── Day options ─────────────────────────────────────────────────────────────
const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const QUESTION_TYPE_META: Record<QuestionType, { icon: string; label: string; hint: string }> = {
  rating:  { icon: 'happy-outline',              label: 'Emoji Rating (1–5)', hint: 'Client picks a mood score' },
  text:    { icon: 'chatbubble-ellipses-outline', label: 'Free Text',          hint: 'Client types a short answer' },
  yes_no:  { icon: 'checkmark-circle-outline',   label: 'Yes / No',           hint: 'Simple boolean question' },
};

function newQuestion(): CheckinQuestion {
  return {
    id:       crypto.randomUUID(),
    text:     '',
    type:     'rating',
    required: true,
  };
}

@Component({
  selector: 'app-checkin-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonNote,
    IonSpinner,
    IonReorder,
    IonReorderGroup,
    IonChip,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/clients"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Edit Check-In' : 'New Check-In' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [disabled]="isSaving() || !isValid()">
            @if (isSaving()) {
              <ion-spinner name="crescent" slot="icon-only"></ion-spinner>
            } @else {
              Save
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="builder-body">

        <!-- ── Template name ────────────────────────────────────────────── -->
        <div class="section-header">Template Name</div>
        <ion-list>
          <ion-item>
            <ion-input
              [value]="name()"
              (ionInput)="name.set($event.detail.value ?? '')"
              placeholder="e.g. Weekly Check-In"
              maxlength="80"
              clearInput
            ></ion-input>
          </ion-item>
        </ion-list>

        <!-- ── Questions ────────────────────────────────────────────────── -->
        <div class="section-header">
          Questions
          <span class="section-sub">(drag to reorder)</span>
        </div>

        <ion-list>
          <ion-reorder-group [disabled]="false" (ionItemReorder)="onReorder($event)">
            @for (q of questions(); track q.id; let i = $index) {
              <ion-item>
                <div class="question-row">
                  <div class="q-number">{{ i + 1 }}</div>
                  <div class="q-body">
                    <ion-input
                      [value]="q.text"
                      (ionInput)="updateQuestion(i, { text: $event.detail.value ?? '' })"
                      placeholder="Ask your client something…"
                      maxlength="200"
                    ></ion-input>
                    <div class="q-meta">
                      <ion-select
                        [value]="q.type"
                        (ionChange)="updateQuestion(i, { type: $event.detail.value })"
                        interface="action-sheet"
                        class="type-select"
                      >
                        @for (opt of questionTypeOptions; track opt.value) {
                          <ion-select-option [value]="opt.value">
                            {{ opt.label }}
                          </ion-select-option>
                        }
                      </ion-select>
                      <ion-chip
                        [color]="q.required ? 'primary' : 'medium'"
                        (click)="updateQuestion(i, { required: !q.required })"
                        class="required-chip"
                      >
                        {{ q.required ? 'Required' : 'Optional' }}
                      </ion-chip>
                    </div>
                  </div>
                  <ion-button
                    fill="clear"
                    color="danger"
                    size="small"
                    (click)="removeQuestion(i)"
                    [disabled]="questions().length <= 1"
                  >
                    <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
                <ion-reorder slot="end"></ion-reorder>
              </ion-item>
            }
          </ion-reorder-group>

          <ion-item button detail="false" (click)="addQuestion()" [disabled]="questions().length >= 10">
            <ion-icon name="add-outline" slot="start" color="primary"></ion-icon>
            <ion-label color="primary">Add question</ion-label>
          </ion-item>
        </ion-list>

        <!-- ── Schedule ─────────────────────────────────────────────────── -->
        <div class="section-header">Schedule <span class="section-sub">(optional)</span></div>
        <ion-list>
          <ion-item>
            <ion-label>Send automatically</ion-label>
            <ion-toggle
              [checked]="isScheduled()"
              (ionChange)="onScheduleToggle($event.detail.checked)"
              slot="end"
            ></ion-toggle>
          </ion-item>

          @if (isScheduled()) {
            <ion-item>
              <ion-icon name="calendar-outline" slot="start" color="medium"></ion-icon>
              <ion-label position="stacked">Day of week</ion-label>
              <ion-select
                [value]="sendDay()"
                (ionChange)="sendDay.set($event.detail.value)"
                interface="action-sheet"
              >
                @for (d of days; track d.value) {
                  <ion-select-option [value]="d.value">{{ d.label }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-icon name="time-outline" slot="start" color="medium"></ion-icon>
              <ion-label position="stacked">Send time (UTC)</ion-label>
              <ion-input
                type="time"
                [value]="sendTime()"
                (ionInput)="sendTime.set($event.detail.value ?? '')"
              ></ion-input>
            </ion-item>

            <ion-item lines="none" class="hint-item">
              <ion-note>
                Check-in will be sent to your active clients at this time each week.
              </ion-note>
            </ion-item>
          }
        </ion-list>

        <!-- ── Active toggle ────────────────────────────────────────────── -->
        <ion-list class="status-list">
          <ion-item>
            <ion-label>
              <h3>Active</h3>
              <p>Inactive templates won't be sent automatically</p>
            </ion-label>
            <ion-toggle
              [checked]="isActive()"
              (ionChange)="isActive.set($event.detail.checked)"
              slot="end"
            ></ion-toggle>
          </ion-item>
        </ion-list>

        <!-- ── Preview hint ─────────────────────────────────────────────── -->
        <div class="preview-hint">
          <ion-icon name="eye-outline"></ion-icon>
          <span>Clients see one question per screen with emoji ratings and free text fields.</span>
        </div>

        <div class="bottom-spacer"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    ion-list {
      background: transparent;
      margin: 0 16px 8px;
      border-radius: 14px;
      overflow: hidden;
    }
    ion-item { --background: rgba(255,255,255,0.04); --border-color: rgba(255,255,255,0.06); }

    .section-header {
      font-size: 13px; font-weight: 800; letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--fitos-text-tertiary, #6B6B6B);
      padding: 20px 20px 8px;
    }
    .section-sub { font-size: 11px; font-weight: 500; text-transform: none; letter-spacing: 0; margin-left: 6px; }

    /* ── Question row ──── */
    .question-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      width: 100%;
    }
    .q-number {
      width: 24px; height: 24px; min-width: 24px;
      border-radius: 50%;
      background: rgba(16,185,129,0.15);
      color: var(--fitos-accent-primary, #10B981);
      font-size: 12px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      margin-top: 10px;
    }
    .q-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .q-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .type-select {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      max-width: 180px;
    }

    .required-chip {
      font-size: 11px;
      height: 24px;
      cursor: pointer;
    }

    /* ── Schedule ────────── */
    .hint-item { --background: transparent; --border-color: transparent; }
    ion-note { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Status ──────────── */
    .status-list { margin-top: 8px; }

    /* ── Preview hint ─── */
    .preview-hint {
      margin: 8px 20px 0;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: rgba(16,185,129,0.06);
      border-radius: 10px;
      border: 1px solid rgba(16,185,129,0.15);
      ion-icon { color: var(--fitos-accent-primary, #10B981); font-size: 16px; flex-shrink: 0; margin-top: 1px; }
      span { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); line-height: 1.4; }
    }

    .bottom-spacer { height: 48px; }
    .builder-body { padding-bottom: 16px; }
  `],
})
export class CheckinBuilderPage implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private alertCtrl  = inject(AlertController);
  private toastCtrl  = inject(ToastController);
  checkinService     = inject(CheckinService);

  readonly days = DAYS;
  readonly questionTypeOptions = Object.entries(QUESTION_TYPE_META).map(
    ([value, meta]) => ({ value: value as QuestionType, ...meta })
  );

  isEditMode   = signal(false);
  isSaving     = signal(false);
  existingId   = signal<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  name        = signal('');
  questions   = signal<CheckinQuestion[]>([newQuestion()]);
  isScheduled = signal(false);
  sendDay     = signal<number>(1);     // Monday
  sendTime    = signal<string>('09:00');
  isActive    = signal(true);

  isValid = computed(
    () => this.name().trim().length >= 2 && this.questions().length >= 1
  );

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      reorderThreeOutline,
      chatbubbleEllipsesOutline,
      happyOutline,
      checkmarkCircleOutline,
      eyeOutline,
      calendarOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.existingId.set(id);
      const template = this.checkinService.templates().find((t) => t.id === id);
      if (template) this.populateFrom(template);
    }
  }

  private populateFrom(t: CheckinTemplate): void {
    this.name.set(t.name);
    this.questions.set(t.questions.length > 0 ? [...t.questions] : [newQuestion()]);
    this.isScheduled.set(t.send_day_of_week !== null);
    this.sendDay.set(t.send_day_of_week ?? 1);
    this.sendTime.set(t.send_time ?? '09:00');
    this.isActive.set(t.is_active);
  }

  // ── Question management ────────────────────────────────────────────────────

  addQuestion(): void {
    this.questions.update((list) => [...list, newQuestion()]);
  }

  removeQuestion(index: number): void {
    this.questions.update((list) => list.filter((_, i) => i !== index));
  }

  updateQuestion(index: number, patch: Partial<CheckinQuestion>): void {
    this.questions.update((list) =>
      list.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  onReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    const items = [...this.questions()];
    const moved = items.splice(event.detail.from, 1)[0];
    items.splice(event.detail.to, 0, moved);
    this.questions.set(items);
    event.detail.complete();
  }

  onScheduleToggle(checked: boolean): void {
    this.isScheduled.set(checked);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);

    const dto: CreateTemplateDto & { is_active: boolean } = {
      name:            this.name().trim(),
      questions:       this.questions().filter((q) => q.text.trim().length > 0),
      send_day_of_week: this.isScheduled() ? this.sendDay() : undefined,
      send_time:        this.isScheduled() ? this.sendTime() : undefined,
      is_active:        this.isActive(),
    };

    let ok: boolean;
    if (this.isEditMode() && this.existingId()) {
      ok = await this.checkinService.updateTemplate(this.existingId()!, dto);
    } else {
      const created = await this.checkinService.createTemplate(dto);
      ok = !!created;
    }

    this.isSaving.set(false);

    const toast = await this.toastCtrl.create({
      message:  ok ? 'Check-in template saved!' : 'Save failed. Please try again.',
      color:    ok ? 'success' : 'warning',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();

    if (ok) this.router.navigate(['..'], { relativeTo: this.route, replaceUrl: true });
  }
}
