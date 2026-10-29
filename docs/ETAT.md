# État en cours

Dernier commit : f77c972 (lots 4 et 5 de V4), arbre de travail propre : 1024 tests, `tsc` et build verts au 29/10.

## Plan V4 : liaison, nommage, arbre (19 points) — terminé
- Plan détaillé, lots et suivi : docs/PLAN.md, section « V4 » ; les 6 lots sont cochés. Décisions des lots 0 à 5 : DECISIONS.md.
- Données de test : toutes fictives (src/modele/test/, 5 familles à graine, `npm run familles`, `npm run captures -- --familles`, à lancer depuis Bash : PowerShell avale le `--`). Export réel : structures seulement (context.md, Pièges) ; avant de rendre la main, script jetable qui compte (sans les afficher) les noms de l'export présents dans les fichiers touchés et absents du dernier commit.
- Lot 4 : fratries collées, couleurs par famille (`couleursDesFamilles`), « née X », PAS_Y 154. Seuils de l'arbre : ne faire que baisser.
- Lot 5 : `StyleTrait` (`plein` / `ex` / `adoption`) : ex en points ronds, adoption en tirets longs (fiche, arbre, PNG) ; légende « ex » ; `bloc-deces`. Captures : captures/apres-lot5 (hors git).

**Prochaine étape** : Paul choisit la suite : points laissés ci-dessous, ou audit UX/UI hors V4. PLAN.md n'a plus de lot V4 ouvert ; les « avant » des prochaines captures sont dans captures/apres-lot5.

## Points laissés par les lots 2 à 5
- Séparation automatique par `unirParents` : pas de proposition de reprise du nom ; « Mariés » sur les écrans Parent et Qui applique le nom de l'homme sans aperçu.
- Lambert : contour pointillé du « ? » dans « Famille proche » peu lisible (le trait d'ex est désormais en points ronds).
- « née X » : l'italique du dernier caractère est rogné quand la mention remplit juste la largeur du nœud (Rochefort, ordinateur).
- Carte « À compléter » de l'accueil inchangée (n'offre pas encore « Ne plus me la signaler »).
- Nommage : l'ex d'un parent éloigné (cousin du père) reste sans étiquette ; la compagne non mariée d'un parent a « Belle-mère » en pastille mais « ton père → sa compagne » dans le chemin.

## Reste à faire (audit UX/UI, hors V4)
- D, non fait : pile d'avatars « Neveux et nièces » / « Belle-famille » ; âge sous les nœuds ; astuce de l'arbre avec « Compris » ; zoom en un bloc.
- P3 (sur accord) : Réglages, deux colonnes sur ordinateur.
- Mission « Famille proche » : Paul doit encore regarder l'arbre de quelques fiches réelles.

## À valider / points ouverts
- Veuvage : un export avec un remariage est refusé par une version d'avant ; noter le défunt avant le nouveau conjoint.
- `format:check` : fichiers non formatés d'avant (arbre.ts, arbreImage.ts, geometrieArbre.ts, champsPersonne.ts, arbre.css, fiche.ts, modele.ts…), laissés tels quels.
- Calendrier des fêtes ; `.ics` ; téléphone : bandeau de mise à jour, Retour par geste, flou de la barre de l'arbre, partage du PNG.
- UX-20 : couple entre deux fratries décalé (~0,4 case) ; instantané de la fixture à régénérer après vérification à l'œil.
- Nettoyage possible : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts).
