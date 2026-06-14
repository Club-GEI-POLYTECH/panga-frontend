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
      <aside class="brand-panel" aria-hidden="true">
        <span class="blob blob-1"></span>
        <span class="blob blob-2"></span>
        <span class="blob blob-3"></span>
        <div class="brand-inner">
          <div class="mark">
            <span class="badge">P</span>
            <span class="name">Panga</span>
          </div>
          <div class="hero">
            <h2>Toute votre école,<br />réunie en un seul endroit.</h2>
            <p>
              Élèves, notes, présences, paiements et communications — dans une plateforme claire,
              rapide et multi-écoles.
            </p>
            <ul class="feats">
              <li>
                <span class="material-symbols-outlined">school</span> Élèves &amp; classes
                centralisés
              </li>
              <li>
                <span class="material-symbols-outlined">grade</span> Notes &amp; bulletins
                automatisés
              </li>
              <li>
                <span class="material-symbols-outlined">payments</span> Paiements &amp; facturation
                SaaS
              </li>
            </ul>
          </div>
          <p class="foot">© Panga · Gestion scolaire</p>
        </div>
      </aside>

      <main class="form-panel">
        <div class="card panga-card">
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
