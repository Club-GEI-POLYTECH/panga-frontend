import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../http/http-context';
import { AuthStore } from './auth.store';

/**
 * Photo de profil de l'utilisateur connecté, partagée par tout le shell.
 * La route `/users/:id/avatar` est protégée par JWT → on récupère un blob et on
 * expose un objectURL (révoqué au remplacement). Aucune photo = `null` (initiales).
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);

  readonly myUrl = signal<string | null>(null);
  private objectUrl: string | null = null;

  /** (Re)charge ma photo si le profil en déclare une (`user.avatarUrl`). */
  refreshMine(): void {
    const u = this.store.user();
    if (!u?.id || !u.avatarUrl) {
      this.setMine(null); // pas de photo → pas d'appel, pas d'erreur
      return;
    }
    this.http
      .get(`${environment.apiBaseUrl}/users/${u.id}/avatar`, {
        responseType: 'blob',
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({
        next: (blob) => this.setMine(blob && blob.size > 0 ? URL.createObjectURL(blob) : null),
        error: () => this.setMine(null),
      });
  }

  clearMine(): void {
    this.setMine(null);
  }

  private setMine(url: string | null): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    this.objectUrl = url;
    this.myUrl.set(url);
  }
}
