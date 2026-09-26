import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'panga.theme';

/**
 * Gestion du mode clair/sombre. Bascule la classe `.dark` sur <html>
 * (Material via color-scheme + tokens Panga).
 *
 * **Thème de base = clair** (palette Panga). Le sombre est une option
 * explicite ; on ne suit plus `prefers-color-scheme` au premier lancement.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly _mode = signal<ThemeMode>(this.resolveInitial());

  readonly mode = this._mode.asReadonly();

  constructor() {
    effect(() => {
      const mode = this._mode();
      const root = this.doc.documentElement;
      root.classList.toggle('dark', mode === 'dark');
      // Couleur de barre navigateur / PWA.
      const meta = this.doc.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', mode === 'dark' ? '#141318' : '#f6f7f4');
      }
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
    });
  }

  toggle(): void {
    this._mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
  }

  /** Libellé court pour tooltips / menus. */
  label(mode: ThemeMode = this._mode()): string {
    return mode === 'dark' ? 'Sombre' : 'Clair';
  }

  private resolveInitial(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      /* ignore */
    }
    // Thème Panga de base — clair.
    return 'light';
  }
}
