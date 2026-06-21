import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * En-tête de page cohérent : pastille d'icône dégradée + titre + sous-titre,
 * avec une zone d'actions projetée (boutons) alignée à droite.
 */
@Component({
  selector: 'panga-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3.5 min-w-0">
        @if (icon()) {
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl text-white shrink-0 shadow-sm"
            style="background: var(--brand-gradient)"
          >
            <span class="material-symbols-outlined">{{ icon() }}</span>
          </div>
        }
        <div class="min-w-0">
          <h1
            class="text-2xl font-semibold text-(--text) truncate"
            style="font-family: Urbanist, sans-serif"
          >
            {{ title() }}
          </h1>
          @if (subtitle()) {
            <p class="text-sm text-(--text-muted) truncate">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ng-content></ng-content>
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly icon = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
