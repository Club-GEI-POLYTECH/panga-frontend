/**
 * Options alignées sur les enums backend du module grades (`grades.enums.ts`).
 * Les `value` DOIVENT correspondre exactement (validation stricte).
 */
import type { EnumOption } from './school.enums';

/** Grade/Period.term — `Term`. */
export const TERM_OPTIONS: EnumOption[] = [
  { value: 'TERM1', label: '1er trimestre' },
  { value: 'TERM2', label: '2e trimestre' },
  { value: 'TERM3', label: '3e trimestre' },
  { value: 'SEMESTER1', label: '1er semestre' },
  { value: 'SEMESTER2', label: '2e semestre' },
  { value: 'ANNUAL', label: 'Annuel' },
];

/** Grade.examType — `ExamType`. */
export const EXAM_TYPE_OPTIONS: EnumOption[] = [
  { value: 'continuous', label: 'Contrôle continu' },
  { value: 'quiz', label: 'Interrogation' },
  { value: 'assignment', label: 'Devoir' },
  { value: 'project', label: 'Projet' },
  { value: 'midterm', label: 'Examen mi-parcours' },
  { value: 'final', label: 'Examen final' },
  { value: 'practical', label: 'Travaux pratiques' },
  { value: 'oral', label: 'Oral' },
  { value: 'presentation', label: 'Présentation' },
  { value: 'participation', label: 'Participation' },
  { value: 'homework', label: 'Travail à domicile' },
  { value: 'lab_work', label: 'Travail de laboratoire' },
  { value: 'field_work', label: 'Travail de terrain' },
];

/** Grade.status — `GradeStatus`. */
export const GRADE_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publiée' },
  { value: 'archived', label: 'Archivée' },
  { value: 'disputed', label: 'Contestée' },
];

/** Period.periodType — `PeriodType`. */
export const PERIOD_TYPE_OPTIONS: EnumOption[] = [
  { value: 'period', label: 'Période' },
  { value: 'exam', label: 'Examen' },
];

/** Period.educationLevel — `EducationLevel`. */
export const EDUCATION_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'primary', label: 'Primaire' },
  { value: 'secondary', label: 'Secondaire' },
];

/** Libellé FR d'une valeur d'enum (fallback = valeur brute). */
export function labelOf(options: EnumOption[], value: string | undefined | null): string {
  if (!value) {
    return '—';
  }
  return options.find((o) => o.value === value)?.label ?? value;
}
