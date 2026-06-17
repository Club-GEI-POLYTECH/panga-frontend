/**
 * Modèles « cours » : journal de cours (cahier de texte) + référentiel.
 * Champs optionnels + index signature : les formes backend peuvent varier,
 * on s'appuie sur des mappers tolérants (cf. course-journal.service).
 */

/** Relation classe ↔ matière (GET /subjects/class-subjects). Un « cours » ouvert. */
export interface ClassSubject {
  id: string;
  classId?: string;
  classInstanceId?: string;
  nationalProgramSlotId?: string;
  schoolYear?: string;
  teacherId?: string;
  assistantTeacherId?: string;
  hoursPerWeek?: number;
  totalHoursPerTerm?: number;
  totalHoursPerYear?: number;
  isActive?: boolean;
  /** Relations chargées par le backend (slot programme = libellé du cours). */
  nationalProgramSlot?: { labelFr?: string; programCode?: string; [k: string]: unknown };
  teacher?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Heures prévues d'un cours sur une période (PUT /course-journal/period-targets). */
export interface PeriodTarget {
  id?: string;
  classSubjectId?: string;
  periodId?: string;
  plannedHours?: number | string;
  [key: string]: unknown;
}

/** Séance enregistrée (GET/POST /course-journal/entries). */
export interface LessonLogEntry {
  id: string;
  classSubjectId?: string;
  classInstanceId?: string;
  periodId?: string;
  lessonDate?: string;
  durationHours?: number | string;
  title?: string;
  summary?: string | null;
  homework?: string | null;
  skillsCovered?: string | null;
  classScheduleSlotId?: string | null;
  createdByTeacher?: Record<string, unknown> | null;
  /** Libellés enrichis éventuels. */
  subjectLabel?: string;
  teacherName?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Ligne de synthèse progression (GET /course-journal/overview), par cours. */
export interface CourseOverviewRow {
  classSubjectId: string;
  subjectLabel: string;
  programCode?: string;
  teacherName?: string;
  plannedHours: number;
  deliveredHours: number;
  remainingHours: number;
  /** 0 → 1 (part réalisée). */
  completionRatio: number;
  entriesCount?: number;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface UpsertPeriodTargetDto {
  classSubjectId: string;
  periodId: string;
  plannedHours: number;
}

export interface CreateLessonLogEntryDto {
  classSubjectId: string;
  periodId: string;
  lessonDate: string;
  durationHours: number;
  title: string;
  summary?: string;
  homework?: string;
  skillsCovered?: string;
  classScheduleSlotId?: string;
}

export type UpdateLessonLogEntryDto = Partial<
  Omit<CreateLessonLogEntryDto, 'classSubjectId' | 'periodId'>
>;
