import { Injectable, signal } from '@angular/core';

const REFRESH_KEY = 'panga.rt';

/**
 * Stockage des jetons.
 *
 * - `accessToken` : gardé EN MÉMOIRE uniquement (signal), jamais persisté.
 * - `refreshToken` : en production, préférer un cookie httpOnly posé par le
 *   backend (rotation côté serveur). À défaut, on le conserve en
 *   `sessionStorage` (non durable, effacé à la fermeture de l'onglet) pour
 *   permettre le refresh silencieux au rechargement — JAMAIS en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = this._accessToken.asReadonly();

  setAccessToken(token: string | null): void {
    this._accessToken.set(token);
  }

  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  }

  setRefreshToken(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(REFRESH_KEY, token);
      } else {
        sessionStorage.removeItem(REFRESH_KEY);
      }
    } catch {
      /* sessionStorage indisponible (mode privé strict) : on ignore. */
    }
  }

  clear(): void {
    this._accessToken.set(null);
    this.setRefreshToken(null);
  }
}
