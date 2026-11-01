# État en cours

Dernier commit : 81f9353 (Ligne directe). À commiter : générations souples V1b (maquette `mockups/generations-souples`) : 1128 tests, `tsc`, build et `format:check` verts au 01/11 ; captures avant / après : captures/souple-avant et souple-apres (arbres de Lambert, extrêmes, Martinez-Vasseur, Rochefort).
- Passe après `disposerArbre` (inchangé, fixture intacte) : `modele/souple.ts`, `soupleRecherche.ts` ; recherche en Worker, résultat gardé dans `tribu:souple` ; noms de famille déplacés s'ils touchent un trait (`lieuxEtiquettes`).
- Incohérences de V1b : Paul les signale après essai ; ni bandes ni repères de génération (non validés). Sur ses données : 59 → 26 croisements.
- Limites : sans calcul gardé, l'arbre d'avant puis un redessin ; PNG souple seulement si le calcul est gardé ; captures d'arbre dépendantes de la fin du Worker (1,8 s). Incohérence vue : extrêmes, trait d'Ophélie commun à deux fratries de deux couleurs.
- À regarder par Paul : V1b et le filtre « Ligne directe » sur ses données réelles ; un nom de famille déplacé même sans décalage (Martinez-Vasseur, Rochefort ; aucun sur la fixture).

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
