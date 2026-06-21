import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExamsService } from '../services/exams.service';
import { StudentsService } from '../services/students.service';
import { TeachersService } from '../services/teachers.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { Student, Teacher } from '../models/admin.models';
import type { Exam, ExamResult, ExamRoom, ExamSupervisor } from '../models/exam.models';
import {
  EXAM_STATUS_OPTIONS,
  EXAM_TYPE_OPTIONS,
  SUPERVISOR_ROLE_OPTIONS,
  examLabel,
  examStatusTone,
} from '../../../core/models/exam.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

@Component({
  selector: 'panga-exam-detail',
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
    MatSlideToggleModule,
    MatTooltipModule,
    Avatar,
    EmptyState,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <a
      [routerLink]="['/', 'exams']"
      class="inline-flex items-center gap-1 text-sm text-(--text-muted) hover:text-(--brand-700) mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="text-base! w-4! h-4!"
        >arrow_back</mat-icon
      >
      Examens
    </a>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else if (exam(); as e) {
      <div
        class="relative overflow-hidden rounded-3xl p-6 mb-5 text-white"
        style="background: var(--brand-gradient)"
      >
        <div
          class="absolute -right-8 -bottom-10 h-40 w-40 rounded-full opacity-15"
          style="background:#fff"
        ></div>
        <div class="relative flex flex-wrap items-center gap-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <span class="material-symbols-outlined text-[28px]">quiz</span>
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Urbanist, sans-serif">
              {{ e.name }}
            </h1>
            <p class="text-sm opacity-90">
              {{ courseLabel(e) }} · {{ typeLabel(e.examType) }}
              @if (e.examDate) {
                · {{ e.examDate }} {{ e.startTime }}–{{ e.endTime }}
              }
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <panga-status-badge
              [label]="statusLabel(e.status)"
              [tone]="statusTone(e.status)"
              [dot]="false"
            />
            @if (e.isResultsPublished) {
              <panga-status-badge label="Résultats publiés" tone="success" [dot]="false" />
            }
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="flex gap-1 mb-4 p-1 rounded-xl bg-(--background) w-fit border border-(--border)">
        @for (t of tabs; track t.key) {
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium"
            [style.background]="tab() === t.key ? 'var(--surface)' : 'transparent'"
            [style.color]="tab() === t.key ? 'var(--text)' : 'var(--text-muted)'"
            (click)="selectTab(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('results') {
          <section class="panga-card p-5">
            <panga-section-header icon="grading" title="Résultats" [count]="roster().length">
              <button
                mat-flat-button
                class="rounded-xl!"
                [disabled]="publishing() || e.isResultsPublished"
                (click)="publish()"
              >
                <mat-icon fontSet="material-symbols-outlined">publish</mat-icon>
                {{ e.isResultsPublished ? 'Publiés' : 'Publier les résultats' }}
              </button>
            </panga-section-header>

            @if (roster().length === 0) {
              <panga-empty-state
                icon="group"
                title="Aucun élève"
                description="Cette classe n'a pas d'élèves."
              />
            } @else {
              <p class="text-xs text-(--text-muted) mb-2">
                Note sur {{ maxScore() }}. La saisie est enregistrée à la sortie du champ.
              </p>
              <div class="divide-y divide-(--border) -mx-5">
                @for (s of roster(); track s.id) {
                  <div class="flex items-center gap-4 px-5 py-2.5">
                    <panga-avatar [name]="studentName(s)" [size]="34" />
                    <span class="flex-1 min-w-0 text-sm text-(--text) truncate">{{
                      studentName(s)
                    }}</span>
                    @if (resultFor(s.id); as r) {
                      <panga-status-badge
                        [label]="resultBadge(r)"
                        [tone]="r.isPassed ? 'success' : 'danger'"
                        [dot]="false"
                      />
                    }
                    <mat-slide-toggle
                      [checked]="presentOf(s.id)"
                      (change)="togglePresent(s.id, $event.checked)"
                      matTooltip="Présent"
                    />
                    <input
                      type="number"
                      class="w-24 rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-right text-(--text) focus:outline-none focus:ring-2 focus:ring-(--brand-400) disabled:opacity-40"
                      [value]="scoreOf(s.id)"
                      (change)="saveScore(s.id, $event)"
                      [disabled]="!presentOf(s.id) || e.isResultsPublished"
                      min="0"
                      [max]="maxScore()"
                      placeholder="—"
                    />
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('supervisors') {
          <section class="panga-card p-5">
            <panga-section-header
              icon="supervisor_account"
              title="Surveillants"
              [count]="supervisors().length"
            />
            <form
              [formGroup]="supForm"
              (ngSubmit)="addSupervisor()"
              class="flex flex-wrap items-end gap-3 mb-4"
            >
              <mat-form-field appearance="outline" class="flex-1 min-w-55">
                <mat-label>Enseignant</mat-label>
                <mat-select formControlName="teacherId">
                  @for (t of teachers(); track t.id) {
                    <mat-option [value]="t.id">{{ teacherName(t) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="min-w-40">
                <mat-label>Rôle</mat-label>
                <mat-select formControlName="role">
                  @for (o of supervisorRoles; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (rooms().length) {
                <mat-form-field appearance="outline" class="min-w-40">
                  <mat-label>Salle</mat-label>
                  <mat-select formControlName="roomId">
                    <mat-option [value]="''">—</mat-option>
                    @for (r of rooms(); track r.id) {
                      <mat-option [value]="r.id">{{ r.roomName || r.roomNumber }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              <button
                mat-flat-button
                class="rounded-xl!"
                type="submit"
                [disabled]="supForm.invalid || savingSup()"
              >
                Ajouter
              </button>
            </form>

            @if (supervisors().length === 0) {
              <p class="text-sm text-(--text-muted)">Aucun surveillant assigné.</p>
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (sup of supervisors(); track sup.id) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <panga-avatar [name]="supervisorName(sup)" [size]="32" />
                    <span class="flex-1 min-w-0 text-sm text-(--text) truncate">{{
                      supervisorName(sup)
                    }}</span>
                    <panga-status-badge [label]="roleLabel(sup.role)" tone="brand" [dot]="false" />
                    <button
                      mat-icon-button
                      class="h-8! w-8!"
                      (click)="removeSupervisor(sup)"
                      aria-label="Retirer"
                    >
                      <mat-icon
                        fontSet="material-symbols-outlined"
                        class="text-[18px]! text-(--danger)"
                        >close</mat-icon
                      >
                    </button>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('stats') {
          <section class="panga-card p-5">
            <panga-section-header icon="bar_chart" title="Statistiques" />
            @if (loadingStats()) {
              <p class="text-sm text-(--text-muted) py-6 text-center">Calcul…</p>
            } @else {
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Moyenne</p>
                  <p class="text-2xl font-semibold text-(--text)">
                    {{ stat('averageScore') }}
                  </p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Note max</p>
                  <p class="text-2xl font-semibold text-(--success)">
                    {{ stat('highestScore') }}
                  </p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Note min</p>
                  <p class="text-2xl font-semibold text-(--danger)">
                    {{ stat('lowestScore') }}
                  </p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Taux de réussite</p>
                  <p class="text-2xl font-semibold text-(--brand-700)">
                    {{ pctStat('passRate') }}
                  </p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Présents</p>
                  <p class="text-2xl font-semibold text-(--text)">
                    {{ stat('studentsPresent') }}
                  </p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Absents</p>
                  <p class="text-2xl font-semibold text-(--text)">
                    {{ stat('studentsAbsent') }}
                  </p>
                </div>
              </div>
            }
          </section>
        }
      }
    } @else {
      <div class="panga-card">
        <panga-empty-state
          icon="error"
          title="Examen introuvable"
          description="Cet examen n'existe pas ou a été supprimé."
        />
      </div>
    }
  `,
})
export class ExamDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly examsApi = inject(ExamsService);
  private readonly studentsApi = inject(StudentsService);
  private readonly teachersApi = inject(TeachersService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly supervisorRoles = SUPERVISOR_ROLE_OPTIONS;
  protected readonly tabs = [
    { key: 'results' as const, label: 'Résultats' },
    { key: 'supervisors' as const, label: 'Surveillants' },
    { key: 'stats' as const, label: 'Statistiques' },
  ];

  protected readonly tab = signal<'results' | 'supervisors' | 'stats'>('results');
  protected readonly loading = signal(true);
  protected readonly exam = signal<Exam | null>(null);
  protected readonly results = signal<ExamResult[]>([]);
  protected readonly supervisors = signal<ExamSupervisor[]>([]);
  protected readonly rooms = signal<ExamRoom[]>([]);
  private readonly allStudents = signal<Student[]>([]);
  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly publishing = signal(false);
  protected readonly savingSup = signal(false);
  protected readonly stats = signal<Record<string, unknown> | null>(null);
  protected readonly loadingStats = signal(false);
  /** Présence locale (avant 1re saisie) : par défaut présent. */
  private readonly presence = signal<Record<string, boolean>>({});

  protected readonly roster = computed(() => {
    const classId = this.exam()?.classId;
    return this.allStudents().filter((s) => s.classInstanceId === classId);
  });

  protected readonly supForm = new FormGroup({
    teacherId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    role: new FormControl('assistant', { nonNullable: true }),
    roomId: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    forkJoin({
      exam: this.examsApi.get(this.id),
      students: this.studentsApi.list({ page: 1, limit: 300, schoolYear: this.sy.filter() }),
      teachers: this.teachersApi.list({ page: 1, limit: 200 }),
      rooms: this.examsApi.rooms(),
    }).subscribe({
      next: (r) => {
        this.exam.set(r.exam);
        this.supervisors.set(r.exam.supervisors ?? []);
        this.allStudents.set(r.students.items);
        this.teachers.set(r.teachers.items);
        this.rooms.set(r.rooms);
        this.loading.set(false);
        this.loadResults();
      },
      error: () => this.loading.set(false),
    });
  }

  selectTab(key: 'results' | 'supervisors' | 'stats'): void {
    this.tab.set(key);
    if (key === 'stats' && !this.stats()) {
      this.loadStats();
    }
  }

  private loadResults(): void {
    this.examsApi.results(this.id).subscribe({ next: (rows) => this.results.set(rows) });
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.examsApi.statistics(this.id).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false),
    });
  }

  /* -------------------------------- Résultats ------------------------------- */

  protected maxScore(): number {
    return Number(this.exam()?.maxScore ?? 20) || 20;
  }
  protected resultFor(studentId: string): ExamResult | undefined {
    return this.results().find((r) => r.studentId === studentId);
  }
  protected scoreOf(studentId: string): string {
    const r = this.resultFor(studentId);
    return r?.score !== undefined && r?.score !== null ? String(r.score) : '';
  }
  protected presentOf(studentId: string): boolean {
    const local = this.presence()[studentId];
    if (local !== undefined) {
      return local;
    }
    const r = this.resultFor(studentId);
    return r ? r.wasPresent !== false : true;
  }
  protected resultBadge(r: ExamResult): string {
    return `${Number(r.score)}/${Number(r.maxScore)}`;
  }

  togglePresent(studentId: string, present: boolean): void {
    this.presence.update((m) => ({ ...m, [studentId]: present }));
    if (!present) {
      this.persist(studentId, 0, false);
    }
  }

  saveScore(studentId: string, ev: Event): void {
    const raw = (ev.target as HTMLInputElement).value;
    const score = parseFloat(raw);
    if (!Number.isFinite(score)) {
      return;
    }
    this.persist(studentId, score, true);
  }

  private persist(studentId: string, score: number, present: boolean): void {
    this.examsApi
      .upsertResult({
        examId: this.id,
        studentId,
        score,
        maxScore: this.maxScore(),
        wasPresent: present,
        wasAbsent: !present,
      })
      .subscribe({
        next: () => {
          this.notify.success('Résultat enregistré.');
          this.loadResults();
        },
      });
  }

  publish(): void {
    if (this.publishing()) {
      return;
    }
    this.publishing.set(true);
    this.examsApi.publishResults(this.id).subscribe({
      next: (e) => {
        this.publishing.set(false);
        this.exam.set(e);
        this.notify.success('Résultats publiés.');
        this.loadResults();
      },
      error: () => this.publishing.set(false),
    });
  }

  /* ------------------------------ Surveillants ------------------------------ */

  addSupervisor(): void {
    if (this.supForm.invalid || this.savingSup()) {
      return;
    }
    const v = this.supForm.getRawValue();
    this.savingSup.set(true);
    this.examsApi
      .addSupervisor(this.id, {
        examId: this.id,
        teacherId: v.teacherId,
        role: v.role,
        ...(v.roomId ? { roomId: v.roomId } : {}),
      })
      .subscribe({
        next: () => {
          this.savingSup.set(false);
          this.notify.success('Surveillant ajouté.');
          this.supForm.reset({ role: 'assistant' });
          this.refreshExam();
        },
        error: () => this.savingSup.set(false),
      });
  }

  removeSupervisor(sup: ExamSupervisor): void {
    this.examsApi.removeSupervisor(sup.id).subscribe({
      next: () => {
        this.notify.success('Surveillant retiré.');
        this.refreshExam();
      },
    });
  }

  private refreshExam(): void {
    this.examsApi.get(this.id).subscribe({
      next: (e) => {
        this.exam.set(e);
        this.supervisors.set(e.supervisors ?? []);
      },
    });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected teacherName(t: Teacher): string {
    const u = (t.user ?? {}) as Record<string, unknown>;
    return (
      `${(u['firstName'] as string) ?? ''} ${(u['lastName'] as string) ?? ''}`.trim() ||
      (t.employeeNumber as string) ||
      t.id
    );
  }
  protected supervisorName(sup: ExamSupervisor): string {
    const t = (sup.teacher ?? {}) as Record<string, unknown>;
    const u = (t['user'] ?? {}) as Record<string, unknown>;
    return (
      `${(u['firstName'] as string) ?? ''} ${(u['lastName'] as string) ?? ''}`.trim() ||
      (t['employeeNumber'] as string) ||
      'Surveillant'
    );
  }
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
  protected roleLabel(r: string | undefined): string {
    return examLabel(SUPERVISOR_ROLE_OPTIONS, r);
  }
  protected stat(key: string): string {
    const v = (this.stats() ?? this.exam() ?? {})[key];
    return v === null || v === undefined ? '—' : String(Math.round(Number(v) * 100) / 100);
  }
  protected pctStat(key: string): string {
    const v = (this.stats() ?? this.exam() ?? {})[key];
    return v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`;
  }
}
