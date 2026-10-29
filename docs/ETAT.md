# État en cours

**Non commité** (à commiter par Paul) : plan V4 (docs/PLAN.md § V4, DECISIONS.md du 29/10), `.gitignore` des exports, règle d'anonymisation (context.md). Dernier commit : aa8546e. Tests, `tsc` et build verts au 29/10.

## Plan V4 : liaison, nommage, arbre (19 points)
- Plan détaillé, lots et suivi : docs/PLAN.md, section « V4 » (ne lire que l'architecture, le lot en cours, ses points, la stratégie de test et les décisions).
- Questions tranchées le 29/10 : DECISIONS.md et fin de la section V4.
- Ordre : lot 0 (outillage de test fictif), 1 (modèle), 2 (écrans), 3 (nommage), 4 (arbre), 5 (retouches). Lots 2, 4 et 5 : maquette publiée et validée avant le code.
- Données de test : toutes fictives (générateur maison à graine). Export réel : structures seulement (voir context.md, Pièges).
- « Prend le nom » : sonde du 29/10, les 5 chemins depuis la fiche du mari marchent ; seul trou, l'union déjà mariée (point 2).

**Prochaine étape** : lot 0, dès le feu vert de Paul.

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
