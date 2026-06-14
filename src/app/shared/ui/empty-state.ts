import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** État vide illustré, avec action optionnelle. */
@Component({
  selector: 'panga-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col items-center justify-center text-center py-14 px-6">
      <div
        class="flex h-16 w-16 items-center justify-center rounded-3xl mb-4"
        style="background: color-mix(in srgb, var(--brand-500) 12%, transparent)"
      >
        <mat-icon fontSet="material-symbols-outlined" style="color: var(--brand-500)">
          {{ icon() }}
        </mat-icon>
      </div>
      <h3 class="text-lg font-semibold text-[var(--text)]">{{ title() }}</h3>
      @if (description()) {
        <p class="text-sm text-[var(--text-muted)] mt-1 max-w-sm">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <button mat-flat-button class="mt-5" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly actionLabel = input<string>('');
  readonly action = output<void>();
}
