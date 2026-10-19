# État en cours

**Étape 5 — Couples** : codée, à valider par Paul sur téléphone.
Terminé quand : la fiche affiche son conjoint et un toucher ouvre la fiche du conjoint. (Modèle changé à la demande de Paul : un seul conjoint à la fois.)

## Fait
- Étapes 1 à 4 terminées et validées par Paul (squelette PWA, modèle `src/modele/`, maquettes, liste et fiche `src/ui/`).
- Étape 5 codée :
  - Modèle : `ajouterUnion` refuse un second conjoint ; `conjoint(d, id)` dans `deductions.ts`.
  - UI : section CONJOINT sur la fiche (toucher = fiche du conjoint, étiquette « Marié », crayon vers `#/union/<id>`), bouton « Ajouter un conjoint » si aucun, `ajoutConjoint.ts` (`#/conjoint/<id>`), `union.ts` (`#/union/<id>` : marié, mettre fin à l'union avec confirmation), `champsPersonne.ts` (champs communs).
- 80 tests Vitest verts, `npm run build` propre.

## Prochaine action
Paul teste l'étape 5 sur téléphone. Puis étape 6 (parents et enfants) : lire PLAN.md, proposer une maquette à valider (dont le bouton « Ajouter un proche » avec choix de catégorie, non confirmé).

## Points ouverts
- Pas encore de sections enfants / fratrie / parents sur la fiche (étapes 6 et 7) ; « Ajouter un proche » à confirmer.
- Étape 5 non testée dans un navigateur par Claude (types, tests et build seulement).
- Icônes de l'appli provisoires (3 cercles reliés).
- Un premier lancement de `npm test` avait échoué sans reproduction ; à surveiller.
