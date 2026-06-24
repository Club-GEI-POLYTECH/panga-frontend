import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { Role, School, User } from '../models/auth.models';

type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error';

interface AuthState {
  user: User | null;
  activeSchool: School | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  activeSchool: null,
  status: 'idle',
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
