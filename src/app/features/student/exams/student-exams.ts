import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { StudentService, extractContext } from '../services/student.service';
import { ExamsService } from '../../admin/services/exams.service';
import { ParentsService } from '../../admin/services/parents.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { ExamResult } from '../../admin/models/exam.models';
import { EXAM_TYPE_OPTIONS, examLabel } from '../../../core/models/exam.enums';

interface ChildRef {
  id: string;
  label: string;
  classId: string;
}

/** Ligne d'examen telle que renvoyée par `GET /students/exams` (forme tolérante). */
interface StudentExamRow {
  id: string;
  name?: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  examType?: string;
  examSessionId?: string;
  isResultsPublished?: boolean;
  nationalProgramSlot?: { labelFr?: string; programCode?: string };
  [key: string]: unknown;
}

/**
 * "Mes examens" — élève (lui-même) ou parent (par enfant). Le `published`
 * de `GET /exams/:id/results` est testé explicitement (jamais déduit d'un
 * tableau vide) ; la salle passe par `my-seat`, pas le roster complet.
 */
@Component({
  selector: 'panga-student-exams',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="quiz"
      title="Mes examens"
      subtitle="Examens à venir, salle assignée & résultats"
    />

    @if (isParent()) {
      <div class="panga-card p-5 mb-6">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full sm:w-75">
          <mat-label>Enfant</mat-label>
          <mat-select [value]="selectedChildId()" (selectionChange)="selectChild($event.value)">
            @for (c of children(); track c.id) {
              <mat-option [value]="c.id">{{ c.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    }

    <section class="panga-card p-5">
      <panga-section-header icon="quiz" title="Épreuves" [count]="exams().length" />
      @if (loading()) {
        <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
      } @else if (exams().length === 0) {
        <panga-empty-state
          icon="quiz"
          title="Aucun examen"
          description="Aucun examen programmé pour l'instant."
        />
      } @else {
        <div class="divide-y divide-(--border) -mx-5">
          @for (e of exams(); track e.id) {
            <div class="px-5 py-3">
              <button
                type="button"
                class="appearance-none border-0 bg-transparent p-0 w-full flex items-center gap-4 text-left"
                (click)="toggle(e)"
              >
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style="background: var(--brand-gradient)"
                >
                  <span class="material-symbols-outlined text-[20px]">quiz</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">{{ e.name || '—' }}</p>
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
                <mat-icon fontSet="material-symbols-outlined" class="text-(--text-muted)">{{
                  expandedId() === e.id ? 'expand_less' : 'expand_more'
                }}</mat-icon>
              </button>

              @if (expandedId() === e.id) {
                <div class="mt-3 pl-14 flex flex-col gap-3">
                  @if (loadingDetail()) {
                    <p class="text-sm text-(--text-muted)">Chargement…</p>
                  } @else {
                    <!-- Résultat -->
                    @if (!resultsPublished()) {
                      <p class="text-sm text-(--text-muted)">
                        Résultats pas encore publiés pour cet examen.
                      </p>
                    } @else if (myResult(); as r) {
                      <div class="flex items-center gap-2">
                        <panga-status-badge
                          [label]="resultBadge(r)"
                          [tone]="r.isPassed ? 'success' : 'danger'"
                          [dot]="false"
                        />
                        @if (r.teacherComment) {
                          <span class="text-xs text-(--text-muted)">{{ r.teacherComment }}</span>
                        }
                      </div>
                    } @else {
                      <p class="text-sm text-(--text-muted)">
                        Aucun résultat saisi pour l'instant.
                      </p>
                    }

                    <!-- Salle -->
                    @if (e.examSessionId) {
                      @if (mySeatLabel(); as seat) {
                        <p class="text-sm text-(--text)">
                          <mat-icon
                            fontSet="material-symbols-outlined"
                            class="text-base! align-middle text-(--text-muted)"
                            >meeting_room</mat-icon
                          >
                          Salle : {{ seat }}
                        </p>
                      } @else {
                        <p class="text-sm text-(--text-muted)">Salle pas encore assignée.</p>
                      }
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class StudentExams {
  private readonly studentApi = inject(StudentService);
  private readonly parentsApi = inject(ParentsService);
  private readonly examsApi = inject(ExamsService);
  private readonly auth = inject(AuthStore);

  protected readonly isParent = computed(() => this.auth.role() === 'parent');

  protected readonly children = signal<ChildRef[]>([]);
  protected readonly selectedChildId = signal('');
  private readonly context = signal<{
    studentId: string;
    classId: string;
    schoolYear: string;
  } | null>(null);

  protected readonly exams = signal<StudentExamRow[]>([]);
  protected readonly loading = signal(true);

  protected readonly expandedId = signal('');
  protected readonly loadingDetail = signal(false);
  protected readonly resultsPublished = signal(false);
  protected readonly examResults = signal<ExamResult[]>([]);
  protected readonly mySeatInfo = signal<Record<string, unknown> | null>(null);

  constructor() {
    if (this.isParent()) {
      this.loadChildren();
    } else {
      this.studentApi.me().subscribe({
        next: (me) => {
          const ctx = extractContext(me);
          this.context.set(ctx);
          this.loadExams(ctx.classId, ctx.schoolYear);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  private loadChildren(): void {
    this.parentsApi.me().subscribe({
      next: (me) => {
        const parentId = String(me['id'] ?? '');
        if (!parentId) {
          this.loading.set(false);
          return;
        }
        this.parentsApi.students(parentId).subscribe({
          next: (students) => {
            const kids = students
              .map((s) => ({
                id: s.id,
                label: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id,
                classId: s.classInstanceId ?? '',
              }))
              .filter((c) => c.id);
            this.children.set(kids);
            if (kids.length) {
              this.selectChild(kids[0].id);
            } else {
              this.loading.set(false);
            }
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  selectChild(id: string): void {
    this.selectedChildId.set(id);
    this.expandedId.set('');
    const child = this.children().find((c) => c.id === id);
    if (!child?.classId) {
      this.exams.set([]);
      this.loading.set(false);
      return;
    }
    this.context.set({ studentId: child.id, classId: child.classId, schoolYear: '' });
    this.loadExams(child.classId, '');
  }

  private loadExams(classId: string, schoolYear: string): void {
    if (!classId) {
      this.exams.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.studentApi
      .exams(classId, schoolYear)
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (rows) => {
          this.exams.set(rows as StudentExamRow[]);
          this.loading.set(false);
        },
      });
  }

  toggle(e: StudentExamRow): void {
    if (this.expandedId() === e.id) {
      this.expandedId.set('');
      return;
    }
    this.expandedId.set(e.id);
    this.loadDetail(e);
  }

  private loadDetail(e: StudentExamRow): void {
    const ctx = this.context();
    const studentId = this.isParent() ? ctx?.studentId : undefined;
    this.loadingDetail.set(true);
    this.examsApi
      .results(e.id, studentId)
      .pipe(catchError(() => of({ published: false, results: [] })))
      .subscribe((r) => {
        this.resultsPublished.set(r.published);
        this.examResults.set(r.results);
        if (e.examSessionId) {
          this.examsApi
            .mySeat(e.examSessionId, studentId)
            .pipe(catchError(() => of(null)))
            .subscribe((seat) => {
              this.mySeatInfo.set(seat);
              this.loadingDetail.set(false);
            });
        } else {
          this.mySeatInfo.set(null);
          this.loadingDetail.set(false);
        }
      });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected courseLabel(e: StudentExamRow): string {
    return e.nationalProgramSlot?.labelFr ?? e.nationalProgramSlot?.programCode ?? 'Cours';
  }
  protected typeLabel(t: string | undefined): string {
    return examLabel(EXAM_TYPE_OPTIONS, t);
  }
  protected myResult(): ExamResult | undefined {
    const ctx = this.context();
    const rows = this.examResults();
    if (!ctx || rows.length === 1) {
      return rows[0];
    }
    return rows.find((r) => r.studentId === ctx.studentId) ?? rows[0];
  }
  protected resultBadge(r: ExamResult): string {
    return `${Number(r.score)}/${Number(r.maxScore)}`;
  }
  protected mySeatLabel(): string | null {
    const seat = this.mySeatInfo();
    if (!seat) {
      return null;
    }
    const room = (seat['room'] ?? seat) as Record<string, unknown>;
    const label = (room['roomName'] ?? room['roomNumber']) as string | undefined;
    return label ?? null;
  }
}
