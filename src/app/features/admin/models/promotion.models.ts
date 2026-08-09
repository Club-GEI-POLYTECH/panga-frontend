/**
 * Modèles « promotions » (décisions de fin d'année). Champs optionnels +
 * index signature : on s'appuie sur des mappers tolérants côté service.
 */

/** Décision de promotion d'un élève (GET /promotions/decisions). */
export interface PromotionDecision {
  id: string;
  studentId?: string;
  classInstanceId?: string;
  schoolYear?: string;
  annualAverage?: number | string | null;
  passThreshold?: number | string | null;
  decision?: string;
  status?: string;
  notes?: string | null;
  decidedAt?: string | null;
  /** Relation potentiellement chargée. */
  student?: Record<string, unknown>;
  studentName?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface ComputeDecisionsDto {
  classInstanceId: string;
  schoolYear: string;
  passThreshold?: number;
}

export interface FinalizeDecisionsDto {
  classInstanceId: string;
  schoolYear: string;
  /** Année de destination si différente de schoolYear + 1 (déduite sinon). */
  toSchoolYear?: string;
}

export interface UpdateDecisionDto {
  decision: string;
  notes?: string;
}

export interface RecordTransferDto {
  studentId: string;
  schoolYear: string;
  notes?: string;
}

/* ------------------------- Résultat de finalisation ------------------------ */

export type EnrollmentOutcome = 'promoted' | 'repeated' | 'graduated' | 'skipped' | 'failed';

/** Ré-inscription effective d'un élève, distincte de sa décision (voir FinalizeResult). */
export interface PromotionEnrollmentResult {
  studentId: string;
  outcome: EnrollmentOutcome;
  /** Présent surtout sur `outcome: 'failed'` — raison du rattrapage manuel requis. */
  message?: string;
}

/** POST /promotions/finalize — `decisions[].status` passe à FINALIZED même si l'entrée
 *  correspondante dans `enrollments` est `failed` (décision et ré-inscription sont
 *  deux choses distinctes). */
export interface FinalizeResult {
  finalized: number;
  decisions: PromotionDecision[];
  enrollments: PromotionEnrollmentResult[];
}
