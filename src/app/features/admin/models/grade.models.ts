/**
 * Modèles « notes » (module grades). Champs optionnels + index signature : la
 * forme exacte du backend varie, on s'appuie sur des mappers tolérants.
 */

/** Période d'évaluation (GET /grades/periods). */
export interface Period {
  id: string;
  classInstanceId?: string;
  schoolYear?: string;
  term?: string;
  periodNumber?: number;
  periodType?: string;
  educationLevel?: string;
  startDate?: string;
  endDate?: string;
  examDate?: string | null;
  isActive?: boolean;
  isLocked?: boolean;
  lockedAt?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

/** Note (GET /grades). Le « cours » = nationalProgramSlot. */
export interface Grade {
  id: string;
  studentId?: string;
  classId?: string;
  nationalProgramSlotId?: string;
  teacherId?: string;
  periodId?: string;
  schoolYear?: string;
  term?: string;
  periodNumber?: number;
  isPeriodGrade?: boolean;
  isExamGrade?: boolean;
  examType?: string;
  examName?: string;
  examDate?: string | null;
  score?: number | string;
  maxScore?: number | string;
  percentage?: number | string;
  letterGrade?: string;
  weight?: number | string;
  comment?: string | null;
  teacherComment?: string | null;
  status?: string;
  isPublished?: boolean;
  publishedAt?: string | null;
  classAverage?: number | string | null;
  classRank?: number | null;
  percentile?: number | string | null;
  /** Relations potentiellement chargées. */
  student?: Record<string, unknown>;
  nationalProgramSlot?: { labelFr?: string; programCode?: string; [k: string]: unknown };
  teacher?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface CreateGradeDto {
  studentId: string;
  classId: string;
  nationalProgramSlotId: string;
  schoolYear: string;
  term: string;
  score: number;
  maxScore?: number;
  examType?: string;
  examName?: string;
  examDate?: string;
  teacherId?: string;
  periodId?: string;
  periodNumber?: number;
  isPeriodGrade?: boolean;
  isExamGrade?: boolean;
  weight?: number;
  comment?: string;
  teacherComment?: string;
}

export interface BulkGradeRow {
  studentId: string;
  score: number;
  comment?: string;
}

export interface BulkCreateGradesDto {
  classId: string;
  nationalProgramSlotId: string;
  schoolYear: string;
  term: string;
  rows: BulkGradeRow[];
  maxScore?: number;
  examType?: string;
  examName?: string;
  examDate?: string;
  teacherId?: string;
  periodId?: string;
  periodNumber?: number;
  isPeriodGrade?: boolean;
  isExamGrade?: boolean;
  weight?: number;
  teacherComment?: string;
}

export interface CreatePeriodDto {
  classId: string;
  schoolYear: string;
  term: string;
  periodNumber: number;
  periodType: string;
  educationLevel: string;
  startDate: string;
  endDate: string;
  examDate?: string;
  description?: string;
}

export interface CalculateAverageDto {
  studentId: string;
  classId: string;
  nationalProgramSlotId: string;
  schoolYear: string;
  term?: string;
  educationLevel?: string;
}

/* ------------------------------ Résultats calc ---------------------------- */

/** Ligne de classement (proclamation). */
export interface ProclamationRow {
  studentId?: string;
  studentName?: string;
  rank?: number;
  overallAverage?: number;
  [key: string]: unknown;
}

export interface ProclamationResult {
  rows: ProclamationRow[];
  above75: ProclamationRow[];
  between50And75: ProclamationRow[];
  below50: ProclamationRow[];
  [key: string]: unknown;
}

/** Moyenne annuelle d'une matière (calculate/annual-average). */
export interface AnnualAverageResult {
  nationalProgramSlotId?: string;
  subjectLabel?: string;
  annualAverage?: number;
  annualAveragePercent?: number;
  [key: string]: unknown;
}
