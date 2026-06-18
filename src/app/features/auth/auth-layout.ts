import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Coquille visuelle des écrans d'authentification : panneau marque (dégradé
 * turquoise animé, texture, lignes « glass ») + carte formulaire projetée.
 */
@Component({
  selector: 'panga-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <aside class="brand-panel" aria-hidden="true">
        <span class="grid-overlay"></span>
        <span class="blob blob-1"></span>
        <span class="blob blob-2"></span>

        <div class="brand-inner">
          <div class="mark">
            <span class="badge">P</span>
            <span class="name">Panga</span>
          </div>

          <div class="hero">
            <span class="eyebrow">Plateforme de gestion scolaire</span>
            <h2>Toute votre école,<br />réunie en un seul endroit.</h2>
            <p>
              Élèves, notes, présences, paiements et communications — dans une plateforme claire,
              rapide et multi-écoles.
            </p>
            <ul class="feats">
              <li>
                <span class="material-symbols-outlined">school</span>
                <span>Élèves &amp; classes centralisés</span>
              </li>
              <li>
                <span class="material-symbols-outlined">grade</span>
                <span>Notes &amp; bulletins automatisés</span>
              </li>
              <li>
                <span class="material-symbols-outlined">payments</span>
                <span>Paiements &amp; facturation SaaS</span>
              </li>
            </ul>
          </div>

          <div class="foot">
            <span class="trust">
              <span class="material-symbols-outlined">verified_user</span> Sécurisé · Temps réel ·
              Multi-écoles
            </span>
            <p class="copy">© Panga · Gestion scolaire</p>
          </div>
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
