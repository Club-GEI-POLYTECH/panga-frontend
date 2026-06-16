import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TeachersService } from '../services/teachers.service';
import type { Teacher } from '../models/admin.models';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import type { EnumOption } from '../../../core/models/school.enums';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  QUALIFICATION_LEVEL_OPTIONS,
  TEACHER_STATUS_OPTIONS,
} from '../../../core/models/teacher.enums';
import { personLabel } from '../shared/labels';
import { employmentLabel } from '../shared/teacher-labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { SectionHeader } from '../../../shared/ui/section-header';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: EnumOption[];
  fromUser?: boolean;
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
      { key: 'firstName', label: 'Prénom', fromUser: true },
      { key: 'lastName', label: 'Nom', fromUser: true },
      { key: 'postnom', label: 'Postnom', fromUser: true },
      { key: 'gender', label: 'Sexe', type: 'select', options: GENDER_OPTIONS, fromUser: true },
      { key: 'dateOfBirth', label: 'Date de naissance', type: 'date', fromUser: true },
      { key: 'placeOfBirth', label: 'Lieu de naissance', fromUser: true },
      { key: 'nationality', label: 'Nationalité', fromUser: true },
    ],
  },
  {
    title: 'Contact',
    icon: 'contacts',
    fields: [
      { key: 'phone', label: 'Téléphone', type: 'tel', fromUser: true },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'tel', fromUser: true },
      { key: 'email', label: 'E-mail', type: 'email', fromUser: true },
      { key: 'address', label: 'Adresse', wide: true, fromUser: true },
      { key: 'city', label: 'Ville', fromUser: true },
      { key: 'province', label: 'Province', fromUser: true },
      { key: 'country', label: 'Pays', fromUser: true },
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
      { key: 'salaryCurrency', label: 'Devise' },
      { key: 'previousEmployer', label: 'Employeur précédent' },
      { key: 'previousPosition', label: 'Poste précédent' },
      { key: 'office', label: 'Bureau' },
      { key: 'officeNumber', label: 'N° de bureau' },
      { key: 'officePhone', label: 'Téléphone bureau', type: 'tel' },
      { key: 'officeHours', label: 'Heures de bureau' },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
const NUMBER_KEYS = new Set(['yearsOfExperience', 'salary', 'qualificationYear']);
const FROM_USER = new Set(
  GROUPS.flatMap((g) => g.fields.filter((f) => f.fromUser).map((f) => f.key)),
);

@Component({
  selector: 'panga-teacher-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    Avatar,
    SectionHeader,
  ],
  template: `
    <a
      [routerLink]="['/', 'teachers']"
      class="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-700)] mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="!text-base !w-4 !h-4"
        >arrow_back</mat-icon
      >
      Enseignants
    </a>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <div
        class="relative overflow-hidden rounded-3xl p-6 mb-5 text-white"
        style="background: var(--brand-gradient)"
      >
        <div
          class="absolute -right-8 -bottom-10 h-40 w-40 rounded-full opacity-15"
          style="background:#fff"
        ></div>
        <div class="relative flex flex-wrap items-center gap-4">
          <panga-avatar [name]="name()" [size]="64" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Poppins, sans-serif">
              {{ name() || 'Enseignant' }}
            </h1>
            <p class="text-sm opacity-90">
              {{ teacher()?.employeeNumber }}
              @if (teacher()?.specialization) {
                · {{ teacher()?.specialization }}
              }
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            @if (teacher()?.employmentType) {
              <span class="rounded-full bg-white/15 px-2.5 py-1 text-xs">{{
                employment(teacher()?.employmentType)
              }}</span>
            }
            @if (teacher()?.status) {
              <span class="rounded-full bg-white/15 px-2.5 py-1 text-xs">{{
                teacher()?.status
              }}</span>
            }
            <button
              mat-icon-button
              class="!text-white"
              (click)="remove()"
              matTooltip="Supprimer"
              aria-label="Supprimer"
            >
              <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        @for (group of groups; track group.title) {
          <div class="panga-card p-5 mb-4">
            <panga-section-header [icon]="group.icon" [title]="group.title" />
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (f of group.fields; track f.key) {
                <div [class]="f.wide ? 'sm:col-span-2 lg:col-span-3' : ''">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ f.label }}</mat-label>
                    @switch (f.type) {
                      @case ('select') {
                        <mat-select [formControlName]="f.key">
                          <mat-option [value]="''">—</mat-option>
                          @for (o of f.options ?? []; track o.value) {
                            <mat-option [value]="o.value">{{ o.label }}</mat-option>
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
          </div>
        }

        <div class="sticky bottom-4 z-10 flex justify-end mb-6">
          <button
            mat-flat-button
            class="!rounded-xl shadow-lg"
            type="submit"
            [disabled]="saving() || form.pristine"
          >
            <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>

      <!-- Matières / langues / certifications -->
      @if (chips().length) {
        <section class="panga-card p-5 mb-4">
          <panga-section-header icon="sell" title="Compétences" />
          <div class="flex flex-col gap-3">
            @for (block of chips(); track block.label) {
              <div>
                <p class="text-xs text-[var(--text-muted)] mb-1.5">{{ block.label }}</p>
                <div class="flex flex-wrap gap-1.5">
                  @for (v of block.values; track v) {
                    <span
                      class="rounded-full px-2.5 py-1 text-xs"
                      style="background: color-mix(in srgb, var(--brand-500) 12%, transparent); color: var(--brand-700)"
                    >
                      {{ v }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- Classes & cours -->
      <section class="grid gap-4 lg:grid-cols-2 mb-4">
        <div class="panga-card p-5">
          <panga-section-header
            icon="meeting_room"
            title="Classes (titulaire)"
            [count]="homerooms().length"
          />
          @for (c of homerooms(); track $index) {
            <div
              class="flex items-center justify-between gap-2 py-2 border-b border-[var(--border)] last:border-0"
            >
              <span class="text-sm text-[var(--text)]">{{ str(c['schoolYear']) || 'Classe' }}</span>
              <span class="text-xs text-[var(--text-muted)]"
                >{{ str(c['currentEnrollment']) || '0' }} inscrit(s)</span
              >
            </div>
          } @empty {
            <p class="text-sm text-[var(--text-muted)]">Aucune classe.</p>
          }
        </div>
        <div class="panga-card p-5">
          <panga-section-header
            icon="menu_book"
            title="Cours assignés"
            [count]="courses().length"
          />
          @for (c of courses(); track $index) {
            <div
              class="flex items-center justify-between gap-2 py-2 border-b border-[var(--border)] last:border-0"
            >
              <span class="text-sm text-[var(--text)]">
                {{ str(c['hoursPerWeek']) || '—' }} h/sem
                @if (c['roomNumber']) {
                  · {{ str(c['roomNumber']) }}
                }
              </span>
              <span class="text-xs text-[var(--text-muted)]">{{ str(c['schoolYear']) }}</span>
            </div>
          } @empty {
            <p class="text-sm text-[var(--text-muted)]">Aucun cours.</p>
          }
        </div>
      </section>
    }
  `,
})
export class TeacherDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teachersApi = inject(TeachersService);
  private readonly notify = inject(NotificationService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly groups = GROUPS;
  protected readonly employment = employmentLabel;
  protected readonly teacher = signal<Teacher | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly homerooms = computed(() => this.teacher()?.classInstancesAsTeacher ?? []);
  protected readonly courses = computed(() => this.teacher()?.classSubjects ?? []);

  protected readonly chips = computed<{ label: string; values: string[] }[]>(() => {
    const t = this.teacher();
    const blocks: { label: string; values: string[] }[] = [
      { label: 'Matières enseignées', values: t?.subjectsTaught ?? [] },
      { label: 'Langues parlées', values: t?.languagesSpoken ?? [] },
      { label: 'Certifications', values: t?.certifications ?? [] },
    ];
    return blocks.filter((b) => b.values.length > 0);
  });

  protected readonly form = new FormGroup(
    Object.fromEntries(ALL_KEYS.map((k) => [k, new FormControl('', { nonNullable: true })])),
  );

  constructor() {
    this.reload();
  }

  protected name(): string {
    const t = this.teacher();
    return t ? personLabel((t.user ?? t) as Record<string, unknown>) : '';
  }
  protected str(v: unknown): string {
    return v === null || v === undefined ? '' : String(v);
  }

  remove(): void {
    this.teachersApi.remove(this.id).subscribe({
      next: () => {
        this.notify.success('Enseignant supprimé.');
        void this.router.navigate(['/', 'teachers']);
      },
    });
  }

  private reload(): void {
    this.teachersApi.get(this.id).subscribe({
      next: (t) => {
        this.teacher.set(t);
        this.patch(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private patch(t: Teacher): void {
    const teacher = t as Record<string, unknown>;
    const user = (t.user ?? {}) as Record<string, unknown>;
    const value: Record<string, string> = {};
    for (const key of ALL_KEYS) {
      let v = FROM_USER.has(key) ? user[key] : teacher[key];
      if (key === 'hireDate' || key === 'dateOfBirth') {
        v = typeof v === 'string' ? v.slice(0, 10) : v;
      }
      value[key] = v === null || v === undefined ? '' : String(v);
    }
    this.form.patchValue(value);
    this.form.markAsPristine();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const payload: Record<string, unknown> = {};
    for (const key of ALL_KEYS) {
      const ctrl = this.form.get(key);
      if (ctrl?.dirty) {
        const v = ctrl.value;
        payload[key] = v === '' ? null : NUMBER_KEYS.has(key) ? Number(v) : v;
      }
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    this.saving.set(true);
    this.teachersApi.update(this.id, payload).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.teacher.set(t);
        this.patch(t);
        this.notify.success('Enseignant mis à jour.');
      },
      error: () => this.saving.set(false),
    });
  }
}
