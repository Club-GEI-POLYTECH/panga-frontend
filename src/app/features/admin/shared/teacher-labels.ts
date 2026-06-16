import type { BadgeTone } from '../../../shared/ui/status-badge';

const EMPLOYMENT: Record<string, string> = {
  full_time: 'Temps plein',
  part_time: 'Temps partiel',
  contract: 'Contrat',
  temporary: 'Temporaire',
  volunteer: 'Bénévole',
  intern: 'Stagiaire',
};

export function employmentLabel(value?: string | null): string {
  if (!value) {
    return '';
  }
  return EMPLOYMENT[value] ?? value.replace(/_/g, ' ');
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
