import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { Avatar } from '../../../shared/ui/avatar';
import { LineChart, type LineSeries } from '../../../shared/ui/charts/line-chart';

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
    Avatar,
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
        style="font-family: Poppins, sans-serif"
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
          <p class="text-sm text-[var(--text-muted)] py-8 text-center">
            Aucune donnée de tendance.
          </p>
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
            <ul class="divide-y divide-[var(--border)]">
              @for (a of audit(); track a.id || $index) {
                <li class="flex items-center gap-3 py-2.5">
                  <panga-avatar [name]="a.actor || a.actorEmail || a.action || '?'" [size]="36" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-[var(--text)] truncate">
                      {{ a.action || 'Action' }}
                      @if (a.entity || a.entityType) {
                        · {{ a.entity || a.entityType }}
                      }
                    </p>
                    <p class="text-xs text-[var(--text-muted)] truncate">
                      {{ a.actor || a.actorEmail || '—' }}
                    </p>
                  </div>
                  @if (a.createdAt) {
                    <span class="text-xs text-[var(--text-muted)] shrink-0">
                      {{ a.createdAt | date: 'dd/MM HH:mm' }}
                    </span>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-[var(--text-muted)] py-8 text-center">Aucun événement récent.</p>
          }
        </div>

        <div class="panga-card p-5">
          <panga-section-header icon="bolt" title="Actions rapides" />
          <div class="flex flex-col gap-2">
            <a mat-stroked-button class="!rounded-xl !justify-start" routerLink="/students">
              <mat-icon fontSet="material-symbols-outlined">person_add</mat-icon> Ajouter un élève
            </a>
            <a mat-stroked-button class="!rounded-xl !justify-start" routerLink="/classes">
              <mat-icon fontSet="material-symbols-outlined">add</mat-icon> Créer une classe
            </a>
            <a mat-stroked-button class="!rounded-xl !justify-start" routerLink="/teachers">
              <mat-icon fontSet="material-symbols-outlined">badge</mat-icon> Ajouter un enseignant
            </a>
            <a mat-stroked-button class="!rounded-xl !justify-start" routerLink="/communications">
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

  protected readonly fmt = fmt;
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
      { name: 'Nouveaux élèves', data: t.map((p) => p.newStudents), axis: 0, color: '#14b8a6' },
      { name: 'Revenus', data: t.map((p) => p.revenue), axis: 1, color: '#a855f7', area: true },
    ];
  });

  protected readonly deltaLabel = computed(() => {
    const d = this.overview()?.revenueDelta;
    return d === null || d === undefined ? '' : `${d >= 0 ? '+' : ''}${d}% vs mois dernier`;
  });

  constructor() {
    const safe = <T>(o: Observable<T>): Observable<T | null> => o.pipe(catchError(() => of(null)));

    forkJoin({
      overview: safe(this.platform.overview()),
      trends: safe(this.platform.trends(12)),
      academic: safe(this.platform.academicStats()),
      financial: safe(this.platform.financialStats()),
      audit: safe(this.auditApi.list({ page: 1, limit: 8 })),
    }).subscribe((r) => {
      this.overview.set(normalizeOverview(r.overview));
      this.trends.set(normalizeTrends(r.trends));
      this.academic.set(r.academic);
      this.financial.set(r.financial);
      this.audit.set(r.audit?.items ?? []);
      this.loading.set(false);
    });
  }
}
