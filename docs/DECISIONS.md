# Décisions

2026-10-19 | PWA mobile uniquement, usage personnel en V1 | besoin perso, partage reporté
2026-10-19 | Stack et hébergement repris de YamsApp (TS sans framework, Vite, vite-plugin-pwa, Vitest, GitHub Pages) | déjà maîtrisés
2026-10-19 | Stockage localStorage + sauvegarde JSON, comme YamsApp | pas de BDD ni d'interconnexion nécessaires
2026-10-19 | Mise à jour auto de l'appli à l'ouverture, comme YamsApp | toujours la dernière version sans action
2026-10-19 | Conjoints et enfants sont des fiches reliées, pas des champs texte | permet adoption et familles recomposées
2026-10-19 | Liens parent → enfant typés biologique ou adoptif | familles recomposées et adoption en V1
2026-10-19 | Frères et sœurs et enfants d'un couple déduits, jamais saisis | évite les incohérences
2026-10-19 | Date de naissance facultative | sert à trier les enfants
2026-10-19 | Accueil en liste + fiches ; vue arbre reportée | un arbre se lit mal sur téléphone
2026-10-19 | Pas de photos en V1 | localStorage limité à ~5 Mo
2026-10-19 | Mise à jour en mode `autoUpdate` (skipWaiting + clientsClaim explicites, rechargement auto), et non le bandeau « Mettre à jour » de YamsApp | pas de saisie longue à protéger comme une partie de jeu ; « sans action » voulu. Revérification aussi au retour au premier plan (visibilitychange)
2026-10-19 | `.npmrc` avec `legacy-peer-deps=true` | npm 10.9.0 plante (« reading 'edgesOut' ») sur la résolution des peer deps de ce jeu de dépendances ; même réglage en local et en CI
2026-10-19 | `base` Vite = `/Tribu/` (nom du dépôt GitHub = Tribu) | exigé par GitHub Pages ; à changer si le dépôt porte un autre nom
2026-10-19 | Modèle dans `src/modele/` : fonctions pures et immuables (données → nouvelles données), erreurs en français ; ids UUID ; le `Storage` est injecté (tests sans navigateur) | testable en environnement node, UI branchée plus tard
2026-10-19 | Une seule clé localStorage `tribu:donnees`, format `{version:1, personnes, unions, filiations}` ; données corrompues ou incohérentes → données vides (validation de forme et de références, partagée avec l'import JSON) | le même contrôle protège le chargement et l'import
2026-10-19 | Frères et sœurs = ensemble de parents identique et non vide ; demi = au moins un parent en commun sans égalité des ensembles ; biologique et adoptif comptent pareil | cas ambigus (parent inconnu d'un côté) tranchés ainsi ; validé par Paul
2026-10-19 | Enfants d'un couple = parents communs, tout type de filiation confondu, sans exiger d'union | « jamais ressaisis » ; l'union n'est pas requise pour avoir des enfants communs
2026-10-19 | Une filiation parent→enfant unique par paire (pas à la fois bio et adoptif) ; max 2 parents par type ; naissance au format AAAA-MM-JJ, tri par chaîne, sans date en fin puis ordre alphabétique | règles de la spec rendues strictes
2026-10-19 | Liste triée par nom de famille par défaut, critère paramétrable plus tard (page de paramètres) | demande de Paul ; ne pas coder le paramétrage en V1
2026-10-19 | Fiche : ordre des sections conjoints, enfants, frères et sœurs (+ demis), parents ; section vide masquée | demande de Paul sur les maquettes
2026-10-19 | Étiquette « Adoptif » seulement, le lien biologique n'est pas étiqueté ; « Marié » sur le conjoint | évite le bruit visuel
2026-10-19 | Bouton « Ajouter un proche » en bas de fiche pour atteindre les catégories masquées (proposé, à confirmer par Paul) | sans lui, impossible d'ajouter un premier parent/enfant/conjoint
2026-10-19 | Maquettes de l'étape 3 : artifact https://claude.ai/artifact/MqxSFQuLe3ZWNXT31tMepc | référence visuelle pour l'étape 4
2026-10-19 | UI sans framework dans `src/ui/`, routage par hash (`#/`, `#/personne/<id>`, `#/nouveau`, `#/modifier/<id>`) ; création/modification/suppression terminent par `location.replace` (pas d'empilement d'historique) | compatible GitHub Pages, aucune dépendance
2026-10-19 | Logique de liste (tri, regroupement, filtre, libellés) dans `src/modele/liste.ts`, testée ; filtre insensible à la casse et aux accents, mots combinables (« jean lambert ») | règle du projet : toute logique de données est testée
2026-10-19 | Figtree auto-hébergée via `@fontsource-variable/figtree`, woff2 dans le précache ; `theme_color` #1B6B58, fond #F3F6F4 | l'appli doit marcher hors ligne ; cohérence avec les maquettes
2026-10-19 | Étape 4 : fiche sans sections de proches ni « Ajouter un proche » ; formulaire et confirmation de suppression faits sans maquette dédiée, dans le style validé | les liens arrivent aux étapes 5 à 7 ; à valider visuellement par Paul
2026-10-19 | Champ `sexe` : seulement Homme ou Femme dans le formulaire, Homme par défaut ; dans le modèle il reste optionnel (`'F' | 'M'`) pour les données enregistrées avant, affichées « né(e) » jusqu'à modification ; format JSON inchangé (`version: 1`) | demande de Paul ; pas de migration
2026-10-19 | Date de naissance partielle : `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`, validée au calendrier (bissextiles) à la saisie ; au chargement le contrôle reste tolérant (chaîne) pour ne jamais vider les données sur une date aberrante ; affichage « née en 1938 » / « née en mai 1961 » / « née le 14 mai 1961 » | demande de Paul
2026-10-19 | Saisie de la date en trois champs (jour, mois en liste, année) plutôt que `<input type="date">`, qui n'accepte pas les dates partielles ; année obligatoire dès qu'un jour ou un mois est saisi, jour impossible sans mois | seul moyen mobile simple d'obtenir une date partielle
2026-10-19 | Tri par naissance : comparaison de chaînes, donc « 1990 » avant « 1990-03 » avant « 1990-06-01 » ; sans date en fin | conséquence du format partiel, jugée acceptable
2026-10-19 | Étape 4 validée par Paul sur le comportement actuel (formulaire, confirmation de suppression, filtre, persistance) ; le bouton « Ajouter un proche » reste à confirmer à l'étape 5 | validation donnée après essai
2026-10-19 | Un seul conjoint à la fois : `ajouterUnion` refuse une personne déjà en couple ; une séparation efface l'union (`supprimerUnion`), sans historique des unions passées. Remplace « unions multiples » du plan initial | demande de Paul
2026-10-19 | Déduction `conjoints` (liste) remplacée par `conjoint` (un seul, avec son union) ; d'éventuelles anciennes données à plusieurs unions ne sont pas migrées, la fiche n'en montre que la première | aucune donnée réelle concernée à ce stade
2026-10-19 | Écrans `#/conjoint/<id>` (ajout : onglets personne existante / nouvelle, interrupteur Marié(e)) et `#/union/<id>` (marié, mettre fin à l'union avec confirmation) ; accès à l'union par le crayon à côté du conjoint sur la fiche | demande de Paul (« prévoir un moyen de modifier ou retirer une union ») ; maquette validée sauf le point « unions multiples »
2026-10-19 | « Ajouter un proche » non créé : tant que parents et enfants n'existent pas, la fiche sans conjoint affiche « Ajouter un conjoint ». Le bouton générique avec choix de catégorie sera fait aux étapes 6 à 7 | un choix à une seule option n'aurait pas de sens ; à confirmer par Paul
2026-10-19 | Champs d'identité du formulaire extraits dans `src/ui/champsPersonne.ts`, réutilisés pour créer un conjoint | éviter de dupliquer prénom, nom, sexe, date
2026-10-19 | Ajout d'un conjoint à créer : sexe proposé à l'opposé de celui de la personne (femme si homme ou sexe inconnu, homme si femme) ; modifiable | demande de Paul
2026-10-19 | Étape 6 : maquette validée par Paul (fiche avec PARENTS/ENFANTS, feuille « Ajouter un proche », écran d'ajout d'un parent) | validation donnée avant codage
2026-10-19 | « Ajouter un proche » créé (feuille : conjoint, parent, enfant) et remplace « Ajouter un conjoint » sur la fiche ; « Un conjoint » grisé s'il y en a déjà un. Sections PARENTS, CONJOINT et ENFANTS n'apparaissent que si elles contiennent quelqu'un | confirmé par la maquette
2026-10-19 | Écrans `#/parent/<id>` et `#/enfant/<id>` (même écran `ajoutLien.ts` : type de lien, personne existante ou nouvelle ; personnes déjà liées grisées) et `#/lien/<filiation>/<id>` (changer le type, retirer le lien avec confirmation) | écart à la maquette : un crayon par ligne ouvre la gestion du lien, comme pour le conjoint, car toucher la ligne ouvre la fiche
2026-10-19 | Modèle : `ajouterFiliation` refuse une boucle (le parent descend déjà de l'enfant) ; `modifierFiliation` change le type sous la limite de 2 parents par type ; déductions `liensParents` (biologiques d'abord) et `liensEnfants` (plus âgé d'abord) | cohérence de la famille recomposée ; testé
