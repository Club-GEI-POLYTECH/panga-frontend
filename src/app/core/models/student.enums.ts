import type { EnumOption } from './school.enums';

/** Gender (valeurs utilisées par la collection : `M`/`F`). */
export const GENDER_OPTIONS: EnumOption[] = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

/** BloodGroup — valeurs enum backend (`A+`, `A-`, … `O-`). */
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
