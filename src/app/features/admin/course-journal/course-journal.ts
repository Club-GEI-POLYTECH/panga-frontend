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
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../../core/auth/auth.store';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import { AcademicsService } from '../services/academics.service';
import { ClassesService } from '../services/classes.service';
import { CourseJournalService } from '../services/course-journal.service';
import { ParentsService } from '../services/parents.service';
import { SubjectsService } from '../services/subjects.service';
import { CurriculumService } from '../../super-admin/services/curriculum.service';
import type { ClassInstance, Period } from '../models/admin.models';
import type { NationalProgram } from '../../super-admin/models/platform.models';
import type { ClassSubject, CourseOverviewRow, LessonLogEntry } from '../models/course.models';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

interface ChildRef {
  studentId: string;
  name: string;
}

/** Journal de cours (cahier de texte) : progression, séances, heures prévues. */
@Component({
  selector: 'panga-course-journal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    EmptyState,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="auto_stories"
      title="Journal de cours"
      subtitle="Cahier de texte & avancement des programmes"
    />

    <!-- Filtres -->
    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="w-[150px]">
        <mat-label>Année scolaire</mat-label>
        <input matInput [formControl]="schoolYear" placeholder="Année en cours" (blur)="reload()" />
      </mat-form-field>

      @if (isParent()) {
        <mat-form-field appearance="outline" class="flex-1 min-w-[220px]">
          <mat-label>Enfant</mat-label>
          <mat-select [value]="studentId()" (selectionChange)="selectStudent($event.value)">
            @for (c of children(); track c.studentId) {
              <mat-option [value]="c.studentId">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      } @else {
        <mat-form-field appearance="outline" class="flex-1 min-w-[220px]">
          <mat-label>Classe</mat-label>
          <mat-select [value]="classInstanceId()" (selectionChange)="selectClass($event.value)">
            @for (c of classes(); track c.id) {
              <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (periods().length) {
        <mat-form-field appearance="outline" class="min-w-[180px]">
          <mat-label>Période</mat-label>
          <mat-select [value]="periodId()" (selectionChange)="selectPeriod($event.value)">
            <mat-option [value]="''">Toutes les périodes</mat-option>
            @for (p of periods(); track p.id) {
              <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </div>

    @if (!hasContext()) {
      <div class="panga-card">
        <panga-empty-state
          icon="auto_stories"
          [title]="isParent() ? 'Choisissez un enfant' : 'Choisissez une classe'"
          description="Sélectionnez un contexte pour afficher l'avancement et les séances."
        />
      </div>
    } @else {
      <!-- Programme de la classe (admin) -->
      @if (isAdmin() && classInstanceId()) {
        <section class="panga-card p-5 mb-6">
          <panga-section-header icon="menu_book" title="Programme national de la classe" />
          <div class="flex flex-wrap items-end gap-3">
            <mat-form-field appearance="outline" class="flex-1 min-w-[260px]">
              <mat-label>Programme publié</mat-label>
              <mat-select [formControl]="programCtrl">
                @for (p of programs(); track p.id) {
                  <mat-option [value]="p.id">
                    {{ p.title || p.code }}
                    @if (p['activeForSchool']) {
                      — actif
                    }
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button
              mat-stroked-button
              class="!rounded-xl"
              [disabled]="!programCtrl.value || busyProgram()"
              (click)="activateProgram()"
              matTooltip="Activer ce programme pour l'école"
            >
              <mat-icon fontSet="material-symbols-outlined">check_circle</mat-icon> Activer (école)
            </button>
            <button
              mat-flat-button
              class="!rounded-xl"
              [disabled]="!programCtrl.value || busyProgram()"
              (click)="assignProgram()"
              matTooltip="Lier le programme à cette classe (instance)"
            >
              <mat-icon fontSet="material-symbols-outlined">link</mat-icon> Assigner à la classe
            </button>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-2">
            Le programme doit être <b>publié</b> puis <b>activé pour l'école</b> avant d'être
            assigné à la classe. L'assignation sur l'instance est prioritaire sur le modèle.
          </p>
        </section>
      }

      <!-- Avancement -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="trending_up"
          title="Avancement par cours"
          [count]="overview().length"
        >
          @if (totalPlanned() > 0) {
            <panga-status-badge
              [label]="globalRatioPct() + '% réalisé'"
              [tone]="
                globalRatioPct() >= 80 ? 'success' : globalRatioPct() >= 40 ? 'brand' : 'warning'
              "
              [dot]="false"
            />
          }
        </panga-section-header>

        @if (loadingOverview()) {
          <p class="text-sm text-[var(--text-muted)] py-6 text-center">Chargement…</p>
        } @else if (overview().length === 0) {
          <panga-empty-state
            icon="trending_up"
            title="Aucun avancement"
            description="Définissez des heures prévues et enregistrez des séances pour voir la progression."
          />
        } @else {
          <div class="grid gap-4 sm:grid-cols-3 mb-5">
            <div class="rounded-2xl border border-[var(--border)] p-4">
              <p class="text-xs text-[var(--text-muted)]">Heures prévues</p>
              <p class="text-2xl font-semibold text-[var(--text)]">{{ totalPlanned() }}</p>
            </div>
            <div class="rounded-2xl border border-[var(--border)] p-4">
              <p class="text-xs text-[var(--text-muted)]">Heures réalisées</p>
              <p class="text-2xl font-semibold text-[var(--brand-700)]">{{ totalDelivered() }}</p>
            </div>
            <div class="rounded-2xl border border-[var(--border)] p-4">
              <p class="text-xs text-[var(--text-muted)]">Heures restantes</p>
              <p class="text-2xl font-semibold text-[var(--text)]">{{ totalRemaining() }}</p>
            </div>
          </div>

          <div class="space-y-4">
            @for (row of overview(); track row.classSubjectId) {
              <div class="rounded-2xl border border-[var(--border)] p-4">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <p class="font-medium text-[var(--text)] truncate">{{ row.subjectLabel }}</p>
                    @if (row.teacherName) {
                      <p class="text-xs text-[var(--text-muted)] truncate">{{ row.teacherName }}</p>
                    }
                  </div>
                  <span class="text-sm font-semibold text-[var(--text)] shrink-0">
                    {{ pct(row.completionRatio) }}%
                  </span>
                </div>
                <div class="h-2.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    [style.width.%]="pct(row.completionRatio)"
                    [style.background]="
                      pct(row.completionRatio) >= 80
                        ? 'var(--success)'
                        : pct(row.completionRatio) >= 40
                          ? 'var(--brand-gradient)'
                          : 'var(--warning)'
                    "
                  ></div>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[var(--text-muted)]">
                  <span
                    >Prévu : <b class="text-[var(--text)]">{{ row.plannedHours }}h</b></span
                  >
                  <span
                    >Réalisé : <b class="text-[var(--text)]">{{ row.deliveredHours }}h</b></span
                  >
                  <span
                    >Restant : <b class="text-[var(--text)]">{{ row.remainingHours }}h</b></span
                  >
                  @if (row.entriesCount !== undefined) {
                    <span>{{ row.entriesCount }} séance(s)</span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- Heures prévues (admin) -->
      @if (isAdmin() && classInstanceId()) {
        <section class="panga-card p-5 mb-6">
          <panga-section-header icon="schedule" title="Définir les heures prévues" />
          <form
            [formGroup]="targetForm"
            (ngSubmit)="saveTarget()"
            class="flex flex-wrap items-end gap-3"
          >
            <mat-form-field appearance="outline" class="flex-1 min-w-[220px]">
              <mat-label>Cours</mat-label>
              <mat-select formControlName="classSubjectId">
                @for (cs of subjects(); track cs.id) {
                  <mat-option [value]="cs.id">{{ subjectLabel(cs) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="min-w-[180px]">
              <mat-label>Période</mat-label>
              <mat-select formControlName="periodId">
                @for (p of periods(); track p.id) {
                  <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-[140px]">
              <mat-label>Heures prévues</mat-label>
              <input matInput type="number" formControlName="plannedHours" min="0" />
            </mat-form-field>
            <button
              mat-flat-button
              class="!rounded-xl"
              type="submit"
              [disabled]="targetForm.invalid || savingTarget()"
            >
              Enregistrer
            </button>
          </form>
          @if (subjects().length === 0) {
            <p class="text-sm text-[var(--warning)] mt-3">
              Aucun cours ouvert sur cette classe. Assignez un programme puis ouvrez les cours
              (matières).
            </p>
          }
        </section>
      }

      <!-- Séances -->
      <section class="panga-card p-5">
        <panga-section-header
          icon="event_note"
          title="Séances enregistrées"
          [count]="entriesMeta()?.total ?? entries().length"
        >
          @if (canEdit() && classInstanceId()) {
            <button mat-flat-button class="!rounded-xl" (click)="toggleForm()">
              <mat-icon fontSet="material-symbols-outlined">{{
                showForm() ? 'close' : 'add'
              }}</mat-icon>
              {{ showForm() ? 'Annuler' : 'Nouvelle séance' }}
            </button>
          }
        </panga-section-header>

        @if (showForm() && canEdit()) {
          <form [formGroup]="entryForm" (ngSubmit)="submitEntry()" class="mb-6">
            <div class="grid gap-4 sm:grid-cols-2">
              <mat-form-field appearance="outline">
                <mat-label>Cours</mat-label>
                <mat-select formControlName="classSubjectId">
                  @for (cs of subjects(); track cs.id) {
                    <mat-option [value]="cs.id">{{ subjectLabel(cs) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Période</mat-label>
                <mat-select formControlName="periodId">
                  @for (p of periods(); track p.id) {
                    <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Date de la séance</mat-label>
                <input matInput type="date" formControlName="lessonDate" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Durée (heures)</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="durationHours"
                  min="0.25"
                  step="0.25"
                />
              </mat-form-field>
              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Titre / objet de la séance</mat-label>
                <input matInput formControlName="title" maxlength="255" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Contenu / résumé</mat-label>
                <textarea matInput rows="2" formControlName="summary"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Devoirs</mat-label>
                <textarea matInput rows="2" formControlName="homework"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Compétences travaillées</mat-label>
                <textarea matInput rows="2" formControlName="skillsCovered"></textarea>
              </mat-form-field>
            </div>
            <div class="flex justify-end gap-2">
              <button
                mat-flat-button
                class="!rounded-xl"
                type="submit"
                [disabled]="entryForm.invalid || savingEntry()"
              >
                {{ editingId() ? 'Mettre à jour' : 'Enregistrer la séance' }}
              </button>
            </div>
          </form>
        }

        @if (loadingEntries()) {
          <p class="text-sm text-[var(--text-muted)] py-6 text-center">Chargement…</p>
        } @else if (entries().length === 0) {
          <panga-empty-state
            icon="event_note"
            title="Aucune séance"
            description="Aucune séance enregistrée pour ce contexte."
          />
        } @else {
          <div class="divide-y divide-[var(--border)] -mx-5">
            @for (e of entries(); track e.id) {
              <div class="px-5 py-3 flex items-start gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style="background: var(--brand-gradient)"
                >
                  <span class="material-symbols-outlined text-[20px]">event_note</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-medium text-[var(--text)] truncate">
                      {{ e.title || '—' }}
                    </p>
                    <panga-status-badge
                      [label]="(e.durationHours || 0) + 'h'"
                      tone="brand"
                      [dot]="false"
                    />
                  </div>
                  <p class="text-xs text-[var(--text-muted)] mt-0.5">
                    {{ e.lessonDate || '—' }}
                    @if (e.subjectLabel) {
                      · {{ e.subjectLabel }}
                    }
                  </p>
                  @if (e.summary) {
                    <p class="text-sm text-[var(--text)] mt-1 line-clamp-2">{{ e.summary }}</p>
                  }
                  @if (e.homework) {
                    <p class="text-xs text-[var(--text-muted)] mt-1">
                      <b>Devoirs :</b> {{ e.homework }}
                    </p>
                  }
                </div>
                @if (canEdit()) {
                  <button mat-icon-button [matMenuTriggerFor]="entryMenu" aria-label="Actions">
                    <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
                  </button>
                  <mat-menu #entryMenu="matMenu" class="panga-menu">
                    <button mat-menu-item (click)="editEntry(e)">
                      <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                      <span>Modifier</span>
                    </button>
                    <button mat-menu-item (click)="deleteEntry(e)">
                      <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                      <span>Supprimer</span>
                    </button>
                  </mat-menu>
                }
              </div>
            }
          </div>
          @if (entriesMeta(); as m) {
            <panga-paginator [meta]="m" (pageChange)="goPage($event)" />
          }
        }
      </section>
    }
  `,
})
export class CourseJournal {
  private readonly store = inject(AuthStore);
  private readonly classesApi = inject(ClassesService);
  private readonly academics = inject(AcademicsService);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly journal = inject(CourseJournalService);
  private readonly curriculum = inject(CurriculumService);
  private readonly parents = inject(ParentsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly role = this.store.role;
  protected readonly isAdmin = computed(
    () => this.role() === 'admin' || this.role() === 'super_admin',
  );
  protected readonly isTeacher = computed(() => this.role() === 'teacher');
  protected readonly isParent = computed(() => this.role() === 'parent');
  /** Enseignant & super_admin créent/éditent des séances (cf. backend Roles). */
  protected readonly canEdit = computed(
    () => this.role() === 'teacher' || this.role() === 'super_admin',
  );

  /** Initialisé sur le sélecteur global (vide = année en cours → GET sans année). */
  protected readonly schoolYear = new FormControl(this.sy.filter(), { nonNullable: true });

  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classInstanceId = signal('');
  protected readonly children = signal<ChildRef[]>([]);
  protected readonly studentId = signal('');
  protected readonly periods = signal<Period[]>([]);
  protected readonly periodId = signal('');
  protected readonly subjects = signal<ClassSubject[]>([]);
  protected readonly programs = signal<NationalProgram[]>([]);

  protected readonly overview = signal<CourseOverviewRow[]>([]);
  protected readonly entries = signal<LessonLogEntry[]>([]);
  protected readonly entriesMeta = signal<PaginationMeta | null>(null);

  protected readonly loadingOverview = signal(false);
  protected readonly loadingEntries = signal(false);
  protected readonly busyProgram = signal(false);
  protected readonly savingTarget = signal(false);
  protected readonly savingEntry = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  private page = 1;

  /** Libellés de cours dérivés des slots du programme actif. */
  private readonly slotLabels = signal<Record<string, string>>({});

  protected readonly programCtrl = new FormControl<string>('', { nonNullable: true });

  protected readonly targetForm = new FormGroup({
    classSubjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    periodId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    plannedHours: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

  protected readonly entryForm = new FormGroup({
    classSubjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    periodId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lessonDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    durationHours: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(24)],
    }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true }),
    homework: new FormControl('', { nonNullable: true }),
    skillsCovered: new FormControl('', { nonNullable: true }),
  });

  protected readonly hasContext = computed(() =>
    this.isParent() ? !!this.studentId() : !!this.classInstanceId(),
  );

  protected readonly totalPlanned = computed(() =>
    round(this.overview().reduce((s, r) => s + r.plannedHours, 0)),
  );
  protected readonly totalDelivered = computed(() =>
    round(this.overview().reduce((s, r) => s + r.deliveredHours, 0)),
  );
  protected readonly totalRemaining = computed(() =>
    round(this.overview().reduce((s, r) => s + r.remainingHours, 0)),
  );
  protected readonly globalRatioPct = computed(() => {
    const p = this.totalPlanned();
    return p > 0 ? Math.round((this.totalDelivered() / p) * 100) : 0;
  });

  constructor() {
    if (this.isParent()) {
      this.loadChildren();
    } else {
      this.loadPrograms();
      // Synchronise le champ année sur le sélecteur global et recharge.
      effect(() => {
        this.sy.selected();
        untracked(() => {
          this.schoolYear.setValue(this.sy.filter());
          this.classesApi.list(this.schoolYear.value).subscribe({
            next: (r) => this.classes.set(r.items),
          });
          this.reload();
        });
      });
    }
  }

  /* ------------------------------- Sélection ------------------------------- */

  selectClass(id: string): void {
    this.classInstanceId.set(id);
    this.studentId.set('');
    this.periodId.set('');
    forkJoin({
      periods: this.academics
        .periods(id, this.schoolYear.value)
        .pipe(catchError(() => of({ items: [] }))),
      subjects: this.subjectsApi
        .classSubjects({ classId: id, schoolYear: this.schoolYear.value })
        .pipe(catchError(() => of({ items: [] }))),
    }).subscribe((r) => {
      this.periods.set(r.periods.items);
      this.subjects.set(r.subjects.items);
      // Recharge une fois les cours connus pour résoudre les libellés de l'overview.
      this.reload();
    });
  }

  selectStudent(id: string): void {
    this.studentId.set(id);
    this.classInstanceId.set('');
    this.reload();
  }

  selectPeriod(id: string): void {
    this.periodId.set(id);
    this.reload();
  }

  reload(): void {
    if (!this.hasContext()) {
      return;
    }
    this.page = 1;
    this.loadOverview();
    this.loadEntries();
  }

  private baseQuery(): {
    classInstanceId?: string;
    studentId?: string;
    schoolYear: string;
    periodId?: string;
  } {
    return {
      classInstanceId: this.isParent() ? undefined : this.classInstanceId() || undefined,
      studentId: this.isParent() ? this.studentId() || undefined : undefined,
      schoolYear: this.schoolYear.value,
      periodId: this.periodId() || undefined,
    };
  }

  private loadOverview(): void {
    this.loadingOverview.set(true);
    this.journal.overview(this.baseQuery()).subscribe({
      next: (rows) => {
        this.overview.set(rows.map((r) => this.enrichRow(r)));
        this.loadingOverview.set(false);
      },
      error: () => {
        this.overview.set([]);
        this.loadingOverview.set(false);
      },
    });
  }

  private loadEntries(): void {
    this.loadingEntries.set(true);
    this.journal.entries({ ...this.baseQuery(), page: this.page, limit: 20 }).subscribe({
      next: (r) => {
        this.entries.set(r.items.map((e) => this.enrichEntry(e)));
        this.entriesMeta.set(r.pagination ?? null);
        this.loadingEntries.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.entriesMeta.set(null);
        this.loadingEntries.set(false);
      },
    });
  }

  goPage(page: number): void {
    this.page = page;
    this.loadEntries();
  }

  /* ------------------------------- Programmes ------------------------------ */

  private loadPrograms(): void {
    this.curriculum.publishedPrograms().subscribe({
      next: (r) => {
        this.programs.set(r.items);
        const active =
          r.items.find((p) => (p as Record<string, unknown>)['activeForSchool'] === true) ??
          r.items[0];
        if (active) {
          this.programCtrl.setValue(active.id);
          this.buildSlotLabels(active);
        }
      },
    });
  }

  private buildSlotLabels(program: NationalProgram): void {
    const map: Record<string, string> = {};
    for (const raw of (program.slots ?? []) as Record<string, unknown>[]) {
      const id = String(raw['id'] ?? '');
      if (id) {
        map[id] = String(raw['labelFr'] ?? raw['programCode'] ?? id);
      }
    }
    this.slotLabels.set(map);
  }

  activateProgram(): void {
    const id = this.programCtrl.value;
    if (!id || this.busyProgram()) {
      return;
    }
    this.busyProgram.set(true);
    this.curriculum.setActivation(id, true).subscribe({
      next: () => {
        this.busyProgram.set(false);
        this.notify.success("Programme activé pour l'école.");
        this.loadPrograms();
      },
      error: () => this.busyProgram.set(false),
    });
  }

  assignProgram(): void {
    const id = this.programCtrl.value;
    const instance = this.classInstanceId();
    if (!id || !instance || this.busyProgram()) {
      return;
    }
    this.busyProgram.set(true);
    this.curriculum.assignToClassInstance(instance, id).subscribe({
      next: () => {
        this.busyProgram.set(false);
        this.notify.success('Programme assigné à la classe.');
        this.selectClass(instance);
      },
      error: () => this.busyProgram.set(false),
    });
  }

  /* ----------------------------- Heures prévues ---------------------------- */

  saveTarget(): void {
    if (this.targetForm.invalid || this.savingTarget()) {
      this.targetForm.markAllAsTouched();
      return;
    }
    const v = this.targetForm.getRawValue();
    this.savingTarget.set(true);
    this.journal
      .upsertPeriodTarget({
        classSubjectId: v.classSubjectId,
        periodId: v.periodId,
        plannedHours: Number(v.plannedHours),
      })
      .subscribe({
        next: () => {
          this.savingTarget.set(false);
          this.notify.success('Heures prévues enregistrées.');
          this.loadOverview();
        },
        error: () => this.savingTarget.set(false),
      });
  }

  /* -------------------------------- Séances -------------------------------- */

  toggleForm(): void {
    this.editingId.set(null);
    this.entryForm.reset({ durationHours: 1 });
    this.showForm.update((v) => !v);
  }

  editEntry(e: LessonLogEntry): void {
    this.editingId.set(e.id);
    this.entryForm.reset({
      classSubjectId: e.classSubjectId ?? '',
      periodId: e.periodId ?? '',
      lessonDate: (e.lessonDate ?? '').slice(0, 10),
      durationHours: Number(e.durationHours ?? 1),
      title: e.title ?? '',
      summary: e.summary ?? '',
      homework: e.homework ?? '',
      skillsCovered: e.skillsCovered ?? '',
    });
    this.showForm.set(true);
  }

  submitEntry(): void {
    if (this.entryForm.invalid || this.savingEntry()) {
      this.entryForm.markAllAsTouched();
      return;
    }
    const v = this.entryForm.getRawValue();
    this.savingEntry.set(true);
    const id = this.editingId();
    if (id) {
      // PATCH : champs modifiables uniquement (pas classSubjectId/periodId).
      this.journal
        .updateEntry(id, {
          lessonDate: v.lessonDate,
          durationHours: Number(v.durationHours),
          title: v.title,
          summary: v.summary || undefined,
          homework: v.homework || undefined,
          skillsCovered: v.skillsCovered || undefined,
        })
        .subscribe({
          next: () => this.afterEntrySaved('Séance mise à jour.'),
          error: () => this.savingEntry.set(false),
        });
    } else {
      this.journal
        .createEntry({
          classSubjectId: v.classSubjectId,
          periodId: v.periodId,
          lessonDate: v.lessonDate,
          durationHours: Number(v.durationHours),
          title: v.title,
          summary: v.summary || undefined,
          homework: v.homework || undefined,
          skillsCovered: v.skillsCovered || undefined,
        })
        .subscribe({
          next: () => this.afterEntrySaved('Séance enregistrée.'),
          error: () => this.savingEntry.set(false),
        });
    }
  }

  private afterEntrySaved(msg: string): void {
    this.savingEntry.set(false);
    this.editingId.set(null);
    this.showForm.set(false);
    this.entryForm.reset({ durationHours: 1 });
    this.notify.success(msg);
    this.loadOverview();
    this.loadEntries();
  }

  deleteEntry(e: LessonLogEntry): void {
    this.journal.removeEntry(e.id).subscribe({
      next: () => {
        this.notify.success('Séance supprimée.');
        this.loadOverview();
        this.loadEntries();
      },
    });
  }

  /* -------------------------------- Helpers -------------------------------- */

  private loadChildren(): void {
    this.parents.me().subscribe({
      next: (profile) => {
        const list = extractChildren(profile);
        this.children.set(list);
        if (list.length === 1) {
          this.selectStudent(list[0].studentId);
        }
      },
    });
  }

  private enrichRow(r: CourseOverviewRow): CourseOverviewRow {
    if (r.subjectLabel && r.subjectLabel !== '—') {
      return r;
    }
    const cs = this.subjects().find(
      (s) => s.id === r.classSubjectId || s.nationalProgramSlotId === r.classSubjectId,
    );
    return { ...r, subjectLabel: cs ? this.subjectLabel(cs) : r.subjectLabel };
  }

  private enrichEntry(e: LessonLogEntry): LessonLogEntry {
    if (e.subjectLabel) {
      return e;
    }
    const cs = this.subjects().find((s) => s.id === e.classSubjectId);
    return cs ? { ...e, subjectLabel: this.subjectLabel(cs) } : e;
  }

  protected subjectLabel(cs: ClassSubject): string {
    const slotId = cs.nationalProgramSlotId ?? '';
    return (
      cs.nationalProgramSlot?.labelFr ??
      cs.nationalProgramSlot?.programCode ??
      this.slotLabels()[slotId] ??
      'Cours'
    );
  }

  protected periodLabel(p: Period): string {
    return (
      `${p.term ?? ''}${p.periodNumber ? ' — P' + p.periodNumber : ''}`.trim() || p.label || p.id
    );
  }

  protected pct(ratio: number): number {
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  }
}

/* ---------------------------------------------------------------------------- */

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Extrait les enfants liés du profil parent, quelle que soit la clé utilisée. */
function extractChildren(profile: Record<string, unknown>): ChildRef[] {
  const candidates = (profile['children'] ??
    profile['students'] ??
    profile['wards'] ??
    profile['studentParents']) as unknown[] | undefined;
  if (!Array.isArray(candidates)) {
    return [];
  }
  return candidates
    .map((raw) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      // Cas join : { student: {...} }.
      const s = (o['student'] ?? o) as Record<string, unknown>;
      const id = String(s['id'] ?? s['studentId'] ?? '');
      const name =
        `${s['firstName'] ?? ''} ${s['lastName'] ?? ''}`.trim() ||
        (s['fullName'] as string) ||
        (s['name'] as string) ||
        id;
      return { studentId: id, name };
    })
    .filter((c) => c.studentId);
}
