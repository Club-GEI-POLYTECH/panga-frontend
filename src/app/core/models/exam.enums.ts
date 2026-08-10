/**
 * Options alignées sur les enums backend du module exams (`exams.enums.ts`).
 * Les `value` DOIVENT correspondre exactement (validation stricte).
 */
import type { EnumOption } from './school.enums';
import type { BadgeTone } from '../../shared/ui/status-badge';

/** Exam.examType — `ExamType`. */
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
  { value: 'homework', label: 'Travail à domicile' },
  { value: 'lab_work', label: 'Travail de laboratoire' },
  { value: 'field_work', label: 'Travail de terrain' },
];

/** Exam.status — `ExamStatus`. */
export const EXAM_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'scheduled', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'postponed', label: 'Reporté' },
];

/** ExamSession.status — `ExamSessionStatus`. */
export const EXAM_SESSION_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'scheduled', label: 'Planifiée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
];

/** ExamResult.status — `ResultStatus`. */
export const RESULT_STATUS_OPTIONS: EnumOption[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'graded', label: 'Corrigé' },
  { value: 'published', label: 'Publié' },
  { value: 'disputed', label: 'Contesté' },
  { value: 'reviewed', label: 'Revu' },
];

/** ExamRoom.roomType — `RoomType`. */
export const ROOM_TYPE_OPTIONS: EnumOption[] = [
  { value: 'classroom', label: 'Salle de classe' },
  { value: 'lab', label: 'Laboratoire' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'hall', label: 'Salle des fêtes' },
  { value: 'computer_lab', label: 'Salle informatique' },
  { value: 'other', label: 'Autre' },
];

/** ExamSupervisor.role — `SupervisorRole`. */
export const SUPERVISOR_ROLE_OPTIONS: EnumOption[] = [
  { value: 'main', label: 'Principal' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'backup', label: 'Remplaçant' },
];

/**
 * ExamSession.seatingMode — répartition des salles pour toute la session.
 * `by_class` (défaut) : chaque classe garde sa propre salle. `mixed` : les
 * élèves de plusieurs classes/niveaux sont dispersés dans les mêmes salles.
 */
export const SEATING_MODE_OPTIONS: EnumOption[] = [
  { value: 'by_class', label: 'Par classe' },
  { value: 'mixed', label: 'Mixte (salles partagées)' },
];

const EXAM_STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
  postponed: 'warning',
};

export function examStatusTone(status: string | undefined): BadgeTone {
  return EXAM_STATUS_TONE[status ?? 'draft'] ?? 'neutral';
}

/** Libellé FR d'une valeur d'enum (fallback = valeur brute). */
export function examLabel(options: EnumOption[], value: string | undefined | null): string {
  if (!value) {
    return '—';
  }
  return options.find((o) => o.value === value)?.label ?? value;
}
