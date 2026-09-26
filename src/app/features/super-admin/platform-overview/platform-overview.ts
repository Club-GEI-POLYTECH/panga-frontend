import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../shared/ui/notification.service';
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
  SaasInvoice,
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
import { EmptyState } from '../../../shared/ui/empty-state';
import { Skeleton } from '../../../shared/skeleton/skeleton';
import { SkeletonCard } from '../../../shared/skeleton/skeleton-card';
import { LineChart, type LineSeries } from '../../../shared/ui/charts/line-chart';
import { DonutChart } from '../../../shared/ui/charts/donut-chart';
import { BarChart } from '../../../shared/ui/charts/bar-chart';
import { GaugeChart } from '../../../shared/ui/charts/gauge-chart';
import { auditView, type AuditView } from '../../admin/shared/audit-labels';
import { fmtMoney, fmtNumber } from '../../../shared/utils/format';
import { SchoolsService } from '../services/schools.service';

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

/** Vue d'ensemble plateforme (super_admin) — KPIs, courbes, business SaaS. */
@Component({
  selector: 'panga-platform-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    KpiCard,
    KeyValue,
    SectionHeader,
    StatusBadge,
    EmptyState,
    Skeleton,
    SkeletonCard,
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
      <div
        class="absolute -bottom-16 -left-8 h-40 w-40 rounded-full opacity-10"
        style="background:#fff"
      ></div>

      <div class="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm opacity-90 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">verified_user</span>
            Espace plateforme
          </p>
          <h1
            class="text-2xl sm:text-3xl font-semibold mt-1"
            style="font-family: Urbanist, sans-serif"
          >
            Tableau de bord plateforme
          </h1>
          <p class="text-sm opacity-90 mt-1">Pilotage global de toutes les écoles Panga</p>
          <div class="flex flex-wrap items-center gap-3 mt-3 text-xs opacity-90">
            @if (health()) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  [style.background]="healthOk() ? '#A7E46A' : '#E05656'"
                ></span>
                Système {{ healthLabel() }}
              </span>
            }
            @if (refreshedAt()) {
              <span class="opacity-80">Mis à jour {{ refreshedAt() | date: 'dd/MM HH:mm' }}</span>
            }
          </div>
        </div>
        <a
          mat-flat-button
          class="hero-cta rounded-xl! shadow-sm"
          [routerLink]="['/', 'platform', 'schools']"
        >
          <mat-icon fontSet="material-symbols-outlined">add_business</mat-icon>
          Onboarder une école
        </a>
      </div>
    </header>

    @if (loading()) {
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        @for (_ of [1, 2, 3, 4]; track $index) {
          <div class="panga-card p-5 flex items-start gap-4">
            <panga-skeleton width="48px" height="48px" radius="1rem" />
            <div class="flex-1 space-y-2">
              <panga-skeleton width="55%" height="0.75rem" />
              <panga-skeleton width="40%" height="1.4rem" />
            </div>
          </div>
        }
      </section>
      <div class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="lg:col-span-2"><panga-skeleton-card /></div>
        <panga-skeleton-card />
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <panga-skeleton-card />
        <panga-skeleton-card />
        <panga-skeleton-card />
      </div>
    } @else {
      <!-- Bandeau KPI (MRR retiré : détaillé dans la carte réalisée/théorique) -->
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <a [routerLink]="['/', 'platform', 'schools']" class="block no-underline">
          <panga-kpi-card
            label="Écoles actives"
            [value]="fmt(overview()?.activeSchools)"
            icon="apartment"
          />
        </a>
        <panga-kpi-card label="Élèves" [value]="fmt(overview()?.totalStudents)" icon="school" />
        <a [routerLink]="['/', 'platform', 'billing']" class="block no-underline">
          <panga-kpi-card
            label="Revenus du mois"
            [value]="money(overview()?.monthlyRevenue)"
            icon="payments"
            [trend]="overview()?.revenueDelta ?? null"
            [trendLabel]="deltaLabel()"
          />
        </a>
        <a [routerLink]="['/', 'platform', 'billing']" class="block no-underline">
          <panga-kpi-card
            label="Écoles impayées"
            [value]="fmt(billing()?.pastDue)"
            icon="notification_important"
          />
        </a>
      </section>

      <!-- MRR réalisé vs théorique + relance -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="trending_up" title="Revenus récurrents (MRR)">
          <button
            mat-stroked-button
            class="rounded-xl!"
            [disabled]="dunningRunning()"
            (click)="runDunning()"
            matTooltip="Relancer les abonnements impayés"
          >
            <mat-icon fontSet="material-symbols-outlined">forward_to_inbox</mat-icon>
            {{ dunningRunning() ? 'Relance…' : 'Relancer les impayés' }}
          </button>
        </panga-section-header>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-2xl border border-(--border) p-4">
            <p class="text-xs text-(--text-muted)">MRR réalisé</p>
            <p class="text-2xl font-semibold text-(--text) tabular-nums mt-0.5">
              {{ money(billing()?.mrr) }}
            </p>
            <p class="text-[11px] text-(--text-muted) mt-0.5">factures payées</p>
          </div>
          <div class="rounded-2xl p-4 text-white" style="background: var(--brand-gradient)">
            <p class="text-xs opacity-90">MRR théorique</p>
            <p class="text-2xl font-semibold tabular-nums mt-0.5">
              {{ money(billing()?.mrrStandard) }}
            </p>
            <p class="text-[11px] opacity-80 mt-0.5">catalogue · abonnements actifs</p>
          </div>
          <div class="rounded-2xl border border-(--border) p-4">
            <p class="text-xs text-(--text-muted)">ARR estimé</p>
            <p class="text-2xl font-semibold text-(--text) tabular-nums mt-0.5">
              {{ money(billing()?.arr) }}
            </p>
            <p class="text-[11px] text-(--text-muted) mt-0.5">projection annuelle</p>
          </div>
        </div>
      </section>

      <!-- Croissance -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="show_chart" title="Croissance">
          <span class="text-xs text-(--text-muted)"
            >Nouvelles écoles, élèves et revenus — 12 mois</span
          >
        </panga-section-header>
        @if (trends().length) {
          <panga-line-chart [categories]="trendMonths()" [series]="trendSeries()" [height]="300" />
        } @else {
          <panga-empty-state
            [compact]="true"
            icon="show_chart"
            title="Aucune tendance"
            description="Les séries mensuelles apparaîtront dès que des données seront disponibles."
          />
        }
      </section>

      <!-- Business SaaS -->
      <section class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5">
          <panga-section-header icon="donut_large" title="MRR par plan" />
          @if (billing()?.mrrByPlan?.length) {
            <panga-donut-chart [data]="billing()!.mrrByPlan" centerLabel="MRR" [height]="240" />
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="donut_large"
              title="Aucun plan"
              description="Répartition du MRR par offre d'abonnement."
            />
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
          <panga-section-header icon="notification_important" title="Alertes">
            <a mat-button class="text-sm!" [routerLink]="['/', 'platform', 'billing']">
              Voir la facturation
            </a>
          </panga-section-header>
          <div
            class="rounded-2xl p-4 flex items-center justify-between"
            [style.background]="
              (billing()?.pastDue ?? 0) > 0
                ? 'color-mix(in srgb, var(--danger) 10%, transparent)'
                : 'color-mix(in srgb, var(--success) 10%, transparent)'
            "
          >
            <div>
              <p class="text-xs text-(--text-muted)">Écoles impayées (past due)</p>
              <p class="text-2xl font-semibold text-(--text)">{{ fmt(billing()?.pastDue) }}</p>
            </div>
            <span
              class="material-symbols-outlined text-3xl"
              [style.color]="(billing()?.pastDue ?? 0) > 0 ? 'var(--danger)' : 'var(--success)'"
            >
              {{ (billing()?.pastDue ?? 0) > 0 ? 'error' : 'check_circle' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-(--border) p-3">
              <p class="text-xs text-(--text-muted)">Période d'essai</p>
              <p class="text-xl font-semibold text-(--text)">{{ fmt(billing()?.trial) }}</p>
            </div>
            <div class="rounded-2xl border border-(--border) p-3">
              <p class="text-xs text-(--text-muted)">Encours factures</p>
              <p class="text-xl font-semibold text-(--text)">
                {{ money(billing()?.outstanding) }}
              </p>
            </div>
          </div>

          @if (atRisk().length) {
            <div class="mt-1">
              <p class="text-xs font-medium text-(--text-muted) mb-2">Écoles à risque</p>
              <ul class="divide-y divide-(--border) rounded-2xl border border-(--border)">
                @for (row of atRisk(); track row.schoolId + row.invoiceId) {
                  <li>
                    <a
                      class="flex items-center gap-3 px-3 py-2.5 hover:bg-(--background) transition-colors"
                      [routerLink]="['/', 'platform', 'schools', row.schoolId]"
                    >
                      <span
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style="background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger)"
                      >
                        <span class="material-symbols-outlined text-[16px]">warning</span>
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-(--text) truncate">{{
                          row.name
                        }}</span>
                        <span class="block text-xs text-(--text-muted) truncate">{{
                          row.plan || 'Facture en attente'
                        }}</span>
                      </span>
                      <span class="text-sm font-semibold text-(--danger) tabular-nums shrink-0">
                        {{ money(row.amount) }}
                      </span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </section>

      <!-- Top écoles + répartition -->
      <section class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5 lg:col-span-2">
          <panga-section-header icon="leaderboard" title="Top 5 écoles par effectif">
            <a mat-button class="text-sm!" [routerLink]="['/', 'platform', 'schools']">
              Toutes les écoles
            </a>
          </panga-section-header>
          @if (overview()?.topSchools?.length) {
            <panga-bar-chart [data]="overview()!.topSchools" [height]="260" />
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="apartment"
              title="Aucune école"
              description="Le classement apparaîtra dès qu'il y aura des effectifs."
              actionLabel="Onboarder une école"
              (action)="goSchools()"
            />
          }
        </div>
        <div class="panga-card p-5">
          <panga-section-header icon="pie_chart" title="Classes — primaire / secondaire" />
          @if (cycleSplit().length) {
            <panga-donut-chart [data]="cycleSplit()" centerLabel="Classes" [height]="240" />
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="pie_chart"
              title="Pas de répartition"
              description="Répartition des classes par cycle scolaire."
            />
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

      <!-- Activité & système + actions -->
      <section class="grid gap-4 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5 lg:col-span-2 min-w-0">
          <panga-section-header icon="history" title="Activité récente">
            @if (activeSchoolId()) {
              <a
                mat-button
                class="text-sm!"
                [routerLink]="['/', 'platform', 'schools', activeSchoolId()]"
              >
                Voir l'école
              </a>
            } @else {
              <a mat-button class="text-sm!" [routerLink]="['/', 'platform', 'schools']">
                Choisir une école
              </a>
            }
          </panga-section-header>
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
                      {{ view.subtitle || a.actor || a.actorEmail || '—' }}
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
          } @else if (auditNeedsSchool()) {
            <panga-empty-state
              [compact]="true"
              icon="apartment"
              title="0cole requise"
              description="Sélectionnez une école pour consulter son journal d'audit."
              actionLabel="Voir les écoles"
              (action)="goSchools()"
            />
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="history"
              title="Aucun événement"
              description="L'activité récente de la plateforme s'affichera ici."
            />
          }
        </div>

        <div class="flex flex-col gap-4 min-w-0">
          <div class="panga-card p-5">
            <panga-section-header icon="monitor_heart" title="Système" />
            @if (health()) {
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm text-(--text-muted)">Statut</span>
                <panga-status-badge
                  [label]="healthLabel()"
                  [tone]="healthOk() ? 'success' : 'danger'"
                />
              </div>
              <panga-key-value [data]="health()?.info || health()?.details || health()" />
            } @else {
              <div class="flex items-center gap-2 text-sm text-(--text-muted)">
                <span class="material-symbols-outlined text-(--warning)">cloud_off</span>
                Santé indisponible
              </div>
            }
          </div>

          <div class="panga-card p-5">
            <panga-section-header icon="bolt" title="Actions rapides" />
            <div class="flex flex-col gap-2">
              <a
                mat-flat-button
                class="rounded-xl! justify-start!"
                [routerLink]="['/', 'platform', 'schools']"
              >
                <mat-icon fontSet="material-symbols-outlined">add_business</mat-icon>
                Onboarder une école
              </a>
              <a
                mat-stroked-button
                class="rounded-xl! justify-start!"
                [routerLink]="['/', 'platform', 'billing']"
              >
                <mat-icon fontSet="material-symbols-outlined">receipt_long</mat-icon>
                0mettre une facture
              </a>
              <a
                mat-stroked-button
                class="rounded-xl! justify-start!"
                [routerLink]="['/', 'platform', 'users']"
              >
                <mat-icon fontSet="material-symbols-outlined">person_add</mat-icon>
                Créer un compte
              </a>
              <a
                mat-stroked-button
                class="rounded-xl! justify-start!"
                [routerLink]="['/', 'platform', 'curriculum']"
              >
                <mat-icon fontSet="material-symbols-outlined">menu_book</mat-icon>
                Curriculum
              </a>
            </div>
          </div>
        </div>
      </section>
    }
  `,
  styles: [
    `
      a.hero-cta {
        background: #ffffff !important;
        color: #222026 !important;
      }
      a.hero-cta .mat-icon,
      a.hero-cta .material-symbols-outlined {
        color: #222026 !important;
      }
    `,
  ],
})
export class PlatformOverview {
  private readonly platform = inject(PlatformService);
  private readonly billingApi = inject(BillingService);
  private readonly schoolsApi = inject(SchoolsService);
  private readonly auditApi = inject(AuditService);
  private readonly system = inject(SystemService);
  private readonly tenant = inject(TenantService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly dunningRunning = signal(false);
  protected readonly refreshedAt = signal<Date | null>(null);

  protected readonly auditView = auditView;
  protected toneBg(t: AuditView['tone']): string {
    return TONE_BG[t];
  }
  protected toneFg(t: AuditView['tone']): string {
    return TONE_FG[t];
  }

  /** Relance les abonnements impayés (dunning). */
  runDunning(): void {
    if (this.dunningRunning()) {
      return;
    }
    this.dunningRunning.set(true);
    this.billingApi.runDunning().subscribe({
      next: () => {
        this.dunningRunning.set(false);
        this.notify.success('Relance des impayés lancée.');
      },
      error: () => this.dunningRunning.set(false),
    });
  }

  protected goSchools(): void {
    void this.router.navigate(['/', 'platform', 'schools']);
  }

  /** Le journal d'audit est cloisonné par école : indisponible sans contexte. */
  protected readonly activeSchoolId = computed(() => this.tenant.activeSchoolId());
  protected readonly auditNeedsSchool = computed(() => !this.tenant.activeSchoolId());

  protected readonly fmt = fmtNumber;
  protected money(n: number | null | undefined): string {
    return fmtMoney(n, this.currency());
  }

  protected readonly loading = signal(true);
  protected readonly overview = signal<OverviewData | null>(null);
  protected readonly trends = signal<TrendPoint[]>([]);
  protected readonly billing = signal<BillingMetrics | null>(null);
  protected readonly academic = signal<StatBlock | null>(null);
  protected readonly financial = signal<StatBlock | null>(null);
  protected readonly audit = signal<AuditLog[]>([]);
  protected readonly health = signal<HealthStatus | null>(null);
  protected readonly schoolNames = signal<Record<string, string>>({});
  protected readonly unpaidInvoices = signal<SaasInvoice[]>([]);

  protected readonly currency = computed(() => this.billing()?.currency || 'USD');

  /** Factures non payées regroupées (max 5) pour le panneau « écoles à risque ». */
  protected readonly atRisk = computed(() => {
    const names = this.schoolNames();
    const rows = this.unpaidInvoices()
      .filter((inv) => !!inv.schoolId)
      .map((inv) => ({
        schoolId: inv.schoolId!,
        invoiceId: inv.id,
        name: names[inv.schoolId!] || inv.schoolId || '0cole',
        plan: inv.subscriptionPlanOffered ?? '',
        amount: inv.amount ?? null,
      }));
    // Une ligne par école (plus gros encours d'abord).
    const bySchool = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const prev = bySchool.get(row.schoolId);
      if (!prev || (row.amount ?? 0) > (prev.amount ?? 0)) {
        bySchool.set(row.schoolId, row);
      }
    }
    return [...bySchool.values()].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 5);
  });

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
      invoices: safe(this.billingApi.listInvoices({ page: 1, limit: 50 })),
      schools: safe(this.schoolsApi.list({ page: 1, limit: 100 })),
      // L'audit exige un x-school-id : on n'appelle qu'avec une école active.
      audit: this.tenant.activeSchoolId()
        ? safe(this.auditApi.list({ page: 1, limit: 8 }))
        : of(null),
      health: safe(this.system.health()),
    }).subscribe((r) => {
      this.overview.set(normalizeOverview(r.overview));
      this.trends.set(normalizeTrends(r.trends));
      this.billing.set(r.billing ? normalizeBillingMetrics(r.billing) : null);
      this.academic.set(r.academic);
      this.financial.set(r.financial);
      this.audit.set(r.audit?.items ?? []);
      this.health.set(r.health);

      const names: Record<string, string> = {};
      for (const s of r.schools?.items ?? []) {
        names[s.id] = s.displayName || s.name || s.code || s.id;
      }
      this.schoolNames.set(names);

      const unpaid = (r.invoices?.items ?? []).filter((inv) => !isPaidInvoice(inv));
      this.unpaidInvoices.set(unpaid);

      this.refreshedAt.set(new Date());
      this.loading.set(false);
    });
  }
}

function isPaidInvoice(inv: SaasInvoice): boolean {
  const s = (inv.status ?? '').toLowerCase();
  return s === 'paid' || s === 'payée' || s === 'payee' || !!inv.paidAt;
}
