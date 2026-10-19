# État en cours

**V2, session S3b Mémo : terminée**, non commitée (S3a l'est). FEAT-06, FEAT-04, DATA-07, FEAT-05 et le titre S3b sont cochés dans PLAN.md ; décisions du 19/10 en fin de DECISIONS.md, SPEC.md à jour (format v2 compris). 226 tests verts, `tsc` et build propres.

## Avant S4
- Paul : commiter, déployer, puis tester sur iPhone et Android.
  - S3b :
    - import d'un ancien export v1 (avec une personne ayant eu deux unions) : tout revient, la seconde union est « séparée » ;
    - fiche : « Se sont séparés » → section EX-CONJOINT, bandeau « Annuler », puis « Rétablir le couple » ;
    - formulaire : date de décès (année seule possible), refus d'un décès avant la naissance ;
    - fiche d'un décédé : « Décédée le … », « Morte à 82 ans » ; liste : « 1941 – 2024 » ;
    - accueil : bloc « Prochains anniversaires » (aujourd'hui / demain / dans N jours, âge atteint), masqué pendant le filtre.
  - S3a : Réglages → MOI, pastille « Ta cousine », sections « Par alliance », justesse des liens sur une vraie famille.
  - S2b : index de la liste (bulle, pas sous l'en-tête `top: 150px` ni le bouton +), clavier iOS, homonyme, bandeau après retrait d'un lien.
  - S2a : Retour d'écran en écran, liste qui garde sa position, thème sombre sans éclair clair.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- À valider par Paul : bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) », dates de la fiche capitalisées (« Née le… »), âge « environ 35 ans » (le plus probable) quand la date est partielle.
- Ensuite `/bilan`, `/clear`, puis session **S4** : lire seulement la section S4 de PLAN.md.

## Repères
- src/modele/migration.ts : `migrer()` v1 → v2. src/modele/age.ts : âge, `detailPersonne`, `prochainsAnniversaires`, `libelleDelai`.
- src/modele/deductions.ts : `relation`, `conjoint()` (union actuelle seule, jamais `d.unions`), `exConjoints()`, `familleElargie`. src/modele/modele.ts : `separerUnion`, `retablirUnion`.
- src/ui/union.ts : écran d'union (`#/union/<union>/<personne>`). src/ui/accueil.ts : `blocAnniversaires`. src/ui/fiche.ts : `sectionsConjoint`, `ligneUnion`.
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route, reglages?)`). En tête, émulation du vrai navigateur, à garder.
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors d'un `try`, utiliser `lireNom()`.

## Points ouverts
- Ajout d'un conjoint : un ex n'est pas grisé, l'erreur « déjà une union » n'apparaît qu'à l'enregistrement.
- La garde de saisie ne couvre ni le geste ni le bouton Retour du téléphone.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » ne s'affiche qu'à l'enregistrement.
- Beaux-frères, belles-sœurs et conjoints des parents : libellé mais pas de section.
- TEST-03 non reproduit : au prochain `npm test` en échec, copier toute la sortie.
- Icônes provisoires (S4).
