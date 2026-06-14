import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import type { Role } from '../models/auth.models';

/**
 * Restreint une route à un ou plusieurs rôles.
 * Usage : `canActivate: [authGuard, roleGuard('admin', 'super_admin')]`.
 * Le masquage UI est doublé d'un contrôle serveur (RBAC/ABAC backend).
 */
export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);
    const role = store.role();

    if (role && allowed.includes(role)) {
      return true;
    }
    // Rôle non autorisé : on renvoie vers le tableau de bord de l'utilisateur.
    return router.createUrlTree(['/dashboard']);
  };
}
