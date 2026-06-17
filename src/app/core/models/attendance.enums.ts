/**
 * Options alignées sur les enums backend `AttendanceStatus` / `AttendanceType`
 * (module grades / attendance). Les `value` DOIVENT correspondre exactement.
 */
import type { BadgeTone } from '../../shared/ui/status-badge';

export interface StatusOption {
  value: string;
  label: string;
  tone: BadgeTone;
}

/** Attendance.status — `AttendanceStatus`. */
export const ATTENDANCE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'present', label: 'Présent', tone: 'success' },
  { value: 'absent', label: 'Absent', tone: 'danger' },
  { value: 'late', label: 'En retard', tone: 'warning' },
  { value: 'excused', label: 'Excusé', tone: 'brand' },
  { value: 'sick', label: 'Malade', tone: 'info' },
  { value: 'leave', label: 'Congé', tone: 'neutral' },
  { value: 'suspended', label: 'Suspendu', tone: 'danger' },
  { value: 'other', label: 'Autre', tone: 'neutral' },
];

/** Statuts considérés comme une absence (au sens rapport/justification). */
export const ABSENCE_STATUSES = new Set(['absent', 'suspended', 'sick', 'leave', 'excused']);

/** Attendance.attendanceType — modes de pointage exposés à l'UI. */
export const ATTENDANCE_TYPE_OPTIONS: { value: 'daily' | 'period'; label: string }[] = [
  { value: 'daily', label: 'Journée' },
  { value: 'period', label: 'Par cours' },
];

const TONE_COLOR: Record<BadgeTone, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: '#3b82f6',
  brand: 'var(--brand-500)',
  neutral: 'var(--text-muted)',
};

export function statusOption(value: string | undefined): StatusOption | undefined {
  return ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === value);
}
export function statusLabel(value: string | undefined): string {
  return statusOption(value)?.label ?? value ?? '—';
}
export function statusColor(value: string | undefined): string {
  return TONE_COLOR[statusOption(value)?.tone ?? 'neutral'];
}
export function statusTone(value: string | undefined): BadgeTone {
  return statusOption(value)?.tone ?? 'neutral';
}
