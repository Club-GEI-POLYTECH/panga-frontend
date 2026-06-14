import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlatformService } from '../services/platform.service';
import type { StatBlock } from '../models/platform.models';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { KeyValue } from '../../../shared/ui/key-value';

interface Block {
  title: string;
  icon: string;
  data: StatBlock | null;
}

interface Kpi {
  label: string;
  value: string;
  icon: string;
}

function humanize(key: string): string {
  return key
    .replace(/[_.]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Devine une icône Material à partir du libellé d'une métrique. */
function iconFor(label: string, fallback: string): string {
  const l = label.toLowerCase();
  if (l.includes('school') || l.includes('école') || l.includes('ecole')) return 'apartment';
  if (l.includes('student') || l.includes('élève') || l.includes('eleve')) return 'school';
  if (l.includes('teacher') || l.includes('enseign')) return 'badge';
  if (l.includes('user') || l.includes('utilis')) return 'group';
  if (l.includes('revenue') || l.includes('amount') || l.includes('paid') || l.includes('finan'))
    return 'payments';
  if (l.includes('invoice') || l.includes('facture')) return 'receipt_long';
  if (l.includes('active') || l.includes('actif')) return 'check_circle';
  return fallback;
}

/** Extrait jusqu'à 8 métriques numériques pour la grille de KPIs. */
function extractKpis(blocks: Block[]): Kpi[] {
  const seen = new Set<string>();
  const kpis: Kpi[] = [];
  for (const block of blocks) {
    if (!block.data) continue;
    for (const [key, value] of Object.entries(block.data)) {
      const num = typeof value === 'number' ? value : Number(value);
      if (typeof value !== 'object' && value !== '' && value !== null && Number.isFinite(num)) {
        const label = humanize(key);
        const dedup = label.toLowerCase();
        if (!seen.has(dedup)) {
          seen.add(dedup);
          kpis.push({ label, value: String(value), icon: iconFor(key, block.icon) });
        }
      }
      if (kpis.length >= 8) return kpis;
    }
  }
  return kpis;
}

/** Vue d'ensemble plateforme : agrège dashboard, métriques et stats globales. */
@Component({
  selector: 'panga-platform-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, KpiCard, KeyValue],
  template: `
    <header
      class="relative overflow-hidden rounded-3xl p-7 mb-6 text-white"
      style="background: var(--brand-gradient)"
    >
      <div
        class="absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20"
        style="background: #fff"
      ></div>
      <p class="text-sm opacity-90 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-base">verified_user</span> Espace plateforme
      </p>
      <h1 class="text-2xl sm:text-3xl font-semibold mt-1" style="font-family: Poppins, sans-serif">
        Vue d'ensemble Super Admin
      </h1>
      <p class="text-sm opacity-90 mt-1">Indicateurs agrégés sur l'ensemble des écoles</p>
    </header>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      @if (kpis().length) {
        <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          @for (kpi of kpis(); track kpi.label) {
            <panga-kpi-card [label]="kpi.label" [value]="kpi.value" [icon]="kpi.icon" />
          }
        </section>
      }

      <section class="grid gap-4 grid-cols-1 lg:grid-cols-2">
        @for (block of blocks(); track block.title) {
          <div class="panga-card p-5">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0"
                style="background: var(--brand-gradient)"
              >
                <span class="material-symbols-outlined text-[20px]">{{ block.icon }}</span>
              </div>
              <h2 class="text-base font-semibold text-[var(--text)]">{{ block.title }}</h2>
            </div>
            <panga-key-value [data]="block.data" />
          </div>
        }
      </section>
    }
  `,
})
export class PlatformOverview {
  private readonly platform = inject(PlatformService);

  protected readonly loading = signal(true);
  protected readonly blocks = signal<Block[]>([]);
  protected readonly kpis = signal<Kpi[]>([]);

  constructor() {
    const safe = (o: Observable<StatBlock>): Observable<StatBlock | null> =>
      o.pipe(catchError(() => of(null)));

    forkJoin({
      me: safe(this.platform.myDashboard()),
      overview: safe(this.platform.overview()),
      schools: safe(this.platform.schoolsMetrics()),
      students: safe(this.platform.studentsStats()),
      teachers: safe(this.platform.teachersStats()),
      academic: safe(this.platform.academicStats()),
      financial: safe(this.platform.financialStats()),
    }).subscribe((r) => {
      const blocks: Block[] = [
        { title: 'Mon tableau de bord', icon: 'account_circle', data: r.me },
        { title: "Vue d'ensemble", icon: 'insights', data: r.overview },
        { title: 'Métriques écoles', icon: 'apartment', data: r.schools },
        { title: 'Élèves', icon: 'school', data: r.students },
        { title: 'Enseignants', icon: 'badge', data: r.teachers },
        { title: 'Académique', icon: 'menu_book', data: r.academic },
        { title: 'Financier', icon: 'payments', data: r.financial },
      ];
      this.blocks.set(blocks);
      this.kpis.set(extractKpis(blocks));
      this.loading.set(false);
    });
  }
}
