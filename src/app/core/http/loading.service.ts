import { computed, Injectable, signal } from '@angular/core';

/**
 * Suivi global des requêtes HTTP en vol (compteur). Pilote les barres de
 * progression globales ; les skeletons par écran restent gérés localement.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly inFlight = signal(0);

  readonly isLoading = computed(() => this.inFlight() > 0);

  start(): void {
    this.inFlight.update((n) => n + 1);
  }

  stop(): void {
    this.inFlight.update((n) => Math.max(0, n - 1));
  }
}
