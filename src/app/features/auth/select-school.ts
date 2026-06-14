import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import type { School } from '../../core/models/auth.models';

/** Sélection de l'école active après login (parents multi-écoles). */
@Component({
  selector: 'panga-select-school',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="min-h-screen grid place-items-center p-6" style="background: var(--background)">
      <div class="panga-card w-full max-w-lg p-8">
        <h1 class="text-xl font-semibold text-[var(--text)]">Choisir une école</h1>
        <p class="text-sm text-[var(--text-muted)] mt-1 mb-6">
          Vous avez accès à plusieurs établissements. Sélectionnez celui à consulter.
        </p>
        <div class="space-y-3">
          @for (school of store.schools(); track school.id) {
            <button
              type="button"
              (click)="choose(school)"
              class="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition hover:shadow-md"
              style="border-color: var(--border); background: var(--surface)"
            >
              <span
                class="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                style="background: var(--brand-gradient)"
              >
                <mat-icon fontSet="material-symbols-outlined">apartment</mat-icon>
              </span>
              <span class="font-medium text-[var(--text)]">{{ school.name }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class SelectSchool {
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  choose(school: School): void {
    this.auth.selectSchool(school);
    void this.router.navigate(['/dashboard']);
  }
}
