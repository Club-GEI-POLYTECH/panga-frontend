import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Entry {
  key: string;
  value: string;
}

/** Formate récursivement un objet en liste clé → valeur lisible. */
function toEntries(data: unknown, prefix = ''): Entry[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const out: Entry[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...toEntries(value, label));
    } else if (Array.isArray(value)) {
      out.push({ key: label, value: `${value.length} élément(s)` });
    } else {
      out.push({ key: label, value: value === null || value === undefined ? '—' : String(value) });
    }
  }
  return out;
}

/** Affiche un objet quelconque (stats backend) sous forme de définitions. */
@Component({
  selector: 'panga-key-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entries().length) {
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
        @for (e of entries(); track e.key) {
          <div class="flex justify-between gap-4 py-1.5 border-b border-[var(--border)]">
            <dt class="text-sm text-[var(--text-muted)] truncate" [title]="e.key">{{ e.key }}</dt>
            <dd class="text-sm font-medium text-[var(--text)] text-right break-all">
              {{ e.value }}
            </dd>
          </div>
        }
      </dl>
    } @else {
      <p class="text-sm text-[var(--text-muted)]">Aucune donnée.</p>
    }
  `,
})
export class KeyValue {
  readonly data = input<unknown>(null);
  protected readonly entries = computed(() => toEntries(this.data()));
}
