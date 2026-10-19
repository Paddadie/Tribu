# État en cours

**Étape 6 — Parents et enfants** : codée, en attente d'essai de l'IHM par Paul (comme pour l'étape 5). PLAN.md : étape non cochée tant que Paul n'a pas validé.
Terminé quand : une famille recomposée de test s'affiche correctement dans les deux sens.
**Étape 7 — Frères et sœurs** : à démarrer ensuite.

## Fait
- Étapes 1 à 5 validées par Paul (squelette PWA, modèle `src/modele/`, maquettes, liste et fiche `src/ui/`, couples).
- Étape 6, maquette validée par Paul puis codée : fiche avec sections PARENTS / CONJOINT / ENFANTS (étiquette Biologique ou Adoptif, crayon vers la gestion du lien), bouton « Ajouter un proche » (feuille conjoint / parent / enfant) à la place de « Ajouter un conjoint ».
- Fichiers : `src/ui/ajoutLien.ts` (`#/parent/<id>`, `#/enfant/<id>`), `src/ui/lien.ts` (`#/lien/<filiation>/<id>`), `fiche.ts` (sections et feuille), `modele.ts` (`modifierFiliation`, refus des boucles), `deductions.ts` (`liensParents`, `liensEnfants`), style.css.
- 83 tests Vitest verts, `tsc` et `npm run build` propres. L'IHM n'a pas été essayée dans un navigateur.

## Prochaine action
Paul essaie l'IHM de l'étape 6 (famille recomposée : parents biologiques et adoptifs, enfants, modification et retrait d'un lien, feuille « Ajouter un proche »). S'il valide : cocher l'étape 6 dans PLAN.md, puis étape 7 (section fratrie déduite ; la déduction `fratrie` existe déjà dans `deductions.ts`), maquette d'abord.

## Points ouverts
- Pas encore de section frères et sœurs / demis sur la fiche (étape 7).
- Un parent déjà ancêtre de l'enfant n'est pas grisé dans la liste : le refus (« boucle ») s'affiche à l'enregistrement.
- Icônes de l'appli provisoires (3 cercles reliés).
- `npm test` échoue parfois au tout premier lancement d'une session (4 fichiers « failed », aucun test exécuté) ; relancé, tout passe. Revu cette session (`npx vitest run` au premier lancement). Cause inconnue, à surveiller.
