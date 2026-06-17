import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StudentsService } from '../services/students.service';
import { ClassesService } from '../services/classes.service';
import { ParentsService } from '../services/parents.service';
import type { ClassInstance, Parent, Student } from '../models/admin.models';
import { classLabel, personLabel } from '../shared/labels';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { EnumOption } from '../../../core/models/school.enums';
import {
  BLOOD_GROUP_OPTIONS,
  ENROLLMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
} from '../../../core/models/student.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'select';
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
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'province', label: 'Province' },
      { key: 'country', label: 'Pays' },
    ],
  },
  {
    title: "Tuteur & contact d'urgence",
    icon: 'family_restroom',
    fields: [
      { key: 'guardianName', label: 'Tuteur — nom' },
      { key: 'guardianPhone', label: 'Tuteur — téléphone', type: 'tel' },
      { key: 'guardianRelation', label: 'Tuteur — relation' },
      { key: 'emergencyContactName', label: 'Urgence — nom' },
      { key: 'emergencyContactPhone', label: 'Urgence — téléphone', type: 'tel' },
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
    <panga-page-header icon="school" title="Élèves" subtitle="Effectifs de l'établissement">
      <button mat-stroked-button class="!rounded-xl" (click)="downloadTemplate()">
        <mat-icon fontSet="material-symbols-outlined">download</mat-icon> Modèle
      </button>
      <input #fileInput type="file" class="hidden" accept=".xlsx,.xls" (change)="onFile($event)" />
      <button
        mat-stroked-button
        class="!rounded-xl"
        (click)="fileInput.click()"
        [disabled]="importing()"
      >
        <mat-icon fontSet="material-symbols-outlined">upload_file</mat-icon>
        {{ importing() ? 'Import…' : 'Importer (Excel)' }}
      </button>
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvel élève' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Élèves" [value]="total()" icon="school" />
      <panga-kpi-card label="Affichés" [value]="students().length" icon="visibility" />
      <panga-kpi-card label="Garçons" [value]="boys()" icon="man" />
      <panga-kpi-card label="Filles" [value]="girls()" icon="woman" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouvel élève" />
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
            Inscrire l'élève
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (students().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="school"
          title="Aucun élève"
          description="Inscrivez votre premier élève."
          actionLabel="Nouvel élève"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (s of students(); track s.id) {
          <div
            class="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
          >
            <a
              [routerLink]="['/', 'students', s.id]"
              class="flex items-center gap-4 min-w-0 flex-1"
            >
              <panga-avatar [name]="fullName(s)" [size]="44" />
              <div class="min-w-0 flex-1">
                <p class="font-medium text-[var(--text)] truncate">{{ fullName(s) || '—' }}</p>
                <div
                  class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]"
                >
                  @if (s.matricule || s.studentNumber) {
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">badge</span>
                      {{ s.matricule || s.studentNumber }}
                    </span>
                  }
                  @if (s.className) {
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">meeting_room</span>
                      {{ s.className }}
                    </span>
                  }
                  @if (s.dateOfBirth) {
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">cake</span>
                      {{ s.dateOfBirth | date: 'dd/MM/yyyy' }}
                    </span>
                  }
                </div>
              </div>
            </a>
            @if (s.gender) {
              <panga-status-badge
                [label]="s.gender === 'F' ? 'Fille' : s.gender === 'M' ? 'Garçon' : 'Autre'"
                [tone]="s.gender === 'F' ? 'brand' : 'info'"
                [dot]="false"
                class="hidden sm:inline-flex"
              />
            }
            @if (s.status) {
              <panga-status-badge
                [label]="statusLabel(s.status)"
                [tone]="s.status === 'active' ? 'success' : 'neutral'"
                class="hidden sm:inline-flex"
              />
            }
            <button
              mat-icon-button
              [matMenuTriggerFor]="statusMenu"
              matTooltip="Changer le statut"
              aria-label="Changer le statut"
              class="shrink-0"
            >
              <mat-icon fontSet="material-symbols-outlined" class="text-[var(--text-muted)]">
                more_vert
              </mat-icon>
            </button>
            <mat-menu #statusMenu="matMenu" class="panga-menu">
              <p class="px-4 pt-2 pb-1 text-xs text-[var(--text-muted)]">Changer le statut</p>
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
        }
        @if (pagination()) {
          <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
        }
      </div>
    }
  `,
})
export class StudentsList {
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly parentsApi = inject(ParentsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly groups = GROUPS;
  protected readonly statusOptions = STUDENT_STATUS_OPTIONS;
  protected readonly classLabel = classLabel;
  protected readonly personLabel = personLabel;

  protected readonly students = signal<Student[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly parents = signal<Parent[]>([]);
  protected readonly total = signal(0);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly importing = signal(false);
  protected readonly showForm = signal(false);

  protected readonly boys = computed(() => this.students().filter((s) => s.gender === 'M').length);
  protected readonly girls = computed(() => this.students().filter((s) => s.gender === 'F').length);

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
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
      });
    });
  }

  protected fullName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim();
  }

  private load(): void {
    this.loading.set(true);
    this.studentsApi
      .list({ page: this.page(), limit: 10, schoolYear: this.sy.filter() })
      .subscribe({
        next: (res) => {
          this.students.set(res.items);
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
        this.load();
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
        this.load();
      },
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
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
        const done = () => {
          this.submitting.set(false);
          this.notify.success('Élève inscrit.');
          this.form.reset({ gender: 'M', status: 'active', enrollmentType: 'new' });
          this.showForm.set(false);
          this.page.set(1);
          this.load();
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
}
