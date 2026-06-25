import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../http/http-context';
import type { LoginHistoryEntry, LoginRequest, Role, School, User } from '../models/auth.models';
import { AuthStore } from './auth.store';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly store = inject(AuthStore);

  private readonly base = `${environment.apiBaseUrl}/auth`;

  /** Refresh « single-flight » : une seule requête concurrente partagée. */
  private refresh$: Observable<string> | null = null;

  /** Logout « single-flight » : évite la rafale d'appels (→ 429 throttler). */
  private logout$: Observable<void> | null = null;

  login(req: LoginRequest): Observable<User> {
    this.store.setStatus('authenticating');
    // Silencieux : la page login gère les erreurs (401/403 verrouillage) en FR inline.
    return this.http
      .post<unknown>(`${this.base}/login`, req, {
        withCredentials: true,
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(
        map((res) => this.applyLogin(unwrap(res))),
        catchError((err) => {
          this.store.setStatus('error');
          return throwError(() => err);
        }),
      );
  }

  /** Refresh de l'access token. Le backend attend `{ refresh_token }`. */
  refreshAccessToken(): Observable<string> {
    if (this.refresh$) {
      return this.refresh$;
    }
    const refreshToken = this.tokens.getRefreshToken();
    // Pas de refresh token : inutile d'appeler le back (il renverrait 400 sur un
    // body vide). On échoue immédiatement pour déclencher une déconnexion propre.
    if (!refreshToken) {
      return throwError(() => new Error('Aucun refresh token disponible'));
    }

    this.refresh$ = this.http
      .post<unknown>(
        `${this.base}/refresh`,
        { refresh_token: refreshToken },
        { withCredentials: true },
      )
      .pipe(
        map((res) => {
          const data = unwrap(res);
          const access = pickAccess(data);
          if (!access) {
            throw new Error('Réponse de refresh sans access token');
          }
          this.tokens.setAccessToken(access);
          const refresh = pickRefresh(data);
          if (refresh) {
            this.tokens.setRefreshToken(refresh);
          }
          return access;
        }),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    return this.refresh$;
  }

  /** Restaure la session au démarrage (refresh silencieux + profil). */
  bootstrapSession(): Observable<boolean> {
    if (!this.tokens.getRefreshToken()) {
      return of(false);
    }
    return this.refreshAccessToken().pipe(
      // On DOIT attendre le profil : c'est loadMe() qui passe le store à
      // « authenticated ». Un fire-and-forget laisserait le guard rediriger
      // vers /login avant que la session soit posée (→ déconnexion à chaque refresh).
      switchMap(() => this.loadMe()),
      map(() => true),
      catchError(() => {
        this.tokens.clear();
        return of(false);
      }),
    );
  }

  loadMe(): Observable<User> {
    return this.http.get<unknown>(`${this.base}/profile`).pipe(
      map((res) => mapUser(unwrap(res))),
      tap((user) => this.store.setSession(user, this.pickDefaultSchool(user))),
    );
  }

  /** Met à jour le profil de l'utilisateur connecté (PUT /users/me). */
  updateProfile(dto: Record<string, unknown>): Observable<User> {
    return this.http.put<unknown>(`${environment.apiBaseUrl}/users/me`, dto).pipe(
      map((res) => mapUser(unwrap(res))),
      tap((user) => this.store.setUser(user)),
    );
  }

  /** Définit ma photo de profil (multipart, champ « file »). */
  uploadAvatar(file: File): Observable<unknown> {
    const form = new FormData();
    form.append('file', file); // ne PAS fixer Content-Type : le navigateur pose le boundary.
    return this.http.post<unknown>(`${environment.apiBaseUrl}/users/me/avatar`, form);
  }

  /** Supprime ma photo de profil. */
  deleteAvatar(): Observable<unknown> {
    return this.http.delete<unknown>(`${environment.apiBaseUrl}/users/me/avatar`);
  }

  selectSchool(school: School): void {
    this.store.setActiveSchool(school);
  }

  /** Demande un e-mail de réinitialisation (route publique). */
  forgotPassword(email: string): Observable<void> {
    return this.http
      .post<unknown>(`${this.base}/forgot-password`, { email })
      .pipe(map(() => undefined));
  }

  /** Réinitialise le mot de passe via le token reçu par e-mail (route publique). */
  resetPassword(token: string, password: string): Observable<void> {
    return this.http
      .post<unknown>(`${this.base}/reset-password`, { token, password })
      .pipe(map(() => undefined));
  }

  /** Change le mot de passe de l'utilisateur connecté. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<unknown>(`${this.base}/change-password`, { currentPassword, newPassword })
      .pipe(map(() => undefined));
  }

  /** Journal des connexions de l'utilisateur connecté. */
  loginHistory(): Observable<LoginHistoryEntry[]> {
    return this.http
      .get<unknown>(`${this.base}/login-history`)
      .pipe(map((res) => asList(unwrap(res))));
  }

  /** Bascule le contexte école d'un parent multi-écoles (rotation des tokens). */
  switchSchool(schoolId: string): Observable<void> {
    return this.http.post<unknown>(`${this.base}/parent/switch-school`, { schoolId }).pipe(
      map((res) => {
        const data = unwrap(res);
        const access = pickAccess(data);
        if (access) {
          this.tokens.setAccessToken(access);
        }
        const refresh = pickRefresh(data);
        if (refresh) {
          this.tokens.setRefreshToken(refresh);
        }
        const school = this.store.schools().find((s) => s.id === schoolId) ?? {
          id: schoolId,
          name: '',
        };
        this.store.setActiveSchool(school);
        return undefined;
      }),
    );
  }

  logout(): Observable<void> {
    // Plusieurs 401 concurrents peuvent tous déclencher un logout : on partage
    // un seul appel pour ne pas marteler le back (ThrottlerException → 429).
    if (this.logout$) {
      return this.logout$;
    }
    const refreshToken = this.tokens.getRefreshToken();
    const request$: Observable<unknown> = refreshToken
      ? this.http.post<unknown>(
          `${this.base}/logout`,
          { refresh_token: refreshToken },
          { withCredentials: true },
        )
      : of(null);

    this.logout$ = request$.pipe(
      catchError(() => of(null)),
      map(() => undefined),
      finalize(() => {
        this.tokens.clear();
        this.store.clear();
        this.logout$ = null;
      }),
      shareReplay(1),
    );
    return this.logout$;
  }

  private applyLogin(data: unknown): User {
    const access = pickAccess(data);
    const refresh = pickRefresh(data);
    if (access) {
      this.tokens.setAccessToken(access);
    }
    if (refresh) {
      this.tokens.setRefreshToken(refresh);
    }
    const rawUser = (prop(data, 'user') ?? prop(data, 'profile') ?? data) as unknown;
    const user = mapUser(rawUser);
    // `schools` peut être à la racine de la réponse ou dans l'utilisateur.
    const schools = (prop(data, 'schools') ?? prop(rawUser, 'schools')) as School[] | undefined;
    const full: User = { ...user, schools: user.schools ?? schools };
    this.store.setSession(full, this.pickDefaultSchool(full));
    return full;
  }

  /** Auto-sélection du contexte tenant. */
  private pickDefaultSchool(user: User): School | null {
    const schools = user.schools ?? [];
    if (schools.length === 1) {
      return schools[0];
    }
    if (schools.length > 1) {
      return null; // sélection explicite requise (parent multi-écoles)
    }
    // Cas mono-école (admin/teacher/student) : on prend l'école du profil.
    return user.schoolId ? { id: user.schoolId, name: '' } : null;
  }
}

/* --------------------------------------------------------------------------
   Normalisation des réponses (le backend mélange enveloppe et casse camel/snake).
   -------------------------------------------------------------------------- */

function prop(o: unknown, key: string): unknown {
  return o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined;
}

function str(o: unknown, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = prop(o, k);
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return undefined;
}

/** Déballe l'enveloppe `{ success, data }` si présente, sinon renvoie la valeur. */
function unwrap(res: unknown): unknown {
  if (res && typeof res === 'object' && 'data' in res && 'success' in res) {
    return (res as Record<string, unknown>)['data'] ?? {};
  }
  return res ?? {};
}

/** Extrait une liste, qu'elle soit brute ou paginée `{ data | items | history }`. */
function asList(d: unknown): LoginHistoryEntry[] {
  if (Array.isArray(d)) {
    return d as LoginHistoryEntry[];
  }
  const inner = prop(d, 'data') ?? prop(d, 'items') ?? prop(d, 'history');
  return Array.isArray(inner) ? (inner as LoginHistoryEntry[]) : [];
}

function pickAccess(d: unknown): string | undefined {
  return (
    str(d, 'accessToken', 'access_token', 'token') ??
    str(prop(d, 'tokens'), 'accessToken', 'access_token')
  );
}

function pickRefresh(d: unknown): string | undefined {
  return (
    str(d, 'refreshToken', 'refresh_token') ??
    str(prop(d, 'tokens'), 'refreshToken', 'refresh_token')
  );
}

function mapUser(u: unknown): User {
  // On conserve d'abord tous les champs bruts (postnom, gender, dateOfBirth…)
  // pour l'édition de profil, puis on normalise les champs connus par-dessus.
  const raw = u && typeof u === 'object' ? (u as Record<string, unknown>) : {};
  return {
    ...raw,
    id: str(u, 'id', 'userId', 'uuid') ?? '',
    email: str(u, 'email') ?? '',
    username: str(u, 'username'),
    firstName: str(u, 'firstName', 'first_name') ?? '',
    lastName: str(u, 'lastName', 'last_name') ?? '',
    role: (str(u, 'role', 'userType', 'type') ?? '') as Role,
    avatarUrl: str(u, 'avatar', 'profilePhoto', 'avatarUrl') ?? null,
    schoolId: str(u, 'schoolId', 'school_id') ?? null,
    schools: prop(u, 'schools') as School[] | undefined,
    status: str(u, 'status') ?? null,
    phone: str(u, 'phone') ?? null,
    nationality: str(u, 'nationality') ?? null,
    address: str(u, 'address') ?? null,
    city: str(u, 'city') ?? null,
    country: str(u, 'country') ?? null,
    createdAt: str(u, 'createdAt', 'created_at') ?? null,
    lastLoginAt: str(u, 'lastLoginAt', 'last_login_at') ?? null,
  };
}
