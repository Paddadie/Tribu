# État en cours

**Non commité** (à commiter par Paul) : lot 0 de V4. Dernier commit : c1e18f1. Tests, `tsc` et build verts au 29/10.

## Plan V4 : liaison, nommage, arbre (19 points)
- Plan détaillé, lots et suivi : docs/PLAN.md, section « V4 » (ne lire que l'architecture, le lot en cours, ses points, la stratégie de test et les décisions).
- Questions tranchées le 29/10 et décisions du lot 0 : DECISIONS.md. Ordre : lot 0 (fait), 1, 2, 3, 4, 5 ; lots 2, 4 et 5 : maquette validée avant le code.
- Données de test : toutes fictives (src/modele/test/, 5 familles à graine, `npm run familles`, `npm run captures -- --familles`). Export réel : structures seulement (context.md, Pièges).
- Pour le lot 1 : `it.fails` L2 (second parent, point 6), `it.todo` L3 (`remplacerParent`) et L5 (`reprendreNomDeNaissance`) à passer au vert. « Prend le nom » : sonde du 29/10, seul trou l'union déjà mariée (point 2). Lot 4 : point 13 = « fratries collées », seuils de l'arbre à ne faire que baisser.

**Prochaine étape** : lot 1 (modèle et liaison), dès le feu vert de Paul.

## Reste à faire (audit UX/UI, hors V4)
- D, non fait : pile d'avatars « Neveux et nièces » / « Belle-famille » ; âge sous les nœuds ; astuce de l'arbre avec « Compris » ; zoom en un bloc.
- P3 (sur accord) : Réglages, deux colonnes sur ordinateur (les couleurs de familles passent dans V4, point 16).
- Mission « Famille proche » : Paul doit encore regarder l'arbre de quelques fiches réelles.

## À valider / points ouverts
- Veuvage : un export avec un remariage est refusé par une version d'avant ; pour noter après coup le défunt d'une personne déjà remariée, saisir le défunt avant le nouveau conjoint.
- `format:check` : fichiers de l'appli non formatés (fiche.ts, fiche.css, tests de parents…).
- Calendrier des fêtes ; `.ics` ; profils Edge `%TEMP%\tribu-captures-*`.
- Téléphone : bandeau de mise à jour, Retour par geste en saisie, flou de la barre de l'arbre, partage du PNG.
- UX-20 : couple entre deux fratries décalé (~0,4 case) ; instantané de la fixture à régénérer après vérification à l'œil.
- Nettoyage possible : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts).
