# État en cours

**V2, session S4 Identité visuelle : code et doc terminés**, non commités (S3b non plus). UI-01 à UI-07 et ANIM-01 à ANIM-04 sont cochés dans PLAN.md ; décisions du 19/10 en fin de DECISIONS.md, SPEC.md a une section « Identité visuelle ». 229 tests verts, `tsc` et build propres. Le titre S4 reste à cocher après le test sur téléphone. Rien n'a été vérifié à l'œil dans l'appli elle-même (seule la maquette l'a été).

## Avant la suite
- Paul : commiter, déployer, puis tester sur iPhone et Android.
  - S4 :
    - rendu général (clair et sombre) comme sur la maquette : avatars teintés par nom de famille, titres de section gris en capitales, un seul bouton plein par écran ;
    - glissement entre écrans à l'aller et au retour (iPhone : iOS 18 minimum, sinon pas d'animation, c'est normal) ;
    - feuille « Ajouter un proche » qui monte, confirmation qui zoome, bandeau « Annuler » ;
    - ajout d'un enfant : la ligne s'éclaire au retour sur la fiche ;
    - cases rondes à coche (ajout parent / enfant) et coche de la personne choisie ;
    - réglage « réduire les animations » du téléphone : plus aucun mouvement ;
    - nouvelle icône (anneaux) après réinstallation de la PWA sur l'écran d'accueil.
  - S3b :
    - import d'un ancien export v1 (avec une personne ayant eu deux unions) : tout revient, la seconde union est « séparée » ;
    - fiche : « Se sont séparés » → section Ex-conjoint, bandeau « Annuler », puis « Rétablir le couple » ;
    - formulaire : date de décès (année seule possible), refus d'un décès avant la naissance ;
    - fiche d'un décédé : « Décédée le … », « Morte à 82 ans » ; liste : « 1941 – 2024 » ;
    - accueil : bloc « Prochains anniversaires » (aujourd'hui / demain / dans N jours, âge atteint), masqué pendant le filtre.
  - S3a : Réglages → Moi, pastille « Ta cousine », sections « Par alliance », justesse des liens sur une vraie famille.
  - S2b : index de la liste (bulle, pas sous l'en-tête ni le bouton +), clavier iOS, homonyme, bandeau après retrait d'un lien.
  - S2a : Retour d'écran en écran, liste qui garde sa position, thème sombre sans éclair clair.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- À valider par Paul : bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) », dates capitalisées, âge « environ 35 ans ».
- Ensuite `/bilan`, `/clear`, puis la section suivante de PLAN.md (ou « Plus tard »).

## Repères
- src/style.css : jetons en tête (`--t1`…`--t5`, `--chaud`, `--pastille`, `--av-*`) ; blocs « États communs » et « Animations » en fin de fichier.
- src/ui/lignePersonne.ts : `avatarPersonne`. src/modele/liste.ts : `teinteFamille`. src/ui/surbrillance.ts : `signaler` / `eclairer`.
- src/main.ts : `afficher()` lance la View Transition (classe `nav-avant` / `nav-arriere` sur `html`) ; `profondeurCourante()` dans navigation.ts.
- src/modele/migration.ts : `migrer()` v1 → v2. src/modele/age.ts : âge et anniversaires. src/modele/deductions.ts : `relation`, `conjoint()` (union actuelle seule), `exConjoints()`, `familleElargie`.
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route, reglages?)`). En tête, émulation du vrai navigateur, à garder.
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors d'un `try`, utiliser `lireNom()`.
- Icônes : SVG de `public/favicon.svg` ; PNG régénérés avec Edge headless (pas d'outil dédié dans le projet).

## Points ouverts
- Ajout d'un conjoint : un ex n'est pas grisé, l'erreur « déjà une union » n'apparaît qu'à l'enregistrement.
- La garde de saisie ne couvre ni le geste ni le bouton Retour du téléphone.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » ne s'affiche qu'à l'enregistrement.
- Beaux-frères, belles-sœurs et conjoints des parents : libellé mais pas de section.
- Surbrillance : `signaler` reste en attente si l'écran de retour n'est pas une fiche.
- TEST-03 non reproduit : au prochain `npm test` en échec, copier toute la sortie.
