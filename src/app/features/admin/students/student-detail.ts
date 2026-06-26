import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { ParentsService } from '../services/parents.service';
import { GradesService } from '../services/grades.service';
import { UsersService } from '../services/users.service';
import type { ClassInstance, Parent, Student } from '../models/admin.models';
import type { AnnualAverageResult } from '../models/grade.models';
import { personLabel } from '../shared/labels';
import {
  BLOOD_GROUP_OPTIONS,
  ENROLLMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
} from '../../../core/models/student.enums';
import type { EnumOption } from '../../../core/models/school.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { CredentialReveal } from '../../../shared/ui/credential-reveal';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

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
      { key: 'status', label: 'Statut', type: 'select', options: STUDENT_STATUS_OPTIONS },
      {
        key: 'enrollmentType',
        label: "Type d'inscription",
        type: 'select',
        options: ENROLLMENT_TYPE_OPTIONS,
      },
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
      { key: 'transportType', label: 'Transport', type: 'select', options: TRANSPORT_TYPE_OPTIONS },
      { key: 'transportRoute', label: 'Itinéraire de transport' },
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
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    Avatar,
    CredentialReveal,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <a
      [routerLink]="['/', 'students']"
      class="inline-flex items-center gap-1 text-sm text-(--text-muted) hover:text-(--brand-700) mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="text-base! w-4! h-4!"
        >arrow_back</mat-icon
      >
      Élèves
    </a>

    @if (credential(); as c) {
      <panga-credential-reveal
        title="Nouveau mot de passe — accès élève"
        [identifier]="ro('studentNumber')"
        [password]="c"
        (dismiss)="credential.set(null)"
      />
    }

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
            <h1 class="text-2xl font-semibold truncate" style="font-family: Urbanist, sans-serif">
              {{ fullName() || 'Élève' }}
            </h1>
            <p class="text-sm opacity-90">
              {{ ro('studentNumber') }}
              @if (className()) {
                · {{ className() }}
              }
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            @if (ro('status'); as st) {
              <panga-status-badge [label]="st" tone="success" />
            }
            <button
              mat-stroked-button
              class="rounded-xl! text-white! border-white/40!"
              [disabled]="resetting() || !userId()"
              (click)="resetPassword()"
            >
              <mat-icon fontSet="material-symbols-outlined">key</mat-icon>
              Réinitialiser le mot de passe
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
                          @if (f.fromClasses) {
                            @for (c of classes(); track c.id) {
                              <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
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
            class="rounded-xl! shadow-lg"
            type="submit"
            [disabled]="saving() || form.pristine"
          >
            <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>

      <!-- Parents liés -->
      <section class="panga-card p-5 mb-4">
        <panga-section-header
          icon="family_restroom"
          title="Parents liés"
          [count]="linkedParents().length"
        />
        @if (linkedParents().length) {
          <div class="flex flex-wrap gap-2 mb-4">
            @for (p of linkedParents(); track p.id) {
              <span
                class="inline-flex items-center gap-2 rounded-full border border-(--border) pl-1.5 pr-1.5 py-1"
              >
                <panga-avatar [name]="label(p)" [size]="24" />
                <span class="text-sm text-(--text)">{{ label(p) }}</span>
                <button
                  type="button"
                  class="ml-0.5 shrink-0 leading-none text-(--text-muted) outline-none transition-colors hover:text-(--danger)"
                  (click)="removeParent(p.id)"
                  aria-label="Retirer"
                >
                  <span class="material-symbols-outlined align-middle text-[18px] leading-none"
                    >close</span
                  >
                </button>
              </span>
            }
          </div>
        } @else {
          <p class="text-sm text-(--text-muted) mb-4">Aucun parent lié.</p>
        }
        <div class="flex flex-wrap items-end gap-3">
          <mat-form-field appearance="outline" class="flex-1 min-w-55">
            <mat-label>Lier un parent</mat-label>
            <mat-select [formControl]="parentCtrl">
              @for (p of parents(); track p.id) {
                <mat-option [value]="p.id">{{ label(p) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button
            mat-flat-button
            class="rounded-xl! mb-1!"
            (click)="addParent()"
            [disabled]="!parentCtrl.value || linking()"
          >
            Lier
          </button>
        </div>
      </section>

      <!-- Dossier scolaire -->
      <section class="grid gap-4 sm:grid-cols-3 mb-4">
        <div class="panga-card p-5 text-center">
          <span class="material-symbols-outlined text-(--brand-500)">grade</span>
          <p class="text-2xl font-semibold text-(--text) mt-1">{{ gradesCount() }}</p>
          <p class="text-xs text-(--text-muted)">Notes</p>
        </div>
        <div class="panga-card p-5 text-center">
          <span class="material-symbols-outlined text-(--brand-500)">payments</span>
          <p class="text-2xl font-semibold text-(--text) mt-1">{{ paymentsCount() }}</p>
          <p class="text-xs text-(--text-muted)">Paiements</p>
        </div>
        <div class="panga-card p-5 text-center">
          <span class="material-symbols-outlined text-(--brand-500)">fact_check</span>
          <p class="text-2xl font-semibold text-(--text) mt-1">{{ attendanceCount() }}</p>
          <p class="text-xs text-(--text-muted)">Présences</p>
        </div>
      </section>

      <!-- Bulletin de moyennes (année) -->
      <section class="panga-card p-5">
        <panga-section-header
          icon="leaderboard"
          [title]="'Moyennes ' + schoolYear"
          [count]="subjectAverages().length"
        >
          @if (overallPercent() !== null) {
            <panga-status-badge
              [label]="overallPercent() + '% — moy. générale'"
              [tone]="averageTone(overallPercent())"
              [dot]="false"
            />
          }
        </panga-section-header>

        @if (loadingAverages()) {
          <p class="text-sm text-(--text-muted) py-6 text-center">Calcul des moyennes…</p>
        } @else if (subjectAverages().length === 0) {
          <p class="text-sm text-(--text-muted) py-4 text-center">
            Aucune moyenne disponible pour cette année.
          </p>
        } @else {
          <div class="space-y-3">
            @for (a of subjectAverages(); track $index) {
              <div>
                <div class="flex items-center justify-between gap-3 mb-1">
                  <span class="text-sm text-(--text) truncate">{{ subjLabel(a) }}</span>
                  <span class="text-sm font-semibold shrink-0" [style.color]="avgColor(subjPct(a))">
                    {{ subjPct(a) }}%
                  </span>
                </div>
                <div class="h-2 w-full rounded-full bg-(--border) overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    [style.width.%]="subjPct(a)"
                    [style.background]="avgColor(subjPct(a))"
                  ></div>
                </div>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class StudentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly parentsApi = inject(ParentsService);
  private readonly gradesApi = inject(GradesService);
  private readonly usersApi = inject(UsersService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly schoolYear = this.sy.selected();
  protected readonly groups = GROUPS;
  protected readonly label = personLabel;
  protected readonly student = signal<Student | null>(null);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly parents = signal<Parent[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly linking = signal(false);
  protected readonly gradesCount = signal(0);
  protected readonly paymentsCount = signal(0);
  protected readonly attendanceCount = signal(0);
  protected readonly subjectAverages = signal<AnnualAverageResult[]>([]);
  protected readonly overallPercent = signal<number | null>(null);
  protected readonly loadingAverages = signal(false);
  protected readonly resetting = signal(false);
  /** Mot de passe temporaire renvoyé une seule fois par la réinitialisation. */
  protected readonly credential = signal<string | null>(null);
  protected readonly userId = computed(
    () => (this.student() as Record<string, unknown> | null)?.['userId'] as string | undefined,
  );

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
          this.notify.success('Mot de passe réinitialisé.');
        } else {
          this.notify.success('Mot de passe réinitialisé.');
        }
      },
      error: () => this.resetting.set(false),
    });
  }

  protected readonly parentCtrl = new FormControl('', { nonNullable: true });

  /** Parents déjà rattachés (forme variable : `parents` / `guardians`). */
  protected readonly linkedParents = computed<{ id: string; [k: string]: unknown }[]>(() => {
    const s = this.student() as Record<string, unknown> | null;
    const arr = (s?.['parents'] ?? s?.['guardians']) as unknown;
    if (!Array.isArray(arr)) {
      return [];
    }
    return (arr as Record<string, unknown>[]).map((p) => ({ ...p, id: String(p['id'] ?? '') }));
  });

  protected readonly form = new FormGroup(
    Object.fromEntries(ALL_KEYS.map((k) => [k, new FormControl('', { nonNullable: true })])),
  );

  constructor() {
    this.classesApi.list(this.sy.filter()).subscribe({ next: (r) => this.classes.set(r.items) });
    this.parentsApi.list().subscribe({ next: (r) => this.parents.set(r.items) });
    this.reloadStudent();
    this.studentsApi.grades(this.id).subscribe({ next: (d) => this.gradesCount.set(toCount(d)) });
    this.studentsApi
      .payments(this.id)
      .subscribe({ next: (d) => this.paymentsCount.set(toCount(d)) });
    this.studentsApi
      .attendance(this.id)
      .subscribe({ next: (d) => this.attendanceCount.set(toCount(d)) });
  }

  private reloadStudent(): void {
    this.studentsApi.get(this.id).subscribe({
      next: (s) => {
        this.student.set(s);
        this.patch(s);
        this.loading.set(false);
        this.loadAverages(s);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Moyennes annuelles par matière (nécessite le classId de l'élève). */
  private loadAverages(s: Student): void {
    const raw = s as Record<string, unknown>;
    const classId = String(raw['classInstanceId'] ?? raw['classId'] ?? '');
    if (!classId) {
      this.subjectAverages.set([]);
      this.overallPercent.set(null);
      return;
    }
    this.loadingAverages.set(true);
    this.gradesApi.studentAverages(this.id, classId, this.sy.selected()).subscribe({
      next: (r) => {
        this.subjectAverages.set(r.subjectAverages ?? []);
        const overall = r.overallAveragePercent ?? r.overallAverage;
        this.overallPercent.set(overall === undefined ? null : Math.round(overall));
        this.loadingAverages.set(false);
      },
      error: () => {
        this.subjectAverages.set([]);
        this.overallPercent.set(null);
        this.loadingAverages.set(false);
      },
    });
  }

  protected subjLabel(a: AnnualAverageResult): string {
    const o = a as Record<string, unknown>;
    return (
      (o['subjectLabel'] as string) ||
      (o['labelFr'] as string) ||
      (o['subject'] as string) ||
      (o['programCode'] as string) ||
      'Matière'
    );
  }
  protected subjPct(a: AnnualAverageResult): number {
    const v = a.annualAveragePercent ?? a.annualAverage ?? 0;
    return Math.round(Math.max(0, Math.min(100, v)));
  }
  protected avgColor(p: number): string {
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-700)' : 'var(--danger)';
  }
  protected averageTone(p: number | null): 'success' | 'brand' | 'danger' | 'neutral' {
    if (p === null) {
      return 'neutral';
    }
    return p >= 75 ? 'success' : p >= 50 ? 'brand' : 'danger';
  }

  addParent(): void {
    const parentId = this.parentCtrl.value;
    if (!parentId || this.linking()) {
      return;
    }
    this.linking.set(true);
    this.studentsApi.linkParent(this.id, parentId).subscribe({
      next: () => {
        this.linking.set(false);
        this.notify.success('Parent lié.');
        this.parentCtrl.reset('');
        this.reloadStudent();
      },
      error: () => this.linking.set(false),
    });
  }

  removeParent(parentId: string): void {
    this.studentsApi.unlinkParent(this.id, parentId).subscribe({
      next: () => {
        this.notify.success('Parent retiré.');
        this.reloadStudent();
      },
    });
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
