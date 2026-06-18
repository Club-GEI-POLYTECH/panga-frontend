import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/auth/auth.store';
import { StudentService, extractContext } from '../services/student.service';
import type { Bulletin } from '../../admin/models/admin.models';
import type { AnnualAverageResult } from '../../admin/models/grade.models';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

@Component({
  selector: 'panga-student-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    KpiCard,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <header class="rounded-3xl p-6 mb-6 text-white" style="background: var(--brand-gradient)">
      <p class="text-sm opacity-90">Bonjour,</p>
      <h1
        class="text-2xl sm:text-3xl font-semibold mt-0.5"
        style="font-family: Urbanist, sans-serif"
      >
        {{ store.fullName() }}
      </h1>
      <p class="text-sm opacity-90 mt-1">
        {{ className() || 'Élève' }}
        @if (matricule()) {
          · {{ matricule() }}
        }
      </p>
    </header>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <section class="grid gap-4 grid-cols-2 xl:grid-cols-4 mb-6">
        <panga-kpi-card label="Moyenne générale" [value]="overall()" icon="grade" />
        <panga-kpi-card label="Présence" [value]="attendanceRate()" icon="fact_check" />
        <panga-kpi-card label="Bulletins" [value]="bulletins().length" icon="description" />
        <panga-kpi-card label="Examens à venir" [value]="upcomingExams().length" icon="quiz" />
      </section>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Moyennes par matière -->
        <section class="panga-card p-5">
          <panga-section-header icon="leaderboard" title="Mes moyennes" [count]="subjects().length">
            <a mat-button routerLink="/ma-scolarite">Tout voir</a>
          </panga-section-header>
          @if (subjects().length === 0) {
            <p class="text-sm text-[var(--text-muted)] py-4 text-center">
              Aucune moyenne disponible pour l'instant.
            </p>
          } @else {
            <div class="space-y-3">
              @for (a of subjects().slice(0, 6); track $index) {
                <div>
                  <div class="flex items-center justify-between gap-3 mb-1">
                    <span class="text-sm text-[var(--text)] truncate">{{ subjLabel(a) }}</span>
                    <span
                      class="text-sm font-semibold shrink-0"
                      [style.color]="avgColor(subjPct(a))"
                    >
                      {{ subjPct(a) }}%
                    </span>
                  </div>
                  <div class="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
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

        <!-- Derniers bulletins -->
        <section class="panga-card p-5">
          <panga-section-header
            icon="description"
            title="Mes bulletins"
            [count]="bulletins().length"
          >
            <a mat-button routerLink="/ma-scolarite">Tout voir</a>
          </panga-section-header>
          @if (bulletins().length === 0) {
            <p class="text-sm text-[var(--text-muted)] py-4 text-center">Aucun bulletin publié.</p>
          } @else {
            <div class="divide-y divide-[var(--border)] -mx-5">
              @for (b of bulletins().slice(0, 5); track b.id) {
                <div class="flex items-center gap-3 px-5 py-2.5">
                  <span class="material-symbols-outlined text-[var(--brand-500)]">description</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-[var(--text)] truncate">
                      {{ b.term || 'Bulletin' }} · {{ b.schoolYear || '' }}
                    </p>
                    @if (b.average !== undefined) {
                      <p class="text-xs text-[var(--text-muted)]">
                        Moyenne : {{ b.average }}
                        @if (b.rank) {
                          · {{ b.rank }}<sup>e</sup>
                        }
                      </p>
                    }
                  </div>
                  <panga-status-badge
                    [label]="b.published ? 'Publié' : 'Brouillon'"
                    [tone]="b.published ? 'success' : 'neutral'"
                    [dot]="false"
                  />
                </div>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
})
export class StudentDashboard {
  protected readonly store = inject(AuthStore);
  private readonly api = inject(StudentService);

  protected readonly loading = signal(true);
  protected readonly subjects = signal<AnnualAverageResult[]>([]);
  protected readonly overallPercent = signal<number | null>(null);
  protected readonly bulletins = signal<Bulletin[]>([]);
  private readonly attendance = signal<Record<string, unknown>[]>([]);
  protected readonly upcomingExams = signal<Record<string, unknown>[]>([]);
  private readonly ctxClassName = signal('');
  private readonly ctxMatricule = signal('');

  protected readonly className = computed(() => this.ctxClassName());
  protected readonly matricule = computed(() => this.ctxMatricule());

  protected readonly overall = computed(() =>
    this.overallPercent() === null ? '—' : `${this.overallPercent()}%`,
  );
  protected readonly attendanceRate = computed(() => {
    const list = this.attendance();
    if (!list.length) {
      return '—';
    }
    const present = list.filter((a) => a['status'] === 'present' || a['status'] === 'late').length;
    return `${Math.round((present / list.length) * 100)}%`;
  });

  constructor() {
    this.api.me().subscribe({
      next: (me) => {
        const ctx = extractContext(me);
        const cls = (me['classInstance'] ?? me['currentClass'] ?? {}) as Record<string, unknown>;
        const tpl = (cls['template'] ?? {}) as Record<string, unknown>;
        this.ctxClassName.set(String(tpl['name'] ?? cls['name'] ?? me['className'] ?? ''));
        this.ctxMatricule.set(String(me['studentNumber'] ?? me['matricule'] ?? ''));

        forkJoin({
          averages: ctx.classId
            ? this.api
                .averages(ctx.studentId, ctx.classId, ctx.schoolYear)
                .pipe(catchError(() => of(null)))
            : of(null),
          bulletins: this.api.bulletins(ctx.studentId).pipe(catchError(() => of([]))),
          attendance: this.api.attendance(ctx.studentId).pipe(catchError(() => of([]))),
          exams: ctx.classId
            ? this.api.exams(ctx.classId, ctx.schoolYear).pipe(catchError(() => of([])))
            : of([]),
        }).subscribe((r) => {
          if (r.averages) {
            this.subjects.set(r.averages.subjectAverages ?? []);
            const o = r.averages.overallAveragePercent ?? r.averages.overallAverage;
            this.overallPercent.set(o === undefined ? null : Math.round(o));
          }
          this.bulletins.set(r.bulletins);
          this.attendance.set(r.attendance);
          this.upcomingExams.set(upcoming(r.exams));
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false),
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
}

/** Examens à venir (date >= aujourd'hui), triés par date. */
function upcoming(exams: Record<string, unknown>[]): Record<string, unknown>[] {
  const today = new Date().toISOString().slice(0, 10);
  return exams
    .filter((e) => {
      const d = String(e['examDate'] ?? '').slice(0, 10);
      return d && d >= today;
    })
    .sort((a, b) => String(a['examDate']).localeCompare(String(b['examDate'])));
}
