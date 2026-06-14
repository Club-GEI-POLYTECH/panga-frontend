import type { Role } from '../core/models/auth.models';

export interface NavItem {
  /** Clé i18n (nav.*) */
  labelKey: string;
  /** Icône Material Symbols */
  icon: string;
  /** Chemin de route (sous le shell) */
  path: string;
  roles: Role[];
}

const ALL: Role[] = ['super_admin', 'admin', 'teacher', 'parent', 'student'];

/** Navigation principale, filtrée par rôle. */
export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'dashboard', path: 'dashboard', roles: ALL },
  // Espace plateforme (super_admin) — vraies pages sous /platform/*.
  {
    labelKey: 'nav.platform',
    icon: 'insights',
    path: 'platform/overview',
    roles: ['super_admin'],
  },
  { labelKey: 'nav.schools', icon: 'apartment', path: 'platform/schools', roles: ['super_admin'] },
  {
    labelKey: 'nav.platformUsers',
    icon: 'group',
    path: 'platform/users',
    roles: ['super_admin'],
  },
  {
    labelKey: 'nav.billing',
    icon: 'receipt_long',
    path: 'platform/billing',
    roles: ['super_admin'],
  },
  {
    labelKey: 'nav.curriculum',
    icon: 'menu_book',
    path: 'platform/curriculum',
    roles: ['super_admin'],
  },
  { labelKey: 'nav.students', icon: 'school', path: 'students', roles: ['admin'] },
  { labelKey: 'nav.teachers', icon: 'badge', path: 'teachers', roles: ['admin'] },
  { labelKey: 'nav.parents', icon: 'family_restroom', path: 'parents', roles: ['admin'] },
  { labelKey: 'nav.classes', icon: 'meeting_room', path: 'classes', roles: ['admin', 'teacher'] },
  {
    labelKey: 'nav.grades',
    icon: 'grade',
    path: 'grades',
    roles: ['admin', 'teacher', 'parent', 'student'],
  },
  {
    labelKey: 'nav.bulletins',
    icon: 'description',
    path: 'bulletins',
    roles: ['admin', 'teacher', 'parent', 'student'],
  },
  {
    labelKey: 'nav.attendance',
    icon: 'fact_check',
    path: 'attendance',
    roles: ['admin', 'teacher', 'parent', 'student'],
  },
  { labelKey: 'nav.payments', icon: 'payments', path: 'payments', roles: ['admin', 'parent'] },
  {
    labelKey: 'nav.discipline',
    icon: 'gavel',
    path: 'discipline',
    roles: ['admin', 'teacher', 'parent'],
  },
  { labelKey: 'nav.reports', icon: 'analytics', path: 'reports', roles: ['admin', 'teacher'] },
  {
    labelKey: 'nav.communications',
    icon: 'forum',
    path: 'communications',
    roles: ALL,
  },
];

export function navForRole(role: Role | null): NavItem[] {
  if (!role) {
    return [];
  }
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
