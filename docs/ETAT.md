# État en cours

**Étape 3 — Maquettes**
Écrans liste et fiche, publiés pour validation par Paul avant de coder l'interface.
Terminé quand : Paul a réagi aux maquettes et les a validées (ou demandé des ajustements pris en compte).

## Fait
- Étape 1 terminée et validée : squelette PWA (Vite + TS + vite-plugin-pwa en autoUpdate), déployé sur GitHub Pages. Config : `base` `/Tribu/`, `.npmrc` `legacy-peer-deps=true`.
- Étape 2 terminée et validée par Paul (41 tests Vitest verts, `tsc` propre), règle des demi-frères/sœurs comprise. Code dans `src/modele/` :
  - `types.ts` : Personne, Union, Filiation, Donnees.
  - `modele.ts` : création/modification/suppression (cascade des unions et filiations), règles (pas de doublon, max 2 parents par type).
  - `deductions.ts` : conjoints, parents, enfants, enfantsDuCouple, fratrie (frères/sœurs + demis), tri par naissance.
  - `stockage.ts` : charger/sauvegarder (localStorage injecté), exporterJson/importerJson, validation.

## Prochaine action
Lire docs/PLAN.md (étape 3) puis SPEC.md (sections fiche, accueil), concevoir les maquettes liste + fiche, les publier, laisser Paul réagir librement (pas de QCM). Ne rien coder de visible avant validation.

## Points ouverts
- Icônes de l'appli provisoires (3 cercles reliés), à remplacer si souhaité.
