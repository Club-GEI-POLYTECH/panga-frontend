import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Coquille visuelle des écrans d'authentification : fond dégradé turquoise
 * animé + carte centrée. Le contenu (formulaire) est projeté.
 */
@Component({
  selector: 'panga-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <div class="bg" aria-hidden="true">
        <span class="blob blob-1"></span>
        <span class="blob blob-2"></span>
        <span class="blob blob-3"></span>
      </div>
      <div class="card panga-card">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
