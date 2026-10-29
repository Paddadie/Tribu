# Tribu — Plan de développement

## V1

- [x] **1. Squelette PWA** — Projet initialisé, déployé sur GitHub Pages, mise à jour auto à l'ouverture.
  Terminé quand : l'appli est installée sur le téléphone et une nouvelle version déployée apparaît à la réouverture.

- [x] **2. Modèle et stockage** — Personnes, unions, filiations dans localStorage ; déductions (enfants d'un couple, frères et sœurs, demi).
  Terminé quand : les tests Vitest couvrent création, persistance et déductions, et passent.

- [x] **3. Maquettes** — Écrans liste et fiche, publiés pour validation.
  Terminé quand : Paul a validé les maquettes.

- [x] **4. Liste et fiche personne** — Créer, modifier, supprimer (avec confirmation) ; filtre de la liste par nom.
  Terminé quand : sur le téléphone, une personne créée persiste après fermeture de l'appli.

- [x] **5. Couples** — Ajouter un conjoint (existant ou nouveau), indicateur marié, un seul conjoint à la fois (séparation = union effacée).
  Terminé quand : la fiche affiche ses conjoints et un toucher ouvre la fiche du conjoint.

- [x] **6. Parents et enfants** — Ajouter parent ou enfant, lien biologique ou adoptif.
  Terminé quand : une famille recomposée de test s'affiche correctement dans les deux sens.

- [x] **7. Frères et sœurs** — Section déduite sur la fiche : frères et sœurs, demi-frères et demi-sœurs.
  Terminé quand : le cas de test de l'étape 6 affiche correctement frères et sœurs et demis.

- [x] **8. Sauvegarde** — Export et import JSON, confirmation avant écrasement.
  Terminé quand : un export réimporté sur une appli vide restitue toute la famille.

## V2

Issue de l'audit du 19/10/2026 (rapport et réponses : https://claude.ai/artifact/QWtk4ZfLDfefgCLjRteU9r, décisions 52 et suivantes).
Une session par bloc, `/clear` entre deux. Ne lire que la section de la session en cours ; les lignes suffisent, sans rouvrir l'audit.
Tout changement visible : maquette publiée et validée par Paul avant de coder.
Fin de session : cocher ici, réécrire ETAT.md, ajouter les décisions, mettre à jour SPEC.md pour ce qui a changé, proposer un message de commit.
Une session trop longue se coupe en deux : noter dans ETAT.md où l'on s'arrête.

- [x] **S1. Robustesse** — Maquette d'abord : écran « Données illisibles », Réglages (date du dernier export, export par partage), accueil vide.
  - [x] DATA-01 : `charger()` (stockage.ts) ne renvoie plus des données vides en silence. Contenu invalide → brut copié sous une clé de secours (`tribu:secours`), écran « Données illisibles » (exporter le brut, repartir à vide sur confirmation), jamais d'écriture automatique par-dessus.
  - [x] TEST-02 : test « chargement invalide puis modification » : l'original reste récupérable.
  - [x] DATA-02 : copie de l'état avant import ou effacement ; bandeau « Annuler » quelques secondes après. Composant de bandeau réutilisé en S2b (UX-07).
  - [x] DATA-03 : `navigator.storage.persist()` au lancement, silencieux.
  - [x] DATA-04 : date du dernier export mémorisée dans les réglages et affichée dans Réglages. Pas de bandeau sur l'accueil.
  - [x] DATA-05 : export par `navigator.share` avec fichier (iPhone et Android), repli sur le téléchargement ; message exact, jamais « enregistré » sans preuve.
  - [x] UX-10 : « Effacer les données » désactivé quand il n'y a personne.
  - [x] UX-08 : accueil vide : « Ajouter la première personne » et « Restaurer une sauvegarde ».
  - [x] CODE-03 : erreurs toujours dans le bloc d'erreur de l'écran (plus d'`alert()` dans fiche.ts) ; message français si le stockage est plein.
  - [x] CODE-04 : textes : « Vos 1 personne actuelles » (import), accords Marié/Mariée et Adoptif/Adoptive selon la personne affichée ; une fiche ancienne sans sexe n'a pas « Homme » présélectionné en modification.
  - [x] UX-11 : retirer l'étiquette « Biologique » de fiche.ts (conforme à la décision 23).
  - [x] SEC-02 : CSP en balise meta, en vérifiant service worker, police et build.
  - [x] TEST-03 : enquête limitée à 30 min sur le premier `npm test` de session qui échoue (4 fichiers « failed », aucun test exécuté). Non reproduit en S1 (lancement à froid et `npm test` verts) ; consigne dans ETAT.md.
  - [x] DOC-01 : README court : présentation, commandes, déploiement, format JSON des sauvegardes.
  - [x] DOC-02 : SPEC et DECISIONS alignées sur le code (étiquette Biologique, effacement « grisé », enfants du couple affichés en S2b).
  Terminé quand : des données stockées invalides ne sont jamais écrasées sans action de Paul, et un export partagé depuis le téléphone se réimporte.

- [x] **S2a. Socle** — Aucun changement visible, pas de maquette.
  - [x] TEST-01 : happy-dom ; 5 à 8 tests d'écran sur les parcours qui touchent aux données (création, ajout de lien, import avec confirmation, suppression, route vers une personne supprimée). En premier : ils protègent le reste.
  - [x] ARCH-02 : sélecteur de personne commun à ajoutConjoint.ts et ajoutLien.ts (recherche, onglets existante / nouvelle, lignes, bouton, erreurs).
  - [x] ARCH-03 : une seule fonction pour la ligne avatar + nom + détail (5 copies : accueil, fiche ×2, ajouts ×2).
  - [x] ARCH-04 : « déjà en couple » et « a des liens » calculés par le modèle, testés, plus dans les écrans.
  - [x] CODE-01 : supprimer `comparerParNom`, `enfants`, `parents` et leurs tests ; garder `enfantsDuCouple` (FEAT-08).
  - [x] CODE-02 : regex de date unique, comparateur « prénom nom » unique, `MAX_PARENTS_PAR_TYPE` dans stockage.ts, palette sombre écrite une seule fois dans style.css, test redondant de `ajouterUnion`.
  - [x] UX-01 : Retour = écran précédent de l'appli (`history.back()`), la liste à défaut ; plus d'entrée d'historique ajoutée par Retour.
  - [x] UX-02 : position de défilement de la liste restaurée au retour (supprimer le `scrollTo(0,0)` systématique de main.ts).
  Terminé quand : tests verts ; liste → A → B → Retour revient sur A, puis sur la liste à la même position.

- [x] **S2b. Parcours** — Maquette d'abord : fiche, feuille « Ajouter un proche », écrans d'ajout, liste avec index.
  - [x] UX-03 : fiche : identité → note → proches → « Ajouter un proche » en style secondaire → suppression.
  - [x] UX-04 : ajout d'un enfant depuis une personne en couple : case « Ajouter aussi <conjoint> comme parent », cochée d'office.
  - [x] UX-05 : nom prérempli, toujours modifiable. Enfant : nom du père, bouton pour prendre celui de la mère si les deux sont connus, sinon nom de la fiche ouverte. Parent, frère ou sœur : nom de la fiche ouverte.
  - [x] FEAT-03 (option A) : « Un frère ou une sœur » dans la feuille. La personne devient enfant des parents connus (tous cochés ; en décocher un donne un demi). Sans parent connu : parent inconnu caché créé en coulisse (voir DECISIONS). Aucun lien de fratrie stocké (décision 9).
  - [x] UX-06 : listes de choix : suggestions en tête (ex. le conjoint d'un parent déjà saisi), personnes grisées en fin de liste.
  - [x] UX-07 : bandeau bref « … · Annuler » après retrait d'un lien, fin d'union, modification (composant de S1). La suppression d'une personne garde sa confirmation.
  - [x] UX-09 : focus sur le prénom à la création ; confirmation avant d'abandonner un formulaire modifié.
  - [x] FEAT-08 : « N enfants ensemble » sous le conjoint (`enfantsDuCouple`).
  - [x] UX-12 : index alphabétique latéral sur la liste (100 à 200 fiches visées).
  - [x] UX-13 : écrans d'ajout ouverts sur l'onglet « Nouvelle personne » (demande de Paul à la maquette).
  - [x] UX-14 : homonymes : créer une fiche de même prénom et même nom qu'une fiche existante demande confirmation (demande de Paul à la maquette).
  Terminé quand : l'enfant d'un couple s'ajoute aux deux parents en une saisie, nom prérempli ; un frère s'ajoute depuis la fiche.

- [x] **S3a. Parenté** — Modèle et tests d'abord (deductions.ts), puis maquette de la fiche.
  - [x] En début de session : décider où mémoriser « Moi » (réglages, hors export, ou données exportées) et que faire si la fiche disparaît après un import.
  - [x] FEAT-01 : réglage « Moi » (choisir sa fiche) ; chaque fiche affiche son lien avec moi (« ta cousine », « ton oncle par alliance »), accordé selon le sexe.
  - [x] FEAT-02 : sections déduites sur la fiche : grands-parents et petits-enfants, oncles et tantes, neveux et nièces, cousins et cousines, belle-famille (beaux-parents, enfants du conjoint). Sections vides masquées.
  Terminé quand : sur une famille de test à 4 générations, chaque lien affiché est juste (testé).

- [x] **S3b. Mémo** — Maquette d'abord : accueil avec anniversaires, fiche avec décès et âge.
  - [x] FEAT-06 : garder les anciennes unions. Une séparation ne supprime plus l'union : elle passe au statut « séparés » ; la fiche affiche « Ex-conjoint » sous le conjoint actuel ; toujours un seul conjoint actuel. Remplace la décision 35, dans la même migration que FEAT-04 (les unions v1 deviennent des unions actuelles).
  - [x] FEAT-04 : date de décès facultative, partielle comme la naissance ; âge (« 34 ans ») ou « mort à 82 ans » sur la fiche.
  - [x] DATA-07 : premier changement de format : `migrer()` v1 → v2 appelée avant la validation, testée ; les anciens exports restent importables.
  - [x] FEAT-05 : prochains anniversaires en haut de l'accueil : les 3 prochains dans les 30 jours, avec l'âge atteint ; pas pour les personnes décédées.
  Terminé quand : un export v1 s'importe dans la v2 sans perte, une séparation laisse l'ex-conjoint visible sur la fiche, et l'accueil montre les anniversaires à venir.

- [x] **S4. Identité visuelle** — Maquette complète d'abord (direction A).
  - [x] UI-01 : direction « sobre affiné » : vert calmé, Figtree seule (UI-08).
  - [x] UI-02 : une teinte d'avatar par nom de famille.
  - [x] UI-03 : échelle de 5 tailles de texte, espacements différenciés, nom de la fiche plus affirmé.
  - [x] UI-04 : accent réservé à ce qui se touche ; titres de section en gris chaud, capitales en CSS.
  - [x] UI-05 : un seul bouton plein par écran.
  - [x] UI-06 : état appuyé et anneau de focus identiques partout.
  - [x] UI-07 : icône définitive (3 propositions, Paul choisit) ; favicon à la teinte de `theme_color`.
  - [x] ANIM-01 : glissement latéral entre écrans (View Transitions, moins de 250 ms), sens inverse au retour.
  - [x] ANIM-02 : montée de la feuille, voile en fondu, léger zoom des confirmations.
  - [x] ANIM-03 : surbrillance brève de la ligne ajoutée ou modifiée au retour sur la fiche.
  - [x] ANIM-04 : retours tactiles : appui, coche de sélection.
  Terminé quand : toutes les animations sont coupées si le téléphone demande moins de mouvement, et Paul valide le rendu sur son téléphone.

## V3 — Plan de l'audit du 20/10

Rapport et questionnaire : claude.ai/artifact/Ko1ksvKRPeAicxBg3nzp3h. **Une étape = une session.** Entre deux étapes : `/bilan` puis `/clear`. Une session lit ETAT.md, puis seulement la sous-section de son étape ci-dessous (et « Décisions » si elle en a besoin).
Règles valables partout : maquette validée par Paul avant tout changement visible ; `npm test`, `tsc` et `npm run build` verts en fin d'étape ; captures avant/après (`scripts/captures.mjs`, à partir de 1a) ; aucun nom réel de proche dans le dépôt ; Paul commite.

### Décisions (à inscrire dans DECISIONS.md en 1a)
- ROAD-03 : pas de gel. Lots « non vus » d'ETAT et liste « À valider par Paul » considérés validés (« si je n'y suis pas revenu, c'est bon »). ROAD-04 : ordre 1a → 1b → 2 → 3 → plus tard.
- VIS-02 : A, mémo perso, léger, sur un seul téléphone (remplace la décision 53 « partage probable »).
- SEC-03 : C, docs/ hors du dépôt public, test anonymisé, historique réécrit par `git filter-repo` (lancé par Paul).
- ARCH-05 oui (test sur export anonymisé, puis découpage). ARCH-06 : B, bandeau « Nouvelle version » à toucher (remplace la décision 13). ARCH-07 oui.
- CODE-06 : B, deux usages gardés, champ explicite au lieu du prénom (v5). CODE-07 oui. CODE-08 : B, case « Prend le nom de X » cochée par défaut.
- TEST-04, TEST-06, PERF-01 : oui.
- UX-15 : A, tutoiement partout (remplace la décision 84). UX-16 : A, vue d'ensemble en pastilles sans texte, cadrée en entier. UX-17 oui. UX-18 : A, demi-fratrie dessinée, reliée au parent commun. UX-19 (choix de Claude) : « Retour » oui, mini-carte non. UX-20 : A, centrage des enfants d'abord (le beau-père reste où il est). UX-21 : A, anneau de groupe. UX-22 oui.
- UI-09 : A, 12 pastels hachés par nom, partout. UI-10 oui. UI-11 (choix de Claude) : A « Herbier », étiquettes de famille façon « Atlas ». UI-12 : A, bouton en contour. UI-13 oui. UI-14 : A, « † » gardé. UI-15 oui.
- ANIM-05, 06, 07 oui ; ANIM-08 non. A11Y-02 oui (trois vérifications, pas un lot).
- FEATURE-11 : widget impossible en PWA (iOS : app native WidgetKit ; Android : Chrome ne gère pas les widgets de PWA) → export `.ics` dans Réglages (naissances, décès, mariages) + encart « Aujourd'hui / Demain » sur l'accueil (proposé en maquette). FEATURE-12 non. FEATURE-13 oui. FEATURE-14 : export PNG depuis Réglages. FEATURE-15 : date d'union, oui (v5). FEATURE-16 : A, fusion d'abord. FEATURE-17 : plus tard.
- DEBT-02 oui. DEBT-03 : A, `.gitattributes` + Prettier en vérification. DOC-03, 04, 05 oui. DOC-06 : context.md très court, renvois vers les fichiers.
- Tensions tranchées par Claude :
  - T1 : docs/ sort du dépôt public mais garde une sauvegarde : il devient un dépôt git **privé** séparé (`docs/.git`, ignoré par Tribu ; les dépôts privés sont gratuits, seul Pages exige Pro).
  - T2 : dans Tribu, `/bilan` réécrit docs/ETAT.md ; le CLAUDE.md du projet n'a plus de section « État en cours ».
  - T3 : docs/context.md ≤ 25 lignes stables (but, pile, commandes, carte du code, renvois) ; ETAT.md ≤ 30 lignes ; CLAUDE.md = règles + `@docs/context.md` + `@docs/ETAT.md`.
  - T4 : la fusion à l'import reste utile sans partage (changer de téléphone) ; elle reste « Plus tard ».

### Étape 1a — Documentation et hygiène (1 session, rien de visible) — faite le 20/10 ; SEC-03 réduit à l'anonymisation des tests (sortie de docs/ et réécriture de l'historique abandonnées par Paul)
- [x] DECISIONS.md : inscrire les décisions ci-dessus ; marquer remplacées 13 (→ ARCH-06), 17 (format v1), 53 (→ VIS-02), 84 (→ UX-15).
- [x] ROAD-03 : cocher S1 et S4 ; retirer les « reste le test sur téléphone » de « Plus tard ».
- [x] T2/T3/DOC-04/DOC-06 : créer docs/context.md (reprendre « Repères » d'ETAT, ajouter la commande de captures) ; réécrire ETAT.md en ≤ 30 lignes (prochaine étape : 1b-1) ; CLAUDE.md du projet : supprimer « État en cours », importer `@docs/context.md`, noter « /bilan réécrit docs/ETAT.md ».
- [x] DOC-03 : README au format v4 (unions et ex, groupes, décès, parents inconnus, consigne d'export, effacement possible par Safari si l'appli n'est pas installée), sans nom réel.
- [x] DOC-05 : SPEC, ordre réel de la fiche (« Ajouter un proche » en tête) et « Parent sans nom » avant « Hors V1 ».
- [x] DEBT-03 : `.gitattributes` (`* text=auto eol=lf`) ; Prettier en devDependency, config proche du style actuel, script `format:check` ; pas de reformatage global ni de CI pour l'instant (fichiers reformatés au fil des étapes).
- [x] TEST-04 : retirer `--passWithNoTests` du script de test.
- [x] TEST-06 : `scripts/captures.mjs`, repris de `C:\Users\pauld\AppData\Local\Temp\claude\c--devs-Tribu\7bec06e5-f584-4738-8aca-a032ae2064d7\scratchpad\capture.mjs` (s'il a disparu : CDP sur Edge headless `--remote-debugging-port`, serveur de dev sur 5199, écriture de `tribu:donnees` et `tribu:reglages` puis `Page.navigate` + `Page.reload`, 390×844 DPR 2, clair et sombre ; écrans : accueil, fiche de Moi, feuille d'ajout, arbre Toi / Tout / Familles, réglages). Export et dossier de sortie passés en argument, hors dépôt ; sortie ignorée par git. Plus de page temporaire dans `public/`.
- [x] SEC-03 : anonymiser arbreGlobal.test.ts (noms réels → noms d'emprunt) ; `docs/` dans `.gitignore`. Écrire pour Paul, **hors dépôt** (scratchpad), le fichier de remplacements pour `--replace-text` et la suite de commandes. Paul les lance dans l'ordre : 1) copie de sécurité du dossier Tribu ; 2) `git init` dans docs/, dépôt GitHub privé, premier push ; 3) `git rm -r --cached docs` et commit dans Tribu ; 4) `git filter-repo --path docs --invert-paths --replace-text <fichier>` ; 5) remettre le remote `origin` puis `git push --force` ; 6) au besoin, demander au support GitHub de purger les anciens commits encore visibles par leur SHA.

### Étape 1b — Finitions visibles (2 sessions, maquette d'abord dans chacune)
**1b-1 Fiche, accueil, textes**
- [x] UI-09 + UI-13 : une seule fonction de couleur (12 pastels `--c0..--c11` hachés sur le nom actuel, nom de naissance à défaut ; `cleNom` passe par `simplifier`) pour la liste, la fiche, les dessins et l'arbre ; supprimer `teinteFamille` et la numérotation par ordre de lecture ; avatars de liste plus saturés ; vérifier le sombre.
- [x] UI-12 : « Ajouter un proche » en bouton à contour, même place. UI-15 : cœur barré pour « Un ex ».
- [x] UX-18 : demi-frères et sœurs dans le dessin « Famille proche », à côté de la personne, reliés au parent commun.
- [x] Encart « Aujourd'hui / Demain » : remplacé (maquette) par les anniversaires de décès d'aujourd'hui et de demain dans « Prochains anniversaires », hors limite de 3.
- [x] ARCH-06 : `registerType: 'prompt'` et bandeau « Nouvelle version » (réutiliser le bandeau existant).
- [x] UX-15 : tutoiement dans tous les textes (écrans, erreurs, Réglages).
- [x] UX-22 : garde de saisie aussi sur `popstate` (geste iOS, bouton Retour Android).
- [x] ANIM-06 : nouveau proche en fondu + légère échelle dans « Famille proche » (s'appuyer sur `signaler`).
- [x] A11Y-02 : nom accessible des boutons + et − ; contraste du gris secondaire en sombre (≥ 4,5:1) ; recherche de l'arbre comme accès aux personnes.

**1b-2 Arbre global**
- [x] UX-16 : « Tout » = vue d'ensemble cadrée en entier ; sous un seuil d'échelle, pastilles de couleur sans texte (`ECHELLE_MIN` abaissé pour cette vue).
- [x] UX-17 : astuce en bas au-dessus des puces ; barre de commandes à fond translucide ; « Toi » plein seulement quand c'est la vue active ; feuille Familles triée par nom, ≤ 50 % de la hauteur ; Réglages : « l'export contient tes notes en clair ».
- [x] UX-19 : bouton « Retour » à la vue précédente (pile de vues) ; pas de mini-carte.
- [x] UX-21 : petit anneau de groupe sur les membres de ta famille qui sont dans un groupe d'amis.
- [x] ANIM-05 : pulsation de la cible après un saut ; ANIM-07 : la feuille glisse depuis les puces et se ferme pendant le déplacement.
- [x] UI-11 : étiquettes de famille façon « nom de région » (petites capitales espacées, discrètes).
- [x] Fermer dans ETAT : UI-14 (« † » gardé), UX-20 (centrage d'abord).

### Étape 2 — Fondations (3 sessions, rien de visible sauf CODE-08)
**2-1 Arbre global**
- [x] ARCH-05 a : export anonymisé versionné (fixture : prénoms et noms remplacés, notes vidées) ; test d'invariants (aucun chevauchement, enfant unique centré à ε près, couples adjacents) et instantané des abscisses arrondies.
- [x] ARCH-05 b : découper `disposerArbre` et `disposerPartie` en étapes nommées et testées, constantes nommées (poids ×12…) ; l'instantané ne doit pas bouger.

**2-2 Nettoyages**
- [x] ARCH-07 : enregistrer le « ? » au toucher dans ui/arbreGlobal, puis ouvrir la vraie fiche ; la route n'écrit plus rien.
- [x] CODE-07 : déconnecter le `ResizeObserver` de `Carte` ; `nouvelId` dans parentSansNom ; `raisonGroupe` → modele ; `messageImport` → ui/import.ts ; boucle de filiation refusée par `estDonneesValides`.
- [x] PERF-01 : test de temps sur 300 fiches générées (`familleElargie`, `disposerArbre`), seuil large.
- [x] DEBT-02 : style.css découpé en src/styles/ (base, accueil, fiche, arbre, etats, animations), octet pour octet identique.
- [ ] UI-10 : jetons : 3 rayons, espacements de 4 en 4, 2 ombres, 2 graisses ; captures avant/après identiques à l'œil.

**2-3 Données v5**
- [x] CODE-06 : champ explicite pour le parent sans nom (fin de la reconnaissance par le prénom `PARENT_INCONNU`) ; `inconnu: true` garde son usage.
- [x] FEATURE-15 : date d'union facultative (avec ou sans année), sur la fiche et dans Modifier. Codé le 20/10 sans maquette (à la demande de Paul) : champ à l'ajout d'un conjoint et dans l'écran Union, « Union en 2012 » sur la ligne du conjoint.
- [x] CODE-08 : case « Prend le nom de X », cochée par défaut au mariage (maquette courte). Codé le 20/10 sans maquette : case « Prend le nom… » visible quand « Marié(e) » est allumé (ajout d'un conjoint, et passage à marié dans l'écran Union).
- [x] `migrer()` v4 → v5 testé ; les imports v1 à v4 restent acceptés.

### Étape 3 — Fonctionnalités (1 à 2 sessions, maquette d'abord)
- [x] FEATURE-11 (codé le 20/10 sur maquette validée ; l’âge n’est pas dans le titre : impossible dans un événement récurrent, l’année va en description) : Réglages → « Exporter les dates vers un agenda » : `.ics` avec naissances, décès et mariages, événements annuels (RRULE), UID stables (id + type), naissance sans année, 29 février ; partage ou téléchargement ; aide : importer dans un agenda dédié « Tribu », notifications la veille et le jour même, réexporter après des ajouts.
- [x] FEATURE-13 (codé le 20/10 sur maquette validée) : Réglages → « Vérifier mes données » : doublons probables, personnes isolées, dates incohérentes, fiches « Test ».
- [x] FEATURE-14 : Réglages → export PNG de l'arbre global (dessin sur canvas, noms compris).

### Étape 3b — Page d'accueil (maquette validée le 21/10 : https://claude.ai/artifact/MEG7NvRthLJE8N5A8Dc5sq)
- [x] Accueil « portrait de famille » : salutation, recherche directe avec « Créer », Aujourd'hui, Bientôt, souvenir, 4 raccourcis dessinés.
- [x] Liste déplacée en `#/personnes` ; agenda `#/agenda` (12 mois, puces) ; route `#/arbre/familles`.
- [x] Noces et « N ans ensemble », fêtes du prénom (réglage, option `.ics`), naissance et décès futurs refusés, signalés dans « Vérifier mes données ».
- [x] Import par fusion (DATA-06), filtres de la liste, Réglages en onglets, raccourcis de l'accueil en fenêtres-listes, « copine / compagne » : codés et commités le 21/10.
- [ ] Paul : relire le calendrier des fêtes (`src/modele/fetes.ts`) et valider le rendu (captures).

### Après la V3
- FEATURE-16 : fusion à l'import faite le 21/10 (`fusion.ts`) ; reste : plusieurs groupes par personne, puis lecture seule. FEATURE-17 : photos.
- Abandonnés : FEATURE-12 (lien entre deux personnes), ANIM-08 (vibration).

## V4 — Liaison, nommage et arbre (plan du 29/10)

Statut : **questions tranchées le 29/10** (voir « Décisions » en fin de section) ; plan en attente du feu vert pour le lot 0.
Toutes les familles citées ici sont fictives (Dupontel, Martinez, Lambert, Vasseur, Rochefort). Seules leurs structures reproduisent des cas observés.

---

### 0. Architecture en bref

**Données** : `Donnees` v5 dans le localStorage (`tribu:donnees`), avec export et import en JSON. Elles se composent de quatre tables plates :

- `personnes` : `id`, `prenom`, `nom` (nom d'usage), `nomNaissance?` (gardé seulement pour une femme, par `normaliser`), `sexe?`, `naissance?`, `deces?`, `decede?`, `note`, et deux sortes de parent inconnu :
  - `inconnu: true` : un parent **caché** qui relie une fratrie dont on ignore les parents. Il n'est jamais affiché et disparaît des chemins.
  - `sansNom: true` : le « ? » **visible**. Il reste virtuel (`virtuel:<idParent>`, calculé par `avecParentsSansNom`) tant qu'on n'y touche pas. Le toucher l'enregistre (`enregistrerParentSansNom`).
- `unions` : `personneA`, `personneB`, `marie`, `statut` (`actuelle` ou `separee`), `date?`. Une personne n'a qu'un conjoint actuel vivant (`conjointEnTrop`). Le veuvage est admis.
- `filiations` : `parent`, `enfant`, `type` (`biologique` ou `adoptif`). Au plus 2 parents par type (`exigerPlaceParent`).
- `groupes` d'amis.

**Fichiers clés**

| Domaine | Fichiers |
|---|---|
| Types, migration, validation | `src/modele/types.ts`, `migration.ts` (`migrer` v1→v5), `stockage.ts` (`estDonneesValides`) |
| Opérations pures | `src/modele/modele.ts` (`ajouterUnion`, `prendreNomDuConjoint`, `modifierUnion`, `separerUnion`, `ajouterFiliation(s)`, `reprendreParentsInconnus`, `exigerPlaceParent`, `ajouterFrereSansParent`, `supprimerPersonne`) ; `parentSansNom.ts` |
| Aides à la saisie | `src/modele/saisie.ts` (`nomsEnfant`, `suggestions`) |
| Déductions et nommage | `src/modele/deductions.ts` (`relation`, `sang`, `fratrie`/`freresComplets`, `parcours`, `chemin`), `parente.ts` (`formesSang`, `etiquette`, `motsChemin`) |
| Dessins | `familleProche.ts` (fiche, sans DOM) ; `arbreGlobal.ts` + `partie.ts` (arbre principal) ; `ui/geometrieArbre.ts`, `ui/arbre.ts`, `ui/arbreImage.ts` (PNG) |
| Couleurs | `liste.ts` `couleurFamille` (hachage du nom modulo 12 pastels `--c0..--c11`, `styles/base.css`) |
| Écrans de saisie | `ui/selecteurPersonne.ts` (commun), `ajoutLien.ts` (parent, enfant, frère), `ajoutConjoint.ts`, `union.ts`, `champsPersonne.ts`, `formulaire.ts` |
| Filtres et rappels | `filtres.ts` (`manquesDe`), `evenements.ts` (`evenementsAVenir`) |

---

### A. Création et liaison des personnes

#### 1. Nom par défaut d'un frère ou d'une sœur
- **Diagnostic** :
  - `ajoutLien.ts`, `noms` : sans parent connu, le nom proposé est `nomsEnfant([p])`, c'est-à-dire le **nom d'usage** de la fiche. Pour une femme mariée, c'est le nom du mari.
  - Avec la mère seule comme parent connu, on propose aussi son nom d'usage, qui peut venir d'un remariage.
- **Solution** :
  - Ajouter `nomsFratrie(fiche, parents)` dans `saisie.ts`. Le premier nom proposé est le nom de naissance de la fiche (`nomNaissance ?? nom`). Viennent ensuite les noms des parents cochés (père, puis mère), sans doublon.
  - Le bouton « Prendre X, le nom de Y » permet toujours de passer au nom suivant.
  - Enfant (rôle « enfant ») d'une mère seule : son nom d'usage d'abord (décision 3), donc `nomsEnfant` ne change pas.
- **Données** : aucun changement.
- **Tests** (`saisie.test.ts`) :
  - frère d'une femme mariée, avec et sans parents ;
  - mère seule et remariée ;
  - nom de naissance vide ;
  - fiche d'un homme.

#### 2. « Prend le nom » au mariage, et l'inverse
- **Diagnostic** :
  - Le modèle est déjà symétrique : `prendreNomDuConjoint` applique `epouse(a, b)` et `epouse(b, a)`. L'ancien nom passe en `nomNaissance` s'il est libre.
  - Le blocage est dans l'écran : `ajoutConjoint.ts`, `prendLeNomPossible = … p.sexe !== 'F' && sexeChoisi() === 'F'`. Depuis la fiche **de la femme**, la ligne n'apparaît jamais et `prendLeNom` vaut faux. Le nom ne change donc pas, que l'époux soit nouveau ou déjà dans Tribu. Même blocage si le sexe de l'un des deux n'est pas renseigné.
  - Chemins qui fonctionnent déjà d'après le code : depuis la fiche de l'homme, avec une épouse nouvelle ou existante ; et le passage à « marié » dans `union.ts`. Sonde du 29/10 (écrans sous happy-dom) : depuis la fiche du mari, épouse nouvelle (« Marié » avant ou après sa saisie), épouse existante (dans les deux ordres) et passage à « marié » d'une union existante donnent tous le nom du mari et l'ancien en nom de jeune fille.
  - Trou restant : une union **déjà** mariée ne propose plus jamais « prend le nom » (`union.ts` cache la ligne dès que `union.marie`). Un mariage saisi sans la case, ou importé, ne peut donc plus être corrigé que par la fiche.
  - Dans l'autre sens, rien n'est prévu. `separerUnion`, `supprimerUnion` et `modifierUnion` (décocher « marié ») ne touchent jamais aux noms.
- **Solution** :
  - `prendLeNomPossible` devient symétrique : un mariage actuel entre une femme et un homme, quelle que soit la fiche de départ. Le libellé nomme la personne concernée (« Céleste prend le nom d'Achille »).
  - Si l'épouse est **déjà dans Tribu** :
    - on montre l'aperçu du changement : « Son nom deviendra Rochefort ; Martinez passera en nom de jeune fille » ;
    - si elle a déjà un nom de jeune fille (remariage), il est gardé et seul le nom d'usage change.
  - Nouvelle opération pure `reprendreNomDeNaissance(d, id)` : `nom ← nomNaissance` et le champ `nomNaissance` est vidé.
  - Une question (`choisir.ts`) la propose, sans l'imposer, dans trois cas, à condition que le nom d'usage soit encore celui du conjoint :
    - séparation ;
    - suppression de l'union ;
    - passage de « marié » à « non marié ».
  - Rien n'est proposé au veuvage.
  - Remariage : `nomNaissance` est gardé et le nom d'usage devient celui du nouveau mari, comme aujourd'hui (à garder sous test).
  - Union déjà mariée, actuelle, où l'épouse ne porte pas le nom du mari : `union.ts` propose « Elle prend le nom de X » à tout moment.
  - Nom de naissance pour tous (décision 1) : `normaliser` garde `nomNaissance` quel que soit le sexe. Libellé « Nom de jeune fille » pour une femme, « Nom de naissance » pour un homme ou un sexe non précisé (formulaire, fiche, arbre). La prise de nom au mariage reste celle de l'épouse ; un couple de même sexe ne change aucun nom.
- **Données** : aucun nouveau champ.
- **Tests** (`nomJeuneFille.test.ts`, complété) :
  - mariage déclaré depuis chaque côté, avec une personne nouvelle ou existante ;
  - case décochée ;
  - séparation, puis reprise du nom ;
  - remariage après un divorce, avec ou sans reprise du nom ;
  - veuvage ;
  - deux femmes (aucun changement de nom) ;
  - sexe non précisé.

#### 3. Note dès la création
- **Diagnostic** : `selecteurPersonne.ts` (ligne 76) appelle `champsIdentite(undefined, false, …)`. Avec `avecNote = false`, il n'y a pas de note.
- **Solution** : passer `avecNote = true`. La note se place en fin de formulaire, avant le décès, et commence sur 3 lignes au lieu de 5 pour ne pas allonger l'écran.
- **Données** : aucun changement (`note` existe déjà).
- **Tests** : `parcours.test.ts` crée un conjoint, un enfant et un frère avec une note, puis vérifie la note sur la nouvelle fiche.

#### 4. Ouvrir la fiche créée
- **Diagnostic** : `selecteurPersonne` appelle `o.apres()` sans argument. Tous les écrans d'ajout font `revenir(retour)`, ce qui ramène à la fiche de départ.
- **Solution** :
  - `apres(idNouvelle?: string)`. Quand une personne vient d'être **créée**, on remplace l'écran d'ajout par sa fiche dans l'historique. Le Retour mène donc à la fiche de départ, et non au formulaire.
  - Quand on a choisi une personne existante, le comportement actuel reste (retour à la fiche de départ, avec surbrillance).
  - Il faudra une petite aide dans `navigation.ts` (`remplacerPar(route)`, qui tient compte de `profondeur`).
- **Données** : aucun changement.
- **Tests** : `parcours.test.ts` vérifie la route après une création, puis la route après Retour.

#### 5. Refonte du parent inconnu
- **Diagnostic** :
  1. **Ex non proposé** : dans `ajoutLien.ts`, `couple = conjoint(d, p.id)` ne prend que le conjoint *actuel*. Pour l'enfant d'un ex, aucune case n'est offerte. L'enfant reçoit un « ? » qu'aucun écran ne permet ensuite de remplacer par l'ex. `suggestions(…, 'enfant')` ne regarde, lui aussi, que le conjoint actuel.
  2. **Blocage** : un « ? » **enregistré** (`sansNom`, personne réelle) compte dans `exigerPlaceParent`. Un enfant [mère, « ? »] refuse alors tout vrai second parent (« au plus 2 parents »). `reprendreParentsInconnus` ne traite que les `inconnu` cachés, pas les `sansNom`.
  3. **Clic** : toucher un « ? » l'enregistre et ouvre sa fiche (`ui/arbreGlobal.ts` l. 692). On peut alors le renommer, c'est-à-dire « créer », mais pas le **remplacer par une personne existante**.
- **Solution** :
  - Modèle (`modele.ts`, pur) :
    - `remplacerParent(d, idInconnu, idPersonne)` :
      - reporte toutes les filiations du « ? » (virtuel, enregistré ou `inconnu`) sur la personne choisie, sans doublon et en gardant le type de chaque filiation ;
      - reporte les unions ;
      - supprime le « ? » ;
      - vérifie l'absence de boucle et de 3ᵉ parent. Il refuse proprement si la personne est déjà un parent de l'un des enfants.
    - `exigerPlaceParent` : un `sansNom` sans information (ni note, ni date, ni sexe) ne compte plus. Ajouter un vrai parent **remplace** ce « ? » pour toute la fratrie, comme `reprendreParentsInconnus` le fait déjà pour les `inconnu`. C'est la fin du blocage.
  - Écrans :
    - toucher un « ? » (fiche, famille proche, arbre principal) ouvre l'écran « Qui est ce parent ? ». Il reprend le sélecteur commun : l'onglet « Nouvelle personne » remplit le « ? », l'onglet « Déjà dans Tribu » appelle `remplacerParent` ;
    - les suggestions en tête sont : les ex et le conjoint de l'autre parent, puis les autres parents de ses enfants ;
    - plus aucune fiche « ? » vide n'est enregistrée sans saisie ;
    - dans l'ajout d'un enfant, le choix du second parent n'est plus une simple case. On présente une liste de cases exclusives : le conjoint actuel (coché d'office), puis chaque ex, puis les autres parents de ses enfants, et enfin « Autre parent / inconnu » ;
    - choisir un ex ne crée pas d'union, puisqu'elle existe déjà. Choisir l'« autre parent » d'enfants déjà communs n'en crée pas non plus.
  - **Union au remplacement d'un « ? »** (décision 5) : si le nouveau parent (créé ou choisi) n'a aucune union avec l'autre parent, l'écran en crée une. Choix « En couple » (d'office), « Mariés » ou « Séparés ». « En couple » et « Mariés » sont grisés, avec la raison, si l'un des deux a déjà un conjoint actuel vivant ; « Séparés » est alors coché. Le même choix remplace la case « ont été en couple » de l'ajout d'un second parent (`ajoutLien.ts`, rôle parent).
  - `suggestions(…, 'enfant')` ajoute les enfants des ex qui ne sont pas encore les siens.
- **Migration (v6)** : une réparation idempotente.
  - Un « ? » enregistré **sans aucune information** redevient virtuel : il est supprimé, et `avecParentsSansNom` le recalcule.
  - Un « ? » qui porte une note ou une date est gardé.
- **Tests** :
  - `parentSansNom.test.ts`, `parentsInconnus.test.ts` : `remplacerParent` pour les trois sortes de « ? », avec boucle refusée, doublon refusé et type gardé ;
  - le scénario de liaison L3 (§ Stratégie) ;
  - `migration.test.ts` : v5 → v6 sur un « ? » vide et sur un « ? » annoté.

#### 6. Cohérence des fratries
- **Diagnostic** :
  - Une fratrie reliée par un `inconnu` reçoit un vrai parent : `reprendreParentsInconnus` le donne à toute la fratrie et supprime l'`inconnu`.
  - Quand on ajoute ensuite le **second** parent, le groupe n'existe plus. Ce parent ne va donc qu'à l'enfant de la fiche, et les autres deviennent des demi-frères et sœurs par erreur.
  - Le même cas se produit pour une fratrie qui n'a qu'un parent connu.
- **Règle proposée** (à inscrire dans SPEC.md) :
  - **Frères et sœurs complets** : mêmes parents d'un même type (2 bio, ou 2 adoptifs). C'est déjà le cas (`freresComplets`).
  - **Présomption** (décision 6) : des enfants qui partagent l'**unique** parent connu sont présumés frères et sœurs complets, et partagent un seul « ? ». C'est déjà ce que montre le « ? » virtuel (un seul par parent), et c'est le cas le plus fréquent ; les cases décochables couvrent l'exception.
  - **Ajout d'un parent** à un enfant de cette fratrie : l'écran propose de l'ajouter aussi aux autres. Une case par frère ou sœur, toutes cochées d'office. Les décocher en fait des demi-frères et sœurs.
  - **Demis** : un seul parent en commun et l'autre parent connu et différent. Ils ne sont jamais proposés.
  - **Adoption** : un parent adoptif ajouté n'est proposé qu'aux frères et sœurs du même type de filiation. Un enfant adopté et un enfant biologique du même couple sont frères et sœurs, mais la case de l'adopté reste décochée d'office pour un parent biologique.
  - **Plusieurs inconnus** : deux fratries reliées chacune par leur `inconnu`, puis déclarées frères et sœurs, fusionnent leurs inconnus (`ajouterFrereSansParent`, à garder sous test).
- **Données** : aucun changement de format. La réparation de la v6 ne change **pas** les fratries existantes, parce qu'on ne peut pas deviner un demi d'un complet. Une vérification (`verifierInvariants`) les signale en développement.
- **Tests** : la table des cas limites ci-dessus et le scénario L4.

---

### B. Modèle de données et filtres

#### 7. Lieux facultatifs
- **Solution** :
  - Ajouter `lieuNaissance?` et `lieuDeces?` sur `Personne`, et `lieu?` sur `Union`. Ce sont des textes libres, que `normaliser` élague.
  - Lieu d'union pour les mariés seulement (décision 9) : le champ n'apparaît que si « Marié » est coché ; une union enregistrée non mariée perd son lieu (`normaliser`).
  - On les saisit sous la date correspondante, avec une liste de propositions (`datalist`) des lieux déjà saisis, comme pour les noms.
  - On les affiche sur la fiche (« née le 3 mai 1950 à Brest »).
- **Données** : nouveaux champs facultatifs, validés par `estDonneesValides`. Ils figurent dans l'export et sont documentés dans le README.
- **Tests** : normalisation (espaces, vide → absent), validation, aller-retour export/import, affichage sur la fiche.

#### 8. Profil « à ignorer » dans « À compléter »
- **Solution** :
  - Ajouter `ignorerIncomplet?: true` sur `Personne`. `manquesDe` reste pur, et c'est `filtrerListe('acompleter')` qui exclut ces profils.
  - Sur la fiche, la carte « À compléter » propose « Ne plus me la signaler ». Le réglage s'annule depuis la fiche (interrupteur dans « Modifier »).
- **Données** : champ facultatif.
- **Tests** : `filtres.test.ts`.

#### 9. Pas de rappel pour certains profils
- **Solution** :
  - Ajouter `sansRappel?: true` sur `Personne`. `evenementsAVenir` ignore alors son anniversaire, sa fête et son décès.
  - Toutes les dates liées à la personne disparaissent (décision 8) : anniversaire, fête, anniversaire de décès, et anniversaires d'union où elle figure.
  - Un interrupteur « Rappels (anniversaire, fête…) » dans « Modifier ».
- **Données** : champ facultatif.
- **Tests** : `evenements.test.ts`.

#### 10. Rétrocompatibilité
- **Solution** :
  - Passer en version **6**, avec `migrer` v5 → v6, qui fait la réparation du point 5. Les nouveaux champs ne demandent pas de conversion.
  - `estDonneesValides` accepte les nouveaux champs.
  - Un export v6 est refusé par une appli encore en v5, avec un message clair : c'est le comportement actuel des versions.
  - L'import par fusion (`fusion.ts`) compare aussi les nouveaux champs.
- **Tests** :
  - chaîne v1 → v6 ;
  - idempotence (`migrer(migrer(x)) == migrer(x)`) ;
  - fixture anonymisée migrée, sans perte (même nombre de personnes réelles, de filiations et d'unions, hors « ? » vides) ;
  - fusion v5 + v6.

---

### C. Nommage des relations

#### 11. Chemins simplifiés par relations composées
- **Diagnostic** :
  - `chemin` ne compacte que parent → enfant en « frère ».
  - `motsChemin` ne nomme les étapes qu'une par une, sauf après un ami.
  - Ex. : la fille du frère de la grand-mère maternelle donne une relation (3,2), qui n'a pas de nom dans `formesSang`. On lit alors toutes les étapes : « Toi → ta mère → sa mère → son frère → sa fille ».
- **Solution** :
  - Nouvelle fonction pure `composer(d, moi, etapes)` dans `parente.ts`.
  - Une programmation dynamique sur les personnes du chemin cherche la décomposition en **segments nommables**, c'est-à-dire dont `etiquette(pivot, suivant)` existe : sang avec forme connue, alliance, conjoint, ex.
  - Elle choisit le **moins de segments**. À égalité, elle prend le premier pivot **le plus proche de toi** (retenu le 29/10).
  - « Toi → ta grand-mère → sa nièce » et « Toi → ta mère → sa cousine » comptent tous deux 2 segments. Le second gagne, parce que « ta mère » est plus proche.
  - Les amis restent des coupures obligatoires.
  - `dessinChemin` affiche les segments ; les étapes détaillées restent disponibles au toucher (« Détail »).
- **Tests** : une table chemin → libellé (`parente.composer.test.ts`), avec au moins 30 lignes sur la famille fictive « Dupontel ».

#### 12. Passe globale du nommage
Une table de référence couvre chaque catégorie, et chaque écart trouvé est corrigé dans `formesSang`, `etiquette` ou `lienAvecMoi` :
- **genre** : homme, femme, non précisé (« ton oncle », « ta tante », « ton oncle ou ta tante ») ;
- **alliance** : beau-frère par le conjoint et par le conjoint d'un frère, belle-mère (conjoint d'un parent ≠ mère du conjoint), gendre, bru, et belle-famille du conjoint actuel seulement ;
- **demi** : « demi- » pour le frère et la sœur seulement ; au-delà, l'usage courant : le fils d'un demi-frère est « ton neveu » ;
- **adoption** : « ta fille adoptive » au 1er degré, puis aucune mention au-delà ;
- **ex** : « ton ex », « l'ex de ta mère » (jamais « belle-mère » pour l'ex d'un parent) ; les parents de ton ex sont « ton ex-belle-mère », « ton ex-beau-père » ;
- **plusieurs générations** : arrière-arrière-grand-mère, petit-neveu, grand-oncle ; (3,3) nommé directement « cousin issu de germain », « cousine issue de germain ». Les formes (3,2) et (2,3) passent par la décomposition du point 11 (« sa cousine », « son fils ») ;
- **veuvage** : le conjoint décédé reste « ton mari ».

**Tests** : `parente.test.ts` et `symetrie.test.ts` sont complétés. La symétrie A→B / B→A est vérifiée sur toutes les paires de la famille fictive, sans aucun libellé vide.

---

### D. Arbre principal

> Tout changement visible passe par une maquette validée avant le code. Les cas sont reproduits avec des familles fictives.
> Pour les points 13 à 16, les causes sont des **hypothèses** tirées de la lecture de `partie.ts` et `arbreGlobal.ts`. Les mesures du lot 0 (invariants et métriques sur les familles fictives) les confirment ou les écartent avant toute retouche.

#### 13. Un cousin germain paraît frère
- **Structure fictive** : deux frères, Firmin et Marcel Dupontel.
  - Firmin a trois enfants, dont Apolline.
  - Marcel a un fils, Bastien, qui a une ex (3 enfants) et une compagne actuelle (2 enfants).
  - Bastien apparaît dans la ligne des enfants de Firmin, comme un frère d'Apolline.
- **Hypothèses à vérifier, dans cet ordre** :
  1. La chaîne ex – Bastien – compagne, élargie par `elargirChaines`, pousse Bastien entre les enfants de Firmin, parce que l'ordre `ordonner` entrelace les deux fratries.
  2. Les deux bus sont à la même hauteur et se touchent (`etagerBus` ne sépare que les portées qui se chevauchent au-delà de `MARGE_BUS`). Ils ont aussi la même couleur de lignée.
- **Solution** :
  - Ajouter l'invariant de disposition « **deux fratries de parents différents ne s'entrelacent pas** sur une ligne ». On le teste, puis on le garantit dans `ordonner` en triant par blocs de fratrie.
  - Ajouter un écart `ECART_FAMILLES` entre deux fratries voisines de parents différents.
  - Les bus de deux fratries voisines ne doivent jamais se toucher.
- **Tests** : `arbreGlobal.invariants.test.ts`, sur les familles fictives du générateur.

#### 14. Déséquilibre d'une branche
- **Structure fictive** :
  - Un arrière-grand-père, Ramón Martinez, et sa femme sont séparés. Ils ont deux enfants : Tomás (3 enfants, 2 générations de descendants) et Lucia (ta grand-mère).
  - Le mari de Lucia vient de la famille Vasseur : 6 frères et sœurs et 2 générations d'ancêtres, dont certains sans prénom.
- **Hypothèse** : `POIDS_PAR_ENFANT = 12` attire les parents vers les grandes fratries. La régression isotone tire ensuite la petite branche vers la grande, et les ancêtres sans prénom gardent leur largeur.
- **Solution** :
  - D'abord **mesurer**, avec trois métriques pures sur la `Disposition` : l'écart moyen parent / milieu des enfants, la largeur totale, et le nombre de coudes (point 15).
  - Ensuite essayer, à mesures égales : un poids par sous-arbre plutôt que par enfant, puis un tassement des ancêtres sans prénom.
  - Garder la variante qui améliore les métriques sans dégrader les autres familles fictives.

#### 15. Moins de coudes
- **Solution** :
  - Ajouter une métrique `coudes(disposition)` : le nombre de traits parent → bus → enfant qui ne sont pas droits, plus les croisements de traits.
  - Ajouter une métrique `croisements` : les paires de branches qui se coupent.
  - Les deux servent de **seuils de non-régression** sur chaque famille fictive. La valeur de référence est notée dans le test et ne doit qu'aller en baissant.
  - Pistes : départager l'ordre `trier` par le nombre de croisements, aligner l'enfant unique et le milieu du couple (déjà fait pour un couple seul), et faire descendre le bus droit sous la jonction quand la place le permet.

#### 16. Couleurs de familles voisines trop proches
- **Diagnostic** :
  - `couleurFamille` hache le nom modulo 12. Deux familles alliées peuvent tomber sur la même teinte, ou sur deux teintes voisines (pastels proches).
  - Rien ne tient compte du voisinage.
- **Solution** :
  - Nouvelle fonction pure `couleursDesFamilles(d)`. Les familles (clé = nom simplifié) sont triées par taille, puis reçoivent une couleur gloutonne.
  - Le hachage actuel sert de premier choix. Une couleur est évitée si elle est **identique ou proche** de celle d'une famille adjacente, c'est-à-dire alliée par une union ou une filiation.
  - La « proximité » est une table de distances entre les 12 pastels, calculée en OKLab pour le thème clair **et** pour le thème sombre. Les paires trop proches sont interdites entre voisins.
  - La palette peut être retouchée pour écarter les paires trop proches. Les 2 thèmes sont vérifiés en captures.
  - `couleurFamille` lit cette attribution (mémorisée par version des données), pour garder une couleur identique partout : liste, fiche, arbres, PNG. Sa signature change (elle dépend de toutes les données). Appels à reprendre : `ui/lignePersonne.ts`, `ui/accueil.ts`, `ui/arbreImage.ts`, `ui/arbreGlobal.ts`, `modele/arbreGlobal.ts` (`couleursParNom`), et les tests `liste.test.ts` et `arbreGlobal.test.ts` (l. 489).
  - Décision 10 : une famille peut changer de couleur à chaque ajout, si l'ensemble est plus lisible. Seule contrainte : à un instant donné, la même couleur sur tous les écrans. La palette elle-même peut être retouchée.
- **Données** : aucun changement (la couleur est calculée).
- **Tests** : aucune paire adjacente trop proche dans les familles fictives ; même couleur dans la liste, la fiche et l'arbre.

#### 17. Nom de jeune fille dans l'arbre
- **Solution** : une petite ligne « née Martinez » sous le prénom, dans l'arbre principal (et dans le PNG). Il faudra réserver une ligne comme `LIGNE_EN_PLUS`, ce qui touche la hauteur des rangs. Maquette d'abord.
- **Tests** : `arbreGlobal.test.ts` (hauteur réservée) et captures.

---

### E. Fiche et formulaires

#### 18. Adoption : pointillé sur tout le trait, distinct de celui des ex
- **Diagnostic** :
  - `familleProche.ts`, `descente` : le trait vertical qui part du couple (l. 629) est toujours plein, et seul le dernier tronçon vers l'enfant est pointillé.
  - Le pointillé de l'adoption est **le même** que celui d'une union terminée (`trait.pointille`, `stroke-dasharray: 3 4`, `fiche.css`).
  - Dans l'arbre principal (`geometrieArbre.ts`), la descente est bien pointillée quand tous les enfants sont adoptés.
- **Solution** :
  - Un trait reçoit un `style: 'plein' | 'ex' | 'adoption'` au lieu de `pointille: boolean`. Les styles :
    - **ex** : des points ronds espacés ;
    - **adoption** : des tirets longs.
  - Ces styles sont communs à la fiche, à l'arbre principal et au PNG, et la légende suit.
  - Descente du couple : en tirets si tous les enfants qu'elle dessert sont adoptés. Dans une fratrie mixte, le tronc reste plein et chaque branche suit son type.
- **Tests** : `familleProche.test.ts` (styles des traits, cas 13, 19 et 20), puis captures.

#### 19. Date de décès collée à l'interrupteur
- **Diagnostic** : `champsPersonne.ts`, `noeudDeces` est un `div` sans classe qui contient la carte de l'interrupteur et le `div.champ` de la date. Il n'y a aucun écart entre les deux, en création (`.zone-conjoint`, gap 16) comme en modification.
- **Solution** : une classe `bloc-deces` (flex en colonne, gap 12 px) dans `fiche.css`. Les lieux du point 7 y prendront place.
- **Tests** : captures avant / après des deux écrans.

---

### Lots

| Lot | Contenu | Complexité | Dépend de |
|---|---|---|---|
| **0. Outillage de test** | `.gitignore` des exports ; générateur de familles fictives ; `verifierInvariants` ; scénarios et séquences aléatoires ; métriques de disposition (mesure seule) ; captures sur données fictives | moyen | — |
| **1. Modèle et liaison (pur)** | 2 (`reprendreNomDeNaissance`), 5 (`remplacerParent`, `exigerPlaceParent`), 6 (règle de fratrie), 7, 8, 9 (champs), 10 (v6, migration, fusion) | complexe | 0 |
| **2. Écrans de saisie** | 1, 2 (écran), 3, 4, 5 (écran « Qui est ce parent ? », second parent avec les ex), 6 (cases de la fratrie), 7, 8, 9 (champs et interrupteurs) | moyen | 1, maquettes |
| **3. Nommage** | 11, 12 | moyen à complexe | 0 (fixtures), 1 (règle de fratrie) |
| **4. Arbre principal** | 13, 14, 15 (algorithme), 16 (couleurs), 17 (nom de jeune fille) | complexe | 0 (métriques), 1 (`nomNaissance`), maquettes |
| **5. Retouches** | 18, 19 | simple | 0 ; maquette du style des traits |

L'ordre suit ta demande : 0, 1, 2, 3, 4, 5. En option, le lot 5, qui est indépendant, pourrait passer juste après le lot 0 pour un gain visible rapide. Chaque lot se termine par `npm test`, `tsc` et `npm run build` au vert, et par des captures avant / après pour tout ce qui se voit.

**Suivi** (une session par lot ; le lot 4 peut en demander deux : 13 à 15, puis 16 et 17) :
- [x] Lot 0 — outillage de test (29/10) : src/modele/test/ (générateur, invariants, scénarios, séquences, mesures de disposition), arbreGlobal.invariants.test.ts (seuils d'aujourd'hui), `npm run familles`, `npm run captures -- --familles`
- [x] Lot 1 — modèle et liaison (29/10) : types et migration v6, `remplacerParent`, `reprendreNomDeNaissance` / `prendreLeNom`, `fratriePresumee`, lieux, `ignorerIncomplet`, `sansRappel` ; src/modele/v6.test.ts, L2, L3, L5 au vert, séquences avec remplacement de « ? »
- [ ] Lot 2 — écrans de saisie (maquette d'abord)
- [ ] Lot 3 — nommage
- [ ] Lot 4 — arbre principal (maquette d'abord)
- [ ] Lot 5 — retouches (maquette d'abord)

---

### Stratégie de test

#### Anonymisation (règle absolue)
- L'export réel ne sert qu'à lire des **structures**. Rien de ce qu'il contient (noms, prénoms, dates, lieux, notes) n'entre dans le code, les tests, les fixtures, les commentaires, les captures versionnées, ce plan ou les messages de commit.
- Le `.gitignore` ignore désormais `tribu-*.json` (nom d'export de l'appli, `stockage.ts` l. 144), `*.export.json` et `exports/`. C'est déjà fait : c'est la seule modification hors de ce plan.
- Les captures sur des données réelles ne sortent que hors du dépôt (scratchpad), comme aujourd'hui.

#### Générateur de familles fictives (lot 0)
- Un module `src/modele/test/familles.ts` (pur et typé, utilisable par Vitest et par `scripts/`) fournit un petit langage de construction :
  ```ts
  const f = famille('Dupontel', { graine: 7 })
    .couple('Firmin', 'Odile', { marie: true })
    .enfants(['Apolline', 'Gaspard', 'Clara'])
    .ex('Bastien', 'Coralie', { enfants: 3 })
    .adopte('Nina', { par: ['Achille', 'Céleste'] })
    .parentInconnu('Timéo');
  ```
- Les prénoms viennent d'une liste inventée et les dates sont tirées par la graine (décalées, partielles quand on le demande). Le générateur garantit des données valides (`estDonneesValides`).
- Familles de référence :
  - **Dupontel** : 6 générations, cousin avec ex et compagne (point 13), demi-frères et sœurs ;
  - **Martinez-Vasseur** : branches très inégales, ancêtres sans prénom, couple d'aïeux séparé (point 14) ;
  - **Lambert** : enfants avec un ex non uni, puis enfant ajouté après coup ; conjoint avec 2 enfants adoptés et 1 biologique ; « ? » à remplacer (point 5) ;
  - **Rochefort** : fratries reliées par des inconnus, parent unique, veuvage puis remariage, décès sans date, dates partielles ;
  - **Extrêmes** : 12 enfants, même sexe, 3 ex successifs, boucle tentée.
- Le script `npm run familles -- <dossier>` écrit ces familles en JSON. Elles servent d'entrée à `npm run captures`.

#### Invariants (`verifierInvariants(d)`, pur)
Vérifiés après **chaque** étape de tous les scénarios :
- au plus 2 parents par type ;
- pas de boucle d'ascendance ;
- aucune filiation ni union vers une personne absente ;
- pas de doublon de filiation ni d'union ;
- au plus un conjoint actuel vivant ;
- chaque `inconnu` relie au moins 2 enfants ;
- aucun « ? » enregistré sans lien ;
- fratries cohérentes : les frères et sœurs complets ont exactement les mêmes parents d'un même type, et `fratrie(a)` contient `b` si et seulement si `fratrie(b)` contient `a` ;
- `nomNaissance` jamais égal à `nom` après un mariage.

#### Scénarios de liaison dans tous les ordres
- **L1** : couple, puis enfant, puis second enfant ; et l'inverse (enfants d'abord, parents ensuite).
- **L2** : frère sans parent, puis ajout d'un parent, puis ajout du second parent : la fratrie entière doit suivre.
- **L3** : parent, puis ex, puis enfant de l'ex (proposé comme second parent) ; puis « ? » remplacé par l'ex ; puis par une personne nouvelle.
- **L4** : adoption dans une famille recomposée ; demi-frères et sœurs ; plusieurs inconnus fusionnés.
- **L5** : mariage, prise du nom, divorce, reprise du nom, remariage.
- Chaque scénario est joué dans **toutes les permutations** de ses étapes indépendantes, sur un petit nombre d'étapes. L'état final doit être le même à l'identifiant près.

#### Séquences aléatoires
- Un générateur à graine (fonction maison, sans dépendance : décision 12) tire 500 séquences de 30 opérations parmi : créer, unir, séparer, ajouter un parent, un enfant ou un frère, remplacer un « ? », supprimer.
- Une opération refusée (erreur attendue) doit laisser les données intactes. Une opération acceptée doit respecter les invariants.
- Une graine qui échoue est affichée, puis ajoutée aux cas fixes.

#### Tests de l'arbre
- Les invariants de disposition s'appliquent à chaque famille fictive :
  - pas de chevauchement de nœuds ;
  - chaque enfant est sous la portée de son bus ;
  - les fratries de parents différents ne s'entrelacent pas ;
  - les bus voisins sont séparés ;
  - toutes les personnes visibles sont placées.
- Les métriques (coudes, croisements, déséquilibre, largeur) ont des seuils de non-régression.
- L'instantané `arbreGlobal.fixture.test.ts` n'est régénéré (`-u`) qu'après validation à l'œil.

#### Tests visuels
- `npm run captures` tourne sur les familles fictives, en clair et en sombre, à 3 largeurs : téléphone, tablette et ordinateur.
- J'analyse moi-même les captures (lecture des images) avant de te les montrer, et j'itère tant qu'un défaut se voit.
- Captures de **référence** fictives, **non versionnées** (décision 11) : les familles sont déterministes (graine fixe), donc la référence se régénère à tout moment depuis le commit précédent (`git worktree`), dans `captures/` (ignoré). Une par famille, par thème et par écran clé. Pas de PNG dans l'historique.

---

### Risques
- **Migration v6** : une perte de données si la réparation des « ? » se trompe.
  - Parade : la migration est idempotente et ne supprime que des « ? » totalement vides. Elle est testée sur la fixture anonymisée.
  - Avant la migration, une copie v5 est gardée dans le localStorage (`tribu:donnees:v5`) pour un retour arrière.
  - Un appareil resté en v5 refusera un export v6 (message clair).
- **Arbre** : toute retouche de `partie.ts` peut dégrader d'autres familles.
  - Parade : on mesure d'abord, avec des seuils par famille fictive, les invariants et la vérification à l'œil des captures. Un seul paramètre change à la fois.
- **Couleurs** : une couleur qui change à chaque ajout peut dérouter ; la lisibilité de l'ensemble prime (décision 10).
- **Fratries** : la règle de présomption peut fusionner à tort deux demi-fratries. Les cases décochables et la vérification en développement limitent ce risque.
- **Nommage** : les libellés changent partout (fiche, chemin, recherche), ce qui touche beaucoup de tests existants. On les met à jour avec la table de référence, sans `-u` aveugle.
- **Écrans** : le Retour après création, le geste Retour en saisie et la garde de saisie interagissent. Il faut des tests de parcours dédiés.
- **Anonymisation** : une fuite par une capture ou un instantané. Parade : les captures réelles ne sortent que hors du dépôt, et je vérifie `git status` avant de proposer un commit.

---

### Décisions du 29/10 (réponses aux questions)
1. **Nom de naissance** : pour tous. Libellé « Nom de jeune fille » pour une femme, « Nom de naissance » pour un homme.
2. **Séparation** : on *propose* de reprendre le nom de naissance, sans l'imposer.
3. **Enfant d'une mère seule** : son nom d'usage d'abord.
4. **Après un ajout** : ouvrir la fiche seulement après une création.
5. **« ? » remplacé** : sans union avec l'autre parent, en créer une, « En couple » d'office, avec le choix « Mariés » ou « Séparés » au moment du remplacement.
6. **Présomption de fratrie** : retenue, cases cochées d'office (j'y souscris : c'est ce que montre déjà le « ? » unique).
7. **Nommage** : départage par le pivot le plus proche de toi ; (3,3) nommé « cousin issu de germain » ; « demi- » pour le frère et la sœur seulement ; « l'ex de ta mère » pour l'ex d'un parent, « ton ex-belle-mère » pour la mère de ton ex.
8. **Rappels désactivés** : toutes les dates liées à la personne (anniversaire, fête, décès, unions).
9. **Lieu d'union** : pour les mariés seulement.
10. **Couleurs** : une famille peut changer de couleur à chaque ajout si l'ensemble est plus lisible ; palette retouchable.
11. **Captures de référence** : non versionnées, régénérées depuis des familles déterministes.
12. **Tests par propriétés** : générateur maison, sans dépendance.
13. **Plan** : un seul plan, cette section de `docs/PLAN.md`.
14. **« Prend le nom »** : parti de la fiche du mari, sexes renseignés. La sonde ne reproduit pas l'échec ; seul trou trouvé : l'union déjà mariée (point 2). Si ça se reproduit, noter l'enchaînement exact.

Aucune question ouverte.

## Plus tard
- Partage avec des proches (la fusion à l'import existe déjà)
- Partage avec des proches ; revoir alors le chiffrement de l'export (SEC-01)
- [x] Mini-arbre sur la fiche (FEAT-09), avec le lien « ami » : maquette validée le 19/10 (claude.ai/artifact/CUp7N1VAn5HCNvLvHvJxiy, version 5), codé le 19/10
- [x] Arbre global (après FEAT-09) : maquette A validée le 19/10 (claude.ai/artifact/QeJzzjcSac5fzuuZ3R9Cow), personnes sans lien masquées, codé le 19/10 ; bouton sur l'accueil, « Moi » au centre, toutes les personnes et leurs liens (amis compris) ; zoom au pincement, défilement libre, toucher une personne ouvre sa fiche
- [x] Arbre global lisible (19/10) : couleur par nom de famille (12 pastels, amis compris), décédés pâles avec « † », enfants centrés entre leurs parents (chaînes d'ex élargies), parents sans union côte à côte, familles d'amis resserrées, fonds de lignée supprimés
- [x] Groupes d'amis (après l'arbre global) : nom de famille au-dessus des lignées, cadres de groupes dans « Tes amis », saisie par groupe, Réglages → Groupes d'amis ; maquette validée le 19/10 (claude.ai/artifact/C5fAaf2hkT89PDdtXV6E4T), codé le 19/10
- [x] « Famille proche » fiabilisé (21/10) : 22 cas fictifs (tests/fixtures/famille-proche), test de référence, rapport et 3 maquettes (claude.ai/artifact/2JMCd1nRBCtLXRPY8jBt6U), stratégie S2 « rangées repliées » choisie par Paul ; correction de `fratrie()` (`freresComplets`) ; placement pur `modele/familleProche.ts`
- [x] Veuvage (21/10) : nouvelle union possible après le décès du conjoint ; règle « une union actuelle avec un vivant » à la création, à l'import et à la fusion ; section « Conjoint décédé » sur la fiche.
- Plusieurs groupes par personne (règle « un seul » levée dans les écrans)
- Photos (IndexedDB nécessaire)
- Import et export GEDCOM
- Autres critères de tri de la liste (date de naissance…)
- Recherche avancée
- Mises à jour majeures (TypeScript 7, vite-plugin-pwa 2) sur raison concrète (CODE-05)
