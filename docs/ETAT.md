# État en cours

**FEAT-09 (mini-arbre de la fiche et lien « ami ») codé**, non commité, comme S4 et S3b. 250 tests verts, `tsc` et build propres. Rendu vérifié à l'œil sur captures Edge headless (Hugo, Agnès en colonne étroite, Théo, Léa, Lou en sombre, tablette), pas sur téléphone. FEAT-09 est coché dans PLAN.md « Plus tard » ; décisions en fin de DECISIONS.md ; SPEC.md a les sections « Amis » et « Dessins de la fiche », format v3.

## Avant la suite
- Paul : commiter, déployer, puis tester sur iPhone et Android.
  - FEAT-09 :
    - les anciennes données passent en v3 sans rien perdre (et un ancien export se réimporte) ;
    - « Ajouter un proche » → « Un ami », section « Amis », croix de retrait avec bandeau « Annuler » (retrait à valider) ;
    - pastilles sans possessif : « Cousine », « Toi », « Compagne de Karim », « Amie d'Inès » ;
    - « Lien avec toi » dès deux étapes, « Famille proche » : pile de la fratrie qui descend à sa section, « + Parent », toucher une personne ouvre sa fiche ;
    - beaucoup d'enfants : le rang défile, l'aîné à gauche ; rotation de l'écran et tablette.
  - S4 : rendu clair et sombre, glissement entre écrans (iOS 18 minimum), feuille, confirmation, bandeau, ligne éclairée au retour, cases rondes, « réduire les animations », nouvelle icône après réinstallation.
  - S3b : import d'un export v1 à deux unions, séparation et « Rétablir le couple », date de décès, fiche et liste d'un décédé, « Prochains anniversaires ».
  - S3a : Réglages → Moi, pastille « Cousine », sections « Par alliance ».
  - S2b : index de la liste, clavier iOS, homonyme, bandeau après retrait d'un lien.
  - S2a : Retour d'écran en écran, position de la liste, thème sombre sans éclair clair.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- À valider par Paul : bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) », dates capitalisées, âge « environ 35 ans », retrait d'un ami par la croix.
- Ensuite : l'arbre global (PLAN.md « Plus tard »).

## Repères
- src/style.css : jetons en tête (`--t1`…`--t5`, `--trait`, `--av-*`) ; blocs « Dessins de la fiche », « États communs » et « Animations » en fin de fichier.
- src/ui/arbre.ts : `dessinFoyer`, `dessinChemin` (ResizeObserver sur `.sonde`, rien à largeur nulle). src/ui/ajoutAmi.ts : route `#/ami/<id>`.
- src/modele/deductions.ts : `relation`, `conjoint()` (union actuelle seule), `exConjoints()`, `familleElargie`, `amis`, `chemin`, `foyer`. src/modele/parente.ts : `etiquette`, `motsChemin`. Tests : amis.test.ts.
- src/modele/migration.ts : `migrer()` v1 → v2 → v3. src/modele/age.ts : âge et anniversaires.
- src/main.ts : `afficher()` lance la View Transition ; `profondeurCourante()` dans navigation.ts. src/ui/surbrillance.ts vise `a.ligne-lien`.
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route, reglages?)`). En tête, émulation du vrai navigateur, à garder.
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors d'un `try`, utiliser `lireNom()`.
- Captures : Edge headless (fenêtre de 500 px minimum) sur le serveur de dev, avec une page d'essai temporaire dans `public/` qui remplit le localStorage ; la supprimer après.

## Points ouverts
- Ajout d'un conjoint : un ex n'est pas grisé, l'erreur « déjà une union » n'apparaît qu'à l'enregistrement.
- La garde de saisie ne couvre ni le geste ni le bouton Retour du téléphone.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » ne s'affiche qu'à l'enregistrement.
- Beaux-frères, belles-sœurs et conjoints des parents : libellé mais pas de section.
- Surbrillance : `signaler` reste en attente si l'écran de retour n'est pas une fiche.
- Lien de cousinage sans nom usuel (Lou, petite-cousine) : pas de pastille.
- TEST-03 non reproduit : au prochain `npm test` en échec, copier toute la sortie.
