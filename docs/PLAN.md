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
