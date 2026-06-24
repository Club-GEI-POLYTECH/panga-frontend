import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

/** Palettes dérivées d'un nom pour varier les avatars sans image. */
const GRADIENTS = [
  'linear-gradient(135deg, #6fbb31 0%, #a7e46a 100%)',
  'linear-gradient(135deg, #2b7fa8 0%, #a8dff8 100%)',
  'linear-gradient(135deg, #222026 0%, #4a4750 100%)',
  'linear-gradient(135deg, #559426 0%, #bde97f 100%)',
  'linear-gradient(135deg, #3a7d9a 0%, #7fc6e8 100%)',
  'linear-gradient(135deg, #437320 0%, #8fd34a 100%)',
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Avatar : photo si `imageUrl`, sinon initiales sur dégradé déterministe. */
@Component({
  selector: 'panga-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imageUrl() && !failed()) {
      <img
        [src]="imageUrl()"
        [alt]="name()"
        (error)="failed.set(true)"
        class="rounded-xl object-cover shrink-0 shadow-sm"
        [style.width.px]="size()"
        [style.height.px]="size()"
      />
    } @else {
      <div
        class="flex items-center justify-center rounded-xl font-semibold text-white shrink-0 shadow-sm"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [style.fontSize.px]="size() * 0.38"
        [style.background]="gradient()"
      >
        {{ initials() }}
      </div>
    }
  `,
})
export class Avatar {
  readonly name = input<string>('');
  readonly size = input(40);
  /** URL d'une photo ; si absente ou en erreur, on affiche les initiales. */
  readonly imageUrl = input<string | null>(null);

  /** Repli sur les initiales si l'image ne charge pas (404, réseau…). */
  protected readonly failed = signal(false);

  constructor() {
    // Réinitialise l'état d'erreur quand l'URL change.
    effect(() => {
      this.imageUrl();
      this.failed.set(false);
    });
  }

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  protected readonly gradient = computed(
    () => GRADIENTS[hash(this.name() || '?') % GRADIENTS.length],
  );
}
