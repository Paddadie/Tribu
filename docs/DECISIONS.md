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
