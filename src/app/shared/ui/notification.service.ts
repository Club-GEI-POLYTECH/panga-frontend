import { computed, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type Tone = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  tone: Tone;
  message: string;
  createdAt: Date;
  read: boolean;
}

const TONE_ICON: Record<Tone, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

/**
 * Toasts applicatifs (wrapper MatSnackBar) + centre de notifications : chaque
 * message est aussi conservé dans un historique consommé par la cloche du header.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);
  private seq = 0;

  /** Historique récent (le plus récent d'abord), borné à 30 entrées. */
  readonly history = signal<AppNotification[]>([]);
  readonly unread = computed(() => this.history().filter((n) => !n.read).length);

  success(message: string): void {
    this.show(message, 'success');
  }
  error(message: string): void {
    this.show(message, 'error', 6000);
  }
  warning(message: string): void {
    this.show(message, 'warning');
  }
  info(message: string): void {
    this.show(message, 'info');
  }

  iconFor(tone: Tone): string {
    return TONE_ICON[tone];
  }

  markAllRead(): void {
    this.history.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  clear(): void {
    this.history.set([]);
  }

  private show(message: string, tone: Tone, duration = 4000): void {
    this.history.update((list) =>
      [{ id: ++this.seq, tone, message, createdAt: new Date(), read: false }, ...list].slice(0, 30),
    );

    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['panga-toast', `panga-toast--${tone}`],
    };
    this.snack.open(message, 'OK', config);
  }
}
