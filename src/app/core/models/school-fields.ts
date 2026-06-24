import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  ACCREDITATION_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
} from './school.enums';

/**
 * Schéma déclaratif des champs d'une école — source unique partagée par la fiche
 * admin (`my-school`), le détail super_admin et la création super_admin.
 */
export type SchoolFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'multiselect';

export interface SchoolField {
  key: string;
  label: string;
  type?: SchoolFieldType;
  options?: { value: string; label: string }[];
  wide?: boolean;
}

export interface SchoolFieldGroup {
  title: string;
  icon: string;
  fields: SchoolField[];
}

/** Groupes éditables (mêmes sections que la fiche admin). */
export const SCHOOL_EDITABLE_GROUPS: SchoolFieldGroup[] = [
  {
    title: 'Identité',
    icon: 'badge',
    fields: [
      { key: 'displayName', label: 'Nom affiché' },
      { key: 'name', label: 'Nom complet' },
      { key: 'legalName', label: 'Raison sociale' },
      { key: 'schoolType', label: 'Type', type: 'select', options: SCHOOL_TYPE_OPTIONS },
      {
        key: 'educationLevels',
        label: "Niveaux d'enseignement",
        type: 'multiselect',
        options: EDUCATION_LEVEL_OPTIONS,
        wide: true,
      },
      { key: 'motto', label: 'Devise' },
      { key: 'vision', label: 'Vision', type: 'textarea', wide: true },
      { key: 'mission', label: 'Mission', type: 'textarea', wide: true },
      { key: 'coreValues', label: 'Valeurs', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Coordonnées & localisation',
    icon: 'location_on',
    fields: [
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'province', label: 'Province' },
      { key: 'postalCode', label: 'Code postal' },
      { key: 'country', label: 'Pays' },
      { key: 'gpsCoordinates', label: 'Coordonnées GPS' },
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'tel' },
      { key: 'fax', label: 'Fax', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'secondaryEmail', label: 'E-mail secondaire', type: 'email' },
      { key: 'website', label: 'Site web' },
    ],
  },
  {
    title: 'Direction & contacts',
    icon: 'groups',
    fields: [
      { key: 'principalName', label: 'Directeur — nom' },
      { key: 'principalEmail', label: 'Directeur — e-mail', type: 'email' },
      { key: 'principalPhone', label: 'Directeur — téléphone', type: 'tel' },
      { key: 'vicePrincipalName', label: 'Adjoint — nom' },
      { key: 'vicePrincipalEmail', label: 'Adjoint — e-mail', type: 'email' },
      { key: 'primaryDirectorName', label: 'Directeur primaire — nom' },
      { key: 'primaryDirectorEmail', label: 'Directeur primaire — e-mail', type: 'email' },
      { key: 'primaryDirectorPhone', label: 'Directeur primaire — téléphone', type: 'tel' },
      { key: 'secondaryPrefectName', label: 'Préfet secondaire — nom' },
      { key: 'secondaryPrefectEmail', label: 'Préfet secondaire — e-mail', type: 'email' },
      { key: 'secondaryPrefectPhone', label: 'Préfet secondaire — téléphone', type: 'tel' },
      { key: 'adminContactName', label: 'Contact admin — nom' },
      { key: 'adminContactEmail', label: 'Contact admin — e-mail', type: 'email' },
      { key: 'adminContactPhone', label: 'Contact admin — téléphone', type: 'tel' },
      { key: 'financeContactName', label: 'Contact finances — nom' },
      { key: 'financeContactEmail', label: 'Contact finances — e-mail', type: 'email' },
      { key: 'financeContactPhone', label: 'Contact finances — téléphone', type: 'tel' },
    ],
  },
  {
    title: 'Académique',
    icon: 'menu_book',
    fields: [
      { key: 'curriculum', label: 'Curriculum' },
      { key: 'curriculumVersion', label: 'Version curriculum' },
      { key: 'languageOfInstruction', label: "Langue d'enseignement" },
    ],
  },
  {
    title: 'Accréditation & licence',
    icon: 'verified',
    fields: [
      {
        key: 'accreditationStatus',
        label: 'Statut accréditation',
        type: 'select',
        options: ACCREDITATION_STATUS_OPTIONS,
      },
      { key: 'accreditationBody', label: "Organe d'accréditation" },
      { key: 'accreditationNumber', label: "N° d'accréditation" },
      { key: 'licenseNumber', label: 'N° de licence' },
      { key: 'registrationNumber', label: "N° d'enregistrement" },
      { key: 'taxId', label: 'Identifiant fiscal' },
    ],
  },
  {
    title: 'Formats & localisation',
    icon: 'schedule',
    fields: [
      { key: 'timezone', label: 'Fuseau horaire' },
      {
        key: 'dateFormat',
        label: 'Format de date',
        type: 'select',
        options: [
          { value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' },
          { value: 'MM/DD/YYYY', label: 'MM/JJ/AAAA' },
          { value: 'YYYY-MM-DD', label: 'AAAA-MM-JJ' },
        ],
      },
      {
        key: 'timeFormat',
        label: 'Format heure',
        type: 'select',
        options: [
          { value: '24h', label: '24h' },
          { value: '12h', label: '12h' },
        ],
      },
      { key: 'currency', label: 'Devise' },
      { key: 'currencySymbol', label: 'Symbole devise' },
    ],
  },
  {
    title: 'Coordonnées bancaires',
    icon: 'account_balance',
    fields: [
      { key: 'bankName', label: 'Banque' },
      { key: 'bankAccountName', label: 'Titulaire du compte' },
      { key: 'bankAccountNumber', label: 'N° de compte' },
      { key: 'iban', label: 'IBAN' },
      { key: 'swiftCode', label: 'Code SWIFT' },
    ],
  },
];

/** Groupes en lecture seule (abonnement, limites, identifiants système). */
export const SCHOOL_READONLY_GROUPS: SchoolFieldGroup[] = [
  {
    title: 'Abonnement & limites',
    icon: 'workspace_premium',
    fields: [
      { key: 'subscriptionPlan', label: 'Plan' },
      { key: 'saasBillingStatus', label: 'Facturation' },
      { key: 'status', label: 'Statut' },
      { key: 'maxStudents', label: 'Élèves max' },
      { key: 'currentStudents', label: 'Élèves actuels' },
      { key: 'maxTeachers', label: 'Enseignants max' },
      { key: 'currentTeachers', label: 'Enseignants actuels' },
      { key: 'maxClasses', label: 'Classes max' },
      { key: 'currentClasses', label: 'Classes actuelles' },
      { key: 'storageUsedGb', label: 'Stockage (Go)' },
    ],
  },
  {
    title: 'Identifiants système',
    icon: 'dns',
    fields: [
      { key: 'code', label: 'Code' },
      { key: 'subdomain', label: 'Sous-domaine' },
      { key: 'id', label: 'Identifiant' },
      { key: 'createdAt', label: 'Créé le' },
      { key: 'updatedAt', label: 'Modifié le' },
    ],
  },
];

/** Toutes les clés éditables (à plat). */
export const SCHOOL_EDITABLE_KEYS = SCHOOL_EDITABLE_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
);

/**
 * Construit le FormGroup d'une école. En mode création, ajoute le champ `code`
 * et rend `code`/`name`/`email` obligatoires.
 */
export function buildSchoolFormGroup(create = false): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const key of SCHOOL_EDITABLE_KEYS) {
    const isArray = key === 'educationLevels';
    let validators = undefined;
    if (create && key === 'name') {
      validators = [Validators.required];
    } else if (create && key === 'email') {
      validators = [Validators.required, Validators.email];
    }
    controls[key] = new FormControl<string | string[]>(isArray ? [] : '', {
      nonNullable: true,
      validators,
    });
  }
  if (create) {
    controls['code'] = new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    });
  }
  return new FormGroup(controls);
}

/** Recopie les valeurs d'une école dans le formulaire (clés éditables). */
export function patchSchoolForm(form: FormGroup, school: Record<string, unknown>): void {
  const value: Record<string, string | string[]> = {};
  for (const key of SCHOOL_EDITABLE_KEYS) {
    const raw = school[key];
    value[key] =
      key === 'educationLevels'
        ? Array.isArray(raw)
          ? (raw as string[])
          : []
        : raw === null || raw === undefined
          ? ''
          : String(raw);
  }
  form.patchValue(value);
  form.markAsPristine();
}

/** Payload de mise à jour (PUT) : tout est envoyé, vide → null. */
export function schoolUpdatePayload(form: FormGroup): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form.getRawValue())) {
    payload[k] = k === 'educationLevels' ? v : v === '' ? null : v;
  }
  return payload;
}

/** Payload de création (POST) : on n'envoie que les champs renseignés. */
export function schoolCreatePayload(form: FormGroup): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form.getRawValue())) {
    if (k === 'educationLevels') {
      if (Array.isArray(v) && v.length) {
        payload[k] = v;
      }
    } else if (v !== '' && v !== null && v !== undefined) {
      payload[k] = v;
    }
  }
  return payload;
}
