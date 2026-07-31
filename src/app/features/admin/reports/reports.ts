import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ReportsService, type ClassStats } from './reports.service';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance } from '../models/admin.models';
import { TERM_OPTIONS } from '../../../core/models/grade.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

interface Bracket {
  label: string;
  count: number;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rapports statistiques par classe (répartition, stats, export). */
@Component({
  selector: 'panga-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    PageHeader,
    SectionHeader,
    EmptyState,
    KpiCard,
  ],
  template: `
    <panga-page-header icon="analytics" title="Rapports" subtitle="Statistiques par classe">
      @if (classId()) {
        <button mat-stroked-button class="rounded-xl!" (click)="exportExcel()">
          <mat-icon fontSet="material-symbols-outlined">file_download</mat-icon> Export Excel
        </button>
      }
    </panga-page-header>

    <div class="panga-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-45" subscriptSizing="dynamic">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="flex-1 min-w-36" subscriptSizing="dynamic">
        <mat-label>Trimestre</mat-label>
        <mat-select [value]="term()" (selectionChange)="setTerm($event.value)">
          <mat-option [value]="''">Annuel</mat-option>
          @for (o of terms; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="analytics"
          title="Choisissez une classe"
          description="Sélectionnez une classe pour afficher ses statistiques."
        />
      </div>
    } @else if (loading()) {
      <p class="text-sm text-(--text-muted) py-6 text-center">Calcul en cours…</p>
    } @else {
      <!-- KPIs -->
      <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 mb-6">
        <panga-kpi-card label="Effectif" [value]="num(stats()?.studentCount)" icon="group" />
        <panga-kpi-card label="Moyenne" [value]="pct(stats()?.average)" icon="functions" />
        <panga-kpi-card label="Réussite" [value]="pct(stats()?.passRate)" icon="verified" />
        <panga-kpi-card label="Écart-type" [value]="num(stats()?.stdDev)" icon="show_chart" />
      </section>

      <section class="grid gap-4 sm:grid-cols-3 mb-6">
        <div class="panga-card p-4">
          <p class="text-xs text-(--text-muted)">Médiane</p>
          <p class="text-xl font-semibold text-(--text)">{{ pct(stats()?.median) }}</p>
        </div>
        <div class="panga-card p-4">
          <p class="text-xs text-(--text-muted)">Minimum</p>
          <p class="text-xl font-semibold text-(--text)">{{ pct(stats()?.min) }}</p>
        </div>
        <div class="panga-card p-4">
          <p class="text-xs text-(--text-muted)">Maximum</p>
          <p class="text-xl font-semibold text-(--text)">{{ pct(stats()?.max) }}</p>
        </div>
      </section>

      <!-- Répartition -->
      <section class="panga-card p-5">
        <panga-section-header icon="bar_chart" title="Répartition des moyennes" />
        @if (brackets().length === 0) {
          <panga-empty-state
            icon="bar_chart"
            title="Aucune donnée"
            description="Aucune moyenne calculée pour ce filtre."
          />
        } @else {
          <div class="flex flex-col gap-2">
            @for (b of brackets(); track b.label) {
              <div class="flex items-center gap-3">
                <span class="w-20 shrink-0 text-xs text-(--text-muted)">{{ b.label }}</span>
                <div
                  class="flex-1 h-5 rounded-lg overflow-hidden"
                  style="background: color-mix(in srgb, var(--text-muted) 12%, transparent)"
                >
                  <div
                    class="h-full rounded-lg"
                    [style.width.%]="barWidth(b.count)"
                    style="background: var(--brand-gradient)"
                  ></div>
                </div>
                <span class="w-8 shrink-0 text-right text-sm font-medium text-(--text)">{{
                  b.count
                }}</span>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class Reports {
  private readonly reportsApi = inject(ReportsService);
  private readonly classesApi = inject(ClassesService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly terms = TERM_OPTIONS;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly term = signal('');
  protected readonly loading = signal(false);
  protected readonly stats = signal<ClassStats | null>(null);
  protected readonly brackets = signal<Bracket[]>([]);

  private year(): string {
    return this.sy.filter() || this.sy.current();
  }

  constructor() {
    effect(() => {
      this.sy.selected();
      untracked(() => this.loadClasses());
    });
  }

  private loadClasses(): void {
    this.classesApi.list(this.year()).subscribe({ next: (r) => this.classes.set(r.items) });
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.load();
  }
  setTerm(t: string): void {
    this.term.set(t);
    if (this.classId()) {
      this.load();
    }
  }

  private load(): void {
    const id = this.classId();
    if (!id) {
      return;
    }
    const term = this.term() || undefined;
    this.loading.set(true);
    forkJoin({
      stats: this.reportsApi.stats(id, this.year(), term).pipe(catchError(() => of(null))),
      dist: this.reportsApi.distribution(id, this.year(), term).pipe(catchError(() => of(null))),
    }).subscribe((r) => {
      this.stats.set(r.stats);
      this.brackets.set(this.toBrackets(r.dist));
      this.loading.set(false);
    });
  }

  /** Normalise la répartition (objet `{ "50-60": n }` ou tableau) en barres. */
  private toBrackets(dist: unknown): Bracket[] {
    if (!dist) {
      return [];
    }
    if (Array.isArray(dist)) {
      return dist.map((d) => {
        const o = (d ?? {}) as Record<string, unknown>;
        return {
          label: String(o['label'] ?? o['range'] ?? o['bracket'] ?? ''),
          count: Number(o['count'] ?? o['value'] ?? 0),
        };
      });
    }
    return Object.entries(dist as Record<string, unknown>).map(([label, count]) => ({
      label,
      count: Number(count) || 0,
    }));
  }

  protected barWidth(count: number): number {
    const max = Math.max(...this.brackets().map((b) => b.count), 1);
    return Math.round((count / max) * 100);
  }

  protected num(v: unknown): string {
    if (v === null || v === undefined) {
      return '—';
    }
    const n = Number(v);
    return Number.isFinite(n) ? `${Math.round(n * 100) / 100}` : '—';
  }
  protected pct(v: unknown): string {
    if (v === null || v === undefined) {
      return '—';
    }
    const n = Number(v);
    return Number.isFinite(n) ? `${Math.round(n)}%` : '—';
  }

  exportExcel(): void {
    this.reportsApi.exportExcel(this.classId(), this.year(), this.term() || undefined).subscribe({
      next: (b) => downloadBlob(b, 'rapport_classe.xlsx'),
      error: () => this.notify.error('Export indisponible.'),
    });
  }
}
