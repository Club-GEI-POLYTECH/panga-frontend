import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bloc de chargement animé (shimmer). Brique de base des skeletons. */
@Component({
  selector: 'panga-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    class: 'panga-skeleton',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.borderRadius]': 'radius()',
  },
  styles: [
    `
      .panga-skeleton {
        display: block;
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--text) 6%, transparent) 25%,
          color-mix(in srgb, var(--text) 12%, transparent) 37%,
          color-mix(in srgb, var(--text) 6%, transparent) 63%
        );
        background-size: 400% 100%;
        animation: panga-shimmer 1.4s ease infinite;
      }
      @keyframes panga-shimmer {
        0% {
          background-position: 100% 0;
        }
        100% {
          background-position: -100% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .panga-skeleton {
          animation: none;
        }
      }
    `,
  ],
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly radius = input('0.5rem');
}
