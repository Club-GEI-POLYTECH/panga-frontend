import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { PaginationMeta } from '../../core/models/api.models';

/** Paginateur compact : « X–Y sur Z » + précédent/suivant. */
@Component({
  selector: 'panga-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (meta(); as m) {
      <div
        class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--border)"
      >
        <span class="text-sm text-(--text-muted)">
          <span class="font-semibold text-(--text) tabular-nums">{{ from() }}–{{ to() }}</span>
          sur <span class="font-semibold text-(--text) tabular-nums">{{ m.total }}</span>
        </span>
        <div class="flex items-center gap-2">
          <button
            mat-stroked-button
            class="rounded-xl!"
            [disabled]="m.page <= 1"
            (click)="go(m.page - 1)"
            aria-label="Page précédente"
          >
            <mat-icon fontSet="material-symbols-outlined">chevron_left</mat-icon>
            <span class="hidden sm:inline">Précédent</span>
          </button>
          <span
            class="px-3 py-1.5 rounded-lg text-sm font-semibold text-(--brand-700) tabular-nums whitespace-nowrap"
            style="background: color-mix(in srgb, var(--brand-500) 12%, transparent)"
          >
            Page {{ m.page }} / {{ m.totalPages || 1 }}
          </span>
          <button
            mat-stroked-button
            class="rounded-xl!"
            [disabled]="m.page >= (m.totalPages || 1)"
            (click)="go(m.page + 1)"
            aria-label="Page suivante"
          >
            <span class="hidden sm:inline">Suivant</span>
            <mat-icon fontSet="material-symbols-outlined">chevron_right</mat-icon>
          </button>
        </div>
      </div>
    }
  `,
})
export class Paginator {
  readonly meta = input<PaginationMeta | null>(null);
  readonly pageChange = output<number>();

  protected readonly from = computed(() => {
    const m = this.meta();
    return m && m.total > 0 ? (m.page - 1) * m.limit + 1 : 0;
  });
  protected readonly to = computed(() => {
    const m = this.meta();
    return m ? Math.min(m.page * m.limit, m.total) : 0;
  });

  protected go(page: number): void {
    const m = this.meta();
    if (m && page >= 1 && page <= (m.totalPages || 1)) {
      this.pageChange.emit(page);
    }
  }
}
