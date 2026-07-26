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
import { ClassesService } from '../services/classes.service';
import { TeachersService } from '../services/teachers.service';
import { SubjectsService } from '../services/subjects.service';
import { StudentsService } from '../services/students.service';
import type {
  ClassInstance,
  ClassScheduleSlot,
  SchoolSubOption,
  Student,
  Teacher,
} from '../models/admin.models';
import type { ClassSubject } from '../models/course.models';
import {
  CLASS_EDUCATION_LEVEL_OPTIONS,
  CLASS_SCHEDULE_OPTIONS,
  CLASS_STATUS_OPTIONS,
  CLASS_TYPE_OPTIONS,
  PROMOTION_ACTION_OPTIONS,
  SCHOOL_CYCLE_OPTIONS,
  WEEKDAY_OPTIONS,
} from '../../../core/models/class.enums';
import type { EnumOption } from '../../../core/models/school.enums';
import { classLabel, personLabel } from '../shared/labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { KeyValue } from '../../../shared/ui/key-value';
import { SectionHeader } from '../../../shared/ui/section-header';
import type { BadgeTone } from '../../../shared/ui/status-badge';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

type FieldType = 'text' | 'number' | 'select';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: EnumOption[];
  fromTemplate?: boolean;
  teachers?: boolean;
  subOptions?: boolean;
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
      { key: 'name', label: 'Nom', fromTemplate: true },
      { key: 'displayName', label: 'Nom affiché', fromTemplate: true },
      { key: 'level', label: 'Niveau', type: 'number', fromTemplate: true },
      { key: 'section', label: 'Section', fromTemplate: true },
      {
        key: 'educationLevel',
        label: "Niveau d'éducation",
        type: 'select',
        options: CLASS_EDUCATION_LEVEL_OPTIONS,
        fromTemplate: true,
      },
      {
        key: 'schoolCycle',
        label: 'Cycle',
        type: 'select',
        options: SCHOOL_CYCLE_OPTIONS,
        fromTemplate: true,
      },
      {
        key: 'classType',
        label: 'Type',
        type: 'select',
        options: CLASS_TYPE_OPTIONS,
        fromTemplate: true,
      },
      {
        key: 'classSchedule',
        label: 'Horaire',
        type: 'select',
        options: CLASS_SCHEDULE_OPTIONS,
        fromTemplate: true,
      },
      { key: 'capacity', label: 'Capacité', type: 'number', fromTemplate: true },
      {
        key: 'schoolSubOptionId',
        label: 'Filière (sous-option)',
        type: 'select',
        subOptions: true,
        fromTemplate: true,
      },
    ],
  },
  {
    title: 'Organisation',
    icon: 'tune',
    fields: [
      { key: 'status', label: 'Statut', type: 'select', options: CLASS_STATUS_OPTIONS },
      { key: 'classTeacherId', label: 'Enseignant titulaire', type: 'select', teachers: true },
      { key: 'roomNumber', label: 'Salle' },
      { key: 'building', label: 'Bâtiment' },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
const NUMBER_KEYS = new Set(['level', 'capacity']);
const FROM_TEMPLATE = new Set(
  GROUPS.flatMap((g) => g.fields.filter((f) => f.fromTemplate).map((f) => f.key)),
);

function statusTone(status?: string): BadgeTone {
  if (status === 'active') return 'success';
  if (status === 'archived' || status === 'closed') return 'neutral';
  return 'warning';
}

const BOARD_TYPE_OPTIONS: EnumOption[] = [
  { value: 'whiteboard', label: 'Tableau blanc' },
  { value: 'blackboard', label: 'Tableau noir' },
  { value: 'smartboard', label: 'Tableau intelligent' },
  { value: 'interactive', label: 'Interactif' },
  { value: 'none', label: 'Aucun' },
];

const PHYS_NUMERIC = ['numberOfBenches', 'numberOfSeats', 'boardCount', 'wastebasketCount'];
const EQUIPMENT: { key: string; label: string }[] = [
  { key: 'desks', label: 'Pupitres' },
  { key: 'chairs', label: 'Chaises' },
  { key: 'tables', label: 'Tables' },
  { key: 'shelves', label: 'Étagères' },
  { key: 'cabinets', label: 'Armoires' },
  { key: 'projectors', label: 'Projecteurs' },
  { key: 'computers', label: 'Ordinateurs' },
  { key: 'printers', label: 'Imprimantes' },
  { key: 'airConditioners', label: 'Climatiseurs' },
  { key: 'fans', label: 'Ventilateurs' },
  { key: 'lights', label: 'Lampes' },
  { key: 'windows', label: 'Fenêtres' },
  { key: 'doors', label: 'Portes' },
];

const PHYS_KEYS = [
  'numberOfBenches',
  'numberOfSeats',
  'boardType',
  'boardCount',
  'hasWastebaskets',
  'wastebasketCount',
  ...EQUIPMENT.map((e) => e.key),
];

@Component({
  selector: 'panga-class-detail',
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
    KeyValue,
    SectionHeader,
  ],
  template: `
    <a
      [routerLink]="['/', 'classes']"
      class="inline-flex items-center gap-1 text-sm text-(--text-muted) hover:text-(--brand-700) mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="text-base! w-4! h-4!"
        >arrow_back</mat-icon
      >
      Classes
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
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shrink-0">
            <span class="material-symbols-outlined text-3xl">meeting_room</span>
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Urbanist, sans-serif">
              {{ name() }}
            </h1>
            <p class="text-sm opacity-90">
              {{ cls()?.schoolYear }}
              @if (teacherName()) {
                · {{ teacherName() }}
              }
            </p>
          </div>
          <div class="flex items-center gap-2">
            @if (cls()?.status) {
              <span class="rounded-full bg-white/15 px-2.5 py-1 text-xs">{{ cls()?.status }}</span>
            }
            <button
              mat-icon-button
              class="text-white!"
              (click)="remove()"
              matTooltip="Archiver"
              aria-label="Archiver"
            >
              <mat-icon fontSet="material-symbols-outlined">archive</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <section class="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-5">
        <div class="panga-card p-4 text-center">
          <p class="text-2xl font-semibold text-(--text)">
            {{ cls()?.currentEnrollment ?? 0 }}
          </p>
          <p class="text-xs text-(--text-muted)">Élèves inscrits</p>
        </div>
        <div class="panga-card p-4 text-center">
          <p class="text-2xl font-semibold text-(--text)">
            {{ cls()?.template?.capacity ?? '—' }}
          </p>
          <p class="text-xs text-(--text-muted)">Capacité</p>
        </div>
        <div class="panga-card p-4 text-center">
          <p class="text-2xl font-semibold text-(--text)">{{ courses().length }}</p>
          <p class="text-xs text-(--text-muted)">Cours</p>
        </div>
        <div class="panga-card p-4 text-center">
          <p class="text-2xl font-semibold text-(--text)">{{ slots().length }}</p>
          <p class="text-xs text-(--text-muted)">Créneaux</p>
        </div>
      </section>

      <!-- Formulaire éditable -->
      <form [formGroup]="form" (ngSubmit)="save()">
        @for (group of groups; track group.title) {
          <div class="panga-card p-5 mb-4">
            <panga-section-header [icon]="group.icon" [title]="group.title" />
            @if (sharedGroup(group)) {
              <div
                class="flex items-start gap-2 mb-4 rounded-xl px-3 py-2 text-xs"
                style="
                  background: color-mix(in srgb, var(--warning) 12%, transparent);
                  color: var(--text);
                "
              >
                <mat-icon
                  fontSet="material-symbols-outlined"
                  class="text-base! shrink-0"
                  style="color: var(--warning)"
                  >info</mat-icon
                >
                <span>
                  Ces champs appartiennent au <strong>modèle de classe</strong>, partagé par toutes
                  ses années scolaires. Les modifier (nom, niveau, cycle…) affecte aussi les autres
                  années qui utilisent ce modèle.
                </span>
              </div>
            }
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (f of group.fields; track f.key) {
                <mat-form-field appearance="outline">
                  <mat-label>{{ f.label }}</mat-label>
                  @switch (f.type) {
                    @case ('select') {
                      <mat-select [formControlName]="f.key">
                        <mat-option [value]="''">—</mat-option>
                        @if (f.teachers) {
                          @for (t of teachers(); track t.id) {
                            <mat-option [value]="t.id">{{ teacherLabel(t) }}</mat-option>
                          }
                        } @else if (f.subOptions) {
                          @for (s of subOptions(); track s.id) {
                            <mat-option [value]="s.id">{{ s.name }}</mat-option>
                          }
                        } @else {
                          @for (o of f.options ?? []; track o.value) {
                            <mat-option [value]="o.value">{{ o.label }}</mat-option>
                          }
                        }
                      </mat-select>
                    }
                    @case ('number') {
                      <input matInput type="number" [formControlName]="f.key" />
                    }
                    @default {
                      <input matInput [formControlName]="f.key" />
                    }
                  }
                </mat-form-field>
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

      <!-- Emploi du temps -->
      <section class="panga-card p-5 mb-4">
        <div class="flex items-center justify-between gap-3 mb-3">
          <panga-section-header
            icon="calendar_month"
            title="Emploi du temps"
            [count]="slots().length"
          />
          <div class="flex gap-2">
            <button mat-stroked-button class="rounded-xl!" (click)="addSlot()">
              <mat-icon fontSet="material-symbols-outlined">add</mat-icon> Créneau
            </button>
            <button
              mat-flat-button
              class="rounded-xl!"
              (click)="saveSlots()"
              [disabled]="savingSlots()"
            >
              {{ savingSlots() ? '…' : 'Enregistrer la grille' }}
            </button>
          </div>
        </div>
        @if (!courses().length) {
          <p class="text-xs text-(--warning) mb-3">
            Aucun cours ouvert sur cette classe — ouvrez d'abord les cours (Journal de cours) pour
            pouvoir les rattacher aux créneaux.
          </p>
        }
        @if (slots().length === 0) {
          <p class="text-sm text-(--text-muted) py-4 text-center">
            Aucun créneau. Ajoutez-en pour bâtir la grille.
          </p>
        } @else {
          <div class="flex flex-col gap-2">
            @for (slot of slots(); track $index) {
              <div
                class="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_1.6fr_1fr_auto] gap-2 items-center"
              >
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Jour</mat-label>
                  <mat-select
                    [value]="slot.weekdayIso"
                    (selectionChange)="patchSlot($index, 'weekdayIso', $event.value)"
                  >
                    @for (w of weekdays; track w.value) {
                      <mat-option [value]="w.value">{{ w.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Début</mat-label>
                  <input
                    matInput
                    type="time"
                    [value]="slot.startTime"
                    (change)="patchSlot($index, 'startTime', $any($event.target).value)"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Fin</mat-label>
                  <input
                    matInput
                    type="time"
                    [value]="slot.endTime"
                    (change)="patchSlot($index, 'endTime', $any($event.target).value)"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Cours</mat-label>
                  <mat-select
                    [value]="slot.classSubjectId || ''"
                    (selectionChange)="patchSlotCourse($index, $event.value)"
                  >
                    <mat-option [value]="''">— (aucun)</mat-option>
                    @for (c of courses(); track c.id) {
                      <mat-option [value]="c.id">{{ courseLabel(c) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Salle</mat-label>
                  <input
                    matInput
                    [value]="slot.room || ''"
                    (change)="patchSlot($index, 'room', $any($event.target).value)"
                  />
                </mat-form-field>
                <button mat-icon-button (click)="removeSlot($index)" aria-label="Retirer">
                  <mat-icon fontSet="material-symbols-outlined" class="text-(--danger)"
                    >delete</mat-icon
                  >
                </button>
              </div>
            }
          </div>
        }
      </section>

      <!-- Aspects physiques -->
      <section class="panga-card p-5 mb-4">
        <div class="flex items-center justify-between gap-3 mb-3">
          <panga-section-header icon="chair" title="Aspects physiques" />
          <button
            mat-flat-button
            class="rounded-xl!"
            (click)="savePhysical()"
            [disabled]="savingPhys()"
          >
            {{ savingPhys() ? '…' : 'Enregistrer' }}
          </button>
        </div>
        <form [formGroup]="physForm" class="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Bancs</mat-label>
            <input matInput type="number" formControlName="numberOfBenches" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Places</mat-label>
            <input matInput type="number" formControlName="numberOfSeats" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Type de tableau</mat-label>
            <mat-select formControlName="boardType">
              <mat-option [value]="''">—</mat-option>
              @for (o of boardTypes; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nb tableaux</mat-label>
            <input matInput type="number" formControlName="boardCount" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Poubelles</mat-label>
            <mat-select formControlName="hasWastebaskets">
              <mat-option [value]="''">—</mat-option>
              <mat-option [value]="'true'">Oui</mat-option>
              <mat-option [value]="'false'">Non</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nb poubelles</mat-label>
            <input matInput type="number" formControlName="wastebasketCount" />
          </mat-form-field>
          @for (e of equipment; track e.key) {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ e.label }}</mat-label>
              <input matInput type="number" [formControlName]="e.key" />
            </mat-form-field>
          }
        </form>
      </section>

      <!-- Promotion / passage -->
      <section class="panga-card p-5 mb-4">
        <panga-section-header icon="trending_up" title="Promotion / passage d'année" />
        <form
          [formGroup]="promoteForm"
          (ngSubmit)="promote()"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <mat-form-field appearance="outline">
            <mat-label>Action</mat-label>
            <mat-select formControlName="action">
              @for (o of promotionActions; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Classe de destination</mat-label>
            <mat-select formControlName="toClassInstanceId">
              @for (c of otherClasses(); track c.id) {
                <mat-option [value]="c.id">{{ classLabelOf(c) }} ({{ c.schoolYear }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Année de destination</mat-label>
            <input matInput formControlName="toSchoolYear" placeholder="2025-2026" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Motif</mat-label>
            <input matInput formControlName="reason" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="sm:col-span-2 lg:col-span-4">
            <mat-label>Élèves concernés</mat-label>
            <mat-select formControlName="studentIds" multiple>
              @for (st of students(); track $index) {
                <mat-option [value]="str(st['id'])">{{ studentName(st) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="promoting()">
              Enregistrer la promotion
            </button>
          </div>
        </form>

        @if (history().length) {
          <div class="mt-5">
            <p class="text-sm font-medium text-(--text) mb-2">Historique</p>
            <ul class="divide-y divide-(--border)">
              @for (h of history(); track $index) {
                <li class="flex items-center justify-between gap-2 py-2 text-sm">
                  <span class="text-(--text)"
                    >{{ str(h['action']) }} → {{ str(h['toSchoolYear']) }}</span
                  >
                  <span class="text-xs text-(--text-muted)">{{ str(h['reason']) }}</span>
                </li>
              }
            </ul>
          </div>
        }
      </section>

      <!-- Cours & élèves -->
      <section class="grid gap-4 lg:grid-cols-2 mb-4">
        <div class="panga-card p-5">
          <panga-section-header icon="menu_book" title="Cours" [count]="courses().length" />
          @for (c of courses(); track c.id) {
            <div
              class="flex items-center justify-between gap-2 py-2 border-b border-(--border) last:border-0"
            >
              <span class="text-sm text-(--text) truncate">{{ courseLabel(c) }}</span>
              <span class="text-xs text-(--text-muted) shrink-0">
                {{ c.hoursPerWeek ?? '—' }} h/sem
                @if (str(c['roomNumber'])) {
                  · {{ str(c['roomNumber']) }}
                }
              </span>
            </div>
          } @empty {
            <p class="text-sm text-(--text-muted)">Aucun cours ouvert.</p>
          }
        </div>
        <div class="panga-card p-5">
          <panga-section-header icon="groups" title="Élèves" [count]="students().length" />
          @for (st of students(); track $index) {
            <div class="flex items-center gap-3 py-2 border-b border-(--border) last:border-0">
              <panga-avatar [name]="studentName(st)" [size]="30" />
              <span class="text-sm text-(--text) truncate">{{ studentName(st) }}</span>
            </div>
          } @empty {
            <p class="text-sm text-(--text-muted)">Aucun élève inscrit.</p>
          }
        </div>
      </section>

      @if (stats()) {
        <section class="panga-card p-5">
          <panga-section-header icon="insights" title="Statistiques" />
          <panga-key-value [data]="stats()" />
        </section>
      }
    }
  `,
})
export class ClassDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly classesApi = inject(ClassesService);
  private readonly teachersApi = inject(TeachersService);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly studentsApi = inject(StudentsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly groups = GROUPS;
  /** Un groupe édite-t-il des champs du template (partagés entre toutes les années) ? */
  protected sharedGroup(group: Group): boolean {
    return group.fields.some((f) => f.fromTemplate);
  }
  protected readonly weekdays = WEEKDAY_OPTIONS;
  protected readonly promotionActions = PROMOTION_ACTION_OPTIONS;
  protected readonly tone = statusTone;
  protected readonly classLabelOf = (c: ClassInstance): string =>
    classLabel(c as unknown as Record<string, unknown>);

  protected readonly cls = signal<ClassInstance | null>(null);
  protected readonly teachers = signal<Teacher[]>([]);
  /** Cours ouverts de l'instance — pour relier un créneau à un cours réel. */
  protected readonly courses = signal<ClassSubject[]>([]);
  /** Élèves de l'école (aplatis, avec noms) — filtrés par classe pour le roster. */
  protected readonly allStudents = signal<Student[]>([]);
  protected readonly subOptions = signal<SchoolSubOption[]>([]);
  protected readonly slots = signal<ClassScheduleSlot[]>([]);
  protected readonly stats = signal<Record<string, unknown> | null>(null);
  protected readonly allClasses = signal<ClassInstance[]>([]);
  protected readonly history = signal<Record<string, unknown>[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savingSlots = signal(false);
  protected readonly promoting = signal(false);

  // Le roster vient de la relation embarquée (source d'appartenance fiable) ;
  // les noms, absents de cette relation (identité sous `user` non incluse), sont
  // enrichis en croisant avec la liste d'élèves aplatie (cf. studentName).
  protected readonly students = computed(() => this.cls()?.students ?? []);
  protected readonly otherClasses = computed(() =>
    this.allClasses().filter((c) => c.id !== this.id),
  );

  protected readonly boardTypes = BOARD_TYPE_OPTIONS;
  protected readonly equipment = EQUIPMENT;
  protected readonly savingPhys = signal(false);
  protected readonly physForm = new FormGroup(
    Object.fromEntries(PHYS_KEYS.map((k) => [k, new FormControl('', { nonNullable: true })])),
  );

  protected readonly promoteForm = new FormGroup({
    action: new FormControl('promote', { nonNullable: true }),
    toClassInstanceId: new FormControl('', { nonNullable: true }),
    toSchoolYear: new FormControl(this.sy.next(), { nonNullable: true }),
    reason: new FormControl('', { nonNullable: true }),
    studentIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  protected readonly form = new FormGroup(
    Object.fromEntries(ALL_KEYS.map((k) => [k, new FormControl('', { nonNullable: true })])),
  );

  constructor() {
    this.teachersApi
      .list({ page: 1, limit: 200 })
      .subscribe({ next: (r) => this.teachers.set(r.items) });
    this.reload();
    this.classesApi.scheduleSlots(this.id).subscribe({ next: (s) => this.slots.set(s) });
    this.subjectsApi
      .classSubjects({ classId: this.id })
      .subscribe({ next: (r) => this.courses.set(r.items), error: () => undefined });
    this.studentsApi
      .list({ page: 1, limit: 300, schoolYear: this.sy.filter() })
      .subscribe({ next: (r) => this.allStudents.set(r.items), error: () => undefined });
    this.classesApi
      .statistics(this.id)
      .subscribe({ next: (s) => this.stats.set(s), error: () => undefined });
    this.classesApi.list(this.sy.filter()).subscribe({ next: (r) => this.allClasses.set(r.items) });
    this.classesApi.subOptions().subscribe({ next: (r) => this.subOptions.set(r.items) });
    this.loadHistory();
  }

  private loadHistory(): void {
    this.classesApi.promotionHistory(this.id).subscribe({
      next: (h) => this.history.set(Array.isArray(h) ? (h as Record<string, unknown>[]) : []),
      error: () => undefined,
    });
  }

  promote(): void {
    const v = this.promoteForm.getRawValue();
    if (!v.toClassInstanceId || v.studentIds.length === 0 || this.promoting()) {
      this.notify.warning('Choisissez une destination et au moins un élève.');
      return;
    }
    this.promoting.set(true);
    this.classesApi
      .promote(this.id, {
        toClassInstanceId: v.toClassInstanceId,
        toSchoolYear: v.toSchoolYear,
        action: v.action,
        studentIds: v.studentIds,
        reason: v.reason || undefined,
      })
      .subscribe({
        next: () => {
          this.promoting.set(false);
          this.notify.success('Promotion enregistrée.');
          this.promoteForm.patchValue({ studentIds: [], reason: '' });
          this.loadHistory();
          this.reload();
        },
        error: () => this.promoting.set(false),
      });
  }

  protected name(): string {
    const c = this.cls();
    return c ? classLabel(c as unknown as Record<string, unknown>) : 'Classe';
  }
  protected teacherName(): string {
    return this.teacherLabel(this.cls()?.classTeacher);
  }
  protected teacherLabel(t: unknown): string {
    if (!t || typeof t !== 'object') {
      return '';
    }
    const obj = t as Record<string, unknown>;
    return personLabel((obj['user'] ?? obj) as Record<string, unknown>);
  }
  protected studentName(s: Record<string, unknown>): string {
    // La relation embarquée ne porte pas le nom (identité sous `user` non incluse).
    // On croise avec la liste aplitie (par id, puis matricule/numéro) pour obtenir
    // un vrai nom ; à défaut on affiche le matricule plutôt que le fallback « Parent ».
    const full = this.resolveStudent(s);
    const label = personLabel(full);
    if (label && label !== 'Parent') {
      return label;
    }
    return this.str(full['studentNumber']) || this.str(full['matricule']) || 'Élève';
  }

  /** Retrouve la fiche élève complète (avec nom) à partir de la relation embarquée. */
  private resolveStudent(s: Record<string, unknown>): Record<string, unknown> {
    const id = this.str(s['id']) || this.str(s['studentId']);
    const num = this.str(s['studentNumber']) || this.str(s['matricule']);
    const found = this.allStudents().find(
      (x) =>
        (!!id && x.id === id) ||
        (!!num && (this.str(x['studentNumber']) === num || this.str(x['matricule']) === num)),
    );
    // La relation embarquée peut aussi nicher l'identité sous `student`.
    return found ?? (s['student'] as Record<string, unknown>) ?? s;
  }
  protected str(v: unknown): string {
    return v === null || v === undefined ? '' : String(v);
  }

  private reload(): void {
    this.classesApi.get(this.id).subscribe({
      next: (c) => {
        this.cls.set(c);
        this.patch(c);
        this.patchPhys(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private patchPhys(c: ClassInstance): void {
    const inst = c as Record<string, unknown>;
    const eq = (c['physicalEquipment'] ?? {}) as Record<string, unknown>;
    const value: Record<string, string> = {};
    for (const k of [
      'numberOfBenches',
      'numberOfSeats',
      'boardType',
      'boardCount',
      'hasWastebaskets',
      'wastebasketCount',
    ]) {
      const v = inst[k];
      value[k] = v === null || v === undefined ? '' : String(v);
    }
    for (const e of EQUIPMENT) {
      const v = eq[e.key];
      value[e.key] = v === null || v === undefined ? '' : String(v);
    }
    this.physForm.patchValue(value);
    this.physForm.markAsPristine();
  }

  savePhysical(): void {
    if (this.savingPhys()) {
      return;
    }
    const raw = this.physForm.getRawValue() as Record<string, string>;
    const payload: Record<string, unknown> = {};
    for (const k of PHYS_NUMERIC) {
      if (raw[k] !== '') {
        payload[k] = Number(raw[k]);
      }
    }
    if (raw['boardType']) {
      payload['boardType'] = raw['boardType'];
    }
    if (raw['hasWastebaskets'] !== '') {
      payload['hasWastebaskets'] = raw['hasWastebaskets'] === 'true';
    }
    const equipment: Record<string, number> = {};
    for (const e of EQUIPMENT) {
      if (raw[e.key] !== '') {
        equipment[e.key] = Number(raw[e.key]);
      }
    }
    if (Object.keys(equipment).length) {
      payload['equipment'] = equipment;
    }
    this.savingPhys.set(true);
    this.classesApi.updatePhysicalEquipment(this.id, payload).subscribe({
      next: (c) => {
        this.savingPhys.set(false);
        this.cls.set(c);
        this.patchPhys(c);
        this.notify.success('Aspects physiques mis à jour.');
      },
      error: () => this.savingPhys.set(false),
    });
  }

  private patch(c: ClassInstance): void {
    const inst = c as Record<string, unknown>;
    const tpl = (c.template ?? {}) as Record<string, unknown>;
    const value: Record<string, string> = {};
    for (const key of ALL_KEYS) {
      const v = FROM_TEMPLATE.has(key) ? tpl[key] : inst[key];
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
        const v = ctrl.value as string;
        payload[key] = v === '' ? null : NUMBER_KEYS.has(key) ? Number(v) : v;
      }
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    this.saving.set(true);
    this.classesApi.update(this.id, payload).subscribe({
      next: (c) => {
        this.saving.set(false);
        this.cls.set(c);
        this.patch(c);
        this.notify.success('Classe mise à jour.');
      },
      error: () => this.saving.set(false),
    });
  }

  remove(): void {
    this.classesApi.remove(this.id).subscribe({
      next: () => {
        this.notify.success('Classe archivée.');
        void this.router.navigate(['/', 'classes']);
      },
    });
  }

  /* ----------------------------- Emploi du temps ---------------------------- */

  addSlot(): void {
    this.slots.update((list) => {
      // Enchaîne sur le dernier créneau : même jour, début = fin précédente,
      // même durée (ex. 07h30–08h15 → 08h15–09h00).
      const last = list[list.length - 1];
      if (last?.startTime && last?.endTime) {
        const dur = this.minutes(last.endTime) - this.minutes(last.startTime);
        const start = last.endTime;
        const end = this.hhmm(this.minutes(start) + (dur > 0 ? dur : 45));
        return [
          ...list,
          { weekdayIso: last.weekdayIso ?? 1, startTime: start, endTime: end, label: '', room: '' },
        ];
      }
      return [
        ...list,
        { weekdayIso: 1, startTime: '08:00', endTime: '09:00', label: '', room: '' },
      ];
    });
  }
  /** « HH:MM » → minutes depuis minuit. */
  private minutes(hhmm: string): number {
    const [h, m] = (hhmm || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  /** minutes → « HH:MM » (borné sur 24h). */
  private hhmm(min: number): string {
    const t = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }
  removeSlot(index: number): void {
    this.slots.update((list) => list.filter((_, i) => i !== index));
  }
  patchSlot(index: number, key: keyof ClassScheduleSlot, value: unknown): void {
    this.slots.update((list) => list.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }

  /** Libellé lisible d'un cours (matière du programme national). */
  protected courseLabel(cs: ClassSubject): string {
    return cs.nationalProgramSlot?.labelFr ?? cs.nationalProgramSlot?.programCode ?? 'Cours';
  }

  /** Relie un créneau à un cours : fixe `classSubjectId` et dérive le `label`. */
  patchSlotCourse(index: number, classSubjectId: string): void {
    const course = this.courses().find((c) => c.id === classSubjectId);
    this.slots.update((list) =>
      list.map((s, i) =>
        i === index
          ? {
              ...s,
              classSubjectId: classSubjectId || undefined,
              label: course ? this.courseLabel(course) : '',
            }
          : s,
      ),
    );
  }

  saveSlots(): void {
    if (this.savingSlots()) {
      return;
    }
    // On n'envoie que les champs acceptés par le DTO de créneau.
    const payload = this.slots().map((s) => ({
      weekdayIso: Number(s.weekdayIso),
      startTime: s.startTime,
      endTime: s.endTime,
      label: s.label || undefined,
      room: s.room || undefined,
      classSubjectId: s.classSubjectId || undefined,
      teacherId: s.teacherId || undefined,
      sortOrder: s.sortOrder ?? 0,
    })) as ClassScheduleSlot[];
    this.savingSlots.set(true);
    this.classesApi.replaceScheduleSlots(this.id, payload).subscribe({
      next: (slots) => {
        this.savingSlots.set(false);
        this.slots.set(slots);
        this.notify.success('Emploi du temps enregistré.');
      },
      error: () => this.savingSlots.set(false),
    });
  }
}
