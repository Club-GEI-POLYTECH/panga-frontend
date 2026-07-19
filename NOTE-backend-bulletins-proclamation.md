# Note Front → Back — Moyennes par période, proclamation & émulateur de bulletin

> **But de cette note :** décrire la fonctionnalité qu'on veut construire côté front
> (voir les moyennes dès qu'il y a des notes, proclamation par période/trimestre,
> **émulateur de bulletin avant impression**, **impression en bloc**), confronter au
> contrat actuel, et **lister précisément ce dont le front a besoin du back** pour
> l'implémenter proprement. Merci de répondre point par point (§6) : formes de réponse
> JSON + permissions. J'implémente dès ta réponse.

---

## 1. Ce qu'on veut offrir (cible produit)

Dès qu'un enseignant/admin a saisi des notes pour les élèves d'une classe **pour une
période donnée**, on veut pouvoir, **sans étape de génération lourde** :

1. **Voir la moyenne de chaque élève par période** (P1, P2, Examen) et par matière,
   puis la **moyenne de trimestre/semestre** déduite, l'**annuelle** et la **générale**.
2. **Voir la moyenne de la classe** (moyenne générale de classe + par matière).
3. **Émulateur de bulletin** : un aperçu **fidèle du bulletin imprimable**, à l'écran,
   **avant** toute impression/persistance (le « bulletin virtuel »).
4. **Impression en bloc** : générer/imprimer d'un coup **toute la classe** —
   liste de **proclamation** et/ou bulletins — scopée par **période, examen,
   trimestre/semestre, annuel**.

### Logique de déduction attendue (rappel du modèle qu'on nous a transmis)
- `trimestre = (P1 + P2 + 2×Examen) / 4`, avec **dégradation propre** si saisie
  partielle (P1 seul = P1 ; P1+P2 = moyenne ; etc.).
- Dès qu'on a **P1 + P2 + Examen** d'un trimestre → moyenne de trimestre **définitive**,
  sinon **provisoire**.
- Tout en **pourcentage 0–100** (réaffichage /20 = %/5).

---

## 2. Clarification : que fait l'onglet « Moyennes » actuel ?

Aujourd'hui, l'onglet **Moyennes** de l'écran Notes fait seulement ça :
- (optionnel) `POST /grades/classes/:id/compute-averages?schoolYear` — recalcul,
- puis `GET /grades/classes/:id/proclamation?schoolYear` — **classement annuel** + tranches
  (> 75 %, 50–75 %, < 50 %).

**Limites qui bloquent la cible :** c'est **annuel/global uniquement** (aucun scope
période/trimestre), ça ne donne **pas** le détail par matière ni par période, et ça ne
sert pas d'aperçu de bulletin. D'où cette note.

---

## 3. Contrat actuel (ce que j'ai vérifié dans l'OpenAPI)

| Endpoint | Params | Retour utile | Limite pour la cible |
|---|---|---|---|
| `GET /grades/students/:studentId/averages` | `classId`, `schoolYear` | `{ subjectAverages[], overallAverage, overallAveragePercent }` | **Pas de `term`**. Forme non documentée : **inclut-il le détail P1/P2/Examen + par trimestre ?** ❓ |
| `GET /grades/classes/:classId/proclamation` | `schoolYear` **seul** | classement + tranches | **Pas de scope période/trimestre** → annuel only ❌ |
| `POST /grades/classes/:classId/compute-averages` | `schoolYear` | moyennes générales classe (triées) | POST + `grades.create`, pas de `term`, pas de détail matière |
| `POST /grades/calculate/term-average` | DTO (`studentId,classId,slotId,schoolYear,term`) | `{ period1Average, period2Average, examScore, termAverage, termAveragePercent }` ✅ (c'est **exactement** le détail par période) | **POST + `grades.create`** (inaccessible en lecture) et **1 appel par élève × matière** → inutilisable pour une grille de classe |
| `POST /grades/calculate/annual-average` | même DTO | `{ termAverages[], annualAverage, annualAveragePercent }` | idem (POST + create, 1 appel par élève×matière) |
| `POST /bulletins/generate` | DTO (`term` ∈ TERM1..3/SEMESTER1-2/ANNUAL) | Bulletin **persisté** | Persiste → pas un aperçu ; forme `Bulletin` **non documentée** ❓ |
| `GET /bulletins/classes/:classId` | `schoolYear` (le `term` semble ignoré) | bulletins déjà générés | Nécessite génération préalable ; **pas de PDF de classe en bloc** |
| `GET /bulletins/:id/pdf` | — | PDF **d'un** bulletin | Pas de PDF **classe entière** en un appel |

➡️ **Constat :** le détail par période existe (`calculate/term-average`) mais **au mauvais
verbe/permission** (POST + `grades.create`) et **à la mauvaise granularité** (1 appel par
couple élève×matière). Il **manque des lectures de classe** scopables par période, et un
**aperçu** + une **sortie en bloc**.

---

## 4. Ce dont le front a besoin — DEMANDES (le cœur de la note)

> Idéal : des **GET en `*.read`** renvoyant des objets **déjà calculés** (le front ne
> recalcule pas — il affiche). Chaque item ci-dessous = un besoin ; propose la route et
> **surtout la forme JSON exacte**.

### A. 🔴 Grille de moyennes d'une classe, scopée par période/trimestre — **LECTURE**
Une seule requête qui renvoie **toute la classe** pour un scope donné.

```
GET /grades/classes/:classId/averages?schoolYear=...&term=TERM1   (grades.read)
```
Forme souhaitée (à confirmer/ajuster) :
```jsonc
{
  "term": "TERM1",
  "isFinal": true,                 // P1+P2+Examen tous présents → définitif, sinon provisoire
  "classAverage": 62.4,            // moyenne générale de la classe (%)
  "subjects": [                    // moyenne de classe par matière
    { "nationalProgramSlotId": "…", "label": "Mathématiques", "classAverage": 58.1 }
  ],
  "students": [
    {
      "studentId": "…", "studentName": "…",
      "generalAverage": 71.5, "rank": 3, "isFinal": true,
      "subjects": [
        { "nationalProgramSlotId": "…", "label": "Maths",
          "period1": 70, "period2": 65, "exam": 80,   // % (null si absent)
          "termAverage": 73.75, "isFinal": true }
      ]
    }
  ]
}
```
Sans ça, on ne peut afficher une grille de classe qu'en faisant `N élèves × M matières`
appels POST — non viable. **C'est la demande n°1.**

### B. 🔴 Proclamation scopée — ajouter le paramètre de scope
```
GET /grades/classes/:classId/proclamation?schoolYear=...&term=TERM1|SEMESTER1|ANNUAL   (grades.read)
```
- Ajouter **`term`** (et idéalement un mode `scope=period|exam|term|annual` avec, pour
  `period`, un `periodId`/`periodNumber`).
- Retour identique à l'actuel (rows triées + tranches > 75 / 50–75 / < 50) **mais calculé
  sur le scope demandé**, avec `computedAt` (horodatage) pour l'indicateur « recalculé le… ».

### C. 🔴 Aperçu de bulletin (dry-run) — **LECTURE, sans persistance**
Pour l'émulateur « bulletin virtuel » avant impression :
```
GET /bulletins/preview?studentId=…&classId=…&schoolYear=…&term=TERM1   (bulletins.read)
```
- Renvoie **le même objet qu'un bulletin généré**, mais **sans l'enregistrer**.
- **Fournis-moi la forme complète de `Bulletin`** (le schéma OpenAPI est vide). J'ai besoin
  de : identité élève + classe + école, période/trimestre, **lignes par matière**
  (P1/P2/Examen, moyenne matière, coef si un jour, rang matière, appréciation), **totaux**
  (moyenne générale %, /20, rang/effectif), **mentions/décision**, effectif classe,
  min/max/moyenne de classe, appréciation générale, dates. Le tout est nécessaire pour un
  aperçu fidèle à l'impression.

Si un endpoint de preview dédié est trop coûteux : accepte que le front **compose l'aperçu
à partir de A** (grille classe) — dans ce cas confirme que A contient bien tout le détail
matière et donne-moi les libellés d'appréciation/mentions attendus.

### D. 🔴 Sortie en bloc (impression classe entière)
```
GET /bulletins/classes/:classId/pdf?schoolYear=…&term=TERM1        (bulletins.read)  → 1 PDF, tous les élèves
GET /grades/classes/:classId/proclamation/pdf?schoolYear=…&term=…  (grades.read)     → PDF liste de proclamation
```
- Idéalement un **`POST /bulletins/generate-class`** (génère/rafraîchit tous les bulletins
  d'une classe pour un `term`) pour préparer l'impression en bloc en une fois.

### E. 🟠 Clarifications sur `students/:id/averages`
- Sa **forme exacte** ? Contient-il le détail **par période (P1/P2/Examen)** et **par
  trimestre**, ou seulement l'annuel par matière ? (détermine si on peut bâtir l'émulateur
  côté élève avec cet endpoint existant).
- Peut-on ajouter un `term?` pour cibler un trimestre ?

### F. 🟠 Permissions
- Exposer A, B, C, D en **`*.read`** (pas `create`) : enseignants/consulteurs doivent
  **voir** moyennes/proclamation/aperçu sans droit d'écriture. Aujourd'hui tout le calcul
  par période est derrière `grades.create`.

### G. 🟢 Confirmations de règles (pour ne pas recalculer à tort côté front)
- `termAverage = (P1 + P2 + 2×Examen)/4` avec dégradation partielle : **c'est bien le back
  qui le calcule et le renvoie** (front = affichage seul) ? 
- Le flag **provisoire/définitif** (`isFinal`) : renvoyé par le back, ou le front le déduit
  de la présence des 3 composantes ?
- **Aucun coefficient** de matière (confirmé) : je n'affiche donc pas de pondération. Si
  ça change un jour, préviens (impacte A et C).
- Chaque `Period` porte bien `term` + `periodNumber` (1,2) + `periodType` (`exam`) pour que
  je labellise « P1 / P2 / Examen » et regroupe en trimestre.

---

## 5. Ordre de priorité côté front

1. **A** (grille moyennes classe par période/trimestre, lecture) — débloque tout le reste.
2. **B** (proclamation scopée) — proclamation par période/trimestre/annuel.
3. **C** (forme `Bulletin` + preview) — émulateur de bulletin.
4. **D** (PDF en bloc classe/proclamation) — impression groupée.
5. **E/F/G** — clarifications transverses.

Avec **A + B + la forme de `Bulletin` (C)**, je peux livrer : grille de moyennes par
période, moyenne de classe, proclamation scopée et l'émulateur de bulletin. **D** finalise
l'impression en bloc.

---

## 6. Réponds-moi idéalement sous cette forme

Pour chaque point A–G : **route retenue** (ou « utilise l'existant X »), **params**,
**permission**, **exemple de réponse JSON réel**. Si un point n'est pas faisable côté back,
dis-le explicitement — je basculerai sur un calcul/compo côté front en connaissant la limite.
