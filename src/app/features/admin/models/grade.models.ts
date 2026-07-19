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

/* -------- Grille de moyennes de classe par trimestre (GET …/averages) ------- */

/** Moyenne de classe pour une matière. */
export interface SubjectClassAverage {
  nationalProgramSlotId?: string;
  label?: string;
  classAverage?: number | null;
}

/** Détail d'un élève sur une matière (P1/P2/Examen → moyenne de trimestre). */
export interface StudentSubjectAverage {
  nationalProgramSlotId?: string;
  label?: string;
  period1?: number | null;
  period2?: number | null;
  exam?: number | null;
  termAverage?: number | null;
  /** true si P1+P2+Examen présents (moyenne définitive), sinon provisoire. */
  isFinal?: boolean;
}

/** Ligne élève de la grille de classe (moyenne générale + par matière). */
export interface StudentTermAverages {
  studentId?: string;
  studentNumber?: string;
  studentName?: string;
  generalAverage?: number | null;
  rank?: number;
  isFinal?: boolean;
  subjects?: StudentSubjectAverage[];
}

/** Grille complète des moyennes d'une classe pour un trimestre (§A). */
export interface ClassTermAverages {
  classId?: string;
  schoolYear?: string;
  term?: string;
  /** true si toute la classe a P1+P2+Examen partout. */
  isFinal?: boolean;
  classAverage?: number | null;
  computedAt?: string;
  studentCount?: number;
  subjects?: SubjectClassAverage[];
  students?: StudentTermAverages[];
  [key: string]: unknown;
}

/* ------------- Proclamation scopée par trimestre (GET …/proclamation) ------- */

/** Ligne de classement renvoyée par la proclamation scopée. */
export interface ProclamationRankRow {
  rank?: number;
  studentId?: string;
  studentNumber?: string;
  firstName?: string;
  lastName?: string;
  averagePercent?: number;
  [key: string]: unknown;
}

/** Proclamation d'une classe, scopée (`term` null = annuel). */
export interface ScopedProclamation {
  classId?: string;
  schoolYear?: string;
  term?: string | null;
  computedAt?: string;
  studentCount?: number;
  above75Percent?: ProclamationRankRow[];
  between50And75Percent?: ProclamationRankRow[];
  below50Percent?: ProclamationRankRow[];
  rankedAll?: ProclamationRankRow[];
  [key: string]: unknown;
}
