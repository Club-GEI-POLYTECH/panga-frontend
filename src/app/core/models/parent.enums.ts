/**
 * Options alignées sur les enums backend du module parents
 * (`parents.enums.ts`). Les `value` DOIVENT correspondre exactement.
 */
import type { EnumOption } from './school.enums';
import type { BadgeTone } from '../../shared/ui/status-badge';

/** Parent.relationship — `RelationshipType`. */
export const RELATIONSHIP_OPTIONS: EnumOption[] = [
  { value: 'father', label: 'Père' },
  { value: 'mother', label: 'Mère' },
  { value: 'guardian', label: 'Tuteur / Tutrice' },
  { value: 'step_father', label: 'Beau-père' },
  { value: 'step_mother', label: 'Belle-mère' },
  { value: 'grandfather', label: 'Grand-père' },
  { value: 'grandmother', label: 'Grand-mère' },
  { value: 'uncle', label: 'Oncle' },
  { value: 'aunt', label: 'Tante' },
  { value: 'sibling', label: 'Frère / Sœur' },
  { value: 'other', label: 'Autre' },
];

/** Parent.status — `ParentStatus`. */
export const PARENT_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'deceased', label: 'Décédé(e)' },
];

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  deceased: 'danger',
};

export function parentStatusTone(status: string | undefined): BadgeTone {
  return STATUS_TONE[status ?? ''] ?? 'neutral';
}

export function parentLabel(options: EnumOption[], value: string | undefined | null): string {
  if (!value) {
    return '—';
  }
  return options.find((o) => o.value === value)?.label ?? value;
}
