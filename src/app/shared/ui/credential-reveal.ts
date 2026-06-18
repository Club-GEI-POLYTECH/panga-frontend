import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from './notification.service';

/**
 * Carte d'identifiants à usage unique : affiche le mot de passe temporaire
 * (et l'identifiant de connexion) renvoyé une seule fois par le backend, avec
 * boutons de copie. Le mot de passe n'est jamais re-consultable ensuite.
 */
@Component({
  selector: 'panga-credential-reveal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div
      class="rounded-2xl border p-4 mb-6"
      style="border-color: var(--brand-400); background: color-mix(in srgb, var(--brand-400) 10%, transparent)"
    >
      <div class="flex items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style="background: var(--brand-gradient)"
        >
          <span class="material-symbols-outlined text-[18px]">key</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-(--text)">{{ title() }}</p>
          <p class="text-xs text-(--text-muted) mt-0.5">
            À transmettre maintenant : ce mot de passe n'est affiché qu'une seule fois.
          </p>

          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            @if (identifier()) {
              <div class="rounded-xl border border-(--border) bg-(--surface) px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-(--text-muted)">Identifiant</p>
                <div class="flex items-center gap-2">
                  <code class="text-sm text-(--text) truncate flex-1">{{ identifier() }}</code>
                  <button
                    mat-icon-button
                    class="h-7! w-7!"
                    (click)="copy(identifier(), 'Identifiant')"
                    aria-label="Copier l'identifiant"
                  >
                    <mat-icon fontSet="material-symbols-outlined" class="text-[16px]!"
                      >content_copy</mat-icon
                    >
                  </button>
                </div>
              </div>
            }
            <div class="rounded-xl border border-(--border) bg-(--surface) px-3 py-2">
              <p class="text-[11px] uppercase tracking-wide text-(--text-muted)">
                Mot de passe temporaire
              </p>
              <div class="flex items-center gap-2">
                <code class="text-sm font-semibold text-(--text) truncate flex-1">
                  {{ revealed() ? password() : '••••••••' }}
                </code>
                <button
                  mat-icon-button
                  class="h-7! w-7!"
                  (click)="revealed.set(!revealed())"
                  [attr.aria-label]="revealed() ? 'Masquer' : 'Afficher'"
                >
                  <mat-icon fontSet="material-symbols-outlined" class="text-[16px]!">
                    {{ revealed() ? 'visibility_off' : 'visibility' }}
                  </mat-icon>
                </button>
                <button
                  mat-icon-button
                  class="h-7! w-7!"
                  (click)="copy(password(), 'Mot de passe')"
                  aria-label="Copier le mot de passe"
                >
                  <mat-icon fontSet="material-symbols-outlined" class="text-[16px]!"
                    >content_copy</mat-icon
                  >
                </button>
              </div>
            </div>
          </div>
        </div>
        <button
          mat-icon-button
          class="h-8! w-8! shrink-0"
          (click)="dismiss.emit()"
          aria-label="Fermer"
        >
          <mat-icon fontSet="material-symbols-outlined" class="text-[18px]!">close</mat-icon>
        </button>
      </div>
    </div>
  `,
})
export class CredentialReveal {
  private readonly notify = inject(NotificationService);

  readonly title = input('Identifiants de connexion');
  readonly identifier = input<string>('');
  readonly password = input.required<string>();
  readonly dismiss = output<void>();

  protected readonly revealed = signal(true);

  protected copy(value: string, label: string): void {
    if (!value) {
      return;
    }
    navigator.clipboard?.writeText(value).then(
      () => this.notify.success(`${label} copié.`),
      () => this.notify.error('Copie impossible.'),
    );
  }
}
