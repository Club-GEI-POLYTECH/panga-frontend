import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TeachersService } from '../services/teachers.service';
import { ClassesService } from '../services/classes.service';
import { UsersService } from '../services/users.service';
import type { ClassInstance, Teacher } from '../models/admin.models';
import { catchError, forkJoin, of } from 'rxjs';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import type { EnumOption } from '../../../core/models/school.enums';
import { COUNTRY_OPTIONS } from '../../../core/models/geo.reference';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  QUALIFICATION_LEVEL_OPTIONS,
  TEACHER_STATUS_OPTIONS,
} from '../../../core/models/teacher.enums';
import { classLabel, personLabel } from '../shared/labels';
import { employmentLabel } from '../shared/teacher-labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { DateField } from '../../../shared/ui/date-field';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PhoneField } from '../../../shared/ui/phone-field';
import { ProvinceField } from '../../../shared/ui/province-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { CredentialReveal } from '../../../shared/ui/credential-reveal';
import { Skeleton } from '../../../shared/skeleton/skeleton';
import { SkeletonCard } from '../../../shared/skeleton/skeleton-card';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'phone' | 'province';
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
      { key: 'phone', label: 'Téléphone', type: 'phone', fromUser: true },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'phone', fromUser: true },
      { key: 'email', label: 'E-mail', type: 'email', fromUser: true },
      { key: 'address', label: 'Adresse', wide: true, fromUser: true },
      { key: 'city', label: 'Ville', fromUser: true },
      { key: 'country', label: 'Pays', type: 'select', options: COUNTRY_OPTIONS, fromUser: true },
      { key: 'province', label: 'Province', type: 'province', fromUser: true },
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
      { key: 'officePhone', label: 'Téléphone bureau', type: 'phone' },
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
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    Avatar,
    DateField,
    EmptyState,
    PhoneField,
    ProvinceField,
    SectionHeader,
    CredentialReveal,
    Skeleton,
    SkeletonCard,
  ],
  template: `
    <a
      [routerLink]="['/', 'teachers']"
      class="inline-flex items-center gap-1 text-sm text-(--text-muted) hover:text-(--brand-700) mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="text-base! w-4! h-4!"
        >arrow_back</mat-icon
      >
      Enseignants
    </a>

    @if (credential(); as c) {
      <panga-credential-reveal
        title="Nouveau mot de passe — accès enseignant"
        [identifier]="identifier()"
        [password]="c"
        (dismiss)="credential.set(null)"
      />
    }

    @if (loading()) {
      <div class="mb-5">
        <panga-skeleton width="100%" height="8rem" radius="1.5rem" />
      </div>
      <div class="flex gap-2 mb-4">
        @for (_ of [1, 2, 3]; track $index) {
          <panga-skeleton width="7rem" height="2.25rem" radius="0.75rem" />
        }
      </div>
      <panga-skeleton-card />
      <div class="grid gap-4 lg:grid-cols-2 mt-4">
        <panga-skeleton-card />
        <panga-skeleton-card />
      </div>
    } @else if (loadError()) {
      <div class="panga-card p-6">
        <panga-empty-state
          icon="error"
          title="Impossible de charger l'enseignant"
          description="Vérifiez votre connexion puis réessayez."
          actionLabel="Réessayer"
          (action)="reload()"
        />
      </div>
    } @else {
      <div
        class="relative overflow-hidden rounded-3xl p-6 mb-5 text-white"
        style="background: var(--brand-gradient)"
      >
        <div
          class="absolute -right-8 -bottom-10 h-40 w-40 rounded-full opacity-15"
          style="background:#fff"
        ></div>
        <div class="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex items-center gap-4 min-w-0 flex-1">
            <panga-avatar [name]="name()" [size]="64" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <h1 class="text-2xl font-semibold truncate" style="font-family: Urbanist, sans-serif">
                {{ name() || 'Enseignant' }}
              </h1>
              <p class="text-sm opacity-90">
                @if (teacher()?.employeeNumber) {
                  {{ teacher()?.employeeNumber }}
                }
                @if (teacher()?.specialization) {
                  · {{ teacher()?.specialization }}
                }
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                @if (teacher()?.employmentType) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                    {{ employment(teacher()?.employmentType) }}
                  </span>
                }
                @if (statusLabel(teacher()?.status)) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                    {{ statusLabel(teacher()?.status) }}
                  </span>
                }
                @if (schoolYear()) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_month</span>
                    Année {{ schoolYear() }}
                  </span>
                }
                @if (updatedAt()) {
                  <span class="opacity-85">
                    Mis à jour {{ updatedAt() | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                }
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            <button
              mat-flat-button
              class="rounded-xl! hero-cta"
              [disabled]="resetting() || !userId()"
              (click)="resetPassword()"
            >
              <mat-icon fontSet="material-symbols-outlined">key</mat-icon>
              Réinitialiser le mot de passe
            </button>
            <button
              mat-stroked-button
              class="rounded-xl! hero-danger"
              (click)="remove()"
              matTooltip="Supprimer cet enseignant"
              aria-label="Supprimer"
            >
              <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div
          class="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1"
          role="tablist"
          aria-label="Sections du dossier enseignant"
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
            <div class="panga-card p-5 mb-4">
              <panga-section-header [icon]="group.icon" [title]="group.title" />
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
            </div>
          }
        }

        <div class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 mb-6">
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
            class="rounded-xl! shadow-lg save-cta"
            type="submit"
            [disabled]="saving() || form.pristine"
          >
            <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>

      <section class="panga-card p-5 mb-4">
        <panga-section-header icon="sell" title="Compétences" [count]="chipCount()" />
        @if (chips().length) {
          <div class="flex flex-col gap-3">
            @for (block of chips(); track block.label) {
              <div>
                <p class="text-xs text-(--text-muted) mb-1.5">{{ block.label }}</p>
                <div class="flex flex-wrap gap-1.5">
                  @for (v of block.values; track v) {
                    <span class="skill-chip">{{ v }}</span>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <panga-empty-state
            [compact]="true"
            icon="sell"
            title="Aucune compétence"
            description="Matières, langues et certifications s'afficheront ici."
          />
        }
      </section>

      <section class="grid gap-4 lg:grid-cols-2 mb-4">
        <div class="panga-card p-5">
          <panga-section-header
            icon="meeting_room"
            title="Classes (titulaire)"
            [count]="homerooms().length"
          />
          @if (homerooms().length) {
            <div class="grid gap-2">
              @for (c of homerooms(); track classId(c) || $index) {
                @if (classId(c); as cid) {
                  <a
                    [routerLink]="['/', 'classes', cid]"
                    class="relation-card flex flex-col gap-0.5 no-underline"
                  >
                    <span class="text-sm font-medium text-(--text) truncate">{{
                      classTitle(c)
                    }}</span>
                    <span class="text-xs text-(--text-muted) truncate">
                      @if (str(c['schoolYear'])) {
                        {{ str(c['schoolYear']) }}
                      }
                      @if (str(c['schoolYear']) && str(c['currentEnrollment'])) {
                        ·
                      }
                      {{ str(c['currentEnrollment']) || '0' }} inscrit(s)
                      @if (str(c['roomNumber'])) {
                        · Salle {{ str(c['roomNumber']) }}
                      }
                    </span>
                  </a>
                } @else {
                  <div class="relation-card flex flex-col gap-0.5">
                    <span class="text-sm font-medium text-(--text) truncate">{{
                      classTitle(c)
                    }}</span>
                    <span class="text-xs text-(--text-muted) truncate">
                      @if (str(c['schoolYear'])) {
                        {{ str(c['schoolYear']) }}
                      }
                      · {{ str(c['currentEnrollment']) || '0' }} inscrit(s)
                    </span>
                  </div>
                }
              }
            </div>
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="meeting_room"
              title="Aucune classe"
              description="Les classes dont cet enseignant est titulaire apparaîtront ici."
            />
          }
        </div>
        <div class="panga-card p-5">
          <panga-section-header
            icon="menu_book"
            title="Cours assignés"
            [count]="courses().length"
          />
          @if (courses().length) {
            <div class="grid gap-2">
              @for (c of courses(); track courseKey(c, $index)) {
                <div class="relation-card flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-(--text) truncate">{{
                    courseTitle(c)
                  }}</span>
                  <span class="text-xs text-(--text-muted) truncate">
                    {{ courseMeta(c) }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="menu_book"
              title="Aucun cours"
              description="Les cours assignés à cet enseignant s'afficheront ici."
            />
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      button.hero-cta {
        background: #ffffff !important;
        color: #222026 !important;
      }
      button.hero-cta .mat-icon,
      button.hero-cta .material-symbols-outlined {
        color: #222026 !important;
      }
      button.hero-cta:disabled {
        opacity: 0.55;
      }
      button.hero-danger {
        background: color-mix(in srgb, #fff 12%, transparent) !important;
        color: #ffffff !important;
        border-color: color-mix(in srgb, #fff 45%, transparent) !important;
      }
      button.hero-danger .mat-icon,
      button.hero-danger .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.hero-danger:hover:not(:disabled) {
        background: color-mix(in srgb, var(--danger) 85%, #fff) !important;
        border-color: transparent !important;
      }
      button.save-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.save-cta .mat-icon,
      button.save-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.save-cta:disabled {
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
      .skill-chip {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.25rem 0.65rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--brand-deep);
        background: color-mix(in srgb, var(--brand-500) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--brand-500) 28%, transparent);
      }
      .relation-card {
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 0.75rem 0.9rem;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      a.relation-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 10px 22px -16px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
    `,
  ],
})
export class TeacherDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teachersApi = inject(TeachersService);
  private readonly classesApi = inject(ClassesService);
  private readonly usersApi = inject(UsersService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly groups = GROUPS;
  protected readonly employment = employmentLabel;
  protected readonly schoolYear = computed(() => this.sy.selected());
  protected readonly teacher = signal<Teacher | null>(null);
  /** Relations enrichies (slot programme, etc.) via GET /teachers/:id/classes. */
  private readonly teaching = signal<Teacher | null>(null);
  /** Index des instances de classe de l'école (pour résoudre le nom via template). */
  private readonly classesById = signal<Map<string, ClassInstance>>(new Map());
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  protected readonly resetting = signal(false);
  protected readonly formTab = signal(0);
  /** Mot de passe temporaire renvoyé une seule fois par la réinitialisation. */
  protected readonly credential = signal<string | null>(null);
  /** Id du compte utilisateur (nécessaire au reset) : `userId` ou `user.id`. */
  protected readonly userId = computed(() => {
    const t = this.teacher() as Record<string, unknown> | null;
    const user = (t?.['user'] ?? {}) as Record<string, unknown>;
    return (t?.['userId'] ?? user['id']) as string | undefined;
  });

  protected readonly updatedAt = computed(() => {
    const t = this.teacher() as Record<string, unknown> | null;
    const v = t?.['updatedAt'];
    return typeof v === 'string' && v ? v : null;
  });

  protected readonly homerooms = computed(() => {
    const enriched = this.teaching()?.classInstancesAsTeacher;
    const base = this.teacher()?.classInstancesAsTeacher;
    return (enriched?.length ? enriched : base) ?? [];
  });
  protected readonly courses = computed(() => {
    const enriched = this.teaching()?.classSubjects;
    const base = this.teacher()?.classSubjects;
    return (enriched?.length ? enriched : base) ?? [];
  });

  protected readonly chips = computed<{ label: string; values: string[] }[]>(() => {
    const t = this.teacher();
    const blocks: { label: string; values: string[] }[] = [
      { label: 'Matières enseignées', values: t?.subjectsTaught ?? [] },
      { label: 'Langues parlées', values: t?.languagesSpoken ?? [] },
      { label: 'Certifications', values: t?.certifications ?? [] },
    ];
    return blocks.filter((b) => b.values.length > 0);
  });

  protected readonly chipCount = computed(() =>
    this.chips().reduce((n, b) => n + b.values.length, 0),
  );

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
  /** Identifiant de connexion affiché avec le mot de passe temporaire. */
  protected identifier(): string {
    const user = (this.teacher()?.user ?? {}) as Record<string, unknown>;
    return (
      this.str(user['email']) ||
      this.str(user['username']) ||
      this.str(this.teacher()?.employeeNumber)
    );
  }
  protected str(v: unknown): string {
    return v === null || v === undefined ? '' : String(v);
  }
  protected statusLabel(value: string | null | undefined): string {
    if (!value) return '';
    return TEACHER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  protected classId(c: Record<string, unknown>): string {
    const id = c['id'];
    return typeof id === 'string' && id ? id : '';
  }
  /** Nom de classe : priorité à l'instance résolue (template), puis champs locaux. */
  protected classTitle(c: Record<string, unknown>): string {
    const id = this.classId(c);
    const resolved = id ? this.classesById().get(id) : undefined;
    if (resolved) {
      const label = classLabel(resolved as unknown as Record<string, unknown>);
      if (label && label !== 'Classe') {
        return label;
      }
    }
    const direct = classLabel(c);
    if (direct && direct !== 'Classe') {
      return direct;
    }
    const tpl = (c['template'] ?? {}) as Record<string, unknown>;
    return (
      this.str(tpl['name']) ||
      [this.str(tpl['level']), this.str(tpl['section'])].filter(Boolean).join(' ') ||
      this.str(c['roomNumber']) ||
      'Classe'
    );
  }
  protected courseKey(c: Record<string, unknown>, index: number): string {
    return this.str(c['id']) || `${this.str(c['classSubjectId'])}-${index}`;
  }
  /** Libellé matière (slot programme national), jamais l'année scolaire. */
  protected courseTitle(c: Record<string, unknown>): string {
    const slot = (c['nationalProgramSlot'] ?? {}) as Record<string, unknown>;
    const subject = (c['subject'] ?? {}) as Record<string, unknown>;
    return (
      this.str(slot['labelFr']) ||
      this.str(slot['programCode']) ||
      this.str(c['subjectLabel']) ||
      this.str(subject['labelFr']) ||
      this.str(subject['name']) ||
      this.str(c['label']) ||
      this.str(c['name']) ||
      'Cours'
    );
  }
  protected courseMeta(c: Record<string, unknown>): string {
    const parts: string[] = [];
    const hours = this.str(c['hoursPerWeek']);
    parts.push(hours ? `${hours} h/sem` : '— h/sem');
    const ci = (c['classInstance'] ?? {}) as Record<string, unknown>;
    const className = this.classTitle(ci);
    if (className && className !== 'Classe') {
      parts.push(className);
    } else {
      const classId = this.str(c['classInstanceId'] ?? c['classId'] ?? ci['id']);
      const resolved = classId ? this.classesById().get(classId) : undefined;
      if (resolved) {
        const label = classLabel(resolved as unknown as Record<string, unknown>);
        if (label && label !== 'Classe') {
          parts.push(label);
        }
      }
    }
    const year = this.str(c['schoolYear'] ?? ci['schoolYear']);
    if (year) {
      parts.push(year);
    }
    const room = this.str(c['roomNumber'] ?? ci['roomNumber']);
    if (room) {
      parts.push(`Salle ${room}`);
    }
    return parts.join(' · ');
  }

  resetPassword(): void {
    const uid = this.userId();
    if (!uid || this.resetting()) {
      return;
    }
    this.resetting.set(true);
    this.usersApi.resetPassword(uid).subscribe({
      next: (r) => {
        this.resetting.set(false);
        if (r.temporaryPassword) {
          this.credential.set(r.temporaryPassword);
        }
        this.notify.success('Mot de passe réinitialisé.');
      },
      error: () => this.resetting.set(false),
    });
  }

  remove(): void {
    const label = this.name() || 'cet enseignant';
    if (!confirm(`Supprimer ${label} ? Cette action est irréversible.`)) {
      return;
    }
    this.teachersApi.remove(this.id).subscribe({
      next: () => {
        this.notify.success('Enseignant supprimé.');
        void this.router.navigate(['/', 'teachers']);
      },
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      teacher: this.teachersApi.get(this.id),
      teaching: this.teachersApi.classes(this.id).pipe(catchError(() => of(null))),
      classes: this.classesApi
        .list(this.sy.filter())
        .pipe(catchError(() => of({ items: [] as ClassInstance[], pagination: null }))),
    }).subscribe({
      next: ({ teacher, teaching, classes }) => {
        this.teacher.set(teacher);
        this.patch(teacher);
        const enriched = (teaching ?? null) as Teacher | null;
        this.teaching.set(enriched);
        const map = new Map<string, ClassInstance>();
        for (const c of classes.items ?? []) {
          if (c.id) {
            map.set(c.id, c);
          }
        }
        this.classesById.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.teacher.set(null);
        this.teaching.set(null);
        this.loadError.set(true);
        this.loading.set(false);
      },
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
