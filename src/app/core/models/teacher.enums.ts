import type { EnumOption } from './school.enums';

/** Teacher.status — `TeacherStatus`. */
export const TEACHER_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'on_leave', label: 'En congé' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'terminated', label: 'Licencié' },
  { value: 'retired', label: 'Retraité' },
];

/** Teacher.employmentType — `EmploymentType`. */
export const EMPLOYMENT_TYPE_OPTIONS: EnumOption[] = [
  { value: 'full_time', label: 'Temps plein' },
  { value: 'part_time', label: 'Temps partiel' },
  { value: 'contract', label: 'Contrat' },
  { value: 'volunteer', label: 'Bénévole' },
  { value: 'substitute', label: 'Suppléant' },
];

/** Teacher.qualificationLevel — `QualificationLevel`. */
export const QUALIFICATION_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'bachelor', label: 'Licence' },
  { value: 'master', label: 'Master' },
  { value: 'doctorate', label: 'Doctorat' },
  { value: 'diploma', label: 'Diplôme' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'other', label: 'Autre' },
];
