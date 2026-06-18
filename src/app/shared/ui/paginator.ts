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
      <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span class="text-(--text-muted)">
          {{ from() }}–{{ to() }} <span class="opacity-70">sur</span> {{ m.total }}
        </span>
        <div class="flex items-center gap-1">
          <button
            mat-icon-button
            class="h-9! w-9!"
            [disabled]="m.page <= 1"
            (click)="go(m.page - 1)"
            aria-label="Page précédente"
          >
            <mat-icon fontSet="material-symbols-outlined">chevron_left</mat-icon>
          </button>
          <span class="px-2 text-(--text-muted) tabular-nums">
            {{ m.page }} / {{ m.totalPages || 1 }}
          </span>
          <button
            mat-icon-button
            class="h-9! w-9!"
            [disabled]="m.page >= (m.totalPages || 1)"
            (click)="go(m.page + 1)"
            aria-label="Page suivante"
          >
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
