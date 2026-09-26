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
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, type Observable } from 'rxjs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FilterSheetContent } from '../../../shared/ui/filter-sheet';
import { TeachersService } from '../services/teachers.service';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance, Teacher } from '../models/admin.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { EnumOption } from '../../../core/models/school.enums';
import { COUNTRY_OPTIONS } from '../../../core/models/geo.reference';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  QUALIFICATION_LEVEL_OPTIONS,
  TEACHER_STATUS_OPTIONS,
} from '../../../core/models/teacher.enums';
import { classLabel, personLabel } from '../shared/labels';
import { employmentLabel } from '../shared/teacher-labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { DateField } from '../../../shared/ui/date-field';
import { PhoneField } from '../../../shared/ui/phone-field';
import { ProvinceField } from '../../../shared/ui/province-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'number'
  | 'select'
  | 'csv'
  | 'classes'
  | 'phone'
  | 'province';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: EnumOption[];
  required?: boolean;
  wide?: boolean;
}
interface Group {
  title: string;
  icon: string;
  fields: Field[];
}

const GROUPS: Group[] = [
  {
    title: 'Identité',
    icon: 'badge',
    fields: [
      { key: 'firstName', label: 'Prénom', required: true },
      { key: 'lastName', label: 'Nom', required: true },
      { key: 'postnom', label: 'Postnom' },
      { key: 'gender', label: 'Sexe', type: 'select', options: GENDER_OPTIONS },
      { key: 'dateOfBirth', label: 'Date de naissance', type: 'date' },
      { key: 'nationality', label: 'Nationalité' },
    ],
  },
  {
    title: 'Contact',
    icon: 'contacts',
    fields: [
      { key: 'phone', label: 'Téléphone', type: 'phone' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'country', label: 'Pays', type: 'select', options: COUNTRY_OPTIONS },
    ],
  },
  {
    title: 'Professionnel',
    icon: 'work',
    fields: [
      { key: 'employeeNumber', label: "Numéro d'employé" },
      { key: 'specialization', label: 'Spécialisation' },
      { key: 'academicTitle', label: 'Titre académique' },
      {
        key: 'employmentType',
        label: "Type d'emploi",
        type: 'select',
        options: EMPLOYMENT_TYPE_OPTIONS,
      },
      { key: 'status', label: 'Statut', type: 'select', options: TEACHER_STATUS_OPTIONS },
      {
        key: 'qualificationLevel',
        label: 'Niveau de qualification',
        type: 'select',
        options: QUALIFICATION_LEVEL_OPTIONS,
      },
      { key: 'qualificationInstitution', label: 'Institution' },
      { key: 'qualificationYear', label: 'Année de qualification', type: 'number' },
      { key: 'hireDate', label: "Date d'embauche", type: 'date' },
      { key: 'yearsOfExperience', label: "Années d'expérience", type: 'number' },
      { key: 'salary', label: 'Salaire', type: 'number' },
      { key: 'previousEmployer', label: 'Employeur précédent' },
      { key: 'office', label: 'Bureau' },
      { key: 'officePhone', label: 'Téléphone bureau', type: 'phone' },
    ],
  },
  {
    title: 'Affectation',
    icon: 'menu_book',
    fields: [
      {
        key: 'subjectsTaught',
        label: 'Matières (séparées par des virgules)',
        type: 'csv',
        wide: true,
      },
      {
        key: 'languagesSpoken',
        label: 'Langues (séparées par des virgules)',
        type: 'csv',
        wide: true,
      },
      { key: 'homeroomClassInstanceIds', label: 'Classes titulaire', type: 'classes', wide: true },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
/** Échantillon max pour KPI / filtre statut (API teachers : search seulement). */
const STATS_LIMIT = 200;

@Component({
  selector: 'panga-teachers-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    DateField,
    PhoneField,
    ProvinceField,
    SectionHeader,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="badge" title="Enseignants" [subtitle]="headerSubtitle()">
      <button mat-stroked-button class="rounded-xl!" (click)="downloadTemplate()">
        <mat-icon fontSet="material-symbols-outlined">download</mat-icon> Modèle
      </button>
      <input #fileInput type="file" class="hidden" accept=".xlsx,.xls" (change)="onFile($event)" />
      <button
        mat-stroked-button
        class="rounded-xl!"
        (click)="fileInput.click()"
        [disabled]="importing()"
      >
        <mat-icon fontSet="material-symbols-outlined">upload_file</mat-icon>
        {{ importing() ? 'Import…' : 'Importer (Excel)' }}
      </button>
      <button mat-flat-button class="rounded-xl! teachers-cta" (click)="toggleForm()">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvel enseignant' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Enseignants" [value]="statsTotal()" icon="badge" />
      <panga-kpi-card label="Actifs" [value]="statsActive()" icon="check_circle" />
      <panga-kpi-card label="Temps plein" [value]="statsFullTime()" icon="schedule" />
      <panga-kpi-card label="Spécialités" [value]="statsSpecialties()" icon="menu_book" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouvel enseignant" />
        <div
          class="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1"
          role="tablist"
          aria-label="Sections du formulaire enseignant"
        >
          @for (group of groups; track group.title; let i = $index) {
            <button
              type="button"
              role="tab"
              class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
              [attr.aria-selected]="formTab() === i"
              [class.tab-active]="formTab() === i"
              [class.tab-idle]="formTab() !== i"
              (click)="formTab.set(i)"
            >
              <span class="inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">{{ group.icon }}</span>
                {{ group.title }}
              </span>
            </button>
          }
        </div>
        @for (group of groups; track group.title; let i = $index) {
          @if (formTab() === i) {
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (f of group.fields; track f.key) {
                <div [class]="f.wide ? 'min-w-0 sm:col-span-2 lg:col-span-3' : 'min-w-0'">
                  @if (f.type === 'date') {
                    <panga-date-field
                      class="block w-full"
                      [label]="f.label"
                      [formControlName]="f.key"
                    />
                  } @else if (f.type === 'phone') {
                    <panga-phone-field
                      class="block w-full"
                      [label]="f.label"
                      [formControlName]="f.key"
                    />
                  } @else if (f.type === 'province') {
                    <panga-province-field
                      class="block w-full"
                      [label]="f.label"
                      [formControlName]="f.key"
                    />
                  } @else {
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>{{ f.label }}</mat-label>
                      @switch (f.type) {
                        @case ('select') {
                          <mat-select [formControlName]="f.key">
                            @for (o of f.options ?? []; track o.value) {
                              <mat-option [value]="o.value">{{ o.label }}</mat-option>
                            }
                          </mat-select>
                        }
                        @case ('classes') {
                          <mat-select [formControlName]="f.key" multiple>
                            @for (c of classes(); track c.id) {
                              <mat-option [value]="c.id">{{ classLabel(c) }}</mat-option>
                            }
                          </mat-select>
                        }
                        @case ('number') {
                          <input matInput type="number" [formControlName]="f.key" />
                        }
                        @default {
                          <input
                            matInput
                            [type]="
                              f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'
                            "
                            [formControlName]="f.key"
                          />
                        }
                      }
                    </mat-form-field>
                  }
                </div>
              }
            </div>
          }
        }
        <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div class="flex gap-2">
            <button
              mat-stroked-button
              type="button"
              class="rounded-xl!"
              [disabled]="formTab() === 0"
              (click)="formTab.set(formTab() - 1)"
            >
              Précédent
            </button>
            @if (formTab() < groups.length - 1) {
              <button
                mat-stroked-button
                type="button"
                class="rounded-xl!"
                (click)="formTab.set(formTab() + 1)"
              >
                Suivant
              </button>
            }
          </div>
          <button
            mat-flat-button
            class="rounded-xl! teachers-cta"
            type="submit"
            [disabled]="submitting()"
          >
            {{ submitting() ? 'Ajout…' : "Ajouter l'enseignant" }}
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
        <input matInput [formControl]="searchCtrl" placeholder="Nom, prénom, e-mail…" />
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
        <mat-label>Statut</mat-label>
        <mat-select [value]="activeStatus()" (selectionChange)="filterByStatus($event.value)">
          <mat-option value="">Tous</mat-option>
          @for (o of statusOptions; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-28"
        subscriptSizing="dynamic"
      >
        <mat-label>Par page</mat-label>
        <mat-select [value]="limit()" (selectionChange)="changeLimit($event.value)">
          @for (n of pageSizes; track n) {
            <mat-option [value]="n">{{ n }}</mat-option>
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
          title="Impossible de charger les enseignants"
          description="Vérifiez votre connexion puis réessayez."
          actionLabel="Réessayer"
          (action)="reload()"
        />
      </div>
    } @else if (teachers().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="badge"
          title="Aucun enseignant"
          description="Ajoutez votre premier enseignant ou élargissez les filtres."
          actionLabel="Nouvel enseignant"
          (action)="openCreateForm()"
        />
      </div>
    } @else {
      <div class="grid gap-3 mb-2">
        @for (t of teachers(); track t.id) {
          <article class="teacher-card panga-card p-4">
            <div class="flex gap-3 items-start">
              <a
                [routerLink]="['/', 'teachers', t.id]"
                class="flex items-start gap-3 min-w-0 flex-1 no-underline"
              >
                <panga-avatar [name]="name(t)" [size]="48" class="shrink-0" />
                <div class="min-w-0 flex-1">
                  @if (t.specialization) {
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wide truncate"
                      style="color: var(--brand-deep)"
                    >
                      {{ t.specialization }}
                    </p>
                  }
                  <h3
                    class="text-sm font-semibold text-(--text) truncate"
                    [class.mt-0.5]="!!t.specialization"
                    style="font-family: Urbanist, sans-serif"
                  >
                    {{ name(t) || '—' }}
                  </h3>
                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-(--text-muted)"
                  >
                    @if (t.employeeNumber) {
                      <span class="inline-flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[14px] shrink-0">badge</span>
                        <span class="truncate">{{ t.employeeNumber }}</span>
                      </span>
                    }
                    @if (email(t)) {
                      <span class="inline-flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[14px] shrink-0">mail</span>
                        <span class="truncate">{{ email(t) }}</span>
                      </span>
                    }
                    @if (t.classInstancesAsTeacher?.length; as classCount) {
                      <span class="inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">meeting_room</span>
                        {{ classCount }} classe(s)
                      </span>
                    }
                  </div>
                  <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                    @if (t.employmentType) {
                      <span class="chip chip--info">{{ employment(t.employmentType) }}</span>
                    }
                    @if (t.status) {
                      <span
                        class="chip"
                        [class.chip--success]="t.status === 'active'"
                        [class.chip--warning]="t.status === 'on_leave'"
                        [class.chip--danger]="t.status === 'suspended' || t.status === 'terminated'"
                        [class.chip--neutral]="
                          t.status !== 'active' &&
                          t.status !== 'on_leave' &&
                          t.status !== 'suspended' &&
                          t.status !== 'terminated'
                        "
                      >
                        @if (t.status === 'active') {
                          <span class="chip__dot"></span>
                        }
                        {{ statusLabel(t.status) }}
                      </span>
                    }
                  </div>
                </div>
              </a>
              <button
                mat-icon-button
                [matMenuTriggerFor]="statusMenu"
                matTooltip="Changer le statut"
                aria-label="Changer le statut"
                class="teacher-card__menu shrink-0"
              >
                <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
              </button>
              <mat-menu #statusMenu="matMenu" class="panga-menu">
                <p class="px-4 pt-2 pb-1 text-xs text-(--text-muted)">Changer le statut</p>
                @for (s of statusOptions; track s.value) {
                  <button
                    mat-menu-item
                    (click)="changeStatus(t, s.value)"
                    [disabled]="t.status === s.value"
                  >
                    <mat-icon fontSet="material-symbols-outlined">
                      {{ t.status === s.value ? 'check' : 'radio_button_unchecked' }}
                    </mat-icon>
                    <span>{{ s.label }}</span>
                  </button>
                }
              </mat-menu>
            </div>
          </article>
        }
      </div>
      @if (pagination()) {
        <div class="panga-card mt-3">
          <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
        </div>
      }
    }
  `,
  styles: [
    `
      button.teachers-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.teachers-cta .mat-icon,
      button.teachers-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.teachers-cta:disabled {
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
      .teacher-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .teacher-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .teacher-card__menu {
        color: var(--text-muted) !important;
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
      .chip--info {
        color: #5ba3d4;
        background: color-mix(in srgb, #5ba3d4 14%, transparent);
        border-color: color-mix(in srgb, #5ba3d4 28%, transparent);
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
      .chip--danger {
        color: var(--danger);
        background: color-mix(in srgb, var(--danger) 14%, transparent);
        border-color: color-mix(in srgb, var(--danger) 28%, transparent);
      }
      .chip--neutral {
        color: var(--text-muted);
        background: color-mix(in srgb, var(--text-muted) 12%, transparent);
        border-color: color-mix(in srgb, var(--text-muted) 22%, transparent);
      }
    `,
  ],
})
export class TeachersList {
  private readonly teachersApi = inject(TeachersService);
  private readonly classesApi = inject(ClassesService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly groups = GROUPS;
  protected readonly statusOptions = TEACHER_STATUS_OPTIONS;
  protected readonly classLabel = classLabel;
  protected readonly employment = employmentLabel;

  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly pageSizes = [20, 50, 100];
  protected readonly search = signal('');
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly activeStatus = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly importing = signal(false);
  protected readonly showForm = signal(false);
  protected readonly formTab = signal(0);

  protected readonly statsTotal = signal(0);
  protected readonly statsActive = signal(0);
  protected readonly statsFullTime = signal(0);
  protected readonly statsSpecialties = signal(0);

  protected readonly headerSubtitle = computed(() => {
    const year = this.sy.selected();
    return year
      ? `Corps enseignant de l'établissement · Année ${year}`
      : "Corps enseignant de l'établissement";
  });

  protected readonly form = new FormGroup(
    Object.fromEntries(
      ALL_KEYS.map((k) => {
        const required = k === 'firstName' || k === 'lastName';
        if (k === 'homeroomClassInstanceIds') {
          return [k, new FormControl<string[]>([], { nonNullable: true })];
        }
        const initial =
          k === 'gender'
            ? 'M'
            : k === 'employmentType'
              ? 'full_time'
              : k === 'status'
                ? 'active'
                : '';
        return [
          k,
          new FormControl(initial, {
            nonNullable: true,
            validators: required ? [Validators.required] : [],
          }),
        ];
      }),
    ),
  );

  constructor() {
    this.reload();
    effect(() => {
      this.sy.selected();
      untracked(() =>
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) }),
      );
    });
    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => {
        this.search.set(v.trim());
        this.page.set(1);
        this.load();
      });
  }

  protected name(t: Teacher): string {
    return personLabel((t.user ?? t) as Record<string, unknown>);
  }
  protected email(t: Teacher): string {
    return ((t.user?.['email'] ?? t['email']) as string) || '';
  }
  protected statusLabel(value: string): string {
    return TEACHER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  filterByStatus(status: string): void {
    this.activeStatus.set(status);
    this.page.set(1);
    this.load();
  }

  changeLimit(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
    this.load();
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
    this.loadStats();
  }

  private loadStats(): void {
    const safe = <T>(o: Observable<T>) => o.pipe(catchError(() => of(null)));
    safe(this.teachersApi.list({ page: 1, limit: STATS_LIMIT })).subscribe((sample) => {
      const items = sample?.items ?? [];
      this.statsTotal.set(sample?.pagination?.total ?? items.length);
      this.statsActive.set(items.filter((t) => t.status === 'active').length);
      this.statsFullTime.set(items.filter((t) => t.employmentType === 'full_time').length);
      this.statsSpecialties.set(new Set(items.map((t) => t.specialization).filter(Boolean)).size);
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const search = this.search() || undefined;
    const status = this.activeStatus();

    // Filtre statut : l'API n'expose que `search` → échantillon + pagination locale.
    if (status) {
      this.teachersApi
        .list({ page: 1, limit: STATS_LIMIT, ...(search ? { search } : {}) })
        .subscribe({
          next: (res) => {
            const filtered = res.items.filter((t) => t.status === status);
            const lim = this.limit();
            const page = this.page();
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / lim));
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * lim;
            this.teachers.set(filtered.slice(start, start + lim));
            this.pagination.set({ page: safePage, limit: lim, total, totalPages });
            if (safePage !== page) {
              this.page.set(safePage);
            }
            this.loading.set(false);
          },
          error: () => {
            this.teachers.set([]);
            this.pagination.set(null);
            this.loadError.set(true);
            this.loading.set(false);
          },
        });
      return;
    }

    this.teachersApi
      .list({ page: this.page(), limit: this.limit(), ...(search ? { search } : {}) })
      .subscribe({
        next: (res) => {
          this.teachers.set(res.items);
          this.pagination.set(res.pagination ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.teachers.set([]);
          this.pagination.set(null);
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }

  onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.importing()) {
      return;
    }
    this.importing.set(true);
    this.teachersApi.importExcel(file).subscribe({
      next: (res) => {
        this.importing.set(false);
        const count = Number(res?.['success'] ?? res?.['imported'] ?? res?.['count']) || 0;
        this.notify.success(count ? `${count} enseignant(s) importé(s).` : 'Import terminé.');
        input.value = '';
        this.page.set(1);
        this.reload();
      },
      error: () => {
        this.importing.set(false);
        input.value = '';
      },
    });
  }

  downloadTemplate(): void {
    this.teachersApi.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_enseignants.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  changeStatus(teacher: Teacher, status: string): void {
    if (teacher.status === status) {
      return;
    }
    this.teachersApi.updateStatus(teacher.id, status).subscribe({
      next: () => {
        this.notify.success('Statut mis à jour.');
        this.reload();
      },
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      for (let i = 0; i < this.groups.length; i++) {
        const keys = this.groups[i].fields.map((f) => f.key);
        if (keys.some((k) => this.form.get(k)?.invalid)) {
          this.formTab.set(i);
          break;
        }
      }
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const numberKeys = new Set(['yearsOfExperience', 'salary', 'qualificationYear']);
    const csvKeys = new Set(['subjectsTaught', 'languagesSpoken']);
    const payload: Record<string, unknown> = {};
    for (const key of ALL_KEYS) {
      const v = raw[key];
      if (key === 'homeroomClassInstanceIds') {
        if (Array.isArray(v) && v.length) {
          payload[key] = v;
        }
      } else if (csvKeys.has(key)) {
        const arr = String(v)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (arr.length) {
          payload[key] = arr;
        }
      } else if (v !== '') {
        payload[key] = numberKeys.has(key) ? Number(v) : v;
      }
    }
    this.teachersApi.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Enseignant ajouté.');
        this.form.reset({
          gender: 'M',
          employmentType: 'full_time',
          status: 'active',
          homeroomClassInstanceIds: [],
        });
        this.showForm.set(false);
        this.formTab.set(0);
        this.page.set(1);
        this.reload();
      },
      error: () => this.submitting.set(false),
    });
  }
}
