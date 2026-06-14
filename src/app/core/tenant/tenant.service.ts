import { computed, inject, Injectable } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

/**
 * Contexte multi-tenant. Source de vérité : l'école active du AuthStore.
 * Exposé séparément pour que l'interceptor et les écrans consomment un
 * point unique (id d'école active).
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly store = inject(AuthStore);

  readonly activeSchool = this.store.activeSchool;
  readonly activeSchoolId = computed(() => this.store.activeSchool()?.id ?? null);
}
