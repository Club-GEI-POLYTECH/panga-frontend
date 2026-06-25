import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { unwrapList } from '../http/api.util';

/** Notification persistée (backend). Tolère `isRead` ou `read`. */
export interface AppNotification {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  category?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

/** Une notification est-elle lue ? (champ backend `isRead`, repli `read`). */
export function isNotifRead(n: AppNotification): boolean {
  return (n['isRead'] ?? n.read) === true;
}

/** Une notification de sécurité (compte verrouillé…) → mise en avant. */
export function isSecurityNotif(n: AppNotification): boolean {
  const t = `${n.type ?? ''} ${n.category ?? ''}`.toLowerCase();
  const title = `${n.title ?? ''}`.toLowerCase();
  return t.includes('system') || t.includes('security') || title.includes('sécurit');
}

/**
 * Notifications in-app de l'utilisateur connecté (cloche du shell). Distinct du
 * NotificationService (toasts éphémères) : ici ce sont les notifications
 * persistées du backend (alertes sécurité, etc.).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/notifications`;

  readonly items = signal<AppNotification[]>([]);
  readonly unread = computed(() => this.items().filter((n) => !isNotifRead(n)).length);

  load(): void {
    this.http
      .get<unknown>(`${this.base}/me`)
      .pipe(map((r) => unwrapList<AppNotification>(r).items))
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => undefined,
      });
  }

  markRead(id: string | undefined): void {
    if (!id) {
      return;
    }
    this.patchLocal(id);
    this.http.post(`${this.base}/${id}/read`, {}).subscribe({ error: () => undefined });
  }

  markAllRead(): void {
    if (this.unread() === 0) {
      return;
    }
    this.items.update((list) => list.map((n) => ({ ...n, isRead: true, read: true })));
    this.http.post(`${this.base}/read-all`, {}).subscribe({ error: () => undefined });
  }

  private patchLocal(id: string): void {
    this.items.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n)),
    );
  }
}
