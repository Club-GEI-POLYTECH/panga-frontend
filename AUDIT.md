# Audit Panga Frontend — Réalisé vs Reste à faire

> Audit réalisé le 2026-07-16, sur la branche `feat/uniform-form-inputs`.
> Méthode : lecture du routing (`app.routes.ts`), de la config de navigation
> (`nav.config.ts`) et de tous les modules métier (features admin, élève,
> super-admin, auth, RBAC, notifications).

## Verdict global

L'app est **beaucoup plus avancée que ne le dit le README** (qui affiche encore
« Phase P0 — Fondations », obsolète). En réalité, ~95 % des modules métier sont
**complets et branchés sur de vraies API** (16 services admin + services
élève/plateforme, tous en `HttpClient`, aucun mock ni donnée codée en dur).

5 rôles : `super_admin`, `admin`, `teacher`, `parent`, `student`.

---

## ✅ Réalisé (complet, API réelle)

### Socle transverse

- Auth animée (login, mot de passe oublié/réinitialisation, sélection d'école),
  refresh single-flight, gestion 401/403/verrouillage
- **RBAC** : `permissions.ts` + `permissionGuard` (filtrage nav + routes par
  `resource.action`), fail-open tant que les permissions ne sont pas chargées
- Multi-tenant (contexte école, `x-school-id`), scoping par **année scolaire**
- Interceptors (loading / error / lang / tenant / auth), i18n FR/EN, thème
  clair/sombre, PWA installable
- Profil (infos éditables tous rôles, mot de passe, avatar, historique de
  connexion)
- Cloche de **notifications** (store + load / markRead / markAllRead)

### Espace ADMIN — tous *Complet*

| Module | Contenu |
|---|---|
| Dashboard admin | KPI (élèves, enseignants, classes, revenus), graphique 12 mois, blocs académique/finances, audit récent, actions rapides |
| Élèves | CRUD, recherche, pagination serveur, statut, import CSV + template, lien parent, reset MDP |
| Enseignants | CRUD, recherche, import, template, statut, reset MDP |
| Parents | CRUD, recherche, pagination, import, liaison enfants, reset MDP |
| Classes | CRUD, détail riche (créneaux/emploi du temps, effectifs, promotion année suivante), options & sous-options |
| Notes | Saisie en lot, édition inline, verrouillage périodes, moyennes, export Excel, template |
| Bulletins | Génération par classe/trimestre, filtres, publication, PDF |
| Présences | Appel par créneau, justifications (upload PDF/image), rapport d'absences |
| Examens | CRUD, sessions, salles, surveillants, saisie résultats, publication |
| Journal de cours | Programmes, périodes (seed), cours, cibles, entrées (le plus gros module) |
| Promotions | Calcul décisions (seuil %), synthèse, override, finalisation, transfert |
| Paiements | Structures de frais (CRUD), enregistrement, KPI/stats, filtres |
| Communications | Publication d'annonces (audience, priorité), recherche, mode super-admin « au nom de » l'école |
| Mon établissement | Fiche établissement éditable + gestion des autorités |
| Paramètres | Année en cours / prochaine année (périmètre volontairement restreint) |

### Espace ÉLÈVE — tous *Complet*

| Module | Contenu |
|---|---|
| Dashboard élève | Profil, KPI (moyenne, présence, bulletins, examens à venir), moyennes par matière |
| Ma scolarité | Onglets Notes / Bulletins / Emploi du temps / Présences, PDF bulletin |
| Mes paiements | Historique, échéances, reçus PDF, **Mobile Money** (Orange/Airtel/M-Pesa/Afrimoney) avec initiation + polling |
| Mes notifications | Liste, non-lus, marquer lu / tout marquer |
| Mes services | Annonces, Calendrier, Bibliothèque (emprunts/amendes/réservation), Transport, Cantine (menus/commandes/allergies) |

### Espace SUPER_ADMIN / plateforme — tous *Complet*

| Module | Contenu |
|---|---|
| Overview | KPI business SaaS (MRR, dunning), santé, audit |
| Écoles | Liste, recherche/filtre/pagination, création, édition, suppression |
| Utilisateurs | Liste, stats, filtres rôle/statut, création de compte |
| Facturation | Factures, abonnements, création, encaissement, calcul de montant |
| Tarification | Grille éditable, simulateur, catalogue |
| Curriculum | Programmes, référentiels, import JSON, publication, suppression |

---

## 🚧 Reste à faire / partiel

| # | Élément | État | Détail |
|---|---|---|---|
| 1 | **Module Discipline** | ❌ Non fait | Route en `PlaceholderPage` « Module en construction » |
| 2 | **Module Rapports** (reports) | ❌ Non fait | Idem, placeholder |
| 3 | **Dashboard enseignant** | ⚠️ Squelette | KPI codés en dur à `'—'`, pas de vrai tableau de bord (`dashboard.ts:18` : « à brancher sur l'API reports en P5 ») |
| 4 | **Dashboard parent** | ⚠️ Squelette | Idem — seul un en-tête « Bonjour » + 4 KPI vides |
| 5 | **Gestion des autorités** | ⚠️ Partiel | Liste + création + suppression OK, mais **édition absente** (`SchoolService.updateAuthority` existe mais jamais appelé) |
| 6 | **Feature gating SaaS** | ⏸️ Différé | Masquer les menus hors plan + gérer `403 SAAS_FEATURE_NOT_ENTITLED` (enforcement backend pas encore actif) |

### Nuances mineures (non bloquantes)

- Panneau « notifications » côté admin dans *communications* : lecture seule
  (pas de marquer-lu)
- Suppressions via `confirm()` natif du navigateur (école, autorité) au lieu
  d'un dialog Material
- `schedule/emploi-du-temps` (nouveau, non commité) : lecture seule
  **par conception** (l'édition est dans `class-detail`) — fonctionnel, pas un manque
- Le **README est à mettre à jour** (décrit encore une phase fondations dépassée)

---

## Priorités suggérées pour terminer

1. **Dashboards enseignant & parent** (le plus visible pour ces rôles — actuellement vides)
2. **Module Discipline** puis **Rapports** (les 2 seuls placeholders restants)
3. **Édition des autorités** (câbler `updateAuthority` — quick win)
4. Feature gating SaaS quand le backend l'activera
5. Rafraîchir le README
