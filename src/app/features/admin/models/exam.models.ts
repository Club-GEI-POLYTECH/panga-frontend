/**
 * Modèles « examens » (module exams). Champs optionnels + index signature :
 * la forme exacte du backend varie, on s'appuie sur des mappers tolérants.
 */

export interface ExamSession {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  schoolYear?: string;
  term?: string;
  educationLevel?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  isPublished?: boolean;
  totalExams?: number;
  completedExams?: number;
  instructions?: string;
  /** Répartition des salles pour toute la session — voir `SEATING_MODE_OPTIONS`. */
  seatingMode?: string;
  [key: string]: unknown;
}

/** Salle assignée à un élève pour toute une session (`ExamSeatAssignment`). */
export interface ExamSeatAssignment {
  id: string;
  examSessionId?: string;
  studentId?: string;
  roomId?: string;
  student?: Record<string, unknown>;
  room?: Record<string, unknown>;
  [key: string]: unknown;
}

/** GET /exams/sessions/:id/seating — roster par salle (élèves + surveillants). */
export interface SeatingRoomRoster {
  roomId?: string;
  room?: ExamRoom;
  students?: ExamSeatAssignment[];
  supervisors?: ExamSupervisor[];
  [key: string]: unknown;
}

export interface ExamRoom {
  id: string;
  roomNumber?: string;
  roomName?: string;
  building?: string;
  floor?: string;
  roomType?: string;
  capacity?: number;
  availableSeats?: number;
  isAccessible?: boolean;
  hasProjector?: boolean;
  hasComputers?: boolean;
  hasWhiteboard?: boolean;
  hasAirConditioning?: boolean;
  isActive?: boolean;
  notes?: string;
  [key: string]: unknown;
}

export interface ExamSupervisor {
  id: string;
  examId?: string;
  teacherId?: string;
  roomId?: string;
  role?: string;
  startTime?: string;
  endTime?: string;
  isConfirmed?: boolean;
  teacher?: Record<string, unknown>;
  room?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExamResult {
  id: string;
  examId?: string;
  studentId?: string;
  gradeId?: string | null;
  score?: number | string;
  maxScore?: number | string;
  percentage?: number | string;
  letterGrade?: string;
  isPassed?: boolean;
  status?: string;
  rank?: number | null;
  wasPresent?: boolean;
  wasAbsent?: boolean;
  wasLate?: boolean;
  isExcused?: boolean;
  absenceReason?: string | null;
  teacherComment?: string | null;
  student?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Exam {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  classId?: string;
  nationalProgramSlotId?: string;
  teacherId?: string;
  examSessionId?: string;
  examType?: string;
  schoolYear?: string;
  term?: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  maxScore?: number | string;
  passingScore?: number | string;
  coefficient?: number | string;
  status?: string;
  isPublished?: boolean;
  isResultsPublished?: boolean;
  totalStudents?: number;
  studentsPresent?: number;
  studentsAbsent?: number;
  averageScore?: number | string | null;
  highestScore?: number | string | null;
  lowestScore?: number | string | null;
  passRate?: number | string | null;
  instructions?: string;
  /** Relations potentiellement chargées. */
  nationalProgramSlot?: { labelFr?: string; programCode?: string; [k: string]: unknown };
  class?: Record<string, unknown>;
  teacher?: Record<string, unknown>;
  supervisors?: ExamSupervisor[];
  results?: ExamResult[];
  createdAt?: string;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface CreateExamDto {
  classId: string;
  nationalProgramSlotId: string;
  name: string;
  examType: string;
  schoolYear: string;
  term: string;
  examDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  teacherId?: string;
  examSessionId?: string;
  displayName?: string;
  description?: string;
  maxScore?: number;
  passingScore?: number;
  coefficient?: number;
  instructions?: string;
}

export interface CreateExamSessionDto {
  name: string;
  schoolYear: string;
  term: string;
  startDate: string;
  endDate: string;
  displayName?: string;
  description?: string;
  educationLevel?: string;
  instructions?: string;
  /** `by_class` (défaut, une salle = une classe) ou `mixed` (salles partagées). */
  seatingMode?: string;
}

/** PATCH /exams/sessions/:id — modification partielle (ex. changer `seatingMode`). */
export type UpdateExamSessionDto = Partial<CreateExamSessionDto>;

export interface CreateExamRoomDto {
  roomNumber: string;
  capacity: number;
  roomName?: string;
  building?: string;
  floor?: string;
  roomType?: string;
  notes?: string;
}

export interface CreateExamSupervisorDto {
  examId: string;
  teacherId: string;
  roomId?: string;
  role?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface CreateExamResultDto {
  examId: string;
  studentId: string;
  score: number;
  maxScore: number;
  wasPresent?: boolean;
  wasAbsent?: boolean;
  absenceReason?: string;
  teacherComment?: string;
}

/** GET /exams/:id/results — `published` distingue "pas encore publié" de "publié, vide". */
export interface ExamResultsResponse {
  published: boolean;
  results: ExamResult[];
}

/** POST /exams/sessions/:id/seating/generate */
export interface GenerateSeatingDto {
  roomIds: string[];
}

/** PATCH /exams/sessions/:id/seating/:studentId — ajustement manuel ponctuel. */
export interface UpdateSeatDto {
  roomId: string;
}

/** POST /exams/sessions/:id/supervisors — variante session (mode `mixed`, sans examen unique). */
export interface CreateSessionSupervisorDto {
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  role?: string;
}

export interface ExamFilter {
  classId?: string;
  nationalProgramSlotId?: string;
  schoolYear?: string;
  term?: string;
  examType?: string;
  status?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}
