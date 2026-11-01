# État en cours

Dernier commit : 81f9353 (Ligne directe). Commit en cours par Paul : générations souples V1b + `mockups/` sorti du dépôt (gardé en local, ignoré par git ; maquette de référence : `mockups/generations-souples`). 1128 tests, `tsc`, build et `format:check` verts au 01/11 ; captures avant / après : captures/souple-avant et souple-apres.
- **Prochaine étape** : Paul regarde le rendu final de l'arbre sur ses données et envoie les incohérences de V1b ; les corriger une à une (tests Vitest + captures avant / après).
- V1b : passe après `disposerArbre` (inchangé, fixture intacte) : `modele/souple.ts` (`assouplir`), `soupleRecherche.ts` (coûts, `fautesDe`) ; recherche en Worker (`ui/souple.worker.ts`, `ui/arbreSouple.ts`), décalages gardés dans `tribu:souple` ; noms de famille déplacés s'ils touchent un trait (`lieuxEtiquettes`, ui/geometrieArbre.ts). Sur ses données : 59 → 26 croisements.
- Limites connues : sans calcul gardé, l'arbre d'avant puis un redessin (sauté si une feuille ou la loupe est ouverte) ; PNG souple seulement si le calcul est gardé ; captures d'arbre dépendantes de la fin du Worker (1,8 s) ; ni bandes ni repères de génération (non validés).
- Incohérences déjà vues : descendance repoussée loin vers le bas (Lambert) ; extrêmes, trait d'Ophélie commun à deux fratries de deux couleurs ; un nom de famille déplacé même sans décalage (Martinez-Vasseur, Rochefort ; aucun sur la fixture). Aussi à regarder : le filtre « Ligne directe ».

## Passe qualité technique (refactor pur, sans changement visible) — 7 étapes faites
- Étapes : 1 Prettier · 2 utilitaires uniques · 3 code mort · 4 découpe de fiche.css · 5 `barreEcran` / `boutonRetour` · 6 Réglages par onglet · 7 modele.ts par sujet. Décisions : DECISIONS.md.
- **Prochaine étape** : rapport final à Paul : résumé, laissés de côté, comportements suspects, checklist de tests manuels, recommandations (ESLint = nouvelle dépendance, à valider ; `format:check` en CI).
- Notes pour le rapport : route `#/ex/<id>` absente du commentaire des routes de main.ts ; capture `dupontel-ordinateur-04-arbre-toi-clair` et `extremes-telephone-07-conjoint-sombre` non déterministes ; aucun bug certain relevé.

## Points laissés par les lots 2 à 5 de V4
- Séparation automatique par `unirParents` : pas de proposition de reprise du nom ; « Mariés » sur les écrans Parent et Qui applique le nom de l'homme sans aperçu.
- Lambert : contour pointillé du « ? » dans « Famille proche » peu lisible.
- « née X » : l'italique du dernier caractère est rogné quand la mention remplit juste la largeur du nœud (Rochefort, ordinateur).
- Carte « À compléter » de l'accueil : n'offre pas encore « Ne plus me la signaler ».
- Nommage : l'ex d'un parent éloigné reste sans étiquette ; la compagne non mariée d'un parent a « Belle-mère » en pastille mais « ton père → sa compagne » dans le chemin.

## Reste à faire (audit UX/UI, hors V4)
- D, non fait : pile d'avatars « Neveux et nièces » / « Belle-famille » ; âge sous les nœuds ; astuce de l'arbre avec « Compris » ; zoom en un bloc.
- P3 (sur accord) : Réglages, deux colonnes sur ordinateur.
- Mission « Famille proche » : Paul doit encore regarder l'arbre de quelques fiches réelles.

## À valider / points ouverts
- Veuvage : un export avec un remariage est refusé par une version d'avant ; noter le défunt avant le nouveau conjoint.
- Calendrier des fêtes ; `.ics` ; téléphone : bandeau de mise à jour, Retour par geste, flou de la barre de l'arbre, partage du PNG.
- UX-20 : couple entre deux fratries décalé (~0,4 case) ; instantané de la fixture à régénérer après vérification à l'œil.
