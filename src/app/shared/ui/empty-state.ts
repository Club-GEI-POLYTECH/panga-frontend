import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** État vide illustré, avec action optionnelle. */
@Component({
  selector: 'panga-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div
      class="flex flex-col items-center justify-center text-center px-6"
      [class.py-14]="!compact()"
      [class.py-6]="compact()"
    >
      <div
        class="flex items-center justify-center rounded-3xl mb-4"
        [class.h-16]="!compact()"
        [class.w-16]="!compact()"
        [class.h-12]="compact()"
        [class.w-12]="compact()"
        style="background: color-mix(in srgb, var(--brand-500) 12%, transparent)"
      >
        <mat-icon fontSet="material-symbols-outlined" style="color: var(--brand-500)">
          {{ icon() }}
        </mat-icon>
      </div>
      <h3
        class="font-semibold text-(--text)"
        [class.text-lg]="!compact()"
        [class.text-base]="compact()"
      >
        {{ title() }}
      </h3>
      @if (description()) {
        <p class="text-sm text-(--text-muted) mt-1 max-w-sm">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <button mat-flat-button class="mt-5 rounded-xl!" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly actionLabel = input<string>('');
  readonly compact = input(false);
  readonly action = output<void>();
}
