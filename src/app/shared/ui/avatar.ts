import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Palettes dérivées d'un nom pour varier les avatars sans image. */
const GRADIENTS = [
  'linear-gradient(135deg, #0e7490 0%, #14b8a6 55%, #2dd4bf 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
  'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
  'linear-gradient(135deg, #db2777 0%, #f472b6 100%)',
  'linear-gradient(135deg, #059669 0%, #34d399 100%)',
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Avatar à initiales, dégradé déterministe basé sur le nom. */
@Component({
  selector: 'panga-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-center rounded-xl font-semibold text-white shrink-0 shadow-sm"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.fontSize.px]="size() * 0.38"
      [style.background]="gradient()"
    >
      {{ initials() }}
    </div>
  `,
})
export class Avatar {
  readonly name = input<string>('');
  readonly size = input(40);

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
