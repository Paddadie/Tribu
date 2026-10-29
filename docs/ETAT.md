# État en cours

Dernier commit : f537548 (lot 2 de V4). Lot 3 fait, non commité : 1008 tests, `tsc` et build verts au 29/10.

## Plan V4 : liaison, nommage, arbre (19 points)
- Plan détaillé, lots et suivi : docs/PLAN.md, section « V4 » (ne lire que l'architecture, le lot en cours, ses points, la stratégie de test et les décisions).
- Questions tranchées le 29/10 et décisions des lots 0 à 3 : DECISIONS.md. Ordre : lots 0 à 3 (faits), 4, 5 ; lots 4 et 5 : maquette validée avant le code.
- Données de test : toutes fictives (src/modele/test/, 5 familles à graine, `npm run familles`, `npm run captures -- --familles`, écrans 06 à 10 sur téléphone). Export réel : structures seulement (context.md, Pièges) ; avant de rendre la main, script jetable qui compte (sans les afficher) les noms de l'export présents dans les fichiers touchés et absents du dernier commit, accents repliés.
- Lot 3 : `composer` (parente.ts) dit un chemin en relations composées, « Détail » étape par étape ; couche des ex à part (`lienEx`) ; veuf remarié reste époux du défunt. Lot 4 : point 13 = « fratries collées », seuils de l'arbre à ne faire que baisser.

**Prochaine étape** : lot 4 (arbre), maquette validée avant le code. Captures « avant » du lot 4 = captures/apres-lot3 (hors git) ; familles fictives à regénérer (`npm run familles`, le scratchpad ne survit pas).

## Points laissés par les lots 2 et 3
- Séparation automatique par `unirParents` : pas de proposition de reprise du nom ; « Mariés » sur les écrans Parent et Qui applique le nom de l'homme sans aperçu.
- Lambert : le « ? » enregistré de Tristan se dessine dans « Famille proche » avec un pointillé qui se lit mal : à revoir au lot 4.
- Carte « À compléter » de l'accueil inchangée (n'offre pas encore « Ne plus me la signaler »).
- Nommage : l'ex d'un parent éloigné (cousin du père) reste sans étiquette ; la compagne non mariée d'un parent a « Belle-mère » en pastille mais « ton père → sa compagne » dans le chemin.

## Reste à faire (audit UX/UI, hors V4)
- D, non fait : pile d'avatars « Neveux et nièces » / « Belle-famille » ; âge sous les nœuds ; astuce de l'arbre avec « Compris » ; zoom en un bloc.
- P3 (sur accord) : Réglages, deux colonnes sur ordinateur (couleurs de familles : V4, point 16).
- Mission « Famille proche » : Paul doit encore regarder l'arbre de quelques fiches réelles.

## À valider / points ouverts
- Veuvage : un export avec un remariage est refusé par une version d'avant ; noter le défunt avant le nouveau conjoint.
- `format:check` : fichiers non formatés d'avant le lot 1 (fiche.ts, fiche.css, modele.ts, main.ts, parente.ts, saisie.ts…), laissés tels quels.
- Calendrier des fêtes ; `.ics` ; profils Edge `%TEMP%\tribu-captures-*` ; téléphone : bandeau de mise à jour, Retour par geste, flou de la barre de l'arbre, partage du PNG.
- UX-20 : couple entre deux fratries décalé (~0,4 case) ; instantané de la fixture à régénérer après vérification à l'œil.
- Nettoyage possible : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts).
