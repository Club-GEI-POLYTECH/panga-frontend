import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
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
import { TeachersService } from '../services/teachers.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { DateField } from '../../../shared/ui/date-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { ClassInstance, Teacher } from '../models/admin.models';
import type { ClassSubject } from '../models/course.models';
import type { Exam, ExamRoom, ExamSession, SeatingRoomRoster } from '../models/exam.models';
import {
  EXAM_STATUS_OPTIONS,
  EXAM_TYPE_OPTIONS,
  ROOM_TYPE_OPTIONS,
  SEATING_MODE_OPTIONS,
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
    DateField,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="quiz" title="Examens" subtitle="Sessions, salles & épreuves" />

    <!-- Onglets -->
    <div class="flex gap-1 mb-4 p-1 rounded-xl bg-(--background) w-fit border border-(--border)">
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
        <div
          class="panga-card p-5 mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"
        >
          <mat-form-field
            appearance="outline"
            class="w-full sm:flex-1 sm:min-w-50"
            subscriptSizing="dynamic"
          >
            <mat-label>Classe</mat-label>
            <mat-select [formControl]="filterClass" (selectionChange)="onClassChange()">
              <mat-option [value]="''">Toutes</mat-option>
              @for (c of classes(); track c.id) {
                <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field
            appearance="outline"
            class="w-full sm:w-auto sm:min-w-37.5"
            subscriptSizing="dynamic"
          >
            <mat-label>Période</mat-label>
            <mat-select [formControl]="filterTerm" (selectionChange)="reload()">
              <mat-option [value]="''">Toutes</mat-option>
              @for (o of terms; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field
            appearance="outline"
            class="w-full sm:w-auto sm:min-w-37.5"
            subscriptSizing="dynamic"
          >
            <mat-label>Type</mat-label>
            <mat-select [formControl]="filterType" (selectionChange)="reload()">
              <mat-option [value]="''">Tous</mat-option>
              @for (o of examTypes; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field
            appearance="outline"
            class="w-full sm:w-auto sm:min-w-37.5"
            subscriptSizing="dynamic"
          >
            <mat-label>Statut</mat-label>
            <mat-select [formControl]="filterStatus" (selectionChange)="reload()">
              <mat-option [value]="''">Tous</mat-option>
              @for (o of statuses; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button class="rounded-xl! w-full sm:w-auto" (click)="toggleCreate()">
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
              <panga-date-field class="w-full" label="Date" formControlName="examDate" />
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
                class="rounded-xl!"
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
            <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
          } @else if (exams().length === 0) {
            <panga-empty-state
              icon="quiz"
              title="Aucun examen"
              description="Créez un examen pour cette classe."
            />
          } @else {
            <div class="divide-y divide-(--border) -mx-5">
              @for (e of exams(); track e.id) {
                <a
                  [routerLink]="['/', 'exams', e.id]"
                  class="flex items-center gap-4 px-5 py-3 hover:bg-(--background) transition-colors"
                >
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style="background: var(--brand-gradient)"
                  >
                    <span class="material-symbols-outlined text-[20px]">quiz</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-(--text) truncate">
                      {{ e.name || '—' }}
                    </p>
                    <p class="text-xs text-(--text-muted) truncate">
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
                  <mat-icon fontSet="material-symbols-outlined" class="text-(--text-muted)"
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
            <button mat-flat-button class="rounded-xl!" (click)="showSession.set(!showSession())">
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
              <mat-form-field appearance="outline" class="lg:col-span-2" subscriptSizing="dynamic">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Période</mat-label>
                <mat-select formControlName="term">
                  @for (o of terms; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Répartition des salles</mat-label>
                <mat-select formControlName="seatingMode">
                  @for (o of seatingModes; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <panga-date-field
                class="w-full"
                label="Début"
                formControlName="startDate"
                subscriptSizing="dynamic"
              />
              <panga-date-field
                class="w-full"
                label="Fin"
                formControlName="endDate"
                subscriptSizing="dynamic"
              />
              <div class="flex items-end">
                <button
                  mat-flat-button
                  class="rounded-xl!"
                  type="submit"
                  [disabled]="sessionForm.invalid || saving()"
                >
                  Créer
                </button>
              </div>
            </form>
          }

          @if (sessions().length === 0) {
            <p class="text-sm text-(--text-muted)">Aucune session.</p>
          } @else {
            <div class="flex flex-col gap-3">
              @for (s of sessions(); track s.id) {
                <div class="rounded-2xl border border-(--border) p-4">
                  <button
                    type="button"
                    class="appearance-none border-0 bg-transparent p-0 w-full text-left"
                    (click)="toggleSession(s)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-medium text-(--text) truncate">{{ s.name }}</p>
                        <p class="text-xs text-(--text-muted)">
                          {{ s.schoolYear }} · {{ s.term }} · {{ seatingModeLabel(s.seatingMode) }}
                        </p>
                      </div>
                      <panga-status-badge
                        [label]="sessionStatusLabel(s.status)"
                        tone="info"
                        [dot]="false"
                      />
                    </div>
                    <p class="text-xs text-(--text-muted) mt-2">
                      {{ s.startDate }} → {{ s.endDate }} · {{ s.totalExams ?? 0 }} examen(s)
                    </p>
                  </button>

                  @if (expandedSessionId() === s.id) {
                    <div class="mt-4 pt-4 border-t border-(--border)">
                      <mat-form-field
                        appearance="outline"
                        subscriptSizing="dynamic"
                        class="w-full sm:w-60 mb-5"
                      >
                        <mat-label>Répartition des salles</mat-label>
                        <mat-select
                          [value]="s.seatingMode || 'by_class'"
                          (selectionChange)="onChangeSeatingMode(s, $event.value)"
                        >
                          @for (o of seatingModes; track o.value) {
                            <mat-option [value]="o.value">{{ o.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>

                      <p class="text-sm font-medium text-(--text) mb-2">Placement en salle</p>
                      <div class="flex flex-wrap items-end gap-3 mb-5">
                        <mat-form-field
                          appearance="outline"
                          subscriptSizing="dynamic"
                          class="flex-1 min-w-55"
                        >
                          <mat-label>Salles</mat-label>
                          <mat-select
                            multiple
                            [value]="selectedRoomIds()"
                            (selectionChange)="selectedRoomIds.set($event.value)"
                          >
                            @for (r of rooms(); track r.id) {
                              <mat-option [value]="r.id">{{
                                r.roomName || r.roomNumber
                              }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <button
                          mat-flat-button
                          class="rounded-xl!"
                          [disabled]="!selectedRoomIds().length || saving()"
                          (click)="onGenerateSeating(s.id)"
                        >
                          <mat-icon fontSet="material-symbols-outlined">event_seat</mat-icon>
                          Générer le placement
                        </button>
                      </div>

                      @if (s.seatingMode === 'mixed') {
                        <p class="text-sm font-medium text-(--text) mb-2">
                          Surveillant — salle & fenêtre horaire
                        </p>
                        <form
                          [formGroup]="sessionSupForm"
                          (ngSubmit)="onAddSessionSupervisor(s.id)"
                          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-5"
                        >
                          <mat-form-field
                            appearance="outline"
                            subscriptSizing="dynamic"
                            class="lg:col-span-2"
                          >
                            <mat-label>Enseignant</mat-label>
                            <mat-select formControlName="teacherId">
                              @for (t of teachers(); track t.id) {
                                <mat-option [value]="t.id">{{ teacherName(t) }}</mat-option>
                              }
                            </mat-select>
                          </mat-form-field>
                          <mat-form-field appearance="outline" subscriptSizing="dynamic">
                            <mat-label>Salle</mat-label>
                            <mat-select formControlName="roomId">
                              @for (r of rooms(); track r.id) {
                                <mat-option [value]="r.id">{{
                                  r.roomName || r.roomNumber
                                }}</mat-option>
                              }
                            </mat-select>
                          </mat-form-field>
                          <panga-date-field
                            class="w-full"
                            label="Date"
                            formControlName="date"
                            subscriptSizing="dynamic"
                          />
                          <div class="flex gap-2">
                            <mat-form-field
                              appearance="outline"
                              subscriptSizing="dynamic"
                              class="flex-1"
                            >
                              <mat-label>Début</mat-label>
                              <input matInput type="time" formControlName="startTime" />
                            </mat-form-field>
                            <mat-form-field
                              appearance="outline"
                              subscriptSizing="dynamic"
                              class="flex-1"
                            >
                              <mat-label>Fin</mat-label>
                              <input matInput type="time" formControlName="endTime" />
                            </mat-form-field>
                          </div>
                          <div class="flex items-end lg:col-span-5">
                            <button
                              mat-flat-button
                              class="rounded-xl!"
                              type="submit"
                              [disabled]="sessionSupForm.invalid || saving()"
                            >
                              Ajouter
                            </button>
                          </div>
                        </form>
                      }

                      @if (loadingSeating()) {
                        <p class="text-sm text-(--text-muted)">Chargement du placement…</p>
                      } @else if (seatingRooms().length === 0) {
                        <p class="text-sm text-(--text-muted)">
                          Aucun placement généré pour l'instant.
                        </p>
                      } @else {
                        <div class="grid gap-3 sm:grid-cols-2">
                          @for (room of seatingRooms(); track room.roomId) {
                            <div class="rounded-xl border border-(--border) p-3">
                              <p class="text-sm font-medium text-(--text)">{{ roomLabel(room) }}</p>
                              <p class="text-xs text-(--text-muted) mb-1">
                                {{ room.students?.length ?? 0 }} élève(s)
                              </p>
                              @if (room.supervisors?.length) {
                                <p class="text-xs text-(--text-muted)">
                                  Surveillance : {{ supervisorNames(room) }}
                                </p>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
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
            <button mat-flat-button class="rounded-xl!" (click)="showRoom.set(!showRoom())">
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
                  class="rounded-xl!"
                  type="submit"
                  [disabled]="roomForm.invalid || saving()"
                >
                  Créer
                </button>
              </div>
            </form>
          }

          @if (rooms().length === 0) {
            <p class="text-sm text-(--text-muted)">Aucune salle.</p>
          } @else {
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (r of rooms(); track r.id) {
                <div class="rounded-2xl border border-(--border) p-4">
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-(--text) truncate">
                      {{ r.roomName || r.roomNumber }}
                    </p>
                    <panga-status-badge
                      [label]="roomTypeLabel(r.roomType)"
                      tone="neutral"
                      [dot]="false"
                    />
                  </div>
                  <p class="text-xs text-(--text-muted) mt-1">
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
  private readonly teachersApi = inject(TeachersService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly terms = TERM_OPTIONS;
  protected readonly examTypes = EXAM_TYPE_OPTIONS;
  protected readonly statuses = EXAM_STATUS_OPTIONS;
  protected readonly roomTypes = ROOM_TYPE_OPTIONS;
  protected readonly seatingModes = SEATING_MODE_OPTIONS;
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
  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showCreate = signal(false);
  protected readonly showSession = signal(false);
  protected readonly showRoom = signal(false);
  private page = 1;

  /* ------------------------------- Placement --------------------------------- */

  protected readonly expandedSessionId = signal<string | null>(null);
  protected readonly selectedRoomIds = signal<string[]>([]);
  protected readonly seatingRooms = signal<SeatingRoomRoster[]>([]);
  protected readonly loadingSeating = signal(false);

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
    seatingMode: new FormControl('by_class', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** Surveillant session (mode `mixed`) : salle + fenêtre horaire, sans examen unique. */
  protected readonly sessionSupForm = new FormGroup({
    teacherId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    roomId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('08:00', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('10:00', { nonNullable: true, validators: [Validators.required] }),
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
    this.examsApi.sessions().subscribe({ next: (s) => this.sessions.set(s) });
    this.examsApi.rooms().subscribe({ next: (r) => this.rooms.set(r) });
    this.teachersApi
      .list({ page: 1, limit: 200 })
      .subscribe({ next: (r) => this.teachers.set(r.items) });
    // Recharge classes & examens à chaque changement d'année (sélecteur global).
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
        this.reload();
      });
    });
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
        this.sessionForm.reset({ term: 'TERM1', seatingMode: 'by_class' });
        this.showSession.set(false);
        this.examsApi.sessions().subscribe({ next: (s) => this.sessions.set(s) });
      },
      error: () => this.saving.set(false),
    });
  }

  /* ------------------------------- Placement --------------------------------- */

  onChangeSeatingMode(s: ExamSession, mode: string): void {
    if (mode === (s.seatingMode || 'by_class') || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.examsApi.updateSession(s.id, { seatingMode: mode }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.notify.success('Répartition des salles mise à jour.');
        this.sessions.update((list) => list.map((x) => (x.id === s.id ? { ...x, ...updated } : x)));
      },
      error: () => this.saving.set(false),
    });
  }

  toggleSession(s: ExamSession): void {
    if (this.expandedSessionId() === s.id) {
      this.expandedSessionId.set(null);
      return;
    }
    this.expandedSessionId.set(s.id);
    this.selectedRoomIds.set([]);
    this.sessionSupForm.reset({ startTime: '08:00', endTime: '10:00' });
    this.loadSeating(s.id);
  }

  private loadSeating(sessionId: string): void {
    this.loadingSeating.set(true);
    this.examsApi
      .seating(sessionId)
      .pipe(catchError(() => of([] as SeatingRoomRoster[])))
      .subscribe((rows) => {
        this.seatingRooms.set(rows);
        this.loadingSeating.set(false);
      });
  }

  onGenerateSeating(sessionId: string): void {
    if (!this.selectedRoomIds().length || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.examsApi.generateSeating(sessionId, { roomIds: this.selectedRoomIds() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Placement généré.');
        this.loadSeating(sessionId);
      },
      error: () => this.saving.set(false),
    });
  }

  onAddSessionSupervisor(sessionId: string): void {
    if (this.sessionSupForm.invalid || this.saving()) {
      return;
    }
    const v = this.sessionSupForm.getRawValue();
    this.saving.set(true);
    this.examsApi.addSessionSupervisor(sessionId, v).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Surveillant ajouté.');
        this.sessionSupForm.reset({ startTime: '08:00', endTime: '10:00' });
        this.loadSeating(sessionId);
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
  protected seatingModeLabel(m: string | undefined): string {
    return examLabel(SEATING_MODE_OPTIONS, m || 'by_class');
  }
  protected teacherName(t: Teacher): string {
    const u = (t.user ?? {}) as Record<string, unknown>;
    return (
      `${(u['firstName'] as string) ?? ''} ${(u['lastName'] as string) ?? ''}`.trim() ||
      (t.employeeNumber as string) ||
      t.id
    );
  }
  protected roomLabel(room: SeatingRoomRoster): string {
    return room.room?.roomName || room.room?.roomNumber || 'Salle';
  }
  protected supervisorNames(room: SeatingRoomRoster): string {
    return (room.supervisors ?? [])
      .map((sup) => {
        const t = (sup.teacher ?? {}) as Record<string, unknown>;
        const u = (t['user'] ?? {}) as Record<string, unknown>;
        return (
          `${(u['firstName'] as string) ?? ''} ${(u['lastName'] as string) ?? ''}`.trim() ||
          (t['employeeNumber'] as string) ||
          'Surveillant'
        );
      })
      .join(', ');
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
