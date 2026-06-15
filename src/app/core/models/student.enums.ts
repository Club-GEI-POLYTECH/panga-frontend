import type { EnumOption } from './school.enums';

/** Gender — `M` / `F` / `O`. */
export const GENDER_OPTIONS: EnumOption[] = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'O', label: 'Autre' },
];

/** BloodGroup — `A+`, `A-`, … `O-`. */
export const BLOOD_GROUP_OPTIONS: EnumOption[] = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

/** StudentStatus. */
export const STUDENT_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'transferred', label: 'Transféré' },
  { value: 'graduated', label: 'Diplômé' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'expelled', label: 'Exclu' },
  { value: 'dropped_out', label: 'Abandon' },
  { value: 'on_leave', label: 'En congé' },
];

/** EnrollmentType. */
export const ENROLLMENT_TYPE_OPTIONS: EnumOption[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'transfer', label: 'Transfert' },
  { value: 'repeat', label: 'Redoublant' },
  { value: 'promotion', label: 'Promotion' },
];

/** TransportType. */
export const TRANSPORT_TYPE_OPTIONS: EnumOption[] = [
  { value: 'school_bus', label: 'Bus scolaire' },
  { value: 'parent_transport', label: 'Transport parent' },
  { value: 'public_transport', label: 'Transport public' },
  { value: 'walking', label: 'À pied' },
  { value: 'other', label: 'Autre' },
];
