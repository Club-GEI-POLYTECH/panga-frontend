import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GradesService } from '../services/grades.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import { SubjectsService } from '../services/subjects.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { ClassInstance, Student } from '../models/admin.models';
import type { ClassSubject } from '../models/course.models';
import type {
  BulkCreateGradesDto,
  Grade,
  Period,
  ProclamationResult,
  ProclamationRow,
} from '../models/grade.models';
import {
  EXAM_TYPE_OPTIONS,
  GRADE_STATUS_OPTIONS,
  TERM_OPTIONS,
  labelOf,
} from '../../../core/models/grade.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

interface CourseRef {
  slotId: string;
  label: string;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
  disputed: 'danger',
};

/** Notes (admin / enseignant) : saisie en lot, périodes, moyennes, proclamation. */
@Component({
  selector: 'panga-grades-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    Avatar,
    EmptyState,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="grade" title="Notes" subtitle="Saisie, périodes & moyennes">
      <button mat-stroked-button class="!rounded-xl" [matMenuTriggerFor]="excelMenu">
        <mat-icon fontSet="material-symbols-outlined">table_view</mat-icon> Excel
      </button>
      <mat-menu #excelMenu="matMenu" class="panga-menu">
        <button mat-menu-item (click)="downloadTemplate()">
          <mat-icon fontSet="material-symbols-outlined">download</mat-icon>
          <span>Modèle d'import</span>
        </button>
        <button mat-menu-item (click)="fileInput.click()">
          <mat-icon fontSet="material-symbols-outlined">upload_file</mat-icon>
          <span>Importer des notes</span>
        </button>
        <button mat-menu-item [disabled]="!classId()" (click)="exportExcel()">
          <mat-icon fontSet="material-symbols-outlined">file_download</mat-icon>
          <span>Exporter (filtre courant)</span>
        </button>
      </mat-menu>
      <input
        #fileInput
        type="file"
        class="hidden"
        accept=".xlsx,.xls"
        (change)="importExcel($event)"
      />
    </panga-page-header>

    <!-- Contexte -->
    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-[220px]">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-[150px]">
        <mat-label>Année scolaire</mat-label>
        <input matInput [formControl]="schoolYear" (blur)="reloadAll()" />
      </mat-form-field>
    </div>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="grade"
          title="Choisissez une classe"
          description="Sélectionnez une classe pour gérer les notes et les périodes."
        />
      </div>
    } @else {
      <!-- Périodes -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="event" title="Périodes" [count]="periods().length">
          <button mat-stroked-button class="!rounded-xl" (click)="seedPeriods()">
            <mat-icon fontSet="material-symbols-outlined">event_repeat</mat-icon> Générer
          </button>
        </panga-section-header>
        @if (periods().length === 0) {
          <p class="text-sm text-[var(--text-muted)]">
            Aucune période. Cliquez sur « Générer » pour créer les périodes de l'année.
          </p>
        } @else {
          <div class="flex flex-wrap gap-2">
            @for (p of periods(); track p.id) {
              <div
                class="flex items-center gap-2 rounded-xl border px-3 py-2"
                [class.opacity-60]="p.isLocked"
                [style.border-color]="p.isLocked ? 'var(--warning)' : 'var(--border)'"
              >
                <span class="material-symbols-outlined text-[18px] text-[var(--brand-500)]">
                  {{ p.periodType === 'exam' ? 'quiz' : 'menu_book' }}
                </span>
                <div class="leading-tight">
                  <p class="text-sm font-medium text-[var(--text)]">{{ periodLabel(p) }}</p>
                  <p class="text-[11px] text-[var(--text-muted)]">
                    {{ p.term }} · n°{{ p.periodNumber }}
                  </p>
                </div>
                <button
                  mat-icon-button
                  class="!h-8 !w-8"
                  [matTooltip]="p.isLocked ? 'Déverrouiller' : 'Verrouiller'"
                  (click)="toggleLock(p)"
                >
                  <mat-icon fontSet="material-symbols-outlined" class="!text-[18px]">
                    {{ p.isLocked ? 'lock' : 'lock_open' }}
                  </mat-icon>
                </button>
              </div>
            }
          </div>
        }
      </section>

      <!-- Onglets -->
      <div
        class="flex gap-1 mb-4 p-1 rounded-xl bg-[var(--background)] w-fit border border-[var(--border)]"
      >
        @for (t of tabs; track t.key) {
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-surface]="tab() === t.key"
            [style.background]="tab() === t.key ? 'var(--surface)' : 'transparent'"
            [style.color]="tab() === t.key ? 'var(--text)' : 'var(--text-muted)'"
            (click)="tab.set(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('entry') {
          <!-- Saisie en lot -->
          <section class="panga-card p-5">
            <panga-section-header icon="playlist_add" title="Saisie des notes par cours" />
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <mat-form-field appearance="outline">
                <mat-label>Cours</mat-label>
                <mat-select [formControl]="bulkSlot">
                  @for (c of courses(); track c.slotId) {
                    <mat-option [value]="c.slotId">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Période</mat-label>
                <mat-select [formControl]="bulkPeriod">
                  @for (p of periods(); track p.id) {
                    <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Note maximale</mat-label>
                <input
                  matInput
                  type="number"
                  [formControl]="bulkMaxScore"
                  min="1"
                  placeholder="auto (barème)"
                />
              </mat-form-field>
              @if (selectedBulkPeriod()?.periodType === 'exam') {
                <mat-form-field appearance="outline">
                  <mat-label>Type d'examen</mat-label>
                  <mat-select [formControl]="bulkExamType">
                    @for (o of examTypes; track o.value) {
                      <mat-option [value]="o.value">{{ o.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              <mat-form-field appearance="outline">
                <mat-label>Intitulé de l'évaluation</mat-label>
                <input matInput [formControl]="bulkExamName" placeholder="ex. Interrogation 1" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Date de l'évaluation</mat-label>
                <input matInput type="date" [formControl]="bulkExamDate" />
              </mat-form-field>
            </div>

            @if (selectedBulkPeriod()?.isLocked) {
              <p class="text-sm text-[var(--warning)] mb-3 flex items-center gap-1">
                <mat-icon fontSet="material-symbols-outlined" class="!text-[18px]">lock</mat-icon>
                Période verrouillée : saisie impossible.
              </p>
            }

            @if (classStudents().length === 0) {
              <panga-empty-state
                icon="group"
                title="Aucun élève"
                description="Cette classe n'a pas d'élèves inscrits."
              />
            } @else {
              <div class="divide-y divide-[var(--border)] -mx-5 mb-4">
                @for (s of classStudents(); track s.id) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <panga-avatar [name]="studentName(s)" [size]="34" />
                    <span class="flex-1 min-w-0 text-sm text-[var(--text)] truncate">{{
                      studentName(s)
                    }}</span>
                    <input
                      type="number"
                      class="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-right text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-400)] disabled:opacity-50"
                      [value]="scores()[s.id] || ''"
                      (input)="setScore(s.id, $event)"
                      [disabled]="!!selectedBulkPeriod()?.isLocked"
                      min="0"
                      [max]="bulkMaxScore.value || 20"
                      placeholder="—"
                    />
                  </div>
                }
              </div>
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-[var(--text-muted)]">
                  {{ filledCount() }} / {{ classStudents().length }} note(s) saisie(s)
                </p>
                <button
                  mat-flat-button
                  class="!rounded-xl"
                  [disabled]="!canSubmitBulk() || savingBulk()"
                  (click)="submitBulk()"
                >
                  <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
                  Enregistrer {{ filledCount() }} note(s)
                </button>
              </div>
            }
          </section>
        }

        @case ('list') {
          <!-- Filtres + liste -->
          <section class="panga-card p-5">
            <panga-section-header
              icon="grade"
              title="Notes saisies"
              [count]="gradesMeta()?.total ?? grades().length"
            >
              <mat-form-field
                appearance="outline"
                class="w-[180px] !mb-[-1.25rem]"
                subscriptSizing="dynamic"
              >
                <mat-label>Cours</mat-label>
                <mat-select [formControl]="filterSlot" (selectionChange)="reloadGrades()">
                  <mat-option [value]="''">Tous</mat-option>
                  @for (c of courses(); track c.slotId) {
                    <mat-option [value]="c.slotId">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field
                appearance="outline"
                class="w-[150px] !mb-[-1.25rem]"
                subscriptSizing="dynamic"
              >
                <mat-label>Période</mat-label>
                <mat-select [formControl]="filterTerm" (selectionChange)="reloadGrades()">
                  <mat-option [value]="''">Toutes</mat-option>
                  @for (o of terms; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </panga-section-header>

            @if (editing(); as g) {
              <div
                class="rounded-2xl border border-[var(--brand-300)] bg-[var(--brand-50)] p-4 mb-4"
              >
                <p class="text-sm font-medium text-[var(--text)] mb-3">
                  Modifier la note — {{ gradeStudent(g) }} · {{ courseLabel(g) }}
                </p>
                <div class="grid gap-3 sm:grid-cols-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Note</mat-label>
                    <input matInput type="number" [formControl]="editScore" min="0" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="sm:col-span-2">
                    <mat-label>Commentaire enseignant</mat-label>
                    <input matInput [formControl]="editComment" />
                  </mat-form-field>
                </div>
                <div class="flex justify-end gap-2">
                  <button mat-button (click)="editing.set(null)">Annuler</button>
                  <button
                    mat-flat-button
                    class="!rounded-xl"
                    [disabled]="savingEdit()"
                    (click)="saveEdit()"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            }

            @if (loadingGrades()) {
              <p class="text-sm text-[var(--text-muted)] py-6 text-center">Chargement…</p>
            } @else if (grades().length === 0) {
              <panga-empty-state
                icon="grade"
                title="Aucune note"
                description="Aucune note pour ce filtre."
              />
            } @else {
              <div class="divide-y divide-[var(--border)] -mx-5">
                @for (g of grades(); track g.id) {
                  <div class="flex items-center gap-4 px-5 py-3">
                    <panga-avatar [name]="gradeStudent(g)" [size]="36" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-[var(--text)] truncate">
                        {{ gradeStudent(g) }}
                      </p>
                      <p class="text-xs text-[var(--text-muted)] truncate">
                        {{ courseLabel(g) }}
                        @if (g.term) {
                          · {{ termLabel(g.term) }}
                        }
                        @if (g.examName) {
                          · {{ g.examName }}
                        }
                      </p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-base font-semibold text-[var(--text)]">{{
                        num(g.score)
                      }}</span>
                      <span class="text-xs text-[var(--text-muted)]"
                        >/{{ num(g.maxScore) || 20 }}</span
                      >
                    </div>
                    @if (g.isExamGrade) {
                      <panga-status-badge label="Examen" tone="warning" [dot]="false" />
                    }
                    <panga-status-badge
                      [label]="statusLabel(g.status)"
                      [tone]="statusTone(g.status)"
                      [dot]="false"
                    />
                    <button mat-icon-button [matMenuTriggerFor]="rowMenu" aria-label="Actions">
                      <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
                    </button>
                    <mat-menu #rowMenu="matMenu" class="panga-menu">
                      <button mat-menu-item (click)="startEdit(g)">
                        <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                        <span>Modifier</span>
                      </button>
                      <button mat-menu-item (click)="deleteGrade(g)">
                        <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                        <span>Supprimer</span>
                      </button>
                    </mat-menu>
                  </div>
                }
              </div>
              @if (gradesMeta(); as m) {
                <panga-paginator [meta]="m" (pageChange)="goPage($event)" />
              }
            }
          </section>
        }

        @case ('averages') {
          <section class="panga-card p-5">
            <panga-section-header icon="leaderboard" title="Moyennes & proclamation">
              <button
                mat-flat-button
                class="!rounded-xl"
                [disabled]="loadingAverages()"
                (click)="loadProclamation(true)"
              >
                <mat-icon fontSet="material-symbols-outlined">calculate</mat-icon> Calculer
              </button>
            </panga-section-header>

            @if (loadingAverages()) {
              <p class="text-sm text-[var(--text-muted)] py-6 text-center">Calcul en cours…</p>
            } @else if (!proclamation()) {
              <panga-empty-state
                icon="leaderboard"
                title="Pas encore de classement"
                description="Cliquez sur « Calculer » pour générer le classement et les tranches."
              />
            } @else {
              <div class="grid gap-4 sm:grid-cols-3 mb-5">
                <div class="rounded-2xl border border-[var(--border)] p-4">
                  <p class="text-xs text-[var(--text-muted)]">Réussite &gt; 75 %</p>
                  <p class="text-2xl font-semibold text-[var(--success)]">
                    {{ tranche75().length }}
                  </p>
                </div>
                <div class="rounded-2xl border border-[var(--border)] p-4">
                  <p class="text-xs text-[var(--text-muted)]">Entre 50 % et 75 %</p>
                  <p class="text-2xl font-semibold text-[var(--brand-700)]">
                    {{ tranche50().length }}
                  </p>
                </div>
                <div class="rounded-2xl border border-[var(--border)] p-4">
                  <p class="text-xs text-[var(--text-muted)]">En échec &lt; 50 %</p>
                  <p class="text-2xl font-semibold text-[var(--danger)]">
                    {{ trancheLow().length }}
                  </p>
                </div>
              </div>

              <div class="divide-y divide-[var(--border)] -mx-5">
                @for (r of ranking(); track r.studentId || $index; let i = $index) {
                  <div class="flex items-center gap-4 px-5 py-2.5">
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                      [style.background]="rankBg(i)"
                      [style.color]="rankFg(i)"
                    >
                      {{ r.rank || i + 1 }}
                    </span>
                    <panga-avatar [name]="r.studentName || '?'" [size]="32" />
                    <span class="flex-1 min-w-0 text-sm text-[var(--text)] truncate">
                      {{ r.studentName || r.studentId || '—' }}
                    </span>
                    <span class="text-sm font-semibold" [style.color]="avgColor(r.overallAverage)">
                      {{ pct(r.overallAverage) }}%
                    </span>
                  </div>
                }
              </div>
            }
          </section>
        }
      }
    }
  `,
})
export class GradesList {
  private readonly gradesApi = inject(GradesService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly terms = TERM_OPTIONS;
  protected readonly examTypes = EXAM_TYPE_OPTIONS;
  protected readonly tabs = [
    { key: 'entry' as const, label: 'Saisie' },
    { key: 'list' as const, label: 'Notes' },
    { key: 'averages' as const, label: 'Moyennes' },
  ];

  protected readonly schoolYear = new FormControl(this.sy.selected(), { nonNullable: true });
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly tab = signal<'entry' | 'list' | 'averages'>('entry');

  private readonly allStudents = signal<Student[]>([]);
  protected readonly courses = signal<CourseRef[]>([]);
  protected readonly periods = signal<Period[]>([]);

  protected readonly classStudents = computed(() => {
    const id = this.classId();
    const filtered = this.allStudents().filter((s) => s.classInstanceId === id);
    return filtered.length ? filtered : this.allStudents();
  });

  /* -------------------------------- Saisie --------------------------------- */
  protected readonly bulkSlot = new FormControl('', { nonNullable: true });
  protected readonly bulkPeriod = new FormControl('', { nonNullable: true });
  protected readonly bulkMaxScore = new FormControl<number | null>(null);
  protected readonly bulkExamType = new FormControl('final', { nonNullable: true });
  protected readonly bulkExamName = new FormControl('', { nonNullable: true });
  protected readonly bulkExamDate = new FormControl('', { nonNullable: true });
  protected readonly scores = signal<Record<string, string>>({});
  protected readonly savingBulk = signal(false);
  private readonly bulkPeriodId = signal('');

  protected readonly selectedBulkPeriod = computed(() =>
    this.periods().find((p) => p.id === this.bulkPeriodId()),
  );
  protected readonly filledCount = computed(
    () =>
      Object.values(this.scores()).filter((v) => v !== '' && Number.isFinite(parseFloat(v))).length,
  );
  protected readonly canSubmitBulk = computed(
    () =>
      !!this.bulkSlot.value &&
      !!this.bulkPeriodId() &&
      !this.selectedBulkPeriod()?.isLocked &&
      this.filledCount() > 0,
  );

  /* --------------------------------- Liste --------------------------------- */
  protected readonly filterSlot = new FormControl('', { nonNullable: true });
  protected readonly filterTerm = new FormControl('', { nonNullable: true });
  protected readonly grades = signal<Grade[]>([]);
  protected readonly gradesMeta = signal<PaginationMeta | null>(null);
  protected readonly loadingGrades = signal(false);
  private page = 1;

  protected readonly editing = signal<Grade | null>(null);
  protected readonly editScore = new FormControl<number | null>(null);
  protected readonly editComment = new FormControl('', { nonNullable: true });
  protected readonly savingEdit = signal(false);

  /* ------------------------------- Moyennes -------------------------------- */
  protected readonly proclamation = signal<ProclamationResult | null>(null);
  protected readonly loadingAverages = signal(false);

  protected readonly ranking = computed<ProclamationRow[]>(() => {
    const p = this.proclamation();
    return p ? [...p.rows].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)) : [];
  });
  protected readonly tranche75 = computed(() =>
    this.ranking().filter((r) => this.pct(r.overallAverage) > 75),
  );
  protected readonly tranche50 = computed(() =>
    this.ranking().filter((r) => {
      const v = this.pct(r.overallAverage);
      return v >= 50 && v <= 75;
    }),
  );
  protected readonly trancheLow = computed(() =>
    this.ranking().filter((r) => this.pct(r.overallAverage) < 50),
  );

  constructor() {
    this.classesApi
      .list(this.schoolYear.value)
      .subscribe({ next: (r) => this.classes.set(r.items) });
    this.bulkPeriod.valueChanges.subscribe((v) => this.bulkPeriodId.set(v ?? ''));
  }

  /* ------------------------------- Sélection ------------------------------- */

  selectClass(id: string): void {
    this.classId.set(id);
    this.resetEntry();
    this.proclamation.set(null);
    forkJoin({
      students: this.studentsApi
        .list({ page: 1, limit: 200, schoolYear: this.schoolYear.value })
        .pipe(catchError(() => of({ items: [] }))),
      courses: this.subjectsApi
        .classSubjects({ classId: id, schoolYear: this.schoolYear.value })
        .pipe(catchError(() => of({ items: [] }))),
      periods: this.gradesApi.periods(id, this.schoolYear.value).pipe(catchError(() => of([]))),
    }).subscribe((r) => {
      this.allStudents.set(r.students.items);
      this.courses.set(toCourses(r.courses.items));
      this.periods.set(r.periods);
      this.reloadGrades();
    });
  }

  reloadAll(): void {
    if (this.classId()) {
      this.selectClass(this.classId());
    } else {
      this.classesApi
        .list(this.schoolYear.value)
        .subscribe({ next: (r) => this.classes.set(r.items) });
    }
  }

  /* ------------------------------- Périodes -------------------------------- */

  seedPeriods(): void {
    this.gradesApi.seedPeriods(this.schoolYear.value).subscribe({
      next: () => {
        this.notify.success('Périodes générées.');
        this.gradesApi
          .periods(this.classId(), this.schoolYear.value)
          .subscribe({ next: (p) => this.periods.set(p) });
      },
    });
  }

  toggleLock(p: Period): void {
    this.gradesApi.updatePeriod(p.id, { isLocked: !p.isLocked }).subscribe({
      next: () => {
        this.notify.success(p.isLocked ? 'Période déverrouillée.' : 'Période verrouillée.');
        this.periods.update((list) =>
          list.map((x) => (x.id === p.id ? { ...x, isLocked: !p.isLocked } : x)),
        );
      },
    });
  }

  /* -------------------------------- Saisie --------------------------------- */

  setScore(studentId: string, ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.scores.update((m) => ({ ...m, [studentId]: value }));
  }

  submitBulk(): void {
    const slotId = this.bulkSlot.value;
    const period = this.selectedBulkPeriod();
    if (!slotId || !period || this.savingBulk()) {
      return;
    }
    if (period.isLocked) {
      this.notify.error('Période verrouillée : saisie impossible.');
      return;
    }
    const map = this.scores();
    const rows = this.classStudents()
      .map((s) => ({ studentId: s.id, score: parseFloat(map[s.id]) }))
      .filter((r) => Number.isFinite(r.score));
    if (!rows.length) {
      this.notify.warning('Aucune note saisie.');
      return;
    }
    const isExam = period.periodType === 'exam';
    const dto: BulkCreateGradesDto = {
      classId: this.classId(),
      nationalProgramSlotId: slotId,
      schoolYear: this.schoolYear.value,
      term: period.term ?? 'TERM1',
      rows,
      periodId: period.id,
      isPeriodGrade: !isExam,
      isExamGrade: isExam,
    };
    if (period.periodNumber) dto.periodNumber = period.periodNumber;
    if (this.bulkMaxScore.value) dto.maxScore = Number(this.bulkMaxScore.value);
    if (isExam) dto.examType = this.bulkExamType.value || 'final';
    if (this.bulkExamName.value) dto.examName = this.bulkExamName.value;
    if (this.bulkExamDate.value) dto.examDate = this.bulkExamDate.value;

    this.savingBulk.set(true);
    this.gradesApi.createBulk(dto).subscribe({
      next: () => {
        this.savingBulk.set(false);
        this.notify.success(`${rows.length} note(s) enregistrée(s).`);
        this.scores.set({});
        this.bulkExamName.reset('');
        this.reloadGrades();
        this.tab.set('list');
      },
      error: () => this.savingBulk.set(false),
    });
  }

  private resetEntry(): void {
    this.bulkSlot.reset('');
    this.bulkPeriod.reset('');
    this.bulkMaxScore.reset(null);
    this.bulkExamName.reset('');
    this.bulkExamDate.reset('');
    this.scores.set({});
  }

  /* --------------------------------- Liste --------------------------------- */

  reloadGrades(): void {
    this.page = 1;
    this.loadGrades();
  }

  private loadGrades(): void {
    this.loadingGrades.set(true);
    this.gradesApi
      .list({
        classId: this.classId(),
        schoolYear: this.schoolYear.value,
        nationalProgramSlotId: this.filterSlot.value || undefined,
        term: this.filterTerm.value || undefined,
        page: this.page,
        limit: 20,
      })
      .subscribe({
        next: (r) => {
          this.grades.set(r.items);
          this.gradesMeta.set(r.pagination ?? null);
          this.loadingGrades.set(false);
        },
        error: () => {
          this.grades.set([]);
          this.gradesMeta.set(null);
          this.loadingGrades.set(false);
        },
      });
  }

  goPage(page: number): void {
    this.page = page;
    this.loadGrades();
  }

  startEdit(g: Grade): void {
    this.editing.set(g);
    this.editScore.setValue(this.num(g.score));
    this.editComment.setValue(g.teacherComment ?? '');
  }

  saveEdit(): void {
    const g = this.editing();
    if (!g || this.savingEdit()) {
      return;
    }
    const payload: Record<string, unknown> = {};
    if (this.editScore.value !== null) payload['score'] = Number(this.editScore.value);
    if (this.editComment.value) payload['teacherComment'] = this.editComment.value;
    this.savingEdit.set(true);
    this.gradesApi.update(g.id, payload).subscribe({
      next: () => {
        this.savingEdit.set(false);
        this.editing.set(null);
        this.notify.success('Note mise à jour.');
        this.loadGrades();
      },
      error: () => this.savingEdit.set(false),
    });
  }

  deleteGrade(g: Grade): void {
    this.gradesApi.remove(g.id).subscribe({
      next: () => {
        this.notify.success('Note supprimée.');
        this.loadGrades();
      },
    });
  }

  /* ------------------------------- Moyennes -------------------------------- */

  loadProclamation(recompute = false): void {
    if (!this.classId()) {
      return;
    }
    this.loadingAverages.set(true);
    const run = () =>
      this.gradesApi.proclamation(this.classId(), this.schoolYear.value).subscribe({
        next: (r) => {
          this.proclamation.set(normalizeProclamation(r));
          this.loadingAverages.set(false);
        },
        error: () => {
          this.proclamation.set({ rows: [], above75: [], between50And75: [], below50: [] });
          this.loadingAverages.set(false);
        },
      });
    if (recompute) {
      this.gradesApi.computeClassAverages(this.classId(), this.schoolYear.value).subscribe({
        next: () => run(),
        error: () => run(),
      });
    } else {
      run();
    }
  }

  /* -------------------------------- Helpers -------------------------------- */

  protected num(v: unknown): number {
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  protected pct(v: unknown): number {
    return Math.round(this.num(v));
  }
  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected gradeStudent(g: Grade): string {
    const s = (g.student ?? {}) as Record<string, unknown>;
    return (
      `${(s['firstName'] as string) ?? ''} ${(s['lastName'] as string) ?? ''}`.trim() ||
      (s['fullName'] as string) ||
      g.studentId ||
      '—'
    );
  }
  protected courseLabel(g: Grade): string {
    return g.nationalProgramSlot?.labelFr ?? g.nationalProgramSlot?.programCode ?? 'Cours';
  }
  protected periodLabel(p: Period): string {
    const isExam = p.periodType === 'exam';
    return `${this.termLabel(p.term)}${isExam ? ' — Examen' : ' — P' + (p.periodNumber ?? '')}`;
  }
  protected termLabel(t: string | undefined): string {
    return labelOf(TERM_OPTIONS, t);
  }
  protected statusLabel(s: string | undefined): string {
    return labelOf(GRADE_STATUS_OPTIONS, s ?? 'draft');
  }
  protected statusTone(s: string | undefined): BadgeTone {
    return STATUS_TONE[s ?? 'draft'] ?? 'neutral';
  }
  protected avgColor(v: unknown): string {
    const p = this.pct(v);
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-700)' : 'var(--danger)';
  }
  protected rankBg(i: number): string {
    return i < 3
      ? 'var(--brand-gradient)'
      : 'color-mix(in srgb, var(--text-muted) 12%, transparent)';
  }
  protected rankFg(i: number): string {
    return i < 3 ? '#fff' : 'var(--text-muted)';
  }

  /* --------------------------------- Excel --------------------------------- */

  downloadTemplate(): void {
    this.gradesApi.downloadTemplate().subscribe({
      next: (b) => downloadBlob(b, 'modele_notes.xlsx'),
    });
  }

  exportExcel(): void {
    this.gradesApi
      .exportExcel({
        classId: this.classId(),
        schoolYear: this.schoolYear.value,
        nationalProgramSlotId: this.filterSlot.value || undefined,
        term: this.filterTerm.value || undefined,
      })
      .subscribe({ next: (b) => downloadBlob(b, 'notes.xlsx') });
  }

  importExcel(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.gradesApi.importExcel(file, this.schoolYear.value).subscribe({
      next: (res) => {
        const ok = (res['success'] as number) ?? 0;
        this.notify.success(`Import terminé (${ok} note(s)).`);
        this.reloadGrades();
      },
      complete: () => (input.value = ''),
    });
  }
}

/* -------------------------------------------------------------------------- */

function toCourses(subjects: ClassSubject[]): CourseRef[] {
  return subjects
    .map((cs) => ({
      slotId: cs.nationalProgramSlotId ?? '',
      label: cs.nationalProgramSlot?.labelFr ?? cs.nationalProgramSlot?.programCode ?? 'Cours',
    }))
    .filter((c) => c.slotId);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Normalise la réponse proclamation (rows + tranches), formes variables. */
function normalizeProclamation(data: unknown): ProclamationResult {
  const o = (data ?? {}) as Record<string, unknown>;
  const rowsRaw = (o['rows'] ?? o['ranking'] ?? o['students'] ?? o['results'] ?? o['data']) as
    | unknown[]
    | undefined;
  const rows = (Array.isArray(rowsRaw) ? rowsRaw : []).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const s = (r['student'] ?? {}) as Record<string, unknown>;
    const name =
      (r['studentName'] as string) ||
      `${(s['firstName'] as string) ?? ''} ${(s['lastName'] as string) ?? ''}`.trim() ||
      (s['fullName'] as string) ||
      '';
    const avg =
      r['overallAverage'] ?? r['average'] ?? r['generalAverage'] ?? r['overallAveragePercent'];
    return {
      studentId: (r['studentId'] as string) ?? (s['id'] as string),
      studentName: name,
      rank: r['rank'] as number | undefined,
      overallAverage: typeof avg === 'string' ? parseFloat(avg) : (avg as number),
      ...r,
    } as ProclamationRow;
  });
  return {
    rows,
    above75: (o['above75'] as ProclamationRow[]) ?? [],
    between50And75: (o['between50And75'] as ProclamationRow[]) ?? [],
    below50: (o['below50'] as ProclamationRow[]) ?? [],
  };
}
