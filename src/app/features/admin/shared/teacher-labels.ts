import type { BadgeTone } from '../../../shared/ui/status-badge';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  QUALIFICATION_LEVEL_OPTIONS,
} from '../../../core/models/teacher.enums';

function labelFrom(options: { value: string; label: string }[], value?: string | null): string {
  if (!value) {
    return '';
  }
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

export function employmentLabel(value?: string | null): string {
  return labelFrom(EMPLOYMENT_TYPE_OPTIONS, value);
}

export function qualificationLabel(value?: string | null): string {
  return labelFrom(QUALIFICATION_LEVEL_OPTIONS, value);
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  on_leave: 'warning',
  suspended: 'danger',
  terminated: 'danger',
  retired: 'neutral',
  inactive: 'neutral',
};

export function teacherStatusTone(status?: string | null): BadgeTone {
  return (status && STATUS_TONE[status]) || 'neutral';
}
