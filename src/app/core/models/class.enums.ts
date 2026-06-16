import type { EnumOption } from './school.enums';

/** EducationLevel. */
export const CLASS_EDUCATION_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'primary', label: 'Primaire' },
  { value: 'secondary', label: 'Secondaire' },
];

/** SchoolCycle. */
export const SCHOOL_CYCLE_OPTIONS: EnumOption[] = [
  { value: 'primary', label: 'Primaire' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'humanities', label: 'Humanités' },
];

/** ClassSchedule. */
export const CLASS_SCHEDULE_OPTIONS: EnumOption[] = [
  { value: 'morning', label: 'Matin' },
  { value: 'afternoon', label: 'Après-midi' },
  { value: 'full_day', label: 'Journée complète' },
];

/** ClassStatus. */
export const CLASS_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archivée' },
  { value: 'closed', label: 'Fermée' },
];

/** ClassType. */
export const CLASS_TYPE_OPTIONS: EnumOption[] = [
  { value: 'regular', label: 'Ordinaire' },
  { value: 'honors', label: 'Honneur' },
  { value: 'remedial', label: 'Remédiation' },
  { value: 'special_needs', label: 'Besoins spéciaux' },
  { value: 'gifted', label: 'Surdoués' },
  { value: 'accelerated', label: 'Accéléré' },
];

/** ScheduleType (ClassSubject). */
export const SCHEDULE_TYPE_OPTIONS: EnumOption[] = [
  { value: 'fixed', label: 'Fixe' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'rotating', label: 'Tournant' },
];

/** PromotionAction. */
export const PROMOTION_ACTION_OPTIONS: EnumOption[] = [
  { value: 'promote', label: 'Promouvoir' },
  { value: 'repeat', label: 'Redoubler' },
  { value: 'transfer', label: 'Transférer' },
  { value: 'graduate', label: 'Diplômer' },
];

/** IsoWeekday — 1=lundi … 7=dimanche (valeurs numériques). */
export interface WeekdayOption {
  value: number;
  label: string;
  short: string;
}
export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
  { value: 7, label: 'Dimanche', short: 'Dim' },
];
