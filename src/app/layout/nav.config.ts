import type { Role } from '../core/models/auth.models';

/** Groupes de navigation (clé i18n `nav.groups.*`). Ordre = ordre d'affichage. */
export type NavGroup = 'main' | 'gestion' | 'pedagogie' | 'communication';

export interface NavItem {
  /** Clé i18n (nav.*) */
  labelKey: string;
  /** Icône Material Symbols */
  icon: string;
  /** Chemin de route (sous le shell) */
  path: string;
  roles: Role[];
  /** Regroupement dans la barre latérale. */
  group: NavGroup;
}

export interface NavSection {
  group: NavGroup;
  items: NavItem[];
}

const ALL: Role[] = ['super_admin', 'admin', 'teacher', 'parent', 'student'];

/** Ordre des groupes dans la barre latérale. */
const GROUP_ORDER: NavGroup[] = ['main', 'gestion', 'pedagogie', 'communication'];

/** Navigation principale, filtrée par rôle puis regroupée. */
export const NAV_ITEMS: NavItem[] = [
  // Le super_admin a son propre tableau de bord plateforme (cf. ci-dessous).
  {
    labelKey: 'nav.dashboard',
    icon: 'dashboard',
    path: 'dashboard',
    roles: ['admin', 'teacher', 'parent', 'student'],
    group: 'main',
  },
  // Espace plateforme (super_admin) — vraies pages sous /platform/*.
  {
    labelKey: 'nav.platform',
    icon: 'space_dashboard',
    path: 'platform/overview',
    roles: ['super_admin'],
    group: 'main',
  },
  { labelKey: 'nav.school', icon: 'apartment', path: 'my-school', roles: ['admin'], group: 'main' },
  {
    labelKey: 'nav.schools',
    icon: 'apartment',
    path: 'platform/schools',
    roles: ['super_admin'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.platformUsers',
    icon: 'group',
    path: 'platform/users',
    roles: ['super_admin'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.billing',
    icon: 'receipt_long',
    path: 'platform/billing',
    roles: ['super_admin'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.curriculum',
    icon: 'menu_book',
    path: 'platform/curriculum',
    roles: ['super_admin'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.students',
    icon: 'school',
    path: 'students',
    roles: ['admin'],
    group: 'gestion',
  },
  { labelKey: 'nav.teachers', icon: 'badge', path: 'teachers', roles: ['admin'], group: 'gestion' },
  {
    labelKey: 'nav.parents',
    icon: 'family_restroom',
    path: 'parents',
    roles: ['admin'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.classes',
    icon: 'meeting_room',
    path: 'classes',
    roles: ['admin', 'teacher'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.grades',
    icon: 'grade',
    path: 'grades',
    roles: ['admin', 'teacher', 'parent', 'student'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.bulletins',
    icon: 'description',
    path: 'bulletins',
    roles: ['admin', 'teacher', 'parent', 'student'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.courseJournal',
    icon: 'auto_stories',
    path: 'course-journal',
    roles: ['admin', 'teacher', 'parent'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.attendance',
    icon: 'fact_check',
    path: 'attendance',
    roles: ['admin', 'teacher', 'parent', 'student'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.promotions',
    icon: 'workspace_premium',
    path: 'promotions',
    roles: ['admin', 'teacher'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.exams',
    icon: 'quiz',
    path: 'exams',
    roles: ['admin', 'teacher'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.payments',
    icon: 'payments',
    path: 'payments',
    roles: ['admin', 'parent'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.discipline',
    icon: 'gavel',
    path: 'discipline',
    roles: ['admin', 'teacher', 'parent'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.reports',
    icon: 'analytics',
    path: 'reports',
    roles: ['admin', 'teacher'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.communications',
    icon: 'forum',
    path: 'communications',
    roles: ALL,
    group: 'communication',
  },
];

export function navForRole(role: Role | null): NavItem[] {
  if (!role) {
    return [];
  }
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Navigation regroupée par section (groupes vides omis). */
export function navSectionsForRole(role: Role | null): NavSection[] {
  const items = navForRole(role);
  return GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((section) => section.items.length > 0);
}
