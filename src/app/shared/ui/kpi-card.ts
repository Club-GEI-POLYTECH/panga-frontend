import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Carte KPI : icône + libellé + valeur + tendance optionnelle. */
@Component({
  selector: 'panga-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="panga-card p-5 flex items-start gap-4">
      @if (icon()) {
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
          style="background: var(--brand-gradient)"
        >
          <mat-icon fontSet="material-symbols-outlined">{{ icon() }}</mat-icon>
        </div>
      }
      <div class="min-w-0">
        <p class="text-sm text-[var(--text-muted)] truncate">{{ label() }}</p>
        <p class="text-2xl font-semibold text-[var(--text)]">{{ value() }}</p>
        @if (trend() !== null) {
          <p
            class="text-xs mt-1 font-medium"
            [style.color]="(trend() ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)'"
          >
            {{ (trend() ?? 0) >= 0 ? '▲' : '▼' }} {{ trendLabel() }}
          </p>
        }
      </div>
    </div>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string | null>(null);
  readonly trend = input<number | null>(null);
  readonly trendLabel = input<string>('');
}
