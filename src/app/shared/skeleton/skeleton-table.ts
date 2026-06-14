import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from './skeleton';

/** Squelette de tableau paginé (en-tête + N lignes). */
@Component({
  selector: 'panga-skeleton-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  template: `
    <div class="panga-card p-4">
      <div class="flex items-center gap-4 pb-3 border-b border-[var(--border)]">
        @for (c of cols(); track $index) {
          <panga-skeleton width="100%" height="0.9rem" />
        }
      </div>
      @for (r of rowsArray(); track $index) {
        <div class="flex items-center gap-4 py-3 border-b border-[var(--border)]">
          @for (c of cols(); track $index) {
            <panga-skeleton width="100%" height="0.8rem" />
          }
        </div>
      }
    </div>
  `,
})
export class SkeletonTable {
  readonly rows = input(6);
  readonly cols = input([1, 2, 3, 4]);

  protected rowsArray() {
    return Array.from({ length: this.rows() });
  }
}
