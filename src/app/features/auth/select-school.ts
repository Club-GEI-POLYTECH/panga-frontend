import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import type { School } from '../../core/models/auth.models';
import { AuthLayout } from './auth-layout';

/** Sélection de l'école active après login (parents multi-écoles). */
@Component({
  selector: 'panga-select-school',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, AuthLayout],
  template: `
    <panga-auth-layout>
      <div class="panga-brand">
        <div class="badge">P</div>
        <h1 class="text-lg font-semibold" style="font-family: Urbanist, sans-serif">Panga</h1>
      </div>

      <h2 class="text-2xl font-semibold text-(--text)">Choisir une école</h2>
      <p class="text-sm text-(--text-muted) mt-1 mb-6">
        Vous avez accès à plusieurs établissements. Sélectionnez celui à consulter.
      </p>

      <div class="flex flex-col gap-3">
        @for (school of store.schools(); track school.id) {
          <button type="button" (click)="choose(school)" class="school-row">
            <span class="ico">
              <mat-icon fontSet="material-symbols-outlined">apartment</mat-icon>
            </span>
            <span class="min-w-0 flex-1 text-left">
              <span class="block truncate font-medium text-(--text)">{{ school.name }}</span>
              <span class="block truncate text-xs text-(--text-muted)">Accéder à l'espace</span>
            </span>
            <mat-icon fontSet="material-symbols-outlined" class="chev">chevron_right</mat-icon>
          </button>
        } @empty {
          <p class="text-sm text-(--text-muted)">Aucun établissement disponible.</p>
        }
      </div>
    </panga-auth-layout>
  `,
  styles: [
    `
      .school-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        cursor: pointer;
        transition:
          border-color 0.18s ease,
          box-shadow 0.18s ease,
          transform 0.18s ease;
      }
      .school-row:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--brand-500) 45%, var(--border));
        box-shadow: 0 14px 30px -18px rgb(15 23 42 / 25%);
      }
      .ico {
        display: grid;
        place-items: center;
        flex: none;
        width: 44px;
        height: 44px;
        border-radius: 0.8rem;
        color: #fff;
        background: var(--brand-gradient);
      }
      .chev {
        flex: none;
        color: var(--text-muted);
        transition:
          transform 0.18s ease,
          color 0.18s ease;
      }
      .school-row:hover .chev {
        transform: translateX(3px);
        color: var(--brand-700);
      }
      @media (prefers-reduced-motion: reduce) {
        .school-row,
        .chev {
          transition: none;
        }
      }
    `,
  ],
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
