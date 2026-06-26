import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ClassesService } from '../services/classes.service';
import { TeachersService } from '../services/teachers.service';
import type { ClassInstance, SchoolSubOption, Teacher } from '../models/admin.models';
import {
  CLASS_EDUCATION_LEVEL_OPTIONS,
  CLASS_SCHEDULE_OPTIONS,
  CLASS_STATUS_OPTIONS,
  CLASS_TYPE_OPTIONS,
  SCHOOL_CYCLE_OPTIONS,
} from '../../../core/models/class.enums';
import { classLabel, personLabel } from '../shared/labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { clientMeta, pageSlice } from '../../../shared/ui/client-pagination';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

function statusTone(status?: string): BadgeTone {
  if (status === 'active') return 'success';
  if (status === 'archived' || status === 'closed') return 'neutral';
  return 'warning';
}

@Component({
  selector: 'panga-classes-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="meeting_room" title="Classes" [subtitle]="'Année ' + schoolYear">
      <a mat-stroked-button class="rounded-xl!" [routerLink]="['/', 'class-options']">
        <mat-icon fontSet="material-symbols-outlined">account_tree</mat-icon> Filières
      </a>
      <button mat-flat-button class="rounded-xl!" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{ showForm() ? 'close' : 'add' }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvelle classe' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
      <panga-kpi-card label="Classes" [value]="classes().length" icon="meeting_room" />
      <panga-kpi-card label="Élèves" [value]="totalStudents()" icon="school" />
      <panga-kpi-card label="Capacité" [value]="totalCapacity()" icon="groups" />
      <panga-kpi-card label="Taux remplissage" [value]="fillRate()" icon="donut_small" />
    </section>

    <!-- Filtres -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-50">
        <mat-label>Rechercher</mat-label>
        <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
        <input matInput [formControl]="searchCtrl" placeholder="Nom de classe…" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-45">
        <mat-label>Niveau d'éducation</mat-label>
        <mat-select [formControl]="eduLevelCtrl">
          <mat-option [value]="''">Tous</mat-option>
          @for (o of eduLevels; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-45">
        <mat-label>Horaire</mat-label>
        <mat-select [formControl]="scheduleCtrl">
          <mat-option [value]="''">Tous</mat-option>
          @for (o of schedules; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="add_business" title="Nouvelle classe" />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <mat-form-field appearance="outline">
            <mat-label>Nom (ex. 3ème AG)</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Niveau (1–12)</mat-label>
            <input matInput type="number" formControlName="level" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Section</mat-label>
            <input matInput formControlName="section" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Niveau d'éducation</mat-label>
            <mat-select formControlName="educationLevel">
              <mat-option [value]="''">—</mat-option>
              @for (o of eduLevels; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Cycle</mat-label>
            <mat-select formControlName="schoolCycle">
              <mat-option [value]="''">—</mat-option>
              @for (o of cycles; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Horaire</mat-label>
            <mat-select formControlName="classSchedule">
              <mat-option [value]="''">—</mat-option>
              @for (o of schedules; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="classType">
              <mat-option [value]="''">—</mat-option>
              @for (o of types; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Capacité</mat-label>
            <input matInput type="number" formControlName="capacity" />
          </mat-form-field>
          @if (subOptions().length) {
            <mat-form-field appearance="outline">
              <mat-label>Filière (sous-option)</mat-label>
              <mat-select formControlName="schoolSubOptionId">
                <mat-option [value]="''">—</mat-option>
                @for (s of subOptions(); track s.id) {
                  <mat-option [value]="s.id">{{ s.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>Enseignant titulaire</mat-label>
            <mat-select formControlName="classTeacherId">
              <mat-option [value]="''">—</mat-option>
              @for (t of teachers(); track t.id) {
                <mat-option [value]="t.id">{{ teacherName(t) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Salle</mat-label>
            <input matInput formControlName="roomNumber" />
          </mat-form-field>
        </div>
        <div class="flex justify-end mt-1">
          <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="submitting()">
            Créer la classe
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (classes().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="meeting_room"
          title="Aucune classe"
          description="Créez votre première classe pour l'année."
          actionLabel="Nouvelle classe"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (c of visibleClasses(); track c.id) {
          <a
            [routerLink]="['/', 'classes', c.id]"
            class="panga-card panga-card--interactive p-5 block"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-(--text) truncate">{{ label(c) }}</p>
                <p class="text-xs text-(--text-muted) mt-0.5">
                  {{ c.schoolYear || schoolYear }}
                </p>
              </div>
              @if (c.status) {
                <panga-status-badge [label]="c.status" [tone]="tone(c.status)" />
              }
            </div>

            @if (teacherName(c.classTeacher)) {
              <p class="mt-3 text-sm text-(--text-muted) inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">badge</span>
                {{ teacherName(c.classTeacher) }}
              </p>
            }

            <div class="mt-3 flex items-center gap-4 text-sm">
              <span class="inline-flex items-center gap-1.5 text-(--text)">
                <span class="material-symbols-outlined text-[18px] text-(--brand-500)">school</span>
                {{ c.currentEnrollment ?? 0
                }}<span class="text-(--text-muted)">/{{ capacity(c) }}</span>
              </span>
              @if (c.template?.level !== undefined && c.template?.level !== null) {
                <span class="inline-flex items-center gap-1.5 text-(--text-muted)">
                  <span class="material-symbols-outlined text-[18px]">stairs</span> Niveau
                  {{ c.template?.level }}
                </span>
              }
            </div>
          </a>
        }
      </div>
      <div class="panga-card mt-4">
        <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
      </div>
    }
  `,
})
export class ClassesList {
  private readonly classesApi = inject(ClassesService);
  private readonly teachersApi = inject(TeachersService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly schoolYear = this.sy.selected();
  protected readonly eduLevels = CLASS_EDUCATION_LEVEL_OPTIONS;
  protected readonly cycles = SCHOOL_CYCLE_OPTIONS;
  protected readonly schedules = CLASS_SCHEDULE_OPTIONS;
  protected readonly types = CLASS_TYPE_OPTIONS;
  protected readonly statuses = CLASS_STATUS_OPTIONS;
  protected readonly label = classLabel;
  protected readonly tone = statusTone;

  protected readonly classes = signal<ClassInstance[]>([]);
  /** Pagination + recherche côté client (l'endpoint classes renvoie tout le lot). */
  protected readonly page = signal(1);
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) {
      return this.classes();
    }
    return this.classes().filter((c) => this.label(c).toLowerCase().includes(q));
  });
  protected readonly pageMeta = computed(() => clientMeta(this.filtered().length, this.page()));
  protected readonly visibleClasses = computed(() => pageSlice(this.filtered(), this.page()));
  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly subOptions = signal<SchoolSubOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly eduLevelCtrl = new FormControl('', { nonNullable: true });
  protected readonly scheduleCtrl = new FormControl('', { nonNullable: true });

  protected readonly totalStudents = computed(() =>
    this.classes().reduce((s, c) => s + (Number(c.currentEnrollment) || 0), 0),
  );
  protected readonly totalCapacity = computed(() =>
    this.classes().reduce((s, c) => s + (Number(c.template?.capacity) || 0), 0),
  );
  protected readonly fillRate = computed(() => {
    const cap = this.totalCapacity();
    return cap ? `${Math.round((this.totalStudents() / cap) * 100)}%` : '—';
  });

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    level: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    section: new FormControl('', { nonNullable: true }),
    educationLevel: new FormControl('', { nonNullable: true }),
    schoolCycle: new FormControl('', { nonNullable: true }),
    classSchedule: new FormControl('', { nonNullable: true }),
    classType: new FormControl('', { nonNullable: true }),
    capacity: new FormControl(40, { nonNullable: true }),
    schoolSubOptionId: new FormControl('', { nonNullable: true }),
    classTeacherId: new FormControl('', { nonNullable: true }),
    roomNumber: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.teachersApi
      .list({ page: 1, limit: 200 })
      .subscribe({ next: (r) => this.teachers.set(r.items) });
    this.classesApi.subOptions().subscribe({ next: (r) => this.subOptions.set(r.items) });
    this.eduLevelCtrl.valueChanges.subscribe(() => this.load());
    this.scheduleCtrl.valueChanges.subscribe(() => this.load());
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
    });
    // Recharge à chaque changement d'année (sélecteur global).
    effect(() => {
      this.sy.selected();
      untracked(() => this.load());
    });
  }

  protected teacherName(t: unknown): string {
    if (!t || typeof t !== 'object') {
      return '';
    }
    const obj = t as Record<string, unknown>;
    return personLabel((obj['user'] ?? obj) as Record<string, unknown>);
  }
  protected capacity(c: ClassInstance): string {
    return String(c.template?.capacity ?? c.availableSeats ?? '—');
  }

  private load(): void {
    this.loading.set(true);
    this.classesApi
      .list(this.sy.filter(), {
        educationLevel: this.eduLevelCtrl.value || undefined,
        classSchedule: this.scheduleCtrl.value || undefined,
      })
      .subscribe({
        next: (res) => {
          this.classes.set(res.items);
          this.page.set(1);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      name: v.name,
      level: Number(v.level),
      schoolYear: this.sy.selected(),
      capacity: Number(v.capacity) || 40,
    };
    for (const [k, val] of Object.entries({
      section: v.section,
      educationLevel: v.educationLevel,
      schoolCycle: v.schoolCycle,
      classSchedule: v.classSchedule,
      classType: v.classType,
      schoolSubOptionId: v.schoolSubOptionId,
      classTeacherId: v.classTeacherId,
      roomNumber: v.roomNumber,
    })) {
      if (val) {
        payload[k] = val;
      }
    }
    this.classesApi.createCombined(payload as never).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Classe créée.');
        this.form.reset({ level: 1, capacity: 40 });
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
