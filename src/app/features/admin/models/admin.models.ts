/**
 * Modèles « école » (vue admin). Champs optionnels + index signature : les
 * formes exactes renvoyées par le backend peuvent varier.
 */

export interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  matricule?: string;
  studentNumber?: string;
  classInstanceId?: string;
  className?: string;
  parentId?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface Teacher {
  id: string;
  employeeNumber?: string;
  specialization?: string;
  status?: string;
  employmentType?: string;
  hireDate?: string;
  salary?: number;
  salaryCurrency?: string;
  subjectsTaught?: string[];
  languagesSpoken?: string[];
  certifications?: string[];
  /** Infos personnelles (le backend les imbrique sous `user`). */
  user?: Record<string, unknown>;
  /** Classes dont l'enseignant est titulaire. */
  classInstancesAsTeacher?: Record<string, unknown>[];
  /** Cours (matières) assignés. */
  classSubjects?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface Parent {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  childrenCount?: number;
  [key: string]: unknown;
}

export interface ClassTemplate {
  id: string;
  name?: string;
  displayName?: string;
  level?: number;
  section?: string;
  educationLevel?: string;
  schoolCycle?: string;
  classSchedule?: string;
  classCode?: string;
  classType?: string;
  capacity?: number;
  schoolSubOptionId?: string;
  [key: string]: unknown;
}

export interface ClassInstance {
  id: string;
  templateId?: string;
  schoolYear?: string;
  status?: string;
  currentEnrollment?: number;
  availableSeats?: number;
  roomNumber?: string;
  building?: string;
  classTeacherId?: string;
  assistantTeacherId?: string;
  /** Relations chargées par le backend. */
  template?: ClassTemplate;
  classTeacher?: Record<string, unknown>;
  subjects?: Record<string, unknown>[];
  students?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface ClassScheduleSlot {
  id?: string;
  weekdayIso: number;
  startTime: string;
  endTime: string;
  label?: string | null;
  classSubjectId?: string | null;
  teacherId?: string | null;
  room?: string | null;
  sortOrder?: number;
  [key: string]: unknown;
}

export interface SchoolOption {
  id: string;
  name?: string;
  description?: string;
  displayOrder?: number;
  subOptions?: SchoolSubOption[];
  [key: string]: unknown;
}

export interface SchoolSubOption {
  id: string;
  optionId?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface FeeStructure {
  id: string;
  name?: string;
  displayName?: string;
  feeType?: string;
  amount?: number;
  currency?: string;
  schoolYear?: string;
  classId?: string;
  feeFrequency?: string;
  isMandatory?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface Payment {
  id: string;
  studentId?: string;
  studentName?: string;
  feeStructureId?: string;
  amountPaid?: number;
  currency?: string;
  paymentDate?: string;
  paymentMethod?: string;
  status?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface AttendanceEntry {
  studentId?: string;
  studentName?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Period {
  id: string;
  term?: string;
  periodType?: string;
  periodNumber?: number;
  label?: string;
  [key: string]: unknown;
}

export interface Grade {
  id: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  nationalProgramSlotId?: string;
  subjectLabel?: string;
  term?: string;
  score?: number;
  periodNumber?: number;
  isPeriodGrade?: boolean;
  isExamGrade?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ProgramSlot {
  id: string;
  programCode?: string;
  labelFr?: string;
  [key: string]: unknown;
}

export interface Bulletin {
  id: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  term?: string;
  schoolYear?: string;
  status?: string;
  published?: boolean;
  average?: number;
  rank?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface Announcement {
  id: string;
  title?: string;
  content?: string;
  targetAudience?: string;
  priority?: string;
  author?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface UserNotification {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface CreateStudentDto {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  classInstanceId?: string;
  parentId?: string;
}

export interface CreateTeacherDto {
  email: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  homeroomClassInstanceIds?: string[];
}

export interface CreateParentDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateClassTemplateDto {
  name: string;
  displayName?: string;
  level: number;
  section?: string;
  educationLevel?: string;
  schoolCycle?: string;
  classSchedule?: string;
  classCode?: string;
  classType?: string;
  capacity?: number;
  schoolSubOptionId?: string;
}

export interface CreateClassInstanceDto {
  templateId: string;
  schoolYear: string;
  classTeacherId?: string;
  assistantTeacherId?: string;
  status?: string;
  roomNumber?: string;
  building?: string;
}

/** Création combinée (modèle + instance) — POST /classes. */
export interface CreateClassDto extends Partial<CreateClassTemplateDto> {
  name: string;
  level: number;
  schoolYear?: string;
  classTeacherId?: string;
  status?: string;
  roomNumber?: string;
}

export interface CreateFeeStructureDto {
  name: string;
  displayName?: string;
  feeType: string;
  amount: number;
  currency: string;
  schoolYear: string;
  classId?: string;
  feeFrequency?: string;
  isMandatory?: boolean;
  status?: string;
}

export interface CreatePaymentDto {
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export interface MarkAttendanceDto {
  studentId: string;
  classInstanceId: string;
  date: string;
  attendanceType: string;
  status: string;
  classScheduleSlotId?: string;
}

export interface CreateGradeDto {
  studentId: string;
  classId: string;
  nationalProgramSlotId: string;
  schoolYear: string;
  term: string;
  score: number;
  isPeriodGrade: boolean;
  isExamGrade: boolean;
  periodNumber: number;
  periodId: string;
}

export interface GenerateBulletinDto {
  studentId: string;
  classId: string;
  schoolYear: string;
  term: string;
  generatePdf: boolean;
  publishImmediately: boolean;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  targetAudience: string;
  priority: string;
}

export interface SendNotificationDto {
  title: string;
  message: string;
  type: string;
  recipientUserIds: string[];
}
