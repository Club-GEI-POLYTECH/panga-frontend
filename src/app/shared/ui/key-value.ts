import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Entry {
  key: string;
  value: string;
}

/** `totalGrades` / `total_grades` → « Total Grades ». */
function humanize(key: string): string {
  return key
    .replace(/[_.]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function format(value: number | string): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (typeof value === 'number' || (value !== '' && Number.isFinite(num))) {
    return num.toLocaleString('fr-FR');
  }
  return String(value);
}

/** Formate récursivement un objet en liste clé → valeur lisible. */
function toEntries(data: unknown, prefix = ''): Entry[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const out: Entry[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const label = prefix ? `${prefix} · ${humanize(key)}` : humanize(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...toEntries(value, label));
    } else if (Array.isArray(value)) {
      out.push({ key: label, value: `${value.length} élément(s)` });
    } else if (value === null || value === undefined) {
      out.push({ key: label, value: '—' });
    } else if (typeof value === 'boolean') {
      out.push({ key: label, value: value ? 'Oui' : 'Non' });
    } else {
      out.push({ key: label, value: format(value as number | string) });
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
