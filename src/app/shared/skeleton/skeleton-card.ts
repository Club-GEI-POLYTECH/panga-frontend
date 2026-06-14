import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from './skeleton';

/** Squelette de carte (en-tête + lignes de contenu). */
@Component({
  selector: 'panga-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  template: `
    <div class="panga-card p-5 space-y-4">
      <panga-skeleton width="44px" height="44px" radius="0.75rem" />
      <panga-skeleton width="60%" height="1.1rem" />
      <panga-skeleton width="90%" height="0.85rem" />
      <panga-skeleton width="75%" height="0.85rem" />
    </div>
  `,
})
export class SkeletonCard {}
