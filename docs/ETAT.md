# État en cours

**V2, session S3a Parenté : terminée**, non commitée. FEAT-01, FEAT-02 et le titre S3a sont cochés dans PLAN.md (décisions du 19/10 en fin de DECISIONS.md, SPEC.md à jour). 187 tests verts, `tsc` et build propres. S2b est commitée.

## Avant S3b
- Paul : commiter, déployer, puis tester sur iPhone et Android.
  - S3a :
    - Réglages → MOI : « Choisir ma fiche » ouvre la feuille, la recherche marche, la liste défile (`.feuille-liste`, 45 % de la hauteur) ;
    - la pastille « Ta cousine » sous le nom, lisible en thème sombre ;
    - les nouvelles sections de la fiche et leurs étiquettes (« Par alliance », « Toi », « Beau-père »…) ;
    - sur une vraie famille : chaque lien affiché est juste ? Noter les noms qui surprennent.
  - S2b :
    - index de la liste, au toucher et au glisser : la bulle suit, l'index ne passe pas sous l'en-tête (son `top: 150px` est fixé à la main) ni sous le bouton + ;
    - le clavier s'ouvre-t-il sur iOS avec le curseur placé d'office dans le prénom ?
    - enfant d'un couple, frère ou sœur, homonyme, bandeau après retrait d'un lien.
  - S2a : liste → fiche → autre fiche → Retour, puis Retour : on remonte d'un écran à la fois et la liste garde sa position. Thème sombre : pas d'éclair clair au lancement.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- À valider par Paul : bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) ».
- Ensuite `/clear`, puis session **S3b Mémo** : lire seulement la section S3b de PLAN.md. Maquette d'abord (accueil avec anniversaires, fiche avec décès et âge).

## Repères
- src/modele/deductions.ts : `relation(d, de, vers)` (soi, conjoint, sang, alliance), `inverser`, `familleElargie`. L'alliance passe par `conjoint()`, jamais par `d.unions` : à garder avec FEAT-06 (S3b), pour qu'un ex ne devienne pas de la famille.
- src/modele/parente.ts : `libelleRelation`, `lienAvecMoi`. src/modele/reglages.ts : `moi` et `ficheMoi`.
- src/ui/fiche.ts : `lienMoi`, `sectionsElargies`, `ligneElargie`. src/ui/choixMoi.ts : feuille de choix de ma fiche.
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route, reglages?)` recharge main.ts). En tête, émulation du vrai navigateur, à garder.
- src/ui/selecteurPersonne.ts : sélecteur commun aux écrans d'ajout. src/ui/navigation.ts : `garderSaisie(modifie)`.

## Points ouverts
- La garde de saisie ne couvre ni le geste ni le bouton Retour du téléphone.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » ne s'affiche qu'à l'enregistrement.
- Les beaux-frères et belles-sœurs, et les conjoints des parents, ont un libellé mais pas de section (hors liste du plan).
- TEST-03 non reproduit : au prochain `npm test` en échec, copier toute la sortie.
- Icônes provisoires (S4).
