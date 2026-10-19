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

- [ ] **S1. Robustesse** — Maquette d'abord : écran « Données illisibles », Réglages (date du dernier export, export par partage), accueil vide.
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
  - [x] FEAT-03 (option A) : « Un frère ou une sœur » dans la feuille. La personne devient enfant des parents connus (tous cochés ; en décocher un donne un demi). Grisé avec « Ajoute d'abord un parent » si aucun parent n'est connu. Aucun lien de fratrie stocké (décision 9).
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

- [ ] **S3b. Mémo** — Maquette d'abord : accueil avec anniversaires, fiche avec décès et âge.
  - [ ] FEAT-06 : garder les anciennes unions. Une séparation ne supprime plus l'union : elle passe au statut « séparés » ; la fiche affiche « Ex-conjoint » sous le conjoint actuel ; toujours un seul conjoint actuel. Remplace la décision 35, dans la même migration que FEAT-04 (les unions v1 deviennent des unions actuelles).
  - [ ] FEAT-04 : date de décès facultative, partielle comme la naissance ; âge (« 34 ans ») ou « mort à 82 ans » sur la fiche.
  - [ ] DATA-07 : premier changement de format : `migrer()` v1 → v2 appelée avant la validation, testée ; les anciens exports restent importables.
  - [ ] FEAT-05 : prochains anniversaires en haut de l'accueil : les 3 prochains dans les 30 jours, avec l'âge atteint ; pas pour les personnes décédées.
  Terminé quand : un export v1 s'importe dans la v2 sans perte, une séparation laisse l'ex-conjoint visible sur la fiche, et l'accueil montre les anniversaires à venir.

- [ ] **S4. Identité visuelle** — Maquette complète d'abord (direction A).
  - [ ] UI-01 : direction « sobre affiné » : vert calmé, Figtree seule (UI-08).
  - [ ] UI-02 : une teinte d'avatar par nom de famille.
  - [ ] UI-03 : échelle de 5 tailles de texte, espacements différenciés, nom de la fiche plus affirmé.
  - [ ] UI-04 : accent réservé à ce qui se touche ; titres de section en gris chaud, capitales en CSS.
  - [ ] UI-05 : un seul bouton plein par écran.
  - [ ] UI-06 : état appuyé et anneau de focus identiques partout.
  - [ ] UI-07 : icône définitive (3 propositions, Paul choisit) ; favicon à la teinte de `theme_color`.
  - [ ] ANIM-01 : glissement latéral entre écrans (View Transitions, moins de 250 ms), sens inverse au retour.
  - [ ] ANIM-02 : montée de la feuille, voile en fondu, léger zoom des confirmations.
  - [ ] ANIM-03 : surbrillance brève de la ligne ajoutée ou modifiée au retour sur la fiche.
  - [ ] ANIM-04 : retours tactiles : appui, coche de sélection.
  Terminé quand : toutes les animations sont coupées si le téléphone demande moins de mouvement, et Paul valide le rendu sur son téléphone.

## Plus tard
- Import en fusion (DATA-06), avec le partage
- Partage avec des proches ; revoir alors le chiffrement de l'export (SEC-01)
- Mini-arbre sur la fiche (FEAT-09), puis vue arbre graphique
- Photos (IndexedDB nécessaire)
- Import et export GEDCOM
- Autres critères de tri de la liste (date de naissance…)
- Recherche avancée
- Mises à jour majeures (TypeScript 7, vite-plugin-pwa 2) sur raison concrète (CODE-05)
