import type { AuditLog } from '../../super-admin/models/platform.models';

/** Rendu lisible d'une entrée d'audit (activité récente). */
export interface AuditView {
  icon: string;
  title: string;
  subtitle: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';
}

/** Verbe FR + icône + tonalité selon l'action. */
const ACTIONS: Record<string, { verb: string; icon: string; tone: AuditView['tone'] }> = {
  CREATE: { verb: 'Création', icon: 'add_circle', tone: 'success' },
  UPDATE: { verb: 'Mise à jour', icon: 'edit', tone: 'info' },
  DELETE: { verb: 'Suppression', icon: 'delete', tone: 'danger' },
  LOGIN: { verb: 'Connexion', icon: 'login', tone: 'brand' },
  LOGOUT: { verb: 'Déconnexion', icon: 'logout', tone: 'neutral' },
  PUBLISH: { verb: 'Publication', icon: 'campaign', tone: 'brand' },
};

/** Libellé FR d'un type de ressource (resourceType backend). */
const RESOURCES: Record<string, string> = {
  'course-journal': 'Journal de cours',
  curriculum: 'Curriculum',
  classes: 'Classes',
  students: 'Élèves',
  teachers: 'Enseignants',
  parents: 'Parents',
  grades: 'Notes',
  bulletins: 'Bulletins',
  attendance: 'Présences',
  payments: 'Paiements',
  subjects: 'Cours',
  'national-programs': 'Programme national',
  'bulletin-programs': 'Référentiel bulletin',
  'class-instances': 'Classe (instance)',
  'class-templates': 'Classe (modèle)',
  'period-targets': 'Heures prévues',
};

/** Précisions utiles selon resourceId (sous-ressource). */
const SUB_RESOURCES: Record<string, string> = {
  'period-targets': 'heures prévues',
  'class-instances': 'programme de classe',
  'class-templates': 'programme de modèle',
  'national-programs': 'activation programme',
};

function resourceLabel(type?: string): string {
  if (!type) {
    return 'Ressource';
  }
  return RESOURCES[type] ?? type.replace(/[-_]/g, ' ');
}

/** Construit une vue lisible à partir d'une entrée d'audit. */
export function auditView(a: AuditLog): AuditView {
  const meta = ACTIONS[(a.action ?? '').toUpperCase()] ?? {
    verb: a.action || 'Action',
    icon: 'bolt',
    tone: 'neutral' as const,
  };
  const resource = resourceLabel(a.resourceType);
  const sub = a.resourceId ? SUB_RESOURCES[a.resourceId] : undefined;
  const title = sub ? `${meta.verb} · ${resource} (${sub})` : `${meta.verb} · ${resource}`;

  const role = a.userRole ? roleLabel(a.userRole) : '';
  const parts = [role, a.method].filter(Boolean);
  const failed = typeof a.statusCode === 'number' && a.statusCode >= 400;

  return {
    icon: failed ? 'error' : meta.icon,
    title,
    subtitle: parts.join(' · ') || (a.path ?? ''),
    tone: failed ? 'danger' : meta.tone,
  };
}

function roleLabel(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super admin';
    case 'admin':
      return 'Direction';
    case 'teacher':
      return 'Enseignant';
    case 'parent':
      return 'Parent';
    case 'student':
      return 'Élève';
    default:
      return role;
  }
}
