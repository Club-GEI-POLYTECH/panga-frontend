import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapEnvelope } from '../../../core/http/api.util';

export interface ResetPasswordResult {
  temporaryPassword?: string;
  [key: string]: unknown;
}

/** Comptes utilisateurs (actions admin transverses). */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/users`;

  /**
   * Réinitialise le mot de passe d'un compte (admin / super_admin).
   * Sans `newPassword` : un mot de passe temporaire est généré et renvoyé une
   * seule fois. C'est le moyen de redonner l'accès à un compte sans e-mail
   * (élève / parent), qui ne peut pas utiliser « mot de passe oublié ».
   */
  resetPassword(userId: string, newPassword?: string): Observable<ResetPasswordResult> {
    const body = newPassword ? { newPassword } : {};
    return this.http
      .post<unknown>(`${this.base}/${userId}/reset-password`, body)
      .pipe(map((r) => unwrapEnvelope<ResetPasswordResult>(r)));
  }
}
