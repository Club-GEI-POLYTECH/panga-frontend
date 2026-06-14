import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: 'color-mix(in srgb, var(--success) 14%, transparent)', fg: 'var(--success)' },
  warning: { bg: 'color-mix(in srgb, var(--warning) 16%, transparent)', fg: 'var(--warning)' },
  danger: { bg: 'color-mix(in srgb, var(--danger) 14%, transparent)', fg: 'var(--danger)' },
  info: { bg: 'color-mix(in srgb, #3b82f6 14%, transparent)', fg: '#3b82f6' },
  brand: { bg: 'color-mix(in srgb, var(--brand-500) 14%, transparent)', fg: 'var(--brand-700)' },
  neutral: {
    bg: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
    fg: 'var(--text-muted)',
  },
};

/** Pastille de statut colorée (point + libellé). */
@Component({
  selector: 'panga-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      [style.background]="palette().bg"
      [style.color]="palette().fg"
    >
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full" [style.background]="palette().fg"></span>
      }
      {{ label() }}
    </span>
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');
  readonly dot = input(true);
  protected readonly palette = computed(() => TONES[this.tone()]);
}
