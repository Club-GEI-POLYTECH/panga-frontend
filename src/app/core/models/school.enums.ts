/**
 * Options alignées sur les enums du backend (entité `School` / `SchoolAuthority`).
 * Les `value` DOIVENT correspondre exactement aux enums serveur pour éviter les
 * erreurs de validation.
 */

export interface EnumOption {
  value: string;
  label: string;
}

/** School.schoolType — `SchoolType`. */
export const SCHOOL_TYPE_OPTIONS: EnumOption[] = [
  { value: 'state', label: 'Public / officiel' },
  { value: 'catholic_subsidized', label: 'Conventionné catholique' },
  { value: 'protestant', label: 'Réseau protestant' },
  { value: 'private', label: 'Privé' },
  { value: 'secular_subsidized', label: 'Libre laïc subventionné' },
  { value: 'international', label: 'International' },
  { value: 'other', label: 'Autre' },
];

/** School.accreditationStatus — `AccreditationStatus`. */
export const ACCREDITATION_STATUS_OPTIONS: EnumOption[] = [
  { value: 'accredited', label: 'Accréditée' },
  { value: 'pending', label: 'En cours' },
  { value: 'provisional', label: 'Provisoire' },
  { value: 'not_accredited', label: 'Non accréditée' },
];

/** School.subscriptionPlan — `SubscriptionPlan` (lecture seule côté école). */
export const SUBSCRIPTION_PLAN_OPTIONS: EnumOption[] = [
  { value: 'free', label: 'Gratuit' },
  { value: 'basic', label: 'Basic' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Entreprise' },
  { value: 'trial', label: 'Essai' },
];

/** School.status — `SchoolStatus`. */
export const SCHOOL_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspendue' },
  { value: 'pending_activation', label: 'En attente' },
  { value: 'closed', label: 'Fermée' },
];

/**
 * School.educationLevels — `jsonb string[]` (pas d'enum strict côté serveur,
 * valeurs usuelles RDC/FWB).
 */
export const EDUCATION_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'preschool', label: 'Maternelle' },
  { value: 'primary', label: 'Primaire' },
  { value: 'secondary', label: 'Secondaire' },
  { value: 'vocational', label: 'Professionnel' },
  { value: 'university', label: 'Supérieur' },
];

/** SchoolAuthority.roleCode — `SchoolAuthorityRoleCode`. */
export const AUTHORITY_ROLE_OPTIONS: EnumOption[] = [
  { value: 'primary_director', label: 'Directeur (primaire)' },
  { value: 'primary_deputy_director', label: 'Directeur adjoint (primaire)' },
  { value: 'secondary_prefect', label: 'Préfet (secondaire)' },
  { value: 'secondary_deputy_prefect', label: 'Préfet adjoint (secondaire)' },
  { value: 'principal', label: 'Principal' },
  { value: 'vice_principal', label: 'Vice-principal' },
];

/** SchoolAuthority.educationLevel — `SchoolAuthorityEducationLevel`. */
export const AUTHORITY_EDU_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'all', label: 'Tous' },
  { value: 'primary', label: 'Primaire' },
  { value: 'secondary', label: 'Secondaire' },
];

/** Niveau logique de chaque rôle (pour filtrer les rôles selon le niveau choisi). */
export const AUTHORITY_ROLE_LEVEL: Record<string, 'primary' | 'secondary' | 'all'> = {
  primary_director: 'primary',
  primary_deputy_director: 'primary',
  secondary_prefect: 'secondary',
  secondary_deputy_prefect: 'secondary',
  principal: 'all',
  vice_principal: 'all',
};

/**
 * Rôles proposés pour un niveau donné : ceux du niveau + les rôles « tous niveaux ».
 * Confort UX (le backend n'impose pas la cohérence rôle/niveau).
 */
export function authorityRolesForLevel(level: string): EnumOption[] {
  return AUTHORITY_ROLE_OPTIONS.filter((o) => {
    const roleLevel = AUTHORITY_ROLE_LEVEL[o.value];
    return roleLevel === 'all' || level === 'all' || roleLevel === level;
  });
}
