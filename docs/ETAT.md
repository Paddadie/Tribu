# État en cours

**Étape 4 — Liste et fiche personne**
Créer, modifier, supprimer (avec confirmation) une personne ; filtre de la liste par nom.
Terminé quand : sur le téléphone, une personne créée persiste après fermeture de l'appli.

## Fait
- Étape 1 terminée et validée : squelette PWA (Vite + TS + vite-plugin-pwa en autoUpdate), déployé sur GitHub Pages. Config : `base` `/Tribu/`, `.npmrc` `legacy-peer-deps=true`.
- Étape 2 terminée et validée (41 tests Vitest verts, `tsc` propre). Code dans `src/modele/` :
  - `types.ts` : Personne, Union, Filiation, Donnees.
  - `modele.ts` : création/modification/suppression (cascade des unions et filiations), règles (pas de doublon, max 2 parents par type).
  - `deductions.ts` : conjoints, parents, enfants, enfantsDuCouple, fratrie (frères/sœurs + demis), tri par naissance.
  - `stockage.ts` : charger/sauvegarder (localStorage injecté), exporterJson/importerJson, validation.
- Étape 3 terminée : maquettes accueil + fiche (https://claude.ai/artifact/MqxSFQuLe3ZWNXT31tMepc), ajustées selon les retours de Paul et consignées dans SPEC.md / DECISIONS.md. Pour mémoire : liste triée par nom de famille et regroupée par lettre ; fiche avec sections dans l'ordre conjoints, enfants, frères et sœurs (+ demis), parents ; section vide masquée ; étiquettes « Marié » et « Adoptif » seulement ; thème vert (#1B6B58), police Figtree.

## Prochaine action
Coder l'écran d'accueil (liste, filtre, bouton +) et la fiche personne (création, modification, suppression avec confirmation) en suivant les maquettes. Lire PLAN.md étape 4 au besoin ; code UI dans `src/` à créer (le modèle de `src/modele/` est prêt). Tri fixe par nom en V1 (paramétrage = plus tard).

## Points ouverts
- Bouton « Ajouter un proche » en bas de fiche (pour atteindre les catégories masquées) : proposé par Claude, pas encore confirmé par Paul. Le lien d'ajout lui-même arrive aux étapes 5 et 6.
- Icônes de l'appli provisoires (3 cercles reliés), à remplacer si souhaité.
