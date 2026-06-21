# Panga — Frontend (Angular PWA)

Frontend de **Panga**, application de gestion scolaire multi-tenant (SaaS, 5 rôles).
PWA consommant l'API REST `/v1` du backend NestJS. UI turquoise épurée, mode clair/sombre,
i18n FR/EN, signals partout.


> **Phase actuelle : P0 — Fondations** (scaffolding, design system, interceptors, auth animée,
> shells de layout, PWA installable). Les modules métier (P1+) sont branchés sur des écrans
> placeholder « Module en construction ».

## Stack

| Domaine        | Choix                                                  |
| -------------- | ------------------------------------------------------ |
| Framework      | **Angular 21** (standalone, signals, zone-based)       |
| UI             | **Angular Material 3** (M3 theming) + CDK              |
| Utilitaires    | **Tailwind CSS v4** (couches theme+utilities, no reset)|
| État           | **@ngrx/signals** (signalStore)                        |
| i18n           | **@jsverse/transloco** (FR/EN à chaud)                 |
| Graphiques     | **ngx-echarts** + ECharts (P5)                         |
| Animations     | CSS + API `animate.enter/leave` Angular 21             |
| PWA            | `@angular/service-worker` (Workbox)                    |
| Client API     | **Orval** (généré depuis OpenAPI `/v1/docs-json`)      |
| Tests          | **Vitest** (`@angular/build:unit-test`)                |
| Qualité        | ESLint + Prettier + Husky + commitlint + lint-staged   |

> Node requis : **≥ 22.12** (ou 20.19+/24+). Angular 22 exigerait Node 22.22.3+.

## Démarrage

```bash
npm install
npm start            # ng serve → http://localhost:4200
```

Le backend est attendu sur `http://localhost:3000/v1` en dev
(voir `src/environments/environment.development.ts`).

## Scripts

| Script                 | Rôle                                                     |
| ---------------------- | -------------------------------------------------------- |
| `npm start`            | Serveur de dev                                           |
| `npm run build`        | Build production (AOT, budgets, service worker)          |
| `npm test`             | Tests unitaires (Vitest)                                 |
| `npm run lint`         | ESLint (TS + templates a11y)                             |
| `npm run format`       | Prettier --write sur `src`                               |
| `npm run api:generate` | Génère le client typé depuis l'OpenAPI (voir ci-dessous) |

## Génération du client API (Orval)

Le front reste synchronisé avec le contrat backend (278 chemins) en générant
services + types depuis la spec OpenAPI :

```bash
# 1) Exporter la spec du backend NestJS vers ./openapi.json
#    (GET /v1/docs-json, ou `npm run openapi:export` côté backend)
# 2) Générer le client
npm run api:generate     # → src/app/core/api/generated (NE PAS éditer à la main)
```

Config : `orval.config.ts`. À régénérer à chaque évolution de l'API (à câbler en CI).

## Architecture

```
src/app/
├── core/                 # singletons (fournis une seule fois)
│   ├── auth/             # TokenService, AuthStore (signalStore), AuthService
│   ├── http/             # interceptors + LoadingService
│   ├── tenant/           # contexte école active (multi-tenant)
│   ├── guards/           # authGuard, roleGuard, schoolContextGuard
│   ├── i18n/             # loader Transloco
│   ├── models/           # enveloppes API, pagination, codes d'erreur, auth
│   └── theme.service.ts  # mode clair/sombre
├── shared/
│   ├── ui/               # KPI card, empty-state, notifications, placeholder
│   └── skeleton/         # skeletons (card, table, bloc shimmer)
├── layout/               # MainShell (sidebar/topbar), school-switcher, nav
├── features/auth/        # login animé, select-school
└── dashboards/           # tableau de bord par rôle
```

### Interceptors HTTP (ordre)

`loading → error → lang → tenant → auth`
(requête haut→bas, réponse bas→haut : l'auth gère le 401/refresh au plus près du backend).

1. **auth** — `Bearer` + refresh single-flight + rejeu sur 401, sinon logout.
2. **tenant** — injecte `x-school-id` / `x-tenant-id` (école active).
3. **error** — mappe `{ success:false, error:{code,message} }` → toasts (validation laissée aux formulaires).
4. **loading** — compteur de requêtes (barre de progression globale).
5. **lang** — propage `x-lang` (messages serveur traduits).

### Sécurité des tokens

- `accessToken` : **en mémoire** (signal `TokenService`), jamais persisté.
- `refreshToken` : préférer un **cookie httpOnly** côté backend ; à défaut `sessionStorage`
  (non durable). **Jamais** de secret en `localStorage`.

## Design system

- Tokens turquoise (clair/sombre) en variables CSS — `src/styles.scss`.
- Échelle de marque + utilitaires Tailwind (`bg-brand-500`, `text-content`, …) — `src/tailwind.css`.
- Mode sombre piloté par la classe `.dark` sur `<html>` (`ThemeService`), respecte `prefers-color-scheme`.
- Animations désactivées sous `prefers-reduced-motion`.

## Conventions

- **Commits conventionnels** (`feat:`, `fix:`, …) — vérifiés par commitlint (hook `commit-msg`).
- **Pre-commit** : `lint-staged` (ESLint --fix + Prettier).
- Préfixe de sélecteur : `panga-` (composants) / `app-` (racine).
- « Terminé » par écran : skeleton + état vide + erreur + i18n + responsive + a11y + tests + API réelle.

## Prochaines étapes (P1)

Annuaires école : `students`, `classes`, `teachers`, `parents` (CRUD, DataTable paginé générique
consommant `{ data, pagination }`, recherche, import Excel, restore soft-delete).
