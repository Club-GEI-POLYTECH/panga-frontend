/**
 * Options alignées sur les enums backend du module promotions
 * (`promotions.enums.ts`). Les `value` DOIVENT correspondre exactement.
 */
import type { EnumOption } from './school.enums';
import type { BadgeTone } from '../../shared/ui/status-badge';

/** PromotionDecision.decision — `PromotionDecisionType`. */
export const PROMOTION_DECISION_OPTIONS: EnumOption[] = [
  { value: 'passed', label: 'Admis' },
  { value: 'failed', label: 'Non admis' },
  { value: 'conditional', label: 'Admis sous condition' },
  { value: 'transferred', label: 'Transféré' },
  { value: 'graduated', label: 'Diplômé' },
];

/** PromotionDecision.status — `DecisionStatus`. */
export const DECISION_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'finalized', label: 'Finalisée' },
];

const DECISION_TONE: Record<string, BadgeTone> = {
  passed: 'success',
  failed: 'danger',
  conditional: 'warning',
  transferred: 'info',
  graduated: 'brand',
};

export function decisionTone(decision: string | undefined): BadgeTone {
  return DECISION_TONE[decision ?? ''] ?? 'neutral';
}

export function promotionLabel(options: EnumOption[], value: string | undefined | null): string {
  if (!value) {
    return '—';
  }
  return options.find((o) => o.value === value)?.label ?? value;
}

/** `PromotionEnrollmentResult.outcome` — réinscription effective (POST /finalize). */
export const ENROLLMENT_OUTCOME_OPTIONS: EnumOption[] = [
  { value: 'promoted', label: 'Promus' },
  { value: 'repeated', label: 'Redoublent' },
  { value: 'graduated', label: 'Diplômés' },
  { value: 'skipped', label: 'Ignorés' },
  { value: 'failed', label: 'Échecs' },
];

const ENROLLMENT_TONE: Record<string, BadgeTone> = {
  promoted: 'success',
  repeated: 'warning',
  graduated: 'brand',
  skipped: 'neutral',
  failed: 'danger',
};

export function enrollmentTone(outcome: string | undefined): BadgeTone {
  return ENROLLMENT_TONE[outcome ?? ''] ?? 'neutral';
}
