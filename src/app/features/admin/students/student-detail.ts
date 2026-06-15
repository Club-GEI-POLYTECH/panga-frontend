import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { StudentsService } from '../services/students.service';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance, Student } from '../models/admin.models';
import { BLOOD_GROUP_OPTIONS, GENDER_OPTIONS } from '../../../core/models/student.enums';
import type { EnumOption } from '../../../core/models/school.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

const SCHOOL_YEAR = '2024-2025';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'select';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: EnumOption[];
  fromClasses?: boolean;
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
      { key: 'firstName', label: 'Prénom' },
      { key: 'lastName', label: 'Nom' },
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
      { key: 'classId', label: 'Classe', type: 'select', fromClasses: true },
      { key: 'enrollmentDate', label: "Date d'inscription", type: 'date' },
      { key: 'admissionDate', label: "Date d'admission", type: 'date' },
      { key: 'previousSchool', label: 'École précédente' },
      { key: 'previousClass', label: 'Classe précédente' },
    ],
  },
  {
    title: 'Contact',
    icon: 'contacts',
    fields: [
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'province', label: 'Province' },
      { key: 'postalCode', label: 'Code postal' },
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
      { key: 'guardianAddress', label: 'Tuteur — adresse' },
      { key: 'emergencyContactName', label: 'Urgence — nom' },
      { key: 'emergencyContactPhone', label: 'Urgence — téléphone', type: 'tel' },
      { key: 'emergencyContactRelation', label: 'Urgence — relation' },
    ],
  },
  {
    title: 'Divers',
    icon: 'info',
    fields: [
      { key: 'religion', label: 'Religion' },
      { key: 'ethnicity', label: 'Ethnie' },
      { key: 'motherTongue', label: 'Langue maternelle' },
      { key: 'specialNeeds', label: 'Besoins spéciaux', wide: true },
      { key: 'disabilityType', label: 'Type de handicap' },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));

@Component({
  selector: 'panga-student-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    Avatar,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <a
      [routerLink]="['/', 'students']"
      class="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-700)] mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="!text-base !w-4 !h-4"
        >arrow_back</mat-icon
      >
      Élèves
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
          <panga-avatar [name]="fullName()" [size]="64" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Poppins, sans-serif">
              {{ fullName() || 'Élève' }}
            </h1>
            <p class="text-sm opacity-90">
              {{ ro('studentNumber') }}
              @if (className()) {
                · {{ className() }}
              }
            </p>
          </div>
          @if (ro('status'); as st) {
            <panga-status-badge [label]="st" tone="success" />
          }
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
                          @if (f.fromClasses) {
                            @for (c of classes(); track c.id) {
                              <mat-option [value]="c.id">{{ c.name || c.id }}</mat-option>
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

      <!-- Dossier scolaire -->
      <section class="grid gap-4 sm:grid-cols-3">
        <div class="panga-card p-5 text-center">
          <span class="material-symbols-outlined text-[var(--brand-500)]">grade</span>
          <p class="text-2xl font-semibold text-[var(--text)] mt-1">{{ gradesCount() }}</p>
          <p class="text-xs text-[var(--text-muted)]">Notes</p>
        </div>
        <div class="panga-card p-5 text-center">
          <span class="material-symbols-outlined text-[var(--brand-500)]">payments</span>
          <p class="text-2xl font-semibold text-[var(--text)] mt-1">{{ paymentsCount() }}</p>
          <p class="text-xs text-[var(--text-muted)]">Paiements</p>
        </div>
        <div class="panga-card p-5 text-center">
          <span class="material-symbols-outlined text-[var(--brand-500)]">fact_check</span>
          <p class="text-2xl font-semibold text-[var(--text)] mt-1">{{ attendanceCount() }}</p>
          <p class="text-xs text-[var(--text-muted)]">Présences</p>
        </div>
      </section>
    }
  `,
})
export class StudentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly notify = inject(NotificationService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly groups = GROUPS;
  protected readonly student = signal<Student | null>(null);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly gradesCount = signal(0);
  protected readonly paymentsCount = signal(0);
  protected readonly attendanceCount = signal(0);

  protected readonly form = new FormGroup(
    Object.fromEntries(ALL_KEYS.map((k) => [k, new FormControl('', { nonNullable: true })])),
  );

  constructor() {
    this.classesApi.list(SCHOOL_YEAR).subscribe({ next: (r) => this.classes.set(r.items) });
    this.studentsApi.get(this.id).subscribe({
      next: (s) => {
        this.student.set(s);
        this.patch(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.studentsApi.grades(this.id).subscribe({ next: (d) => this.gradesCount.set(toCount(d)) });
    this.studentsApi
      .payments(this.id)
      .subscribe({ next: (d) => this.paymentsCount.set(toCount(d)) });
    this.studentsApi
      .attendance(this.id)
      .subscribe({ next: (d) => this.attendanceCount.set(toCount(d)) });
  }

  protected fullName(): string {
    const s = this.student();
    return s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : '';
  }
  protected className(): string {
    const s = this.student();
    return (s?.className as string) || '';
  }
  protected ro(key: string): string {
    const v = (this.student() as Record<string, unknown> | null)?.[key];
    return v === null || v === undefined ? '' : String(v);
  }

  private patch(s: Student): void {
    const raw = s as Record<string, unknown>;
    const value: Record<string, string> = {};
    for (const key of ALL_KEYS) {
      let v = raw[key];
      if (key === 'classId') {
        v = raw['classId'] ?? raw['classInstanceId'];
      }
      if (key === 'dateOfBirth' || key === 'enrollmentDate' || key === 'admissionDate') {
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
    // PATCH partiel : on n'envoie que les champs modifiés.
    const payload: Record<string, unknown> = {};
    for (const key of ALL_KEYS) {
      const ctrl = this.form.get(key);
      if (ctrl && ctrl.dirty) {
        const v = ctrl.value;
        payload[key] = v === '' ? null : v;
      }
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    this.saving.set(true);
    this.studentsApi.update(this.id, payload).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.student.set(s);
        this.patch(s);
        this.notify.success('Élève mis à jour.');
      },
      error: () => this.saving.set(false),
    });
  }
}

function toCount(data: unknown): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const arr = obj['data'] ?? obj['items'] ?? obj['results'];
    if (Array.isArray(arr)) {
      return arr.length;
    }
  }
  return 0;
}
