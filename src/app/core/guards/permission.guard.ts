import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

/**
 * Restreint une route à une ou plusieurs permissions RBAC (`resource.action`).
 * Sémantique **OU** : l'accès est accordé si l'utilisateur a au moins une des
 * permissions listées (une `resource.manage` couvre toutes les actions).
 *
 * Usage : `canActivate: [authGuard, permissionGuard('students.read')]`.
 * Fail-open tant que les permissions ne sont pas chargées (cf. `AuthStore.can`) ;
 * le masquage UI reste doublé du contrôle serveur (403).
 */
export function permissionGuard(...required: string[]): CanActivateFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    if (required.length === 0 || required.some((perm) => store.can(perm))) {
      return true;
    }
    // Permission manquante : retour au tableau de bord de l'utilisateur.
    return router.createUrlTree(['/dashboard']);
  };
}
