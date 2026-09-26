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
import { EmptyState } from '../../../shared/ui/empty-state';
import { Skeleton } from '../../../shared/skeleton/skeleton';
import { SkeletonCard } from '../../../shared/skeleton/skeleton-card';
import { LineChart, type LineSeries } from '../../../shared/ui/charts/line-chart';
import { auditView, type AuditView } from '../shared/audit-labels';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';
import { fmtMoney, fmtNumber } from '../../../shared/utils/format';

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

/** Devise par défaut des finances école (paiements admin). */
const SCHOOL_CURRENCY = 'CDF';

/** Tableau de bord d'un admin d'école (périmètre école). */
@Component({
  selector: 'panga-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    KpiCard,
    KeyValue,
    SectionHeader,
    EmptyState,
    Skeleton,
    SkeletonCard,
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
      <div
        class="absolute -bottom-16 -left-8 h-40 w-40 rounded-full opacity-10"
        style="background:#fff"
      ></div>

      <div class="relative flex flex-wrap items-end justify-between gap-4">
        <div>
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
          <div class="flex flex-wrap items-center gap-3 mt-3 text-xs opacity-90">
            @if (sy.selected()) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <span class="material-symbols-outlined text-[14px]">calendar_month</span>
                Année {{ sy.selected() }}
              </span>
            }
            @if (sy.needsSetup()) {
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style="background: color-mix(in srgb, var(--warning) 35%, transparent)"
              >
                Configurer l'année scolaire
              </span>
            }
            @if (refreshedAt()) {
              <span class="opacity-80">Mis à jour {{ refreshedAt() | date: 'dd/MM HH:mm' }}</span>
            }
          </div>
        </div>
        <a mat-flat-button class="hero-cta rounded-xl! shadow-sm" routerLink="/students">
          <mat-icon fontSet="material-symbols-outlined">person_add</mat-icon>
          Ajouter un élève
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
    } @else {
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <a routerLink="/students" class="block no-underline">
          <panga-kpi-card label="Élèves" [value]="fmt(overview()?.totalStudents)" icon="school" />
        </a>
        <a routerLink="/teachers" class="block no-underline">
          <panga-kpi-card
            label="Enseignants"
            [value]="fmt(overview()?.totalTeachers)"
            icon="badge"
          />
        </a>
        <a routerLink="/classes" class="block no-underline">
          <panga-kpi-card label="Classes" [value]="fmt(classesCount())" icon="meeting_room" />
        </a>
        <a routerLink="/payments" class="block no-underline">
          <panga-kpi-card
            label="Revenus du mois"
            [value]="money(overview()?.monthlyRevenue)"
            icon="payments"
            [trend]="overview()?.revenueDelta ?? null"
            [trendLabel]="deltaLabel()"
          />
        </a>
      </section>

      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="show_chart" title="Croissance (12 mois)">
          <span class="text-xs text-(--text-muted)">Nouveaux élèves et revenus</span>
        </panga-section-header>
        @if (trends().length) {
          <panga-line-chart [categories]="trendMonths()" [series]="trendSeries()" [height]="280" />
        } @else {
          <panga-empty-state
            [compact]="true"
            icon="show_chart"
            title="Aucune tendance"
            description="Les séries mensuelles apparaîtront dès que des données seront disponibles."
          />
        }
      </section>

      <section class="grid gap-4 grid-cols-1 lg:grid-cols-2 mb-6">
        <div class="panga-card p-5">
          <panga-section-header icon="menu_book" title="Académique" />
          @if (academic()) {
            <panga-key-value [data]="academic()" />
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="menu_book"
              title="Pas de données"
              description="Les indicateurs académiques de l'année s'afficheront ici."
            />
          }
        </div>
        <div class="panga-card p-5">
          <panga-section-header icon="account_balance" title="Finances">
            <a mat-button class="text-sm!" routerLink="/payments">Voir les paiements</a>
          </panga-section-header>
          @if (financial()) {
            <panga-key-value [data]="financial()" />
          } @else {
            <panga-empty-state
              [compact]="true"
              icon="account_balance"
              title="Pas de données"
              description="Les indicateurs financiers s'afficheront ici."
            />
          }
        </div>
      </section>

      <section class="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-6">
        <div class="panga-card p-5 lg:col-span-2 min-w-0">
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
            <panga-empty-state
              [compact]="true"
              icon="history"
              title="Aucun événement"
              description="L'activité récente de l'école s'affichera ici."
            />
          }
        </div>

        <div class="panga-card p-5">
          <panga-section-header icon="bolt" title="Actions rapides" />
          <div class="flex flex-col gap-2">
            <a mat-flat-button class="rounded-xl! justify-start!" routerLink="/students">
              <mat-icon fontSet="material-symbols-outlined">person_add</mat-icon>
              Ajouter un élève
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/classes">
              <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
              Créer une classe
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/teachers">
              <mat-icon fontSet="material-symbols-outlined">badge</mat-icon>
              Ajouter un enseignant
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/communications">
              <mat-icon fontSet="material-symbols-outlined">campaign</mat-icon>
              Publier une annonce
            </a>
            <a mat-stroked-button class="rounded-xl! justify-start!" routerLink="/payments">
              <mat-icon fontSet="material-symbols-outlined">payments</mat-icon>
              Enregistrer un paiement
            </a>
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
export class AdminDashboard {
  protected readonly store = inject(AuthStore);
  private readonly platform = inject(PlatformService);
  private readonly auditApi = inject(AuditService);
  protected readonly sy = inject(SchoolYearStore);

  protected readonly fmt = fmtNumber;
  protected readonly auditView = auditView;
  protected readonly refreshedAt = signal<Date | null>(null);

  protected money(n: number | null | undefined): string {
    return fmtMoney(n, SCHOOL_CURRENCY);
  }

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
    this.loadStatic();
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
      this.refreshedAt.set(new Date());
    });
  }

  /** `sy.filter()`: '' quand l'année courante est sélectionnée (backend la résout). */
  private loadYearScoped(): void {
    const safe = AdminDashboard.safe;
    const year = this.sy.filter();
    forkJoin({
      overview: safe(this.platform.overview(year)),
      academic: safe(this.platform.academicStats(year)),
    }).subscribe((r) => {
      this.overview.set(normalizeOverview(r.overview));
      this.academic.set(r.academic);
      this.refreshedAt.set(new Date());
      this.loading.set(false);
    });
  }
}
