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
  userId?: string;
  /** Champs perso remontés depuis le compte `user` (cf. ParentsService). */
  firstName?: string;
  lastName?: string;
  postnom?: string;
  gender?: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  nationality?: string;
  nationalIdNumber?: string;
  /** Champs propres au parent. */
  relationship?: string;
  status?: string;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  canPickupStudent?: boolean;
  canAuthorizeMedical?: boolean;
  canAuthorizeTrips?: boolean;
  occupation?: string;
  employerName?: string;
  employerPhone?: string;
  jobTitle?: string;
  workAddress?: string;
  monthlyIncome?: number | string | null;
  incomeCurrency?: string;
  educationLevel?: string;
  educationInstitution?: string;
  languagesSpoken?: string[];
  communicationPreference?: string;
  spouseName?: string;
  spousePhone?: string;
  spouseEmail?: string;
  spouseOccupation?: string;
  parentingStyle?: string;
  concernsNotes?: string;
  specialInstructions?: string;
  /** Relations chargées par le backend. */
  user?: Record<string, unknown>;
  students?: Record<string, unknown>[];
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

/** Ligne « matière » d'un bulletin (aperçu ou généré). */
export interface BulletinSubjectGrade {
  nationalProgramSlotId?: string;
  subjectName?: string;
  subjectCode?: string;
  coefficient?: number;
  period1Average?: number | null;
  period2Average?: number | null;
  examScore?: number | null;
  term1Average?: number | null;
  term2Average?: number | null;
  term3Average?: number | null;
  semester1Average?: number | null;
  semester2Average?: number | null;
  finalAverage?: number | null;
  letterGrade?: string;
  gradePoint?: number;
  countsForAverage?: boolean;
  isSlotNotOffered?: boolean;
  [key: string]: unknown;
}

/* ---- Snapshot ministériel (bulletin officiel RDC) — formes primaire/secondaire ---- */

/** Points d'une ligne pour un terme (trimestre) ou semestre. Champs tolérants. */
export interface SnapshotTermCell {
  maxExam?: number | null;
  maxTrimester?: number | null;
  period1?: number | null;
  period2?: number | null;
  exam?: number | null;
  trimester?: number | null;
  semester?: number | null;
  period1Obtained?: number | null;
  period2Obtained?: number | null;
  examObtained?: number | null;
  trimesterObtained?: number | null;
  trimesterPercent?: number | null;
  semesterPercent?: number | null;
  [key: string]: unknown;
}

/** Détail « terme courant » d'une ligne primaire (points bruts sur maxima). */
export interface SnapshotTrimestreCourant {
  maxExam?: number;
  maxTrimester?: number;
  period1Obtained?: number | null;
  period2Obtained?: number | null;
  examObtained?: number | null;
  trimesterObtained?: number | null;
  trimesterPercent?: number | null;
  [key: string]: unknown;
}

/** Une branche/matière du programme (ligne du bulletin). */
export interface SnapshotLine {
  programCode?: string;
  labelFr?: string;
  maxPerPeriod?: number;
  displayOrder?: number;
  scoringMode?: string;
  trimestreCourant?: SnapshotTrimestreCourant | null;
  /** Points par trimestre (G1) — clés TERM1/TERM2/TERM3. */
  terms?: Record<string, SnapshotTermCell | null>;
  /** Points par semestre (G2, secondaire) — clés SEMESTER1/SEMESTER2. */
  semestres?: Record<string, SnapshotTermCell | null>;
  [key: string]: unknown;
}

export interface SnapshotBranch {
  labelFr?: string;
  lines?: SnapshotLine[];
  [key: string]: unknown;
}

/** Agrégat d'un domaine pour un terme (points obtenus / max). */
export interface SnapshotSubTotalTerm {
  pointsObtained?: number | null;
  maxTrimester?: number | null;
  maxSemester?: number | null;
  [key: string]: unknown;
}

/** Sous-total d'un domaine (maxima + points par terme + annuel). */
export interface SnapshotDomainSubTotal {
  maxPerPeriod?: number;
  maxExam?: number;
  maxTrimester?: number;
  maxYear?: number;
  maxExamPerSemester?: number;
  maxSemester?: number;
  terms?: Record<string, SnapshotSubTotalTerm | null>;
  yearPointsObtained?: number | null;
  [key: string]: unknown;
}

export interface SnapshotDomain {
  code?: string;
  labelFr?: string;
  branches?: SnapshotBranch[];
  subTotal?: SnapshotDomainSubTotal | null;
  [key: string]: unknown;
}

/* ---- pourcentagesPeriodiques : colonnes de synthèse (P1..P6, E1..E3, T1..T3, annuel) ---- */

export interface PeriodicStats {
  totalAverage?: number | null;
  weightedAverage?: number | null;
  gpa?: number | null;
  rank?: number | null;
  rankOutOf?: number | null;
  percentile?: number | null;
  totalSubjects?: number | null;
  passedSubjects?: number | null;
  failedSubjects?: number | null;
  [key: string]: unknown;
}

export interface PeriodicPresence {
  presentDays?: number | null;
  absentDays?: number | null;
  lateDays?: number | null;
  attendancePercentage?: number | null;
  [key: string]: unknown;
}

/** Sous-total d'un domaine porté par une entrée de `pourcentagesPeriodiques`. */
export interface PeriodicDomainSubTotal {
  code?: string;
  labelFr?: string;
  pointsObtenus?: number | null;
  pointsMax?: number | null;
  [key: string]: unknown;
}

/** Une colonne de synthèse (période, examen, trimestre ou annuel). */
export interface PeriodicEntry {
  /** P1..P6 · E1..E3 · T1..T3 */
  code?: string;
  term?: string;
  pourcentage?: number | null;
  /** Clé : n'afficher la valeur que si `true`. */
  disponible?: boolean;
  place?: number | null;
  nombreEleves?: number | null;
  statistiques?: PeriodicStats;
  presence?: PeriodicPresence;
  pointsMax?: number | null;
  pointsObtenus?: number | null;
  sousTotauxDomaines?: PeriodicDomainSubTotal[];
  /** Appréciations, par période/examen/trimestre/annuel. */
  application?: string | null;
  conduite?: string | null;
  /** Uniquement sur `annuel`. */
  decision?: string | null;
  [key: string]: unknown;
}

export interface PourcentagesPeriodiques {
  periodes?: PeriodicEntry[];
  examens?: PeriodicEntry[];
  trimestres?: PeriodicEntry[];
  annuel?: PeriodicEntry | null;
  [key: string]: unknown;
}

/** Snapshot officiel (primaire = pas de `payloadKind` ; secondaire = `rdc_secondary_official`). */
export interface MinisterialSnapshot {
  pourcentagesPeriodiques?: PourcentagesPeriodiques | null;
  payloadKind?: string;
  band?: string;
  track?: string;
  presetTitleFr?: string;
  referenceSchoolYear?: string;
  term?: string;
  domains?: SnapshotDomain[];
  maximaGeneraux?: {
    sumMaxPerPeriod?: number;
    sumMaxExam?: number;
    sumMaxTrimester?: number;
    sumMaxYear?: number;
    sumMaxExamPerSemester?: number;
    sumMaxSemester?: number;
    [key: string]: unknown;
  };
  synthese?: {
    pourcentageTrimestreCourant?: number | null;
    pourcentageSemestreCourant?: number | null;
    place?: number | null;
    nombreEleves?: number | null;
    pointsTrimestreObtained?: number | null;
    pointsTrimestreMaximum?: number | null;
    pourcentageTrimestreOfficielPoints?: number | null;
    decision?: string | null;
    [key: string]: unknown;
  };
  champsQualitatifs?: { application?: string | null; conduite?: string | null };
  [key: string]: unknown;
}

/** Bulletin complet — forme renvoyée par l'aperçu (§C) et la génération. */
export interface BulletinPreview {
  id?: string | null;
  preview?: boolean;
  status?: string;
  schoolId?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  schoolYear?: string;
  term?: string;
  totalAverage?: number | null;
  weightedAverage?: number | null;
  gpa?: number;
  rank?: number;
  rankOutOf?: number;
  percentile?: number;
  totalSubjects?: number;
  passedSubjects?: number;
  failedSubjects?: number;
  subjectGrades?: BulletinSubjectGrade[];
  totalAttendanceDays?: number;
  presentDays?: number;
  absentDays?: number;
  attendancePercentage?: number;
  overallComment?: string | null;
  classTeacherComment?: string | null;
  /** Structure officielle RDC (bulletin ministériel) si le programme est lié. */
  ministerialSnapshot?: MinisterialSnapshot | null;
  [key: string]: unknown;
}

/** Corps de `POST /bulletins/generate-class`. */
export interface GenerateClassDto {
  classId: string;
  schoolYear: string;
  term: string;
  generatePdf: boolean;
  publishImmediately: boolean;
}

/** Résultat d'une génération en bloc (§D). */
export interface GenerateClassResult {
  classId?: string;
  schoolYear?: string;
  term?: string;
  total?: number;
  generated?: number;
  skipped?: number;
  errors?: { studentId?: string; message?: string }[];
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

export interface CreateSchoolOptionDto {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface CreateSchoolSubOptionDto {
  optionId: string;
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface PromoteStudentsDto {
  /**
   * Instance source. Le backend l'écrase avec le `:id` de l'URL, mais le
   * ValidationPipe (whitelist + IsNotEmpty) l'exige dans le body → renseigné
   * systématiquement par `ClassesService.promote()`. Optionnel côté appelant.
   */
  fromClassInstanceId?: string;
  toClassInstanceId: string;
  toSchoolYear: string;
  action: string;
  studentIds: string[];
  reason?: string;
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
