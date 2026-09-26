import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Coquille visuelle des écrans d'authentification : panneau marque immersif
 * (dégradé vert→bleu, mesh, illustration animée) + carte formulaire.
 */
@Component({
  selector: 'panga-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <aside class="brand-panel" aria-hidden="true">
        <span class="mesh"></span>
        <span class="grid-overlay"></span>
        <span class="blob blob-1"></span>
        <span class="blob blob-2"></span>

        <div class="brand-inner">
          <div class="mark">
            <span class="badge">P</span>
            <div class="mark-text">
              <span class="name">Panga</span>
              <span class="tagline">Gestion scolaire</span>
            </div>
          </div>

          <div class="hero">
            <h2>
              Toute votre école,<br />
              <span class="accent">réunie en un seul endroit.</span>
            </h2>
            <p>Notes, classes et familles — un espace pour chaque rôle.</p>

            <div class="illus">
              <svg
                viewBox="0 0 480 320"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Illustration : gestion scolaire"
              >
                <defs>
                  <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#F3FBE9" />
                    <stop offset="1" stop-color="#E8F6FC" />
                  </linearGradient>
                  <linearGradient id="barG" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stop-color="#559426" />
                    <stop offset="1" stop-color="#A7E46A" />
                  </linearGradient>
                  <linearGradient id="barB" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stop-color="#2B7FA8" />
                    <stop offset="1" stop-color="#A8DFF8" />
                  </linearGradient>
                  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="10" stdDeviation="12" flood-opacity="0.18" />
                  </filter>
                </defs>

                <ellipse cx="240" cy="296" rx="175" ry="14" fill="#000" opacity="0.16" />

                <!-- Accents flottants -->
                <g class="float-a">
                  <circle cx="52" cy="58" r="8" fill="#A7E46A" />
                  <path
                    d="M92 32 l0 16 M84 40 l16 0"
                    stroke="#A8DFF8"
                    stroke-width="3.5"
                    stroke-linecap="round"
                  />
                </g>
                <g class="float-b">
                  <circle cx="432" cy="44" r="10" fill="#A8DFF8" />
                  <circle cx="408" cy="232" r="6" fill="#8FD34A" />
                </g>
                <g class="float-c">
                  <path
                    d="M362 268 l0 14 M355 275 l14 0"
                    stroke="#A7E46A"
                    stroke-width="3.5"
                    stroke-linecap="round"
                  />
                </g>

                <!-- Bâtiment scolaire -->
                <g class="scene-building" filter="url(#soft)" transform="translate(42 112)">
                  <rect x="0" y="40" width="118" height="102" rx="12" fill="#fff" />
                  <path d="M-2 44 L59 2 L120 44 Z" fill="#222026" />
                  <rect x="10" y="8" width="98" height="36" rx="6" fill="#F6F7F4" opacity="0.9" />
                  <rect x="18" y="56" width="24" height="24" rx="5" fill="#A8DFF8" />
                  <rect x="48" y="56" width="24" height="24" rx="5" fill="#A7E46A" />
                  <rect x="78" y="56" width="24" height="24" rx="5" fill="#A8DFF8" />
                  <rect x="18" y="90" width="24" height="24" rx="5" fill="#A7E46A" />
                  <rect x="48" y="90" width="24" height="24" rx="5" fill="#A8DFF8" />
                  <rect x="78" y="90" width="24" height="40" rx="5" fill="#34322C" />
                  <rect x="56" y="-22" width="3.5" height="30" fill="#222026" />
                  <path d="M59.5 -20 h30 l-7 9 l7 9 h-30 z" fill="#A7E46A" />
                </g>

                <!-- Dashboard -->
                <g class="scene-dash" filter="url(#soft)" transform="translate(172 68)">
                  <rect x="0" y="0" width="228" height="158" rx="16" fill="#fff" />
                  <rect x="12" y="12" width="204" height="116" rx="10" fill="url(#scr)" />
                  <rect x="24" y="24" width="52" height="30" rx="9" fill="#fff" />
                  <rect x="32" y="31" width="22" height="7" rx="3.5" fill="#8FD34A" />
                  <rect x="32" y="42" width="34" height="5" rx="2.5" fill="#D2EFA6" />
                  <rect x="86" y="24" width="52" height="30" rx="9" fill="#fff" />
                  <rect x="94" y="31" width="22" height="7" rx="3.5" fill="#2B7FA8" />
                  <rect x="94" y="42" width="30" height="5" rx="2.5" fill="#A8DFF8" />
                  <rect x="148" y="24" width="52" height="30" rx="9" fill="#fff" />
                  <rect x="156" y="31" width="22" height="7" rx="3.5" fill="#559426" />
                  <rect x="156" y="42" width="26" height="5" rx="2.5" fill="#BDE97F" />
                  <rect class="bar" x="28" y="76" width="20" height="40" rx="5" fill="url(#barG)" />
                  <rect
                    class="bar bar-2"
                    x="58"
                    y="60"
                    width="20"
                    height="56"
                    rx="5"
                    fill="url(#barB)"
                  />
                  <rect
                    class="bar bar-3"
                    x="88"
                    y="70"
                    width="20"
                    height="46"
                    rx="5"
                    fill="url(#barG)"
                  />
                  <rect
                    class="bar bar-4"
                    x="118"
                    y="52"
                    width="20"
                    height="64"
                    rx="5"
                    fill="url(#barB)"
                  />
                  <rect x="156" y="68" width="46" height="8" rx="4" fill="#559426" opacity="0.9" />
                  <rect x="156" y="84" width="38" height="6" rx="3" fill="#C5D9C0" />
                  <rect x="156" y="98" width="42" height="6" rx="3" fill="#C5D9C0" />
                  <rect x="100" y="158" width="28" height="22" fill="#E8F0E4" />
                  <rect x="74" y="178" width="80" height="11" rx="5.5" fill="#fff" />
                </g>

                <!-- Toque -->
                <g class="float-b">
                  <g transform="translate(300 28)">
                    <path d="M0 18 l40 -16 l40 16 l-40 16 z" fill="#222026" />
                    <path d="M14 24 l0 18 a26 11 0 0 0 52 0 l0 -18 l-26 10 z" fill="#34322C" />
                    <path d="M80 18 l0 20" stroke="#A7E46A" stroke-width="2.8" />
                    <circle cx="80" cy="40" r="4" fill="#A7E46A" />
                  </g>
                </g>

                <!-- Cahiers -->
                <g class="float-c">
                  <g transform="translate(390 188)">
                    <rect x="0" y="38" width="72" height="20" rx="5" fill="#2B7FA8" />
                    <rect x="7" y="38" width="4" height="20" fill="#fff" opacity="0.45" />
                    <rect x="4" y="18" width="72" height="20" rx="5" fill="#559426" />
                    <rect x="11" y="18" width="4" height="20" fill="#fff" opacity="0.45" />
                    <rect x="2" y="0" width="72" height="20" rx="5" fill="#A8DFF8" />
                    <rect x="9" y="0" width="4" height="20" fill="#fff" opacity="0.5" />
                  </g>
                </g>

                <!-- Crayon -->
                <g class="float-a">
                  <g transform="rotate(-26 424 118)">
                    <rect x="408" y="82" width="15" height="70" rx="4" fill="#559426" />
                    <rect x="408" y="82" width="15" height="14" fill="#A7E46A" />
                    <path d="M408 152 l7.5 15 l7.5 -15 z" fill="#E8A13A" />
                    <path d="M412.5 163 l3 7 l3 -7 z" fill="#222026" />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          <div class="foot">
            <p class="roles">Admin · Enseignant · Parent · Élève</p>
            <p class="copy">© Panga · Gestion scolaire simplifiée</p>
          </div>
        </div>
      </aside>

      <main class="form-panel">
        <div class="orb orb-a"></div>
        <div class="orb orb-b"></div>
        <div class="card panga-card">
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
