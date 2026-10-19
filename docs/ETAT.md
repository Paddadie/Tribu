# État en cours

**Commité** : arbre global `#/arbre` (ef1b898), FEAT-09 (ab0063b), naissance sans année `--MM-JJ` (f1e3e80).

**Codé, non commité** (355 tests verts, `tsc` propre, SPEC, DECISIONS et PLAN à jour) :
- Interrupteur « Décédé » (`decede: true`, `estDecede(p)` dans modele.ts).
- Frère ou sœur sans parent connu (parent inconnu caché `inconnu: true`, masqué via `personnesVisibles` / `estInconnu`).
- Choix multiple (ami, enfant, fratrie) et coche unique par ligne choisie.
- Prénoms longs dans les arbres : nom sur 2 lignes, `LIGNE_EN_PLUS` (arbre.ts) réservé sous chaque nom.
- **Groupes d'amis (données v4)** : `Donnees.groupes` remplace les amitiés par paire ; migration v3 → v4 par composantes connexes. Saisie par groupe (`ajoutAmi.ts` : rejoindre ou former, « Moi » ajouté d'office hors famille), section « Amis » de la fiche par groupe, Réglages → Groupes d'amis (`groupes.ts`, routes `#/groupes`, `#/groupe/<id>`, `#/groupe/nouveau`, `#/groupe/<id>/ajouter`). Arbre global : un cadre par groupe dans « Tes amis », anneau sur les membres, « Famille X » au-dessus de chaque lignée. Vérifié sur captures Edge headless (arbre, fiche, ajout, groupe), pas sur téléphone.

- **Familles recomposées** : option « Un ex » (ex ajoutable même en couple, `#/ex/<id>`), case « ont été en couple » à l'ajout d'un second parent, trait pointillé entre parents séparés sur la fiche. Tests dans recomposee.test.ts (arbre global : ex – personne – actuel, une branche par couple). Écrans non testés sous happy-dom ni sur téléphone.

- **Famille d'un membre de groupe** : les écrans de groupe grisent toute personne dont la famille contient un membre d'un autre groupe (`groupesDeLaFamille` dans modele.ts, `raisonGroupe` dans groupes.ts ; tests groupeFamille.test.ts, 342 verts). Non vérifié sur téléphone.
- **Suggestions par nom de famille** : à l'ajout d'un parent, enfant, frère ou sœur, les personnes de même nom viennent après les suggestions par lien (`suggestions` dans saisie.ts, filtre d'âge, ascendants et descendants exclus ; 345 tests verts). Écran non vérifié sur téléphone.
- **Fratrie détaillée dans « Famille proche »** (arbre.ts `dessinFoyer`, pile supprimée) : chaque frère et sœur nommé, par âge autour de la personne ; 345 tests verts, `tsc` propre. Dessin non vérifié (ni capture ni téléphone) : surtout la fratrie qui défile et la fratrie sans parent dessiné.
- **Lien avec un proche d'ami** : pastille « Sœur / Neveu de Joseph » et phrase « Toi → ton ami → son neveu » (`lienDepuisAmi`, `motsChemin(etapes, d)` dans parente.ts) ; dessin compacté en frère/sœur après le dernier ami (`parcours`, deductions.ts). Famille inchangée. 346 tests verts, `tsc` propre. Rendu non revu après le dernier correctif.
- **Arbre global, familles lisibles** (355 tests verts, `tsc` propre, rendu NON revu à l'écran, essayé seulement sur l'export de Paul C:/Users/pauld/Downloads/tribu-2026-10-19.json) : couleur par nom de famille, nom actuel avant nom de naissance (`cleNom`, `couleursParNom`, 12 pastels `--c0..--c11`, côté amis aussi, anneau de groupe `--cg`), fonds de lignée supprimés, décédé = pâle + « † » (CSS `.calque .avatar.decede`), bus étagés (`etagerBus`), `coparents` (parents sans union côte à côte), `resserrer` (vides entre familles d'amis), `ecartPaire` (chaîne d'ex élargie pour centrer les enfants ; orientation des chaînes selon parents et enfants).
- **Retour attendu de Paul** : Michel Budin (beau-père sans union) revient à droite au-dessus des cousins (x≈8, Catherine x≈1,2) à cause du centrage : à lui montrer, option de le rapprocher au prix d'enfants moins centrés ; croix « † » à valider (autres pistes : cercle noir) ; distinction des membres de groupe dans la famille de Moi (traits seulement, sans anneau ni cadre) restée en attente.

- **Arbre global, retours de Paul** (357 tests verts, `tsc` propre, rendu NON revu à l'écran) : couples reliés par un trait droit de 2 px (plus de courbe), pointillé court = en couple, plein = marié ; couleur = lignée du membre le plus proche de Moi (`lignee` dans `couples`), gris plein `--trait-ex` pour les séparés, parents sans union compris (barre « / » abandonnée). Centrage : abscisses selon parents et enfants (poids ×12 par enfant, puis enfant unique recentré exactement (glisser, voisins poussés)) ; enfants de Catherine et Michel B encore ~0,4 case décalés. À revoir sur téléphone : épaisseur au dézoom (cause non trouvée si l'écart persiste), lisibilité du gris des séparés.

- **Arbre global, navigation** (357 tests verts, `tsc` propre, rendu NON vu à l'écran) : boutons « Familles » (une entrée par lignée, nom de l'étiquette, effectif) et « Amis » (un cadre par groupe) à côté de « Toi » et « Tout » ; feuille de liste au-dessus des commandes, un toucher centre et cadre la zone (`surZone`, `calculerFamilles`, `basculerFeuille` dans ui/arbreGlobal.ts ; CSS `.feuille-arbre`). Idées proposées, non codées : « Retour » à la vue précédente, mini-carte. À vérifier sur téléphone : quatre puces + zoom sur petit écran.

- **Parent « ? »** (363 tests verts, `tsc` propre, rendu NON vu à l'écran) : un enfant à parent seul reçoit dans l'arbre global un parent « ? » gris (`avecParentsSansNom`, `enregistrerParentSansNom` dans modele/parentSansNom.ts ; CSS `.avatar.sans-nom`). Le toucher l'enregistre (« Parent inconnu ») et ouvre sa fiche : note, décès, union, renommage (route `#/personne/virtuel:<id>` dans main.ts). À voir sur téléphone : placement du « ? » à côté d'un parent déjà en couple ; fiche du « Parent inconnu ». Les dessins de la fiche ne montrent pas le « ? » tant qu'il n'est pas enregistré.
  - Fiche du « ? » : l'autre parent apparaît en « Famille proche » (trait pointillé, `autreParent`, `Foyer.conjoint.separe`), case « Marié(e) avec X » dans Modifier (`definirMariageParents`, union séparée), « Lien avec toi » affiché. Arbre global : poids du lien parents→enfant ×12 par enfant (au lieu de ×3) pour mieux centrer l'enfant unique ; décentrage de Paul non reproduit tel quel (366 tests verts).

- **Assistance à la saisie des noms** (370 tests verts, `tsc` propre, NON vu sur téléphone) : champs Nom et Nom de jeune fille proposent les noms déjà saisis (`nomsConnus` dans liste.ts, `<datalist id="noms-connus">` dans champsPersonne.ts), plus répandus d'abord. Liste native : rendu à vérifier sur iPhone et Android ; si insuffisant, faire une liste maison. TEST-03 aperçu une fois (19 fichiers « no tests », timeouts de workers) puis disparu au relancement.

## Avant la suite
- Paul : déployer, puis tester sur iPhone et Android.
  - Familles recomposées : fiche de Catherine → « Ajouter un proche » → « Un ex » ; arbre global (ex à gauche en pointillés, enfants sous chaque couple) ; ajout de Michel B comme parent de Thomas avec la case cochée ; fiche de Thomas (parents en pointillés) ; très grande fratrie sous un ex.
  - **Groupes d'amis** : ouvrir l'app avec des données v3 (amis existants devenus groupes sans nom, amis d'amis fusionnés : à défaire dans Réglages) ; ajout d'ami depuis une fiche sans groupe, avec groupe (« Rejoindre »), choix multiple (un seul groupe) ; « Moi » ajouté d'office depuis une fiche hors famille ; croix « Quitter le groupe » et bandeau « Annuler » ; Réglages → Groupes d'amis (renommer, retirer, ajouter un membre, supprimer, nouveau groupe) ; arbre : cadres lisibles, titres tronqués sur petit cadre, noms de famille, rien de masqué, cadres voisins non collés ; export puis réimport.
  - Frère sans parent connu : option « Parents inconnus », création, fratrie, trait de fratrie dans l'arbre global, « Lien avec toi » (« ton frère »), ajout d'un vrai parent, compteur de l'accueil, export puis réimport.
  - Interrupteur « Décédé » : éteint à la création, accord au changement de sexe, date et clavier sur l'année, enregistrement sans date (« Décédée », grisée, « 1941 – ? »), éteindre efface la date.
  - Naissance sans année : saisie jour + mois, « Née le 24 octobre » sans âge, « Prochains anniversaires » sans pastille d'âge.
  - Arbre global : glisser, pincer, molette, + et −, « Toi », « Tout » ; pas de zoom de la page sur iOS ; toucher une personne ouvre sa fiche (pas après un glissement) ; vue retrouvée au retour ; rotation ; épaisseur des traits en zoom (Safari : `calc()` dans `stroke-dasharray`, sinon `vector-effect: non-scaling-stroke`) ; loupe, état vide sans « Moi ».
  - FEAT-09 : v3 sans perte, « Un ami », pastilles sans possessif, « Lien avec toi », « Famille proche ».
  - Arbre global lisible : pastels clair et sombre (texte des pastilles sombre), croix des décédés visible, enfants centrés, Paul entre ses parents, Dauguet près de David, beau-père près de ses enfants, rien ne se chevauche, pincement fluide.
  - S4 : clair et sombre (dont cadres de groupes et anneaux en sombre), glissement entre écrans (iOS 18), feuille, confirmation, bandeau, « réduire les animations », icône.
  - S3b, S3a, S2b, S2a : import v1 à deux unions, séparation, décès, anniversaires, Réglages → Moi, « Par alliance », clavier iOS, homonyme.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
- Prénoms longs : « Jean Baptiste » sur 2 lignes sans « … » (Safari iOS : `-webkit-line-clamp`) ; deux voisins aux noms très larges peuvent se toucher (rare).
- À valider par Paul : choix multiple en une seule modification, icône d'arbre sur l'accueil, bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) », dates capitalisées, âge « environ 35 ans », « Moi » ajouté d'office aux groupes, arbres de la bulle plus hauts (`ECART_BULLE` 1,7).
- Ensuite : PLAN.md « Plus tard » (plusieurs groupes par personne, import en fusion, partage, photos, GEDCOM).

## Repères
- src/modele/arbreGlobal.ts : `disposerArbre(d, moi)` → places, couples, branches, amitiés hors cadres, `groupes` (cadres : membres, `ids` à encadrer, `amis`), `etiquettes` (noms de famille) ; `isotone`. Tests : arbreGlobal.test.ts (invariants, cadres disjoints).
- src/ui/arbreGlobal.ts : `ecranArbre()`, classe `Carte` (calque transformé, `--s`, gestes, recherche, `vueGardee`) ; `calculerCadres`, `zoneBulle`, `legendes` (titres de cadres et noms de famille en HTML sur le calque). CSS : bloc « Arbre global » avant « États communs ».
- src/modele/modele.ts : `creerGroupe`, `ajouterAuGroupe`, `retirerDuGroupe`, `renommerGroupe`, `supprimerGroupe`, `groupesDe`, `sontAmis`. deductions.ts : `amis`, `nomGroupe`, `relation`, `chemin`, `foyer`. parente.ts : `etiquette`, `motsChemin`.
- src/ui/ajoutAmi.ts, groupes.ts (`ecranGroupes`, `ecranNouveauGroupe`, `ecranGroupe`, `ecranAjoutMembre`), fiche.ts (`sectionAmis`).
- src/style.css : jetons en tête ; blocs « Dessins de la fiche », « Arbre global », « États communs », « Animations » en fin de fichier.
- src/ui/arbre.ts : `noeud` (exporté), `dessinFoyer`, `dessinChemin`.
- src/modele/migration.ts : `migrer()` v1 → v2 → v3 → v4. src/main.ts : routes et View Transition.
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route, reglages?)`) ; `saisir` n'envoie que `input` : envoyer `change` à la main pour un champ à `onchange`.
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors d'un `try`, utiliser `lireNom()`.
- Captures : Edge headless lancé par PowerShell `Start-Process -Wait` (fenêtre de 500 px minimum), serveur de dev, page d'essai temporaire dans `public/` qui remplit le localStorage (clés `tribu:donnees`, `tribu:reglages`) ; la supprimer après.

## Points ouverts
- Une personne dans un seul groupe : règle des écrans seulement ; un import avec une personne dans deux groupes s'affiche (deux cadres) sans erreur.
- Groupes contenant des familles très larges : cadres larges, titre tronqué ; très grande famille non essayée (lenteur du pincement possible).
- Ajout d'un conjoint : un ex n'est pas grisé, l'erreur « déjà une union » n'apparaît qu'à l'enregistrement.
- La garde de saisie ne couvre ni le geste ni le bouton Retour du téléphone.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » ne s'affiche qu'à l'enregistrement.
- Beaux-frères, belles-sœurs et conjoints des parents : libellé mais pas de section.
- Surbrillance : `signaler` reste en attente si l'écran de retour n'est pas une fiche.
- Lien de cousinage sans nom usuel (Lou, petite-cousine) : pas de pastille.
- L'astuce de geste de l'arbre n'apparaît qu'une fois par session.
- TEST-03 non reproduit : au prochain `npm test` en échec, copier toute la sortie.
