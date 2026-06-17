/**
 * Modèles « présences » (module attendance). Champs optionnels + index
 * signature : on s'appuie sur des mappers tolérants côté service.
 */
import type { ClassScheduleSlot } from './admin.models';

/** Ligne de présence (table `attendances`). */
export interface Attendance {
  id: string;
  studentId?: string;
  classId?: string;
  date?: string;
  status?: string;
  attendanceType?: string;
  classScheduleSlotId?: string | null;
  isLate?: boolean;
  lateMinutes?: number | null;
  isExcused?: boolean;
  excuseReason?: string | null;
  excuseDocument?: string | null;
  excuseApproved?: boolean;
  medicalCertificate?: string | null;
  parentNotified?: boolean;
  notes?: string | null;
  student?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Réponse de la feuille du jour : créneaux + lignes déjà saisies. */
export interface DailySheet {
  slots: ClassScheduleSlot[];
  entries: Attendance[];
}

/** Stats d'assiduité d'un élève (GET .../students/:id/stats). */
export interface StudentAttendanceStats {
  total?: number;
  present?: number;
  absent?: number;
  late?: number;
  excused?: number;
  unjustifiedAbsences?: number;
  attendanceRate?: number;
  [key: string]: unknown;
}

/** Ligne du rapport d'absences par classe. */
export interface ClassReportRow {
  studentId?: string;
  studentName?: string;
  absences?: number;
  justifiedAbsences?: number;
  unjustifiedAbsences?: number;
  lates?: number;
  overLimit?: boolean;
  attendanceRate?: number;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface UpsertAttendanceDto {
  studentId: string;
  classInstanceId: string;
  date: string;
  attendanceType: 'daily' | 'period';
  status: string;
  classScheduleSlotId?: string;
  notes?: string;
}

export interface SubmitJustificationDto {
  excuseReason: string;
  isMedical?: boolean;
}

export interface ReviewJustificationDto {
  approve: boolean;
  note?: string;
}
