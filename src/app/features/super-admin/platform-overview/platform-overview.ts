import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlatformService } from '../services/platform.service';
import { BillingService } from '../services/billing.service';
import { AuditService } from '../services/audit.service';
import { SystemService } from '../services/system.service';
import { TenantService } from '../../../core/tenant/tenant.service';
import type {
  AuditLog,
  BillingMetrics,
  HealthStatus,
  OverviewData,
  StatBlock,
  TrendPoint,
} from '../models/platform.models';
import {
  normalizeBillingMetrics,
  normalizeOverview,
  normalizeTrends,
} from '../models/dashboard.mappers';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { KeyValue } from '../../../shared/ui/key-value';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { Avatar } from '../../../shared/ui/avatar';
import { LineChart, type LineSeries } from '../../../shared/ui/charts/line-chart';
import { DonutChart } from '../../../shared/ui/charts/donut-chart';
import { BarChart } from '../../../shared/ui/charts/bar-chart';
import { GaugeChart } from '../../../shared/ui/charts/gauge-chart';

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('fr-FR');
}

/** Vue d'ensemble plateforme (super_admin) — KPIs, courbes, business SaaS. */
@Component({
  selector: 'panga-platform-overview',
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
    StatusBadge,
    Avatar,
    LineChart,
    DonutChart,
    BarChart,
    GaugeChart,
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
      <p class="text-sm opacity-90 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-base">verified_user</span> Espace plateforme
      </p>
      <h1 class="text-2xl sm:text-3xl font-semibold mt-1" style="font-family: Urbanist, sans-serif">
        Tableau de bord plateforme
      </h1>
      <p class="text-sm opacity-90 mt-1">Pilotage global de toutes les écoles Panga</p>
    </header>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <!-- Bandeau KPI -->
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <panga-kpi-card
          label="Écoles actives"
          [value]="fmt(overview()?.activeSchools)"
          icon="apartment"
        />
        <panga-kpi-card label="Élèves" [value]="fmt(overview()?.totalStudents)" icon="school" />
        <panga-kpi-card label="MRR" [value]="fmt(billing()?.mrr)" icon="trending_up" />
        <panga-kpi-card
          label="Revenus du mois"
          [value]="fmt(overview()?.monthlyRevenue)"
          icon="payments"
          [trend]="overview()?.revenueDelta ?? null"
          [trendLabel]="deltaLabel()"
        />
      </section>

      <!-- Croissance -->
      <section class="panga-card p-5 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0"
            style="background: var(--brand-gradient)"
          >
            <span class="material-symbols-outlined text-[20px]">show_chart</span>
          </div>
          <div>
            <h2 class="text-base font-semibold text-[var(--text)]">Croissance</h2>
            <p class="text-xs text-[var(--text-muted)]">
              Nouvelles écoles, élèves et revenus — 12 mois
            </p>
          </div>
        </div>
        @if (trends().length) {
          <panga-line-chart [categories]="trendMonths()" [series]="trendSeries()" [height]="300" />
        } @else {
          <p class="text-sm text-[var(--text-muted)] py-8 text-center">
            Aucune donnée de tendance.
          </p>
        }
      </section>

      <!-- Business SaaS -->
      <section class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5">
          <panga-section-header icon="donut_large" title="MRR par plan" />
          @if (billing()?.mrrByPlan?.length) {
            <panga-donut-chart [data]="billing()!.mrrByPlan" centerLabel="MRR" [height]="240" />
          } @else {
            <p class="text-sm text-[var(--text-muted)] py-10 text-center">Aucune donnée.</p>
          }
        </div>

        <div class="panga-card p-5">
          <panga-section-header icon="subscriptions" title="Abonnements actifs" />
          <panga-gauge-chart
            [value]="billing()?.activeSubscriptions ?? 0"
            [max]="subscriptionsTotal()"
            label="actifs / total"
            [height]="240"
          />
        </div>

        <div class="panga-card p-5 flex flex-col gap-3">
          <panga-section-header icon="notification_important" title="Alertes" />
          <div
            class="rounded-2xl p-4 flex items-center justify-between"
            [style.background]="
              (billing()?.pastDue ?? 0) > 0
                ? 'color-mix(in srgb, var(--danger) 10%, transparent)'
                : 'color-mix(in srgb, var(--success) 10%, transparent)'
            "
          >
            <div>
              <p class="text-xs text-[var(--text-muted)]">Écoles impayées (past due)</p>
              <p class="text-2xl font-semibold text-[var(--text)]">{{ fmt(billing()?.pastDue) }}</p>
            </div>
            <span
              class="material-symbols-outlined text-3xl"
              [style.color]="(billing()?.pastDue ?? 0) > 0 ? 'var(--danger)' : 'var(--success)'"
            >
              {{ (billing()?.pastDue ?? 0) > 0 ? 'error' : 'check_circle' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-[var(--border)] p-3">
              <p class="text-xs text-[var(--text-muted)]">Période d'essai</p>
              <p class="text-xl font-semibold text-[var(--text)]">{{ fmt(billing()?.trial) }}</p>
            </div>
            <div class="rounded-2xl border border-[var(--border)] p-3">
              <p class="text-xs text-[var(--text-muted)]">Encours factures</p>
              <p class="text-xl font-semibold text-[var(--text)]">
                {{ fmt(billing()?.outstanding) }}
              </p>
            </div>
          </div>
          @if (billing()?.arr !== null && billing()?.arr !== undefined) {
            <p class="text-xs text-[var(--text-muted)]">
              ARR estimé :
              <span class="font-medium text-[var(--text)]">{{ fmt(billing()?.arr) }}</span>
            </p>
          }
        </div>
      </section>

      <!-- Top écoles + répartition -->
      <section class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5 lg:col-span-2">
          <panga-section-header icon="leaderboard" title="Top 5 écoles par effectif" />
          @if (overview()?.topSchools?.length) {
            <panga-bar-chart [data]="overview()!.topSchools" [height]="260" />
          } @else {
            <p class="text-sm text-[var(--text-muted)] py-10 text-center">Aucune donnée.</p>
          }
        </div>
        <div class="panga-card p-5">
          <panga-section-header icon="pie_chart" title="Classes — primaire / secondaire" />
          @if (cycleSplit().length) {
            <panga-donut-chart [data]="cycleSplit()" centerLabel="Classes" [height]="240" />
          } @else {
            <p class="text-sm text-[var(--text-muted)] py-10 text-center">Aucune donnée.</p>
          }
        </div>
      </section>

      <!-- Académique & finance -->
      <section class="grid gap-4 lg:grid-cols-2 mb-6">
        <div class="panga-card p-5">
          <panga-section-header icon="menu_book" title="Académique global" />
          <panga-key-value [data]="academic()" />
        </div>
        <div class="panga-card p-5">
          <panga-section-header icon="account_balance" title="Finance globale" />
          <panga-key-value [data]="financial()" />
        </div>
      </section>

      <!-- Activité & système -->
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
          } @else if (auditNeedsSchool) {
            <div class="flex flex-col items-center text-center text-[var(--text-muted)] py-8 gap-1">
              <span class="material-symbols-outlined text-[var(--brand-500)]">apartment</span>
              <p class="text-sm">Sélectionnez une école pour consulter son journal d'audit.</p>
            </div>
          } @else {
            <p class="text-sm text-[var(--text-muted)] py-8 text-center">Aucun événement récent.</p>
          }
        </div>

        <div class="panga-card p-5">
          <panga-section-header icon="monitor_heart" title="Système" />
          @if (health()) {
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-[var(--text-muted)]">Statut</span>
              <panga-status-badge
                [label]="healthLabel()"
                [tone]="healthOk() ? 'success' : 'danger'"
              />
            </div>
            <panga-key-value [data]="health()?.info || health()?.details || health()" />
          } @else {
            <div class="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span class="material-symbols-outlined text-[var(--warning)]">cloud_off</span>
              Santé indisponible
            </div>
          }
        </div>
      </section>

      <!-- Actions rapides -->
      <section class="panga-card p-5">
        <panga-section-header icon="bolt" title="Actions rapides" />
        <div class="flex flex-wrap gap-3">
          <a mat-flat-button class="!rounded-xl" [routerLink]="['/', 'platform', 'schools']">
            <mat-icon fontSet="material-symbols-outlined">add_business</mat-icon> Onboarder une
            école
          </a>
          <a mat-stroked-button class="!rounded-xl" [routerLink]="['/', 'platform', 'billing']">
            <mat-icon fontSet="material-symbols-outlined">receipt_long</mat-icon> Émettre une
            facture
          </a>
          <a mat-stroked-button class="!rounded-xl" [routerLink]="['/', 'platform', 'users']">
            <mat-icon fontSet="material-symbols-outlined">person_add</mat-icon> Créer un compte
          </a>
          <a mat-stroked-button class="!rounded-xl" [routerLink]="['/', 'platform', 'curriculum']">
            <mat-icon fontSet="material-symbols-outlined">menu_book</mat-icon> Curriculum
          </a>
        </div>
      </section>
    }
  `,
})
export class PlatformOverview {
  private readonly platform = inject(PlatformService);
  private readonly billingApi = inject(BillingService);
  private readonly auditApi = inject(AuditService);
  private readonly system = inject(SystemService);
  private readonly tenant = inject(TenantService);

  /** Le journal d'audit est cloisonné par école : indisponible sans contexte. */
  protected readonly auditNeedsSchool = !this.tenant.activeSchoolId();

  protected readonly fmt = fmt;

  protected readonly loading = signal(true);
  protected readonly overview = signal<OverviewData | null>(null);
  protected readonly trends = signal<TrendPoint[]>([]);
  protected readonly billing = signal<BillingMetrics | null>(null);
  protected readonly academic = signal<StatBlock | null>(null);
  protected readonly financial = signal<StatBlock | null>(null);
  protected readonly audit = signal<AuditLog[]>([]);
  protected readonly health = signal<HealthStatus | null>(null);

  protected readonly trendMonths = computed(() => this.trends().map((t) => t.month));
  protected readonly trendSeries = computed<LineSeries[]>(() => {
    const t = this.trends();
    return [
      { name: 'Nouvelles écoles', data: t.map((p) => p.newSchools), axis: 0, color: '#6fbb31' },
      { name: 'Nouveaux élèves', data: t.map((p) => p.newStudents), axis: 0, color: '#8fd34a' },
      { name: 'Revenus', data: t.map((p) => p.revenue), axis: 1, color: '#5fb0d8', area: true },
    ];
  });

  protected readonly subscriptionsTotal = computed(() => {
    const b = this.billing();
    return (b?.activeSubscriptions ?? 0) + (b?.pastDue ?? 0) + (b?.trial ?? 0) || 1;
  });

  protected readonly cycleSplit = computed(() => {
    const o = this.overview();
    const out = [];
    if (o?.primary != null) out.push({ name: 'Primaire', value: o.primary });
    if (o?.secondary != null) out.push({ name: 'Secondaire', value: o.secondary });
    return out;
  });

  protected readonly deltaLabel = computed(() => {
    const d = this.overview()?.revenueDelta;
    return d === null || d === undefined ? '' : `${d >= 0 ? '+' : ''}${d}% vs mois dernier`;
  });

  protected readonly healthOk = computed(() => {
    const s = (this.health()?.status ?? '').toLowerCase();
    return s === 'ok' || s === 'up' || s === 'healthy';
  });
  protected readonly healthLabel = computed(() => this.health()?.status ?? 'Inconnu');

  constructor() {
    const safe = <T>(o: Observable<T>): Observable<T | null> => o.pipe(catchError(() => of(null)));

    forkJoin({
      overview: safe(this.platform.overview()),
      trends: safe(this.platform.trends(12)),
      billing: safe(this.billingApi.metrics()),
      academic: safe(this.platform.academicStats()),
      financial: safe(this.platform.financialStats()),
      // L'audit exige un x-school-id : on n'appelle qu'avec une école active.
      audit: this.tenant.activeSchoolId()
        ? safe(this.auditApi.list({ page: 1, limit: 8 }))
        : of(null),
      health: safe(this.system.health()),
    }).subscribe((r) => {
      this.overview.set(normalizeOverview(r.overview));
      this.trends.set(normalizeTrends(r.trends));
      this.billing.set(normalizeBillingMetrics(r.billing));
      this.academic.set(r.academic);
      this.financial.set(r.financial);
      this.audit.set(r.audit?.items ?? []);
      this.health.set(r.health);
      this.loading.set(false);
    });
  }
}
