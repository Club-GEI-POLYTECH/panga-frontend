import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TeachersService } from '../services/teachers.service';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance, Teacher } from '../models/admin.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { EnumOption } from '../../../core/models/school.enums';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import { classLabel, personLabel } from '../shared/labels';
import { employmentLabel, teacherStatusTone } from '../shared/teacher-labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

const SCHOOL_YEAR = '2024-2025';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'csv' | 'classes';
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
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'country', label: 'Pays' },
    ],
  },
  {
    title: 'Professionnel',
    icon: 'work',
    fields: [
      { key: 'employeeNumber', label: "Numéro d'employé" },
      { key: 'specialization', label: 'Spécialisation' },
      { key: 'academicTitle', label: 'Titre académique' },
      { key: 'hireDate', label: "Date d'embauche", type: 'date' },
      { key: 'yearsOfExperience', label: "Années d'expérience", type: 'number' },
      { key: 'salary', label: 'Salaire', type: 'number' },
      { key: 'previousEmployer', label: 'Employeur précédent' },
      { key: 'office', label: 'Bureau' },
      { key: 'officePhone', label: 'Téléphone bureau', type: 'tel' },
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

@Component({
  selector: 'panga-teachers-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header
      icon="badge"
      title="Enseignants"
      subtitle="Corps enseignant de l'établissement"
    >
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvel enseignant' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Enseignants" [value]="total()" icon="badge" />
      <panga-kpi-card label="Temps plein" [value]="fullTime()" icon="schedule" />
      <panga-kpi-card label="Spécialités" [value]="specialties()" icon="menu_book" />
      <panga-kpi-card label="Affichés" [value]="teachers().length" icon="visibility" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouvel enseignant" />
        @for (group of groups; track group.title) {
          <p class="text-sm font-semibold text-[var(--text)] mt-3 mb-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-[var(--brand-500)]">{{
              group.icon
            }}</span>
            {{ group.title }}
          </p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (f of group.fields; track f.key) {
              <div [class]="f.wide ? 'sm:col-span-2 lg:col-span-3' : ''">
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
                          f.type === 'date'
                            ? 'date'
                            : f.type === 'email'
                              ? 'email'
                              : f.type === 'tel'
                                ? 'tel'
                                : 'text'
                        "
                        [formControlName]="f.key"
                      />
                    }
                  }
                </mat-form-field>
              </div>
            }
          </div>
        }
        <div class="flex justify-end mt-2">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Ajouter l'enseignant
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (teachers().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="badge"
          title="Aucun enseignant"
          description="Ajoutez votre premier enseignant."
          actionLabel="Nouvel enseignant"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (t of teachers(); track t.id) {
          <a
            [routerLink]="['/', 'teachers', t.id]"
            class="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
          >
            <panga-avatar [name]="name(t)" [size]="46" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text)] truncate">{{ name(t) || '—' }}</p>
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]"
              >
                @if (t.employeeNumber) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">badge</span>
                    {{ t.employeeNumber }}
                  </span>
                }
                @if (email(t)) {
                  <span class="inline-flex items-center gap-1 truncate">
                    <span class="material-symbols-outlined text-[14px]">mail</span> {{ email(t) }}
                  </span>
                }
                @if (t.classInstancesAsTeacher?.length) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">meeting_room</span>
                    {{ t.classInstancesAsTeacher?.length }} classe(s)
                  </span>
                }
              </div>
            </div>
            <div class="hidden sm:flex items-center gap-2 shrink-0">
              @if (t.specialization) {
                <panga-status-badge [label]="t.specialization" tone="brand" [dot]="false" />
              }
              @if (t.employmentType) {
                <panga-status-badge
                  [label]="employment(t.employmentType)"
                  tone="info"
                  [dot]="false"
                />
              }
              @if (t.status) {
                <panga-status-badge [label]="t.status" [tone]="statusTone(t.status)" />
              }
            </div>
            <mat-icon
              fontSet="material-symbols-outlined"
              class="text-[var(--text-muted)] hidden sm:block"
            >
              chevron_right
            </mat-icon>
          </a>
        }
        @if (pagination()) {
          <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
        }
      </div>
    }
  `,
})
export class TeachersList {
  private readonly teachersApi = inject(TeachersService);
  private readonly classesApi = inject(ClassesService);
  private readonly notify = inject(NotificationService);

  protected readonly groups = GROUPS;
  protected readonly classLabel = classLabel;
  protected readonly employment = employmentLabel;
  protected readonly statusTone = teacherStatusTone;

  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly total = signal(0);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly fullTime = computed(
    () => this.teachers().filter((t) => t.employmentType === 'full_time').length,
  );
  protected readonly specialties = computed(
    () =>
      new Set(
        this.teachers()
          .map((t) => t.specialization)
          .filter(Boolean),
      ).size,
  );

  protected readonly form = new FormGroup(
    Object.fromEntries(
      ALL_KEYS.map((k) => {
        const required = k === 'firstName' || k === 'lastName';
        if (k === 'homeroomClassInstanceIds') {
          return [k, new FormControl<string[]>([], { nonNullable: true })];
        }
        return [
          k,
          new FormControl(k === 'gender' ? 'M' : '', {
            nonNullable: true,
            validators: required ? [Validators.required] : [],
          }),
        ];
      }),
    ),
  );

  constructor() {
    this.load();
    this.classesApi.list(SCHOOL_YEAR).subscribe({ next: (r) => this.classes.set(r.items) });
  }

  protected name(t: Teacher): string {
    return personLabel((t.user ?? t) as Record<string, unknown>);
  }
  protected email(t: Teacher): string {
    return ((t.user?.['email'] ?? t['email']) as string) || '';
  }

  private load(): void {
    this.loading.set(true);
    this.teachersApi.list({ page: this.page(), limit: 10 }).subscribe({
      next: (res) => {
        this.teachers.set(res.items);
        this.pagination.set(res.pagination ?? null);
        this.total.set(res.pagination?.total ?? res.items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const numberKeys = new Set(['yearsOfExperience', 'salary']);
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
        this.form.reset({ gender: 'M', homeroomClassInstanceIds: [] });
        this.showForm.set(false);
        this.page.set(1);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
