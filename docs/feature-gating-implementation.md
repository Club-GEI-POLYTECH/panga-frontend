# Note d'implémentation — Blocage par fonctionnalité SaaS (front)

> **Statut : à faire (différé).** À implémenter une fois l'enforcement activé côté
> backend (`SAAS_ENFORCE_FEATURES=true`). Tant qu'il est OFF, aucun blocage serveur —
> mais le front doit être codé **comme si ON**, piloté par `featuresEffective`.

Objectif : ne plus laisser un utilisateur tomber sur un **403** en ouvrant un module
non inclus dans le plan de son école. On **masque/désactive** les menus hors plan,
on affiche une **bannière** d'état de facturation, et on **gère le 403** au cas où.

---

## 1. Contrat backend

### Source d'autorisations (au chargement, rôle admin)

```
GET /v1/billing/school/subscription
→ {
    subscriptionPlan: "basic",
    featuresEffective: ["core","grades","bulletins","payments_school", ...],
    premiumUnlocked: false,
    restrictReasons: ["trial_expired"] | ["saas_billing_status:past_due"] | [],
    trialEndsAt: "2026-07-01T...",
    graceDays: 7
  }
```

- **Afficher un module seulement si sa clé ∈ `featuresEffective`.**
- `restrictReasons` possibles : `trial_expired`,
  `subscription_period_ended_after_grace`, `saas_billing_status:past_due`.

### Erreur si un appel passe quand même

`403` avec corps :
```jsonc
{ "success": false, "statusCode": 403,
  "error": {
    "code": "SAAS_FEATURE_NOT_ENTITLED",
    "message": "Fonctionnalité « exams » indisponible pour le plan actuel…",
    "featureKey": "exams", "subscriptionPlan": "basic", "saasBillingStatus": "good_standing"
  } }
```

### Mapping module front ↔ clé feature

| Module (path) | Clé feature |
|---|---|
| grades | `grades` |
| bulletins | `bulletins` |
| exams | `exams` |
| payments | `payments_school` |
| library / mes-services (biblio) | `library` |
| transport | `transport` |
| cafeteria / cantine | `cafeteria` |
| communications | `communications` |
| curriculum (avancé) | `curriculum_advanced` |
| dashboard, profil, école, classes, élèves… | `core` (toujours inclus) |

Modules concernés par l'enforcement : **payments, grades, bulletins, exams, library,
transport, cafeteria, communications**. Le reste = `core`.

> **super_admin n'est JAMAIS bloqué** (contexte cross-tenant, pas d'école).

---

## 2. Plan d'implémentation front

### a) Modèle + service

- Ajouter au `BillingService` (ou un `EntitlementsService` dédié dans `core/`) :
  ```ts
  subscription(): Observable<SchoolSubscription>  // GET /billing/school/subscription
  ```
  (Il existe déjà `schoolSubscription(schoolId)` ; vérifier si la variante sans
  schoolId — école du token — est nécessaire.)
- Type :
  ```ts
  interface SchoolSubscription {
    subscriptionPlan: string;
    featuresEffective: string[];
    premiumUnlocked?: boolean;
    restrictReasons?: string[];
    trialEndsAt?: string | null;
    graceDays?: number;
  }
  ```

### b) Store d'entitlements (`core/entitlements/entitlements.store.ts`)

```ts
@Injectable({ providedIn: 'root' })
export class EntitlementsStore {
  private readonly sub = signal<SchoolSubscription | null>(null);
  readonly restrictReasons = computed(() => this.sub()?.restrictReasons ?? []);

  /** Charge l'abonnement (hors super_admin). À appeler dans le shell après loadMe. */
  load(): void { /* GET subscription → sub.set(...) ; erreur → laisser null (fail-open) */ }

  /** Un module est-il autorisé ? FAIL-OPEN : true si abonnement inconnu/vide. */
  allows(featureKey: string): boolean {
    if (featureKey === 'core') return true;
    const s = this.sub();
    if (!s || !Array.isArray(s.featuresEffective) || s.featuresEffective.length === 0) {
      return true; // ⚠️ ne JAMAIS tout masquer si on ne sait pas
    }
    return s.featuresEffective.includes(featureKey);
  }
}
```

> **Fail-open obligatoire** : si la requête échoue ou `featuresEffective` est vide,
> on **affiche tout** (sinon on risque de cacher toute la nav).

### c) Mapping path → featureKey

Ajouter à chaque `NavItem` de [nav.config.ts](../src/app/layout/nav.config.ts) un champ
optionnel `feature?: string`, OU une table `PATH_FEATURE: Record<string,string>`.
super_admin ignore le mapping.

### d) Filtrage de la nav (shell)

Dans [main-shell.ts](../src/app/layout/main-shell.ts), envelopper `navSections` :
```ts
protected readonly navSections = computed(() => {
  const sections = navSectionsForRole(this.store.role());
  if (this.isSuperAdmin()) return sections;          // jamais bloqué
  return sections
    .map((sec) => ({ ...sec, items: sec.items.filter((i) => this.entitlements.allows(featureOf(i))) }))
    .filter((sec) => sec.items.length);
});
```
Appeler `entitlements.load()` dans le constructeur du shell (après/avec `loadMe`),
**uniquement** si `role !== 'super_admin'`.

### e) Guard de route (défense en profondeur)

`featureGuard(featureKey)` (CanActivate) : si `!entitlements.allows(key)` → rediriger
vers une page « Fonctionnalité non incluse » (ou la page tarifs) au lieu de charger
le module. À poser sur les routes des modules gated dans
[app.routes.ts](../src/app/app.routes.ts).

### f) Gestion du 403 `SAAS_FEATURE_NOT_ENTITLED`

Dans [error.interceptor.ts](../src/app/core/http/error.interceptor.ts) : intercepter
`error.code === 'SAAS_FEATURE_NOT_ENTITLED'` → afficher un message dédié
(« Fonctionnalité non incluse dans votre plan ») + idéalement rediriger/ouvrir un
lien vers **/platform/pricing** (ou une page tarifs admin). Ne PAS afficher le toast
générique.

### g) Bannière d'état (selon `restrictReasons`)

Composant `<panga-billing-banner>` affiché en haut du shell quand
`restrictReasons.length` :
- `trial_expired` → « Votre période d'essai a expiré » (CTA : voir les plans).
- `subscription_period_ended_after_grace` / `saas_billing_status:past_due` →
  « Abonnement à renouveler » (CTA : facturation).

---

## 3. Points de vigilance

- **Fail-open** partout (jamais cacher toute la nav sur une erreur d'abonnement).
- **super_admin** : court-circuiter tout le gating.
- Recharger l'abonnement après un **changement d'école** (parent multi-écoles) si
  pertinent.
- Le gating UI n'est PAS une sécurité — le backend reste l'autorité (403).
- Lié à la règle d'accès par rôle (cf. mémoire `role-creation-matrix`).

---

## 4. Endpoints connexes déjà branchés (contexte)

- Page tarifs / simulateur / grille éditable : `/platform/pricing`
  ([pricing.ts](../src/app/features/super-admin/pricing/pricing.ts)).
- `GET /billing/plans`, `/billing/estimate`, `/billing/pricing`,
  `PUT /billing/pricing/:plan`, `POST /billing/run-dunning`, `/billing/metrics`
  (double MRR) → déjà dans `BillingService`.
