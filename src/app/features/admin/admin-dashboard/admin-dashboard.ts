import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/auth/auth.store';
import { PlatformService } from '../../super-admin/services/platform.service';
import { AuditService } from '../../super-admin/services/audit.service';
import type {
  AuditLog,
  OverviewData,
  StatBlock,
  TrendPoint,
} from '../../super-admin/models/platform.models';
import { normalizeOverview, normalizeTrends } from '../../super-admin/models/dashboard.mappers';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { KeyValue } from '../../../shared/ui/key-value';
import { SectionHeader } from '../../../shared/ui/section-header';
import { LineChart, type LineSeries } from '../../../shared/ui/charts/line-chart';
import { auditView, type AuditView } from '../shared/audit-labels';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

const TONE_BG: Record<AuditView['tone'], string> = {
  success: 'color-mix(in srgb, var(--success) 14%, transparent)',
  warning: 'color-mix(in srgb, var(--warning) 16%, transparent)',
  danger: 'color-mix(in srgb, var(--danger) 14%, transparent)',
  info: 'color-mix(in srgb, #3b82f6 14%, transparent)',
  brand: 'color-mix(in srgb, var(--brand-500) 14%, transparent)',
  neutral: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
};
const TONE_FG: Record<AuditView['tone'], string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: '#3b82f6',
  brand: 'var(--brand-700)',
  neutral: 'var(--text-muted)',
};

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('fr-FR');
}

/** Tableau de bord d'un admin d'école (périmètre école). */
@Component({
  selector: 'panga-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    KpiCard,
    KeyValue,
    SectionHeader,
    LineChart,
  ],
  template: `
    <header
      class="relative overflow-hidden rounded-3xl p-7 mb-6 text-white"
      style="background: var(--brand-gradient)"
    >
      <div
        class="absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20"
        style="background:#fff"
      ></div>
      <p class="text-sm opacity-90">Bonjour,</p>
      <h1
        class="text-2xl sm:text-3xl font-semibold mt-0.5"
        style="font-family: Urbanist, sans-serif"
      >
        {{ store.fullName() }}
      </h1>
      <p class="text-sm opacity-90 mt-1">
        {{ store.activeSchool()?.name || 'Votre établissement' }}
      </p>
    </header>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <panga-kpi-card label="Élèves" [value]="fmt(overview()?.totalStudents)" icon="school" />
        <panga-kpi-card label="Enseignants" [value]="fmt(overview()?.totalTeachers)" icon="badge" />
        <panga-kpi-card label="Classes" [value]="fmt(classesCount())" icon="meeting_room" />
        <panga-kpi-card
          label="Revenus du mois"
          [value]="fmt(overview()?.monthlyRevenue)"
          icon="payments"
          [trend]="overview()?.revenueDelta ?? null"
          [trendLabel]="deltaLabel()"
        />
      </section>

      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="show_chart" title="Croissance (12 mois)" />
        @if (trends().length) {
          <panga-line-chart [categories]="trendMonths()" [series]="trendSeries()" [height]="280" />
        } @else {
          <p class="text-sm text-(--text-muted) py-8 text-center">Aucune donnée de tendance.</p>
        }
      </section>

      <section class="grid gap-4 lg:grid-cols-2 mb-6">
        <div class="panga-card p-5">
          <panga-section-header icon="menu_book" title="Académique" />
          <panga-key-value [data]="academic()" />
        </div>
        <div class="panga-card p-5">
          <panga-section-header icon="account_balance" title="Finances" />
          <panga-key-value [data]="financial()" />
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5 lg:col-span-2">
          <panga-section-header icon="history" title="Activité récente" />
          @if (audit().length) {
            <ul class="divide-y divide-(--border)">
              @for (a of audit(); track a.id || $index) {
                @let view = auditView(a);
                <li class="flex items-center gap-3 py-2.5">
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    [style.background]="toneBg(view.tone)"
                    [style.color]="toneFg(view.tone)"
                  >
                    <span class="material-symbols-outlined text-[18px]">{{ view.icon }}</span>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-(--text) truncate">{{ view.title }}</p>
                    <p class="text-xs text-(--text-muted) truncate">
                      {{ view.subtitle || '—' }}
                    </p>
                  </div>
                  @if (a.createdAt) {
                    <span class="text-xs text-(--text-muted) shrink-0">
                      {{ a.createdAt | date: 'dd/MM HH:mm' }}
                    </span>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-(--text-muted) py-8 text-center">Aucun événement récent.</p>
          }
        </div>

        <div class="panga-card p-5">
          <panga-section-header icon="bolt" title="Actions rapides" />
          <div class="flex flex-col gap-2">
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/students">
              <mat-icon fontSet="material-symbols-outlined">person_add</mat-icon> Ajouter un élève
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/classes">
              <mat-icon fontSet="material-symbols-outlined">add</mat-icon> Créer une classe
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/teachers">
              <mat-icon fontSet="material-symbols-outlined">badge</mat-icon> Ajouter un enseignant
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/communications">
              <mat-icon fontSet="material-symbols-outlined">campaign</mat-icon> Publier une annonce
            </a>
          </div>
        </div>
      </section>
    }
  `,
})
export class AdminDashboard {
  protected readonly store = inject(AuthStore);
  private readonly platform = inject(PlatformService);
  private readonly auditApi = inject(AuditService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly fmt = fmt;
  protected readonly auditView = auditView;
  protected toneBg(t: AuditView['tone']): string {
    return TONE_BG[t];
  }
  protected toneFg(t: AuditView['tone']): string {
    return TONE_FG[t];
  }
  protected readonly loading = signal(true);
  protected readonly overview = signal<OverviewData | null>(null);
  protected readonly trends = signal<TrendPoint[]>([]);
  protected readonly academic = signal<StatBlock | null>(null);
  protected readonly financial = signal<StatBlock | null>(null);
  protected readonly audit = signal<AuditLog[]>([]);

  protected readonly classesCount = computed(() => {
    const o = this.overview();
    if (!o) return null;
    if (o.primary === null && o.secondary === null) return null;
    return (o.primary ?? 0) + (o.secondary ?? 0);
  });

  protected readonly trendMonths = computed(() => this.trends().map((t) => t.month));
  protected readonly trendSeries = computed<LineSeries[]>(() => {
    const t = this.trends();
    return [
      { name: 'Nouveaux élèves', data: t.map((p) => p.newStudents), axis: 0, color: '#8fd34a' },
      { name: 'Revenus', data: t.map((p) => p.revenue), axis: 1, color: '#5fb0d8', area: true },
    ];
  });

  protected readonly deltaLabel = computed(() => {
    const d = this.overview()?.revenueDelta;
    return d === null || d === undefined ? '' : `${d >= 0 ? '+' : ''}${d}% vs mois dernier`;
  });

  constructor() {
    // Données non annuelles (séries temporelles, finances, audit) : une seule fois.
    this.loadStatic();
    // Données scopées à l'année (overview = comptes de classes, academic = notes) :
    // rechargées dès que l'année sélectionnée change. L'effect s'exécute aussitôt.
    effect(() => {
      this.sy.selected();
      untracked(() => this.loadYearScoped());
    });
  }

  private static safe<T>(o: Observable<T>): Observable<T | null> {
    return o.pipe(catchError(() => of(null)));
  }

  private loadStatic(): void {
    const safe = AdminDashboard.safe;
    forkJoin({
      trends: safe(this.platform.trends(12)),
      financial: safe(this.platform.financialStats()),
      audit: safe(this.auditApi.list({ page: 1, limit: 8 })),
    }).subscribe((r) => {
      this.trends.set(normalizeTrends(r.trends));
      this.financial.set(r.financial);
      this.audit.set(r.audit?.items ?? []);
    });
  }

  /** `sy.filter()` : '' quand l'année courante est sélectionnée (→ backend la résout). */
  private loadYearScoped(): void {
    const safe = AdminDashboard.safe;
    const year = this.sy.filter();
    forkJoin({
      overview: safe(this.platform.overview(year)),
      academic: safe(this.platform.academicStats(year)),
    }).subscribe((r) => {
      this.overview.set(normalizeOverview(r.overview));
      this.academic.set(r.academic);
      this.loading.set(false);
    });
  }
}
