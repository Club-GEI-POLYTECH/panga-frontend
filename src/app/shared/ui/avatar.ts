import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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
