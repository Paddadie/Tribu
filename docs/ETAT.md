# État en cours

**Arbre global (`#/arbre`) codé**, non commité. FEAT-09 est commité (ab0063b). 276 tests verts, `tsc` et build propres. Rendu vérifié sur captures Edge headless (clair, sombre, large, dézoomé, accueil), pas sur téléphone. Coché dans PLAN.md « Plus tard » ; décisions en fin de DECISIONS.md ; SPEC.md a la section « Arbre global ».

## Avant la suite
- Paul : vérifier la branche (le dépôt était en HEAD détachée), commiter, déployer, puis tester sur iPhone et Android.
  - Arbre global :
    - glisser, pincer, molette, + et −, « Toi », « Tout » ; pas de zoom de la page sur iOS ;
    - toucher une personne ouvre sa fiche, mais pas après un glissement ; double toucher sur le fond zoome une seule fois (Android) ;
    - vue retrouvée au retour d'une fiche ; rotation de l'écran ; tablette ;
    - épaisseur et pointillés des traits en zoom et dézoom (Safari : `calc()` dans `stroke-dasharray`, sinon `vector-effect: non-scaling-stroke`) ;
    - loupe, état vide sans « Moi », personnes sans lien absentes.
  - FEAT-09 : passage en v3 sans perte, « Un ami », section « Amis » et croix de retrait, pastilles sans possessif, « Lien avec toi », « Famille proche », rang d'enfants qui défile.
  - S4 : clair et sombre, glissement entre écrans (iOS 18), feuille, confirmation, bandeau, ligne éclairée au retour, « réduire les animations », nouvelle icône.
  - S3b : import v1 à deux unions, séparation et « Rétablir le couple », décès, « Prochains anniversaires ».
  - S3a, S2b, S2a : Réglages → Moi, sections « Par alliance », index de la liste, clavier iOS, homonyme, Retour d'écran en écran, thème sombre sans éclair.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- À valider par Paul : l'icône d'arbre sur l'accueil (hors maquette), bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) », dates capitalisées, âge « environ 35 ans », retrait d'un ami par la croix.
- Ensuite : PLAN.md « Plus tard » (import en fusion, partage, photos, GEDCOM).

## Repères
- src/modele/arbreGlobal.ts : `disposerArbre(d, moi)` → places (x en places, y en générations, Moi en 0,0), couples, branches, amitiés ; `isotone`. Tests : arbreGlobal.test.ts (invariants).
- src/ui/arbreGlobal.ts : `ecranArbre()`, classe `Carte` (calque transformé, `--s`, gestes, recherche, `vueGardee`). CSS : bloc « Arbre global » avant « États communs ».
- src/style.css : jetons en tête ; blocs « Dessins de la fiche », « Arbre global », « États communs », « Animations » en fin de fichier.
- src/ui/arbre.ts : `noeud` (exporté), `dessinFoyer`, `dessinChemin` (ResizeObserver sur `.sonde`, rien à largeur nulle).
- src/modele/deductions.ts : `relation`, `conjoint()`, `exConjoints()`, `familleElargie`, `amis`, `chemin`, `foyer`. src/modele/parente.ts : `etiquette`, `motsChemin`.
- src/modele/migration.ts : `migrer()` v1 → v2 → v3. src/main.ts : routes et View Transition.
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route, reglages?)`), émulation du navigateur en tête, à garder.
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors d'un `try`, utiliser `lireNom()`.
- Captures : Edge headless lancé par PowerShell `Start-Process -Wait` (fenêtre de 500 px minimum), serveur de dev, page d'essai temporaire dans `public/` qui remplit le localStorage ; la supprimer après.

## Points ouverts
- Ajout d'un conjoint : un ex n'est pas grisé, l'erreur « déjà une union » n'apparaît qu'à l'enregistrement.
- La garde de saisie ne couvre ni le geste ni le bouton Retour du téléphone.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » ne s'affiche qu'à l'enregistrement.
- Beaux-frères, belles-sœurs et conjoints des parents : libellé mais pas de section.
- Surbrillance : `signaler` reste en attente si l'écran de retour n'est pas une fiche.
- Lien de cousinage sans nom usuel (Lou, petite-cousine) : pas de pastille.
- Arbre global : très grande famille non essayée (lenteur du pincement possible) ; l'astuce de geste n'apparaît qu'une fois par session.
- TEST-03 non reproduit : au prochain `npm test` en échec, copier toute la sortie.
