# État en cours

**V2, session S2b Parcours : terminée**, non commitée. Les 12 lignes et le titre S2b sont cochés dans PLAN.md (décisions du 19/10 en fin de DECISIONS.md, SPEC.md à jour). 165 tests verts, `tsc` et build propres. S1 et S2a sont commitées.

## Avant S3a
- Paul : commiter, déployer, puis tester sur iPhone et Android.
  - S2b :
    - index de la liste, au toucher et au glisser : la bulle suit, l'index ne passe pas sous l'en-tête (son `top: 150px` est fixé à la main) ni sous le bouton + ;
    - le clavier s'ouvre-t-il sur iOS avec le curseur placé d'office dans le prénom ?
    - enfant d'un couple, frère ou sœur, homonyme, bandeau après retrait d'un lien.
  - S2a : liste → fiche → autre fiche → Retour, puis Retour : on remonte d'un écran à la fois et la liste garde sa position. Thème sombre : pas d'éclair clair au lancement.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- À valider par Paul : bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) ».
- Ensuite `/clear`, puis session **S3a Parenté** : lire seulement la section S3a de PLAN.md. Modèle et tests d'abord.

## Repères
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route)` recharge main.ts). En tête, émulation du vrai navigateur, à garder.
- src/ui/selecteurPersonne.ts : sélecteur commun aux écrans d'ajout (onglets, suggestions, nom proposé, homonymes) ; `rafraichir()` quand un réglage de l'écran change.
- src/ui/ajoutLien.ts : parent, enfant (case du conjoint) et frère (cases des parents).
- src/modele/saisie.ts : `nomsEnfant`, `suggestions`. liste.ts : `homonymes`, `lettresIndex`, `groupeVise`, `enumerer`, `avecDe` (élision).
- src/ui/navigation.ts : `garderSaisie(modifie)`, remise à zéro à chaque écran.

## Points ouverts
- La garde de saisie ne couvre pas le geste ni le bouton Retour du téléphone.
- S3a : où mémoriser « Moi » (réglages ou données), à décider en début de session.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » s'affiche à l'enregistrement.
- TEST-03 non reproduit. À la prochaine occurrence d'un `npm test` en échec, copier toute la sortie.
- Icônes provisoires (S4).
