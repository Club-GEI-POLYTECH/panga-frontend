import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

/**
 * Garantit qu'une école active est sélectionnée avant d'accéder aux écrans
 * dépendant du contexte tenant (parents multi-écoles).
 */
export const schoolContextGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.needsSchoolSelection()) {
    return router.createUrlTree(['/select-school']);
  }
  return true;
};
