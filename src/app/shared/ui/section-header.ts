import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * En-tête de section : pastille d'icône teintée + titre + compteur optionnel,
 * avec zone d'actions projetée à droite. Uniformise les cartes de contenu.
 */
@Component({
  selector: 'panga-section-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2.5 min-w-0">
        @if (icon()) {
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style="background: color-mix(in srgb, var(--brand-500) 12%, transparent)"
          >
            <span class="material-symbols-outlined text-[18px] text-[var(--brand-500)]">{{
              icon()
            }}</span>
          </span>
        }
        <h2 class="text-base font-semibold text-[var(--text)] truncate">{{ title() }}</h2>
        @if (count() !== null) {
          <span class="text-sm font-normal text-[var(--text-muted)] shrink-0">({{ count() }})</span>
        }
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class SectionHeader {
  readonly icon = input<string>('');
  readonly title = input.required<string>();
  readonly count = input<number | null>(null);
}
