import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import {
  DisciplineService,
  type BehaviorIncident,
  type BehaviorReport,
  type DisciplinaryAction,
  type Reward,
  type Sanction,
} from './discipline.service';
import { StudentsService } from '../services/students.service';
import { ParentsService } from '../services/parents.service';
import type { Student } from '../models/admin.models';
import { personLabel } from '../shared/labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { DateField } from '../../../shared/ui/date-field';
import { AuthStore } from '../../../core/auth/auth.store';

const SEVERITY: { value: string; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Élevée' },
  { value: 'critical', label: 'Critique' },
];
const ACTION_TYPES: { value: string; label: string }[] = [
  { value: 'warning', label: 'Avertissement' },
  { value: 'detention', label: 'Retenue' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'expulsion', label: 'Renvoi' },
];
const SEVERITY_TONE: Record<string, BadgeTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'warning',
  critical: 'danger',
};
type Tab = 'report' | 'incidents' | 'actions' | 'rewards' | 'sanctions';

interface ChildRef {
  id: string;
  label: string;
}

/** Module Discipline : gestion (admin/enseignant) ou suivi lecture seule (parent). */
@Component({
  selector: 'panga-discipline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    PageHeader,
    SectionHeader,
    EmptyState,
    KpiCard,
    StatusBadge,
    DateField,
  ],
  template: `
    <panga-page-header
      icon="gavel"
      title="Discipline"
      [subtitle]="
        isParent() ? 'Suivi du comportement de vos enfants' : 'Incidents, sanctions & récompenses'
      "
    />

    <!-- ===================== Vue parent (lecture seule) ==================== -->
    @if (isParent()) {
      <div class="panga-card p-4 mb-4">
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Enfant</mat-label>
          <mat-select [value]="reportStudentId()" (selectionChange)="loadReport($event.value)">
            @for (c of children(); track c.id) {
              <mat-option [value]="c.id">{{ c.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <ng-container [ngTemplateOutlet]="reportTpl" />
    } @else {
      <!-- ================== Vue gestion (admin / enseignant) ================= -->
      <div class="flex flex-wrap gap-2 mb-5">
        @for (t of tabs; track t.key) {
          <button
            class="rounded-xl px-4 py-2 text-sm font-medium border"
            [class.bg-(--brand-500)]="tab() === t.key"
            [class.text-white]="tab() === t.key"
            [class.border-transparent]="tab() === t.key"
            [class.border-(--border)]="tab() !== t.key"
            [class.text-(--text-muted)]="tab() !== t.key"
            (click)="tab.set(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('report') {
          <div class="panga-card p-4 mb-4">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Élève</mat-label>
              <mat-select [value]="reportStudentId()" (selectionChange)="loadReport($event.value)">
                @for (s of students(); track s.id) {
                  <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <ng-container [ngTemplateOutlet]="reportTpl" />
        }

        @case ('incidents') {
          <section class="panga-card p-5 mb-4">
            <panga-section-header icon="report" title="Signaler un incident" />
            <form
              [formGroup]="incidentForm"
              (ngSubmit)="addIncident()"
              class="grid gap-3 sm:grid-cols-2"
            >
              <mat-form-field appearance="outline">
                <mat-label>Élève</mat-label>
                <mat-select formControlName="studentId">
                  @for (s of students(); track s.id) {
                    <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Gravité</mat-label>
                <mat-select formControlName="severity">
                  @for (o of severities; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <input matInput formControlName="incidentType" placeholder="ex. Bagarre" />
              </mat-form-field>
              <panga-date-field label="Date" formControlName="incidentDate" />
              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Description</mat-label>
                <textarea matInput rows="2" formControlName="description"></textarea>
              </mat-form-field>
              <div class="sm:col-span-2 flex justify-end">
                <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="saving()">
                  Signaler
                </button>
              </div>
            </form>
          </section>
          <section class="panga-card p-5">
            <panga-section-header icon="warning" title="Incidents" [count]="incidents().length" />
            @if (incidents().length === 0) {
              <panga-empty-state
                icon="warning"
                title="Aucun incident"
                description="Rien à signaler."
              />
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (i of incidents(); track i.id) {
                  <div class="flex items-center gap-3 px-5 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ resolveName(i.studentId, i.studentName) }}
                      </p>
                      <p class="text-xs text-(--text-muted) truncate">
                        {{ i.incidentType || '—' }} · {{ i.description }}
                      </p>
                    </div>
                    <panga-status-badge
                      [label]="sevLabel(i.severity)"
                      [tone]="sevTone(i.severity)"
                      [dot]="false"
                    />
                    <button mat-icon-button (click)="removeIncident(i)">
                      <mat-icon fontSet="material-symbols-outlined" style="color: var(--danger)"
                        >delete</mat-icon
                      >
                    </button>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('actions') {
          <section class="panga-card p-5 mb-4">
            <panga-section-header icon="policy" title="Nouvelle sanction" />
            <form
              [formGroup]="actionForm"
              (ngSubmit)="addAction()"
              class="grid gap-3 sm:grid-cols-2"
            >
              <mat-form-field appearance="outline">
                <mat-label>Élève</mat-label>
                <mat-select formControlName="studentId">
                  @for (s of students(); track s.id) {
                    <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select formControlName="actionType">
                  @for (o of actionTypes; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Description</mat-label>
                <textarea matInput rows="2" formControlName="description"></textarea>
              </mat-form-field>
              <div class="sm:col-span-2 flex justify-end">
                <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="saving()">
                  Appliquer
                </button>
              </div>
            </form>
          </section>
          <section class="panga-card p-5">
            <panga-section-header
              icon="policy"
              title="Sanctions appliquées"
              [count]="actions().length"
            />
            @if (actions().length === 0) {
              <panga-empty-state icon="policy" title="Aucune sanction" description="—" />
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (a of actions(); track a.id) {
                  <div class="flex items-center gap-3 px-5 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ resolveName(a.studentId, a.studentName) }}
                      </p>
                      <p class="text-xs text-(--text-muted) truncate">
                        {{ actionLabel(a.actionType) }}
                        @if (a.isAutomatic) {
                          · auto
                        }
                        · {{ a.description }}
                      </p>
                    </div>
                    <panga-status-badge
                      [label]="a.status || '—'"
                      [tone]="a.status === 'completed' ? 'success' : 'neutral'"
                      [dot]="false"
                    />
                    @if (a.status !== 'completed') {
                      <button mat-button (click)="complete(a)">Clôturer</button>
                    }
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('rewards') {
          <section class="panga-card p-5 mb-4">
            <panga-section-header icon="emoji_events" title="Nouvelle récompense" />
            <form
              [formGroup]="rewardForm"
              (ngSubmit)="addReward()"
              class="grid gap-3 sm:grid-cols-2"
            >
              <mat-form-field appearance="outline">
                <mat-label>Élève</mat-label>
                <mat-select formControlName="studentId">
                  @for (s of students(); track s.id) {
                    <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <input matInput formControlName="rewardType" placeholder="ex. mérite" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Titre</mat-label>
                <input matInput formControlName="title" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Points</mat-label>
                <input matInput type="number" formControlName="pointsAwarded" min="0" />
              </mat-form-field>
              <div class="sm:col-span-2 flex justify-end">
                <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="saving()">
                  Attribuer
                </button>
              </div>
            </form>
          </section>
          <section class="panga-card p-5">
            <panga-section-header
              icon="emoji_events"
              title="Récompenses"
              [count]="rewards().length"
            />
            @if (rewards().length === 0) {
              <panga-empty-state icon="emoji_events" title="Aucune récompense" description="—" />
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (r of rewards(); track r.id) {
                  <div class="flex items-center gap-3 px-5 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ resolveName(r.studentId, r.studentName) }}
                      </p>
                      <p class="text-xs text-(--text-muted) truncate">
                        {{ r.title || r.rewardType }} · {{ r.pointsAwarded ?? 0 }} pts
                      </p>
                    </div>
                    <button mat-icon-button (click)="removeReward(r)">
                      <mat-icon fontSet="material-symbols-outlined" style="color: var(--danger)"
                        >delete</mat-icon
                      >
                    </button>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('sanctions') {
          @if (canManageSanctions()) {
            <section class="panga-card p-5 mb-4">
              <panga-section-header icon="rule" title="Ajouter au catalogue" />
              <form
                [formGroup]="sanctionForm"
                (ngSubmit)="addSanction()"
                class="grid gap-3 sm:grid-cols-2"
              >
                <mat-form-field appearance="outline">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="name" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Type d'action</mat-label>
                  <mat-select formControlName="actionType">
                    @for (o of actionTypes; track o.value) {
                      <mat-option [value]="o.value">{{ o.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="sm:col-span-2">
                  <mat-label>Description</mat-label>
                  <input matInput formControlName="description" />
                </mat-form-field>
                <div class="sm:col-span-2 flex justify-end">
                  <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="saving()">
                    Ajouter
                  </button>
                </div>
              </form>
            </section>
          }
          <section class="panga-card p-5">
            <panga-section-header
              icon="rule"
              title="Catalogue de sanctions"
              [count]="sanctions().length"
            />
            @if (sanctions().length === 0) {
              <panga-empty-state icon="rule" title="Catalogue vide" description="—" />
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (s of sanctions(); track s.id) {
                  <div class="flex items-center gap-3 px-5 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">{{ s.name }}</p>
                      <p class="text-xs text-(--text-muted) truncate">
                        {{ actionLabel(s.actionType) }} · {{ s.description }}
                      </p>
                    </div>
                    @if (canManageSanctions()) {
                      <button mat-icon-button (click)="removeSanction(s)">
                        <mat-icon fontSet="material-symbols-outlined" style="color: var(--danger)"
                          >delete</mat-icon
                        >
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </section>
        }
      }
    }

    <!-- ===================== Rapport de comportement ===================== -->
    <ng-template #reportTpl>
      @if (!reportStudentId()) {
        <div class="panga-card">
          <panga-empty-state
            icon="insights"
            title="Choisissez un élève"
            description="Sélectionnez un élève pour voir son rapport de comportement."
          />
        </div>
      } @else if (report(); as r) {
        <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 mb-6">
          <panga-kpi-card
            label="Incidents"
            [value]="r.summary?.totalIncidents ?? 0"
            icon="warning"
          />
          <panga-kpi-card label="Sanctions" [value]="r.summary?.totalActions ?? 0" icon="policy" />
          <panga-kpi-card
            label="Récompenses"
            [value]="r.summary?.totalRewards ?? 0"
            icon="emoji_events"
          />
          <panga-kpi-card
            label="Points nets"
            [value]="r.summary?.netPoints ?? 0"
            icon="scoreboard"
          />
        </section>
        @if (r.rewards?.length) {
          <section class="panga-card p-5">
            <panga-section-header
              icon="emoji_events"
              title="Récompenses"
              [count]="r.rewards!.length"
            />
            <div class="divide-y divide-(--border) -mx-5">
              @for (rw of r.rewards!; track rw.id) {
                <div class="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span class="text-sm text-(--text) truncate">{{
                    rw.title || rw.rewardType
                  }}</span>
                  <span class="text-sm font-medium text-(--success)"
                    >+{{ rw.pointsAwarded ?? 0 }}</span
                  >
                </div>
              }
            </div>
          </section>
        }
      }
    </ng-template>
  `,
})
export class Discipline {
  private readonly api = inject(DisciplineService);
  private readonly studentsApi = inject(StudentsService);
  private readonly parentsApi = inject(ParentsService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthStore);

  protected readonly severities = SEVERITY;
  protected readonly actionTypes = ACTION_TYPES;
  protected readonly tabs = [
    { key: 'report' as const, label: 'Rapport élève' },
    { key: 'incidents' as const, label: 'Incidents' },
    { key: 'actions' as const, label: 'Sanctions' },
    { key: 'rewards' as const, label: 'Récompenses' },
    { key: 'sanctions' as const, label: 'Catalogue' },
  ];

  protected readonly isParent = computed(() => this.auth.role() === 'parent');
  protected readonly canManageSanctions = computed(
    () => this.auth.role() === 'admin' || this.auth.role() === 'super_admin',
  );

  protected readonly tab = signal<Tab>('report');
  protected readonly saving = signal(false);

  protected readonly students = signal<Student[]>([]);
  protected readonly children = signal<ChildRef[]>([]);
  protected readonly incidents = signal<BehaviorIncident[]>([]);
  protected readonly actions = signal<DisciplinaryAction[]>([]);
  protected readonly rewards = signal<Reward[]>([]);
  protected readonly sanctions = signal<Sanction[]>([]);
  protected readonly reportStudentId = signal('');
  protected readonly report = signal<BehaviorReport | null>(null);

  private readonly studentsById = computed(() => {
    const m = new Map<string, Student>();
    for (const s of this.students()) {
      m.set(s.id, s);
    }
    return m;
  });

  protected readonly incidentForm = new FormGroup({
    studentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    severity: new FormControl('medium', { nonNullable: true }),
    incidentType: new FormControl('', { nonNullable: true }),
    incidentDate: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly actionForm = new FormGroup({
    studentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    actionType: new FormControl('warning', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly rewardForm = new FormGroup({
    studentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rewardType: new FormControl('merit', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    pointsAwarded: new FormControl<number | null>(null),
  });
  protected readonly sanctionForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    actionType: new FormControl('warning', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    if (this.isParent()) {
      this.loadChildren();
    } else {
      this.studentsApi
        .list({ page: 1, limit: 500 })
        .pipe(catchError(() => of({ items: [] as Student[] })))
        .subscribe((r) => this.students.set(r.items));
      this.reload();
    }
  }

  private loadChildren(): void {
    this.parentsApi.me().subscribe({
      next: (me) => {
        const raw = (me['students'] ?? me['children'] ?? []) as Record<string, unknown>[];
        const kids = raw
          .map((s) => {
            const student = (s['student'] ?? s) as Record<string, unknown>;
            return {
              id: String(student['id'] ?? s['id'] ?? s['studentId'] ?? ''),
              label: personLabel(student),
            };
          })
          .filter((c) => c.id);
        this.children.set(kids);
        if (kids.length) {
          this.loadReport(kids[0].id);
        }
      },
    });
  }

  /** Recharge les listes de gestion (incidents/actions/récompenses/catalogue). */
  private reload(): void {
    this.api
      .incidents({ limit: 100 })
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((r) => this.incidents.set(r.items));
    this.api
      .actions({ limit: 100 })
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((r) => this.actions.set(r.items));
    this.api
      .rewards({ limit: 100 })
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((r) => this.rewards.set(r.items));
    this.api
      .sanctions()
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((r) => this.sanctions.set(r.items));
  }

  loadReport(studentId: string): void {
    this.reportStudentId.set(studentId);
    this.report.set(null);
    this.api
      .studentReport(studentId)
      .pipe(catchError(() => of(null)))
      .subscribe((r) => this.report.set(r));
  }

  /* --------------------------------- Actions -------------------------------- */
  addIncident(): void {
    if (this.incidentForm.invalid || this.saving()) {
      this.incidentForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.createIncident(this.incidentForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Incident signalé.');
        this.incidentForm.reset({ severity: 'medium' });
        this.api.incidents({ limit: 100 }).subscribe((r) => this.incidents.set(r.items));
      },
      error: () => this.saving.set(false),
    });
  }
  removeIncident(i: BehaviorIncident): void {
    this.api.deleteIncident(i.id).subscribe({
      next: () => this.incidents.update((l) => l.filter((x) => x.id !== i.id)),
    });
  }

  addAction(): void {
    if (this.actionForm.invalid || this.saving()) {
      this.actionForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.createAction(this.actionForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Sanction appliquée.');
        this.actionForm.reset({ actionType: 'warning' });
        this.api.actions({ limit: 100 }).subscribe((r) => this.actions.set(r.items));
      },
      error: () => this.saving.set(false),
    });
  }
  complete(a: DisciplinaryAction): void {
    this.api.completeAction(a.id).subscribe({
      next: () => this.api.actions({ limit: 100 }).subscribe((r) => this.actions.set(r.items)),
    });
  }

  addReward(): void {
    if (this.rewardForm.invalid || this.saving()) {
      this.rewardForm.markAllAsTouched();
      return;
    }
    const v = this.rewardForm.getRawValue();
    this.saving.set(true);
    this.api
      .createReward({
        ...v,
        pointsAwarded: v.pointsAwarded === null ? undefined : Number(v.pointsAwarded),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Récompense attribuée.');
          this.rewardForm.reset({ rewardType: 'merit' });
          this.api.rewards({ limit: 100 }).subscribe((r) => this.rewards.set(r.items));
        },
        error: () => this.saving.set(false),
      });
  }
  removeReward(r: Reward): void {
    this.api.deleteReward(r.id).subscribe({
      next: () => this.rewards.update((l) => l.filter((x) => x.id !== r.id)),
    });
  }

  addSanction(): void {
    if (this.sanctionForm.invalid || this.saving()) {
      this.sanctionForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.createSanction(this.sanctionForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Sanction ajoutée au catalogue.');
        this.sanctionForm.reset({ actionType: 'warning' });
        this.api.sanctions().subscribe((r) => this.sanctions.set(r.items));
      },
      error: () => this.saving.set(false),
    });
  }
  removeSanction(s: Sanction): void {
    this.api.deleteSanction(s.id).subscribe({
      next: () => this.sanctions.update((l) => l.filter((x) => x.id !== s.id)),
    });
  }

  /* --------------------------------- Helpers -------------------------------- */
  protected studentName(s: Student): string {
    return personLabel(s as unknown as Record<string, unknown>);
  }
  protected resolveName(studentId?: string, studentName?: string): string {
    if (studentName) {
      return studentName;
    }
    const s = studentId ? this.studentsById().get(studentId) : undefined;
    return s ? this.studentName(s) : (studentId ?? '—');
  }
  protected sevLabel(v?: string): string {
    return SEVERITY.find((o) => o.value === v)?.label ?? v ?? '—';
  }
  protected sevTone(v?: string): BadgeTone {
    return SEVERITY_TONE[v ?? ''] ?? 'neutral';
  }
  protected actionLabel(v?: string): string {
    return ACTION_TYPES.find((o) => o.value === v)?.label ?? v ?? '—';
  }
}
