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
            <h2>Toute votre école,<br />réunie en un seul endroit.</h2>
            <div class="illus">
              <svg viewBox="0 0 480 360" role="img" aria-label="Illustration : gestion scolaire">
                <defs>
                  <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#F4F1FF" />
                    <stop offset="1" stop-color="#E7E0FF" />
                  </linearGradient>
                </defs>

                <!-- Sol / ombre -->
                <ellipse cx="240" cy="322" rx="180" ry="20" fill="#000" opacity="0.12" />

                <!-- Étincelles & pastilles flottantes -->
                <circle cx="70" cy="70" r="7" fill="#FFC24B" />
                <circle cx="430" cy="60" r="9" fill="#FF7AA8" />
                <circle cx="405" cy="250" r="6" fill="#4CC3FF" />
                <path
                  d="M110 40 l0 16 M102 48 l16 0"
                  stroke="#4CC3FF"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M360 300 l0 14 M353 307 l14 0"
                  stroke="#FFC24B"
                  stroke-width="3"
                  stroke-linecap="round"
                />

                <!-- Ampoule (idée) -->
                <g transform="translate(96 120)">
                  <circle cx="0" cy="0" r="18" fill="#FFC24B" />
                  <rect x="-6" y="15" width="12" height="8" rx="2" fill="#2B2E4A" />
                  <path
                    d="M-5 -3 a5 6 0 0 1 10 0"
                    fill="none"
                    stroke="#fff"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  />
                </g>

                <!-- Crayon -->
                <g transform="rotate(38 415 150)">
                  <rect x="405" y="110" width="16" height="78" rx="4" fill="#7C6CFB" />
                  <rect x="405" y="110" width="16" height="14" fill="#FF7AA8" />
                  <path d="M405 188 l8 16 l8 -16 z" fill="#FFC24B" />
                  <path d="M409 200 l4 8 l4 -8 z" fill="#2B2E4A" />
                </g>

                <!-- Pile de livres -->
                <g transform="translate(70 232)">
                  <rect x="0" y="46" width="150" height="24" rx="6" fill="#7C6CFB" />
                  <rect x="14" y="46" width="6" height="24" fill="#fff" opacity="0.5" />
                  <rect x="8" y="24" width="150" height="24" rx="6" fill="#FF7AA8" />
                  <rect x="22" y="24" width="6" height="24" fill="#fff" opacity="0.5" />
                  <rect x="2" y="2" width="150" height="24" rx="6" fill="#4CC3FF" />
                  <rect x="16" y="2" width="6" height="24" fill="#fff" opacity="0.5" />
                </g>

                <!-- Écran / tableau de bord -->
                <g transform="translate(190 120)">
                  <rect x="0" y="0" width="230" height="150" rx="14" fill="#fff" />
                  <rect x="12" y="12" width="206" height="112" rx="8" fill="url(#scr)" />
                  <!-- barres -->
                  <rect x="30" y="70" width="20" height="42" rx="4" fill="#7C6CFB" />
                  <rect x="60" y="52" width="20" height="60" rx="4" fill="#4CC3FF" />
                  <rect x="90" y="82" width="20" height="30" rx="4" fill="#FF7AA8" />
                  <rect x="120" y="60" width="20" height="52" rx="4" fill="#FFC24B" />
                  <!-- lignes de texte -->
                  <rect x="150" y="34" width="52" height="8" rx="4" fill="#7C6CFB" opacity="0.8" />
                  <rect x="150" y="50" width="40" height="7" rx="3.5" fill="#C7BEEF" />
                  <rect x="150" y="64" width="46" height="7" rx="3.5" fill="#C7BEEF" />
                  <!-- pied + support -->
                  <rect x="100" y="150" width="30" height="24" fill="#EDE9FB" />
                  <rect x="72" y="172" width="86" height="12" rx="6" fill="#fff" />
                </g>

                <!-- Toque de diplômé -->
                <g transform="translate(300 66)">
                  <path d="M0 18 l40 -16 l40 16 l-40 16 z" fill="#2B2E4A" />
                  <path d="M14 24 l0 20 a26 12 0 0 0 52 0 l0 -20 l-26 10 z" fill="#3A3E63" />
                  <path d="M80 18 l0 22" stroke="#FFC24B" stroke-width="2.5" />
                  <circle cx="80" cy="42" r="4" fill="#FFC24B" />
                </g>

                <!-- Plante -->
                <g transform="translate(392 250)">
                  <path d="M14 4 C2 -8 -6 6 6 16 C10 10 12 8 14 4 Z" fill="#3FB98A" />
                  <path d="M14 4 C26 -8 34 6 22 16 C18 10 16 8 14 4 Z" fill="#57D6A3" />
                  <rect x="4" y="16" width="20" height="18" rx="3" fill="#FF9F5A" />
                </g>
              </svg>
            </div>
          </div>

          <div class="foot">
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
