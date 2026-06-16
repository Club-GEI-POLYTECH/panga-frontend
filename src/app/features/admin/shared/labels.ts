/** Extraction de libellés lisibles depuis des objets de forme variable. */

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

/** Nom affichable d'un parent / personne (gère `user` imbriqué, e-mail, etc.). */
export function personLabel(p: Record<string, unknown>): string {
  const user = (p['user'] ?? {}) as Record<string, unknown>;
  const full =
    `${str(p['firstName']) || str(user['firstName'])} ${str(p['lastName']) || str(user['lastName'])}`.trim();
  return (
    str(p['fullName']) ||
    str(p['displayName']) ||
    str(p['name']) ||
    full ||
    str(p['email']) ||
    str(user['email']) ||
    'Parent'
  );
}

/** Libellé d'une classe (nom, modèle, niveau/section). */
export function classLabel(c: Record<string, unknown>): string {
  const tpl = (c['template'] ?? {}) as Record<string, unknown>;
  const composed = [str(c['level']), str(c['section'])].filter(Boolean).join(' ');
  return (
    str(c['name']) ||
    str(c['displayName']) ||
    str(c['label']) ||
    str(tpl['name']) ||
    composed ||
    'Classe'
  );
}
