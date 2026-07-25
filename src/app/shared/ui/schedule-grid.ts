import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { scheduleDayName, type ScheduleSlot } from '../schedule';

/**
 * Grille hebdomadaire d'emploi du temps en lecture seule, groupée par jour.
 * Réutilisée par les vues élève, parent et enseignant.
 */
@Component({
  selector: 'panga-schedule-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      @for (d of days(); track d) {
        <div>
          <p class="text-sm font-semibold text-(--text) mb-2">{{ dayName(d) }}</p>
          <div class="space-y-2">
            @for (s of slotsOfDay(d); track $index) {
              <div class="flex items-center gap-3 rounded-xl border border-(--border) px-3 py-2">
                <span class="text-xs font-medium tabular-nums text-(--brand-700) w-24 shrink-0">
                  {{ s.start }}–{{ s.end }}
                </span>
                <span class="text-sm text-(--text) truncate flex-1">{{ s.label }}</span>
                @if (s.room) {
                  <span class="text-xs text-(--text-muted)">{{ s.room }}</span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ScheduleGrid {
  readonly slots = input<ScheduleSlot[]>([]);
  protected readonly dayName = scheduleDayName;

  protected readonly days = computed(() =>
    [...new Set(this.slots().map((s) => s.day))].sort((a, b) => a - b),
  );

  protected slotsOfDay(d: number): ScheduleSlot[] {
    return this.slots()
      .filter((s) => s.day === d)
      .sort((a, b) => a.start.localeCompare(b.start));
  }
}
