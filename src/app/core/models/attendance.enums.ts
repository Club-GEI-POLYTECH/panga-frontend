/**
 * Options alignées sur les enums backend `AttendanceStatus` / `AttendanceType`
 * (module grades / attendance). Les `value` DOIVENT correspondre exactement.
 */
import type { BadgeTone } from '../../shared/ui/status-badge';

/**
 * Enums backend stricts. Les `value` DOIVENT correspondre exactement au contrat
 * (module attendance) — toute valeur hors union est rejetée en 400 par le backend
 * (ValidationPipe whitelist).
 */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'sick';
export type AttendanceType = 'daily' | 'period' | 'subject' | 'event' | 'exam';

export interface StatusOption {
  value: AttendanceStatus;
  label: string;
  tone: BadgeTone;
}

/** Attendance.status — `AttendanceStatus` (les 5 valeurs du contrat, pas plus). */
export const ATTENDANCE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'present', label: 'Présent', tone: 'success' },
  { value: 'absent', label: 'Absent', tone: 'danger' },
  { value: 'late', label: 'En retard', tone: 'warning' },
  { value: 'excused', label: 'Excusé', tone: 'brand' },
  { value: 'sick', label: 'Malade', tone: 'info' },
];

/**
 * Statuts considérés comme une absence (au sens rapport/justification).
 * Littéraux vérifiés contre `AttendanceStatus`, exposés en `ReadonlySet<string>`
 * pour tester des `status` bruts venant de l'API.
 */
export const ABSENCE_STATUSES: ReadonlySet<string> = new Set<AttendanceStatus>([
  'absent',
  'sick',
  'excused',
]);

/**
 * Modes de pointage exposés par la feuille du jour. Le contrat `AttendanceType`
 * accepte aussi `subject·event·exam`, réservés à d'autres flux (examens, événements)
 * non couverts par cet écran — d'où la restriction volontaire à `daily·period`.
 */
export const ATTENDANCE_TYPE_OPTIONS: {
  value: Extract<AttendanceType, 'daily' | 'period'>;
  label: string;
}[] = [
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
