# État en cours

**Étape 5 — Couples** : terminée et validée par Paul (2026-10-19, validation de l'IHM actuelle).
**Étape 6 — Parents et enfants** : à démarrer.
Terminé quand : une famille recomposée de test s'affiche correctement dans les deux sens.

## Fait
- Étapes 1 à 5 terminées et validées par Paul (squelette PWA, modèle `src/modele/`, maquettes, liste et fiche `src/ui/`, couples).
- Couples : `ajouterUnion` refuse un second conjoint ; `conjoint(d, id)` dans `deductions.ts` ; section CONJOINT sur la fiche (étiquette « Marié », crayon vers `#/union/<id>`), `ajoutConjoint.ts` (`#/conjoint/<id>`), `union.ts` (marié, mettre fin à l'union), `champsPersonne.ts` (champs communs).
- 80 tests Vitest verts, `npm run build` propre.

## Prochaine action
Étape 6 : lire PLAN.md, puis proposer une maquette (publiée, Paul réagit librement) avant de coder. Y inclure le bouton « Ajouter un proche » avec choix de catégorie (conjoint, parent, enfant), non confirmé par Paul ; « Ajouter un conjoint » n'est qu'un palliatif.

## Points ouverts
- Pas encore de sections enfants / fratrie / parents sur la fiche (étapes 6 et 7).
- Icônes de l'appli provisoires (3 cercles reliés).
- `npm test` échoue parfois au tout premier lancement d'une session (4 fichiers « failed », aucun test exécuté) ; relancé, 80/80 verts. Non reproduit en 6 relances, même cache Vite vidé. Cause inconnue, à surveiller.
