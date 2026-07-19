import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { Role, School, User } from '../models/auth.models';
import { hasPermission } from './permissions';

type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error';

interface AuthState {
  user: User | null;
  activeSchool: School | null;
  status: AuthStatus;
  /** Permissions RBAC (`resource.action`) ; `null` = pas encore chargées. */
  permissions: string[] | null;
}

const initialState: AuthState = {
  user: null,
  activeSchool: null,
  status: 'idle',
  permissions: null,
};

/**
 * Store de session global (signals). L'access token vit dans TokenService,
 * pas ici (on évite d'exposer le secret dans le store / devtools).
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user, activeSchool, status }) => ({
    isAuthenticated: computed(() => status() === 'authenticated' && user() !== null),
    role: computed<Role | null>(() => user()?.role ?? null),
    schools: computed<School[]>(() => user()?.schools ?? []),
    needsSchoolSelection: computed(() => {
      const list = user()?.schools ?? [];
      return list.length > 1 && activeSchool() === null;
    }),
    fullName: computed(() => {
      const u = user();
      return u ? `${u.firstName} ${u.lastName}`.trim() : '';
    }),
  })),
  withMethods((store) => ({
    setSession(user: User, activeSchool: School | null): void {
      patchState(store, { user, activeSchool, status: 'authenticated' });
    },
    /** Enregistre les permissions RBAC récupérées via `GET /auth/permissions`. */
    setPermissions(permissions: string[]): void {
      patchState(store, { permissions });
    },
    /**
     * L'utilisateur a-t-il la permission `required` (ex. `students.create`) ?
     * Réactif (lit le signal `permissions`) : utilisable directement en template.
     * Fail-open tant que les permissions ne sont pas chargées (cf. hasPermission).
     */
    can(required: string): boolean {
      return hasPermission(store.permissions(), required);
    },
    /** Met à jour l'utilisateur sans toucher à l'école active (ex. édition profil). */
    setUser(user: User): void {
      patchState(store, { user });
    },
    setActiveSchool(school: School | null): void {
      patchState(store, { activeSchool: school });
    },
    setStatus(status: AuthStatus): void {
      patchState(store, { status });
    },
    clear(): void {
      patchState(store, initialState);
    },
  })),
);
