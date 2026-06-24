import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

/**
 * URL de la photo de profil. La route `/users/:id/avatar` est publique → on
 * construit une URL directe utilisable dans un `<img>` (pas de blob/token).
 * `user.avatar` vaut déjà « /v1/users/:id/avatar » ; on préfixe par l'origine
 * de l'API (vide en dev → proxifié ; domaine API en prod).
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly store = inject(AuthStore);
  /** Origine de l'API sans le suffixe /v1 (dev: '' ; prod: https://api…). */
  private readonly origin = environment.apiBaseUrl.replace(/\/v1\/?$/, '');
  /** Incrémenté après un changement de photo pour casser le cache navigateur. */
  private readonly version = signal(0);

  /**
   * URL de MA photo, construite depuis l'id (l'URL est déterministe et la route
   * publique). Si aucune photo n'existe, le 404 retombe sur les initiales
   * (l'endpoint /auth/profile ne renvoie pas toujours le champ `avatar`).
   */
  readonly myUrl = computed(() => {
    const id = this.store.user()?.id;
    if (!id) {
      return null;
    }
    const v = this.version();
    return `${environment.apiBaseUrl}/users/${id}/avatar${v ? `?v=${v}` : ''}`;
  });

  /** Construit l'URL publique d'un avatar (`avatar` = « /v1/users/:id/avatar »). */
  urlFor(avatar: string | null | undefined, v = 0): string | null {
    if (!avatar) {
      return null;
    }
    const bust = v ? `${avatar.includes('?') ? '&' : '?'}v=${v}` : '';
    return `${this.origin}${avatar}${bust}`;
  }

  /** Force le rafraîchissement de ma photo (après upload). */
  bump(): void {
    this.version.update((n) => n + 1);
  }
}
