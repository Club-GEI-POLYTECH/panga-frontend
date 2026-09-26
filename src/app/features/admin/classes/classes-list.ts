import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
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
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FilterSheetContent } from '../../../shared/ui/filter-sheet';
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
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

function enumLabel(options: { value: string; label: string }[], value?: string): string {
  if (!value) {
    return '';
  }
  return options.find((o) => o.value === value)?.label ?? value;
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
    NgTemplateOutlet,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    SectionHeader,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="meeting_room" title="Classes" [subtitle]="headerSubtitle()">
      <a mat-stroked-button class="rounded-xl!" [routerLink]="['/', 'class-options']">
        <mat-icon fontSet="material-symbols-outlined">account_tree</mat-icon> Filières
      </a>
      <button mat-flat-button class="rounded-xl! classes-cta" (click)="toggleForm()">
        <mat-icon fontSet="material-symbols-outlined">{{ showForm() ? 'close' : 'add' }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvelle classe' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 mb-6">
      <panga-kpi-card label="Classes" [value]="classes().length" icon="meeting_room" />
      <panga-kpi-card label="Élèves" [value]="totalStudents()" icon="school" />
      <panga-kpi-card label="Capacité" [value]="totalCapacity()" icon="groups" />
      <panga-kpi-card label="Taux remplissage" [value]="fillRate()" icon="donut_small" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="add_business" title="Nouvelle classe" />
        <div
          class="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1"
          role="tablist"
          aria-label="Sections du formulaire classe"
        >
          <button
            type="button"
            role="tab"
            class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
            [attr.aria-selected]="formTab() === 0"
            [class.tab-active]="formTab() === 0"
            [class.tab-idle]="formTab() !== 0"
            (click)="formTab.set(0)"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">badge</span>
              Identité
            </span>
          </button>
          <button
            type="button"
            role="tab"
            class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
            [attr.aria-selected]="formTab() === 1"
            [class.tab-active]="formTab() === 1"
            [class.tab-idle]="formTab() !== 1"
            (click)="formTab.set(1)"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">tune</span>
              Organisation
            </span>
          </button>
        </div>

        @if (formTab() === 0) {
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
              <mat-label>Type</mat-label>
              <mat-select formControlName="classType">
                <mat-option [value]="''">—</mat-option>
                @for (o of types; track o.value) {
                  <mat-option [value]="o.value">{{ o.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        } @else {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        }

        <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div class="flex gap-2">
            <button
              mat-stroked-button
              type="button"
              class="rounded-xl!"
              [disabled]="formTab() === 0"
              (click)="formTab.set(0)"
            >
              Précédent
            </button>
            @if (formTab() === 0) {
              <button mat-stroked-button type="button" class="rounded-xl!" (click)="formTab.set(1)">
                Suivant
              </button>
            }
          </div>
          <button
            mat-flat-button
            class="rounded-xl! classes-cta"
            type="submit"
            [disabled]="submitting()"
          >
            {{ submitting() ? 'Création…' : 'Créer la classe' }}
          </button>
        </div>
      </form>
    }

    <div class="panga-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-45"
        subscriptSizing="dynamic"
      >
        <mat-label>Rechercher</mat-label>
        <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
        <input matInput [formControl]="searchCtrl" placeholder="Nom de classe…" />
      </mat-form-field>

      <div class="sm:hidden shrink-0">
        <button mat-stroked-button class="rounded-xl!" (click)="openFilters(filtersTpl)">
          <mat-icon fontSet="material-symbols-outlined">filter_list</mat-icon>
          Filtrer
        </button>
      </div>

      <div class="hidden sm:flex sm:flex-1 sm:flex-wrap items-center gap-3">
        <ng-container [ngTemplateOutlet]="filtersTpl" />
      </div>
    </div>

    <ng-template #filtersTpl>
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-36"
        subscriptSizing="dynamic"
      >
        <mat-label>Niveau d'éducation</mat-label>
        <mat-select [formControl]="eduLevelCtrl">
          <mat-option [value]="''">Tous</mat-option>
          @for (o of eduLevels; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-36"
        subscriptSizing="dynamic"
      >
        <mat-label>Horaire</mat-label>
        <mat-select [formControl]="scheduleCtrl">
          <mat-option [value]="''">Tous</mat-option>
          @for (o of schedules; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ng-template>

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (loadError()) {
      <div class="panga-card p-6">
        <panga-empty-state
          icon="error"
          title="Impossible de charger les classes"
          description="Vérifiez votre connexion puis réessayez."
          actionLabel="Réessayer"
          (action)="reload()"
        />
      </div>
    } @else if (filtered().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="meeting_room"
          title="Aucune classe"
          description="Créez votre première classe ou élargissez les filtres."
          actionLabel="Nouvelle classe"
          (action)="openCreateForm()"
        />
      </div>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-2">
        @for (c of visibleClasses(); track c.id) {
          <a
            [routerLink]="['/', 'classes', c.id]"
            class="class-card panga-card p-4 block no-underline"
          >
            @if (eduLabel(c)) {
              <p
                class="text-[11px] font-semibold uppercase tracking-wide truncate"
                style="color: var(--brand-deep)"
              >
                {{ eduLabel(c) }}
              </p>
            }
            <h3
              class="text-sm font-semibold text-(--text) truncate"
              [class.mt-0.5]="!!eduLabel(c)"
              style="font-family: Urbanist, sans-serif"
            >
              {{ label(c) }}
            </h3>
            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-(--text-muted)"
            >
              @if (teacherName(c.classTeacher)) {
                <span class="inline-flex items-center gap-1 min-w-0">
                  <span class="material-symbols-outlined text-[14px] shrink-0">badge</span>
                  <span class="truncate">{{ teacherName(c.classTeacher) }}</span>
                </span>
              }
              @if (scheduleLabel(c)) {
                <span class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">schedule</span>
                  {{ scheduleLabel(c) }}
                </span>
              }
              @if (c.roomNumber) {
                <span class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">door_front</span>
                  {{ c.roomNumber }}
                </span>
              }
            </div>
            <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span class="chip chip--brand">
                {{ c.currentEnrollment ?? 0 }}/{{ capacity(c) }} élèves
              </span>
              @if (c.status) {
                <span
                  class="chip"
                  [class.chip--success]="c.status === 'active'"
                  [class.chip--neutral]="c.status === 'archived' || c.status === 'closed'"
                  [class.chip--warning]="
                    c.status !== 'active' && c.status !== 'archived' && c.status !== 'closed'
                  "
                >
                  @if (c.status === 'active') {
                    <span class="chip__dot"></span>
                  }
                  {{ statusLabel(c.status) }}
                </span>
              }
            </div>
          </a>
        }
      </div>
      <div class="panga-card mt-3">
        <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
      </div>
    }
  `,
  styles: [
    `
      button.classes-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.classes-cta .mat-icon,
      button.classes-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.classes-cta:disabled {
        opacity: 0.55;
      }
      .tab-active {
        background: var(--brand-gradient);
        color: #fff;
        border-color: transparent;
      }
      .tab-idle {
        background: color-mix(in srgb, var(--text) 4%, transparent);
        color: var(--text);
        border-color: var(--border);
      }
      .tab-idle:hover {
        background: color-mix(in srgb, var(--brand-500) 10%, transparent);
        border-color: color-mix(in srgb, var(--brand-500) 35%, var(--border));
      }
      .class-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .class-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.6875rem;
        font-weight: 600;
        line-height: 1.2;
        border: 1px solid transparent;
      }
      .chip__dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: currentColor;
      }
      .chip--brand {
        color: var(--brand-deep);
        background: color-mix(in srgb, var(--brand-500) 16%, transparent);
        border-color: color-mix(in srgb, var(--brand-500) 30%, transparent);
      }
      .chip--success {
        color: var(--success);
        background: color-mix(in srgb, var(--success) 14%, transparent);
        border-color: color-mix(in srgb, var(--success) 28%, transparent);
      }
      .chip--warning {
        color: var(--warning);
        background: color-mix(in srgb, var(--warning) 14%, transparent);
        border-color: color-mix(in srgb, var(--warning) 28%, transparent);
      }
      .chip--neutral {
        color: var(--text-muted);
        background: color-mix(in srgb, var(--text-muted) 12%, transparent);
        border-color: color-mix(in srgb, var(--text-muted) 22%, transparent);
      }
    `,
  ],
})
export class ClassesList {
  private readonly classesApi = inject(ClassesService);
  private readonly teachersApi = inject(TeachersService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly eduLevels = CLASS_EDUCATION_LEVEL_OPTIONS;
  protected readonly cycles = SCHOOL_CYCLE_OPTIONS;
  protected readonly schedules = CLASS_SCHEDULE_OPTIONS;
  protected readonly types = CLASS_TYPE_OPTIONS;
  protected readonly label = classLabel;

  protected readonly classes = signal<ClassInstance[]>([]);
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
  protected readonly loadError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);
  protected readonly formTab = signal(0);

  protected readonly eduLevelCtrl = new FormControl('', { nonNullable: true });
  protected readonly scheduleCtrl = new FormControl('', { nonNullable: true });

  protected readonly headerSubtitle = computed(() => {
    const year = this.sy.selected();
    return year ? `Organisation pédagogique · Année ${year}` : 'Organisation pédagogique';
  });

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
    this.eduLevelCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    this.scheduleCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
    });
    effect(() => {
      this.sy.selected();
      untracked(() => this.load());
    });
  }

  openFilters(template: TemplateRef<unknown>): void {
    this.bottomSheet.open(FilterSheetContent, { data: { title: 'Filtrer', template } });
  }

  protected toggleForm(): void {
    const next = !this.showForm();
    this.showForm.set(next);
    if (next) {
      this.formTab.set(0);
    }
  }

  protected openCreateForm(): void {
    this.showForm.set(true);
    this.formTab.set(0);
  }

  protected reload(): void {
    this.load();
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
  protected statusLabel(status?: string): string {
    return enumLabel(CLASS_STATUS_OPTIONS, status);
  }
  protected eduLabel(c: ClassInstance): string {
    const tpl = c.template as Record<string, unknown> | undefined;
    const level = (tpl?.['educationLevel'] as string) || (c['educationLevel'] as string);
    return enumLabel(CLASS_EDUCATION_LEVEL_OPTIONS, level);
  }
  protected scheduleLabel(c: ClassInstance): string {
    const tpl = c.template as Record<string, unknown> | undefined;
    const schedule = (tpl?.['classSchedule'] as string) || (c['classSchedule'] as string);
    return enumLabel(CLASS_SCHEDULE_OPTIONS, schedule);
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
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
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      if (this.form.controls.name.invalid || this.form.controls.level.invalid) {
        this.formTab.set(0);
      }
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
        this.formTab.set(0);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
