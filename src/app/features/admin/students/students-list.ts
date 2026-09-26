import { DatePipe, NgTemplateOutlet } from '@angular/common';
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
import { catchError, debounceTime, forkJoin, of, type Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FilterSheetContent } from '../../../shared/ui/filter-sheet';
import { StudentsService } from '../services/students.service';
import { ClassesService } from '../services/classes.service';
import { ParentsService } from '../services/parents.service';
import type { ClassInstance, Parent, Student } from '../models/admin.models';
import { classLabel, personLabel } from '../shared/labels';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { EnumOption } from '../../../core/models/school.enums';
import { COUNTRY_OPTIONS } from '../../../core/models/geo.reference';
import {
  BLOOD_GROUP_OPTIONS,
  ENROLLMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
} from '../../../core/models/student.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { CredentialReveal } from '../../../shared/ui/credential-reveal';
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

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'select' | 'phone' | 'province';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: EnumOption[];
  fromClasses?: boolean;
  fromParents?: boolean;
  /** Champ géré hors payload `create` (ex. liaison parent via route dédiée). */
  external?: boolean;
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
      { key: 'placeOfBirth', label: 'Lieu de naissance' },
      { key: 'nationality', label: 'Nationalité' },
      { key: 'bloodGroup', label: 'Groupe sanguin', type: 'select', options: BLOOD_GROUP_OPTIONS },
    ],
  },
  {
    title: 'Scolarité',
    icon: 'school',
    fields: [
      { key: 'classInstanceId', label: 'Classe', type: 'select', fromClasses: true },
      { key: 'parentId', label: 'Parent', type: 'select', fromParents: true, external: true },
      { key: 'status', label: 'Statut', type: 'select', options: STUDENT_STATUS_OPTIONS },
      {
        key: 'enrollmentType',
        label: "Type d'inscription",
        type: 'select',
        options: ENROLLMENT_TYPE_OPTIONS,
      },
      { key: 'enrollmentDate', label: "Date d'inscription", type: 'date' },
      { key: 'previousSchool', label: 'École précédente' },
      { key: 'previousClass', label: 'Classe précédente' },
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
      { key: 'province', label: 'Province', type: 'province' },
    ],
  },
  {
    title: "Tuteur & contact d'urgence",
    icon: 'family_restroom',
    fields: [
      { key: 'guardianName', label: 'Tuteur — nom' },
      { key: 'guardianPhone', label: 'Tuteur — téléphone', type: 'phone' },
      { key: 'guardianRelation', label: 'Tuteur — relation' },
      { key: 'emergencyContactName', label: 'Urgence — nom' },
      { key: 'emergencyContactPhone', label: 'Urgence — téléphone', type: 'phone' },
      { key: 'emergencyContactRelation', label: 'Urgence — relation' },
    ],
  },
  {
    title: 'Transport & divers',
    icon: 'directions_bus',
    fields: [
      { key: 'transportType', label: 'Transport', type: 'select', options: TRANSPORT_TYPE_OPTIONS },
      { key: 'transportRoute', label: 'Itinéraire' },
      { key: 'religion', label: 'Religion' },
      { key: 'motherTongue', label: 'Langue maternelle' },
      { key: 'specialNeeds', label: 'Besoins spéciaux', wide: true },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
/** Clés réellement envoyées au POST /students (le reste = liaisons externes). */
const PAYLOAD_KEYS = GROUPS.flatMap((g) => g.fields.filter((f) => !f.external).map((f) => f.key));

@Component({
  selector: 'panga-students-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    NgTemplateOutlet,
    Avatar,
    CredentialReveal,
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
    <panga-page-header icon="school" title="Élèves" [subtitle]="headerSubtitle()">
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
      <button mat-flat-button class="rounded-xl! students-cta" (click)="toggleForm()">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvel élève' }}
      </button>
    </panga-page-header>

    @if (credential(); as c) {
      <panga-credential-reveal
        title="Compte élève créé"
        [identifier]="c.identifier"
        [password]="c.password"
        (dismiss)="credential.set(null)"
      />
    }

    <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Élèves" [value]="statsTotal()" icon="school" />
      <panga-kpi-card label="Actifs" [value]="statsActive()" icon="check_circle" />
      <panga-kpi-card label="Garçons" [value]="statsBoys()" icon="man" />
      <panga-kpi-card label="Filles" [value]="statsGirls()" icon="woman" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouvel élève" />
        <div
          class="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1"
          role="tablist"
          aria-label="Sections du formulaire élève"
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
                            @if (f.fromClasses) {
                              <mat-option [value]="''">—</mat-option>
                              @for (c of classes(); track c.id) {
                                <mat-option [value]="c.id">{{ classLabel(c) }}</mat-option>
                              }
                            } @else if (f.fromParents) {
                              <mat-option [value]="''">—</mat-option>
                              @for (p of parents(); track p.id) {
                                <mat-option [value]="p.id">{{ personLabel(p) }}</mat-option>
                              }
                            } @else {
                              @for (o of f.options ?? []; track o.value) {
                                <mat-option [value]="o.value">{{ o.label }}</mat-option>
                              }
                            }
                          </mat-select>
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
            class="rounded-xl! students-cta"
            type="submit"
            [disabled]="submitting()"
          >
            {{ submitting() ? 'Inscription…' : "Inscrire l'élève" }}
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
        <input matInput [formControl]="searchCtrl" placeholder="Nom, matricule…" />
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
        <mat-label>Classe</mat-label>
        <mat-select [value]="activeClassId()" (selectionChange)="filterByClass($event.value)">
          <mat-option value="">Toutes</mat-option>
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ classLabel(c) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
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
          title="Impossible de charger les élèves"
          description="Vérifiez votre connexion puis réessayez."
          actionLabel="Réessayer"
          (action)="reload()"
        />
      </div>
    } @else if (students().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="school"
          title="Aucun élève"
          description="Inscrivez votre premier élève ou élargissez les filtres."
          actionLabel="Nouvel élève"
          (action)="openCreateForm()"
        />
      </div>
    } @else {
      <div class="grid gap-3 mb-2">
        @for (s of students(); track s.id) {
          <article class="student-card panga-card p-4">
            <div class="flex gap-3 items-start">
              <a
                [routerLink]="['/', 'students', s.id]"
                class="flex items-start gap-3 min-w-0 flex-1 no-underline"
              >
                <panga-avatar [name]="fullName(s)" [size]="48" class="shrink-0" />
                <div class="min-w-0 flex-1">
                  @if (s.className) {
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wide truncate"
                      style="color: var(--brand-deep)"
                    >
                      {{ s.className }}
                    </p>
                  }
                  <h3
                    class="text-sm font-semibold text-(--text) truncate"
                    [class.mt-0.5]="!!s.className"
                    style="font-family: Urbanist, sans-serif"
                  >
                    {{ fullName(s) || '—' }}
                  </h3>
                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-(--text-muted)"
                  >
                    @if (s.matricule || s.studentNumber) {
                      <span class="inline-flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[14px] shrink-0">badge</span>
                        <span class="truncate">{{ s.matricule || s.studentNumber }}</span>
                      </span>
                    }
                    @if (s.dateOfBirth) {
                      <span class="inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">cake</span>
                        {{ s.dateOfBirth | date: 'dd/MM/yyyy' }}
                      </span>
                    }
                  </div>
                  <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                    @if (s.gender) {
                      <span
                        class="chip"
                        [class.chip--brand]="s.gender === 'F'"
                        [class.chip--info]="s.gender !== 'F'"
                      >
                        {{ s.gender === 'F' ? 'Fille' : s.gender === 'M' ? 'Garçon' : 'Autre' }}
                      </span>
                    }
                    @if (s.status) {
                      <span
                        class="chip"
                        [class.chip--success]="s.status === 'active'"
                        [class.chip--neutral]="s.status !== 'active'"
                      >
                        @if (s.status === 'active') {
                          <span class="chip__dot"></span>
                        }
                        {{ statusLabel(s.status) }}
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
                class="student-card__menu shrink-0"
              >
                <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
              </button>
              <mat-menu #statusMenu="matMenu" class="panga-menu">
                <p class="px-4 pt-2 pb-1 text-xs text-(--text-muted)">Changer le statut</p>
                @for (st of statusOptions; track st.value) {
                  <button
                    mat-menu-item
                    (click)="changeStatus(s, st.value)"
                    [disabled]="s.status === st.value"
                  >
                    <mat-icon fontSet="material-symbols-outlined">
                      {{ s.status === st.value ? 'check' : 'radio_button_unchecked' }}
                    </mat-icon>
                    <span>{{ st.label }}</span>
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
      button.students-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.students-cta .mat-icon,
      button.students-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.students-cta:disabled {
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
      .student-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .student-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .student-card__menu {
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
      .chip--neutral {
        color: var(--text-muted);
        background: color-mix(in srgb, var(--text-muted) 12%, transparent);
        border-color: color-mix(in srgb, var(--text-muted) 22%, transparent);
      }
    `,
  ],
})
export class StudentsList {
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly parentsApi = inject(ParentsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly groups = GROUPS;
  protected readonly statusOptions = STUDENT_STATUS_OPTIONS;
  protected readonly classLabel = classLabel;
  protected readonly personLabel = personLabel;

  protected readonly students = signal<Student[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly parents = signal<Parent[]>([]);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly pageSizes = [20, 50, 100];
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly activeStatus = signal('');
  protected readonly activeClassId = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly importing = signal(false);
  protected readonly showForm = signal(false);
  protected readonly formTab = signal(0);
  /** Mot de passe temporaire renvoyé une seule fois à la création d'un compte. */
  protected readonly credential = signal<{ identifier: string; password: string } | null>(null);

  /** KPI année scolaire (hors filtres liste). */
  protected readonly statsTotal = signal(0);
  protected readonly statsActive = signal(0);
  protected readonly statsBoys = signal(0);
  protected readonly statsGirls = signal(0);

  protected readonly headerSubtitle = computed(() => {
    const year = this.sy.selected();
    return year ? `Effectifs de l'établissement · Année ${year}` : "Effectifs de l'établissement";
  });

  protected readonly form = new FormGroup(
    Object.fromEntries(
      ALL_KEYS.map((k) => {
        const required = k === 'firstName' || k === 'lastName';
        const initial =
          k === 'gender' ? 'M' : k === 'status' ? 'active' : k === 'enrollmentType' ? 'new' : '';
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
    this.parentsApi.list().subscribe({ next: (r) => this.parents.set(r.items) });
    // Recharge à chaque changement d'année (sélecteur global), sans re-navigation.
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.page.set(1);
        this.load();
        this.loadStats();
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
      });
    });
    this.searchCtrl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
      this.load();
    });
  }

  filterByStatus(status: string): void {
    this.activeStatus.set(status);
    this.page.set(1);
    this.load();
  }

  filterByClass(classId: string): void {
    this.activeClassId.set(classId);
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

  protected fullName(s: Student): string {
    return personLabel(s as Record<string, unknown>);
  }

  protected reload(): void {
    this.load();
    this.loadStats();
  }

  private loadStats(): void {
    const year = this.sy.filter();
    const base = { page: 1, limit: 1, schoolYear: year };
    const safe = <T>(o: Observable<T>) => o.pipe(catchError(() => of(null)));
    forkJoin({
      all: safe(this.studentsApi.list(base)),
      active: safe(this.studentsApi.list({ ...base, status: 'active' })),
      boys: safe(this.studentsApi.list({ ...base, gender: 'M' })),
      girls: safe(this.studentsApi.list({ ...base, gender: 'F' })),
    }).subscribe((r) => {
      this.statsTotal.set(r.all?.pagination?.total ?? r.all?.items.length ?? 0);
      this.statsActive.set(r.active?.pagination?.total ?? r.active?.items.length ?? 0);
      this.statsBoys.set(r.boys?.pagination?.total ?? r.boys?.items.length ?? 0);
      this.statsGirls.set(r.girls?.pagination?.total ?? r.girls?.items.length ?? 0);
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.studentsApi
      .list({
        page: this.page(),
        limit: this.limit(),
        schoolYear: this.sy.filter(),
        search: this.search() || undefined,
        status: this.activeStatus() || undefined,
        classId: this.activeClassId() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.students.set(res.items);
          this.pagination.set(res.pagination ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.students.set([]);
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
    this.studentsApi.importExcel(file, this.sy.selected()).subscribe({
      next: (res) => {
        this.importing.set(false);
        const count = Number(res?.['imported'] ?? res?.['count'] ?? res?.['created']) || 0;
        this.notify.success(count ? `${count} élève(s) importé(s).` : 'Import terminé.');
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
    this.studentsApi.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_eleves.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  statusLabel(value: string): string {
    return STUDENT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  changeStatus(student: Student, status: string): void {
    if (student.status === status) {
      return;
    }
    this.studentsApi.update(student.id, { status }).subscribe({
      next: () => {
        this.notify.success('Statut mis à jour.');
        this.reload();
      },
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      // Revenir à l'onglet du premier champ invalide.
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
    const raw = this.form.getRawValue() as Record<string, string>;
    // POST /students : uniquement les clés du DTO, et seulement si renseignées
    // (les '' échoueraient sur IsEmail/IsDateString/IsUUID ; parentId est exclu).
    const payload: Record<string, unknown> = {};
    for (const key of PAYLOAD_KEYS) {
      if (raw[key] !== '') {
        payload[key] = raw[key];
      }
    }
    const parentId = raw['parentId'];

    this.studentsApi.create(payload).subscribe({
      next: (student) => {
        this.revealCredential(student);
        const done = () => {
          this.submitting.set(false);
          this.notify.success('Élève inscrit.');
          this.form.reset({ gender: 'M', status: 'active', enrollmentType: 'new' });
          this.showForm.set(false);
          this.formTab.set(0);
          this.page.set(1);
          this.reload();
        };
        // Liaison parent via la route dédiée (hors create).
        if (parentId && student?.id) {
          this.studentsApi.linkParent(student.id, parentId).subscribe({ next: done, error: done });
        } else {
          done();
        }
      },
      error: () => this.submitting.set(false),
    });
  }

  /** Affiche le mot de passe temporaire si le backend en a généré un. */
  private revealCredential(student: Record<string, unknown>): void {
    const user = (student?.['user'] ?? {}) as Record<string, unknown>;
    const password = (student?.['temporaryPassword'] ?? user['temporaryPassword']) as
      | string
      | undefined;
    if (!password) {
      return;
    }
    const identifier = String(
      student['studentNumber'] ?? student['matricule'] ?? user['username'] ?? user['email'] ?? '',
    );
    this.credential.set({ identifier, password });
  }
}
