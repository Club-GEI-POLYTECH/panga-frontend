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
  /**
   * Rôles autorisés — utilisé pour les entrées « personnelles » (espace élève,
   * plateforme super_admin, dashboard) qui n'ont pas de permission RBAC dédiée.
   */
  roles: Role[];
  /**
   * Permission RBAC (`resource.action`) requise. Si présente, elle **prime** sur
   * `roles` pour le filtrage : l'entrée s'affiche ssi l'utilisateur a la permission.
   */
  permission?: string;
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

/** Navigation principale, filtrée par permission/rôle puis regroupée. */
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
  {
    // Enseignant : accès en lecture seule (pas de `schools.read`) → filtrage par rôle.
    labelKey: 'nav.school',
    icon: 'apartment',
    path: 'my-school',
    roles: ['admin', 'teacher'],
    group: 'main',
  },
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
    labelKey: 'nav.pricing',
    icon: 'sell',
    path: 'platform/pricing',
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
    permission: 'students.read',
    group: 'gestion',
  },
  {
    labelKey: 'nav.teachers',
    icon: 'badge',
    path: 'teachers',
    roles: ['admin'],
    permission: 'teachers.read',
    group: 'gestion',
  },
  {
    labelKey: 'nav.parents',
    icon: 'family_restroom',
    path: 'parents',
    roles: ['admin'],
    permission: 'parents.read',
    group: 'gestion',
  },
  {
    labelKey: 'nav.classes',
    icon: 'meeting_room',
    path: 'classes',
    roles: ['admin', 'teacher'],
    permission: 'classes.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.schedule',
    icon: 'calendar_month',
    path: 'emploi-du-temps',
    roles: ['teacher', 'parent'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.scolarite',
    icon: 'menu_book',
    path: 'ma-scolarite',
    roles: ['student'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.myPayments',
    icon: 'payments',
    path: 'mes-paiements',
    roles: ['student'],
    group: 'gestion',
  },
  {
    labelKey: 'nav.myServices',
    icon: 'apps',
    path: 'mes-services',
    roles: ['student'],
    group: 'communication',
  },
  {
    labelKey: 'nav.myNotifications',
    icon: 'notifications',
    path: 'mes-notifications',
    roles: ['student'],
    group: 'communication',
  },
  {
    labelKey: 'nav.grades',
    icon: 'grade',
    path: 'grades',
    roles: ['admin', 'teacher', 'parent'],
    permission: 'grades.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.bulletins',
    icon: 'description',
    path: 'bulletins',
    roles: ['admin', 'teacher', 'parent'],
    permission: 'bulletins.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.courseJournal',
    icon: 'auto_stories',
    path: 'course-journal',
    roles: ['admin', 'teacher', 'parent'],
    permission: 'course-journal.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.attendance',
    icon: 'fact_check',
    path: 'attendance',
    roles: ['admin', 'teacher', 'parent'],
    permission: 'attendance.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.promotions',
    icon: 'workspace_premium',
    path: 'promotions',
    roles: ['admin', 'teacher'],
    permission: 'promotions.read',
    group: 'pedagogie',
  },
  {
    // Gestion complète : admin uniquement (l'enseignant a `nav.myExams` ci-dessous —
    // `exams.read` est aussi accordé à l'enseignant mais pour un écran différent,
    // donc le filtrage se fait par rôle plutôt que par permission ici).
    labelKey: 'nav.exams',
    icon: 'quiz',
    path: 'exams',
    roles: ['admin'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.myExams',
    icon: 'quiz',
    path: 'mes-examens',
    roles: ['teacher'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.mySupervisions',
    icon: 'meeting_room',
    path: 'mes-surveillances',
    roles: ['teacher'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.myExams',
    icon: 'quiz',
    path: 'mes-resultats-examens',
    roles: ['student', 'parent'],
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.payments',
    icon: 'payments',
    path: 'payments',
    roles: ['admin', 'parent'],
    permission: 'payments.read',
    group: 'gestion',
  },
  {
    labelKey: 'nav.discipline',
    icon: 'gavel',
    path: 'discipline',
    roles: ['admin', 'teacher', 'parent'],
    permission: 'discipline.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.reports',
    icon: 'analytics',
    path: 'reports',
    roles: ['admin', 'teacher'],
    permission: 'reports.read',
    group: 'pedagogie',
  },
  {
    labelKey: 'nav.communications',
    icon: 'forum',
    path: 'communications',
    roles: ALL,
    group: 'communication',
  },
  {
    labelKey: 'nav.settings',
    icon: 'settings',
    path: 'settings',
    roles: ['admin'],
    permission: 'settings.read',
    group: 'gestion',
  },
];

/**
 * Une entrée est-elle visible ? Si elle porte une `permission`, on interroge le
 * prédicat RBAC `can` ; sinon on retombe sur le rôle (entrées personnelles).
 */
function isVisible(item: NavItem, role: Role | null, can: (perm: string) => boolean): boolean {
  // super_admin : contexte plateforme cross-tenant → uniquement ses entrées
  // dédiées, même s'il possède `manage` (donc `can`) sur toutes les ressources.
  if (role === 'super_admin') {
    return item.roles.includes('super_admin');
  }
  if (item.permission) {
    return can(item.permission);
  }
  return role !== null && item.roles.includes(role);
}

export function navForRole(role: Role | null, can: (perm: string) => boolean): NavItem[] {
  if (!role) {
    return [];
  }
  return NAV_ITEMS.filter((item) => isVisible(item, role, can));
}

/** Navigation regroupée par section (groupes vides omis). */
export function navSectionsFor(role: Role | null, can: (perm: string) => boolean): NavSection[] {
  const items = navForRole(role, can);
  return GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((section) => section.items.length > 0);
}
