# Note Front → Back — Rendu du bulletin officiel RDC (ministerialSnapshot)

> On veut que l'**émulateur de bulletin** (aperçu) reproduise **fidèlement** le bulletin
> officiel RDC (Ministère EPST, modèle `IGE/P.S/004`) — cf. photo fournie — et que la
> **proclamation** et la **grille de moyennes** en soient l'équivalent cohérent.
> La réponse §C parlait d'un `ministerialSnapshot` (« structure officielle + maxima »)
> mais sa forme n'est pas documentée (schéma `Bulletin` vide dans l'OpenAPI). **J'ai besoin
> de sa forme JSON exacte** pour rendre les lignes/colonnes ci-dessous sans rien deviner.

---

## 1. Structure exacte du bulletin officiel (ce que je dois rendre)

Lignes = **branches** groupées par **DOMAINE → (sous-domaine) → branche**, dans l'ordre
`displayOrder`. Colonnes, **par trimestre** (PREMIER / DEUXIÈME / TROISIÈME) :

| Col | Sens | Source |
|---|---|---|
| `MAX per` | note max d'une période | slot.`maxPerPeriod` |
| `1ère P.` / `2ème P.` (T1) — `3ème/4ème` (T2) — `5ème/6ème` (T3) | **points bruts** de chaque période | à fournir |
| `MAX EX.` | max examen | slot.`maxExam` |
| `PTS OBT.` (examen) | points examen | à fournir |
| `MAX. TRIM.` | max trimestre = 2·maxPer + maxExam | slot.`maxTrimester` |
| `PTS OBT.` (trim) | **P1 + P2 + Examen** (points) | à fournir |
| `TOTAL` → `MAX.` / `PTS OBT.` | annuel | slot.`maxYear` / à fournir |

Puis, en **pied de tableau** (lignes transverses) :
- `Sous-total` par domaine (somme des points et des maxima du domaine).
- `Maxima généraux` (somme de tous les `MAX. TRIM.` et du total).
- `POURCENTAGE` = `PTS OBT ÷ MAXIMA × 100` **par trimestre** et **au total**.
- `PLACE` (rang de l'élève), `NBRE D'ÉLÈVES` (effectif).
- `APPLICATION`, `CONDUITE` (appréciations).
- Décision : « passe dans la classe supérieure » / « double la classe ».
- En-tête : identité (N° ID, élève, sexe, né(e) à/le, classe, N° perm.), école, province,
  ville, commune, code, année scolaire.

---

## 2. Demande — forme JSON de `ministerialSnapshot`

Renvoie (dans le bulletin **et** l'aperçu `GET /bulletins/preview`) un `ministerialSnapshot`
**déjà assemblé et calculé** de cette forme (adapte les noms, mais garde la granularité) :

```jsonc
{
  "header": {
    "studentIdNumber": "…", "studentName": "…", "gender": "M",
    "bornAt": "…", "bornOn": "2013-04-01", "className": "3ème primaire",
    "permNumber": "…", "schoolName": "…", "province": "…", "city": "…",
    "commune": "…", "schoolCode": "…", "schoolYear": "2024-2025",
    "degreeLabel": "DEGRÉ ÉLÉMENTAIRE (1ère, 2e ANNÉE)"
  },
  "terms": ["TERM1", "TERM2", "TERM3"],          // ou semestres selon le niveau
  "domains": [
    {
      "code": "LANGUES", "labelFr": "DOMAINE DES LANGUES", "displayOrder": 1,
      "subDomains": [
        {
          "code": "LC", "labelFr": "LANGUES CONGOLAISES", "displayOrder": 1,
          "branches": [
            {
              "programCode": "LC_ORALE", "labelFr": "Expression Orale", "displayOrder": 1,
              "maxPerPeriod": 20, "maxExam": 40, "maxTrimester": 80, "maxYear": 240,
              "terms": {
                "TERM1": { "period1": 15, "period2": 13, "exam": 30, "trimester": 58 },
                "TERM2": { "period1": null, "period2": null, "exam": null, "trimester": null },
                "TERM3": { … }
              },
              "yearTotal": 58            // somme des trimestres (points)
            }
          ],
          "subTotal": { "maxTrimesterPerTerm": {…}, "pointsPerTerm": {…}, "yearMax": …, "yearPoints": … }
        }
      ],
      "subTotal": { … }                  // sous-total domaine (idem)
    }
  ],
  "grandMaxima": {                        // « Maxima généraux »
    "perTerm": { "TERM1": 1120, "TERM2": 1120, "TERM3": 1120 }, "year": 3360
  },
  "footer": {
    "pointsPerTerm": { "TERM1": 720, "TERM2": null, "TERM3": null },
    "percentPerTerm": { "TERM1": 64.3, "TERM2": null, "TERM3": null },
    "yearPoints": 720, "yearPercent": 64.3,
    "placePerTerm": { "TERM1": 3, … }, "yearPlace": 3,
    "studentCount": 30,
    "application": "…", "conduct": "…",
    "decision": "PROMOTED" | "REPEAT" | null
  }
}
```

### Précisions demandées
1. **Points bruts** par période/examen/trimestre (pas seulement des %) — le bulletin officiel
   affiche des **points sur maxima**, pas des pourcentages. Si tu ne peux fournir que des %,
   dis-le : je reconvertirai en points via les maxima (`points = % × max ÷ 100`), mais c'est
   moins fiable (arrondis).
2. **Groupement domaine → sous-domaine → branche** + `displayOrder` : est-il déjà dans le
   snapshot, ou dois-je le reconstruire depuis le programme national (`GET` lequel ?) ?
3. **POURCENTAGE / PLACE / NBRE D'ÉLÈVES** par trimestre et au total : dans le snapshot, ou à
   calculer côté front ? (je préfère les recevoir calculés pour coller au back).
4. **APPLICATION / CONDUITE / décision** : champs disponibles ? valeurs possibles ?
5. Le même snapshot est-il renvoyé par `preview` **et** par le bulletin généré (pour un rendu
   identique avant/après impression) ?

---

## 3. Équivalents proclamation & moyenne (à confirmer)

- **Proclamation** (§B, déjà là) : `rankedAll[{ rank, firstName, lastName, averagePercent }]`
  → je l'affiche comme **liste de proclamation** : `PLACE · NOM · POURCENTAGE`. OK tel quel ?
- **Moyenne** (§A `…/averages`, déjà là) : `students[].subjects[].termAverage` (%) → grille
  `POURCENTAGE par branche`. Faut-il aussi les **points** par branche pour coller au bulletin,
  ou le % suffit pour la vue « moyennes » ?

---

## 4. Réponds idéalement ainsi
Pour §2 : la **forme réelle** de `ministerialSnapshot` (un exemple JSON d'un vrai élève),
en précisant points vs %, ce qui est pré-calculé, et ce que le front doit reconstruire.
Dès réception je rends le bulletin officiel + proclamation + moyennes à l'identique.
