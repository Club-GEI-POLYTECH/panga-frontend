import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ExamsService } from '../services/exams.service';
import { ClassesService } from '../services/classes.service';
import { SubjectsService } from '../services/subjects.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { ClassInstance } from '../models/admin.models';
import type { ClassSubject } from '../models/course.models';
import type { Exam, ExamRoom, ExamSession } from '../models/exam.models';
import {
  EXAM_STATUS_OPTIONS,
  EXAM_TYPE_OPTIONS,
  ROOM_TYPE_OPTIONS,
  examLabel,
  examStatusTone,
} from '../../../core/models/exam.enums';
import { TERM_OPTIONS } from '../../../core/models/grade.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

interface CourseRef {
  slotId: string;
  label: string;
}

@Component({
  selector: 'panga-exams-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EmptyState,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="quiz" title="Examens" subtitle="Sessions, salles & épreuves" />

    <!-- Onglets -->
    <div
      class="flex gap-1 mb-4 p-1 rounded-xl bg-[var(--background)] w-fit border border-[var(--border)]"
    >
      @for (t of tabs; track t.key) {
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium"
          [style.background]="tab() === t.key ? 'var(--surface)' : 'transparent'"
          [style.color]="tab() === t.key ? 'var(--text)' : 'var(--text-muted)'"
          (click)="tab.set(t.key)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('exams') {
        <!-- Filtres -->
        <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
          <mat-form-field appearance="outline" class="flex-1 min-w-[200px]">
            <mat-label>Classe</mat-label>
            <mat-select [formControl]="filterClass" (selectionChange)="onClassChange()">
              <mat-option [value]="''">Toutes</mat-option>
              @for (c of classes(); track c.id) {
                <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="min-w-[150px]">
            <mat-label>Période</mat-label>
            <mat-select [formControl]="filterTerm" (selectionChange)="reload()">
              <mat-option [value]="''">Toutes</mat-option>
              @for (o of terms; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="min-w-[150px]">
            <mat-label>Type</mat-label>
            <mat-select [formControl]="filterType" (selectionChange)="reload()">
              <mat-option [value]="''">Tous</mat-option>
              @for (o of examTypes; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="min-w-[150px]">
            <mat-label>Statut</mat-label>
            <mat-select [formControl]="filterStatus" (selectionChange)="reload()">
              <mat-option [value]="''">Tous</mat-option>
              @for (o of statuses; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button class="!rounded-xl" (click)="toggleCreate()">
            <mat-icon fontSet="material-symbols-outlined">{{
              showCreate() ? 'close' : 'add'
            }}</mat-icon>
            {{ showCreate() ? 'Annuler' : 'Nouvel examen' }}
          </button>
        </div>

        <!-- Création examen -->
        @if (showCreate()) {
          <form [formGroup]="form" (ngSubmit)="createExam()" class="panga-card p-6 mb-6">
            <panga-section-header icon="add" title="Nouvel examen" />
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <mat-form-field appearance="outline">
                <mat-label>Classe</mat-label>
                <mat-select formControlName="classId" (selectionChange)="loadCourses($event.value)">
                  @for (c of classes(); track c.id) {
                    <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Cours</mat-label>
                <mat-select formControlName="nationalProgramSlotId">
                  @for (c of courses(); track c.slotId) {
                    <mat-option [value]="c.slotId">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select formControlName="examType">
                  @for (o of examTypes; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="lg:col-span-2">
                <mat-label>Nom de l'examen</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Période</mat-label>
                <mat-select formControlName="term">
                  @for (o of terms; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput type="date" formControlName="examDate" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Début</mat-label>
                <input matInput type="time" formControlName="startTime" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fin</mat-label>
                <input matInput type="time" formControlName="endTime" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Durée (min)</mat-label>
                <input matInput type="number" formControlName="durationMinutes" min="1" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Note max</mat-label>
                <input matInput type="number" formControlName="maxScore" min="0" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Note de passage</mat-label>
                <input matInput type="number" formControlName="passingScore" min="0" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Coefficient</mat-label>
                <input matInput type="number" formControlName="coefficient" min="0" />
              </mat-form-field>
            </div>
            <div class="flex justify-end mt-2">
              <button
                mat-flat-button
                class="!rounded-xl"
                type="submit"
                [disabled]="form.invalid || saving()"
              >
                Créer l'examen
              </button>
            </div>
          </form>
        }

        <!-- Liste -->
        <section class="panga-card p-5">
          <panga-section-header
            icon="quiz"
            title="Épreuves"
            [count]="meta()?.total ?? exams().length"
          />
          @if (loading()) {
            <p class="text-sm text-[var(--text-muted)] py-6 text-center">Chargement…</p>
          } @else if (exams().length === 0) {
            <panga-empty-state
              icon="quiz"
              title="Aucun examen"
              description="Créez un examen pour cette classe."
            />
          } @else {
            <div class="divide-y divide-[var(--border)] -mx-5">
              @for (e of exams(); track e.id) {
                <a
                  [routerLink]="['/', 'exams', e.id]"
                  class="flex items-center gap-4 px-5 py-3 hover:bg-[var(--background)] transition-colors"
                >
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style="background: var(--brand-gradient)"
                  >
                    <span class="material-symbols-outlined text-[20px]">quiz</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-[var(--text)] truncate">
                      {{ e.name || '—' }}
                    </p>
                    <p class="text-xs text-[var(--text-muted)] truncate">
                      {{ courseLabel(e) }}
                      @if (e.examDate) {
                        · {{ e.examDate }}
                      }
                      @if (e.startTime) {
                        · {{ e.startTime }}–{{ e.endTime }}
                      }
                    </p>
                  </div>
                  <panga-status-badge [label]="typeLabel(e.examType)" tone="brand" [dot]="false" />
                  <panga-status-badge
                    [label]="statusLabel(e.status)"
                    [tone]="statusTone(e.status)"
                    [dot]="false"
                  />
                  @if (e.isResultsPublished) {
                    <panga-status-badge label="Résultats publiés" tone="success" [dot]="false" />
                  }
                  <mat-icon fontSet="material-symbols-outlined" class="text-[var(--text-muted)]"
                    >chevron_right</mat-icon
                  >
                </a>
              }
            </div>
            @if (meta(); as m) {
              <panga-paginator [meta]="m" (pageChange)="goPage($event)" />
            }
          }
        </section>
      }

      @case ('sessions') {
        <section class="panga-card p-5">
          <panga-section-header
            icon="event_available"
            title="Sessions d'examen"
            [count]="sessions().length"
          >
            <button mat-flat-button class="!rounded-xl" (click)="showSession.set(!showSession())">
              <mat-icon fontSet="material-symbols-outlined">{{
                showSession() ? 'close' : 'add'
              }}</mat-icon>
              {{ showSession() ? 'Annuler' : 'Nouvelle session' }}
            </button>
          </panga-section-header>

          @if (showSession()) {
            <form
              [formGroup]="sessionForm"
              (ngSubmit)="createSession()"
              class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-5"
            >
              <mat-form-field appearance="outline" class="lg:col-span-2">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Période</mat-label>
                <mat-select formControlName="term">
                  @for (o of terms; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Début</mat-label>
                <input matInput type="date" formControlName="startDate" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fin</mat-label>
                <input matInput type="date" formControlName="endDate" />
              </mat-form-field>
              <div class="flex items-end">
                <button
                  mat-flat-button
                  class="!rounded-xl"
                  type="submit"
                  [disabled]="sessionForm.invalid || saving()"
                >
                  Créer
                </button>
              </div>
            </form>
          }

          @if (sessions().length === 0) {
            <p class="text-sm text-[var(--text-muted)]">Aucune session.</p>
          } @else {
            <div class="grid gap-3 sm:grid-cols-2">
              @for (s of sessions(); track s.id) {
                <div class="rounded-2xl border border-[var(--border)] p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-medium text-[var(--text)] truncate">{{ s.name }}</p>
                      <p class="text-xs text-[var(--text-muted)]">
                        {{ s.schoolYear }} · {{ s.term }}
                      </p>
                    </div>
                    <panga-status-badge
                      [label]="sessionStatusLabel(s.status)"
                      tone="info"
                      [dot]="false"
                    />
                  </div>
                  <p class="text-xs text-[var(--text-muted)] mt-2">
                    {{ s.startDate }} → {{ s.endDate }} · {{ s.totalExams ?? 0 }} examen(s)
                  </p>
                </div>
              }
            </div>
          }
        </section>
      }

      @case ('rooms') {
        <section class="panga-card p-5">
          <panga-section-header
            icon="meeting_room"
            title="Salles d'examen"
            [count]="rooms().length"
          >
            <button mat-flat-button class="!rounded-xl" (click)="showRoom.set(!showRoom())">
              <mat-icon fontSet="material-symbols-outlined">{{
                showRoom() ? 'close' : 'add'
              }}</mat-icon>
              {{ showRoom() ? 'Annuler' : 'Nouvelle salle' }}
            </button>
          </panga-section-header>

          @if (showRoom()) {
            <form
              [formGroup]="roomForm"
              (ngSubmit)="createRoom()"
              class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5"
            >
              <mat-form-field appearance="outline">
                <mat-label>Numéro</mat-label>
                <input matInput formControlName="roomNumber" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="roomName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select formControlName="roomType">
                  @for (o of roomTypes; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Capacité</mat-label>
                <input matInput type="number" formControlName="capacity" min="1" />
              </mat-form-field>
              <div class="flex items-end">
                <button
                  mat-flat-button
                  class="!rounded-xl"
                  type="submit"
                  [disabled]="roomForm.invalid || saving()"
                >
                  Créer
                </button>
              </div>
            </form>
          }

          @if (rooms().length === 0) {
            <p class="text-sm text-[var(--text-muted)]">Aucune salle.</p>
          } @else {
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (r of rooms(); track r.id) {
                <div class="rounded-2xl border border-[var(--border)] p-4">
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-[var(--text)] truncate">
                      {{ r.roomName || r.roomNumber }}
                    </p>
                    <panga-status-badge
                      [label]="roomTypeLabel(r.roomType)"
                      tone="neutral"
                      [dot]="false"
                    />
                  </div>
                  <p class="text-xs text-[var(--text-muted)] mt-1">
                    N° {{ r.roomNumber }} · {{ r.capacity }} places
                    @if (r.building) {
                      · {{ r.building }}
                    }
                  </p>
                </div>
              }
            </div>
          }
        </section>
      }
    }
  `,
})
export class ExamsList {
  private readonly examsApi = inject(ExamsService);
  private readonly classesApi = inject(ClassesService);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly terms = TERM_OPTIONS;
  protected readonly examTypes = EXAM_TYPE_OPTIONS;
  protected readonly statuses = EXAM_STATUS_OPTIONS;
  protected readonly roomTypes = ROOM_TYPE_OPTIONS;
  protected readonly tabs = [
    { key: 'exams' as const, label: 'Examens' },
    { key: 'sessions' as const, label: 'Sessions' },
    { key: 'rooms' as const, label: 'Salles' },
  ];

  protected readonly tab = signal<'exams' | 'sessions' | 'rooms'>('exams');
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly courses = signal<CourseRef[]>([]);
  protected readonly exams = signal<Exam[]>([]);
  protected readonly meta = signal<PaginationMeta | null>(null);
  protected readonly sessions = signal<ExamSession[]>([]);
  protected readonly rooms = signal<ExamRoom[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showCreate = signal(false);
  protected readonly showSession = signal(false);
  protected readonly showRoom = signal(false);
  private page = 1;

  protected readonly filterClass = new FormControl('', { nonNullable: true });
  protected readonly filterTerm = new FormControl('', { nonNullable: true });
  protected readonly filterType = new FormControl('', { nonNullable: true });
  protected readonly filterStatus = new FormControl('', { nonNullable: true });

  protected readonly form = new FormGroup({
    classId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nationalProgramSlotId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    examType: new FormControl('final', { nonNullable: true, validators: [Validators.required] }),
    term: new FormControl('TERM1', { nonNullable: true, validators: [Validators.required] }),
    examDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('08:00', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('10:00', { nonNullable: true, validators: [Validators.required] }),
    durationMinutes: new FormControl(120, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    maxScore: new FormControl<number | null>(20),
    passingScore: new FormControl<number | null>(null),
    coefficient: new FormControl<number | null>(1),
  });

  protected readonly sessionForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    term: new FormControl('TERM1', { nonNullable: true, validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly roomForm = new FormGroup({
    roomNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    roomName: new FormControl('', { nonNullable: true }),
    roomType: new FormControl('classroom', { nonNullable: true }),
    capacity: new FormControl(30, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  constructor() {
    this.classesApi.list(this.sy.filter()).subscribe({ next: (r) => this.classes.set(r.items) });
    this.reload();
    this.examsApi.sessions().subscribe({ next: (s) => this.sessions.set(s) });
    this.examsApi.rooms().subscribe({ next: (r) => this.rooms.set(r) });
  }

  /* -------------------------------- Examens --------------------------------- */

  onClassChange(): void {
    this.reload();
  }

  reload(): void {
    this.page = 1;
    this.loadExams();
  }

  private loadExams(): void {
    this.loading.set(true);
    this.examsApi
      .list({
        classId: this.filterClass.value || undefined,
        term: this.filterTerm.value || undefined,
        examType: this.filterType.value || undefined,
        status: this.filterStatus.value || undefined,
        schoolYear: this.sy.filter(),
        page: this.page,
        limit: 20,
      })
      .subscribe({
        next: (r) => {
          this.exams.set(r.items);
          this.meta.set(r.pagination ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.exams.set([]);
          this.meta.set(null);
          this.loading.set(false);
        },
      });
  }

  goPage(page: number): void {
    this.page = page;
    this.loadExams();
  }

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
  }

  loadCourses(classId: string): void {
    this.subjectsApi
      .classSubjects({ classId, schoolYear: this.sy.filter() })
      .pipe(catchError(() => of({ items: [] })))
      .subscribe({ next: (r) => this.courses.set(toCourses(r.items)) });
  }

  createExam(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = {
      classId: v.classId,
      nationalProgramSlotId: v.nationalProgramSlotId,
      name: v.name,
      examType: v.examType,
      schoolYear: this.sy.selected(),
      term: v.term,
      examDate: v.examDate,
      startTime: v.startTime,
      endTime: v.endTime,
      durationMinutes: Number(v.durationMinutes),
      ...(v.maxScore !== null ? { maxScore: Number(v.maxScore) } : {}),
      ...(v.passingScore !== null ? { passingScore: Number(v.passingScore) } : {}),
      ...(v.coefficient !== null ? { coefficient: Number(v.coefficient) } : {}),
    };
    this.saving.set(true);
    this.examsApi.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Examen créé.');
        this.form.reset({
          examType: 'final',
          term: 'TERM1',
          startTime: '08:00',
          endTime: '10:00',
          durationMinutes: 120,
          maxScore: 20,
          coefficient: 1,
        });
        this.showCreate.set(false);
        this.loadExams();
      },
      error: () => this.saving.set(false),
    });
  }

  /* ------------------------------- Sessions --------------------------------- */

  createSession(): void {
    if (this.sessionForm.invalid || this.saving()) {
      return;
    }
    const v = this.sessionForm.getRawValue();
    this.saving.set(true);
    this.examsApi.createSession({ ...v, schoolYear: this.sy.selected() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Session créée.');
        this.sessionForm.reset({ term: 'TERM1' });
        this.showSession.set(false);
        this.examsApi.sessions().subscribe({ next: (s) => this.sessions.set(s) });
      },
      error: () => this.saving.set(false),
    });
  }

  /* -------------------------------- Salles ---------------------------------- */

  createRoom(): void {
    if (this.roomForm.invalid || this.saving()) {
      return;
    }
    const v = this.roomForm.getRawValue();
    this.saving.set(true);
    this.examsApi
      .createRoom({
        roomNumber: v.roomNumber,
        capacity: Number(v.capacity),
        roomType: v.roomType,
        ...(v.roomName ? { roomName: v.roomName } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Salle créée.');
          this.roomForm.reset({ roomType: 'classroom', capacity: 30 });
          this.showRoom.set(false);
          this.examsApi.rooms().subscribe({ next: (r) => this.rooms.set(r) });
        },
        error: () => this.saving.set(false),
      });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected courseLabel(e: Exam): string {
    return e.nationalProgramSlot?.labelFr ?? e.nationalProgramSlot?.programCode ?? 'Cours';
  }
  protected typeLabel(t: string | undefined): string {
    return examLabel(EXAM_TYPE_OPTIONS, t);
  }
  protected statusLabel(s: string | undefined): string {
    return examLabel(EXAM_STATUS_OPTIONS, s);
  }
  protected statusTone(s: string | undefined) {
    return examStatusTone(s);
  }
  protected sessionStatusLabel(s: string | undefined): string {
    return examLabel(EXAM_STATUS_OPTIONS, s);
  }
  protected roomTypeLabel(t: string | undefined): string {
    return examLabel(ROOM_TYPE_OPTIONS, t);
  }
}

function toCourses(subjects: ClassSubject[]): CourseRef[] {
  return subjects
    .map((cs) => ({
      slotId: cs.nationalProgramSlotId ?? '',
      label: cs.nationalProgramSlot?.labelFr ?? cs.nationalProgramSlot?.programCode ?? 'Cours',
    }))
    .filter((c) => c.slotId);
}
