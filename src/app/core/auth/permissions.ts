/**
 * Helpers RBAC dynamique (permissions `resource.action`).
 *
 * Le backend impose les permissions (403 si manquante) ; côté front on s'en sert
 * uniquement pour masquer/désactiver l'UI. Le format est `resource.action`, et une
 * permission `resource.manage` implique toutes les actions (read/create/update/delete).
 */

/**
 * L'utilisateur possède-t-il la permission `required` (ex. `students.create`) ?
 *
 * @param perms Liste des permissions de l'utilisateur, ou `null` tant qu'elle n'a
 *   pas encore été chargée. Dans ce cas on répond **fail-open** (`true`) : on
 *   n'affiche jamais une UI vide par méconnaissance ; le backend reste l'autorité.
 */
export function hasPermission(perms: readonly string[] | null, required: string): boolean {
  if (perms === null) {
    return true; // permissions pas encore chargées → fail-open (le back tranche)
  }
  if (perms.includes(required)) {
    return true;
  }
  const resource = required.split('.')[0];
  return perms.includes(`${resource}.manage`); // manage = toutes les actions
}
