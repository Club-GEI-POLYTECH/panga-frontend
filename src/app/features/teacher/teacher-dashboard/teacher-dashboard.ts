import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthStore } from '../../../core/auth/auth.store';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { SectionHeader } from '../../../shared/ui/section-header';
import { EmptyState } from '../../../shared/ui/empty-state';
import {
  TeacherDashboardService,
  type AcademicStats,
  type DashboardKpi,
  type RecentGrade,
  type TeacherDashboard as TeacherDashboardData,
} from '../services/teacher-dashboard.service';

/** Icône Material Symbols par identifiant de KPI (le back renvoie des noms heroicons). */
const KPI_ICON: Record<string, string> = {
  classes: 'meeting_room',
  students: 'group',
  pending_grades: 'grade',
};

/** Tableau de bord enseignant — branché sur `/dashboard/me` + stats académiques. */
@Component({
  selector: 'panga-teacher-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatProgressSpinnerModule, MatIconModule, KpiCard, SectionHeader, EmptyState],
  template: `
    <header class="rounded-3xl p-6 mb-6 text-white" style="background: var(--brand-gradient)">
      <p class="text-sm opacity-90">Bonjour,</p>
      <h1 class="text-2xl font-semibold">{{ store.fullName() }}</h1>
      <p class="text-sm opacity-90 mt-1">{{ subtitle() }}</p>
    </header>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        @for (kpi of kpis(); track kpi.id) {
          <panga-kpi-card [label]="kpi.title" [value]="kpi.value" [icon]="iconFor(kpi)" />
        }
        @if (avgText()) {
          <panga-kpi-card label="Moyenne des notes" [value]="avgText()" icon="insights" />
        }
      </section>

      <section class="panga-card p-5">
        <panga-section-header
          icon="history"
          title="Notes récentes"
          [count]="recentGrades().length"
        />
        @if (recentGrades().length === 0) {
          <panga-empty-state
            icon="grade"
            title="Aucune note récente"
            description="Les dernières notes saisies apparaîtront ici."
          />
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (g of recentGrades(); track $index) {
              <div class="flex items-center gap-4 px-5 py-3">
                <mat-icon
                  fontSet="material-symbols-outlined"
                  class="text-(--brand-500)!"
                  aria-hidden="true"
                  >grade</mat-icon
                >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">
                    {{ g.studentName || '—' }}
                  </p>
                  <p class="text-xs text-(--text-muted) truncate">
                    {{ g.subjectName || '' }}
                    @if (g.term) {
                      · {{ g.term }}
                    }
                    @if (g.createdAt) {
                      · {{ g.createdAt | date: 'dd/MM/yy' }}
                    }
                  </p>
                </div>
                @if (g.score !== undefined && g.score !== null) {
                  <span class="text-sm font-semibold text-(--text) shrink-0">
                    {{ g.score }}<span class="text-(--text-muted)">/{{ g.maxScore || 20 }}</span>
                  </span>
                }
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class TeacherDashboard {
  protected readonly store = inject(AuthStore);
  private readonly api = inject(TeacherDashboardService);

  private readonly data = signal<TeacherDashboardData | null>(null);
  private readonly academic = signal<AcademicStats | null>(null);
  protected readonly loading = signal(true);

  protected readonly kpis = computed<DashboardKpi[]>(() => this.data()?.ui?.kpis ?? []);
  protected readonly recentGrades = computed<RecentGrade[]>(
    () => this.data()?.ui?.sections?.recentGrades ?? this.data()?.raw?.recentGrades ?? [],
  );
  protected readonly subtitle = computed(
    () => this.data()?.ui?.header?.subtitle || 'Suivi de classes, élèves et saisie des notes',
  );
  protected readonly avgText = computed(() => {
    const v = this.academic()?.averagePercentage;
    return v === undefined || v === null ? '' : `${Math.round(v)}%`;
  });

  constructor() {
    forkJoin({
      me: this.api.me().pipe(catchError(() => of(null))),
      academic: this.api.academicStats().pipe(catchError(() => of(null))),
    }).subscribe((r) => {
      this.data.set(r.me);
      this.academic.set(r.academic);
      this.loading.set(false);
    });
  }

  protected iconFor(kpi: DashboardKpi): string {
    return KPI_ICON[kpi.id] ?? 'insights';
  }
}
